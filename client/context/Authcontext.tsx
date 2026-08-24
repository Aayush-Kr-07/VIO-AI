"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { clearAuth, setStoredUser, StoredUser } from "@/lib/auth";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────
interface AuthContextValue {
  user: StoredUser | null;
  token: boolean;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ email: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

const isTransientLoginError = (error: unknown) => {
  if (!axios.isAxiosError(error)) return true;
  const status = error.response?.status;
  return !status || status >= 500;
};

// ── Provider ──────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [token, setTokenState] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true on first load

  // Validate the HttpOnly session cookie before considering the user signed in.
  useEffect(() => {
    axiosInstance.get("/api/auth/me")
      .then(({ data }) => { setStoredUser(data.user); setTokenState(true); setUser(data.user); })
      .catch(() => { clearAuth(); setTokenState(false); setUser(null); })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Login ───────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        let data;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await axiosInstance.post("/api/auth/login", {
              email: email.trim(),
              password,
            });
            data = response.data;
            break;
          } catch (error) {
            if (attempt === 1 || !isTransientLoginError(error)) throw error;
            await wait(800);
          }
        }

        setStoredUser(data.user);
        setTokenState(true);
        setUser(data.user);

        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // ── Register ────────────────────────────────────────────
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const { data } = await axiosInstance.post("/api/auth/register", {
          name,
          email,
          password,
        });

        setTokenState(false);
        setUser(null);
        return { email: data.email };
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // ── Logout ──────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await axiosInstance.post("/api/auth/logout"); } catch { /* session may already be expired */ }
    clearAuth();
    setTokenState(false);
    setUser(null);
    router.push("/");
  }, [router]);

  // ── Refresh user from API ───────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/api/auth/me");
      setStoredUser(data.user);
      setUser(data.user);
    } catch {
      await logout();
    }
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isLoggedIn: token && !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Raw context export (used by useAuth hook) ─────────────
export { AuthContext };