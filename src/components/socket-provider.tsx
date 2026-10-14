"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { jwtDecode } from "jwt-decode";
import { AUTH_EVENT, type AuthTokenPayload } from "@/utility/authToken";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
const TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME || "accessToken";
const AUTH_EVENTS = [AUTH_EVENT, "auth_change"] as const;

type SocketContextValue = {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
};

const SocketContext = createContext<SocketContextValue | null>(null);

function getStoredToken(): string | null {
  
    return window.localStorage.getItem(TOKEN_NAME);
  
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "An unexpected socket error occurred.";
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!SOCKET_URL) return;

    let socketInstance: Socket | null = null;

    const connectSocket = () => {
      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.io.removeAllListeners();
        socketInstance.disconnect();
      }
      setConnected(false);
      setError(null);

      const token = getStoredToken();

      try {
        socketInstance = io(SOCKET_URL, {
          transports: ["websocket", "polling"],
          tryAllTransports: true,
          query: { token: token || "" },
          reconnectionAttempts: 5,
          timeout: 10000,
        });
      } catch (connectionError) {
        socketInstance = null;
        setSocket(null);
        setError(getErrorMessage(connectionError));
        console.error("Unable to initialize the socket connection.", connectionError);
        return;
      }

      const activeSocket = socketInstance;
      setSocket(activeSocket);

      activeSocket.on("connect", () => {
        setConnected(true);
        setError(null);
        console.info("Socket connected.");
      });

      activeSocket.on("disconnect", (reason) => {
        setConnected(false);
        console.info("Socket disconnected:", reason);
      });

      activeSocket.on("connect_error", (connectionError: Error) => {
        setConnected(false);
        setError(connectionError.message || "Unable to connect to the socket server.");
        console.error("Socket connection error:", connectionError);
      });

      activeSocket.io.on("reconnect_failed", () => {
        setConnected(false);
        setError("Could not reconnect to the socket server after several attempts.");
      });

      activeSocket.on("connected", (data: unknown) => {
        if (data && typeof data === "object" && "type" in data && data.type === "authenticated") {
          if (!token) return;

          try {
            const user = jwtDecode<AuthTokenPayload>(token);
            if (user.role) {
              activeSocket.emit("join", { role: user.role.toLowerCase() });
            }
          } catch (tokenError) {
            setError("Connected, but the account token could not be read.");
            console.error("Unable to read the authenticated socket token.", tokenError);
          }
        } else {
          console.info("Socket connected in guest mode.");
        }
      });

      activeSocket.on("user-online", (data: { userId?: string }) => {
        console.info("User online:", data?.userId);
      });

      activeSocket.on("user-offline", (data: { userId?: string }) => {
        console.info("User offline:", data?.userId);
      });

      activeSocket.on("error", (socketError: unknown) => {
        const message = getErrorMessage(socketError);
        setError(message);
        console.error("Socket server error:", socketError);
      });
    };

    connectSocket();
    for (const eventName of AUTH_EVENTS) {
      window.addEventListener(eventName, connectSocket);
    }

    return () => {
      for (const eventName of AUTH_EVENTS) {
        window.removeEventListener(eventName, connectSocket);
      }
      if (socketInstance) {
        socketInstance.removeAllListeners();
        socketInstance.io.removeAllListeners();
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, error }}>
      {children}
    </SocketContext.Provider>
  );
}

// This hook shares its context with the provider in the same module.
// eslint-disable-next-line react-refresh/only-export-components
export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used inside SocketProvider.");
  }
  return context;
}
