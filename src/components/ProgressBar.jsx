import { useState, useEffect } from 'react';

export default function ProgressBar({ value, color, className = '', style = {}, thick = false }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.max(0, Math.min(100, value ?? 0))), 80);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <div className={`progress-bar${thick ? ' thick' : ''} ${className}`} style={style}>
      <div className="progress-fill" style={{ width: `${width}%`, ...(color ? { background: color } : {}) }} />
    </div>
  );
}
