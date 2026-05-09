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
 * Auto-inserts slashes as you type digits.
 */
export default function DateInput({ value, onChange, className = '' }: DateInputProps) {
  const [display, setDisplay] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      setDisplay(`${m}/${d}/${y}`);
    } else {
      setDisplay('');
    }
  }, [value]);

  function formatDigits(digits: string): string {
    let out = '';
    for (let i = 0; i < digits.length && i < 8; i++) {
      if (i === 2 || i === 4) out += '/';
      out += digits[i];
    }
    return out;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Strip everything except digits
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const formatted = formatDigits(digits);

    setDisplay(formatted);

    // Once we have all 8 digits (MMDDYYYY), validate and emit
    if (digits.length === 8) {
      const mm = digits.slice(0, 2);
      const dd = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      const month = parseInt(mm, 10);
      const day = parseInt(dd, 10);
      const year = parseInt(yyyy, 10);

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        onChange(`${yyyy}-${mm}-${dd}`);
      }
    } else if (value) {
      // Incomplete — clear parent so form stays disabled
      onChange('');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Block non-digit keys (except navigation/control keys)
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }

  const baseClass = 'w-full border border-border rounded-xl px-4 py-3 text-foreground bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30';

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="MM/DD/YYYY"
      maxLength={10}
      className={`${baseClass} ${className}`}
    />
  );
}
