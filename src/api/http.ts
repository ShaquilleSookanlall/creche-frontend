// src/api/http.js
import axios from "axios";

// ---- Base config ----
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8086";

const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, // we use header tokens, not cookies
});

// ---- Token helpers ----
const TOKEN_KEY = "creche_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearToken() {
  setToken(null);
}

// ---- Interceptors ----
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // If token is invalid/expired, you can clear it here
    if (err?.response?.status === 401) {
      // Optionally: clearToken();
      // Optionally: redirect to /login (we'll handle from components)
    }
    return Promise.reject(err);
  }
);

export default http;
