'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import {
  isNotificationSupported,
  getNotificationPermission,
  isRemindersEnabled,
  setRemindersEnabled,
  requestNotificationPermission,
} from '@/lib/reminders';

export default function SettingsPage() {
  const { parentName, user, signOut } = useApp();
  const router = useRouter();
  const [reminders, setReminders] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  useEffect(() => {
    setReminders(isRemindersEnabled());
    setNotifPermission(getNotificationPermission());
  }, []);

  async function toggleReminders() {
    if (!reminders) {
      // Turning on — request permission if needed
      if (notifPermission !== 'granted') {
        const granted = await requestNotificationPermission();
        setNotifPermission(granted ? 'granted' : 'denied');
        if (!granted) return;
      }
      setRemindersEnabled(true);
      setReminders(true);
    } else {
      setRemindersEnabled(false);
      setReminders(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  const notifSupported = isNotificationSupported();

  return (
    <div className="py-4 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>
      <Card>
        <p className="text-sm text-muted mb-1">Account</p>
        <p className="font-semibold text-foreground">{parentName}</p>
        {user?.email && (
          <p className="text-xs text-secondary mt-0.5">{user.email}</p>
        )}
      </Card>

      {/* Notification Reminders */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Daily Moment Reminders</p>
            <p className="text-xs text-secondary mt-0.5">
              {!notifSupported
                ? 'Notifications not supported in this browser'
                : notifPermission === 'denied'
                ? 'Notifications blocked — check browser settings'
                : 'Get gentle reminders for daily moments while the app is open'
              }
            </p>
          </div>
          <button
            onClick={toggleReminders}
            disabled={!notifSupported || notifPermission === 'denied'}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              reminders ? 'bg-brand' : 'bg-border'
            } ${(!notifSupported || notifPermission === 'denied') ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                reminders ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold text-foreground mb-1">About</p>
        <p className="text-sm text-secondary">
          Evergreen Homeschool: Planting Roots is Phase 0 — a developmental formation guide for ages 0-4 that builds the human substrate your child needs for everything that comes next.
        </p>
      </Card>
      <button
        onClick={handleSignOut}
        className="w-full border border-red-200 text-red-600 py-3 px-6 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
