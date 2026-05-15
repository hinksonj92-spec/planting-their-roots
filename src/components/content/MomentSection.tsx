'use client';

import { useState } from 'react';
import { SayThisBlock } from './SayThisBlock';
import { DoThisBlock } from './DoThisBlock';

interface MomentSectionProps {
  momentName: string;
  sayThis: string;
  doThis: string[];
  whatThisBuilds: string;
}

export function MomentSection({ momentName, sayThis, doThis, whatThisBuilds }: MomentSectionProps) {
  const [showScript, setShowScript] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  // Truncate say_this to ~60 chars for the preview
  const preview = sayThis.length > 80
    ? sayThis.slice(0, 80).replace(/\s+\S*$/, '') + '...'
    : sayThis;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header — always visible */}
      <div className="px-4 py-3">
        <h3 className="font-semibold text-foreground text-sm">{momentName}</h3>
        <p className="text-xs text-muted mt-1 italic">&ldquo;{preview}&rdquo;</p>
      </div>

      {/* Quick-access buttons */}
      <div className="flex border-t border-border-light">
        <button
          onClick={() => { setShowScript(!showScript); if (!showScript) setShowActivities(false); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            showScript ? 'text-brand bg-brand-light/30' : 'text-secondary hover:text-foreground hover:bg-border-light/50'
          }`}
        >
          <span>💬</span>
          Full Script
        </button>
        <div className="w-px bg-border-light" />
        <button
          onClick={() => { setShowActivities(!showActivities); if (!showActivities) setShowScript(false); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            showActivities ? 'text-brand bg-brand-light/30' : 'text-secondary hover:text-foreground hover:bg-border-light/50'
          }`}
        >
          <span>🎯</span>
          Activities ({doThis.length})
        </button>
      </div>

      {/* Full script panel */}
      {showScript && (
        <div className="px-4 pb-4 border-t border-border-light">
          <SayThisBlock text={sayThis} />
          {whatThisBuilds && (
            <p className="text-xs text-muted mt-2 italic">
              {whatThisBuilds}
            </p>
          )}
        </div>
      )}

      {/* Activities panel */}
      {showActivities && (
        <div className="px-4 pb-4 border-t border-border-light">
          <DoThisBlock items={doThis} />
          {whatThisBuilds && (
            <p className="text-xs text-muted mt-2 italic">
              {whatThisBuilds}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
