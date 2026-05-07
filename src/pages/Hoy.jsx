import { useMemo } from 'react';
import { useStore, getPlanProgress } from '../store/useStore';
import { todayStr, toDateStr, getWeekDays } from '../utils/dates';
import { CalendarIcon } from '../components/Icons';

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

const ACT_COLORS = {
  gym:     { bg: '#E6F1FB', title: '#0C447C', sub: '#185FA5' },
  indiv:   { bg: '#E1F5EE', title: '#085041', sub: '#0F6E56' },
  arsenal: { bg: '#FAEEDA', title: '#633806', sub: '#854F0B' },
  match:   { bg: '#FAECE7', title: '#712B13', sub: '#993C1D' },
};

const ACT_SHORT = { gym: 'Gym', indiv: 'Individual', arsenal: 'Arsenal', match: 'Partido' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDayActivities(dateStr, schedule, history, matches, weekTemplate) {
  const dow  = new Date(dateStr + 'T12:00:00').getDay();
  const tmpl = weekTemplate?.[dow] || {};
  const day  = history[dateStr];
  const acts = [];

  if (day?.gym || tmpl.gym) {
    acts.push({ type: 'gym', time: tmpl.gymTime || '07:00', done: !!day?.gym });
  }

  const schedId = schedule[dateStr];
  const histId  = day?.done ? day.routineId : null;
  const tmplId  = tmpl.routineId;
  if (histId || schedId || tmplId) {
    acts.push({
      type: 'indiv',
      time: tmpl.indivTime || '08:10',
      done: !!day?.done,
      routineId: histId || schedId || tmplId,
    });
  }

  if (tmpl.arsenal) {
    acts.push({ type: 'arsenal', time: tmpl.arsenalTime || '19:30' });
  }

  const defaultMatchTime = dow === 6 ? '15:00' : dow === 0 ? '16:00' : '15:00';
  const dayMatches = matches.filter(m => m.date === dateStr);
  dayMatches.forEach(m => acts.push({
    type: 'match', time: tmpl.matchTime || defaultMatchTime, match: m,
  }));
  if (tmpl.match && dayMatches.length === 0) {
    acts.push({ type: 'match', time: tmpl.matchTime || defaultMatchTime });
  }

  return acts.sort((a, b) => a.time.localeCompare(b.time));
}

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActivityRow({ act, routines, history, onClick }) {
  const c = ACT_COLORS[act.type];
  let title = '', sub = '', progress = null;

  if (act.type === 'gym') {
    title = 'Gimnasio';
  } else if (act.type === 'indiv') {
    const r = routines.find(r => r.id === act.routineId);
    title = r ? r.name : 'Entrenamiento individual';
    if (r) {
      const phases  = r.phases?.length || 0;
      const dur     = r.duration || '';
      sub = [phases > 0 ? `${phases} fases` : '', dur ? `~${dur}` : ''].filter(Boolean).join(' · ');
      const exIds   = new Set(r.phases?.flatMap(p => p.exercises?.map(e => e.ref) || []) || []);
      const totalEx = exIds.size;
      const doneEx  = Object.entries(history[TODAY]?.completed || {})
        .filter(([id, done]) => done && exIds.has(id)).length;
      progress = `${doneEx}/${totalEx}`;
    }
  } else if (act.type === 'arsenal') {
    title = 'Arsenal — Entrenamiento';
  } else if (act.type === 'match') {
    title = act.match?.competition || 'Partido';
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={{ width: 36, flexShrink: 0, fontSize: 12, color: '#94A3B8', textAlign: 'right', paddingTop: 11 }}>
        {act.time}
      </div>
      <div style={{ flex: 1, background: c.bg, borderRadius: 8, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.title }}>{title}</div>
          {progress && <div style={{ fontSize: 12, fontWeight: 600, color: c.sub }}>{progress}</div>}
        </div>
        {sub && <div style={{ fontSize: 11, color: c.sub, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function GapIndicator({ gapMins }) {
  const hrs = (gapMins / 60).toFixed(1).replace('.0', '');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 2px 46px' }}>
      <div style={{ borderLeft: '2px dashed #CBD5E1', height: 16 }} />
      <span style={{ fontSize: 11, color: '#94A3B8' }}>~{hrs} hs</span>
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

const SECTION_LABEL_STYLE = {
  fontSize: 12, fontWeight: 500, textTransform: 'uppercase',
  letterSpacing: '0.5px', color: '#94A3B8', marginBottom: 10,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function Hoy({ onGoToDesafios, onGoToEntreno }) {
  const { routines, schedule, history, matches, weekTemplate, plans } = useStore();

  const weekDateStrs = useMemo(() => getWeekDays(new Date()).map(d => toDateStr(d)), []);

  // Stats
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
    const done    = weekDateStrs.filter(d => history[d]?.done).length;
    const planned = weekDateStrs.filter(ds => {
      if (schedule[ds]) return true;
      const dow = new Date(ds + 'T12:00:00').getDay();
      return !!weekTemplate?.[dow]?.routineId;
    }).length;
    return { done, planned };
  }, [weekDateStrs, schedule, history, weekTemplate]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const yr  = now.getFullYear();
    const mo  = now.getMonth() + 1;
    const todayDay = parseInt(TODAY.split('-')[2]);
    let planned = 0, done = 0;
    for (let d = 1; d <= todayDay; d++) {
      const ds = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (schedule[ds]) planned++;
      if (history[ds]?.done) done++;
    }
    return planned > 0 ? Math.round((done / planned) * 100) : 0;
  }, [schedule, history]);

  // Active plan
  const activePlan = useMemo(
    () => plans.find(p => p.status !== 'completed' && TODAY >= p.startDate),
    [plans]
  );

  const planData = useMemo(() => {
    if (!activePlan) return null;
    const prog       = getPlanProgress(activePlan, history);
    const gymFreq    = activePlan.gymWeeklyFrequency || 0;
    const indFreq    = activePlan.individualWeeklyFrequency || 0;
    const weekTarget = gymFreq + indFreq || 1;
    const weekDone   = weekDateStrs.reduce((acc, ds) => {
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

  // Today + tomorrow activities
  const todayActs = useMemo(
    () => getDayActivities(TODAY, schedule, history, matches, weekTemplate),
    [schedule, history, matches, weekTemplate]
  );

  const tomorrowActs = useMemo(
    () => getDayActivities(TOMORROW, schedule, history, matches, weekTemplate),
    [schedule, history, matches, weekTemplate]
  );

  // Derived strings
  const todayDate    = new Date(TODAY    + 'T12:00:00');
  const tomorrowDate = new Date(TOMORROW + 'T12:00:00');

  const headerDate    = `${DAY_FULL[todayDate.getDay()]} ${todayDate.getDate()} de ${MONTHS[todayDate.getMonth()]}`;
  const tomorrowLabel = `${DAY_FULL[tomorrowDate.getDay()]} ${tomorrowDate.getDate()}`;
  const tomorrowSummary = tomorrowActs.length === 0
    ? 'Descanso'
    : tomorrowActs.map(a => `${ACT_SHORT[a.type]} ${a.time}`).join(' · ');

  return (
    <div className="page-content">

      {/* ── Header + Stats (dark block) ── */}
      <div style={{ background: '#1B3A4B', padding: '18px 16px 0' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          {headerDate}
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'white', marginBottom: 14 }}>
          Buen día, Tomás
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, paddingBottom: 14 }}>
          {[
            { label: 'RACHA',  value: streak },
            { label: 'SEMANA', value: `${weekStats.done}/${weekStats.planned}` },
            { label: 'MES',    value: `${monthStats}%` },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '10px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'white' }}>{s.value}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plan activo ── */}
      {activePlan && planData && (
        <div
          style={{
            margin: '12px 16px 0',
            background: 'white',
            border: '0.5px solid #E2E8F0',
            borderRadius: 10,
            padding: '12px 14px',
            cursor: onGoToDesafios ? 'pointer' : 'default',
          }}
          onClick={onGoToDesafios}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1A2332' }}>{activePlan.name}</span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Sem {planData.prog.currentWeekNum}/{planData.prog.totalWeeks}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <PlanBar
              label="Sesiones"
              value={planData.prog.completedSessions}
              max={planData.prog.effTotal || 1}
              color="#0F6E56"
            />
            <PlanBar
              label="Semana"
              value={planData.weekDone}
              max={planData.weekTarget}
              color="#185FA5"
            />
          </div>
        </div>
      )}

      {/* ── HOY ── */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={SECTION_LABEL_STYLE}>HOY</div>
        {todayActs.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '16px 0' }}>
            Descanso
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todayActs.map((act, i) => {
              const prev     = todayActs[i - 1];
              const gapMins  = prev ? timeToMins(act.time) - timeToMins(prev.time) : 0;
              return (
                <div key={i}>
                  {gapMins > 120 && <GapIndicator gapMins={gapMins} />}
                  <ActivityRow act={act} routines={routines} history={history} onClick={onGoToEntreno} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MAÑANA ── */}
      <div style={{ padding: '14px 16px 24px' }}>
        <div style={SECTION_LABEL_STYLE}>MAÑANA</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#94A3B8', flexShrink: 0, lineHeight: 0 }}>
            <CalendarIcon size={14} />
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1A2332', flexShrink: 0 }}>
            {tomorrowLabel}
          </span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>{tomorrowSummary}</span>
        </div>
      </div>

    </div>
  );
}
