import { baseApi } from "@/components/redux/api/baseApi";
import { roomListApi } from "@/components/redux/features/roomListApi";
import { store } from "@/store/myroom";

const DATABASE_NAME = "myroom-view-counts";
const DATABASE_VERSION = 1;
const OBJECT_STORE = "events";
const IP_CACHE_KEY = "myroom-view-count-ip";
const MIN_REQUEST_INTERVAL_MS = 500;
const MAX_RETRY_DELAY_MS = 60_000;

export type ViewInteraction = "direct-call" | "share" | "report" | "zoom" | "list" | "see-more";

type ViewCountEvent = {
  eventId: string;
  roomId: string;
  interaction: ViewInteraction;
  createdAt: number;
  attempts: number;
  retryAt: number;
};

let databasePromise: Promise<IDBDatabase> | null = null;
let workerRunning = false;
let workerStarted = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let ipAddressCache: string | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  const pendingDatabase = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OBJECT_STORE)) {
        database.createObjectStore(OBJECT_STORE, { keyPath: "eventId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the view queue."));
    request.onblocked = () => reject(new Error("The view queue database is blocked by another tab."));
  }).catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });

  databasePromise = pendingDatabase;
  return pendingDatabase;
}

function transactionCompleted(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("The view queue transaction was aborted."));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("The view queue transaction failed."));
  });
}

async function getQueuedEvents(): Promise<ViewCountEvent[]> {
  const database = await openDatabase();
  const transaction = database.transaction(OBJECT_STORE, "readonly");
  const completed = transactionCompleted(transaction);
  const request = transaction.objectStore(OBJECT_STORE).getAll() as IDBRequest<ViewCountEvent[]>;
  const events = await new Promise<ViewCountEvent[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read queued view events."));
  });
  await completed;
  return events.sort((a, b) => a.createdAt - b.createdAt);
}

async function saveQueuedEvent(event: ViewCountEvent): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(OBJECT_STORE, "readwrite");
  const completed = transactionCompleted(transaction);
  transaction.objectStore(OBJECT_STORE).put(event);
  await completed;
}

async function removeQueuedEvent(eventId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(OBJECT_STORE, "readwrite");
  const completed = transactionCompleted(transaction);
  transaction.objectStore(OBJECT_STORE).delete(eventId);
  await completed;
}

async function getClientIpAddress(): Promise<string> {
  if (ipAddressCache) return ipAddressCache;

  try {
    const cachedAddress = window.sessionStorage.getItem(IP_CACHE_KEY);
    if (cachedAddress) {
      ipAddressCache = cachedAddress;
      return cachedAddress;
    }
  } catch (error) {
    console.warn("Could not read the cached IP address; fetching it again.", error);
  }

  const response = await fetch("https://api.ipify.org/?format=json", {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`IP lookup failed with status ${response.status}.`);
  }

  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("ip" in result) ||
    typeof result.ip !== "string" ||
    !result.ip.trim()
  ) {
    throw new Error("IP lookup returned an invalid address.");
  }

  ipAddressCache = result.ip.trim();
  try {
    window.sessionStorage.setItem(IP_CACHE_KEY, ipAddressCache);
  } catch (error) {
    console.warn("Could not cache the IP address for this session.", error);
  }
  return ipAddressCache;
}

function retryDelay(attempts: number): number {
  return Math.min(1000 * 2 ** Math.min(attempts - 1, 6), MAX_RETRY_DELAY_MS);
}

function scheduleRetry(delay: number): void {
  if (!workerStarted || retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void processQueue();
  }, delay);
}

async function processQueueWithLock(): Promise<void> {
  let successfulEvents = 0;

  while (workerStarted && navigator.onLine) {
    const events = await getQueuedEvents();
    if (!events.length) break;

    const now = Date.now();
    const event = events.find((queuedEvent) => queuedEvent.retryAt <= now);
    if (!event) {
      scheduleRetry(Math.min(...events.map((queuedEvent) => queuedEvent.retryAt - now)));
      break;
    }

    try {
      const ipAddress = await getClientIpAddress();
      await store
        .dispatch(
          roomListApi.endpoints.viewCount.initiate(
            { roomId: event.roomId, ipAddress, eventId: event.eventId },
            { track: false },
          ),
        )
        .unwrap();
      await removeQueuedEvent(event.eventId);
      successfulEvents += 1;
    } catch (error) {
      const failedEvent = {
        ...event,
        attempts: event.attempts + 1,
        retryAt: Date.now() + retryDelay(event.attempts + 1),
      };
      await saveQueuedEvent(failedEvent);
      console.error(
        `View event ${event.eventId} (${event.interaction}) failed; retrying after ${retryDelay(failedEvent.attempts)}ms.`,
        error,
      );
      scheduleRetry(failedEvent.retryAt - Date.now());
      break;
    }

    if (workerStarted) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS));
    }
  }

  if (successfulEvents > 0) {
    store.dispatch(baseApi.util.invalidateTags(["roomList"]));
  }
}

async function processQueue(): Promise<void> {
  if (!workerStarted || workerRunning || !navigator.onLine) return;
  workerRunning = true;

  try {
    const lockManager = navigator.locks;
    if (lockManager) {
      await lockManager.request("myroom-view-count-queue", processQueueWithLock);
    } else {
      await processQueueWithLock();
    }
  } catch (error) {
    console.error("View-count queue could not be processed.", error);
    scheduleRetry(MAX_RETRY_DELAY_MS);
  } finally {
    workerRunning = false;
  }
}

export async function enqueueRoomView(
  roomId: string,
  interaction: ViewInteraction,
): Promise<void> {
  if (!roomId.trim()) {
    throw new Error("A room ID is required to record a view.");
  }

  const event: ViewCountEvent = {
    eventId: crypto.randomUUID(),
    roomId,
    interaction,
    createdAt: Date.now(),
    attempts: 0,
    retryAt: 0,
  };
  await saveQueuedEvent(event);
  if (!workerStarted) workerStarted = true;
  void processQueue();
}

export function startViewCountQueue(): () => void {
  workerStarted = true;
  window.addEventListener("online", processQueue);
  void processQueue();

  return () => {
    workerStarted = false;
    window.removeEventListener("online", processQueue);
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };
}
