import { useState, useMemo } from 'react';
import { useStore, getChallengeProgress } from '../store/useStore';
import { todayStr, formatDate } from '../utils/dates';
import { PlusIcon, TrashIcon, EditIcon, ChevronLeft, CheckCircleIcon, CheckIcon } from '../components/Icons';

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysUntil(dateStr) {
  const nowMs = new Date(todayStr() + 'T12:00:00').getTime();
  const targetMs = new Date(dateStr + 'T12:00:00').getTime();
  return Math.round((targetMs - nowMs) / 86400000);
}

function emptyForm() {
  return {
    name: '',
    description: '',
    startDate: todayStr(),
    routineIds: [],
    targetSessions: '',
    weeksDeadline: '',
    weeklyFrequency: '',
    activityType: 'individual',
    initialRating: 5,
    targetSessionsManual: false,
  };
}

function RatingPicker({ value, onChange, label }) {
  return (
    <div>
      {label && <div className="form-label">{label}</div>}
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              flex: 1, padding: '8px 2px', borderRadius: 8, border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
              background: n <= value ? '#0A1628' : '#F1F5F9',
              color: n <= value ? '#FCD34D' : '#94A3B8',
              transition: 'all 0.1s',
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const ACTIVITY_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'gym', label: 'Gimnasio' },
  { value: 'both', label: 'Ambos' },
];

