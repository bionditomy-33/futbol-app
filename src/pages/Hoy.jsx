import { useMemo, useState } from 'react';
import { useStore, getPlanProgress } from '../store/useStore';
import { todayStr, toDateStr, getWeekDays } from '../utils/dates';
import { getDayActivities } from '../utils/activities';
import { ACT_COLORS } from '../utils/colors';
import { PlayIcon, XIcon } from '../components/Icons';

const TODAY = todayStr();
const TOMORROW = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateStr(d);
})();

const MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];
const DAY_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const ACT_LABEL = { gym: 'Gym', indiv: 'Individual', arsenal: 'Arsenal', match: 'Partido' };

function getEffectiveTmpl(dateStr, plans, weekTemplates, defaultDays) {
  const plan = (plans || []).find(p =>
    p.status !== 'completed' && p.weekTemplateId && p.startDate <= dateStr && p.endDate >= dateStr
  );
  if (plan) {
    const tmpl = (weekTemplates || []).find(t => t.id === plan.weekTemplateId);
    if (tmpl) return tmpl.days;
  }
  return defaultDays;
}

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function GapIndicator({ gapMins }) {
  const hrs = (gapMins / 60).toFixed(1).replace('.0', '');
  return (
    <div className="hoy-gap">
      <div className="hoy-gap-line" />
      <span className="hoy-gap-label">~{hrs} hs</span>
    </div>
  );
}

function PlanBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#1A2332' }}>{value}/{max}</span>
      </div>
      <div style={{ height: 4, background: '#E8ECEB', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

function GymCard({ act, onToggle }) {
  const c = ACT_COLORS.gym;
  return (
    <div className="hoy-card" style={{ background: c.bg }}>
      <div className="hoy-card-time">{act.time}</div>
      <div className="hoy-card-body">
        <div className="hoy-card-title" style={{ color: c.title }}>Gimnasio</div>
        <button
          className="hoy-gym-toggle"
          style={{
            borderColor: c.sub,
            color: act.done ? 'white' : c.sub,
            background: act.done ? c.sub : 'transparent',
          }}
          onClick={onToggle}
        >
          {act.done ? '✓ Hecho' : 'Marcar hecho'}
        </button>
      </div>
    </div>
  );
}

function IndivCard({ act, routines, history, onStart }) {
  const c = ACT_COLORS.indiv;
  const r = routines.find(r => r.id === act.routineId);
  const title = r ? r.name : 'Entrenamiento individual';
  const sub = r
    ? [r.phases?.length > 0 ? `${r.phases.length} fases` : '', r.duration ? `~${r.duration}` : ''].filter(Boolean).join(' · ')
    : '';
  const exIds = r ? new Set(r.phases?.flatMap(p => p.exercises?.map(e => e.ref) || []) || []) : new Set();
  const totalEx = exIds.size;
  const doneEx = Object.entries(history[TODAY]?.completed || {}).filter(([id, done]) => done && exIds.has(id)).length;
  const started = doneEx > 0;

  return (
    <div className="hoy-card" style={{ background: c.bg }}>
      <div className="hoy-card-time">{act.time}</div>
      <div className="hoy-card-body">
        <div className="hoy-card-title" style={{ color: c.title }}>{title}</div>
        {sub && <div className="hoy-card-sub" style={{ color: c.sub }}>{sub}</div>}
        {totalEx > 0 && (
          <div className="hoy-progress">
            <div className="hoy-progress-fill" style={{ width: `${(doneEx / totalEx) * 100}%`, background: c.sub }} />
          </div>
        )}
        {act.done ? (
          <div className="hoy-done-badge" style={{ color: c.sub }}>
            ✓ Completado{totalEx > 0 ? ` · ${doneEx}/${totalEx}` : ''}
          </div>
        ) : (
          <button className="hoy-start-btn" style={{ background: c.sub }} onClick={onStart}>
            {started ? 'Continuar' : 'Empezar'}
          </button>
        )}
      </div>
    </div>
  );
}

function ArsenalCard({ act }) {
  const c = ACT_COLORS.arsenal;
  return (
    <div className="hoy-card" style={{ background: c.bg }}>
      <div className="hoy-card-time">{act.time}</div>
      <div className="hoy-card-body">
        <div className="hoy-card-title" style={{ color: c.title }}>Arsenal — Entrenamiento</div>
      </div>
    </div>
  );
}

function MatchCard({ act }) {
  const c = ACT_COLORS.match;
  const label = act.match?.competition || 'Partido';
  const opponent = act.match?.opponent ? `vs ${act.match.opponent}` : '';
  return (
    <div className="hoy-card" style={{ background: c.bg }}>
      <div className="hoy-card-time">{act.time}</div>
      <div className="hoy-card-body">
        <div className="hoy-card-title" style={{ color: c.title }}>{label}</div>
        {opponent && <div className="hoy-card-sub" style={{ color: c.sub }}>{opponent}</div>}
      </div>
    </div>
  );
}

const PHASE_COLORS = ['#1D3461', '#059669', '#D97706', '#475569'];

function RoutinePreviewModal({ routine, exerciseMap, onClose }) {
  if (!routine) return null;
  const totalEx = routine.phases.reduce((s, p) => s + p.exercises.length, 0);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '20px 20px 28px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', lineHeight: 1.2 }}>{routine.name}</div>
            <div style={{ fontSize: 12, color: '#78909C', marginTop: 3 }}>{routine.duration} · {totalEx} ejercicios</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, lineHeight: 0 }}
          >
            <XIcon size={18} />
          </button>
        </div>
        {routine.phases.map((phase, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: PHASE_COLORS[i] || '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {phase.phase}
            </div>
            {phase.exercises.map((ex, ei) => {
              const info = exerciseMap[ex.ref];
              if (!info) return null;
              return (
                <div key={ei} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid #F1F5F4' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: '#263238', fontWeight: 500 }}>{info.name}</div>
                    {(ex.series || ex.reps) && (
                      <div style={{ fontSize: 12, color: '#78909C', marginTop: 1 }}>
                        {ex.series ? `${ex.series}s` : ''}{ex.series && ex.reps ? ' · ' : ''}{ex.reps || ''}
                      </div>
                    )}
                  </div>
                  {info.link && (
                    <a href={info.link} target="_blank" rel="noopener noreferrer" className="video-btn" onClick={e => e.stopPropagation()}>
                      <PlayIcon size={9} /> Video
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityCard({ act, routines, history, onGym, onIndiv }) {
  if (act.type === 'gym')    return <GymCard    act={act} onToggle={onGym} />;
  if (act.type === 'indiv')  return <IndivCard  act={act} routines={routines} history={history} onStart={onIndiv} />;
  if (act.type === 'arsenal') return <ArsenalCard act={act} />;
  if (act.type === 'match')  return <MatchCard  act={act} />;
  return null;
}

export default function Hoy({ onGoToDesafios, onGoToEntreno }) {
  const { routines, schedule, history, matches, weekTemplate, weekTemplates, plans, applyWeekTemplate, updateDay, exerciseMap } = useStore();
  const [templateSuggestionDismissed, setTemplateSuggestionDismissed] = useState(false);
  const [previewRoutineId, setPreviewRoutineId] = useState(null);

  const weekDateStrs = useMemo(() => getWeekDays(new Date()).map(d => toDateStr(d)), []);

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date(TODAY + 'T12:00:00');
    for (let i = 0; i < 60; i++) {
      const ds = toDateStr(d);
      if (history[ds]?.done) s++;
      else if (ds <= TODAY) break;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [history]);

  const weekStats = useMemo(() => {
    const done = weekDateStrs.filter(d => history[d]?.done).length;
    const planned = weekDateStrs.filter(ds => {
      if (schedule[ds]) return true;
      const dow = new Date(ds + 'T12:00:00').getDay();
      return !!weekTemplate?.[dow]?.routineId;
    }).length;
    return { done, planned };
  }, [weekDateStrs, schedule, history, weekTemplate]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    const todayDay = parseInt(TODAY.split('-')[2]);
    let planned = 0, done = 0;
    for (let d = 1; d <= todayDay; d++) {
      const ds = `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (schedule[ds]) planned++;
      if (history[ds]?.done) done++;
    }
    return planned > 0 ? Math.round((done / planned) * 100) : 0;
  }, [schedule, history]);

  const activePlan = useMemo(
    () => plans.find(p => p.status !== 'completed' && TODAY >= p.startDate),
    [plans]
  );

  const planData = useMemo(() => {
    if (!activePlan) return null;
    const prog = getPlanProgress(activePlan, history);
    const gymFreq = activePlan.gymWeeklyFrequency || 0;
    const indFreq = activePlan.individualWeeklyFrequency || 0;
    const weekTarget = gymFreq + indFreq || 1;
    const weekDone = weekDateStrs.reduce((acc, ds) => {
      const day = history[ds];
      if (!day) return acc;
      const { activityType = 'individual', routineIds = [], startDate, endDate } = activePlan;
      if (ds < startDate || ds > endDate) return acc;
      let n = 0;
      if ((activityType === 'gym' || activityType === 'both') && day.gym) n++;
      if ((activityType === 'individual' || activityType === 'both') && day.done
        && (routineIds.length === 0 || routineIds.includes(day.routineId))) n++;
      return acc + n;
    }, 0);
    return { prog, weekTarget, weekDone };
  }, [activePlan, history, weekDateStrs]);

  const todayActs = useMemo(() => {
    const effTmpl = getEffectiveTmpl(TODAY, plans, weekTemplates, weekTemplate);
    return getDayActivities(TODAY, schedule, history, matches, effTmpl);
  }, [schedule, history, matches, weekTemplate, weekTemplates, plans]);

  const tomorrowActs = useMemo(() => {
    const effTmpl = getEffectiveTmpl(TOMORROW, plans, weekTemplates, weekTemplate);
    return getDayActivities(TOMORROW, schedule, history, matches, effTmpl);
  }, [schedule, history, matches, weekTemplate, weekTemplates, plans]);

  const todayDate   = new Date(TODAY    + 'T12:00:00');
  const tomorrowDate = new Date(TOMORROW + 'T12:00:00');
  const headerDate   = `${DAY_FULL[todayDate.getDay()]} ${todayDate.getDate()} de ${MONTHS[todayDate.getMonth()]}`;
  const tomorrowLabel = `${DAY_FULL[tomorrowDate.getDay()]} ${tomorrowDate.getDate()}`;

  // Template suggestion for plan start day
  const templateSuggestion = (() => {
    if (templateSuggestionDismissed) return null;
    const plan = plans.find(p => p.status !== 'completed' && p.weekTemplateId && TODAY === p.startDate);
    if (!plan) return null;
    const tmpl = weekTemplates.find(t => t.id === plan.weekTemplateId);
    if (!tmpl) return null;
    return { plan, tmpl };
  })();

  function applyPlanTemplate(plan, tmpl) {
    const d = new Date(plan.startDate + 'T12:00:00');
    const end = new Date(plan.endDate + 'T12:00:00');
    const dates = [];
    while (d <= end) { dates.push(toDateStr(d)); d.setDate(d.getDate() + 1); }
    applyWeekTemplate(dates, tmpl.days);
    setTemplateSuggestionDismissed(true);
  }

  return (
    <div className="page-content">

      {/* ── Header ── */}
      <div className="hoy-header">
        <div className="hoy-header-date">{headerDate}</div>
        <div className="hoy-header-day">Buen día, Tomás</div>
      </div>

      {/* ── Tu día ── */}
      <div className="hoy-acts">
        <div className="hoy-section-label">TU DÍA</div>
        {todayActs.length === 0 ? (
          <div className="hoy-free-day">Día libre</div>
        ) : (
          todayActs.map((act, i) => {
            const prev = todayActs[i - 1];
            const gapMins = prev ? timeToMins(act.time) - timeToMins(prev.time) : 0;
            return (
              <div key={i}>
                {gapMins > 120 && <GapIndicator gapMins={gapMins} />}
                <ActivityCard
                  act={act}
                  routines={routines}
                  history={history}
                  onGym={() => updateDay(TODAY, { gym: !act.done })}
                  onIndiv={onGoToEntreno}
                />
              </div>
            );
          })
        )}
      </div>

      {/* ── Template suggestion ── */}
      {templateSuggestion && (
        <div style={{ margin: '0 16px 12px', padding: '12px 14px', background: '#EEF4FF', borderRadius: 10, border: '1px solid #C7D7F5' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1D3461', marginBottom: 6 }}>
            "{templateSuggestion.plan.name}" comienza hoy
          </div>
          <div style={{ fontSize: 12, color: '#334155', marginBottom: 10 }}>
            ¿Aplicar la semana tipo <strong>{templateSuggestion.tmpl.name}</strong> al período del plan?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTemplateSuggestionDismissed(true)}
              style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #C7D7F5', background: 'white', fontSize: 12, color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Luego
            </button>
            <button
              onClick={() => applyPlanTemplate(templateSuggestion.plan, templateSuggestion.tmpl)}
              style={{ flex: 2, padding: '7px', borderRadius: 8, border: 'none', background: '#1D3461', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Aplicar al plan
            </button>
          </div>
        </div>
      )}

      {/* ── Mañana ── */}
      <div style={{ padding: '0 16px 12px' }}>
        <div className="hoy-section-label">MAÑANA — {tomorrowLabel}</div>
        {tomorrowActs.length === 0 ? (
          <div className="hoy-free-day">Descanso</div>
        ) : (
          <div className="hoy-tomorrow">
            {tomorrowActs.map((act, i) => {
              const c = ACT_COLORS[act.type];
              const clickable = act.type === 'indiv' && act.routineId;
              return (
                <div
                  key={i}
                  className="hoy-tomorrow-chip"
                  style={{ background: c.bg, cursor: clickable ? 'pointer' : 'default' }}
                  onClick={clickable ? () => setPreviewRoutineId(act.routineId) : undefined}
                >
                  <span className="hoy-tomorrow-chip-time" style={{ color: c.sub }}>{act.time}</span>
                  <span style={{ color: c.title, fontWeight: 600, fontSize: 12 }}>{ACT_LABEL[act.type]}</span>
                  {clickable && <span style={{ fontSize: 10, color: c.sub, marginLeft: 2 }}>›</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div style={{ padding: '0 16px 12px' }}>
        <div className="hoy-section-label">ESTADÍSTICAS</div>
        <div className="metrics-row" style={{ padding: 0 }}>
          {[
            { label: 'RACHA',  value: streak },
            { label: 'SEMANA', value: `${weekStats.done}/${weekStats.planned}` },
            { label: 'MES',    value: `${monthStats}%` },
          ].map(s => (
            <div key={s.label} className="metric-card">
              <div className="metric-value">{s.value}</div>
              <div className="metric-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan activo ── */}
      {activePlan && planData && (
        <div style={{ padding: '0 16px 24px' }}>
          <div className="hoy-section-label">PLAN ACTIVO</div>
          <div
            style={{ background: 'white', border: '0.5px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', cursor: onGoToDesafios ? 'pointer' : 'default' }}
            onClick={onGoToDesafios}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1A2332' }}>{activePlan.name}</span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>
                Sem {planData.prog.currentWeekNum}/{planData.prog.totalWeeks}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <PlanBar label="Sesiones" value={planData.prog.completedSessions} max={planData.prog.effTotal || 1} color="#0F6E56" />
              <PlanBar label="Semana" value={planData.weekDone} max={planData.weekTarget} color="#185FA5" />
            </div>
          </div>
        </div>
      )}

      {previewRoutineId && (
        <RoutinePreviewModal
          routine={routines.find(r => r.id === previewRoutineId)}
          exerciseMap={exerciseMap}
          onClose={() => setPreviewRoutineId(null)}
        />
      )}

    </div>
  );
}
