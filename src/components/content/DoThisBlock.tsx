'use client';

interface DoThisBlockProps {
  items: string[];
}

export function DoThisBlock({ items }: DoThisBlockProps) {
  if (!items.length) return null;
  return (
    <div className="my-3">
      <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">Do This</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[15px] leading-relaxed">
            <span className="text-brand mt-1 shrink-0">&#8226;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
