'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKidSession } from '@/lib/kid-session';
import type { Child } from '@/types';
import { getEvergreenPhase, getEvergreenPhaseLabel } from '@/lib/utils';
import Link from 'next/link';

const STORAGE_KEY = 'evergreen-app-state';

function getChildrenFromStorage(): Child[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const state = JSON.parse(stored);
      // Only show children age 5+ (Phase 1+)
      return (state.children || []).filter((c: Child) => {
        const phase = getEvergreenPhase(c.birth_date);
        return phase > 0;
      });
    }
  } catch {}
  return [];
}

export default function KidLoginPage() {
  const router = useRouter();
  const { session, login } = useKidSession();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setChildren(getChildrenFromStorage());
  }, []);

  // If already logged in, redirect to kid home
  useEffect(() => {
    if (session && mounted) {
      router.replace('/kid/home');
    }
  }, [session, mounted, router]);

  if (!mounted) return null;

  // No eligible children
  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-brand text-2xl font-bold">E</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">No Profiles Available</h1>
          <p className="text-secondary text-sm mb-6">
            Ask your parent to set up your profile and create a login PIN for you.
          </p>
          <Link
            href="/login"
            className="text-sm text-brand font-medium hover:underline"
          >
            Parent login
          </Link>
        </div>
      </div>
    );
  }

  function handlePinSubmit() {
    if (!selectedChild) return;
    setError('');

    if (!selectedChild.kid_pin) {
      setError('No PIN set. Ask your parent to set up your login PIN.');
      return;
    }

    if (pin !== selectedChild.kid_pin) {
      setError('Wrong PIN. Try again.');
      setPin('');
      return;
    }

    login(selectedChild);
    router.push('/kid/home');
  }

  // Step 1: Select who you are
  if (!selectedChild) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">E</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Who&apos;s learning today?</h1>
          </div>

          <div className="space-y-3">
            {children.map(child => {
              const phase = getEvergreenPhase(child.birth_date);
              const phaseLabel = getEvergreenPhaseLabel(phase);
              const hasPIN = !!child.kid_pin;

              return (
                <button
                  key={child.id}
                  onClick={() => {
                    setSelectedChild(child);
                    setPin('');
                    setError('');
                  }}
                  disabled={!hasPIN}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all ${
                    hasPIN
                      ? 'border-border bg-card hover:border-brand/50 hover:shadow-sm'
                      : 'border-border/50 bg-card/50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-white font-bold text-lg">
                    {child.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-lg">{child.name}</p>
                    <p className="text-sm text-secondary">{phaseLabel}</p>
                  </div>
                  {!hasPIN && (
                    <span className="text-[10px] text-muted">No PIN</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/login"
              className="text-sm text-secondary hover:text-foreground transition-colors"
            >
              Parent login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Enter PIN
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">{selectedChild.name[0].toUpperCase()}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Hi, {selectedChild.name}!</h1>
          <p className="text-secondary mt-1">Enter your 4-digit PIN</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-colors ${
                pin.length > i
                  ? 'border-brand bg-brand-light text-brand-dark'
                  : 'border-border bg-card text-transparent'
              }`}
            >
              {pin.length > i ? '•' : ''}
            </div>
          ))}
        </div>

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => {
                if (pin.length < 4) {
                  const newPin = pin + num;
                  setPin(newPin);
                  setError('');
                  if (newPin.length === 4) {
                    // Auto-submit on 4th digit
                    setTimeout(() => {
                      if (!selectedChild.kid_pin) {
                        setError('No PIN set. Ask your parent to set up your login PIN.');
                        setPin('');
                        return;
                      }
                      if (newPin !== selectedChild.kid_pin) {
                        setError('Wrong PIN. Try again.');
                        setPin('');
                        return;
                      }
                      login(selectedChild);
                      router.push('/kid/home');
                    }, 200);
                  }
                }
              }}
              className="w-16 h-16 rounded-xl bg-card border border-border text-xl font-semibold text-foreground hover:bg-brand-light hover:border-brand/30 transition-colors mx-auto flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedChild(null);
              setPin('');
              setError('');
            }}
            className="w-16 h-16 rounded-xl text-sm text-secondary hover:text-foreground transition-colors mx-auto flex items-center justify-center"
          >
            Back
          </button>
          <button
            onClick={() => {
              if (pin.length < 4) {
                const newPin = pin + '0';
                setPin(newPin);
                setError('');
                if (newPin.length === 4) {
                  setTimeout(() => {
                    if (!selectedChild.kid_pin) {
                      setError('No PIN set. Ask your parent to set up your login PIN.');
                      setPin('');
                      return;
                    }
                    if (newPin !== selectedChild.kid_pin) {
                      setError('Wrong PIN. Try again.');
                      setPin('');
                      return;
                    }
                    login(selectedChild);
                    router.push('/kid/home');
                  }, 200);
                }
              }
            }}
            className="w-16 h-16 rounded-xl bg-card border border-border text-xl font-semibold text-foreground hover:bg-brand-light hover:border-brand/30 transition-colors mx-auto flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={() => { setPin(p => p.slice(0, -1)); setError(''); }}
            className="w-16 h-16 rounded-xl text-sm text-secondary hover:text-foreground transition-colors mx-auto flex items-center justify-center"
          >
            Delete
          </button>
        </div>

        {error && (
          <p className="text-center text-sm text-red-500 font-medium mb-4">{error}</p>
        )}
      </div>
    </div>
  );
}
