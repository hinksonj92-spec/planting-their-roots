'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getAgeString, getBandLabel, getBandFromBirthDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

export default function ChildPage() {
  const { activeChild, children, parentName, activeBand, setActiveChild, addChild, reset } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBirth, setNewBirth] = useState('');

  if (!activeChild) return null;

  return (
    <div className="py-4 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Family</h1>

      {/* Parent info */}
      <Card>
        <p className="text-sm text-muted">Parent</p>
        <p className="font-semibold text-foreground">{parentName}</p>
      </Card>

      {/* Children list */}
      <div>
        <h2 className="font-semibold text-foreground mb-3">Children</h2>
        <div className="space-y-2">
          {children.map(child => {
            const isActive = child.id === activeChild.id;
            const band = getBandFromBirthDate(child.birth_date);
            return (
              <button
                key={child.id}
                onClick={() => setActiveChild(child.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                  isActive ? 'border-brand bg-brand-light/30' : 'border-border bg-card hover:border-brand/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  isActive ? 'bg-brand' : 'bg-muted'
                }`}>
                  {child.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{child.name}</p>
                  <p className="text-sm text-secondary">{getAgeString(child.birth_date)} &middot; {getBandLabel(band)}</p>
                </div>
                {isActive && (
                  <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full font-medium">Active</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add child */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-sm text-muted hover:border-brand/30 hover:text-secondary transition-colors"
        >
          + Add another child
        </button>
      ) : (
        <Card>
          <h3 className="font-semibold text-foreground mb-3">Add Child</h3>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Child's name"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:border-brand mb-2"
            autoFocus
          />
          <input
            type="date"
            value={newBirth}
            onChange={e => setNewBirth(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:border-brand mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAdd(false); setNewName(''); setNewBirth(''); }}
              className="flex-1 border border-border rounded-xl py-2 text-sm text-secondary hover:bg-border-light transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (newName.trim() && newBirth) {
                  addChild(newName.trim(), newBirth);
                  setShowAdd(false);
                  setNewName('');
                  setNewBirth('');
                }
              }}
              disabled={!newName.trim() || !newBirth}
              className="flex-1 bg-brand text-white rounded-xl py-2 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </Card>
      )}

      {/* Reset (dev tool) */}
      <div className="pt-4 border-t border-border-light">
        <button
          onClick={() => { if (confirm('Reset all data? This cannot be undone.')) reset(); }}
          className="text-xs text-muted hover:text-red-500 transition-colors"
        >
          Reset all data
        </button>
      </div>
    </div>
  );
}
