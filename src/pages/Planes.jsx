import { useState, useMemo, useEffect } from 'react';
import { useStore, getPlanProgress } from '../store/useStore';
import { todayStr, formatDate, addDays } from '../utils/dates';
import { daysUntil, weeksBetween, getDatesBetween } from '../utils/plans';
import { PlusIcon, TrashIcon, EditIcon, ChevronLeft, CheckIcon, ChevronRight, StarIcon } from '../components/Icons';
import EmptyState from '../components/EmptyState';
import PlanDetail from './PlanDetail';
import ProgressBar from '../components/ProgressBar';
import PlanCelebration from '../components/PlanCelebration';
import { ACT_DOT_COLORS } from '../utils/colors';


function WeekTemplatePreview({ template }) {
  const DOW_MAP = [1, 2, 3, 4, 5, 6, 0];
  const LABELS  = ['L','M','X','J','V','S','D'];
  return (
    <div style={{ display: 'flex', gap: 4, padding: '6px 0 2px' }}>
      {DOW_MAP.map((dow, i) => {
        const d = template?.[dow] || {};
        const acts = [
          d.gym       && ACT_DOT_COLORS.gym,
          d.routineId && ACT_DOT_COLORS.indiv,
          d.arsenal   && ACT_DOT_COLORS.arsenal,
          d.match     && ACT_DOT_COLORS.match,
        ].filter(Boolean);
        return (
          <div key={dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: 9, color: 'var(--text-light)', fontWeight: 600, lineHeight: 1 }}>{LABELS[i]}</span>
            {acts.length > 0
              ? acts.map((bg, ai) => <div key={ai} style={{ width: '100%', height: 4, borderRadius: 2, background: bg }} />)
              : <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--divider)' }} />
            }
          </div>
        );
      })}
    </div>
  );
}

function emptyForm() {
  const today = todayStr();
  return {
    name: '',
    objective: '',
    startDate: today,
    endDate: addDays(today, 42),  // 6 semanas por defecto
    activityType: 'individual',
    routineIds: [],
    gymWeeklyFrequency: '',
    individualWeeklyFrequency: '',
    targetSessions: '',
    targetSessionsManual: false,
    initialRating: 5,
    weekTemplateId: null,
  };
}

