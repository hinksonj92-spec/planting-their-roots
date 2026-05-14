'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#FAFAF8' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: '#E8F0EA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            fontSize: 28,
          }}>
            🌱
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 280, marginBottom: 24 }}>
            The app encountered a critical error. Your data is safe.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#497C59',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                backgroundColor: 'transparent',
                color: '#1A1A1A',
                border: '1px solid #E5E5E5',
                padding: '10px 24px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
