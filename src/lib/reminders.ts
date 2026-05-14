'use client';

// ============================================
// Browser Notification Reminders
// ============================================
// Uses the Web Notification API for in-browser reminders.
// Works while the app tab is open — no server-side push needed.

const STORAGE_KEY = 'eh_reminders_enabled';
const LAST_REMINDER_KEY = 'eh_last_reminder';
const REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export function isRemindersEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setRemindersEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function getLastReminderTime(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(LAST_REMINDER_KEY) || '0', 10);
}

function setLastReminderTime(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_REMINDER_KEY, Date.now().toString());
}

export function shouldSendReminder(): boolean {
  if (!isRemindersEnabled()) return false;
  if (getNotificationPermission() !== 'granted') return false;
  const elapsed = Date.now() - getLastReminderTime();
  return elapsed >= REMINDER_INTERVAL_MS;
}

export function sendMomentReminder(childName: string, momentName: string, sayThis: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const truncated = sayThis.length > 100 ? sayThis.slice(0, 100) + '...' : sayThis;

  try {
    new Notification(`${childName}: ${momentName}`, {
      body: truncated,
      icon: '/icon-192.png',
      tag: 'daily-moment', // replaces previous notification
      silent: false,
    });
    setLastReminderTime();
  } catch {
    // Notification constructor can fail in some contexts (e.g., service worker required on Android)
    console.warn('Notification failed — may require service worker on this platform');
  }
}

/**
 * Start a reminder interval that fires while the tab is open.
 * Returns a cleanup function.
 */
export function startReminderInterval(
  getReminder: () => { childName: string; momentName: string; sayThis: string } | null,
): () => void {
  if (!isRemindersEnabled() || !isNotificationSupported()) return () => {};

  // Check immediately on start
  if (shouldSendReminder()) {
    const r = getReminder();
    if (r) sendMomentReminder(r.childName, r.momentName, r.sayThis);
  }

  // Then check every 30 minutes
  const interval = setInterval(() => {
    if (shouldSendReminder()) {
      const r = getReminder();
      if (r) sendMomentReminder(r.childName, r.momentName, r.sayThis);
    }
  }, 30 * 60 * 1000);

  return () => clearInterval(interval);
}
