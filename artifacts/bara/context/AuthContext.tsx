import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setBaseUrl, setAuthTokenGetter } from "../src/lib/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
setBaseUrl(BASE_URL);

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: "customer" | "driver" | "both";
  city: string;
  profilePhoto?: string | null;
  isAvailable: boolean;
  rating?: number | null;
  totalJobs: number;
  vehicleDescription?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeMode: "customer" | "driver";
  setActiveMode: (mode: "customer" | "driver") => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: "customer" | "driver" | "both";
  city: string;
  vehicleDescription?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

function defaultMode(role: "customer" | "driver" | "both"): "customer" | "driver" {
  return role === "driver" ? "driver" : "customer";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMode, setActiveModeState] = useState<"customer" | "driver">("customer");

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem("bara_token");
      const storedUser = await AsyncStorage.getItem("bara_user");
      const storedMode = await AsyncStorage.getItem("bara_mode");
      if (storedToken && storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setAuthTokenGetter(() => storedToken);
        setActiveModeState((storedMode as "customer" | "driver") || defaultMode(parsedUser.role));
      }
    } catch {}
    setIsLoading(false);
  }

  async function safeJson(res: Response) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(res.ok ? "Unexpected server response" : `Server error (${res.status})`);
    }
  }

  async function login(email: string, password: string) {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error("Could not reach server. Check your internet connection.");
    }
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Login failed");
    const mode = defaultMode(data.user.role);
    setActiveModeState(mode);
    await AsyncStorage.setItem("bara_mode", mode);
    await persistAuth(data.token, data.user);
  }

  async function register(registerData: RegisterData) {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
    } catch {
      throw new Error("Could not reach server. Check your internet connection.");
    }
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || "Registration failed");
    const mode = defaultMode(data.user.role);
    setActiveModeState(mode);
    await AsyncStorage.setItem("bara_mode", mode);
    await persistAuth(data.token, data.user);
  }

  async function persistAuth(tok: string, userData: User) {
    setToken(tok);
    setUser(userData);
    setAuthTokenGetter(() => tok);
    await AsyncStorage.setItem("bara_token", tok);
    await AsyncStorage.setItem("bara_user", JSON.stringify(userData));
  }

  async function logout() {
    setToken(null);
    setUser(null);
    setActiveModeState("customer");
    setAuthTokenGetter(() => null);
    await AsyncStorage.removeItem("bara_token");
    await AsyncStorage.removeItem("bara_user");
    await AsyncStorage.removeItem("bara_mode");
  }

  async function setActiveMode(mode: "customer" | "driver") {
    setActiveModeState(mode);
    await AsyncStorage.setItem("bara_mode", mode);
  }

  function updateUser(updatedUser: User) {
    setUser(updatedUser);
    AsyncStorage.setItem("bara_user", JSON.stringify(updatedUser));
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, activeMode, setActiveMode, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
