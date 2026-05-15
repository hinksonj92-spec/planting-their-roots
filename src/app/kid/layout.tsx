import { KidSessionProvider } from '@/lib/kid-session';

export default function KidLayout({ children }: { children: React.ReactNode }) {
  return (
    <KidSessionProvider>
      {children}
    </KidSessionProvider>
  );
}
