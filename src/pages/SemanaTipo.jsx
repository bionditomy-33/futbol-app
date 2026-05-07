import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, GymIcon, BallIcon, TrophyIcon, PlusIcon, EditIcon, TrashIcon } from '../components/Icons';

const WEEK_DAYS = [
  { dow: 1, label: 'Lunes' },
  { dow: 2, label: 'Martes' },
  { dow: 3, label: 'Miércoles' },
  { dow: 4, label: 'Jueves' },
  { dow: 5, label: 'Viernes' },
  { dow: 6, label: 'Sábado' },
  { dow: 0, label: 'Domingo' },
];

const DAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

function emptyDay() {
  return { routineId: null, gym: false, gymTime: '', arsenal: false, arsenalTime: '', match: false, matchTime: '', indivTime: '' };
}

function emptyDays() {
  const d = {};
  WEEK_DAYS.forEach(({ dow }) => { d[dow] = emptyDay(); });
  return d;
}

function hasAnyActivity(day) {
  return !!(day?.routineId || day?.gym || day?.arsenal || day?.match);
}

// ── Mini preview strip (7 colored dots per day) ───────────────────────────────
function MiniPreview({ days }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
      {WEEK_DAYS.map(({ dow, label }) => {
        const d = days?.[dow] || {};
        const dots = [];
        if (d.routineId) dots.push('#0F6E56');
        if (d.gym)       dots.push('#185FA5');
        if (d.arsenal)   dots.push('#854F0B');
        if (d.match)     dots.push('#993C1D');
        return (
          <div key={dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ fontSize: 8, color: '#94A3B8', fontWeight: 600 }}>{DAY_SHORT[dow]}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {dots.length > 0
                ? dots.map((c, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />)
                : <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8ECEB' }} />
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Template card in list view ────────────────────────────────────────────────
function TemplateCard({ tmpl, onEdit, onDuplicate, onDelete, onSetDefault }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div style={{
      background: 'white',
      border: `1.5px solid ${tmpl.isDefault ? '#1D3461' : '#E8ECEB'}`,
      borderRadius: 12,
      padding: '14px 14px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1A2332' }}>{tmpl.name}</span>
            {tmpl.isDefault && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99,
                background: '#1D3461', color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Predeterminada
              </span>
            )}
          </div>
          <MiniPreview days={tmpl.days} />
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(tmpl)}
            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', borderRadius: 6 }}
            title="Editar"
          >
            <EditIcon size={15} />
          </button>
          <button
            onClick={() => onDuplicate(tmpl.id)}
            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', borderRadius: 6, fontSize: 13 }}
            title="Duplicar"
          >
            ⧉
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#EF5350', borderRadius: 6 }}
            title="Eliminar"
          >
            <TrashIcon size={15} />
          </button>
        </div>
      </div>

      {!tmpl.isDefault && (
        <button
          onClick={() => onSetDefault(tmpl.id)}
          style={{
            marginTop: 10, width: '100%', padding: '7px', borderRadius: 8,
            border: '1px solid #E2E8F0', background: '#F8FAFC',
            fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Marcar como predeterminada
        </button>
      )}

      {confirmDelete && (
        <div style={{ marginTop: 10, padding: '10px', background: '#FEF2F2', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: '#991B1B', marginBottom: 8 }}>¿Eliminar "{tmpl.name}"?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { onDelete(tmpl.id); setConfirmDelete(false); }}
              style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', background: '#EF5350', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Day editor row ────────────────────────────────────────────────────────────
function DayRow({ dow, label, day, onChange }) {
  const active = hasAnyActivity(day);
  return (
    <div className="wt-day-card">
      <div className="wt-day-header">
        <span className="wt-day-label">{label}</span>
        {active && (
          <button className="wt-clear-btn" onClick={() => onChange(emptyDay())}>Limpiar</button>
        )}
      </div>

      {/* Rutina individual */}
      <div className="wt-row">
        <div className="wt-row-icon" style={{ background: '#E8F5EE', color: '#3E7A5C' }}>
          <BallIcon size={14} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="wt-row-label">Entrenamiento individual</span>
        </div>
      </div>

      {/* Gym */}
      <div className="wt-row">
        <div className="wt-row-icon" style={{ background: '#E8EDF5', color: '#2D3E50' }}>
          <GymIcon size={14} />
        </div>
        <label style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <span className="wt-row-label" style={{ flex: 1 }}>Gimnasio</span>
          <input type="checkbox" className="wt-checkbox" checked={!!day.gym}
            onChange={e => onChange({ ...day, gym: e.target.checked })} />
        </label>
        {day.gym && (
          <TimeInput value={day.gymTime} onChange={v => onChange({ ...day, gymTime: v })} placeholder="07:00" />
        )}
      </div>

      {/* Arsenal */}
      <div className="wt-row">
        <div className="wt-row-icon" style={{ background: '#F5EDE8', color: '#8B4513' }}>
          <ShieldIcon size={14} />
        </div>
        <label style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <span className="wt-row-label" style={{ flex: 1 }}>Entrenamiento Arsenal</span>
          <input type="checkbox" className="wt-checkbox" checked={!!day.arsenal}
            onChange={e => onChange({ ...day, arsenal: e.target.checked })} />
        </label>
        {day.arsenal && (
          <TimeInput value={day.arsenalTime} onChange={v => onChange({ ...day, arsenalTime: v })} placeholder="19:30" />
        )}
      </div>

      {/* Partido */}
      <div className="wt-row">
        <div className="wt-row-icon" style={{ background: '#FDF4E3', color: '#C17817' }}>
          <TrophyIcon size={14} />
        </div>
        <label style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <span className="wt-row-label" style={{ flex: 1 }}>Partido</span>
          <input type="checkbox" className="wt-checkbox" checked={!!day.match}
            onChange={e => onChange({ ...day, match: e.target.checked })} />
        </label>
        {day.match && (
          <TimeInput value={day.matchTime} onChange={v => onChange({ ...day, matchTime: v })} placeholder="15:00" />
        )}
      </div>
    </div>
  );
}

// ── Editor view ───────────────────────────────────────────────────────────────
function TemplateEditor({ initial, routines, onSave, onCancel }) {
  const [name, setName]   = useState(initial?.name || '');
  const [days, setDays]   = useState(() => {
    const base = emptyDays();
    if (initial?.days) {
      WEEK_DAYS.forEach(({ dow }) => {
        base[dow] = { ...emptyDay(), ...(initial.days[dow] || {}) };
      });
    }
    return base;
  });
  const [nameError, setNameError] = useState('');

  function setDay(dow, patch) {
    setDays(d => ({ ...d, [dow]: { ...d[dow], ...patch } }));
  }

  function handleSave() {
    if (!name.trim()) { setNameError('El nombre es obligatorio'); return; }
    onSave({ name: name.trim(), days });
  }

  return (
    <div>
      {/* Name field */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Nombre de la semana tipo
        </div>
        <input
          className="input"
          value={name}
          onChange={e => { setName(e.target.value); setNameError(''); }}
          placeholder="ej: Temporada regular"
          style={nameError ? { borderColor: '#EF5350' } : {}}
        />
        {nameError && <div style={{ fontSize: 12, color: '#EF5350', marginTop: 4 }}>{nameError}</div>}
      </div>

      {/* Per-day configuration */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {WEEK_DAYS.map(({ dow, label }) => {
          const day = days[dow];
          const active = hasAnyActivity(day);
          return (
            <div key={dow} className="wt-day-card">
              <div className="wt-day-header">
                <span className="wt-day-label">{label}</span>
                {active && (
                  <button className="wt-clear-btn" onClick={() => setDay(dow, emptyDay())}>Limpiar</button>
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
                    {routines.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                {day.routineId && (
                  <TimeInput value={day.indivTime} onChange={v => setDay(dow, { indivTime: v })} placeholder="08:10" />
                )}
              </div>

              {/* Gym */}
              <div className="wt-row">
                <div className="wt-row-icon" style={{ background: '#E8EDF5', color: '#2D3E50' }}>
                  <GymIcon size={14} />
                </div>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <span className="wt-row-label" style={{ flex: 1 }}>Gimnasio</span>
                  <input type="checkbox" className="wt-checkbox" checked={!!day.gym}
                    onChange={e => setDay(dow, { gym: e.target.checked })} />
                </label>
                {day.gym && (
                  <TimeInput value={day.gymTime} onChange={v => setDay(dow, { gymTime: v })} placeholder="07:00" />
                )}
              </div>

              {/* Arsenal */}
              <div className="wt-row">
                <div className="wt-row-icon" style={{ background: '#F5EDE8', color: '#8B4513' }}>
                  <ShieldIcon size={14} />
                </div>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <span className="wt-row-label" style={{ flex: 1 }}>Entrenamiento Arsenal</span>
                  <input type="checkbox" className="wt-checkbox" checked={!!day.arsenal}
                    onChange={e => setDay(dow, { arsenal: e.target.checked })} />
                </label>
                {day.arsenal && (
                  <TimeInput value={day.arsenalTime} onChange={v => setDay(dow, { arsenalTime: v })} placeholder="19:30" />
                )}
              </div>

              {/* Partido */}
              <div className="wt-row">
                <div className="wt-row-icon" style={{ background: '#FDF4E3', color: '#C17817' }}>
                  <TrophyIcon size={14} />
                </div>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <span className="wt-row-label" style={{ flex: 1 }}>Partido</span>
                  <input type="checkbox" className="wt-checkbox" checked={!!day.match}
                    onChange={e => setDay(dow, { match: e.target.checked })} />
                </label>
                {day.match && (
                  <TimeInput value={day.matchTime} onChange={v => setDay(dow, { matchTime: v })} placeholder="15:00" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '16px 16px 32px', display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary" style={{ flex: 2, fontSize: 15, padding: '13px' }} onClick={handleSave}>
          Guardar
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SemanaTipo({ onBack }) {
  const { weekTemplates, routines, createWeekTemplate, updateWeekTemplate, deleteWeekTemplate, duplicateWeekTemplate, setDefaultTemplate } = useStore();

  // editingId: null = list, 'new' = new template, '<id>' = editing existing
  const [editingId, setEditingId] = useState(null);

  function openNew() { setEditingId('new'); }
  function openEdit(tmpl) { setEditingId(tmpl.id); }
  function closeEditor() { setEditingId(null); }

  function handleSave({ name, days }) {
    if (editingId === 'new') {
      createWeekTemplate({ name, days });
    } else {
      updateWeekTemplate(editingId, { name, days });
    }
    closeEditor();
  }

  const editingTemplate = editingId && editingId !== 'new'
    ? weekTemplates.find(t => t.id === editingId)
    : null;

  // ── Editor view ──
  if (editingId !== null) {
    const title = editingId === 'new' ? 'Nueva semana tipo' : 'Editar semana tipo';
    return (
      <div className="page-content">
        <div className="page-header" style={{ paddingBottom: 8 }}>
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={closeEditor}>
            <ChevronLeft size={18} />
          </button>
          <h1 className="page-title">{title}</h1>
        </div>
        <TemplateEditor
          initial={editingTemplate ? { name: editingTemplate.name, days: editingTemplate.days } : null}
          routines={routines}
          onSave={handleSave}
          onCancel={closeEditor}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="page-content">
      <div className="page-header" style={{ paddingBottom: 8 }}>
        {onBack && (
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <h1 className="page-title">Semana tipo</h1>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <PlusIcon size={12} /> Nueva
        </button>
      </div>

      <p style={{ margin: '0 16px 14px', fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
        Definí múltiples semanas tipo y elegí cuál aplicar a cada período.
      </p>

      {weekTemplates.length === 0 ? (
        <div className="empty-state">
          <p>No hay semanas tipo guardadas.</p>
          <button className="btn btn-primary" onClick={openNew}>Crear primera semana tipo</button>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 32 }}>
          {weekTemplates.map(tmpl => (
            <TemplateCard
              key={tmpl.id}
              tmpl={tmpl}
              onEdit={openEdit}
              onDuplicate={duplicateWeekTemplate}
              onDelete={deleteWeekTemplate}
              onSetDefault={setDefaultTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

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
