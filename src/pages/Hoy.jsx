import { useMemo, useState } from 'react';
import { useStore, getPlanProgress, computePlanWeeklyLog, computeCriticalPath } from '../store/useStore';
import { toDateStr, addDays } from '../utils/dates';
import { getDayActivities, getEffectiveTemplateDays as getEffectiveTmpl, buildGymTogglePatch } from '../utils/activities';
import { FireIcon, GymIcon, BallIcon, ShieldIcon, TrophyIcon, CheckIcon } from '../components/Icons';
import TermTag from '../components/TermTag';
import { INICIO } from '../utils/inicioTheme';
import { useToday } from '../hooks/useToday';

const MONTHS = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];
const DAY_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const ACT_ICONS = { gym: GymIcon, indiv: BallIcon, arsenal: ShieldIcon, match: TrophyIcon };

const STATE_TITLE = {
  ontrack:  'Vas a tiempo.',
  ahead:    'Vas adelantado.',
  behind:   'Estás atrasado.',
  critical: 'El plan no cierra como está.',
};

function CriticalBadge() {
  return (
    <span style={{
      fontFamily: INICIO.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      color: INICIO.criticalLight, border: `1px solid ${INICIO.critical}`,
      borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', flexShrink: 0,
    }}>
      Crítico
    </span>
  );
}

// Sección 4: traduce la deuda en una consecuencia concreta de la semana siguiente.
function Sentence({ cp, critical }) {
  const barColor = critical ? INICIO.critical : INICIO.bronze;
  const nw = cp.nextWeek;
  let body;
  if (!nw) {
    body = <>Son las últimas sesiones del plan. Esta semana, o no cierra.</>;
  } else {
    const segs = [];
    if (nw.gym > 0)   segs.push(nw.gym   >= 6 ? <><TermTag>GIMNASIO</TermTag> todos los días</>   : <>{nw.gym} <TermTag>GIMNASIO</TermTag></>);
    if (nw.indiv > 0) segs.push(nw.indiv >= 6 ? <><TermTag>INDIVIDUAL</TermTag> todos los días</> : <>{nw.indiv} <TermTag>INDIVIDUAL</TermTag></>);
    const tail = (nw.gym >= 6 || nw.indiv >= 6) ? ', obligatorio.' : ', sin margen.';
    body = <>Semana {nw.num}: {segs.map((s, i) => <span key={i}>{i > 0 ? ' + ' : ''}{s}</span>)}{tail}</>;
  }
  return (
    <div style={{ margin: '0 20px 14px', paddingLeft: 14, borderLeft: `2px solid ${barColor}` }}>
      <div style={{ fontSize: 11, fontFamily: INICIO.mono, letterSpacing: '0.07em', color: INICIO.textSofter, textTransform: 'uppercase', marginBottom: 5 }}>
        Si no las hacés
      </div>
      <div style={{ fontSize: 14.5, color: INICIO.textSoft, lineHeight: 1.4 }}>{body}</div>
    </div>
  );
}

