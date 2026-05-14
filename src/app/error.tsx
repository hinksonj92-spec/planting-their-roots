'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-14 h-14 rounded-full bg-brand-light flex items-center justify-center mb-4">
        <span className="text-2xl">🌱</span>
      </div>
      <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
      <p className="text-secondary text-sm text-center max-w-xs mb-6">
        An unexpected error occurred. Your data is safe — try again or refresh the page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="bg-brand text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-dark transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="border border-border text-foreground px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-card transition-colors"
        >
          Refresh Page
        </button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-6 text-xs text-red-500 max-w-md overflow-auto bg-red-50 p-3 rounded-lg">
          {error.message}
        </pre>
      )}
    </div>
  );
}
