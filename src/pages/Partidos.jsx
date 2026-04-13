import { useState } from 'react';
import { useStore } from '../store/useStore';
import { todayStr, formatDate, getDayName } from '../utils/dates';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';

const COMPETITIONS = ['Arsenal Liga', 'Premier', 'Otro'];
const RESULTS = [
  { value: 'ganamos', label: 'Victoria', short: 'V', color: '#065F46', bg: '#D1FAE5', badgeClass: 'result-win' },
  { value: 'perdimos', label: 'Derrota', short: 'D', color: '#991B1B', bg: '#FEE2E2', badgeClass: 'result-loss' },
  { value: 'empate',   label: 'Empate',  short: 'E', color: '#92400E', bg: '#FEF3C7', badgeClass: 'result-draw' },
];

function emptyForm() {
  return { date: todayStr(), competition: COMPETITIONS[0], result: 'ganamos', minutes: '', notes: '' };
}

function getResultStats(matches) {
  const wins = matches.filter(m => m.result === 'ganamos').length;
  const losses = matches.filter(m => m.result === 'perdimos').length;
  const draws = matches.filter(m => m.result === 'empate').length;
  return { wins, losses, draws, total: matches.length };
}

export default function Partidos() {
  const { matches, setMatches } = useStore();
  const [showForm, setShowForm]               = useState(false);
  const [editingId, setEditingId]             = useState(null);
  const [form, setForm]                       = useState(emptyForm);
  const [errors, setErrors]                   = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  function updateForm(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  }

  function openNew() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
  }

  function openEdit(match) {
    setEditingId(match.id);
    setForm({
      date: match.date,
      competition: match.competition,
      result: match.result,
      minutes: match.minutes != null ? String(match.minutes) : '',
      notes: match.notes || '',
    });
    setErrors({});
    setShowForm(true);
  }

  function handleSave() {
    const errs = {};
    if (!form.date) errs.date = 'La fecha es obligatoria';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    let updated;
    if (editingId) {
      updated = matches.map(m => m.id === editingId ? {
        ...m,
        date: form.date,
        competition: form.competition,
        result: form.result,
        minutes: form.minutes ? parseInt(form.minutes, 10) : null,
        notes: form.notes.trim() || null,
      } : m);
    } else {
      const match = {
        id: `m-${Date.now()}`,
        date: form.date,
        competition: form.competition,
        result: form.result,
        minutes: form.minutes ? parseInt(form.minutes, 10) : null,
        notes: form.notes.trim() || null,
      };
      updated = [match, ...matches];
    }
    updated = updated.sort((a, b) => b.date.localeCompare(a.date));
    setMatches(updated);
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(false);
  }

  function handleCancel() {
    setForm(emptyForm());
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  }

  function handleDelete(id) {
    const updated = matches.filter(m => m.id !== id);
    setMatches(updated);
    setDeleteConfirmId(null);
  }

  const stats = getResultStats(matches);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Partidos</h1>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={openNew}>
            <PlusIcon size={12} /> Cargar
          </button>
        )}
      </div>

      {/* Stats resumen */}
      {matches.length > 0 && !showForm && (
        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-value" style={{ color: '#2E7D32' }}>{stats.wins}</div>
            <div className="metric-label">Victorias</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">{stats.draws}</div>
            <div className="metric-label">Empates</div>
          </div>
          <div className="metric-card">
            <div className="metric-value" style={{ color: '#C62828' }}>{stats.losses}</div>
            <div className="metric-label">Derrotas</div>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1A2332', marginBottom: 16, letterSpacing: '-0.02em' }}>
            {editingId ? 'Editar partido' : 'Nuevo partido'}
          </div>

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

          <div className="form-group">
            <label className="form-label">Resultado</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {RESULTS.map(r => (
                <button
                  key={r.value}
                  onClick={() => updateForm('result', r.value)}
                  style={{
                    flex: 1, padding: '11px 6px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
                    background: form.result === r.value ? r.bg : '#F8FAFC',
                    color: form.result === r.value ? r.color : '#94A3B8',
                    outline: form.result === r.value ? `2px solid ${r.color}` : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Minutos jugados <span style={{ color: '#94A3B8', fontWeight: 500 }}>(opcional)</span></label>
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

          <div className="form-group">
            <label className="form-label">Nota personal <span style={{ color: '#94A3B8', fontWeight: 500 }}>(opcional)</span></label>
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
              {editingId ? 'Guardar cambios' : 'Guardar partido'}
            </button>
          </div>
        </div>
      )}

      {/* Lista vacía */}
      {matches.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <div className="empty-state-title">Sin partidos</div>
          <p>Registrá tus partidos para llevar el historial de resultados</p>
          <button className="btn btn-primary" onClick={openNew}>Cargar primer partido</button>
        </div>
      )}

      {/* Lista de partidos */}
      {!showForm && matches.map(match => {
        const resultInfo = RESULTS.find(r => r.value === match.result) || RESULTS[0];
        return (
          <div key={match.id} className="match-card">
            <div className="match-card-header">
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1A2332' }}>
                  {match.competition}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                  {getDayName(match.date)} · {formatDate(match.date)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`match-result-badge ${resultInfo.badgeClass}`}>
                  {resultInfo.label}
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '5px 7px', color: '#94A3B8' }}
                  onClick={() => openEdit(match)}
                >
                  <EditIcon size={13} />
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '5px 7px', color: '#94A3B8' }}
                  onClick={() => setDeleteConfirmId(match.id)}
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            </div>

            {(match.minutes != null || match.notes) && (
              <div style={{ padding: '10px 14px 12px' }}>
                {match.minutes != null && (
                  <div style={{
                    fontSize: 12, color: '#64748B', fontWeight: 600,
                    marginBottom: match.notes ? 8 : 0,
                  }}>
                    ⏱ {match.minutes} minutos jugados
                  </div>
                )}
                {match.notes && (
                  <div style={{
                    fontSize: 13, color: '#475569',
                    background: '#F8FAFC',
                    borderRadius: 8, padding: '9px 12px',
                    borderLeft: '3px solid #E2E8F0',
                    lineHeight: 1.5,
                  }}>
                    {match.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal eliminación */}
      {deleteConfirmId && (() => {
        const match = matches.find(m => m.id === deleteConfirmId);
        if (!match) return null;
        return (
          <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
              <div className="modal-drag-handle" />
              <div style={{ fontWeight: 800, fontSize: 17, color: '#1A2332', marginBottom: 10 }}>
                Eliminar partido
              </div>
              <div style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.5 }}>
                ¿Eliminar el partido de {match.competition} del {formatDate(match.date)}? Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirmId(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#C62828', boxShadow: '0 2px 8px rgba(198,40,40,0.3)' }}
                  onClick={() => handleDelete(deleteConfirmId)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
