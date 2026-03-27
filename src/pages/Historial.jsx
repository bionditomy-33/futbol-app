import { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { todayStr, formatDate, getDayName } from '../utils/dates';
import { GymIcon } from '../components/Icons';

const TODAY = todayStr();

function getCurrentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function exportData() {
  const data = {
    catalog:  JSON.parse(localStorage.getItem('catalog')  || 'null'),
    routines: JSON.parse(localStorage.getItem('routines') || 'null'),
    schedule: JSON.parse(localStorage.getItem('schedule') || 'null'),
    history:  JSON.parse(localStorage.getItem('history')  || 'null'),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `futbol-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Historial() {
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

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || typeof parsed !== 'object') throw new Error();
        // Validate expected keys
        const valid = ['catalog','routines','schedule','history'].every(k => k in parsed);
        if (!valid) throw new Error('missing keys');
        setPendingData(parsed);
        setImportError('');
        setImportConfirm(true);
      } catch {
        setImportError('El archivo no es un backup válido.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  }

  function confirmImport() {
    if (!pendingData) return;
    localStorage.setItem('catalog',  JSON.stringify(pendingData.catalog));
    localStorage.setItem('routines', JSON.stringify(pendingData.routines));
    localStorage.setItem('schedule', JSON.stringify(pendingData.schedule));
    localStorage.setItem('history',  JSON.stringify(pendingData.history));
    window.location.reload();
  }

  return (
    <div className="page-content">
      <div className="page-header">
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
              Esto va a reemplazar <strong>todos tus datos actuales</strong> (rutinas, catálogo, historial, planificación). La acción no se puede deshacer.
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
              <div style={{ display: 'flex', gap: 12, marginBottom: day.notes ? 8 : 0 }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{doneCount} ejercicios</span>
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
