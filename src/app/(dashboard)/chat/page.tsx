'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/lib/store';
import { getBandFromBirthDate, getAgeString, getBandShortLabel } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "What should I focus on this week?",
  "How can I support language development?",
  "What milestones should I look for?",
  "Help me with a daily routine",
];

export default function ChatPage() {
  const { activeChild, children } = useApp();

  // Multi-child selection: set of selected child IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(activeChild ? [activeChild.id] : [])
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync active child when it changes
  useEffect(() => {
    if (activeChild && selectedIds.size === 0) {
      setSelectedIds(new Set([activeChild.id]));
    }
  }, [activeChild]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function toggleChild(childId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(childId)) {
        // Don't allow deselecting the last one
        if (next.size > 1) next.delete(childId);
      } else {
        next.add(childId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === children.length) {
      // Deselect all except active
      setSelectedIds(new Set(activeChild ? [activeChild.id] : [children[0]?.id].filter(Boolean)));
    } else {
      setSelectedIds(new Set(children.map(c => c.id)));
    }
  }

  const selectedChildren = children.filter(c => selectedIds.has(c.id));
  const allSelected = selectedIds.size === children.length;

  // Build display name for header
  const headerName = selectedChildren.length === 1
    ? selectedChildren[0].name
    : selectedChildren.length === children.length
      ? 'All Children'
      : selectedChildren.map(c => c.name).join(' & ');

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Build children array for the API
      const childrenPayload = selectedChildren.map(c => ({
        name: c.name,
        band: getBandFromBirthDate(c.birth_date),
        age: getAgeString(c.birth_date),
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          // Backward compatible: still send band/childName for single child
          band: childrenPayload[0]?.band ?? 2,
          childName: childrenPayload[0]?.name ?? 'your child',
          // New: multi-child array
          children: childrenPayload,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages([...updatedMessages, { role: 'assistant', content: `Sorry, something went wrong: ${data.error}` }]);
      } else {
        setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages([...updatedMessages, { role: 'assistant', content: 'Sorry, I couldn\'t connect. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header with multi-child selector */}
      <div className="pb-3">
        <h1 className="text-xl font-bold text-foreground">Ask EH</h1>

        {/* Child selector chips */}
        {children.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto mt-2 pb-1 -mx-1 px-1 scrollbar-hide">
            <button
              onClick={toggleAll}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                allSelected
                  ? 'bg-brand text-white'
                  : 'bg-card border border-border text-secondary hover:border-brand/30'
              }`}
            >
              All Children
            </button>
            {children.map(child => {
              const isSelected = selectedIds.has(child.id);
              const band = getBandFromBirthDate(child.birth_date);
              return (
                <button
                  key={child.id}
                  onClick={() => toggleChild(child.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-brand text-white'
                      : 'bg-card border border-border text-secondary hover:border-brand/30'
                  }`}
                >
                  <span>{child.name}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-muted'}`}>
                    {getBandShortLabel(band)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted mt-1">
          Ask about {headerName}&apos;s weekly guides, milestones, daily moments, and more.
        </p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="pt-8 text-center">
            <div className="w-14 h-14 rounded-full bg-brand-light/40 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🌱</span>
            </div>
            <p className="text-sm text-secondary mb-4">
              I know everything about {headerName}&apos;s Planting Roots content. Try asking:
            </p>
            <div className="space-y-2 max-w-xs mx-auto">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-sm p-3 rounded-xl border border-border bg-card hover:border-brand/30 hover:bg-brand-light/10 transition-all text-secondary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand text-white rounded-br-md'
                  : 'bg-card border border-border text-foreground rounded-bl-md'
              }`}
            >
              {msg.content.split('\n').map((line, j) => (
                <p key={j} className={j > 0 ? 'mt-2' : ''}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-border-light">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about Planting Roots content..."
          disabled={loading}
          className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-card focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:opacity-50"
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
}
