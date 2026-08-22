"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import {
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  StoredUser,
} from "@/lib/auth";
import axios from "axios";

// ── Types ─────────────────────────────────────────────────
interface AuthContextValue {
  user: StoredUser | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
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
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true on first load

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedToken = getToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setTokenState(storedToken);
      setUser(storedUser);
    }

    setIsLoading(false);
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

        setToken(data.token);
        setStoredUser(data.user);
        setTokenState(data.token);
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

        setToken(data.token);
        setStoredUser(data.user);
        setTokenState(data.token);
        setUser(data.user);

        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // ── Logout ──────────────────────────────────────────────
  const logout = useCallback(() => {
    clearAuth();
    setTokenState(null);
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
      // token invalid — log out
      logout();
    }
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isLoggedIn: !!token && !!user,
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