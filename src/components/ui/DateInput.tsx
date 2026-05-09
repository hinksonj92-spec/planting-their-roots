'use client';

import { useState, useRef, useEffect } from 'react';

interface DateInputProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Typeable date input with MM/DD/YYYY format.
 * Stores value as YYYY-MM-DD internally but displays as MM/DD/YYYY for usability.
 * Falls back to native date picker on mobile via a hidden input overlay.
 */
export default function DateInput({ value, onChange, className = '' }: DateInputProps) {
  const [display, setDisplay] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nativeRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setDisplay(`${m}/${d}/${y}`);
    } else {
      setDisplay('');
    }
  }, [value]);

  function parseAndEmit(raw: string) {
    setDisplay(raw);

    // Auto-insert slashes
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 8) {
      const mm = digits.slice(0, 2);
      const dd = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      const month = parseInt(mm, 10);
      const day = parseInt(dd, 10);
      const year = parseInt(yyyy, 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const formatted = `${yyyy}-${mm}-${dd}`;
        onChange(formatted);
        setDisplay(`${mm}/${dd}/${yyyy}`);
        return;
      }
    }

    // Try parsing MM/DD/YYYY directly
    const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, mm, dd, yyyy] = match;
      const month = parseInt(mm, 10);
      const day = parseInt(dd, 10);
      const year = parseInt(yyyy, 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        const formatted = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        onChange(formatted);
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Auto-insert slashes after MM and DD
    const val = display;
    if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
      if (val.length === 2 && !val.includes('/')) {
        setDisplay(val + '/');
      } else if (val.length === 5 && val.charAt(2) === '/' && val.split('/').length === 2) {
        setDisplay(val + '/');
      }
    }
  }

  const baseClass = 'w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30';

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={e => parseAndEmit(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="MM/DD/YYYY"
        maxLength={10}
        className={`${baseClass} ${className}`}
      />
      {/* Hidden native date picker for mobile tap-to-open */}
      <input
        ref={nativeRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        style={{ pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
