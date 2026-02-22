import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async (token) => {
    try {
      // FIX #1: Save token to localStorage if provided
      if (token) {
        localStorage.setItem('token', token);
      }

      // FIX #2: Get token from localStorage or parameter
      const t = token || localStorage.getItem('token');
      if (!t) {
        setUser(null);
        setLoading(false);
        return;
      }

      // FIX #3: Fetch user data from /api/auth/me
      const me = await authApi.me();
      setUser(me);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load user:', err.message);
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, []);

  // FIX #4: Run only once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    // If token in URL, save it and clean URL
    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, '', window.location.pathname || '/');
      loadUser(token);
    } else {
      // Otherwise load from localStorage
      loadUser();
    }
  }, []); // FIX #5: Empty dependency array - run only once

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err.message);
    }
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser: () => loadUser() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}