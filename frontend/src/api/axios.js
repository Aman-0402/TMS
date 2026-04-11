import axios from "axios";

import { ACCESS_TOKEN_KEY, clearStoredAuth } from "../auth/storage";

const API = axios.create({
  baseURL: "https://tms.up.railway.app/api",
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default API;
