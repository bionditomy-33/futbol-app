import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { todayStr, toDateStr } from '../utils/dates';
import { getDayActivities, getScheduleEntry } from '../utils/activities';
import { ACT_DOT_COLORS as C } from '../utils/colors';
import { TrophyIcon } from '../components/Icons';
import DayEditor from '../components/DayEditor';

const TODAY = todayStr();

const MONTHS_ES  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_LO  = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAY_HEADERS = ['L','M','X','J','V','S','D'];
const DAY_FULL    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];


function ShieldIcon({ size = 8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1L2 3.5V7C2 10 4.5 12.5 7 13C9.5 12.5 12 10 12 7V3.5L7 1Z" />
    </svg>
  );
}

function WeightIcon({ size = 8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="1" y="6" width="3" height="2" rx="0.5" />
      <rect x="10" y="6" width="3" height="2" rx="0.5" />
      <rect x="4" y="4.5" width="1.5" height="5" rx="0.5" />
      <rect x="8.5" y="4.5" width="1.5" height="5" rx="0.5" />
      <line x1="5.5" y1="7" x2="8.5" y2="7" />
    </svg>
  );
}

function SmallBall({ size = 8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="5" cy="5" r="4" />
      <path d="M5,1 L5,9" />
      <path d="M3,2 C3.5,4 3.5,6 3,8" />
      <path d="M7,2 C6.5,4 6.5,6 7,8" />
    </svg>
  );
}

// Returns the effective template days for a date: the active plan's template if one covers
// this date, otherwise the default weekTemplate.
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

