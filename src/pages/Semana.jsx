import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { todayStr, toDateStr, getWeekDays } from '../utils/dates';
import { ChevronLeft, TrophyIcon } from '../components/Icons';
import DayEditor from '../components/DayEditor';

const TODAY = todayStr();

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MONTHS_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAY_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAY_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

// Activity colors
const C = {
  gym:      { bar: '#2D3E50', text: '#fff' },
  indiv:    { bar: '#3E7A5C', text: '#fff' },
  arsenal:  { bar: '#8B4513', text: '#fff' },
  match:    { bar: '#C17817', text: '#fff' },
  missedIndiv: { bar: '#DC2626', text: '#fff' },
};

function ShieldIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1L2 3.5V7C2 10 4.5 12.5 7 13C9.5 12.5 12 10 12 7V3.5L7 1Z" />
    </svg>
  );
}

function WeightIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="1" y="6" width="3" height="2" rx="0.5" />
      <rect x="10" y="6" width="3" height="2" rx="0.5" />
      <rect x="4" y="4.5" width="1.5" height="5" rx="0.5" />
      <rect x="8.5" y="4.5" width="1.5" height="5" rx="0.5" />
      <line x1="5.5" y1="7" x2="8.5" y2="7" />
    </svg>
  );
}

function SmallBall({ size = 9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="5" cy="5" r="4" />
      <path d="M5,1 L5,9" />
      <path d="M3,2 C3.5,4 3.5,6 3,8" />
      <path d="M7,2 C6.5,4 6.5,6 7,8" />
    </svg>
  );
}

// Get activities for a given day from data sources
function getDayActivities(dateStr, schedule, history, matches, weekTemplate) {
  const acts = [];
  const day = history[dateStr];
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const tmpl = weekTemplate?.[dow];

  // Individual routine
  const schedRoutineId = schedule[dateStr];
  const histRoutineId  = day?.routineId;
  if (day?.done) {
    acts.push({ type: 'indiv', done: true, routineId: histRoutineId });
  } else if (schedRoutineId) {
    const missed = dateStr < TODAY;
    acts.push({ type: 'indiv', done: false, missed, routineId: schedRoutineId });
  } else if (tmpl?.routineId && dateStr >= TODAY) {
    acts.push({ type: 'indiv', done: false, missed: false, routineId: tmpl.routineId, fromTemplate: true });
  }

  // Gym
  if (day?.gym) {
    acts.push({ type: 'gym', done: true });
  } else if (tmpl?.gym && !day?.gym && dateStr >= TODAY) {
    acts.push({ type: 'gym', done: false, fromTemplate: true });
  }

  // Arsenal
  if (tmpl?.arsenal) {
    acts.push({ type: 'arsenal', done: false, fromTemplate: dateStr >= TODAY });
  }

  // Match
  const dayMatches = matches.filter(m => m.date === dateStr);
  dayMatches.forEach(m => acts.push({ type: 'match', done: true, match: m }));
  if (tmpl?.match && dayMatches.length === 0 && dateStr >= TODAY) {
    acts.push({ type: 'match', done: false, fromTemplate: true });
  }

  return acts;
}

// ── Mini bars for the week grid cell ─────────────────────────────────────────
function DayBars({ acts, isToday, isPast }) {
  if (acts.length === 0) return null;

  const gymAct   = acts.find(a => a.type === 'gym');
  const indivAct = acts.find(a => a.type === 'indiv');
  const arsenalAct = acts.find(a => a.type === 'arsenal');
  const matchAct = acts.find(a => a.type === 'match');

  const opacity = (act) => (act.fromTemplate && !act.done) ? 0.35 : 1;

  const bars = [];

  // Combined gym+individual row, or individual alone, or gym alone
  if (gymAct && indivAct) {
    bars.push(
      <div key="session" className="wk-bar-split" style={{ opacity: Math.max(opacity(gymAct), opacity(indivAct)) }}>
        <div className="wk-bar-half" style={{ background: C.gym.bar }}>
          <WeightIcon size={8} />
        </div>
        <div className="wk-bar-half" style={{ background: indivAct.missed ? C.missedIndiv.bar : C.indiv.bar }}>
          <SmallBall size={8} />
        </div>
      </div>
    );
  } else if (indivAct) {
    bars.push(
      <div key="indiv" className="wk-bar" style={{ background: indivAct.missed ? C.missedIndiv.bar : C.indiv.bar, opacity: opacity(indivAct) }}>
        <SmallBall size={8} />
      </div>
    );
  } else if (gymAct) {
    bars.push(
      <div key="gym" className="wk-bar" style={{ background: C.gym.bar, opacity: opacity(gymAct) }}>
        <WeightIcon size={8} />
      </div>
    );
  }

  if (arsenalAct) {
    bars.push(
      <div key="arsenal" className="wk-bar" style={{ background: C.arsenal.bar, opacity: opacity(arsenalAct) }}>
        <ShieldIcon size={8} />
      </div>
    );
  }
  if (matchAct) {
    bars.push(
      <div key="match" className="wk-bar" style={{ background: C.match.bar, opacity: opacity(matchAct) }}>
        <TrophyIcon size={8} />
      </div>
    );
  }

  return <div className="wk-bars">{bars}</div>;
}

