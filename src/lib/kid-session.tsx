'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Child } from '@/types';

const KID_SESSION_KEY = 'evergreen-kid-session';
const SESSION_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours

interface KidSession {
  childId: string;
  childName: string;
  birthDate: string;
  loginAt: number; // timestamp
}

interface KidSessionContextType {
  session: KidSession | null;
  login: (child: Child) => void;
  logout: () => void;
  isExpired: boolean;
}

const KidSessionContext = createContext<KidSessionContextType | null>(null);

function loadSession(): KidSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(KID_SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function saveSession(session: KidSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(KID_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(KID_SESSION_KEY);
    }
  } catch {}
}

export function KidSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<KidSession | null>(() => loadSession());

  const isExpired = session ? Date.now() - session.loginAt > SESSION_TIMEOUT_MS : false;

  // Clear expired sessions
  useEffect(() => {
    if (isExpired) {
      setSession(null);
      saveSession(null);
    }
  }, [isExpired]);

  const login = useCallback((child: Child) => {
    const newSession: KidSession = {
      childId: child.id,
      childName: child.name,
      birthDate: child.birth_date,
      loginAt: Date.now(),
    };
    setSession(newSession);
    saveSession(newSession);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    saveSession(null);
  }, []);

  return (
    <KidSessionContext.Provider value={{ session, login, logout, isExpired }}>
      {children}
    </KidSessionContext.Provider>
  );
}

export function useKidSession() {
  const ctx = useContext(KidSessionContext);
  if (!ctx) throw new Error('useKidSession must be used within KidSessionProvider');
  return ctx;
}
