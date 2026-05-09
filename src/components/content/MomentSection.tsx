'use client';

import { SayThisBlock } from './SayThisBlock';
import { DoThisBlock } from './DoThisBlock';

interface MomentSectionProps {
  momentName: string;
  sayThis: string;
  doThis: string[];
  whatThisBuilds: string;
}

export function MomentSection({ momentName, sayThis, doThis, whatThisBuilds }: MomentSectionProps) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 bg-border-light/50 border-b border-border">
        <h3 className="font-semibold text-foreground">{momentName}</h3>
      </div>
      <div className="px-4 py-3">
        <SayThisBlock text={sayThis} />
        <DoThisBlock items={doThis} />
        {whatThisBuilds && (
          <p className="text-sm text-muted mt-3 italic border-t border-border-light pt-3">
            {whatThisBuilds}
          </p>
        )}
      </div>
    </div>
  );
}
