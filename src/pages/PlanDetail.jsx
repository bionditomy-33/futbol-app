import { useState, useMemo } from 'react';
import { getPlanProgress, computePlanWeeklyLog, useStore } from '../store/useStore';
import { toDateStr, todayStr } from '../utils/dates';
import { getDayActivities } from '../utils/activities';
import { ChevronLeft, CheckCircleIcon } from '../components/Icons';

const TODAY = todayStr();
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function dateShort(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d}/${m}`;
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

export default function PlanDetail({ plan, history, routines, onBack, onComplete, onEdit }) {
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState(() => new Set());

  const { schedule, matches, weekTemplate, weekTemplates } = useStore();

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

  // ── Main view ────────────────────────────────────────────────────────────────

  return (
    <div className="page-content">

      {/* ── Header ── */}
      <div className="page-header">
        {onBack && (
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <h1 className="page-title" style={{ flex: 1 }}>{plan.name}</h1>
      </div>

      {/* ── Plan card (dark) ── */}
      <div className="card" style={{ background: '#0A1628', color: 'white', marginBottom: 0 }}>
        {plan.objective && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 10, lineHeight: 1.4 }}>
            {plan.objective}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
            background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)',
          }}>
            Semana {progress.currentWeekNum} de {progress.totalWeeks}
          </span>
          {!progress.isExpired && progress.remainingDays > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)',
            }}>
              Quedan {progress.remainingDays} días
            </span>
          )}
          {progress.isExpired && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
              background: 'rgba(239,83,80,0.2)', color: '#FCA5A5',
            }}>
              Vencido
            </span>
          )}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
            {dateShort(plan.startDate)} — {dateShort(plan.endDate)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>{routineLabel()}</div>
        {/* Large progress bar */}
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99, background: 'white',
            width: `${progress.pct}%`, transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
            {progress.completedSessions} / {progress.effTotal || '?'} sesiones
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>{progress.pct}%</span>
        </div>
      </div>

      {/* ── Cómo vengo ── */}
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

      {/* ── Esta semana ── */}
      {currentWeek && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#263238' }}>Esta semana</div>
            {(currentWeek.gymCompAvail > 0 || currentWeek.indivCompAvail > 0) && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FEF3C7', color: '#92400E' }}>
                +comp
              </span>
            )}
          </div>

          {/* Objetivo + progreso */}
          <div style={{ fontSize: 12, color: '#78909C', marginBottom: 4 }}>
            Objetivo:{' '}
            {[
              (actType === 'gym' || actType === 'both') && currentWeek.gymEffTarget > 0 &&
                `${currentWeek.gymEffTarget} gym${currentWeek.gymCompAvail > 0 ? ` (${currentWeek.gymEffTarget - currentWeek.gymCompAvail}+${currentWeek.gymCompAvail})` : ''}`,
              (actType === 'individual' || actType === 'both') && currentWeek.indivEffTarget > 0 &&
                `${currentWeek.indivEffTarget} individual${currentWeek.indivCompAvail > 0 ? ` (${currentWeek.indivEffTarget - currentWeek.indivCompAvail}+${currentWeek.indivCompAvail})` : ''}`,
            ].filter(Boolean).join(' · ')}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#263238', marginBottom: 12 }}>
            Completado:{' '}
            {[
              (actType === 'gym' || actType === 'both') && currentWeek.gymEffTarget > 0 && `${currentWeek.gym}/${currentWeek.gymEffTarget} gym`,
              (actType === 'individual' || actType === 'both') && currentWeek.indivEffTarget > 0 && `${currentWeek.individual}/${currentWeek.indivEffTarget} entreno`,
            ].filter(Boolean).join(' · ')}
          </div>

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
        </div>
      )}

      {/* ── Próximos entrenamientos ── */}
      {upcomingActs.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 12 }}>Próximos entrenamientos</div>
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
        </div>
      )}

      {/* ── Historial del plan ── */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 12 }}>Historial del plan</div>
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
      </div>

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

    </div>
  );
}
