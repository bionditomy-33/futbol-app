import { useState, useRef } from 'react';
import { useStore, getState } from '../store/useStore';
import { INITIAL_CATALOG } from '../data/initialData';
import { todayStr, formatDate, getDayName } from '../utils/dates';
import { GymIcon, ChevronLeft } from '../components/Icons';

const RATING_COLORS = ['', '#EF5350', '#FF7043', '#FFC107', '#66BB6A', '#2E7D32'];
const RATING_LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'];

const TODAY = todayStr();

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
  const { history, routines, schedule, importData } = useStore();
  const fileInputRef = useRef(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [pendingData, setPendingData]     = useState(null);
  const [importError, setImportError]     = useState('');
  const currentMonth = getCurrentMonthStr();

  const entries = Object.entries(history)
    .filter(([, day]) => day.done || day.gym)
    .sort(([a], [b]) => b.localeCompare(a));

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

  const streaksByType = (() => {
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
      let streak = 0;
      const d = new Date(currentWS + 'T12:00:00');
      while (weeks.has(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)) {
        streak++;
        d.setDate(d.getDate() - 7);
      }
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

  async function confirmImport() {
    if (!pendingData) return;
    try {
      await importData(pendingData);
      setImportConfirm(false);
      setPendingData(null);
    } catch (err) {
      setImportConfirm(false);
      setImportError('Error al importar. Verificá tu conexión e intentá de nuevo.');
    }
  }

  const maxCount = sessionsByType.length > 0 ? sessionsByType[0].count : 1;

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

      {/* Métricas del mes */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-value">{monthPct}%</div>
          <div className="metric-label">Cumpl. mes</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{monthDone}{monthPlanned > 0 ? `/${monthPlanned}` : ''}</div>
          <div className="metric-label">Entrenos</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: monthGym > 0 ? '#1565C0' : undefined }}>{monthGym}</div>
          <div className="metric-label">Días gym</div>
        </div>
      </div>

      {/* Sesiones por tipo con barra visual */}
      {sessionsByType.length > 0 && (
        <div className="card">
          <div className="section-label">Sesiones por tipo</div>
          {sessionsByType.map(({ name, count }) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#1A2332', fontWeight: 500 }}>{name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>
                  {count} {count === 1 ? 'vez' : 'veces'}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.round((count / maxCount) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rachas por tipo */}
      {streaksByType.length > 0 && (
        <div className="card">
          <div className="section-label">Rachas por tipo</div>
          {streaksByType.map(({ name, streak, lastWeeksAgo }, i) => (
            <div key={name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: i < streaksByType.length - 1 ? 10 : 0,
              marginBottom: i < streaksByType.length - 1 ? 10 : 0,
              borderBottom: i < streaksByType.length - 1 ? '1px solid #F1F5F4' : 'none',
            }}>
              <span style={{ fontSize: 13, color: '#1A2332', flex: 1, marginRight: 10 }}>{name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: streak > 0 ? '#0A1628' : '#94A3B8' }}>
                {streak > 0
                  ? `${streak} sem. ${streak !== 1 ? 'consecutivas' : 'consecutiva'}`
                  : lastWeeksAgo
                    ? `0 sem. · hace ${lastWeeksAgo}`
                    : '0 semanas'}
              </span>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-title">Sin actividad</div>
          <p>Completá tu primer entrenamiento para ver el historial</p>
        </div>
      )}

      {/* Entradas del historial */}
      {entries.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {entries.map(([dateStr, day], idx) => {
            const routine = routines.find(r => r.id === day.routineId);
            const doneCount = Object.values(day.completed || {}).filter(Boolean).length;
            const isTraining = day.done;
            const isGym = day.gym;
            const isLast = idx === entries.length - 1;

            return (
              <div key={dateStr} style={{
                display: 'flex', gap: 12, padding: '13px 16px',
                borderBottom: isLast ? 'none' : '1px solid #F1F5F4',
              }}>
                {/* Dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50',
                    background: isTraining ? '#059669' : '#2563EB',
                    marginTop: 4, borderRadius: '50%',
                  }} />
                  {!isLast && (
                    <div style={{ width: 2, flex: 1, background: '#F1F5F4', marginTop: 4 }} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1A2332', lineHeight: 1.3 }}>
                        {isTraining ? (routine?.name || 'Rutina eliminada') : 'Solo gimnasio'}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                        {getDayName(dateStr)} · {formatDate(dateStr)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                      {isTraining && <span className="badge badge-green" style={{ fontSize: 9 }}>✓ Entreno</span>}
                      {isGym && (
                        <span className="badge badge-blue" style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <GymIcon size={9} /> Gym
                        </span>
                      )}
                    </div>
                  </div>

                  {isTraining && (
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      {doneCount} ejercicios completados
                      {day.rating && (
                        <span style={{ marginLeft: 8, fontWeight: 700, color: RATING_COLORS[day.rating] }}>
                          · {RATING_LABELS[day.rating]}
                        </span>
                      )}
                    </div>
                  )}

                  {day.hardestExercise && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      Más difícil: <span style={{ color: '#475569', fontWeight: 600 }}>{day.hardestExercise}</span>
                    </div>
                  )}

                  {day.notes && (
                    <div style={{
                      fontSize: 12, color: '#475569',
                      background: '#F8FAFC', borderRadius: 7,
                      padding: '7px 10px', marginTop: 6,
                      borderLeft: '2px solid #E2E8F0',
                      lineHeight: 1.5,
                    }}>
                      {day.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Backup section */}
      <div style={{
        margin: '8px 16px 0',
        padding: '18px 16px',
        background: '#F8FAFC',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
      }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#1A2332', marginBottom: 3, letterSpacing: '-0.01em' }}>
          Tus datos
        </div>
        <div style={{ fontSize: 13, color: '#64748B', marginBottom: 14, lineHeight: 1.4 }}>
          Exportá un backup o importá datos desde un archivo previo.
        </div>

        {importError && (
          <div style={{
            fontSize: 13, color: '#C62828', background: '#FFEBEE',
            borderRadius: 8, padding: '9px 12px', marginBottom: 12,
          }}>
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

      {/* Modal confirmación importar */}
      {importConfirm && (
        <div className="modal-overlay" onClick={() => setImportConfirm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
            <div className="modal-drag-handle" />
            <div style={{ fontWeight: 800, fontSize: 17, color: '#1A2332', marginBottom: 10 }}>
              ¿Importar datos?
            </div>
            <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.5 }}>
              Esto va a reemplazar <strong>todos tus datos actuales</strong> (rutinas, catálogo, historial, planificación).
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setImportConfirm(false)}>
                Cancelar
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={confirmImport}>
                Importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
