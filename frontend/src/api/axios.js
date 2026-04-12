import axios from "axios";
import { ACCESS_TOKEN_KEY, clearStoredAuth } from "../auth/storage";

/**
 * API Base URL Configuration
 *
 * IMPORTANT: The baseURL should be the API root WITHOUT trailing endpoints.
 * Example: https://tms.up.railway.app/api
 *
 * All API calls use relative paths:
 * - API.post("login/") → https://tms.up.railway.app/api/login/ ✅
 * - API.get("users/") → https://tms.up.railway.app/api/users/ ✅
 *
 * Never do: API.post("/api/login/") ❌ (creates double /api)
 */

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, "") // Remove trailing slash if present
  : "https://tms.up.railway.app"; // Fallback for development

// Construct complete baseURL with /api suffix
const baseURL = `${API_URL}/api`;

console.log(`[API] Configured baseURL: ${baseURL}`);

const API = axios.create({
  baseURL,
  timeout: 30000, // 30 second timeout
});

/**
 * Request interceptor: Add JWT token to Authorization header
 */
API.interceptors.request.use(
  (req) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }

    return req;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle errors and token expiration
 */
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      console.warn("[API] Unauthorized (401) - Clearing auth and redirecting to login");
      clearStoredAuth();
      window.location.href = "/login";
    }

    // Log other errors for debugging
    if (error.response) {
      console.error(`[API] Error ${error.response.status}:`, error.response.data);
    } else if (error.request) {
      console.error("[API] No response received:", error.request);
    } else {
      console.error("[API] Error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default API;