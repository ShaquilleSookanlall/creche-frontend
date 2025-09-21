import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import http, { setToken, clearToken, getToken } from "../api/http";

// ----------------- Types -----------------

type User = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ----------------- Provider -----------------

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check token on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      http.get<User>("/api/auth/me")
        .then(res => setUser(res.data))
        .catch(() => {
          clearToken();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ---- Methods ----
  const login = async (email: string, password: string) => {
    const res = await http.post<{ token: string }>("/api/auth/login", { email, password });
    setToken(res.data.token);
    const me = await http.get<User>("/api/auth/me");
    setUser(me.data);
  };

  const register = async (fullName: string, email: string, password: string) => {
    await http.post<number>("/api/auth/register", { fullName, email, password });
    // auto-login right after register
    await login(email, password);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ----------------- Hook -----------------

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