// ── Day detail (Estado 2) ──────────────────────────────────────────────────
function DayDetail({ dateStr, onBack, schedule, history, routines, matches, weekTemplate }) {
  const [editing, setEditing] = useState(false);
  const d = new Date(dateStr + 'T12:00:00');
  const isToday = dateStr === TODAY;
  const acts = getDayActivities(dateStr, schedule, history, matches, weekTemplate);
  const dayHistory = history[dateStr];

  const dayLabel = DAY_FULL[d.getDay()];
  const dateLabel = `${d.getDate()} de ${MONTHS_FULL[d.getMonth()]}`;

  if (editing) {
    return (
      <div className="page-content">
        <div className="wk-detail-header">
          <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={() => setEditing(false)}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="wk-detail-title">{dayLabel}</div>
            <div className="wk-detail-sub">{dateLabel}</div>
          </div>
        </div>
        <DayEditor dateStr={dateStr} />
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="wk-detail-header">
        <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="wk-detail-title">{dayLabel}</span>
            {isToday && <span className="wk-today-badge">HOY</span>}
            <span className="wk-act-count">{acts.length} actividad{acts.length !== 1 ? 'es' : ''}</span>
          </div>
          <div className="wk-detail-sub">{dateLabel}</div>
        </div>
      </div>

      <div className="wk-timeline">
        {acts.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            Día de descanso
          </div>
        )}
        {acts.map((act, i) => {
          const isLast = i === acts.length - 1;
          return (
            <TimelineCard
              key={`${act.type}-${i}`}
              act={act}
              isLast={isLast}
              routines={routines}
              dayHistory={dayHistory}
              dateStr={dateStr}
            />
          );
        })}
      </div>

      <div style={{ padding: '0 16px 32px' }}>
        <button className="btn btn-primary btn-full" onClick={() => setEditing(true)}>
          Editar día
        </button>
      </div>
    </div>
  );
}

function TimelineCard({ act, isLast, routines, dayHistory, dateStr }) {
  const isPast = dateStr < TODAY;
  const isToday = dateStr === TODAY;

  let icon, borderColor, title, subtitle, statusEl;

  if (act.type === 'indiv') {
    const routine = routines.find(r => r.id === act.routineId);
    const totalEx = routine?.phases?.reduce((s, p) => s + p.exercises.length, 0) || 0;
    const doneEx  = Object.values(dayHistory?.completed || {}).filter(Boolean).length;
    icon = <SmallBall size={14} />;
    borderColor = act.missed ? C.missedIndiv.bar : C.indiv.bar;
    title = routine ? routine.name : 'Entrenamiento individual';
    subtitle = routine?.subtitle || '';
    if (act.done) {
      statusEl = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className="tl-badge tl-badge-done">✓ Hecho</span>
          {totalEx > 0 && (
            <div className="tl-progress-bar">
              <div className="tl-progress-fill" style={{ width: `${Math.round((doneEx / totalEx) * 100)}%` }} />
            </div>
          )}
        </div>
      );
    } else if (act.missed) {
      statusEl = <span className="tl-badge tl-badge-missed">No hecho</span>;
    } else if (isToday) {
      statusEl = <span className="tl-badge tl-badge-now">AHORA</span>;
    } else {
      statusEl = <span className="tl-badge tl-badge-plan">Planificado</span>;
    }
  } else if (act.type === 'gym') {
    icon = <WeightIcon size={14} />;
    borderColor = C.gym.bar;
    title = 'Gimnasio';
    subtitle = '';
    statusEl = act.done
      ? <span className="tl-badge tl-badge-done">✓ Hecho</span>
      : <span className="tl-badge tl-badge-plan">Planificado</span>;
  } else if (act.type === 'arsenal') {
    icon = <ShieldIcon size={14} />;
    borderColor = C.arsenal.bar;
    title = 'Arsenal';
    subtitle = 'Entrenamiento con el equipo';
    statusEl = <span className="tl-badge tl-badge-plan">Planificado</span>;
  } else if (act.type === 'match') {
    icon = <TrophyIcon size={14} />;
    borderColor = C.match.bar;
    title = act.match?.competition || 'Partido';
    subtitle = act.match ? (
      act.match.result === 'ganamos' ? 'Ganamos' :
      act.match.result === 'perdimos' ? 'Perdimos' : 'Empate'
    ) : 'Planificado';
    statusEl = act.done
      ? <span className="tl-badge tl-badge-done">✓ Jugado</span>
      : <span className="tl-badge tl-badge-plan">Planificado</span>;
  }

  const iconBg = act.type === 'gym' ? '#E8EDF5'
    : act.type === 'indiv' ? '#E8F5EE'
    : act.type === 'arsenal' ? '#F5EDE8'
    : '#FDF4E3';
  const iconColor = act.type === 'gym' ? '#2D3E50'
    : act.type === 'indiv' ? '#3E7A5C'
    : act.type === 'arsenal' ? '#8B4513'
    : '#C17817';

  return (
    <div className="tl-item">
      <div className="tl-left">
        <div className="tl-icon-wrap" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
        {!isLast && <div className="tl-line" />}
      </div>
      <div className="tl-card" style={{ borderLeftColor: borderColor }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div className="tl-card-title">{title}</div>
            {subtitle && <div className="tl-card-sub">{subtitle}</div>}
          </div>
          {statusEl}
        </div>
      </div>
    </div>
  );
}

