"use client";

import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import {
  normalizeListing,
  replaceReported,
  replaceSaved,
  replaceUserListings,
  restoreUser,
  store,
  type SessionUser,
} from "@/store/myroom";
import { SocketProvider } from "@/components/socket-provider";
import { startViewCountQueue } from "@/lib/view-count-queue";
import { hasValidAccessToken } from "@/utility/authToken";

const STORAGE_KEY = "myroom-v1";

function ViewCountQueueWorker() {
  useEffect(() => startViewCountQueue(), []);
  return null;
}

function PersistGate() {
  const dispatch = useDispatch();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          userListings?: unknown;
          savedIds?: unknown;
          reportedIds?: unknown;
          user?: SessionUser | null;
        };
        if (Array.isArray(parsed.userListings)) {
          const listings = parsed.userListings
            .map(normalizeListing)
            .filter((listing): listing is NonNullable<typeof listing> => listing !== null)
            .map((listing) => ({
            ...listing,
            photos: listing.photos.filter((photo) => photo.startsWith("/rooms/")).length
              ? listing.photos.filter((photo) => photo.startsWith("/") || photo.startsWith("data:"))
              : ["/rooms/08.jpg"],
            }));
          dispatch(replaceUserListings(listings));
        }
        if (Array.isArray(parsed.savedIds)) {
          dispatch(replaceSaved(parsed.savedIds.filter((id) => typeof id === "string")));
        }
        if (Array.isArray(parsed.reportedIds)) {
          dispatch(replaceReported(parsed.reportedIds.filter((id) => typeof id === "string")));
        }
        if (
          hasValidAccessToken() &&
          parsed.user &&
          typeof parsed.user.name === "string" &&
          typeof parsed.user.phone === "string"
        ) {
          dispatch(
            restoreUser({
              name: parsed.user.name,
              phone: parsed.user.phone,
              ...(typeof parsed.user.email === "string" ? { email: parsed.user.email } : {}),
            }),
          );
        } else {
          dispatch(restoreUser(null));
        }
      }
    } catch {
      // Ignore unreadable local data.
    }

    const save = () => {
      const state = store.getState();
      const payload = {
        userListings: state.listings.userListings.map((listing) => ({
          ...listing,
          photos: listing.photos.filter((photo) => photo.startsWith("/rooms/")),
        })),
        savedIds: state.ui.savedIds,
        reportedIds: state.ui.reportedIds,
        user: state.session.user,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    };

    return store.subscribe(save);
  }, [dispatch]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate />
      <ViewCountQueueWorker />
      <SocketProvider>{children}</SocketProvider>
    </Provider>
  );
}
