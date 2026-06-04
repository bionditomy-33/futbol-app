import { useState, useMemo } from 'react';
import { getPlanProgress, computePlanWeeklyLog, useStore } from '../store/useStore';
import { toDateStr, todayStr } from '../utils/dates';
import { getDayActivities } from '../utils/activities';
import { ChevronLeft, ChevronDown, CheckCircleIcon, XIcon } from '../components/Icons';
import { ActivityList, RoutinePreviewModal } from '../components/DayActivities';

const TODAY = todayStr();
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function dateShort(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d}/${m}`;
}

// ─── Sección colapsable ────────────────────────────────────────────────────────

function Section({ title, badge, open, onToggle, children }) {
  return (
    <div className="card">
      <button type="button" className="plan-section-hdr" onClick={onToggle} aria-expanded={open}>
        <span className="plan-section-title">{title}</span>
        {badge}
        <span className={`plan-section-chevron${open ? ' open' : ''}`}><ChevronDown size={16} /></span>
      </button>
      {open && <div className="plan-section-body">{children}</div>}
    </div>
  );
}

// ─── Banner de alerta (warning / urgente) ──────────────────────────────────────

function AlertTriangle({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2L15 14H1L8 2Z" />
      <line x1="8" y1="6.5" x2="8" y2="9.5" />
      <circle cx="8" cy="11.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AlertBanner({ level, text, onClose }) {
  return (
    <div className={`plan-alert plan-alert-${level}`}>
      <span className="plan-alert-icon"><AlertTriangle size={17} /></span>
      <div className="plan-alert-text">{text}</div>
      <button className="plan-alert-close" onClick={onClose} aria-label="Descartar">
        <XIcon size={15} />
      </button>
    </div>
  );
}

// ─── SVG circular progress ────────────────────────────────────────────────────

function CircularProgress({ pct, size = 136, strokeWidth = 11, color = '#1D3461', bg = '#E8EDF5' }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

// ─── Barra de progreso lineal ─────────────────────────────────────────────────

function LinearBar({ pct, color }) {
  return (
    <div style={{ height: 8, borderRadius: 99, background: '#E8EDF5', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 99, background: color,
        width: `${Math.min(100, pct)}%`, transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

// ─── Badge de ritmo ───────────────────────────────────────────────────────────

function RhythmBadge({ onTrack, ahead }) {
  if (ahead) return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#DBEAFE', color: '#1D4ED8' }}>
      Adelantado
    </span>
  );
  if (onTrack) return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#D1FAE5', color: '#065F46' }}>
      En ritmo
    </span>
  );
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FEE2E2', color: '#991B1B' }}>
      Atrasado
    </span>
  );
}

// ─── Formulario de cierre ─────────────────────────────────────────────────────

function RatingPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            flex: 1, padding: '7px 2px', borderRadius: 6, border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12,
            background: n <= value ? '#0A1628' : '#F1F5F9',
            color: n <= value ? '#FCD34D' : '#94A3B8',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function CloseForm({ plan, progress, weeks, onClose, onCancel }) {
  const [finalRating, setFinalRating] = useState(plan.initialRating ?? 5);
  const [notes, setNotes] = useState('');

  const completedWeeks = weeks.filter(w => w.isPast || w.isCurrent).filter(w => w.isCompliant).length;
  const pastWeeks = weeks.filter(w => w.isPast || w.isCurrent);
  const bestWeek = pastWeeks.reduce((best, w) => {
    const score = w.gym + w.individual;
    return (!best || score > best.score) ? { ...w, score } : best;
  }, null);
  const worstWeek = pastWeeks.reduce((worst, w) => {
    const score = w.gym + w.individual;
    return (!worst || score < worst.score) ? { ...w, score } : worst;
  }, null);
  const diff = finalRating - (plan.initialRating ?? 5);

  return (
    <div className="card" style={{ border: '2px solid #059669' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <CheckCircleIcon size={20} />
        <div style={{ fontWeight: 800, fontSize: 16, color: '#059669' }}>Cerrar plan</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3461' }}>{progress.pct}%</div>
          <div style={{ fontSize: 11, color: '#78909C' }}>{progress.completedSessions}/{progress.effTotal} sesiones</div>
        </div>
        {progress.gymPct != null && (
          <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1D3461' }}>{progress.gymPct}%</div>
            <div style={{ fontSize: 11, color: '#78909C' }}>Gym: {progress.gymSessions}/{progress.effGymTarget}</div>
          </div>
        )}
        {progress.individualPct != null && (
          <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1D3461' }}>{progress.individualPct}%</div>
            <div style={{ fontSize: 11, color: '#78909C' }}>Ind: {progress.individualSessions}/{progress.effIndTarget}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, color: '#263238' }}>
          <strong>{completedWeeks}</strong>/{pastWeeks.length} semanas al 100%
        </div>
        {bestWeek && (
          <div style={{ fontSize: 12, color: '#78909C' }}>
            · Mejor: Sem {bestWeek.num} ({bestWeek.score} ses.)
          </div>
        )}
        {worstWeek && bestWeek?.num !== worstWeek?.num && (
          <div style={{ fontSize: 12, color: '#78909C' }}>
            · Peor: Sem {worstWeek.num} ({worstWeek.score} ses.)
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div className="form-label" style={{ marginBottom: 6 }}>¿Cómo estás ahora en esto? (1-10)</div>
        <RatingPicker value={finalRating} onChange={setFinalRating} />
        <div style={{ fontSize: 12, color: '#78909C', marginTop: 6 }}>
          Antes: <strong style={{ color: '#263238' }}>{plan.initialRating}/10</strong>
          {' → '}Ahora: <strong style={{ color: '#263238' }}>{finalRating}/10</strong>
          {diff !== 0 && (
            <span style={{ fontWeight: 700, marginLeft: 6, color: diff > 0 ? '#059669' : '#DC2626' }}>
              ({diff > 0 ? '+' : ''}{diff})
            </span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">¿Qué sacaste de este plan? <span style={{ color: '#B0BEC5' }}>(opcional)</span></label>
        <textarea
          className="input"
          placeholder="Reflexión, aprendizajes, próximos pasos..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ minHeight: 72 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
          Volver
        </button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => onClose(finalRating, notes)}>
          Cerrar plan
        </button>
      </div>
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function isRelevantAct(act, actType, routineIds = []) {
  if ((actType === 'gym' || actType === 'both') && act.type === 'gym') return true;
  if ((actType === 'individual' || actType === 'both') && act.type === 'indiv') {
    return routineIds.length === 0 || routineIds.includes(act.routineId);
  }
  return false;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlanDetail({ plan, history, routines, onBack, onComplete, onEdit, onStartToday }) {
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState(() => new Set());
  const [previewRoutineId, setPreviewRoutineId] = useState(null);

  const { schedule, matches, weekTemplate, weekTemplates, updateDay, removeActivityFromDay, exerciseMap, catalog, catLinks } = useStore();

  const progress = getPlanProgress(plan, history);
  const weeks    = computePlanWeeklyLog(plan, history);
  const actType  = plan.activityType || 'individual';

  const effectiveTmpl = useMemo(() => {
    if (plan.weekTemplateId) {
      const tmpl = weekTemplates.find(t => t.id === plan.weekTemplateId);
      if (tmpl) return tmpl.days;
    }
    return weekTemplate;
  }, [plan.weekTemplateId, weekTemplates, weekTemplate]);

  const currentWeek = weeks.find(w => w.isCurrent);
  const lastPast    = [...weeks].reverse().find(w => w.isPast);
  const gymDebt     = lastPast?.accGymDebt   || 0;
  const indivDebt   = lastPast?.accIndivDebt || 0;

  // Actividades de HOY (interactivas) — todo lo del día
  const todayActs = useMemo(
    () => getDayActivities(TODAY, schedule, history, matches, effectiveTmpl),
    [schedule, history, matches, effectiveTmpl]
  );

  // "Esta semana" — days of the current plan week
  const thisWeekData = useMemo(() => {
    if (!currentWeek) return [];
    const out = [];
    let d = new Date(currentWeek.startDate + 'T12:00:00');
    const end = new Date(currentWeek.endDate + 'T12:00:00');
    while (d <= end) {
      const ds = toDateStr(d);
      out.push({
        dateStr: ds,
        acts: getDayActivities(ds, schedule, history, matches, effectiveTmpl)
          .filter(a => isRelevantAct(a, actType, plan.routineIds || [])),
      });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [currentWeek, schedule, history, matches, effectiveTmpl, actType, plan.routineIds]);

  // "Próximos entrenamientos" — next 7 pending plan activities
  const upcomingActs = useMemo(() => {
    const result = [];
    const startFrom = TODAY > plan.startDate ? TODAY : plan.startDate;
    let d = new Date(startFrom + 'T12:00:00');
    let iters = 0;
    while (result.length < 7 && iters < 90) {
      iters++;
      const ds = toDateStr(d);
      if (ds > plan.endDate) break;
      getDayActivities(ds, schedule, history, matches, effectiveTmpl)
        .filter(a => isRelevantAct(a, actType, plan.routineIds || []) && !a.done)
        .forEach(act => { if (result.length < 7) result.push({ dateStr: ds, act }); });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }, [schedule, history, matches, effectiveTmpl, actType, plan]);

  const routineLabel = () => {
    if (actType === 'gym') return 'Gimnasio';
    if (actType === 'both') return 'Individual + Gimnasio';
    if (!plan.routineIds?.length) return 'Todas las rutinas';
    return plan.routineIds.map(id => routines.find(r => r.id === id)?.name).filter(Boolean).join(', ') || 'Rutinas eliminadas';
  };

  const rhythmStatus = progress.isOnTrack
    ? (progress.completedSessions > (progress.effTotal * (progress.currentWeekNum / progress.totalWeeks)) + 0.5 ? 'ahead' : 'ontrack')
    : 'behind';

  // ── Secciones colapsables (cerradas por defecto) ───────────────────────────
  const [openSections, setOpenSections] = useState({});
  const toggleSection = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  // ── Contexto temporal de la semana actual del plan ─────────────────────────
  const isFirstWeek = progress.currentWeekNum <= 1;
  const todayDow = new Date(TODAY + 'T12:00:00').getDay(); // 0=Dom .. 6=Sáb
  const lateWeek = todayDow === 0 || todayDow >= 3;         // miércoles a domingo
  const daysLeftInWeek = currentWeek
    ? Math.max(0, Math.round((new Date(currentWeek.endDate + 'T12:00:00') - new Date(TODAY + 'T12:00:00')) / 86400000) + 1)
    : 0;

  // ── CAMBIO 2: proyección de compensación para la semana que viene ──────────
  // base + lo que va a faltar esta semana (tope: base + 2). Sólo desde el miércoles.
  const compPreview = (() => {
    if (!currentWeek || isFirstWeek || !lateWeek) return null;
    if (progress.currentWeekNum >= progress.totalWeeks) return null; // no hay semana siguiente
    const rows = [];
    const build = (label, base, done) => {
      if (!base || base <= 0) return;
      const maxReachable = done + daysLeftInWeek;          // optimista: 1 sesión por día restante
      const comp = Math.min(2, Math.max(0, base - maxReachable));
      if (comp > 0) rows.push({ label, base, comp, total: base + comp });
    };
    if (actType === 'gym' || actType === 'both') build('Gym', currentWeek.gymTarget, currentWeek.gym);
    if (actType === 'individual' || actType === 'both') build('Individual', currentWeek.individualTarget, currentWeek.individual);
    return rows.length > 0 ? rows : null;
  })();

  // ── CAMBIO 3: alertas de urgencia ──────────────────────────────────────────
  const alerts = (() => {
    if (isFirstWeek || progress.isExpired || progress.isComplete || progress.isPending) return [];
    const out = [];

    // Nivel semana
    if (currentWeek) {
      const weekTarget = (currentWeek.gymEffTarget || 0) + (currentWeek.indivEffTarget || 0);
      const weekDone   = (currentWeek.gym || 0) + (currentWeek.individual || 0);
      const missing    = weekTarget - weekDone;
      if (weekTarget > 0 && missing > 0) {
        if (missing > daysLeftInWeek) {
          out.push({
            id: 'week-red', level: 'red',
            text: `Si no completás ${missing} ${missing === 1 ? 'sesión' : 'sesiones'} más esta semana, vas a acumular deuda para la próxima.`,
          });
        } else if (lateWeek) {
          out.push({
            id: 'week-yellow', level: 'yellow',
            text: `Llevás ${weekDone} ${weekDone === 1 ? 'sesión' : 'sesiones'} de ${weekTarget} esta semana. Te faltan ${missing} para cumplir el objetivo.`,
          });
        }
      }
    }

    // Nivel plan: ritmo general por debajo del 70% de lo esperado
    const expected = progress.effTotal * (progress.currentWeekNum / progress.totalWeeks);
    if (expected > 0 && progress.completedSessions < expected * 0.7) {
      const weeksLeft = Math.max(1, progress.totalWeeks - progress.currentWeekNum + 1);
      const perWeek = progress.neededPerWeek;
      out.push({
        id: 'plan-red', level: 'red',
        text: `A este ritmo no vas a completar el plan. Necesitás promediar ${perWeek} ${perWeek === 1 ? 'sesión' : 'sesiones'} por semana en las ${weeksLeft} ${weeksLeft === 1 ? 'semana' : 'semanas'} que quedan.`,
      });
    }
    return out;
  })();

  // Descarte por día (persistido en localStorage; reaparece al día siguiente)
  const dismissKey = `planAlertsDismissed:${plan.id}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(dismissKey) || '{}'); } catch { return {}; }
  });
  function dismissAlert(id) {
    setDismissed(prev => {
      const next = { ...prev, [id]: TODAY };
      try { localStorage.setItem(dismissKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }
  const visibleAlerts = alerts.filter(a => dismissed[a.id] !== TODAY);

  // ── Activity action handlers (mark done / "no hecho") ──────────────────────
  const todayDay = history[TODAY] || {};
  function handleGymDone() {
    const skipped = (todayDay.skipped || []).filter(t => t !== 'gym');
    updateDay(TODAY, { gym: !todayDay.gym, skipped });
  }
  function handleToggleSkip(type) {
    const cur = todayDay.skipped || [];
    const isSkipped = cur.includes(type);
    const patch = { skipped: isSkipped ? cur.filter(t => t !== type) : [...cur, type] };
    if (!isSkipped) {
      if (type === 'gym') patch.gym = false;
      if (type === 'indiv') patch.done = false;
    }
    updateDay(TODAY, patch);
  }

  // Day-by-day breakdown for a week row (computed on demand when expanded)
  function getWeekDayData(week) {
    const out = [];
    let d = new Date(week.startDate + 'T12:00:00');
    const end = new Date(week.endDate + 'T12:00:00');
    while (d <= end) {
      const ds = toDateStr(d);
      out.push({
        dateStr: ds,
        acts: getDayActivities(ds, schedule, history, matches, effectiveTmpl)
          .filter(a => isRelevantAct(a, actType, plan.routineIds || [])),
      });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  function toggleWeek(num) {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  }

  // ── Close form view ──────────────────────────────────────────────────────────

  if (showCloseForm) {
    return (
      <div className="page-content">
        <div className="page-header">
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={() => setShowCloseForm(false)}>
            <ChevronLeft size={18} />
          </button>
          <h1 className="page-title">{plan.name}</h1>
        </div>
        <CloseForm
          plan={plan}
          progress={progress}
          weeks={weeks}
          onClose={(rating, notes) => { onComplete(plan.id, rating, notes); onBack?.(); }}
          onCancel={() => setShowCloseForm(false)}
        />
      </div>
    );
  }

  // ── Compact week summary items ─────────────────────────────────────────────
  const summaryItems = currentWeek ? [
    (actType === 'gym' || actType === 'both') && currentWeek.gymEffTarget > 0 && {
      label: 'Gym', done: currentWeek.gym, target: currentWeek.gymEffTarget, color: '#1D3461',
    },
    (actType === 'individual' || actType === 'both') && currentWeek.indivEffTarget > 0 && {
      label: 'Individual', done: currentWeek.individual, target: currentWeek.indivEffTarget, color: '#059669',
    },
  ].filter(Boolean) : [];

  // ── Main view ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content" style={{ paddingTop: 0 }}>

      {/* ── HERO ── */}
      <div className="plan-hero">
        {onBack && (
          <button className="plan-hero-back" onClick={onBack} aria-label="Volver">
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="plan-hero-week">Semana {progress.currentWeekNum} de {progress.totalWeeks}</div>
        <div className="plan-hero-name">{plan.name}</div>
        {plan.objective && <div className="plan-hero-obj">{plan.objective}</div>}

        <div className="plan-hero-body">
          <div className="plan-hero-ring">
            <CircularProgress pct={progress.pct} size={104} strokeWidth={9} color="#FFFFFF" bg="rgba(255,255,255,0.16)" />
            <div className="plan-hero-ring-pct">
              <div style={{ fontSize: 24, fontWeight: 800, color: 'white', lineHeight: 1 }}>{progress.pct}%</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2, letterSpacing: '0.04em' }}>COMPLETADO</div>
            </div>
          </div>
          <div className="plan-hero-meta">
            <div className="plan-hero-sessions">{progress.completedSessions} / {progress.effTotal || '?'} sesiones</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <RhythmBadge onTrack={progress.isOnTrack} ahead={rhythmStatus === 'ahead'} />
              {progress.isExpired ? (
                <span className="plan-hero-chip" style={{ background: 'rgba(239,83,80,0.22)', color: '#FCA5A5' }}>Vencido</span>
              ) : progress.remainingDays > 0 && (
                <span className="plan-hero-chip" style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}>
                  Quedan {progress.remainingDays} días
                </span>
              )}
            </div>
            <div className="plan-hero-dates">{dateShort(plan.startDate)} — {dateShort(plan.endDate)} · {routineLabel()}</div>
          </div>
        </div>
      </div>

      {/* ── Alertas de urgencia ── */}
      {visibleAlerts.length > 0 && (
        <div className="plan-alerts">
          {visibleAlerts.map(a => (
            <AlertBanner key={a.id} level={a.level} text={a.text} onClose={() => dismissAlert(a.id)} />
          ))}
        </div>
      )}

      {/* ── HOY (interactivo) ── */}
      <div className="hoy-acts">
        <div className="hoy-section-label">HOY</div>
        {todayActs.length === 0 ? (
          <div className="hoy-free-day">Día de descanso. Disfrutá la recuperación 💪</div>
        ) : (
          <ActivityList
            acts={todayActs}
            routines={routines}
            history={history}
            todayKey={TODAY}
            onGymDone={handleGymDone}
            onStart={onStartToday}
            onSkip={handleToggleSkip}
            onPreview={(routineId) => setPreviewRoutineId(routineId)}
            onDelete={(type) => removeActivityFromDay(TODAY, type)}
          />
        )}
      </div>

      {/* ── Esta semana (resumen compacto) ── */}
      {summaryItems.length > 0 && (
        <>
          <div className="section-heading" style={{ marginTop: 8 }}>Esta semana</div>
          <div className="wk-summary">
            {summaryItems.map(item => {
              const pct = item.target > 0 ? Math.min(100, (item.done / item.target) * 100) : 0;
              const met = item.done >= item.target;
              return (
                <div key={item.label} className="wk-summary-chip">
                  <div className="wk-summary-chip-top">
                    <span className="wk-summary-chip-label">{item.label}</span>
                    <span className="wk-summary-chip-val" style={{ color: met ? '#059669' : item.color }}>
                      {item.done}/{item.target}
                    </span>
                  </div>
                  <div className="wk-summary-chip-bar">
                    <div className="wk-summary-chip-fill" style={{ width: `${pct}%`, background: met ? '#059669' : item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Proyección de compensación (déficit previsto) ── */}
      {compPreview && (
        <div className="comp-preview">
          <div className="comp-preview-title">Proyección para la semana que viene</div>
          {compPreview.map(row => (
            <div key={row.label} className="comp-preview-row">
              {row.label}: <strong>{row.base} base + {row.comp} compensación = {row.total} sesiones</strong>
            </div>
          ))}
        </div>
      )}

      {/* ── Estadísticas detalladas ── */}
      <div className="section-heading" style={{ marginTop: 12 }}>Estadísticas del plan</div>

      {/* Cómo vengo */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 14 }}>Cómo vengo</div>

        {actType === 'both' && progress.gymPct != null && progress.individualPct != null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#263238' }}>Gimnasio</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#78909C' }}>{progress.gymSessions}/{progress.effGymTarget} ses.</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1D3461' }}>{progress.gymPct}%</span>
                  <RhythmBadge onTrack={progress.gymOnTrack} ahead={false} />
                </div>
              </div>
              <LinearBar pct={progress.gymPct} color="#1D3461" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#263238' }}>Entrenamiento</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#78909C' }}>{progress.individualSessions}/{progress.effIndTarget} ses.</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{progress.individualPct}%</span>
                  <RhythmBadge onTrack={progress.individualOnTrack} ahead={false} />
                </div>
              </div>
              <LinearBar pct={progress.individualPct} color="#059669" />
            </div>
            <div style={{ borderTop: '1px solid #E8EDF5', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#78909C' }}>Total: {progress.completedSessions}/{progress.effTotal}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#1D3461' }}>{progress.pct}%</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <CircularProgress pct={progress.pct} size={100} strokeWidth={9} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1D3461', lineHeight: 1 }}>{progress.pct}%</div>
                <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>completado</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#263238' }}>{progress.completedSessions} / {progress.effTotal}</div>
              <div style={{ fontSize: 12, color: '#78909C', marginBottom: 8 }}>sesiones completadas</div>
              <RhythmBadge onTrack={progress.isOnTrack} ahead={rhythmStatus === 'ahead'} />
            </div>
          </div>
        )}

        {/* Racha + deuda + ritmo */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(() => {
            const pastWeeks = weeks.filter(w => !w.isFuture);
            let streak = 0;
            for (let i = pastWeeks.length - 1; i >= 0; i--) {
              if (pastWeeks[i].isCompliant) streak++;
              else break;
            }
            if (streak === 0) return null;
            return (
              <div style={{ flex: 1, minWidth: 80, background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#78909C', marginBottom: 2 }}>Racha</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1D3461' }}>{streak}</div>
                <div style={{ fontSize: 10, color: '#78909C' }}>sem. consec.</div>
              </div>
            );
          })()}

          {(gymDebt > 0 || indivDebt > 0) && (
            <div style={{ flex: 1, minWidth: 80, background: '#FEF3C7', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>Deuda</div>
              <div style={{ fontSize: 12, color: '#92400E' }}>
                {[gymDebt > 0 && `${gymDebt} gym`, indivDebt > 0 && `${indivDebt} indiv`].filter(Boolean).join(' · ')}
              </div>
            </div>
          )}

          {!progress.isExpired && progress.remainingDays > 0 && (
            <div style={{ flex: 1, minWidth: 80, background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: '#78909C', marginBottom: 2 }}>Para cerrar</div>
              <div style={{ fontSize: 12, color: '#263238', fontWeight: 600 }}>
                {actType === 'both'
                  ? `${progress.neededGymPerWeek}gym + ${progress.neededIndividualPerWeek}ind/sem`
                  : `${progress.neededPerWeek} ses/sem`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detalle de la semana ── */}
      {currentWeek && (
        <Section
          title="Detalle de la semana"
          open={!!openSections.week}
          onToggle={() => toggleSection('week')}
          badge={(currentWeek.gymCompAvail > 0 || currentWeek.indivCompAvail > 0) ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FEF3C7', color: '#92400E' }}>+comp</span>
          ) : null}
        >
          {/* Day list */}
          {thisWeekData.map(({ dateStr, acts }, idx) => {
            const d = new Date(dateStr + 'T12:00:00');
            const isToday  = dateStr === TODAY;
            const isPast   = dateStr < TODAY;
            const isLast   = idx === thisWeekData.length - 1;
            return (
              <div key={dateStr} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0',
                borderBottom: isLast ? 'none' : '0.5px solid #F1F5F9',
              }}>
                <span style={{
                  fontSize: 11, width: 46, flexShrink: 0, paddingTop: 1,
                  color: isToday ? 'var(--navy-600)' : isPast ? '#94A3B8' : '#263238',
                  fontWeight: isToday ? 700 : 400,
                }}>
                  {DAY_SHORT[d.getDay()]} {d.getDate()}{isToday ? ' ·' : ''}
                </span>
                {acts.length === 0 ? (
                  <span style={{ fontSize: 12, color: '#B0BEC5' }}>Descanso</span>
                ) : (
                  <div style={{ flex: 1 }}>
                    {acts.map((act, ai) => {
                      const icon = act.done ? '✓' : act.skipped ? '✗' : (isPast ? '—' : '○');
                      const ic = act.done ? '#059669' : act.skipped ? '#DC2626' : (isPast ? '#B0BEC5' : '#94A3B8');
                      const name = act.type === 'gym'
                        ? 'Gimnasio'
                        : (routines.find(r => r.id === act.routineId)?.name || 'Entrenamiento');
                      return (
                        <div key={ai} style={{ display: 'flex', gap: 6, marginBottom: ai < acts.length - 1 ? 2 : 0, fontSize: 12 }}>
                          <span style={{ fontWeight: 700, color: ic, width: 12, flexShrink: 0 }}>{icon}</span>
                          <span style={{ color: act.done ? '#059669' : '#263238', textDecoration: act.skipped ? 'line-through' : 'none' }}>
                            {name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </Section>
      )}

      {/* ── Próximos entrenamientos ── */}
      {upcomingActs.length > 0 && (
        <Section
          title="Próximos entrenamientos"
          open={!!openSections.upcoming}
          onToggle={() => toggleSection('upcoming')}
        >
          {upcomingActs.map(({ dateStr, act }, i) => {
            const d = new Date(dateStr + 'T12:00:00');
            const name = act.type === 'gym'
              ? 'Gimnasio'
              : (routines.find(r => r.id === act.routineId)?.name || 'Entrenamiento individual');
            const dotColor = act.type === 'gym' ? '#185FA5' : '#0F6E56';
            const isLast = i === upcomingActs.length - 1;
            return (
              <div key={`${dateStr}-${act.type}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
                borderBottom: isLast ? 'none' : '0.5px solid #F1F5F9',
              }}>
                <div style={{ width: 54, flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#263238' }}>
                    {DAY_SHORT[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#263238', fontWeight: 500 }}>{name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{act.type === 'gym' ? 'Gimnasio' : 'Individual'}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              </div>
            );
          })}
        </Section>
      )}

      {/* ── Historial del plan ── */}
      <Section
        title="Historial del plan"
        open={!!openSections.history}
        onToggle={() => toggleSection('history')}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {weeks.map((week, i) => {
            const isLast     = i === weeks.length - 1;
            const isExpanded = expandedWeeks.has(week.num);
            const canExpand  = week.isPast || week.isCurrent;
            const bg         = week.isCurrent ? '#EEF2FF' : 'transparent';
            const borderColor = week.isCurrent ? '#C7D2FE' : '#F1F5F9';
            const gymMet     = week.gym       >= week.gymEffTarget;
            const indivMet   = week.individual >= week.indivEffTarget;
            const hasDebt    = week.isPast && (week.accGymDebt > 0 || week.accIndivDebt > 0);

            return (
              <div key={week.num} style={{
                borderBottom: isLast ? 'none' : `1px solid ${borderColor}`,
                background: hasDebt ? '#FFFBEB' : bg,
                borderRadius: (week.isCurrent || hasDebt) ? 8 : 0,
                paddingLeft: (week.isCurrent || hasDebt) ? 8 : 0,
                paddingRight: (week.isCurrent || hasDebt) ? 8 : 0,
              }}>
                {/* Week summary row */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', cursor: canExpand ? 'pointer' : 'default' }}
                  onClick={() => canExpand && toggleWeek(week.num)}
                >
                  <div style={{ width: 60, flexShrink: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: week.isCurrent ? 800 : 600,
                      color: week.isCurrent ? 'var(--navy-600)' : week.isFuture ? '#B0BEC5' : '#263238',
                    }}>
                      Sem {week.num}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>
                      {dateShort(week.startDate)}–{dateShort(week.endDate)}
                    </div>
                  </div>

                  {(actType === 'gym' || actType === 'both') && week.gymEffTarget > 0 && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#78909C', marginBottom: 2 }}>
                        Gym{week.gymCompAvail > 0 && <span style={{ color: '#D97706', fontWeight: 700 }}> +{week.gymCompAvail}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: week.isFuture ? '#B0BEC5' : gymMet ? '#1D3461' : '#EF5350',
                        }}>
                          {week.isFuture ? `—/${week.gymEffTarget}` : `${week.gym}/${week.gymEffTarget}`}
                        </span>
                        {!week.isFuture && <span style={{ fontSize: 12 }}>{gymMet ? '✓' : '✗'}</span>}
                      </div>
                    </div>
                  )}

                  {(actType === 'individual' || actType === 'both') && week.indivEffTarget > 0 && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#78909C', marginBottom: 2 }}>
                        Entreno{week.indivCompAvail > 0 && <span style={{ color: '#D97706', fontWeight: 700 }}> +{week.indivCompAvail}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: week.isFuture ? '#B0BEC5' : indivMet ? '#059669' : '#EF5350',
                        }}>
                          {week.isFuture ? `—/${week.indivEffTarget}` : `${week.individual}/${week.indivEffTarget}`}
                        </span>
                        {!week.isFuture && <span style={{ fontSize: 12 }}>{indivMet ? '✓' : '✗'}</span>}
                      </div>
                    </div>
                  )}

                  {week.isPast && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: week.isCompliant ? '#059669' : '#EF5350' }} />
                  )}
                  {week.isCurrent && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--navy-600)', flexShrink: 0 }}>HOY</span>}
                  {canExpand && (
                    <span style={{ fontSize: 10, color: '#B0BEC5', flexShrink: 0 }}>{isExpanded ? '▼' : '▶'}</span>
                  )}
                </div>

                {/* Expanded day detail */}
                {isExpanded && (
                  <div style={{ paddingBottom: 10 }}>
                    {getWeekDayData(week).map(({ dateStr, acts }, di, arr) => {
                      const d       = new Date(dateStr + 'T12:00:00');
                      const isPast  = dateStr < TODAY;
                      const isToday = dateStr === TODAY;
                      const isLast  = di === arr.length - 1;
                      return (
                        <div key={dateStr} style={{
                          display: 'flex', gap: 8, padding: '5px 0',
                          borderBottom: isLast ? 'none' : '0.5px solid #F1F5F9',
                        }}>
                          <span style={{
                            fontSize: 11, width: 44, flexShrink: 0,
                            color: isToday ? 'var(--navy-600)' : isPast ? '#94A3B8' : '#263238',
                            fontWeight: isToday ? 700 : 400,
                          }}>
                            {DAY_SHORT[d.getDay()]} {d.getDate()}
                          </span>
                          {acts.length === 0 ? (
                            <span style={{ fontSize: 12, color: '#B0BEC5' }}>—</span>
                          ) : (
                            <div>
                              {acts.map((act, ai) => {
                                const icon = act.done ? '✓' : act.skipped ? '✗' : (isPast ? '—' : '○');
                                const ic   = act.done ? '#059669' : act.skipped ? '#DC2626' : (isPast ? '#B0BEC5' : '#94A3B8');
                                const name = act.type === 'gym'
                                  ? 'Gimnasio'
                                  : (routines.find(r => r.id === act.routineId)?.name || 'Entrenamiento');
                                return (
                                  <div key={ai} style={{ display: 'flex', gap: 5, fontSize: 12, color: '#263238', marginBottom: 1 }}>
                                    <span style={{ fontWeight: 700, color: ic, width: 12, flexShrink: 0 }}>{icon}</span>
                                    <span style={{ textDecoration: act.skipped ? 'line-through' : 'none' }}>{name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Configuración del plan ── */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 12 }}>Configuración del plan</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {onEdit && (
            <button className="btn btn-secondary btn-full" onClick={() => onEdit(plan)}>
              Editar plan
            </button>
          )}
          <button
            className="btn btn-primary btn-full"
            style={{ background: '#059669', borderColor: '#059669' }}
            onClick={() => setShowCloseForm(true)}
          >
            Cerrar este plan
          </button>
        </div>
      </div>

      {previewRoutineId && (
        <RoutinePreviewModal
          routine={routines.find(r => r.id === previewRoutineId)}
          exerciseMap={exerciseMap}
          catalog={catalog}
          catLinks={catLinks}
          onClose={() => setPreviewRoutineId(null)}
        />
      )}

    </div>
  );
}
