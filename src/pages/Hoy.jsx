import { useMemo, useState } from 'react';
import { useStore, getPlanProgress } from '../store/useStore';
import { toDateStr, addDays, getWeekDays } from '../utils/dates';
import { getDayActivities, getEffectiveTemplateDays as getEffectiveTmpl, buildGymTogglePatch, buildToggleSkipPatch } from '../utils/activities';
import { ACT_COLORS } from '../utils/colors';
import { FireIcon } from '../components/Icons';
import { ActivityList, RoutinePreviewModal } from '../components/DayActivities';
import ExcuseModal from '../components/ExcuseModal';
import { useToday } from '../hooks/useToday';

const MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];
const DAY_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const ACT_LABEL = { gym: 'Gym', indiv: 'Individual', arsenal: 'Arsenal', match: 'Partido' };

function PlanBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{value}/{max}</span>
      </div>
      <div style={{ height: 4, background: 'var(--divider)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

export default function Hoy({ onGoToDesafios, onGoToEntreno }) {
  const { routines, schedule, history, matches, weekTemplate, weekTemplates, plans, applyWeekTemplate, markPlanAutoApplied, updateDay, setDayExcused, removeActivityFromDay, exerciseMap, catalog, catLinks } = useStore();
  const [templateSuggestionDismissed, setTemplateSuggestionDismissed] = useState(false);
  const [previewRoutineId, setPreviewRoutineId] = useState(null);
  const [excuseType, setExcuseType] = useState(null); // tipo de actividad a justificar

  const TODAY = useToday();
  const TOMORROW = addDays(TODAY, 1);

  const weekDateStrs = useMemo(
    () => getWeekDays(new Date(TODAY + 'T12:00:00')).map(d => toDateStr(d)),
    [TODAY]
  );

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date(TODAY + 'T12:00:00');
    for (let i = 0; i < 60; i++) {
      const ds = toDateStr(d);
      if (history[ds]?.done) s++;
      else if (history[ds]?.excused?.activities?.length) { /* día justificado: no suma ni corta */ }
      else if (ds < TODAY) break; // hoy pendiente no corta la racha
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [history, TODAY]);

  // Día con entrenamiento individual (mismo criterio que las cards: template
  // efectivo del plan, respeta actividades eliminadas y días limpiados)
  const indivOfDay = (ds) => {
    const effTmpl = getEffectiveTmpl(ds, plans, weekTemplates, weekTemplate);
    return getDayActivities(ds, schedule, history, matches, effTmpl).find(a => a.type === 'indiv');
  };

  const weekStats = useMemo(() => {
    let done = 0, planned = 0;
    weekDateStrs.forEach(ds => {
      const indiv = indivOfDay(ds);
      // Los días justificados no cuentan como planificados (no penalizan el ratio)
      if (indiv && !indiv.excused) { planned++; if (indiv.done) done++; }
    });
    return { done, planned };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDateStrs, schedule, history, matches, weekTemplate, weekTemplates, plans]);

  const monthStats = useMemo(() => {
    const [yr, mo, todayDay] = TODAY.split('-').map(Number);
    let planned = 0, done = 0;
    for (let d = 1; d <= todayDay; d++) {
      const ds = `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const indiv = indivOfDay(ds);
      if (indiv && !indiv.excused) { planned++; if (indiv.done) done++; }
    }
    return planned > 0 ? Math.round((done / planned) * 100) : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, history, matches, weekTemplate, weekTemplates, plans, TODAY]);

  const activePlan = useMemo(
    () => plans.find(p => p.status !== 'completed' && TODAY >= p.startDate && TODAY <= p.endDate),
    [plans, TODAY]
  );

  const planData = useMemo(() => {
    if (!activePlan) return null;
    const prog = getPlanProgress(activePlan, history);
    const gymFreq = activePlan.gymWeeklyFrequency || 0;
    const indFreq = activePlan.individualWeeklyFrequency || 0;
    const { activityType = 'individual', routineIds = [], startDate, endDate } = activePlan;
    const wantsGym = activityType === 'gym' || activityType === 'both';
    const wantsInd = activityType === 'individual' || activityType === 'both';
    let weekExcused = 0;
    const weekDone = weekDateStrs.reduce((acc, ds) => {
      const day = history[ds];
      if (!day || ds < startDate || ds > endDate) return acc;
      let n = 0;
      if (wantsGym && day.gym) n++;
      if (wantsInd && day.done
        && (routineIds.length === 0 || routineIds.includes(day.routineId))) n++;
      const exc = day.excused?.activities;
      if (exc?.length) {
        if (wantsGym && exc.includes('gym') && !day.gym) weekExcused++;
        if (wantsInd && exc.includes('indiv') && !day.done) weekExcused++;
      }
      return acc + n;
    }, 0);
    // Las sesiones justificadas se descuentan del objetivo semanal (no penalizan)
    const weekTarget = Math.max(1, (gymFreq + indFreq) - weekExcused);
    return { prog, weekTarget, weekDone };
  }, [activePlan, history, weekDateStrs]);

  const todayActs = useMemo(() => {
    const effTmpl = getEffectiveTmpl(TODAY, plans, weekTemplates, weekTemplate);
    return getDayActivities(TODAY, schedule, history, matches, effTmpl);
  }, [schedule, history, matches, weekTemplate, weekTemplates, plans, TODAY]);

  const tomorrowActs = useMemo(() => {
    const effTmpl = getEffectiveTmpl(TOMORROW, plans, weekTemplates, weekTemplate);
    return getDayActivities(TOMORROW, schedule, history, matches, effTmpl);
  }, [schedule, history, matches, weekTemplate, weekTemplates, plans, TOMORROW]);

  const todayDate    = new Date(TODAY    + 'T12:00:00');
  const tomorrowDate = new Date(TOMORROW + 'T12:00:00');
  const headerDate   = `${DAY_FULL[todayDate.getDay()]} ${todayDate.getDate()} de ${MONTHS[todayDate.getMonth()]}`;
  const tomorrowLabel = `${DAY_FULL[tomorrowDate.getDay()]} ${tomorrowDate.getDate()}`;

  // ── Activity action handlers (mark done / "no hecho") ──────────────────────
  const todayDay = history[TODAY] || {};
  const handleGymDone = () => updateDay(TODAY, buildGymTogglePatch(todayDay));
  const handleIndivDone = (act) => updateDay(TODAY, {
    done: true,
    routineId: act.routineId || todayDay.routineId || null,
    skipped: (todayDay.skipped || []).filter(t => t !== 'indiv'),
  });
  const handleToggleSkip = (type) => updateDay(TODAY, buildToggleSkipPatch(todayDay, type));

  // Excepción: si ya está justificada, la quita; si no, abre el modal de motivo
  const handleExcuse = (type) => {
    const exc = todayDay.excused?.activities || [];
    if (exc.includes(type)) setDayExcused(TODAY, exc.filter(t => t !== type), todayDay.excused.reason);
    else setExcuseType(type);
  };
  const confirmExcuse = (reason) => {
    const exc = todayDay.excused?.activities || [];
    const activities = exc.includes(excuseType) ? exc : [...exc, excuseType];
    setDayExcused(TODAY, activities, reason ?? todayDay.excused?.reason ?? null);
    setExcuseType(null);
  };

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
    markPlanAutoApplied(plan.id);
    setTemplateSuggestionDismissed(true);
  }

  // ── Stats presentation ─────────────────────────────────────────────────────
  const streakHot   = streak >= 5;
  const weekRatio   = weekStats.planned > 0 ? weekStats.done / weekStats.planned : 0;
  const weekColor   = weekStats.planned === 0 ? 'var(--text-light)' : weekRatio >= 1 ? 'var(--emerald-600)' : weekRatio >= 0.5 ? 'var(--text-primary)' : 'var(--red-600)';
  const monthColor  = monthStats >= 70 ? 'var(--emerald-600)' : monthStats >= 40 ? 'var(--amber-600)' : 'var(--red-600)';

  return (
    <div className="page-content">

      {/* ── Header ── */}
      <div className="hoy-header">
        <div className="hoy-header-date">{headerDate}</div>
        <div className="hoy-header-day">Buen día, Tomás</div>
      </div>

      {/* ── Tu día ── */}
      <div className="hoy-acts stagger">
        <div className="hoy-section-label">TU DÍA</div>
        {todayActs.length === 0 ? (
          <div className="hoy-free-day">Día libre</div>
        ) : (
          <ActivityList
            acts={todayActs}
            routines={routines}
            history={history}
            todayKey={TODAY}
            onGymDone={handleGymDone}
            onIndivDone={handleIndivDone}
            onStart={onGoToEntreno}
            onSkip={handleToggleSkip}
            onExcuse={handleExcuse}
            onPreview={(routineId) => setPreviewRoutineId(routineId)}
            onDelete={(type) => removeActivityFromDay(TODAY, type)}
          />
        )}
      </div>

      {/* ── Template suggestion ── */}
      {templateSuggestion && (
        <div style={{ margin: '0 16px 12px', padding: '12px 14px', background: 'var(--bg-selected)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--navy-100)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-600)', marginBottom: 6 }}>
            "{templateSuggestion.plan.name}" comienza hoy
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
            ¿Aplicar la semana tipo <strong>{templateSuggestion.tmpl.name}</strong> al período del plan?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTemplateSuggestionDismissed(true)}
              style={{ flex: 1, padding: '7px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'white', fontSize: 12, color: 'var(--gray-mid)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Luego
            </button>
            <button
              onClick={() => applyPlanTemplate(templateSuggestion.plan, templateSuggestion.tmpl)}
              style={{ flex: 2, padding: '7px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--navy-600)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Aplicar al plan
            </button>
          </div>
        </div>
      )}

      {/* ── Mañana ── */}
      <div style={{ padding: '0 16px 24px' }}>
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
      <div style={{ padding: '0 16px 24px' }}>
        <div className="hoy-section-label">ESTADÍSTICAS</div>
        <div className="metrics-row" style={{ padding: 0 }}>
          <div className="metric-card" style={streakHot ? { background: 'linear-gradient(150deg, var(--navy-700), var(--navy-600))', borderColor: 'transparent' } : undefined}>
            <div className="metric-value" style={{ color: streakHot ? 'var(--amber-300)' : streak === 0 ? 'var(--text-light)' : 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {streakHot && <FireIcon size={16} />}{streak}
            </div>
            <div className="metric-label" style={streakHot ? { color: 'rgba(255,255,255,0.7)' } : undefined}>RACHA</div>
          </div>
          <div className="metric-card">
            <div className="metric-value" style={{ color: weekColor }}>{weekStats.done}/{weekStats.planned}</div>
            <div className="metric-label">SEMANA</div>
          </div>
          <div className="metric-card">
            <div className="metric-value" style={{ color: monthColor }}>{monthStats}%</div>
            <div className="metric-label">MES</div>
          </div>
        </div>
      </div>

      {/* ── Plan activo ── */}
      {activePlan && planData && (
        <div style={{ padding: '0 16px 24px' }}>
          <div className="hoy-section-label">PLAN ACTIVO</div>
          <div
            style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', cursor: onGoToDesafios ? 'pointer' : 'default', boxShadow: 'var(--shadow-xs)' }}
            onClick={onGoToDesafios}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{activePlan.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-light)' }}>
                Sem {planData.prog.currentWeekNum}/{planData.prog.totalWeeks}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <PlanBar label="Sesiones" value={planData.prog.completedSessions} max={planData.prog.effTotal || 1} color="var(--emerald-600)" />
              <PlanBar label="Semana" value={planData.weekDone} max={planData.weekTarget} color="var(--navy-600)" />
            </div>
          </div>
        </div>
      )}

      {previewRoutineId && (
        <RoutinePreviewModal
          routine={routines.find(r => r.id === previewRoutineId)}
          exerciseMap={exerciseMap}
          catalog={catalog}
          catLinks={catLinks}
          onClose={() => setPreviewRoutineId(null)}
        />
      )}

      {excuseType && (
        <ExcuseModal
          subtitle={`${ACT_LABEL[excuseType]} · ${headerDate}`}
          onConfirm={confirmExcuse}
          onClose={() => setExcuseType(null)}
        />
      )}

    </div>
  );
}
