import { useState, useEffect } from 'react';
import { todayStr } from '../utils/dates';

// Fecha de hoy como estado vivo: se actualiza al volver a la app (PWA abierta
// de un día para otro) sin necesidad de recargar.
export function useToday() {
  const [today, setToday] = useState(todayStr);

  useEffect(() => {
    const update = () => {
      const now = todayStr();
      setToday(prev => (prev === now ? prev : now));
    };
    document.addEventListener('visibilitychange', update);
    window.addEventListener('focus', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('focus', update);
    };
  }, []);

  return today;
}
