'use client';

interface SayThisBlockProps {
  text: string;
}

export function SayThisBlock({ text }: SayThisBlockProps) {
  if (!text) return null;
  return (
    <div className="bg-brand-light/50 border-l-4 border-brand rounded-r-xl px-4 py-3 my-3">
      <p className="text-xs font-semibold text-brand-dark uppercase tracking-wide mb-1">Say This</p>
      <p className="text-foreground leading-relaxed text-[15px] italic">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  );
}
