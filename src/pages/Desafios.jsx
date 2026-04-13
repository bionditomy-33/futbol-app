import { useState, useMemo } from 'react';
import { useStore, getChallengeProgress } from '../store/useStore';
import { todayStr, formatDate } from '../utils/dates';
import { PlusIcon, TrashIcon, ChevronLeft, CheckCircleIcon, CheckIcon, StarIcon } from '../components/Icons';

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyForm() {
  return { name: '', description: '', routineIds: [], targetSessions: '', weeksDeadline: '', initialRating: 5 };
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

export default function Desafios({ onBack }) {
  const { routines, history, challenges, createChallenge, completeChallenge, abandonChallenge } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [closingId, setClosingId] = useState(null);
  const [finalRating, setFinalRating] = useState(7);
  const [abandonConfirmId, setAbandonConfirmId] = useState(null);

  const today = todayStr();

  function updateForm(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  }

  function toggleRoutine(id) {
    setForm(f => ({
      ...f,
      routineIds: f.routineIds.includes(id)
        ? f.routineIds.filter(r => r !== id)
        : [...f.routineIds, id],
    }));
  }

  function handleCreate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio';
    if (!form.targetSessions || parseInt(form.targetSessions) < 1) errs.targetSessions = 'Ingresá una meta válida';
    if (!form.weeksDeadline || parseInt(form.weeksDeadline) < 1) errs.weeksDeadline = 'Ingresá un plazo válido';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const startDate = today;
    const endDate = addDays(today, parseInt(form.weeksDeadline) * 7);
    createChallenge({
      name: form.name.trim(),
      description: form.description.trim() || null,
      routineIds: form.routineIds,
      targetSessions: parseInt(form.targetSessions),
      weeksDeadline: parseInt(form.weeksDeadline),
      startDate,
      endDate,
      initialRating: form.initialRating,
    });
    setForm(emptyForm());
    setErrors({});
    setShowForm(false);
  }

  function handleClose(id) {
    completeChallenge(id, finalRating);
    setClosingId(null);
    setFinalRating(7);
  }

  const active = challenges.filter(c => c.status === 'active');
  const completed = challenges.filter(c => c.status === 'completed');

  const needsClosingIds = useMemo(
    () => active.filter(c => getChallengeProgress(c, history).needsClosing).map(c => c.id),
    [active, history]
  );

  function routineLabel(routineIds) {
    if (!routineIds || routineIds.length === 0) return 'Todas las rutinas';
    return routineIds.map(id => routines.find(r => r.id === id)?.name).filter(Boolean).join(', ') || 'Rutinas eliminadas';
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

      {/* ── Formulario de creación ── */}
      {showForm && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, color: '#263238', marginBottom: 16 }}>Nuevo desafio</div>

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

          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Meta (sesiones) *</label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="ej: 12"
                value={form.targetSessions}
                onChange={e => updateForm('targetSessions', e.target.value)}
                style={errors.targetSessions ? { borderColor: '#EF5350' } : {}}
              />
              {errors.targetSessions && <div style={{ fontSize: 12, color: '#EF5350', marginTop: 4 }}>{errors.targetSessions}</div>}
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Plazo (semanas) *</label>
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
            </div>
          </div>

          {form.weeksDeadline && parseInt(form.weeksDeadline) > 0 && (
            <div style={{ fontSize: 12, color: '#78909C', marginTop: 6, marginBottom: 4 }}>
              Fecha límite: {formatDate(addDays(today, parseInt(form.weeksDeadline) * 7))}
            </div>
          )}

          <div className="form-group" style={{ marginTop: 12 }}>
            <RatingPicker
              value={form.initialRating}
              onChange={v => updateForm('initialRating', v)}
              label="¿Cómo estás en esto hoy? (1-10)"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => { setShowForm(false); setForm(emptyForm()); setErrors({}); }}
            >
              Cancelar
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreate}>
              Crear desafio
            </button>
          </div>
        </div>
      )}

      {/* ── Estado vacío ── */}
      {active.length === 0 && completed.length === 0 && !showForm && (
        <div className="empty-state">
          <p>No hay desafios todavía.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            Crear primer desafio
          </button>
        </div>
      )}

      {/* ── Desafios activos ── */}
      {active.map(challenge => {
        const progress = getChallengeProgress(challenge, history);
        const isReadyToClose = needsClosingIds.includes(challenge.id);
        const isCurrentlyClosing = closingId === challenge.id;
        const rLabel = routineLabel(challenge.routineIds);

        if (isReadyToClose) {
          return (
            <div key={challenge.id} className="card" style={{ border: '2px solid #059669' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <CheckCircleIcon size={20} />
                <div style={{ fontWeight: 800, fontSize: 15, color: '#059669' }}>
                  {progress.isComplete ? '¡Desafio completado!' : 'Plazo vencido'}
                </div>
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
              <button
                className="btn btn-ghost"
                style={{ padding: '4px 6px', color: '#EF5350', flexShrink: 0 }}
                onClick={() => setAbandonConfirmId(challenge.id)}
                title="Abandonar desafio"
              >
                <TrashIcon size={14} />
              </button>
            </div>

            <div style={{ fontSize: 12, color: '#78909C', marginBottom: 10 }}>{rLabel}</div>

            {/* Barra de progreso */}
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

            {/* Tiempo + ritmo */}
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
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#263238' }}>{c.name}</div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                    background: goalMet ? '#D1FAE5' : '#FEF3C7',
                    color: goalMet ? '#065F46' : '#92400E',
                  }}>
                    {goalMet ? '✓ Meta' : 'Parcial'}
                  </span>
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

      {/* ── Modal: confirmación de abandono ── */}
      {abandonConfirmId && (() => {
        const c = challenges.find(ch => ch.id === abandonConfirmId);
        if (!c) return null;
        return (
          <div className="modal-overlay" onClick={() => setAbandonConfirmId(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 10 }}>
                Abandonar desafio
              </div>
              <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
                ¿Abandonar <strong style={{ color: '#263238' }}>"{c.name}"</strong>?
                Se perderá el progreso registrado.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAbandonConfirmId(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#C62828', borderColor: '#C62828' }}
                  onClick={() => { abandonChallenge(abandonConfirmId); setAbandonConfirmId(null); }}
                >
                  Abandonar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
