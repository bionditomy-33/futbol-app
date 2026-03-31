import { useState } from 'react';
import { useStore } from '../store/useStore';
import { todayStr, formatDate, getDayName } from '../utils/dates';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';

const COMPETITIONS = ['Arsenal Liga', 'Premier', 'Otro'];
const RESULTS = [
  { value: 'ganamos', label: 'Ganamos',  color: '#2E7D32', bg: '#E8F5E9' },
  { value: 'perdimos', label: 'Perdimos', color: '#C62828', bg: '#FFEBEE' },
  { value: 'empate',   label: 'Empate',   color: '#F57F17', bg: '#FFF8E1' },
];

function emptyForm() {
  return { date: todayStr(), competition: COMPETITIONS[0], result: 'ganamos', minutes: '', notes: '' };
}

export default function Partidos() {
  const { matches, setMatches } = useStore();
  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null); // null = new, string = editing existing
  const [form, setForm]                 = useState(emptyForm);
  const [errors, setErrors]             = useState({});
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

      {/* Formulario */}
      {showForm && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, color: '#263238', marginBottom: 16 }}>
            {editingId ? 'Editar partido' : 'Nuevo partido'}
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
              {editingId ? 'Guardar cambios' : 'Guardar partido'}
            </button>
          </div>
        </div>
      )}

      {/* Lista vacía */}
      {matches.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No hay partidos registrados todavía.</p>
          <button className="btn btn-primary" onClick={openNew}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                  background: resultInfo.bg, color: resultInfo.color,
                }}>
                  {resultInfo.label}
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '5px 6px', color: '#78909C' }}
                  onClick={() => openEdit(match)}
                  title="Editar"
                >
                  <EditIcon size={14} />
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '5px 6px', color: '#EF5350' }}
                  onClick={() => setDeleteConfirmId(match.id)}
                  title="Eliminar"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
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

      {/* Confirmación de eliminación */}
      {deleteConfirmId && (() => {
        const match = matches.find(m => m.id === deleteConfirmId);
        if (!match) return null;
        return (
          <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 10 }}>
                Eliminar partido
              </div>
              <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
                ¿Eliminar el partido de {match.competition} del {formatDate(match.date)}? Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirmId(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#C62828', borderColor: '#C62828' }}
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
