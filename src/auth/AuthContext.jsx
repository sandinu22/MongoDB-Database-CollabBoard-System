import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../services/api";
import { clearUserApplicationCache, getAuthToken, getAuthUser, removeAuthToken, removeAuthUser, saveAuthToken, saveAuthUser } from "../utils/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuthUser());
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));

  const applySession = useCallback((session) => {
    saveAuthToken(session.token);
    saveAuthUser(session.user);
    setUser(session.user);
  }, []);

  const logout = useCallback(() => {
    const current = getAuthUser();
    removeAuthToken();
    removeAuthUser();
    if (current?.id) clearUserApplicationCache(current.id);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    if (!token) { setLoading(false); return; }
    api.getMe()
      .then((response) => {
        if (cancelled) return;
        saveAuthUser(response.user);
        setUser(response.user);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.status === 401) logout();
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const response = await api.login(credentials);
    applySession(response);
    return response.user;
  }, [applySession]);

  const register = useCallback(async (details) => {
    const response = await api.register(details);
    applySession(response);
    return response.user;
  }, [applySession]);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
