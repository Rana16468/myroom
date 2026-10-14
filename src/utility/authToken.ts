import { jwtDecode } from "jwt-decode";

export const AUTH_EVENT = "auth-change";

export type AuthTokenPayload = {
  id?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
};

export const TOKEN_NAME = process.env.NEXT_PUBLIC_TOKEN_NAME || "accessToken";

export const tokenVarified = (tokenKey: string) => {
  if (typeof window === "undefined") return null;

  let token: string | null;
  try {
    token = localStorage.getItem(tokenKey);
  } catch (error) {
    console.error("Could not read the access token from local storage:", error);
    return null;
  }

  if (!token) return null;

  try {
    const decoded = jwtDecode<AuthTokenPayload>(token);
    const currentTime = Date.now() / 1000;

    if (typeof decoded.exp !== "number" || decoded.exp <= currentTime) {
      try {
        localStorage.removeItem(tokenKey);
      } catch (error) {
        console.error("Could not remove the expired access token:", error);
      }
      return null;
    }

    return decoded; // { id, email, role, iat, exp }
  } catch {
    try {
      localStorage.removeItem(tokenKey);
    } catch (error) {
      console.error("Could not remove the invalid access token:", error);
    }
    return null;
  }
};

export const hasValidAccessToken = () => Boolean(tokenVarified(TOKEN_NAME));

export const tokenRecorded = (token: string, tokenName: string): boolean => {
  try {
    if (!token || !tokenName) {
      throw new Error("Token or token name missing");
    }

    localStorage.setItem(tokenName, token);
    window.dispatchEvent(new Event(AUTH_EVENT));
    return true;
  } catch (error) {
    console.error("Failed to store token:", error);
    return false;
  }
};

export const deleteToken = (tokenName: string) => {
  if (!tokenName) {
    throw new Error("Token or token name missing");
  }

  localStorage.removeItem(tokenName);
  window.dispatchEvent(new Event(AUTH_EVENT));

  return true;
};

export const getToken = (tokenName: string) => {
  try {
    return localStorage.getItem(tokenName);
  } catch (error) {
    console.error("Failed to get token:", error);
    return null;
  }
};