export default function Hoy({ onGoToDesafios, onGoToEntreno }) {
  const { routines, schedule, history, matches, weekTemplate, weekTemplates, plans, applyWeekTemplate, markPlanAutoApplied, updateDay } = useStore();
  const [templateSuggestionDismissed, setTemplateSuggestionDismissed] = useState(false);

  const TODAY = useToday();
  const TOMORROW = addDays(TODAY, 1);

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

  const activePlan = useMemo(
    () => plans.find(p => p.status !== 'completed' && TODAY >= p.startDate && TODAY <= p.endDate),
    [plans, TODAY]
  );

  const todayActs = useMemo(() => {
    const effTmpl = getEffectiveTmpl(TODAY, plans, weekTemplates, weekTemplate);
    return getDayActivities(TODAY, schedule, history, matches, effTmpl);
  }, [schedule, history, matches, weekTemplate, weekTemplates, plans, TODAY]);

  const tomorrowActs = useMemo(() => {
    const effTmpl = getEffectiveTmpl(TOMORROW, plans, weekTemplates, weekTemplate);
    return getDayActivities(TOMORROW, schedule, history, matches, effTmpl);
  }, [schedule, history, matches, weekTemplate, weekTemplates, plans, TOMORROW]);

  // ── Estado del plan (reutiliza la lógica existente, sin tocarla) ────────────
  const planState = useMemo(() => {
    if (!activePlan) return null;
    const prog = getPlanProgress(activePlan, history);
    const weeks = computePlanWeeklyLog(activePlan, history);
    const cp = computeCriticalPath(activePlan, history);
    const currentWeek = weeks.find(w => w.isCurrent) || null;
    const actType = activePlan.activityType || 'individual';
    const wantsGym = actType === 'gym' || actType === 'both';
    const wantsInd = actType === 'individual' || actType === 'both';
    const gymMiss = currentWeek && wantsGym ? Math.max(0, (currentWeek.gymEffTarget   || 0) - currentWeek.gym)        : 0;
    const indMiss = currentWeek && wantsInd ? Math.max(0, (currentWeek.indivEffTarget || 0) - currentWeek.individual) : 0;
    const daysLeft = currentWeek
      ? Math.max(0, Math.round((new Date(currentWeek.endDate + 'T12:00:00') - new Date(TODAY + 'T12:00:00')) / 86400000) + 1)
      : 0;
    const active = !prog.isExpired && !prog.isComplete && !prog.isPending;

    let status;
    if (cp.isCritical && active) status = 'critical';
    else if (!active) status = 'ontrack';
    else {
      const expected = prog.effTotal * (prog.currentWeekNum / prog.totalWeeks);
      if (!prog.isOnTrack) status = 'behind';
      else if (prog.completedSessions > expected + 0.5) status = 'ahead';
      else status = 'ontrack';
    }
    const debtAcceptedThisWeek = !!currentWeek && activePlan.debtAcceptedWeek === currentWeek.startDate;
    const locked = status === 'critical' && !debtAcceptedThisWeek;
    // Estado efectivo para título/sentencia: deuda asumida → se trata como atrasado.
    const effStatus = (status === 'critical' && debtAcceptedThisWeek) ? 'behind' : status;
    return { prog, cp, currentWeek, wantsGym, wantsInd, gymMiss, indMiss, daysLeft, status, effStatus, locked };
  }, [activePlan, history, TODAY]);

  const todayDate = new Date(TODAY + 'T12:00:00');
  const headerDate = `${DAY_FULL[todayDate.getDay()]} ${todayDate.getDate()} ${MONTHS[todayDate.getMonth()]}`.toUpperCase();

  const todayDay = history[TODAY] || {};
  const handleGymDone = () => updateDay(TODAY, buildGymTogglePatch(todayDay));

  // Template suggestion para el día de inicio del plan
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

  // ── Sesión de hoy ───────────────────────────────────────────────────────────
  const trainableToday = todayActs.filter(a => a.type === 'gym' || a.type === 'indiv');
  const dayClosed = trainableToday.length > 0 && trainableToday.every(a => a.done);
  // Próxima sesión pendiente (prioriza lo no hecho); para la card principal.
  const sessionAct = trainableToday.find(a => !a.done && !a.excused)
    || todayActs.find(a => a.type === 'indiv')
    || todayActs.find(a => a.type === 'gym')
    || null;
  const sessionIsIndiv = sessionAct?.type === 'indiv';

  function actLabelPlain(a) {
    if (a.type === 'gym') return 'Gimnasio';
    if (a.type === 'indiv') return routines.find(r => r.id === a.routineId)?.name || 'Entrenamiento individual';
    if (a.type === 'arsenal') return 'Arsenal';
    return a.match?.competition || 'Partido';
  }
  const tomorrowSummary = tomorrowActs.length > 0
    ? `Mañana: ${actLabelPlain(tomorrowActs[0])} ${tomorrowActs[0].time}`
    : 'Mañana: descanso';

  const critical = planState?.status === 'critical';
  const accent   = critical ? INICIO.criticalLight : INICIO.bronze;

  // Columnas del contador de deuda según el tipo de plan
  const debtCols = planState ? [
    planState.wantsGym && { key: 'gym',   term: 'GIMNASIO',   n: planState.gymMiss },
    planState.wantsInd && { key: 'indiv', term: 'INDIVIDUAL', n: planState.indMiss },
  ].filter(Boolean) : [];

  // Resto del día: las actividades que no son la sesión principal
  const restActs = todayActs.filter(a => a !== sessionAct);

  return (
    <div className="page-content" style={{ background: INICIO.bg, minHeight: '100%' }}>

      {/* ── Barra fina superior (bronce / rojo en crítico) ── */}
      <div style={{ height: 3, background: critical ? INICIO.barCritical : INICIO.barBronze }} />

      {/* ── 1. HEADER ── */}
      <div style={{ padding: '18px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', color: INICIO.textSofter, fontWeight: 600, fontFamily: INICIO.mono }}>
          {headerDate}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: INICIO.bronze }}>
          <FireIcon size={15} />
          <span style={{ fontFamily: INICIO.mono, fontWeight: 700, fontSize: 16 }}>{streak}</span>
        </div>
      </div>

      {/* ── Sugerencia de semana tipo (día de inicio del plan) ── */}
      {templateSuggestion && (
        <div style={{ margin: '8px 20px 4px', padding: '12px 14px', background: INICIO.card, border: `0.5px solid ${INICIO.border}`, borderRadius: INICIO.radius }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: INICIO.textMain, marginBottom: 4 }}>
            "{templateSuggestion.plan.name}" arranca hoy
          </div>
          <div style={{ fontSize: 12, color: INICIO.textSofter, marginBottom: 10 }}>
            ¿Aplicar la semana tipo <strong style={{ color: INICIO.textSoft }}>{templateSuggestion.tmpl.name}</strong> al período del plan?
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTemplateSuggestionDismissed(true)}
              style={{ flex: 1, padding: '8px', borderRadius: 10, border: `1px solid ${INICIO.border}`, background: 'transparent', fontSize: 12, color: INICIO.textSofter, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Luego
            </button>
            <button
              onClick={() => applyPlanTemplate(templateSuggestion.plan, templateSuggestion.tmpl)}
              style={{ flex: 2, padding: '8px', borderRadius: 10, border: 'none', background: INICIO.bronze, color: INICIO.bg, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Aplicar al plan
            </button>
          </div>
        </div>
      )}

      {/* ── 2. ESTADO DEL PLAN ── */}
      {activePlan && planState && (
        <div style={{ padding: '8px 20px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 12, fontFamily: INICIO.mono, color: INICIO.bronze, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {activePlan.name} · Semana {planState.prog.currentWeekNum}/{planState.prog.totalWeeks}
            </div>
            {critical && <CriticalBadge />}
          </div>
          <div style={{ fontSize: 23, fontWeight: 700, color: INICIO.textMain, marginTop: 6, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
            {STATE_TITLE[planState.effStatus]}
          </div>
        </div>
      )}

      {/* ── 3. CONTADOR DE DEUDA ── */}
      {activePlan && planState?.currentWeek && debtCols.length > 0 && (
        <div style={{ margin: '0 20px 14px', background: INICIO.card, border: `0.5px solid ${INICIO.border}`, borderRadius: INICIO.radius, padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontFamily: INICIO.mono, letterSpacing: '0.07em', color: INICIO.textSofter, textTransform: 'uppercase' }}>
            Faltan esta semana · {planState.daysLeft} {planState.daysLeft === 1 ? 'día' : 'días'} restantes
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 14 }}>
            {debtCols.map((col, i) => (
              <div key={col.key} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? `1px solid ${INICIO.border}` : 'none' }}>
                <div style={{
                  fontSize: 46, fontWeight: 800, lineHeight: 1, fontFamily: INICIO.mono,
                  color: col.n > 0 ? (critical ? INICIO.criticalLight : INICIO.textMain) : INICIO.green,
                }}>
                  {col.n}
                </div>
                <div style={{ marginTop: 8 }}><TermTag style={{ fontSize: 12 }}>{col.term}</TermTag></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. SENTENCIA (solo atrasado / crítico) ── */}
      {activePlan && planState && planState.effStatus === 'behind' && (
        <Sentence cp={planState.cp} critical={critical} />
      )}

      {/* ── 5. SESIÓN DE HOY / DÍA CERRADO / DÍA LIBRE ── */}
      {dayClosed ? (
        <div style={{ padding: '4px 20px 18px' }}>
          <div style={{ fontSize: 23, fontWeight: 700, color: INICIO.textMain }}>Día cerrado.</div>
          <div style={{ fontSize: 13, color: INICIO.textSofter, marginTop: 6 }}>{tomorrowSummary}</div>
        </div>
      ) : !sessionAct ? (
        <div style={{ padding: '4px 20px 18px' }}>
          <div style={{ fontSize: 23, fontWeight: 700, color: INICIO.textMain }}>Día libre.</div>
          <div style={{ fontSize: 13, color: INICIO.textSofter, marginTop: 6 }}>{tomorrowSummary}</div>
        </div>
      ) : (() => {
        const Icon = ACT_ICONS[sessionAct.type];
        const r = sessionIsIndiv ? routines.find(x => x.id === sessionAct.routineId) : null;
        const title = sessionIsIndiv ? (r?.name || 'Entrenamiento individual') : 'Gimnasio';
        const phases = r?.phases?.length || 0;
        const totalEx = r ? r.phases.reduce((s, p) => s + (p.exercises?.length || 0), 0) : 0;
        const meta = sessionIsIndiv
          ? [phases ? `${phases} fases` : '', totalEx ? `${totalEx} ejercicios` : '', r?.duration || ''].filter(Boolean).join(' · ')
          : 'Sesión de fuerza';
        return (
          <div style={{ padding: '4px 20px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: INICIO.textMain, fontFamily: INICIO.mono, letterSpacing: '0.04em' }}>
                HOY · {sessionAct.time}
              </span>
              <span style={{ fontSize: 12, color: INICIO.textSofter }}>
                descuenta 1 <TermTag>{sessionIsIndiv ? 'INDIVIDUAL' : 'GIMNASIO'}</TermTag>
              </span>
            </div>
            <div style={{ background: INICIO.card, border: `0.5px solid ${INICIO.border}`, borderRadius: INICIO.radius, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(201,162,75,0.12)', color: INICIO.bronze, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: INICIO.textMain, lineHeight: 1.2 }}>{title}</div>
                  {meta && <div style={{ fontSize: 12.5, color: INICIO.textSofter, marginTop: 3 }}>{meta}</div>}
                </div>
              </div>
              <button
                onClick={sessionIsIndiv ? onGoToEntreno : handleGymDone}
                style={{
                  marginTop: 16, width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: INICIO.bronze, color: INICIO.bg, fontSize: 15, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-0.01em',
                }}
              >
                {sessionIsIndiv ? 'Empezar y descontar' : <>Marcar <TermTag style={{ color: INICIO.bg }}>GIMNASIO</TermTag> hecho</>}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── 6. RESTO DEL DÍA ── */}
      {restActs.length > 0 && (
        <div style={{ padding: '0 20px 24px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {restActs.map((act, i) => {
            const Icon = ACT_ICONS[act.type];
            const isDone = act.done;
            const pendingGym = act.type === 'gym' && !act.done && !act.excused;
            const term = act.type === 'gym' ? 'GIMNASIO' : act.type === 'indiv' ? 'INDIVIDUAL' : null;
            const plain = act.type === 'arsenal' ? 'Arsenal' : act.type === 'match' ? (act.match?.competition || 'Partido') : null;
            return (
              <div
                key={i}
                onClick={pendingGym ? handleGymDone : undefined}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 11px', borderRadius: 99,
                  border: `0.5px solid ${INICIO.border}`,
                  background: isDone ? 'transparent' : INICIO.card,
                  opacity: isDone || act.excused ? 0.5 : 1,
                  cursor: pendingGym ? 'pointer' : 'default',
                }}
              >
                {isDone
                  ? <span style={{ color: INICIO.green, lineHeight: 0 }}><CheckIcon size={12} /></span>
                  : <span style={{ color: INICIO.textSofter, lineHeight: 0 }}><Icon size={13} /></span>}
                <span style={{ fontSize: 12, color: isDone ? INICIO.textSofter : INICIO.textSoft, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {term ? <TermTag>{term}</TermTag> : plain}
                  {isDone ? ' hecho' : act.excused ? ' excepción' : <span style={{ color: INICIO.textSofter }}>{act.time}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sin plan activo: acceso a Planes */}
      {!activePlan && (
        <div style={{ padding: '4px 20px 24px' }}>
          <button
            onClick={onGoToDesafios}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: `0.5px solid ${INICIO.border}`, background: INICIO.card, color: INICIO.textSoft, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            No tenés un plan activo · Ver planes
          </button>
        </div>
      )}

    </div>
  );
}
