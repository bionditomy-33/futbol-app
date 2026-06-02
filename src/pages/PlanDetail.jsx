import { useState } from 'react';
import { getPlanProgress, getPlanWeeks, computePlanWeeklyLog } from '../store/useStore';
import { formatDate } from '../utils/dates';
import { ChevronLeft, CheckCircleIcon } from '../components/Icons';

// ─── Helpers locales ──────────────────────────────────────────────────────────

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

      {/* Resumen general */}
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

      {/* Semanas */}
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

      {/* Autoevaluación */}
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

      {/* Notas */}
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlanDetail({ plan, history, routines, onBack, onComplete }) {
  const [showCloseForm, setShowCloseForm] = useState(false);

  const progress = getPlanProgress(plan, history);
  const weeks = computePlanWeeklyLog(plan, history);
  const actType = plan.activityType || 'individual';

  const routineLabel = () => {
    if (actType === 'gym') return 'Gimnasio';
    if (actType === 'both') return 'Individual + Gimnasio';
    if (!plan.routineIds?.length) return 'Todas las rutinas';
    return plan.routineIds.map(id => routines.find(r => r.id === id)?.name).filter(Boolean).join(', ') || 'Rutinas eliminadas';
  };

  const rhythmStatus = progress.isOnTrack
    ? (progress.completedSessions > (progress.effTotal * (progress.currentWeekNum / progress.totalWeeks)) + 0.5 ? 'ahead' : 'ontrack')
    : 'behind';

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
          onClose={(rating, notes) => { onComplete(plan.id, rating, notes); onBack(); }}
          onCancel={() => setShowCloseForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div className="page-header">
        <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <h1 className="page-title" style={{ flex: 1 }}>{plan.name}</h1>
      </div>

      {/* ── Info del plan ── */}
      <div className="card" style={{ background: '#0A1628', color: 'white', marginBottom: 0 }}>
        {plan.objective && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 10, lineHeight: 1.4 }}>
            {plan.objective}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
            background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)',
          }}>
            Semana {progress.currentWeekNum} de {progress.totalWeeks}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            {dateShort(plan.startDate)} — {dateShort(plan.endDate)}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
          {routineLabel()}
        </div>
      </div>

      {/* ── Progreso general ── */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 14 }}>Progreso general</div>

        {actType === 'both' && progress.gymPct != null && progress.individualPct != null ? (
          // Dual bars para "ambos"
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#263238' }}>Gimnasio</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#78909C' }}>
                    {progress.gymSessions}/{progress.effGymTarget} ses.
                  </span>
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
                  <span style={{ fontSize: 12, color: '#78909C' }}>
                    {progress.individualSessions}/{progress.effIndTarget} ses.
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>{progress.individualPct}%</span>
                  <RhythmBadge onTrack={progress.individualOnTrack} ahead={false} />
                </div>
              </div>
              <LinearBar pct={progress.individualPct} color="#059669" />
            </div>
            <div style={{ borderTop: '1px solid #E8EDF5', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#78909C' }}>Total: {progress.completedSessions}/{progress.effTotal}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#1D3461' }}>{progress.pct}%</span>
            </div>
          </div>
        ) : (
          // Circular para tipo único
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <CircularProgress pct={progress.pct} size={120} strokeWidth={10} />
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)', textAlign: 'center',
              }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#1D3461', lineHeight: 1 }}>{progress.pct}%</div>
                <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>completado</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#263238' }}>
                {progress.completedSessions} / {progress.effTotal}
              </div>
              <div style={{ fontSize: 12, color: '#78909C', marginBottom: 10 }}>sesiones completadas</div>
              <RhythmBadge onTrack={progress.isOnTrack} ahead={rhythmStatus === 'ahead'} />
            </div>
          </div>
        )}
      </div>

      {/* ── Grilla semanal ── */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 12 }}>Semana a semana</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {weeks.map((week, i) => {
            const isLast = i === weeks.length - 1;
            const bg = week.isCurrent ? '#EEF2FF' : 'transparent';
            const borderColor = week.isCurrent ? '#C7D2FE' : '#F1F5F9';
            const hasGymComp   = week.gymCompAvail   > 0;
            const hasIndivComp = week.indivCompAvail > 0;
            const gymMet   = week.gym       >= week.gymEffTarget;
            const indivMet = week.individual >= week.indivEffTarget;

            return (
              <div key={week.num} style={{
                padding: '9px 0',
                borderBottom: isLast ? 'none' : `1px solid ${borderColor}`,
                background: bg,
                borderRadius: week.isCurrent ? 8 : 0,
                paddingLeft: week.isCurrent ? 8 : 0,
                paddingRight: week.isCurrent ? 8 : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Week number + dates */}
                  <div style={{ width: 60, flexShrink: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: week.isCurrent ? 800 : 600,
                      color: week.isCurrent ? '#3730A3' : week.isFuture ? '#B0BEC5' : '#263238',
                    }}>
                      Sem {week.num}
                    </div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>
                      {dateShort(week.startDate)}–{dateShort(week.endDate)}
                    </div>
                  </div>

                  {/* Gym column */}
                  {(actType === 'gym' || actType === 'both') && week.gymEffTarget > 0 && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#78909C', marginBottom: 2 }}>
                        Gym{hasGymComp && <span style={{ color: '#D97706', fontWeight: 700 }}> +{week.gymCompAvail}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: week.isFuture ? '#B0BEC5' : gymMet ? '#1D3461' : '#EF5350',
                        }}>
                          {week.isFuture ? `—/${week.gymEffTarget}` : `${week.gym}/${week.gymEffTarget}`}
                        </span>
                        {!week.isFuture && (
                          <span style={{ fontSize: 12 }}>{gymMet ? '✓' : '✗'}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Individual column */}
                  {(actType === 'individual' || actType === 'both') && week.indivEffTarget > 0 && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: '#78909C', marginBottom: 2 }}>
                        Entreno{hasIndivComp && <span style={{ color: '#D97706', fontWeight: 700 }}> +{week.indivCompAvail}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: week.isFuture ? '#B0BEC5' : indivMet ? '#059669' : '#EF5350',
                        }}>
                          {week.isFuture ? `—/${week.indivEffTarget}` : `${week.individual}/${week.indivEffTarget}`}
                        </span>
                        {!week.isFuture && (
                          <span style={{ fontSize: 12 }}>{indivMet ? '✓' : '✗'}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status dot for past weeks */}
                  {week.isPast && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: week.isCompliant ? '#059669' : '#EF5350',
                    }} />
                  )}
                  {week.isCurrent && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#3730A3', flexShrink: 0 }}>HOY</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Deuda acumulada + Esta semana */}
        {(() => {
          const lastPast = [...weeks].reverse().find(w => w.isPast);
          const gymDebt   = lastPast?.accGymDebt   || 0;
          const indivDebt = lastPast?.accIndivDebt || 0;
          const curWeek   = weeks.find(w => w.isCurrent);
          const gymComp   = curWeek?.gymCompAvail   || 0;
          const indivComp = curWeek?.indivCompAvail || 0;
          if (!gymDebt && !indivDebt && !gymComp && !indivComp) return null;
          return (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#FEF3C7', borderRadius: 8 }}>
              {(gymDebt > 0 || indivDebt > 0) && (
                <div style={{ fontSize: 12, color: '#92400E', fontWeight: 600, marginBottom: (gymComp > 0 || indivComp > 0) ? 6 : 0 }}>
                  Deuda actual:{' '}
                  {[
                    gymDebt   > 0 && `${gymDebt} gym`,
                    indivDebt > 0 && `${indivDebt} individual`,
                  ].filter(Boolean).join(' · ')}
                </div>
              )}
              {curWeek && (gymComp > 0 || indivComp > 0) && (
                <div style={{ fontSize: 12, color: '#92400E' }}>
                  Esta semana:{' '}
                  {[
                    (actType === 'gym' || actType === 'both') && gymComp > 0 &&
                      `${curWeek.gymEffTarget} gym (${curWeek.gymEffTarget - gymComp} base + ${gymComp} comp)`,
                    (actType === 'individual' || actType === 'both') && indivComp > 0 &&
                      `${curWeek.indivEffTarget} individual (${curWeek.indivEffTarget - indivComp} base + ${indivComp} comp)`,
                  ].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── Racha ── */}
      {(() => {
        const pastWeeks = weeks.filter(w => !w.isFuture);
        let streak = 0, best = 0, cur = 0;
        for (const w of pastWeeks) {
          if (w.isCompliant) { cur++; best = Math.max(best, cur); }
          else cur = 0;
        }
        // Current streak from the end
        for (let i = pastWeeks.length - 1; i >= 0; i--) {
          if (pastWeeks[i].isCompliant) streak++;
          else break;
        }
        if (best === 0) return null;
        return (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 8 }}>Racha</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1D3461' }}>{streak}</div>
                <div style={{ fontSize: 11, color: '#78909C' }}>semanas consecutivas</div>
              </div>
              {best > streak && (
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#78909C' }}>{best}</div>
                  <div style={{ fontSize: 11, color: '#78909C' }}>mejor racha</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Ritmo ── */}
      {!progress.isExpired && progress.remainingDays > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 13, color: '#263238', marginBottom: 8 }}>Para cerrar el plan</div>
          <div style={{ fontSize: 13, color: '#263238', marginBottom: 4 }}>
            Necesitás <strong>{Math.max(0, progress.effTotal - progress.completedSessions)}</strong> sesiones más
            en <strong>{Math.ceil(progress.remainingDays / 7)}</strong> semanas
          </div>
          {actType === 'both' ? (
            <div style={{ fontSize: 12, color: '#78909C' }}>
              Gym: <strong style={{ color: '#1D3461' }}>{progress.neededGymPerWeek}/sem</strong>
              {' + '}
              Entreno: <strong style={{ color: '#059669' }}>{progress.neededIndividualPerWeek}/sem</strong>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#78909C' }}>
              <strong style={{ color: progress.isOnTrack ? '#059669' : '#EF5350' }}>{progress.neededPerWeek} sesiones/semana</strong>
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <RhythmBadge onTrack={progress.isOnTrack} ahead={rhythmStatus === 'ahead'} />
          </div>
        </div>
      )}

      {/* ── Botón cerrar plan ── */}
      <div style={{ padding: '4px 0 8px' }}>
        <button
          className="btn btn-primary btn-full"
          style={{ background: '#059669', borderColor: '#059669' }}
          onClick={() => setShowCloseForm(true)}
        >
          Cerrar este plan
        </button>
      </div>
    </div>
  );
}