function CalDayBars({ acts, isToday }) {
  if (acts.length === 0) return null;

  const gymAct     = acts.find(a => a.type === 'gym');
  const indivAct   = acts.find(a => a.type === 'indiv');
  const arsenalAct = acts.find(a => a.type === 'arsenal');
  const matchAct   = acts.find(a => a.type === 'match');

  const planned = (act) => !act?.done && act?.fromTemplate;

  const bars = [];

  if (gymAct && indivAct) {
    const op = (planned(gymAct) || planned(indivAct)) ? 0.35 : 1;
    bars.push(
      <div key="session" className="cal-bar-split" style={{ opacity: op }}>
        <div style={{ flex: 1, background: C.gym,   display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <WeightIcon size={6} />
        </div>
        <div style={{ flex: 1, background: indivAct.missed ? C.indivMissed : C.indiv, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <SmallBall size={6} />
        </div>
      </div>
    );
  } else if (indivAct) {
    bars.push(
      <div key="indiv" className="cal-bar" style={{ background: indivAct.missed ? C.indivMissed : C.indiv, opacity: planned(indivAct) ? 0.35 : 1, color: 'white' }}>
        <SmallBall size={6} />
      </div>
    );
  } else if (gymAct) {
    bars.push(
      <div key="gym" className="cal-bar" style={{ background: C.gym, opacity: planned(gymAct) ? 0.35 : 1, color: 'white' }}>
        <WeightIcon size={6} />
      </div>
    );
  }

  if (arsenalAct) {
    bars.push(
      <div key="arsenal" className="cal-bar" style={{ background: C.arsenal, opacity: 0.5, color: 'white' }}>
        <ShieldIcon size={6} />
      </div>
    );
  }
  if (matchAct) {
    bars.push(
      <div key="match" className="cal-bar" style={{ background: C.match, opacity: planned(matchAct) ? 0.35 : 1, color: 'white' }}>
        <TrophyIcon size={6} />
      </div>
    );
  }

  return <div className="cal-bars">{bars}</div>;
}

// ── Month summary by week ────────────────────────────────────────────────────
function MonthSummary({ year, month, schedule, history, weekTemplate, weekTemplates, plans }) {
  const weeks = useMemo(() => {
    const first    = new Date(year, month, 1);
    const firstDow = first.getDay();
    const leadDays = firstDow === 0 ? 6 : firstDow - 1;
    const last     = new Date(year, month + 1, 0);
    const start    = new Date(year, month, 1 - leadDays);
    const total    = leadDays + last.getDate();
    const numWeeks = Math.ceil(total / 7);
    const result   = [];

    for (let w = 0; w < numWeeks; w++) {
      let planned = 0, done = 0, isCurrentWeek = false;
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const ds  = toDateStr(date);
        const dow = date.getDay();
        const effDays = getEffectiveTmpl(ds, plans, weekTemplates, weekTemplate);
        const tmpl = effDays?.[dow];
        const day = history[ds];
        const suppressTemplate = !!(day?.cleared && !day?.done && !day?.gym);
        const hasSchedule = !!schedule[ds];
        const hasTmpl     = !suppressTemplate && !!tmpl?.routineId;

        if (hasSchedule || hasTmpl) planned++;
        if (history[ds]?.done) done++;
        if (ds === TODAY) isCurrentWeek = true;
      }
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + w * 7);
      const weekEnd = new Date(start);
      weekEnd.setDate(start.getDate() + w * 7 + 6);
      const monStr = toDateStr(weekStart);
      const sunStr = toDateStr(weekEnd);
      const activePlans = (plans || []).filter(p =>
        p.status !== 'completed' && p.startDate <= sunStr && p.endDate >= monStr
      );
      const primaryPlan = activePlans[activePlans.length - 1] || null;
      result.push({ planned, done, isCurrentWeek, weekStart, weekEnd, primaryPlan });
    }
    return result;
  }, [year, month, schedule, history, weekTemplate, weekTemplates, plans]);

  return (
    <div className="cal-summary">
      <div className="cal-summary-title">Resumen del mes</div>
      {weeks.map((w, i) => {
        const pct = w.planned > 0 ? Math.round((w.done / w.planned) * 100) : 0;
        const label = `Sem ${i + 1}`;
        return (
          <div key={i} className={`cal-summary-week${w.isCurrentWeek ? ' current' : ''}`}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span className="cal-summary-week-label">{label}</span>
              {w.primaryPlan && (
                <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--navy-600)', lineHeight: 1.3 }}>
                  {w.primaryPlan.name}
                </span>
              )}
            </div>
            <div className="cal-summary-bar-wrap">
              <div className="cal-summary-bar-bg">
                <div className="cal-summary-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="cal-summary-pct">
              {w.planned > 0 ? `${w.done}/${w.planned}` : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Day detail sheet (inline, reusing Semana's logic) ───────────────────────
function DaySheet({ dateStr, onClose, schedule, history, routines, matches, weekTemplate }) {
  const [editing, setEditing] = useState(false);
  const d         = new Date(dateStr + 'T12:00:00');
  const isToday   = dateStr === TODAY;
  const day       = history[dateStr];
  const acts      = getDayActivities(dateStr, schedule, history, matches, weekTemplate);
  const dayMatches = matches.filter(m => m.date === dateStr);

  const sched = getScheduleEntry(schedule, dateStr);
  const assignedRoutineId = sched.routineId || weekTemplate?.[d.getDay()]?.routineId;
  const doneRoutine   = day?.done ? routines.find(r => r.id === day.routineId) : null;
  const planRoutine   = !day?.done && assignedRoutineId ? routines.find(r => r.id === assignedRoutineId) : null;
  const showRoutine   = doneRoutine || planRoutine;

  if (editing) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" style={{ padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setEditing(false)}>‹ Volver</button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              {DAY_FULL[d.getDay()]}, {d.getDate()} de {MONTHS_LO[d.getMonth()]}
            </span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '70vh' }}>
            <DayEditor dateStr={dateStr} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '20px 20px 28px' }}>
        <div className="modal-drag-handle" />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {DAY_FULL[d.getDay()]}
              </span>
              {isToday && (
                <span style={{ fontSize: 9, color: 'white', fontWeight: 700, background: 'var(--navy-800)', borderRadius: 5, padding: '2px 5px', letterSpacing: '0.06em' }}>
                  HOY
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {d.getDate()} de {MONTHS_LO[d.getMonth()]} {d.getFullYear()}
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: '5px 8px', color: '#94A3B8' }} onClick={onClose}>✕</button>
        </div>

        {/* Actividades */}
        {acts.map((act, i) => {
          let bg, label, detail, borderColor;
          if (act.type === 'indiv') {
            const r = routines.find(ro => ro.id === (day?.routineId || assignedRoutineId));
            bg = act.missed ? '#FEE2E2' : act.done ? '#D1FAE5' : '#E8EDF5';
            borderColor = act.missed ? C.indivMissed : C.indiv;
            label = r ? r.name : 'Entrenamiento individual';
            detail = act.done
              ? `✓ Completado · ${Object.values(day?.completed || {}).filter(Boolean).length} ejercicios`
              : act.missed ? 'No realizado' : 'Planificado';
          } else if (act.type === 'gym') {
            bg = '#E8EDF5'; borderColor = C.gym;
            label = 'Gimnasio';
            detail = act.done ? '✓ Completado' : 'Planificado';
          } else if (act.type === 'arsenal') {
            bg = '#F5EDE8'; borderColor = C.arsenal;
            label = 'Arsenal'; detail = 'Entrenamiento con el equipo';
          } else {
            bg = '#FDF4E3'; borderColor = C.match;
            label = act.match?.competition || 'Partido';
            detail = act.match
              ? `${act.match.result === 'ganamos' ? 'Ganamos' : act.match.result === 'perdimos' ? 'Perdimos' : 'Empate'}${act.match.minutes ? ` · ${act.match.minutes} min` : ''}`
              : 'Planificado';
          }
          return (
            <div key={i} style={{ background: bg, borderLeft: `4px solid ${borderColor}`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{detail}</div>
              {act.match?.notes && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{act.match.notes}</div>}
            </div>
          );
        })}

        {acts.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '12px 0' }}>
            Día sin actividad registrada
          </div>
        )}

        {day?.notes && (
          <div style={{ fontSize: 13, color: '#475569', background: '#F8FAFC', borderRadius: 8, padding: '9px 12px', borderLeft: '3px solid #E2E8F0', marginTop: 4, lineHeight: 1.5 }}>
            {day.notes}
          </div>
        )}

        <button className="btn btn-primary btn-full" style={{ marginTop: 14 }} onClick={() => setEditing(true)}>
          Editar día
        </button>
      </div>
    </div>
  );
}

// ── Main Calendario component ────────────────────────────────────────────────
export default function Calendario() {
  const { history, schedule, routines, matches, weekTemplate, weekTemplates, plans } = useStore();

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  const calDays = useMemo(() => {
    const first    = new Date(year, month, 1);
    const firstDow = first.getDay();
    const leadDays = firstDow === 0 ? 6 : firstDow - 1;
    const last     = new Date(year, month + 1, 0);
    const lastDow  = last.getDay();
    const trailDays = lastDow === 0 ? 0 : 7 - lastDow;
    const start    = new Date(year, month, 1 - leadDays);
    const total    = leadDays + last.getDate() + trailDays;
    const days     = [];
    for (let i = 0; i < total; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ dateStr: toDateStr(d), inMonth: d.getMonth() === month, dayNum: d.getDate() });
    }
    return days;
  }, [year, month]);

  return (
    <div className="page-content">
      {/* Month navigation */}
      <div className="cal-nav">
        <button className="wk-nav-btn" onClick={prevMonth}>‹</button>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {MONTHS_ES[month]} {year}
        </div>
        <button className="wk-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {/* Calendar grid */}
      <div className="cal-grid-wrap">
        {/* Headers */}
        <div className="cal-grid-headers">
          {DAY_HEADERS.map(h => (
            <div key={h} className="cal-grid-header">{h}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="cal-grid">
          {calDays.map(({ dateStr, inMonth, dayNum }) => {
            const isToday    = dateStr === TODAY;
            const isFuture   = dateStr > TODAY;
            const effTmpl    = getEffectiveTmpl(dateStr, plans, weekTemplates, weekTemplate);
            const acts       = getDayActivities(dateStr, schedule, history, matches, effTmpl);

            return (
              <div
                key={dateStr}
                className={`cal-cell-new${isToday ? ' cal-cell-today' : ''}${!inMonth ? ' cal-cell-out' : ''}`}
                onClick={() => inMonth && setSelectedDay(dateStr)}
              >
                <div className="cal-cell-num">{dayNum}</div>
                <CalDayBars acts={acts} isToday={isToday} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="wk-legend" style={{ borderTop: '1px solid var(--border-color)', marginTop: 0 }}>
        {[
          { color: C.indiv,   label: 'Individual' },
          { color: C.gym,     label: 'Gym' },
          { color: C.arsenal, label: 'Arsenal' },
          { color: C.match,   label: 'Partido' },
        ].map(({ color, label }) => (
          <div key={label} className="wk-legend-item">
            <div className="wk-legend-dot" style={{ background: color }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Month summary */}
      <MonthSummary
        year={year}
        month={month}
        schedule={schedule}
        history={history}
        weekTemplate={weekTemplate}
        weekTemplates={weekTemplates}
        plans={plans}
      />

      {/* Day detail sheet */}
      {selectedDay && (
        <DaySheet
          dateStr={selectedDay}
          onClose={() => setSelectedDay(null)}
          schedule={schedule}
          history={history}
          routines={routines}
          matches={matches}
          weekTemplate={getEffectiveTmpl(selectedDay, plans, weekTemplates, weekTemplate)}
        />
      )}
    </div>
  );
}