// ── Main Semana component ──────────────────────────────────────────────────
export default function Semana() {
  const { routines, schedule, history, matches, weekTemplate, applyWeekTemplate } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(baseDate);
  const weekDateStrs = weekDays.map(d => toDateStr(d));

  // Auto-apply template if this week has no schedule entries
  useEffect(() => {
    if (!weekTemplate || Object.keys(weekTemplate).length === 0) return;
    const hasAny = weekDateStrs.some(ds => schedule[ds]);
    if (!hasAny) {
      applyWeekTemplate(weekDateStrs);
    }
  // only run when week changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Week label
  const firstDay = weekDays[0];
  const lastDay  = weekDays[6];
  const sameMonth = firstDay.getMonth() === lastDay.getMonth();
  const weekLabel = sameMonth
    ? `${firstDay.getDate()} — ${lastDay.getDate()} de ${MONTHS_FULL[firstDay.getMonth()]}`
    : `${firstDay.getDate()} ${MONTHS_ES[firstDay.getMonth()]} — ${lastDay.getDate()} ${MONTHS_ES[lastDay.getMonth()]}`;

  if (selectedDay) {
    return (
      <DayDetail
        dateStr={selectedDay}
        onBack={() => setSelectedDay(null)}
        schedule={schedule}
        history={history}
        routines={routines}
        matches={matches}
        weekTemplate={weekTemplate}
      />
    );
  }

  return (
    <div className="page-content">
      {/* Week navigation */}
      <div className="wk-nav">
        <button className="wk-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>‹</button>
        <div className="wk-nav-center">
          <div className="wk-nav-label">{weekLabel}</div>
          {weekOffset !== 0 && (
            <button className="wk-nav-today-btn" onClick={() => setWeekOffset(0)}>
              Hoy
            </button>
          )}
        </div>
        <button className="wk-nav-btn" onClick={() => setWeekOffset(o => o + 1)}>›</button>
      </div>

      {/* Apply template button */}
      {weekTemplate && Object.keys(weekTemplate).length > 0 && (
        <div style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Semana tipo disponible</span>
          <button
            style={{ fontSize: 12, fontWeight: 700, color: '#3E7A5C', background: 'none', border: '1.5px solid #3E7A5C', borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
            onClick={() => applyWeekTemplate(weekDateStrs)}
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Week grid */}
      <div className="wk-grid-wrap">
        {/* Day headers */}
        <div className="wk-grid">
          {weekDays.map((d, i) => {
            const dateStr = weekDateStrs[i];
            const isToday = dateStr === TODAY;
            const isPast  = dateStr < TODAY;
            const acts    = getDayActivities(dateStr, schedule, history, matches, weekTemplate);
            const hasActs = acts.length > 0;

            return (
              <div
                key={dateStr}
                className={`wk-cell${isToday ? ' wk-cell-today' : ''}${!hasActs && isPast ? ' wk-cell-empty-past' : ''}`}
                onClick={() => setSelectedDay(dateStr)}
              >
                <div className="wk-cell-dayname">{DAY_SHORT[d.getDay()]}</div>
                <div className="wk-cell-daynum">{d.getDate()}</div>
                <DayBars acts={acts} isToday={isToday} isPast={isPast} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="wk-legend">
        {[
          { color: C.indiv.bar,   label: 'Individual' },
          { color: C.gym.bar,     label: 'Gym' },
          { color: C.arsenal.bar, label: 'Arsenal' },
          { color: C.match.bar,   label: 'Partido' },
        ].map(({ color, label }) => (
          <div key={label} className="wk-legend-item">
            <div className="wk-legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
