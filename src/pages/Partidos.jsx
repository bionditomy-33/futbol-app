import { useState } from 'react';
import { todayStr, formatDate, getDayName } from '../utils/dates';
import { PlusIcon } from '../components/Icons';

const COMPETITIONS = ['Arsenal Liga', 'Premier', 'Otro'];
const RESULTS = [
  { value: 'ganamos', label: 'Ganamos',  color: '#2E7D32', bg: '#E8F5E9' },
  { value: 'perdimos', label: 'Perdimos', color: '#C62828', bg: '#FFEBEE' },
  { value: 'empate',   label: 'Empate',   color: '#F57F17', bg: '#FFF8E1' },
];

function loadMatches() {
  try {
    const raw = localStorage.getItem('matches');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMatches(matches) {
  try { localStorage.setItem('matches', JSON.stringify(matches)); } catch {}
}

function emptyForm() {
  return { date: todayStr(), competition: COMPETITIONS[0], result: 'ganamos', minutes: '', notes: '' };
}

export default function Partidos() {
  const [matches, setMatches] = useState(loadMatches);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  function updateForm(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  }

  function handleSave() {
    const errs = {};
    if (!form.date) errs.date = 'La fecha es obligatoria';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const match = {
      id: `m-${Date.now()}`,
      date: form.date,
      competition: form.competition,
      result: form.result,
      minutes: form.minutes ? parseInt(form.minutes, 10) : null,
      notes: form.notes.trim() || null,
    };
    const updated = [match, ...matches].sort((a, b) => b.date.localeCompare(a.date));
    setMatches(updated);
    saveMatches(updated);
    setForm(emptyForm());
    setShowForm(false);
  }

  function handleCancel() {
    setForm(emptyForm());
    setErrors({});
    setShowForm(false);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Partidos</h1>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <PlusIcon size={12} /> Cargar
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, color: '#263238', marginBottom: 16 }}>
            Nuevo partido
          </div>

          {/* Fecha */}
          <div className="form-group">
            <label className="form-label">Fecha *</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={e => updateForm('date', e.target.value)}
              style={errors.date ? { borderColor: '#EF5350' } : {}}
            />
            {errors.date && <div style={{ fontSize: 12, color: '#EF5350', marginTop: 4 }}>{errors.date}</div>}
          </div>

          {/* Competencia */}
          <div className="form-group">
            <label className="form-label">Competencia</label>
            <select
              className="input"
              value={form.competition}
              onChange={e => updateForm('competition', e.target.value)}
            >
              {COMPETITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Resultado */}
          <div className="form-group">
            <label className="form-label">Resultado</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {RESULTS.map(r => (
                <button
                  key={r.value}
                  onClick={() => updateForm('result', r.value)}
                  style={{
                    flex: 1, padding: '10px 6px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
                    background: form.result === r.value ? r.bg : '#F1F5F4',
                    color: form.result === r.value ? r.color : '#78909C',
                    outline: form.result === r.value ? `2px solid ${r.color}` : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Minutos */}
          <div className="form-group">
            <label className="form-label">Minutos jugados <span style={{ color: '#B0BEC5' }}>(opcional)</span></label>
            <input
              type="number"
              className="input"
              placeholder="ej: 90"
              min="0"
              max="120"
              value={form.minutes}
              onChange={e => updateForm('minutes', e.target.value)}
            />
          </div>

          {/* Nota */}
          <div className="form-group">
            <label className="form-label">Nota personal <span style={{ color: '#B0BEC5' }}>(opcional)</span></label>
            <textarea
              className="input"
              placeholder="¿Cómo te fue? ¿Algo destacado?"
              value={form.notes}
              onChange={e => updateForm('notes', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCancel}>
              Cancelar
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>
              Guardar partido
            </button>
          </div>
        </div>
      )}

      {/* Lista vacía */}
      {matches.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No hay partidos registrados todavía.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Cargar primer partido
          </button>
        </div>
      )}

      {/* Lista de partidos */}
      {matches.map(match => {
        const resultInfo = RESULTS.find(r => r.value === match.result) || RESULTS[0];
        return (
          <div key={match.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#263238' }}>
                  {match.competition}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  {getDayName(match.date)} · {formatDate(match.date).split(',')[1]?.trim() || match.date}
                </div>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                background: resultInfo.bg, color: resultInfo.color,
              }}>
                {resultInfo.label}
              </span>
            </div>

            {match.minutes != null && (
              <div style={{ fontSize: 12, color: '#78909C', marginBottom: match.notes ? 6 : 0 }}>
                {match.minutes} min jugados
              </div>
            )}

            {match.notes && (
              <div style={{
                fontSize: 13, color: '#374151', background: '#f9fafb',
                borderRadius: 6, padding: '8px 10px',
                borderLeft: '2px solid #e5e7eb', marginTop: 4,
              }}>
                {match.notes}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
