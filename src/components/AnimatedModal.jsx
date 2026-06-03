import { useState, useEffect } from 'react';

export default function AnimatedModal({ open, onClose, children, sheetStyle }) {
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const t = setTimeout(() => { setVisible(false); setClosing(false); }, 160);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible) return null;

  return (
    <div
      className={`modal-overlay${closing ? ' closing' : ''}`}
      onClick={onClose}
    >
      <div
        className={`modal-sheet${closing ? ' closing' : ''}`}
        onClick={e => e.stopPropagation()}
        style={sheetStyle}
      >
        {children}
      </div>
    </div>
  );
}
