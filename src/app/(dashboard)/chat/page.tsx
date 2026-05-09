'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/lib/store';

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
  const { activeChild, activeBand } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          band: activeBand,
          childName: activeChild?.name || 'your child',
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
      {/* Header */}
      <div className="pb-3">
        <h1 className="text-xl font-bold text-foreground">Ask PTR</h1>
        <p className="text-xs text-muted">
          Ask about {activeChild?.name || 'your child'}&apos;s weekly guides, milestones, daily moments, and more.
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
              I know everything about {activeChild?.name || 'your child'}&apos;s PTR content. Try asking:
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
          placeholder="Ask about PTR content..."
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
