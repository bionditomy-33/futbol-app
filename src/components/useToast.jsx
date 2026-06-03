import { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const ToastEl = toast ? (
    <div style={{
      position: 'fixed',
      bottom: 'calc(72px + env(safe-area-inset-bottom, 0px) + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#263238',
      color: 'white',
      padding: '10px 20px',
      borderRadius: 'var(--radius-sm)',
      fontSize: 14,
      fontWeight: 600,
      zIndex: 300,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      whiteSpace: 'nowrap',
      boxShadow: 'var(--shadow-md)',
      animation: 'slideUpFade 0.2s ease',
      pointerEvents: 'none',
    }}>
      <span style={{ color: 'var(--emerald-400)' }}>✓</span> {toast}
    </div>
  ) : null;

  return { showToast, ToastEl };
}