function RatingPicker({ value, onChange, label }) {
  return (
    <div>
      {label && <div className="form-label">{label}</div>}
      <div style={{ display: 'flex', gap: 3 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
          <button key={n} onClick={() => onChange(n)} style={{
            flex: 1, padding: '8px 2px', borderRadius: 8, border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
            background: n <= value ? 'var(--navy-800)' : 'var(--divider)',
            color: n <= value ? 'var(--amber-300)' : 'var(--text-light)',
          }}>{n}</button>
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

export default function Planes({ onBack }) {
  const { routines, history, plans, weekTemplates, schedule,
          createPlan, completePlan, deletePlan, updatePlan,
          applyWeekTemplate, markPlanAutoApplied, clearWeekSchedule } = useStore();
  const [showForm, setShowForm]           = useState(false);
  const [editingId, setEditingId]         = useState(null);
  const [reopenOnSave, setReopenOnSave]   = useState(false);
  const [form, setForm]                   = useState(emptyForm);
  const [errors, setErrors]               = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [reopenPromptId, setReopenPromptId]   = useState(null);
  const [selectedPlanId, setSelectedPlanId]   = useState(null);
  const [applyPrompt, setApplyPrompt]         = useState(null);
  const [cleanupPrompt, setCleanupPrompt]     = useState(null);
  const [planCelebration, setPlanCelebration] = useState(null);

  const today = todayStr();

  // Detect plans that just became active and have an unhandled week template
  useEffect(() => {
    if (applyPrompt !== null) return;
    const plan = plans.find(p =>
      p.status !== 'completed' && p.weekTemplateId && !p.autoApplied && p.startDate <= today
    );
    if (!plan) return;
    const tmpl = weekTemplates.find(t => t.id === plan.weekTemplateId);
    if (!tmpl) { markPlanAutoApplied(plan.id); return; }
    const dates = getDatesBetween(plan.startDate, plan.endDate);
    setApplyPrompt({ planId: plan.id, planName: plan.name, templateName: tmpl.name, templateDays: tmpl.days, dates });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, weekTemplates, applyPrompt]);

  // ── Derived lists ────────────────────────────────────────────────────────────
  const pending   = useMemo(() => plans.filter(p => p.status !== 'completed' && today < p.startDate), [plans, today]);
  const active    = useMemo(() => plans.filter(p => p.status !== 'completed' && today >= p.startDate && today <= p.endDate), [plans, today]);
  const expired   = useMemo(() => plans.filter(p => p.status !== 'completed' && today > p.endDate), [plans, today]);
  const completed = useMemo(() => plans.filter(p => p.status === 'completed'), [plans]);

  // ── Detail view ──────────────────────────────────────────────────────────────
  const selectedPlan = selectedPlanId ? plans.find(p => p.id === selectedPlanId) : null;
  if (selectedPlan) {
    return (
      <>
        <PlanDetail
          plan={selectedPlan}
          history={history}
          routines={routines}
          onBack={() => setSelectedPlanId(null)}
          onComplete={(id, rating, notes) => {
            const p = plans.find(pl => pl.id === id);
            completePlan(id, rating, notes);
            // Misma celebración que al cerrar desde la tab Entrenamiento
            setPlanCelebration({ planName: p?.name || '' });
            setTimeout(() => {
              setPlanCelebration(null);
              if (p?.autoApplied && p?.weekTemplateId) {
                setCleanupPrompt({ planId: id, planName: p.name, dates: getDatesBetween(p.startDate, p.endDate), deleteAfter: false });
              }
            }, 1800);
          }}
        />
        {planCelebration && <PlanCelebration planName={planCelebration.planName} />}
      </>
    );
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────
  function calcTarget(form) {
    const weeks = weeksBetween(form.startDate || today, form.endDate || today);
    const gym = parseInt(form.gymWeeklyFrequency) || 0;
    const ind = parseInt(form.individualWeeklyFrequency) || 0;
    const total = (gym + ind) * weeks;
    return total > 0 ? String(total) : '';
  }

  function updateForm(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value };
      const affectsTarget = ['gymWeeklyFrequency', 'individualWeeklyFrequency', 'startDate', 'endDate'].includes(field);
      if (affectsTarget && !f.targetSessionsManual) {
        next.targetSessions = calcTarget(next);
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

  function validate() {
    const errs = {};
    if (!form.name.trim())      errs.name      = 'El nombre es obligatorio';
    if (!form.objective.trim()) errs.objective = 'El objetivo es obligatorio';
    if (!form.endDate)          errs.endDate   = 'La fecha de fin es obligatoria';
    if (form.endDate <= form.startDate) errs.endDate = 'La fecha de fin debe ser posterior al inicio';
    if (!form.targetSessions || parseInt(form.targetSessions) < 1) errs.targetSessions = 'Ingresá una meta válida';
    return errs;
  }

  function buildPlanData() {
    const weeks = weeksBetween(form.startDate || today, form.endDate || today);
    const gymFreq = parseInt(form.gymWeeklyFrequency) || null;
    const indFreq = parseInt(form.individualWeeklyFrequency) || null;
    return {
      name: form.name.trim(),
      objective: form.objective.trim(),
      startDate: form.startDate || today,
      endDate: form.endDate,
      activityType: form.activityType,
      routineIds: form.activityType === 'gym' ? [] : form.routineIds,
      gymWeeklyFrequency: (form.activityType === 'gym' || form.activityType === 'both') ? gymFreq : null,
      individualWeeklyFrequency: (form.activityType === 'individual' || form.activityType === 'both') ? indFreq : null,
      targetSessions: parseInt(form.targetSessions),
      targetGymSessions: gymFreq && (form.activityType === 'gym' || form.activityType === 'both')
        ? gymFreq * weeks : null,
      targetIndividualSessions: indFreq && (form.activityType === 'individual' || form.activityType === 'both')
        ? indFreq * weeks : null,
      initialRating: form.initialRating,
      weekTemplateId: form.weekTemplateId || null,
    };
  }

  function handleCreate() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    createPlan(buildPlanData());
    closeForm();
  }

  function handleSaveEdit() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const data = buildPlanData();
    if (reopenOnSave) {
      data.status = 'active';
      data.completedAt = null;
      data.finalRating = null;
      data.closingNotes = null;
    }
    updatePlan(editingId, data);
    closeForm();
  }

  function openEditForm(plan, reopen) {
    setForm({
      name: plan.name,
      objective: plan.objective || '',
      startDate: plan.startDate,
      endDate: plan.endDate,
      activityType: plan.activityType || 'individual',
      routineIds: plan.routineIds || [],
      gymWeeklyFrequency: plan.gymWeeklyFrequency ? String(plan.gymWeeklyFrequency) : '',
      individualWeeklyFrequency: plan.individualWeeklyFrequency ? String(plan.individualWeeklyFrequency) : '',
      targetSessions: String(plan.targetSessions),
      targetSessionsManual: true,
      initialRating: plan.initialRating ?? 5,
      weekTemplateId: plan.weekTemplateId || null,
    });
    setEditingId(plan.id);
    setReopenOnSave(reopen);
    setShowForm(true);
    setErrors({});
  }

  function startEditing(plan) {
    if (plan.status === 'completed') setReopenPromptId(plan.id);
    else openEditForm(plan, false);
  }

  function confirmEditCompleted(reopen) {
    const plan = plans.find(p => p.id === reopenPromptId);
    setReopenPromptId(null);
    if (plan) openEditForm(plan, reopen);
  }

  function handleConfirmDelete() {
    const p = plans.find(pl => pl.id === deleteConfirmId);
    setDeleteConfirmId(null);
    if (p?.autoApplied && p?.weekTemplateId) {
      setCleanupPrompt({ planId: p.id, planName: p.name, dates: getDatesBetween(p.startDate, p.endDate), deleteAfter: true });
    } else {
      deletePlan(deleteConfirmId);
    }
  }

  // ── Activity label ───────────────────────────────────────────────────────────
  function activityLabel(plan) {
    const t = plan.activityType || 'individual';
    if (t === 'gym') return 'Gimnasio';
    if (t === 'both') return 'Individual + Gym';
    if (!plan.routineIds?.length) return 'Todas las rutinas';
    return plan.routineIds.map(id => routines.find(r => r.id === id)?.name).filter(Boolean).join(', ') || 'Rutinas eliminadas';
  }

  // ── Form duration preview ─────────────────────────────────────────────────────
  const formWeeks = form.startDate && form.endDate && form.endDate > form.startDate
    ? weeksBetween(form.startDate, form.endDate) : null;

  // ── Auto-calculated target preview ───────────────────────────────────────────
  const gymFreqNum = parseInt(form.gymWeeklyFrequency);
  const indFreqNum = parseInt(form.individualWeeklyFrequency);
  const showAutoCalc = !form.targetSessionsManual && formWeeks && (gymFreqNum > 0 || indFreqNum > 0);

  // ── Card actions ─────────────────────────────────────────────────────────────
  function CardActions({ plan }) {
    return (
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <button className="btn btn-ghost" style={{ padding: '4px 6px', color: 'var(--gray-mid)' }}
          onClick={e => { e.stopPropagation(); startEditing(plan); }} title="Editar plan">
          <EditIcon size={14} />
        </button>
        <button className="btn btn-ghost" style={{ padding: '4px 6px', color: 'var(--red-600)' }}
          onClick={e => { e.stopPropagation(); setDeleteConfirmId(plan.id); }} title="Eliminar plan">
          <TrashIcon size={14} />
        </button>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      <div className="page-header">
        {onBack && (
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <h1 className="page-title">Planes</h1>
        {!showForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <PlusIcon size={12} /> Nuevo
          </button>
        )}
      </div>

      {/* ── Formulario ── */}
      {showForm && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 16 }}>
            {editingId ? 'Editar plan' : 'Nuevo plan'}
          </div>

          {/* Nombre */}
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input className="input" placeholder="ej: Vuelta al ruedo" value={form.name}
              onChange={e => updateForm('name', e.target.value)}
              style={errors.name ? { borderColor: 'var(--red-600)' } : {}} />
            {errors.name && <div style={{ fontSize: 12, color: 'var(--red-600)', marginTop: 4 }}>{errors.name}</div>}
          </div>

          {/* Objetivo */}
          <div className="form-group">
            <label className="form-label">Objetivo *</label>
            <textarea className="input" placeholder="¿Qué buscás lograr con este plan?" value={form.objective}
              onChange={e => updateForm('objective', e.target.value)}
              style={errors.objective ? { borderColor: 'var(--red-600)' } : {}} />
            {errors.objective && <div style={{ fontSize: 12, color: 'var(--red-600)', marginTop: 4 }}>{errors.objective}</div>}
          </div>

          {/* Fechas */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Fecha de inicio</label>
              <input className="input" type="date" value={form.startDate}
                onChange={e => updateForm('startDate', e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Fecha de fin *</label>
              <input className="input" type="date" value={form.endDate}
                onChange={e => updateForm('endDate', e.target.value)}
                style={errors.endDate ? { borderColor: 'var(--red-600)' } : {}} />
              {errors.endDate && <div style={{ fontSize: 12, color: 'var(--red-600)', marginTop: 4 }}>{errors.endDate}</div>}
            </div>
          </div>
          {formWeeks != null && formWeeks > 0 && (
            <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: -8, marginBottom: 12 }}>
              Duración: <strong>{formWeeks} semanas</strong>
              {form.startDate > today && (
                <span style={{ marginLeft: 8 }}>· Comienza en {daysUntil(form.startDate)} días</span>
              )}
            </div>
          )}

          {/* Tipo de actividad */}
          <div className="form-group">
            <label className="form-label">¿Qué actividades cuentan?</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {ACTIVITY_OPTIONS.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => updateForm('activityType', value)} style={{
                  flex: 1, padding: '9px 4px', borderRadius: 8, fontFamily: 'inherit',
                  border: `1.5px solid ${form.activityType === value ? 'var(--navy-600)' : 'transparent'}`,
                  background: form.activityType === value ? 'var(--navy-100)' : 'var(--bg-subtle)',
                  fontWeight: form.activityType === value ? 700 : 400,
                  color: form.activityType === value ? 'var(--navy-600)' : 'var(--gray-mid)',
                  cursor: 'pointer', fontSize: 12,
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* Rutinas */}
          {(form.activityType === 'individual' || form.activityType === 'both') && routines.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Rutinas que cuentan <span style={{ color: 'var(--text-light)' }}>(todas si no elegís ninguna)</span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {routines.map(r => {
                  const checked = form.routineIds.includes(r.id);
                  return (
                    <div key={r.id} onClick={() => toggleRoutine(r.id)} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      background: checked ? 'var(--navy-100)' : 'var(--bg-subtle)',
                      border: `1.5px solid ${checked ? 'var(--navy-600)' : 'transparent'}`,
                    }}>
                      <div className={`checkbox-custom${checked ? ' checked' : ''}`} style={{ flexShrink: 0 }}>
                        {checked && <CheckIcon size={11} />}
                      </div>
                      <span style={{ fontSize: 14, fontWeight: checked ? 600 : 400, color: 'var(--text-primary)' }}>{r.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Frecuencias */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(form.activityType === 'gym' || form.activityType === 'both') && (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Gym (días/sem)</label>
                <input className="input" type="number" min="1" placeholder="ej: 4" value={form.gymWeeklyFrequency}
                  onChange={e => updateForm('gymWeeklyFrequency', e.target.value)} />
              </div>
            )}
            {(form.activityType === 'individual' || form.activityType === 'both') && (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Entreno (días/sem)</label>
                <input className="input" type="number" min="1" placeholder="ej: 3" value={form.individualWeeklyFrequency}
                  onChange={e => updateForm('individualWeeklyFrequency', e.target.value)} />
              </div>
            )}
          </div>

          {/* Meta total */}
          <div className="form-group">
            <label className="form-label">Meta total (sesiones) *</label>
            <input className="input" type="number" min="1" placeholder="ej: 24"
              value={form.targetSessions}
              onChange={e => updateTargetSessions(e.target.value)}
              style={errors.targetSessions ? { borderColor: 'var(--red-600)' } : {}} />
            {errors.targetSessions && <div style={{ fontSize: 12, color: 'var(--red-600)', marginTop: 4 }}>{errors.targetSessions}</div>}
            {showAutoCalc && (
              <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 4 }}>
                Auto: {gymFreqNum > 0 ? `${gymFreqNum} gym` : ''}{gymFreqNum > 0 && indFreqNum > 0 ? ' + ' : ''}{indFreqNum > 0 ? `${indFreqNum} ind.` : ''} × {formWeeks} sem = <strong>{(gymFreqNum || 0) + (indFreqNum || 0)} × {formWeeks} = {((gymFreqNum || 0) + (indFreqNum || 0)) * formWeeks}</strong>
              </div>
            )}
          </div>

          {/* Autoevaluación */}
          <div className="form-group" style={{ marginTop: 4 }}>
            <RatingPicker value={form.initialRating} onChange={v => updateForm('initialRating', v)}
              label="¿Cómo estás en esto hoy? (1-10)" />
          </div>

          {/* Semana tipo asociada */}
          {weekTemplates.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Semana tipo asociada <span style={{ color: 'var(--text-light)' }}>(opcional)</span>
              </label>
              <select
                className="input"
                value={form.weekTemplateId || ''}
                onChange={e => updateForm('weekTemplateId', e.target.value || null)}
              >
                <option value="">— Sin semana tipo —</option>
                {weekTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (predeterminada)' : ''}</option>
                ))}
              </select>
              {form.weekTemplateId && (() => {
                const tmpl = weekTemplates.find(t => t.id === form.weekTemplateId);
                return (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      Vista previa
                    </div>
                    <WeekTemplatePreview template={tmpl?.days} />
                    <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginTop: 6 }}>
                      Se sugerirá aplicar esta semana tipo al activarse el plan.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {reopenOnSave && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--emerald-100)', fontSize: 12, color: 'var(--emerald-800)', fontWeight: 600, marginTop: 4 }}>
              Al guardar, el plan se reabrirá como activo.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={closeForm}>Cancelar</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={editingId ? handleSaveEdit : handleCreate}>
              {editingId ? 'Guardar cambios' : 'Crear plan'}
            </button>
          </div>
        </div>
      )}

      {/* ── Estado vacío ── */}
      {pending.length === 0 && active.length === 0 && completed.length === 0 && !showForm && (
        <EmptyState
          icon={<StarIcon size={30} />}
          title="Sin planes"
          text="Marcá un objetivo y seguí tu progreso semana a semana"
          action={<button className="btn btn-primary" onClick={() => setShowForm(true)}>Crear primer plan</button>}
        />
      )}

      {/* ── Próximos ── */}
      {pending.length > 0 && (
        <>
          <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 12, color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Próximos
          </div>
          {pending.map(plan => {
            const dias = daysUntil(plan.startDate);
            return (
              <div key={plan.id} className="card" style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{plan.name}</div>
                    {plan.objective && <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>{plan.objective}</div>}
                  </div>
                  <CardActions plan={plan} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>Inicio: {formatDate(plan.startDate)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'var(--divider)', color: 'var(--gray-mid)' }}>
                    Comienza en {dias} día{dias !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
                  {activityLabel(plan)} · Meta: {plan.targetSessions} ses. · {weeksBetween(plan.startDate, plan.endDate)} sem
                </div>
                {plan.weekTemplateId && (() => {
                  const tmpl = weekTemplates.find(t => t.id === plan.weekTemplateId);
                  return tmpl ? (
                    <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>
                      Semana tipo: {tmpl.name}
                    </div>
                  ) : null;
                })()}
              </div>
            );
          })}
        </>
      )}

      {/* ── Activos ── */}
      {active.length > 0 && (pending.length > 0 || completed.length > 0) && (
        <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 12, color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Activos
        </div>
      )}
      {active.map(plan => {
        const prog = getPlanProgress(plan, history);
        return (
          <div key={plan.id} className="card" style={{ cursor: 'pointer' }}
            onClick={() => setSelectedPlanId(plan.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{plan.name}</div>
                {plan.objective && <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>{plan.objective}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CardActions plan={plan} />
                <ChevronRight size={14} style={{ color: 'var(--text-light)', flexShrink: 0 }} />
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginBottom: plan.weekTemplateId ? 4 : 8 }}>{activityLabel(plan)}</div>
            {plan.weekTemplateId && (() => {
              const tmpl = weekTemplates.find(t => t.id === plan.weekTemplateId);
              return tmpl ? (
                <div style={{ fontSize: 11, color: 'var(--gray-mid)', marginBottom: 8 }}>
                  Semana tipo: <strong>{tmpl.name}</strong>
                </div>
              ) : null;
            })()}

            {/* Progreso */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{prog.completedSessions}/{prog.effTotal} sesiones</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'var(--divider)', color: 'var(--gray-mid)' }}>
                    Sem {prog.currentWeekNum}/{prog.totalWeeks}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{prog.pct}%</span>
                </div>
              </div>
              <ProgressBar value={prog.pct} />
            </div>

            {/* Ritmo */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--gray-mid)' }}>
                {prog.remainingDays > 0 ? `${prog.remainingDays} días restantes` : 'Plazo vencido'}
              </span>
              <span
                title={prog.isOnTrack ? undefined : 'Vas por debajo del ritmo esperado para esta semana'}
                style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                  background: prog.isOnTrack ? 'var(--emerald-100)' : 'var(--red-100)',
                  color: prog.isOnTrack ? 'var(--emerald-800)' : 'var(--red-800)',
                  cursor: prog.isOnTrack ? 'default' : 'help',
                }}>
                {prog.isOnTrack ? '✓ En ritmo' : `Atrasado`}
              </span>
            </div>
          </div>
        );
      })}

      {/* ── Vencidos ── */}
      {expired.length > 0 && (
        <>
          <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 12, color: 'var(--amber-800)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Vencidos
          </div>
          {expired.map(plan => {
            const prog = getPlanProgress(plan, history);
            return (
              <div key={plan.id} className="card" style={{ cursor: 'pointer', borderColor: 'var(--amber-100)' }}
                onClick={() => setSelectedPlanId(plan.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{plan.name}</div>
                    {plan.objective && <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 2 }}>{plan.objective}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'var(--amber-100)', color: 'var(--amber-800)' }}>
                      Vencido
                    </span>
                    <CardActions plan={plan} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginBottom: 8 }}>
                  {formatDate(plan.startDate)} — {formatDate(plan.endDate)} · {prog.completedSessions}/{prog.effTotal} ses.
                </div>
                <ProgressBar value={prog.pct} color="var(--amber-600)" />
              </div>
            );
          })}
        </>
      )}

      {/* ── Completados ── */}
      {completed.length > 0 && (
        <>
          <div style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 12, color: 'var(--gray-mid)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Completados
          </div>
          {completed.map(plan => {
            const prog = getPlanProgress(plan, history);
            const goalMet = prog.pct >= 100;
            const diff = plan.finalRating != null ? plan.finalRating - (plan.initialRating ?? 5) : null;
            return (
              <div key={plan.id} className="card" style={{ opacity: 0.88 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{plan.name}</div>
                    {plan.objective && <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 1 }}>{plan.objective}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: goalMet ? 'var(--emerald-100)' : 'var(--amber-100)',
                      color: goalMet ? 'var(--emerald-800)' : 'var(--amber-800)',
                    }}>{goalMet ? '✓ Meta' : 'Parcial'}</span>
                    <CardActions plan={plan} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginBottom: 6 }}>
                  {formatDate(plan.startDate)} — {formatDate(plan.endDate)} · {prog.completedSessions}/{prog.effTotal} ses.
                </div>
                {plan.finalRating != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                    <span>Antes: <strong>{plan.initialRating}/10</strong></span>
                    <span style={{ color: 'var(--text-light)' }}>→</span>
                    <span>Después: <strong>{plan.finalRating}/10</strong></span>
                    {diff !== 0 && diff != null && (
                      <span style={{ fontWeight: 700, color: diff > 0 ? 'var(--emerald-600)' : 'var(--red-600)' }}>
                        ({diff > 0 ? '+' : ''}{diff})
                      </span>
                    )}
                  </div>
                )}
                {plan.closingNotes && (
                  <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 6, fontStyle: 'italic' }}>
                    "{plan.closingNotes}"
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── Modal: eliminar ── */}
      {deleteConfirmId && (() => {
        const p = plans.find(pl => pl.id === deleteConfirmId);
        if (!p) return null;
        return (
          <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', marginBottom: 10 }}>Eliminar plan</div>
              <div style={{ fontSize: 14, color: 'var(--gray-mid)', marginBottom: 24, lineHeight: 1.5 }}>
                ¿Estás seguro de eliminar <strong style={{ color: 'var(--text-primary)' }}>"{p.name}"</strong>?
                {p.status !== 'completed' && today >= p.startDate && ' Se perderá el progreso registrado.'}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirmId(null)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--red-600)', borderColor: 'var(--red-600)' }}
                  onClick={handleConfirmDelete}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: aplicar semana tipo al plan ── */}
      {applyPrompt && (
        <div className="modal-overlay" onClick={() => { markPlanAutoApplied(applyPrompt.planId); setApplyPrompt(null); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', marginBottom: 10 }}>
              Semana tipo del plan
            </div>
            <div style={{ fontSize: 14, color: 'var(--gray-mid)', marginBottom: 12, lineHeight: 1.5 }}>
              El plan <strong style={{ color: 'var(--text-primary)' }}>"{applyPrompt.planName}"</strong> tiene la semana tipo{' '}
              <strong style={{ color: 'var(--text-primary)' }}>"{applyPrompt.templateName}"</strong> asociada.
              ¿Querés aplicarla al período del plan? Esto va a reemplazar las actividades asignadas en ese período.
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Vista previa · {Math.ceil(applyPrompt.dates.length / 7)} semanas
              </div>
              <WeekTemplatePreview template={applyPrompt.templateDays} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => { markPlanAutoApplied(applyPrompt.planId); setApplyPrompt(null); }}>
                No, mantener lo actual
              </button>
              <button className="btn btn-primary" style={{ flex: 2 }}
                onClick={() => {
                  applyWeekTemplate(applyPrompt.dates, applyPrompt.templateDays);
                  markPlanAutoApplied(applyPrompt.planId);
                  setApplyPrompt(null);
                }}>
                Aplicar al período
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: limpiar actividades del plan ── */}
      {cleanupPrompt && (
        <div className="modal-overlay" onClick={() => { if (cleanupPrompt.deleteAfter) deletePlan(cleanupPrompt.planId); setCleanupPrompt(null); }}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', marginBottom: 10 }}>
              Actividades del plan
            </div>
            <div style={{ fontSize: 14, color: 'var(--gray-mid)', marginBottom: 24, lineHeight: 1.5 }}>
              ¿Querés limpiar las actividades del plan{' '}
              <strong style={{ color: 'var(--text-primary)' }}>"{cleanupPrompt.planName}"</strong> del calendario o mantenerlas?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => { if (cleanupPrompt.deleteAfter) deletePlan(cleanupPrompt.planId); setCleanupPrompt(null); }}>
                Mantener
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => {
                  clearWeekSchedule(cleanupPrompt.dates);
                  if (cleanupPrompt.deleteAfter) deletePlan(cleanupPrompt.planId);
                  setCleanupPrompt(null);
                }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: reabrir completado ── */}
      {reopenPromptId && (() => {
        const p = plans.find(pl => pl.id === reopenPromptId);
        if (!p) return null;
        return (
          <div className="modal-overlay" onClick={() => setReopenPromptId(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', marginBottom: 10 }}>Plan cerrado</div>
              <div style={{ fontSize: 14, color: 'var(--gray-mid)', marginBottom: 24, lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>"{p.name}"</strong> ya está cerrado. ¿Querés reabrirlo como activo?
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => confirmEditCompleted(false)}>No, solo editar</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => confirmEditCompleted(true)}>Sí, reabrir</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Celebración al completar un plan ── */}
      {planCelebration && <PlanCelebration planName={planCelebration.planName} />}
    </div>
  );
}
