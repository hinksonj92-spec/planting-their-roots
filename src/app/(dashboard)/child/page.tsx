'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getAgeString, getBandLabel, getBandFromBirthDate } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import DateInput from '@/components/ui/DateInput';
import type { InviteLink } from '@/types';

export default function ChildPage() {
  const {
    activeChild, children, parentName, setActiveChild,
    addChild, editChild, removeChild, reset, user, createInviteLink, getInviteLinks, getRoleForChild,
  } = useApp();
  // Show add form by default when no children exist (first-time setup)
  const [showAdd, setShowAdd] = useState(children.length === 0);
  const [newName, setNewName] = useState('');
  const [newBirth, setNewBirth] = useState('');

  // Edit state
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBirth, setEditBirth] = useState('');

  // Invite link state
  const [inviteChildId, setInviteChildId] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCreateInvite(childId: string) {
    setInviteLoading(true);
    const link = await createInviteLink(childId);
    if (link) {
      setInviteLinks(prev => [link, ...prev]);
    }
    setInviteLoading(false);
  }

  async function handleShowInvites(childId: string) {
    if (inviteChildId === childId) {
      setInviteChildId(null);
      return;
    }
    setInviteChildId(childId);
    setInviteLoading(true);
    const links = await getInviteLinks(childId);
    setInviteLinks(links);
    setInviteLoading(false);
  }

  function getInviteUrl(token: string) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/invite/${token}`;
    }
    return `/invite/${token}`;
  }

  async function copyLink(token: string) {
    const url = getInviteUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="py-4 space-y-5">
      <h1 className="text-xl font-bold text-foreground">Family</h1>

      {/* First-time setup message */}
      {children.length === 0 && (
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-brand mx-auto flex items-center justify-center mb-3">
            <span className="text-2xl">🌱</span>
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Welcome! Let&apos;s get started.</h2>
          <p className="text-sm text-secondary">Add your first child to begin their learning journey.</p>
        </div>
      )}

      {/* Parent info */}
      {children.length > 0 && (
        <Card>
          <p className="text-sm text-muted">Parent</p>
          <p className="font-semibold text-foreground">{parentName}</p>
        </Card>
      )}

      {/* Children list */}
      {children.length > 0 && <div>
        <h2 className="font-semibold text-foreground mb-3">Children</h2>
        <div className="space-y-2">
          {children.map(child => {
            const isActive = child.id === activeChild?.id;
            const band = getBandFromBirthDate(child.birth_date);
            const role = getRoleForChild(child.id);
            const showingInvites = inviteChildId === child.id;

            return (
              <div key={child.id} className="space-y-2">
                {editingChildId === child.id ? (
                  /* Edit form */
                  <Card>
                    <h3 className="font-semibold text-foreground mb-3">Edit {child.name}</h3>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Child's name"
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:border-brand mb-2"
                      autoFocus
                    />
                    <label className="block text-xs text-muted mb-1">Date of birth</label>
                    <DateInput value={editBirth} onChange={setEditBirth} className="text-sm px-3 py-2 mb-3" />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingChildId(null)}
                        className="flex-1 border border-border rounded-xl py-2 text-sm text-secondary hover:bg-border-light transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (editName.trim() && editBirth) {
                            await editChild(child.id, editName.trim(), editBirth);
                            setEditingChildId(null);
                          }
                        }}
                        disabled={!editName.trim() || !editBirth}
                        className="flex-1 bg-brand text-white rounded-xl py-2 text-sm font-semibold hover:bg-brand-dark transition-colors disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </Card>
                ) : (
                  <button
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
                    <div className="flex items-center gap-2">
                      {role && (
                        <span className="text-[10px] text-muted capitalize">{role}</span>
                      )}
                      {isActive && (
                        <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full font-medium">Active</span>
                      )}
                    </div>
                  </button>
                )}

                {/* Edit / Remove / Invite actions */}
                {editingChildId !== child.id && (
                  <div className="pl-4 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setEditingChildId(child.id);
                        setEditName(child.name);
                        setEditBirth(child.birth_date);
                      }}
                      className="text-xs text-brand font-medium hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Remove ${child.name}? This will delete all their milestones and progress. This cannot be undone.`)) {
                          await removeChild(child.id);
                        }
                      }}
                      className="text-xs text-red-500 font-medium hover:underline"
                    >
                      Remove
                    </button>
                    {user && (role === 'creator' || !role) && (
                      <button
                        onClick={() => handleShowInvites(child.id)}
                        className="text-xs text-brand font-medium hover:underline"
                      >
                        {showingInvites ? 'Hide invites' : 'Invite Parent'}
                      </button>
                    )}
                  </div>
                )}

                {/* Invite links panel */}
                {showingInvites && (
                  <Card className="ml-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-foreground">Invite Links for {child.name}</h4>
                      <button
                        onClick={() => handleCreateInvite(child.id)}
                        disabled={inviteLoading}
                        className="text-xs bg-brand text-white px-3 py-1 rounded-lg font-medium hover:bg-brand-dark transition-colors disabled:opacity-40"
                      >
                        {inviteLoading ? '...' : '+ New Link'}
                      </button>
                    </div>

                    {inviteLinks.length === 0 && !inviteLoading && (
                      <p className="text-xs text-muted">No invite links yet. Create one to share access.</p>
                    )}

                    <div className="space-y-2">
                      {inviteLinks.map(link => {
                        const isExpired = new Date(link.expires_at) < new Date();
                        const isUsed = !!link.used_by;
                        return (
                          <div key={link.id} className="flex items-center gap-2 p-2 bg-background rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono text-secondary truncate">
                                {getInviteUrl(link.token)}
                              </p>
                              <p className="text-[10px] text-muted">
                                {isUsed ? 'Used' : isExpired ? 'Expired' : `Expires ${new Date(link.expires_at).toLocaleDateString()}`}
                              </p>
                            </div>
                            {!isUsed && !isExpired && (
                              <button
                                onClick={() => copyLink(link.token)}
                                className="text-xs text-brand font-medium hover:underline whitespace-nowrap"
                              >
                                {copied === link.token ? 'Copied!' : 'Copy'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      </div>}

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
          <h3 className="font-semibold text-foreground mb-3">
            {children.length === 0 ? 'Add Your First Child' : 'Add Child'}
          </h3>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Child's name"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:border-brand mb-2"
            autoFocus
          />
          <label className="block text-xs text-muted mb-1">Date of birth</label>
          <DateInput value={newBirth} onChange={setNewBirth} className="text-sm px-3 py-2 mb-3" />
          <div className="flex gap-2">
            {children.length > 0 && (
              <button
                onClick={() => { setShowAdd(false); setNewName(''); setNewBirth(''); }}
                className="flex-1 border border-border rounded-xl py-2 text-sm text-secondary hover:bg-border-light transition-colors"
              >
                Cancel
              </button>
            )}
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
              {children.length === 0 ? 'Start Planting' : 'Add'}
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
