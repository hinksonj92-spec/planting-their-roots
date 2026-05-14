'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Unregister any existing service workers — the SW was caching stale
    // error pages and serving them even after deploys fixed the underlying
    // issue. For a dynamic Supabase-backed app, SW caching does more harm
    // than good. Remove this cleanup code once all users have cleared their SW.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister());
      });
      // Also clear the old caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    }
  }, []);

  return null;
}
