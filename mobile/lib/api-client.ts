import * as SecureStore from "expo-secure-store";

/**
 * Talks to the same backend as the web app's Next.js Server Actions, but
 * over the plain REST surface under /api/mobile/v1/* (see
 * src/app/api/mobile/v1 in the main repo) since a mobile client can't call
 * Server Actions directly and doesn't use the web session cookie.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set (see mobile/.env).");
}

const REFRESH_TOKEN_KEY = "finlight.refreshToken";

// The access token only ever lives in memory — never persisted — so it
// can't be read by another app or leak in a device backup. The refresh
// token is the only thing persisted, and only in SecureStore (Keychain on
// iOS, Keystore-backed EncryptedSharedPreferences on Android).
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function storeRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearStoredRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(message: string, status: number, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Skip the auth header + refresh-retry dance — only auth/* endpoints need this. */
  skipAuth?: boolean;
}

async function rawFetch(path: string, options: RequestOptions) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!options.skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * On a 401 (expired access token), attempts exactly one silent refresh
 * using the stored refresh token, then retries the original request once.
 * A second 401 after that means the refresh token itself is dead — the
 * caller (AuthContext) is responsible for treating that as a forced
 * logout, this function only handles the single retry.
 */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return false;

  const res = await rawFetch("/api/mobile/v1/auth/refresh", {
    method: "POST",
    body: { refreshToken },
    skipAuth: true,
  });
  if (!res.ok) return false;

  const { data } = await res.json();
  setAccessToken(data.accessToken);
  await storeRefreshToken(data.refreshToken);
  return true;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await rawFetch(path, options);

  if (res.status === 401 && !options.skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await rawFetch(path, options);
    }
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? "Something went wrong.", res.status, body.issues);
  }
  return body.data as T;
}
