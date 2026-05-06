import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, GymIcon, BallIcon, TrophyIcon } from '../components/Icons';

// 1=Mon … 6=Sat, 0=Sun  (matching Date.getDay())
const WEEK_DAYS = [
  { dow: 1, label: 'Lunes' },
  { dow: 2, label: 'Martes' },
  { dow: 3, label: 'Miércoles' },
  { dow: 4, label: 'Jueves' },
  { dow: 5, label: 'Viernes' },
  { dow: 6, label: 'Sábado' },
  { dow: 0, label: 'Domingo' },
];

function emptyDay() {
  return {
    routineId: null,
    gym: false, gymTime: '',
    arsenal: false, arsenalTime: '',
    match: false, matchTime: '',
    indivTime: '',
  };
}

export default function SemanaTipo({ onBack }) {
  const { weekTemplate, routines, saveWeekTemplate } = useStore();

  const [draft, setDraft] = useState(() => {
    const base = {};
    WEEK_DAYS.forEach(({ dow }) => {
      base[dow] = weekTemplate[dow] ? { ...emptyDay(), ...weekTemplate[dow] } : emptyDay();
    });
    return base;
  });

  const [saved, setSaved] = useState(false);

  function setDay(dow, patch) {
    setDraft(d => ({ ...d, [dow]: { ...d[dow], ...patch } }));
  }

  function handleSave() {
    saveWeekTemplate(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClearDay(dow) {
    setDay(dow, emptyDay());
  }

  const hasAnyActivity = (day) =>
    day.routineId || day.gym || day.arsenal || day.match;

  return (
    <div className="page-content">
      <div className="page-header" style={{ paddingBottom: 8 }}>
        {onBack && (
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <h1 className="page-title">Semana tipo</h1>
      </div>

      <p style={{ margin: '0 16px 14px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
        Definí las actividades de tu semana habitual. Se aplica automáticamente a semanas sin planificación.
      </p>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {WEEK_DAYS.map(({ dow, label }) => {
          const day = draft[dow];
          const active = hasAnyActivity(day);

          return (
            <div key={dow} className="wt-day-card">
              <div className="wt-day-header">
                <span className="wt-day-label">{label}</span>
                {active && (
                  <button className="wt-clear-btn" onClick={() => handleClearDay(dow)}>
                    Limpiar
                  </button>
                )}
              </div>

              {/* Rutina individual */}
              <div className="wt-row">
                <div className="wt-row-icon" style={{ background: '#E8F5EE', color: '#3E7A5C' }}>
                  <BallIcon size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="wt-row-label">Entrenamiento individual</span>
                  <select
                    className="wt-select"
                    value={day.routineId || ''}
                    onChange={e => setDay(dow, { routineId: e.target.value || null })}
                  >
                    <option value="">— Sin rutina —</option>
                    {routines.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                {day.routineId && (
                  <TimeInput
                    value={day.indivTime}
                    onChange={v => setDay(dow, { indivTime: v })}
                    placeholder="08:10"
                  />
                )}
              </div>

              {/* Gym */}
              <div className="wt-row">
                <div className="wt-row-icon" style={{ background: '#E8EDF5', color: '#2D3E50' }}>
                  <GymIcon size={14} />
                </div>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0, cursor: 'pointer' }}>
                  <span className="wt-row-label" style={{ flex: 1 }}>Gimnasio</span>
                  <input
                    type="checkbox"
                    className="wt-checkbox"
                    checked={day.gym}
                    onChange={e => setDay(dow, { gym: e.target.checked })}
                  />
                </label>
                {day.gym && (
                  <TimeInput
                    value={day.gymTime}
                    onChange={v => setDay(dow, { gymTime: v })}
                    placeholder="07:00"
                  />
                )}
              </div>

              {/* Arsenal */}
              <div className="wt-row">
                <div className="wt-row-icon" style={{ background: '#F5EDE8', color: '#8B4513' }}>
                  <ShieldIcon size={14} />
                </div>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <span className="wt-row-label" style={{ flex: 1 }}>Entrenamiento Arsenal</span>
                  <input
                    type="checkbox"
                    className="wt-checkbox"
                    checked={day.arsenal}
                    onChange={e => setDay(dow, { arsenal: e.target.checked })}
                  />
                </label>
                {day.arsenal && (
                  <TimeInput
                    value={day.arsenalTime}
                    onChange={v => setDay(dow, { arsenalTime: v })}
                    placeholder="19:30"
                  />
                )}
              </div>

              {/* Partido */}
              <div className="wt-row">
                <div className="wt-row-icon" style={{ background: '#FDF4E3', color: '#C17817' }}>
                  <TrophyIcon size={14} />
                </div>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <span className="wt-row-label" style={{ flex: 1 }}>Partido</span>
                  <input
                    type="checkbox"
                    className="wt-checkbox"
                    checked={day.match}
                    onChange={e => setDay(dow, { match: e.target.checked })}
                  />
                </label>
                {day.match && (
                  <TimeInput
                    value={day.matchTime}
                    onChange={v => setDay(dow, { matchTime: v })}
                    placeholder="15:00"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '16px 16px 32px' }}>
        <button
          className="btn btn-primary btn-full"
          onClick={handleSave}
          style={{ fontSize: 15, padding: '13px' }}
        >
          {saved ? '✓ Guardado' : 'Guardar semana tipo'}
        </button>
      </div>
    </div>
  );
}

function TimeInput({ value, onChange, placeholder }) {
  return (
    <input
      type="time"
      className="wt-time-input"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: 80, flexShrink: 0 }}
    />
  );
}

function ShieldIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1L2 3.5V7C2 10 4.5 12.5 7 13C9.5 12.5 12 10 12 7V3.5L7 1Z" />
    </svg>
  );
}
