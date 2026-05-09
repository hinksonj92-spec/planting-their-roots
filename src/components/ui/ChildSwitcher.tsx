'use client';

import { useApp } from '@/lib/store';

/**
 * Inline child switcher — shows the active child's name as a tappable pill.
 * When multiple children exist, renders all as pills for instant switching.
 * Drop this into any detail page header.
 */
export function ChildSwitcher() {
  const { children, activeChild, setActiveChild } = useApp();

  if (!activeChild || children.length <= 1) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
      {children.map(child => {
        const isActive = child.id === activeChild.id;
        return (
          <button
            key={child.id}
            onClick={() => setActiveChild(child.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-brand text-white'
                : 'bg-border-light text-secondary hover:bg-border-light/70'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isActive ? 'bg-white/20 text-white' : 'bg-white text-muted'
            }`}>
              {child.name[0].toUpperCase()}
            </span>
            {child.name}
          </button>
        );
      })}
    </div>
  );
}
