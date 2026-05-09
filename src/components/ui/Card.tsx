interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={`bg-card rounded-2xl border border-border p-4 ${onClick ? 'text-left w-full hover:border-brand/30 transition-colors' : ''} ${className}`}
    >
      {children}
    </Component>
  );
}
