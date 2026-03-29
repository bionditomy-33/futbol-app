import { useState, useRef } from 'react';
import { useStore, getState } from '../store/useStore';
import { INITIAL_CATALOG } from '../data/initialData';
import { todayStr, formatDate, getDayName } from '../utils/dates';
import { GymIcon, ChevronLeft } from '../components/Icons';

const RATING_COLORS = ['', '#EF5350', '#FF7043', '#FFC107', '#66BB6A', '#2E7D32'];
const RATING_LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'];

const TODAY = todayStr();

// Retorna el lunes de la semana que contiene dateStr (YYYY-MM-DD)
function weekStartStr(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getCurrentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Lee del estado del store (en memoria), no de localStorage.
// Así evitamos exportar null cuando catalog nunca fue persistido.
function exportData() {
  const s = getState();
  const data = {
    catalog:  s.catalog,
    routines: s.routines,
    schedule: s.schedule,
    history:  s.history,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `futbol-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Historial({ onBack } = {}) {
  const { history, routines, schedule } = useStore();
  const fileInputRef = useRef(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [pendingData, setPendingData]     = useState(null);
  const [importError, setImportError]     = useState('');
  const currentMonth = getCurrentMonthStr();

  // Incluir días con entrenamiento completado O con gym marcado
  const entries = Object.entries(history)
    .filter(([, day]) => day.done || day.gym)
    .sort(([a], [b]) => b.localeCompare(a));

  // Métricas del mes
  const [yr, mo] = currentMonth.split('-').map(Number);
  const daysInM = new Date(yr, mo, 0).getDate();
  const monthDays = [];
  for (let d = 1; d <= daysInM; d++) {
    monthDays.push(`${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  const monthPast    = monthDays.filter(d => d <= TODAY);
  const monthPlanned = monthPast.filter(d => !!schedule[d]).length;
  const monthDone    = monthPast.filter(d => history[d]?.done).length;
  const monthGym     = monthPast.filter(d => history[d]?.gym).length;
  const monthPct     = monthPlanned > 0 ? Math.round((monthDone / monthPlanned) * 100) : 0;

  // Sesiones por tipo de rutina (todos los tiempos)
  const sessionsByType = (() => {
    const counts = {};
    for (const day of Object.values(history)) {
      if (!day.done) continue;
      const key = day.routineId || '__none__';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([id, count]) => {
        const r = routines.find(r => r.id === id);
        return { name: r ? r.name : 'Rutina eliminada', count };
      })
      .sort((a, b) => b.count - a.count);
  })();

  // Rachas por tipo de rutina (semanas consecutivas)
  const streaksByType = (() => {
    // routineId → Set<weekStartStr>
    const routineWeeks = {};
    for (const [dateStr, day] of Object.entries(history)) {
      if (!day.done || !day.routineId) continue;
      const ws = weekStartStr(dateStr);
      if (!routineWeeks[day.routineId]) routineWeeks[day.routineId] = new Set();
      routineWeeks[day.routineId].add(ws);
    }

    const currentWS = weekStartStr(TODAY);

    return Object.entries(routineWeeks).map(([routineId, weeks]) => {
      const r = routines.find(r => r.id === routineId);
      const name = r ? r.name : 'Rutina eliminada';

      // Semanas consecutivas desde la semana actual hacia atrás
      let streak = 0;
      const d = new Date(currentWS + 'T12:00:00');
      while (weeks.has(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)) {
        streak++;
        d.setDate(d.getDate() - 7);
      }

      // Si racha = 0, cuántas semanas atrás fue la última vez
      let lastWeeksAgo = null;
      if (streak === 0) {
        const c = new Date(currentWS + 'T12:00:00');
        c.setDate(c.getDate() - 7);
        for (let i = 1; i <= 52; i++) {
          const ws = `${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,'0')}-${String(c.getDate()).padStart(2,'0')}`;
          if (weeks.has(ws)) { lastWeeksAgo = i; break; }
          c.setDate(c.getDate() - 7);
        }
      }

      return { name, streak, lastWeeksAgo };
    }).sort((a, b) => b.streak - a.streak);
  })();

  // Valida y normaliza el backup. Retorna el objeto listo para importar.
  function normalizeBackup(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new Error('Formato inválido.');
    if (!('routines' in data && 'schedule' in data && 'history' in data))
      throw new Error('Faltan claves obligatorias (routines, schedule, history).');
    if (!Array.isArray(data.routines))
      throw new Error('El campo "routines" debe ser un array.');
    if (data.schedule === null || typeof data.schedule !== 'object' || Array.isArray(data.schedule))
      throw new Error('El campo "schedule" tiene formato incorrecto.');
    if (data.history === null || typeof data.history !== 'object' || Array.isArray(data.history))
      throw new Error('El campo "history" tiene formato incorrecto.');

    // catalog null o ausente → usar catálogo por defecto
    const catalog = (data.catalog && typeof data.catalog === 'object' && !Array.isArray(data.catalog))
      ? data.catalog
      : INITIAL_CATALOG;

    return { ...data, catalog };
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const normalized = normalizeBackup(parsed);
        setPendingData(normalized);
        setImportError('');
        setImportConfirm(true);
      } catch (err) {
        setImportError(err.message || 'El archivo no es un backup válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function confirmImport() {
    if (!pendingData) return;
    // Guardar copia de seguridad antes de reemplazar
    try {
      const preBackup = {
        catalog:  localStorage.getItem('catalog'),
        routines: localStorage.getItem('routines'),
        schedule: localStorage.getItem('schedule'),
        history:  localStorage.getItem('history'),
      };
      localStorage.setItem('tb_backup_pre_import', JSON.stringify(preBackup));
    } catch { /* si no hay espacio, seguimos igual */ }

    try {
      localStorage.setItem('catalog',  JSON.stringify(pendingData.catalog));
      localStorage.setItem('routines', JSON.stringify(pendingData.routines));
      localStorage.setItem('schedule', JSON.stringify(pendingData.schedule));
      localStorage.setItem('history',  JSON.stringify(pendingData.history));
      window.location.reload();
    } catch (err) {
      // Algo salió mal: intentar restaurar desde el pre-backup
      try {
        const saved = JSON.parse(localStorage.getItem('tb_backup_pre_import') || 'null');
        if (saved) {
          if (saved.catalog  !== null) localStorage.setItem('catalog',  saved.catalog);
          if (saved.routines !== null) localStorage.setItem('routines', saved.routines);
          if (saved.schedule !== null) localStorage.setItem('schedule', saved.schedule);
          if (saved.history  !== null) localStorage.setItem('history',  saved.history);
        }
      } catch { /* si tampoco se puede restaurar, al menos no quedamos en blanco */ }
      setImportConfirm(false);
      setImportError('Error al importar. Tus datos anteriores fueron restaurados.');
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        {onBack && (
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <h1 className="page-title">Historial</h1>
      </div>

      {/* Métricas del mes — ahora 4 cards */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-value">{monthPct}%</div>
          <div className="metric-label">Cumpl. mes</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{monthDone}/{monthPlanned || '—'}</div>
          <div className="metric-label">Entrenos</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: monthGym > 0 ? '#1565C0' : undefined }}>{monthGym}</div>
          <div className="metric-label">Días gym</div>
        </div>
      </div>

      {/* Sesiones por tipo */}
      {sessionsByType.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sesiones por tipo
          </div>
          {sessionsByType.map(({ name, count }) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: '0.5px solid #F1F5F4' }}>
              <span style={{ fontSize: 13, color: '#37474F', flex: 1, marginRight: 8 }}>{name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1B5E20', whiteSpace: 'nowrap' }}>
                {count} {count === 1 ? 'vez' : 'veces'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Rachas por tipo */}
      {streaksByType.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Rachas por tipo
          </div>
          {streaksByType.map(({ name, streak, lastWeeksAgo }, i) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: i < streaksByType.length - 1 ? '0.5px solid #F1F5F4' : 'none' }}>
              <span style={{ fontSize: 13, color: '#37474F', flex: 1, marginRight: 8 }}>{name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', color: streak > 0 ? '#1B5E20' : '#78909C' }}>
                {streak > 0
                  ? `${streak} sem. consecutiva${streak !== 1 ? 's' : ''}`
                  : lastWeeksAgo
                    ? `0 sem. · última hace ${lastWeeksAgo}`
                    : '0 semanas'}
              </span>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="empty-state">
          <p>No hay actividad registrada todavía.</p>
        </div>
      )}

      {/* Modal de confirmación de importar */}
      {importConfirm && (
        <div className="modal-overlay" onClick={() => setImportConfirm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 10 }}>
              ¿Importar datos?
            </div>
            <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
              Esto va a reemplazar <strong>todos tus datos actuales</strong> (rutinas, catálogo, historial, planificación). Se guarda una copia de seguridad automática por si algo sale mal.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setImportConfirm(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmImport}>
                Importar y recargar
              </button>
            </div>
          </div>
        </div>
      )}

      {entries.map(([dateStr, day]) => {
        const routine = routines.find(r => r.id === day.routineId);
        const doneCount = Object.values(day.completed || {}).filter(Boolean).length;
        const isTraining = day.done;
        const isGym = day.gym;

        return (
          <div key={dateStr} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#263238' }}>
                  {isTraining
                    ? (routine?.name || 'Rutina eliminada')
                    : 'Solo gimnasio'}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  {getDayName(dateStr)} · {formatDate(dateStr).split(',')[1]?.trim() || dateStr}
                </div>
              </div>
              {/* Badges de tipo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                {isTraining && (
                  <span className="badge badge-green" style={{ fontSize: 11 }}>Entreno ✓</span>
                )}
                {isGym && (
                  <span className="badge badge-blue" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <GymIcon size={11} /> Gym
                  </span>
                )}
              </div>
            </div>

            {isTraining && (
              <div style={{ display: 'flex', gap: 12, marginBottom: (day.rating || day.hardestExercise || day.notes) ? 8 : 0 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{doneCount} ejercicios</span>
              </div>
            )}

            {/* Rating de la sesión */}
            {isTraining && day.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: day.hardestExercise || day.notes ? 6 : 0 }}>
                {[1,2,3,4,5].map(n => (
                  <div key={n} style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: n <= day.rating ? RATING_COLORS[day.rating] : '#E8ECEB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700,
                    color: n <= day.rating ? 'white' : '#B0BEC5',
                  }}>{n}</div>
                ))}
                <span style={{ fontSize: 12, color: RATING_COLORS[day.rating], fontWeight: 700 }}>
                  {RATING_LABELS[day.rating]}
                </span>
              </div>
            )}
            {isTraining && day.hardestExercise && (
              <div style={{ fontSize: 12, color: '#78909C', marginBottom: day.notes ? 6 : 0 }}>
                Más difícil: <span style={{ color: '#374151', fontWeight: 600 }}>{day.hardestExercise}</span>
              </div>
            )}

            {day.notes && (
              <div style={{
                fontSize: 13, color: '#374151', background: '#f9fafb',
                borderRadius: 6, padding: '8px 10px',
                borderLeft: '2px solid #e5e7eb',
                marginTop: isTraining ? 0 : 4,
              }}>
                {day.notes}
              </div>
            )}
          </div>
        );
      })}
      {/* Sección de respaldo */}
      <div style={{ margin: '24px 16px 0', padding: '20px 16px', background: '#F5F7F5', borderRadius: 12, border: '1px solid #E8ECEB' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#263238', marginBottom: 4 }}>Tus datos</div>
        <div style={{ fontSize: 13, color: '#78909C', marginBottom: 16 }}>
          Exportá un backup o importá datos desde un archivo previo.
        </div>

        {importError && (
          <div style={{ fontSize: 13, color: '#EF5350', background: '#FFEBEE', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            {importError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={exportData}>
            ↓ Exportar
          </button>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => fileInputRef.current?.click()}>
            ↑ Importar
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

    </div>
  );
}
