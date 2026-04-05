import { createContext, useContext, useMemo, useState } from "react";

import API from "../api/axios";
import { clearStoredAuth, getStoredAuth, storeAuth } from "./storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(getStoredAuth);

  const login = async ({ username, password }) => {
    const response = await API.post("token/", { username, password });

    storeAuth({
      access: response.data.access,
      refresh: response.data.refresh,
      username,
      role: response.data.role,
    });

    setAuthState({
      accessToken: response.data.access,
      refreshToken: response.data.refresh,
      role: response.data.role,
      user: { username, role: response.data.role },
    });
  };

  const logout = () => {
    clearStoredAuth();
    setAuthState({
      accessToken: null,
      refreshToken: null,
      role: null,
      user: null,
    });
  };

  const value = useMemo(
    () => ({
      accessToken: authState.accessToken,
      refreshToken: authState.refreshToken,
      role: authState.role,
      isAuthenticated: Boolean(authState.accessToken),
      user: authState.user,
      login,
      logout,
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