export default function Desafios({ onBack }) {
  const { routines, history, challenges, createChallenge, completeChallenge, abandonChallenge, updateChallenge } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [reopenOnSave, setReopenOnSave] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [closingId, setClosingId] = useState(null);
  const [finalRating, setFinalRating] = useState(7);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [reopenPromptId, setReopenPromptId] = useState(null);

  const today = todayStr();

  function updateForm(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value };
      if ((field === 'weeklyFrequency' || field === 'weeksDeadline') && !f.targetSessionsManual) {
        const freq = field === 'weeklyFrequency' ? parseInt(value) : parseInt(f.weeklyFrequency);
        const weeks = field === 'weeksDeadline' ? parseInt(value) : parseInt(f.weeksDeadline);
        if (freq > 0 && weeks > 0) next.targetSessions = String(freq * weeks);
      }
      return next;
    });
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  }

  function updateTargetSessions(value) {
    setForm(f => ({ ...f, targetSessions: value, targetSessionsManual: value !== '' }));
    if (errors.targetSessions) setErrors(e => ({ ...e, targetSessions: null }));
  }

  function toggleRoutine(id) {
    setForm(f => ({
      ...f,
      routineIds: f.routineIds.includes(id)
        ? f.routineIds.filter(r => r !== id)
        : [...f.routineIds, id],
    }));
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setReopenOnSave(false);
    setForm(emptyForm());
    setErrors({});
  }

  function buildChallengeData() {
    const startDate = form.startDate || today;
    const endDate = addDays(startDate, parseInt(form.weeksDeadline) * 7);
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      routineIds: form.activityType === 'gym' ? [] : form.routineIds,
      targetSessions: parseInt(form.targetSessions),
      weeksDeadline: parseInt(form.weeksDeadline),
      startDate,
      endDate,
      initialRating: form.initialRating,
      activityType: form.activityType,
      weeklyFrequency: form.weeklyFrequency ? parseInt(form.weeklyFrequency) : null,
    };
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio';
    if (!form.targetSessions || parseInt(form.targetSessions) < 1) errs.targetSessions = 'Ingresá una meta válida';
    if (!form.weeksDeadline || parseInt(form.weeksDeadline) < 1) errs.weeksDeadline = 'Ingresá un plazo válido';
    return errs;
  }

  function handleCreate() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    createChallenge(buildChallengeData());
    closeForm();
  }

  function handleSaveEdit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const data = buildChallengeData();
    if (reopenOnSave) {
      data.status = 'active';
      data.completedAt = null;
      data.finalRating = null;
    }
    updateChallenge(editingId, data);
    closeForm();
  }

  function openEditForm(challenge, reopen) {
    setForm({
      name: challenge.name,
      description: challenge.description || '',
      startDate: challenge.startDate,
      routineIds: challenge.routineIds || [],
      targetSessions: String(challenge.targetSessions),
      weeksDeadline: String(challenge.weeksDeadline),
      weeklyFrequency: challenge.weeklyFrequency ? String(challenge.weeklyFrequency) : '',
      activityType: challenge.activityType || 'individual',
      initialRating: challenge.initialRating,
      targetSessionsManual: true,
    });
    setEditingId(challenge.id);
    setReopenOnSave(reopen);
    setShowForm(true);
    setErrors({});
  }

  function startEditing(challenge) {
    if (challenge.status === 'completed') {
      setReopenPromptId(challenge.id);
    } else {
      openEditForm(challenge, false);
    }
  }

  function confirmEditCompleted(reopen) {
    const challenge = challenges.find(c => c.id === reopenPromptId);
    setReopenPromptId(null);
    if (challenge) openEditForm(challenge, reopen);
  }

  function handleClose(id) {
    completeChallenge(id, finalRating);
    setClosingId(null);
    setFinalRating(7);
  }

  const pending = useMemo(
    () => challenges.filter(c => c.status !== 'completed' && today < c.startDate),
    [challenges, today]
  );
  const active = useMemo(
    () => challenges.filter(c => c.status !== 'completed' && today >= c.startDate),
    [challenges, today]
  );
  const completed = useMemo(
    () => challenges.filter(c => c.status === 'completed'),
    [challenges]
  );

  const needsClosingIds = useMemo(
    () => active.filter(c => getChallengeProgress(c, history).needsClosing).map(c => c.id),
    [active, history]
  );

  function activityLabel(challenge) {
    const type = challenge.activityType || 'individual';
    if (type === 'gym') return 'Gimnasio';
    if (type === 'both') return 'Individual + Gimnasio';
    if (!challenge.routineIds || challenge.routineIds.length === 0) return 'Todas las rutinas';
    return challenge.routineIds.map(id => routines.find(r => r.id === id)?.name).filter(Boolean).join(', ') || 'Rutinas eliminadas';
  }

  const endDatePreview = form.startDate && form.weeksDeadline && parseInt(form.weeksDeadline) > 0
    ? addDays(form.startDate, parseInt(form.weeksDeadline) * 7)
    : null;

  // Botones de acción reutilizables
  function CardActions({ challenge }) {
    return (
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 6px', color: '#78909C' }}
          onClick={() => startEditing(challenge)}
          title="Editar desafio"
        >
          <EditIcon size={14} />
        </button>
        <button
          className="btn btn-ghost"
          style={{ padding: '4px 6px', color: '#EF5350' }}
          onClick={() => setDeleteConfirmId(challenge.id)}
          title="Eliminar desafio"
        >
          <TrashIcon size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        {onBack && (
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <h1 className="page-title">Desafios</h1>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <PlusIcon size={12} /> Nuevo
          </button>
        )}
      </div>

      {/* ── Formulario de creación / edición ── */}
      {showForm && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, color: '#263238', marginBottom: 16 }}>
            {editingId ? 'Editar desafio' : 'Nuevo desafio'}
          </div>

          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input
              className="input"
              placeholder="ej: Mejorar definicion"
              value={form.name}
              onChange={e => updateForm('name', e.target.value)}
              style={errors.name ? { borderColor: '#EF5350' } : {}}
            />
            {errors.name && <div style={{ fontSize: 12, color: '#EF5350', marginTop: 4 }}>{errors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Descripcion <span style={{ color: '#B0BEC5' }}>(opcional)</span></label>
            <textarea
              className="input"
              placeholder="¿Qué querés lograr?"
              value={form.description}
              onChange={e => updateForm('description', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Fecha de inicio</label>
            <input
              className="input"
              type="date"
              value={form.startDate}
              onChange={e => updateForm('startDate', e.target.value)}
            />
            {form.startDate > today && (
              <div style={{ fontSize: 12, color: '#78909C', marginTop: 4 }}>
                El desafio comenzará en {daysUntil(form.startDate)} día{daysUntil(form.startDate) !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Duracion (semanas) *</label>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="ej: 6"
              value={form.weeksDeadline}
              onChange={e => updateForm('weeksDeadline', e.target.value)}
              style={errors.weeksDeadline ? { borderColor: '#EF5350' } : {}}
            />
            {errors.weeksDeadline && <div style={{ fontSize: 12, color: '#EF5350', marginTop: 4 }}>{errors.weeksDeadline}</div>}
            {endDatePreview && (
              <div style={{ fontSize: 12, color: '#78909C', marginTop: 4 }}>
                Fecha límite: {formatDate(endDatePreview)}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">¿Qué actividades cuentan?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {ACTIVITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateForm('activityType', value)}
                  style={{
                    flex: 1, padding: '9px 4px', borderRadius: 8, fontFamily: 'inherit',
                    border: `1.5px solid ${form.activityType === value ? '#1D3461' : 'transparent'}`,
                    background: form.activityType === value ? '#E8EDF5' : '#F8FAFC',
                    fontWeight: form.activityType === value ? 700 : 400,
                    color: form.activityType === value ? '#1D3461' : '#78909C',
                    cursor: 'pointer', fontSize: 12,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(form.activityType === 'individual' || form.activityType === 'both') && (
            <div className="form-group">
              <label className="form-label">
                Rutinas que cuentan{' '}
                <span style={{ color: '#B0BEC5' }}>(todas si no elegis ninguna)</span>
              </label>
              {routines.length === 0 ? (
                <div style={{ fontSize: 13, color: '#B0BEC5' }}>No hay rutinas creadas.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {routines.map(r => {
                    const checked = form.routineIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRoutine(r.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          background: checked ? '#E8EDF5' : '#F8FAFC',
                          border: `1.5px solid ${checked ? '#1D3461' : 'transparent'}`,
                          transition: 'all 0.1s',
                        }}
                      >
                        <div className={`checkbox-custom${checked ? ' checked' : ''}`} style={{ flexShrink: 0 }}>
                          {checked && <CheckIcon size={11} />}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: checked ? 600 : 400, color: '#263238' }}>
                          {r.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Frecuencia semanal <span style={{ color: '#B0BEC5' }}>(veces/semana, opcional)</span>
            </label>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="ej: 4"
              value={form.weeklyFrequency}
              onChange={e => updateForm('weeklyFrequency', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Meta total (sesiones) *</label>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="ej: 24"
              value={form.targetSessions}
              onChange={e => updateTargetSessions(e.target.value)}
              style={errors.targetSessions ? { borderColor: '#EF5350' } : {}}
            />
            {errors.targetSessions && <div style={{ fontSize: 12, color: '#EF5350', marginTop: 4 }}>{errors.targetSessions}</div>}
            {!form.targetSessionsManual && form.weeklyFrequency && form.weeksDeadline
              && parseInt(form.weeklyFrequency) > 0 && parseInt(form.weeksDeadline) > 0 && (
              <div style={{ fontSize: 12, color: '#78909C', marginTop: 4 }}>
                Auto-calculado: {parseInt(form.weeklyFrequency)} × {parseInt(form.weeksDeadline)} semanas
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginTop: 4 }}>
            <RatingPicker
              value={form.initialRating}
              onChange={v => updateForm('initialRating', v)}
              label="¿Cómo estás en esto hoy? (1-10)"
            />
          </div>

          {reopenOnSave && (
            <div style={{
              padding: '10px 12px', borderRadius: 8, background: '#D1FAE5',
              fontSize: 12, color: '#065F46', fontWeight: 600, marginTop: 4,
            }}>
              Al guardar, el desafio se reabrirá como activo.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeForm}>
              Cancelar
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={editingId ? handleSaveEdit : handleCreate}>
              {editingId ? 'Guardar cambios' : 'Crear desafio'}
            </button>
          </div>
        </div>
      )}

      {/* ── Estado vacío ── */}
      {pending.length === 0 && active.length === 0 && completed.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No hay desafios todavía.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Crear primer desafio
          </button>
        </div>
      )}

      {/* ── Desafios próximos (pendientes) ── */}
      {pending.length > 0 && (
        <>
          <div style={{
            padding: '16px 16px 8px', fontWeight: 700, fontSize: 12,
            color: '#78909C', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Próximos
          </div>
          {pending.map(challenge => {
            const dias = daysUntil(challenge.startDate);
            return (
              <div key={challenge.id} className="card" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#263238' }}>{challenge.name}</div>
                    {challenge.description && (
                      <div style={{ fontSize: 12, color: '#78909C', marginTop: 2 }}>{challenge.description}</div>
                    )}
                  </div>
                  <CardActions challenge={challenge} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#78909C' }}>
                    Inicio: {formatDate(challenge.startDate)}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                    background: '#F1F5F9', color: '#64748B',
                  }}>
                    Comienza en {dias} día{dias !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>
                  {activityLabel(challenge)} · Meta: {challenge.targetSessions} sesiones · {challenge.weeksDeadline} semanas
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Desafios activos ── */}
      {active.length > 0 && (pending.length > 0 || completed.length > 0) && (
        <div style={{
          padding: '16px 16px 8px', fontWeight: 700, fontSize: 12,
          color: '#78909C', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          Activos
        </div>
      )}
      {active.map(challenge => {
        const progress = getChallengeProgress(challenge, history);
        const isReadyToClose = needsClosingIds.includes(challenge.id);
        const isCurrentlyClosing = closingId === challenge.id;
        const rLabel = activityLabel(challenge);

        if (isReadyToClose) {
          return (
            <div key={challenge.id} className="card" style={{ border: '2px solid #059669' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircleIcon size={20} />
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#059669' }}>
                    {progress.isComplete ? '¡Desafio completado!' : 'Plazo vencido'}
                  </div>
                </div>
                <CardActions challenge={challenge} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#263238', marginBottom: 2 }}>
                {challenge.name}
              </div>
              <div style={{ fontSize: 12, color: '#78909C', marginBottom: 14 }}>
                {progress.completedSessions}/{challenge.targetSessions} sesiones · {rLabel}
              </div>

              {isCurrentlyClosing ? (
                <>
                  <div className="form-group">
                    <RatingPicker
                      value={finalRating}
                      onChange={setFinalRating}
                      label="¿Cómo estás ahora en esto? (1-10)"
                    />
                  </div>
                  <div style={{ fontSize: 13, color: '#78909C', marginBottom: 14, marginTop: 4 }}>
                    Antes:{' '}
                    <strong style={{ color: '#263238' }}>{challenge.initialRating}/10</strong>
                    {' → '}
                    Ahora:{' '}
                    <strong style={{ color: '#263238' }}>{finalRating}/10</strong>
                    {finalRating !== challenge.initialRating && (
                      <span style={{
                        fontWeight: 700, marginLeft: 6,
                        color: finalRating > challenge.initialRating ? '#059669' : '#DC2626',
                      }}>
                        ({finalRating > challenge.initialRating ? '+' : ''}{finalRating - challenge.initialRating})
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setClosingId(null)}>
                      Cancelar
                    </button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => handleClose(challenge.id)}>
                      Cerrar desafio
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => { setClosingId(challenge.id); setFinalRating(challenge.initialRating); }}
                >
                  Evaluar y cerrar desafio
                </button>
              )}
            </div>
          );
        }

        return (
          <div key={challenge.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#263238' }}>{challenge.name}</div>
                {challenge.description && (
                  <div style={{ fontSize: 12, color: '#78909C', marginTop: 2 }}>{challenge.description}</div>
                )}
              </div>
              <CardActions challenge={challenge} />
            </div>

            <div style={{ fontSize: 12, color: '#78909C', marginBottom: 10 }}>{rLabel}</div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#78909C' }}>
                  {progress.completedSessions}/{challenge.targetSessions} sesiones
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#263238' }}>{progress.pct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress.pct}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#78909C' }}>
                {progress.remainingDays > 0
                  ? progress.remainingDays === 1 ? 'Queda 1 día' : `Quedan ${progress.remainingDays} días`
                  : 'Plazo vencido'}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                background: progress.isOnTrack ? '#D1FAE5' : '#FEE2E2',
                color: progress.isOnTrack ? '#065F46' : '#991B1B',
              }}>
                {progress.isOnTrack ? '✓ Vas bien' : `Atrasado · ${progress.neededPerWeek}/sem`}
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#B0BEC5', marginTop: 6 }}>
              Autoevaluación inicial: {challenge.initialRating}/10
              {challenge.weeklyFrequency && (
                <span style={{ marginLeft: 8 }}>· {challenge.weeklyFrequency}x/sem</span>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Desafios completados ── */}
      {completed.length > 0 && (
        <>
          <div style={{
            padding: '16px 16px 8px', fontWeight: 700, fontSize: 12,
            color: '#78909C', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            Completados
          </div>
          {completed.map(c => {
            const prog = getChallengeProgress(c, history);
            const diff = c.finalRating != null ? c.finalRating - c.initialRating : null;
            const goalMet = prog.completedSessions >= c.targetSessions;
            return (
              <div key={c.id} className="card" style={{ opacity: 0.88 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#263238' }}>{c.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: goalMet ? '#D1FAE5' : '#FEF3C7',
                      color: goalMet ? '#065F46' : '#92400E',
                    }}>
                      {goalMet ? '✓ Meta' : 'Parcial'}
                    </span>
                    <CardActions challenge={c} />
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#78909C', marginBottom: 6 }}>
                  {formatDate(c.startDate)} — {formatDate(c.endDate)} ·{' '}
                  {prog.completedSessions}/{c.targetSessions} sesiones
                </div>

                {c.finalRating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#263238' }}>
                    <span>Antes: <strong>{c.initialRating}/10</strong></span>
                    <span style={{ color: '#B0BEC5' }}>→</span>
                    <span>Después: <strong>{c.finalRating}/10</strong></span>
                    {diff !== 0 && (
                      <span style={{ fontWeight: 700, color: diff > 0 ? '#059669' : '#DC2626' }}>
                        ({diff > 0 ? '+' : ''}{diff})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── Modal: confirmar eliminación ── */}
      {deleteConfirmId && (() => {
        const c = challenges.find(ch => ch.id === deleteConfirmId);
        if (!c) return null;
        return (
          <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 10 }}>
                Eliminar desafio
              </div>
              <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
                ¿Estás seguro de eliminar{' '}
                <strong style={{ color: '#263238' }}>"{c.name}"</strong>?
                {c.status !== 'completed' && today >= c.startDate && ' Se perderá el progreso registrado.'}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirmId(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#C62828', borderColor: '#C62828' }}
                  onClick={() => { abandonChallenge(deleteConfirmId); setDeleteConfirmId(null); }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: reabrir desafio completado ── */}
      {reopenPromptId && (() => {
        const c = challenges.find(ch => ch.id === reopenPromptId);
        if (!c) return null;
        return (
          <div className="modal-overlay" onClick={() => setReopenPromptId(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 10 }}>
                Desafio cerrado
              </div>
              <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
                <strong style={{ color: '#263238' }}>"{c.name}"</strong> ya está cerrado.
                {' '}¿Querés reabrirlo como activo?
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => confirmEditCompleted(false)}
                >
                  No, solo editar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => confirmEditCompleted(true)}
                >
                  Sí, reabrir
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
