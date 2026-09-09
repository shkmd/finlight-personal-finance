import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  apiRequest,
  ApiError,
  setAccessToken,
  getStoredRefreshToken,
  storeRefreshToken,
  clearStoredRefreshToken,
} from "@/lib/api-client";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True only while restoring a session from SecureStore on cold start. */
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // On cold start, a stored refresh token is the only evidence of a prior
  // session — there's no user profile cached locally, so restoring one
  // means immediately spending the refresh token for a fresh access token
  // pair and re-deriving `user` from that response.
  useEffect(() => {
    (async () => {
      const refreshToken = await getStoredRefreshToken();
      if (!refreshToken) {
        setIsRestoring(false);
        return;
      }
      try {
        const data = await apiRequest<{ accessToken: string; refreshToken: string }>(
          "/api/mobile/v1/auth/refresh",
          { method: "POST", body: { refreshToken }, skipAuth: true }
        );
        setAccessToken(data.accessToken);
        await storeRefreshToken(data.refreshToken);
        // The refresh response has no reason to carry the full profile —
        // fetch it separately now that a valid access token exists.
        const me = await apiRequest<AuthUser>("/api/mobile/v1/auth/me");
        setUser(me);
      } catch {
        await clearStoredRefreshToken();
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const data = await apiRequest<LoginResponse>("/api/mobile/v1/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuth: true,
    });
    setAccessToken(data.accessToken);
    await storeRefreshToken(data.refreshToken);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string) {
    await apiRequest<{ registered: true }>("/api/mobile/v1/auth/register", {
      method: "POST",
      body: { name, email, password },
      skipAuth: true,
    });
    await login(email, password);
  }

  async function logout() {
    const refreshToken = await getStoredRefreshToken();
    setAccessToken(null);
    await clearStoredRefreshToken();
    setUser(null);
    if (refreshToken) {
      // Best-effort — the local session is already cleared either way.
      await apiRequest("/api/mobile/v1/auth/logout", {
        method: "POST",
        body: { refreshToken },
        skipAuth: true,
      }).catch(() => {});
    }
  }

  return (
    <AuthContext.Provider value={{ user, isRestoring, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider.");
  return ctx;
}

export { ApiError };
