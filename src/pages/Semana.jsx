import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { todayStr, toDateStr, getWeekDays } from '../utils/dates';
import { ChevronLeft } from '../components/Icons';
import DayEditor from '../components/DayEditor';

const TODAY = todayStr();

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MONTHS_FULL  = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAY_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAY_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const ACT_COLORS = {
  gym:     { bg: '#E6F1FB', title: '#0C447C', sub: '#185FA5' },
  indiv:   { bg: '#E1F5EE', title: '#085041', sub: '#0F6E56' },
  arsenal: { bg: '#FAEEDA', title: '#633806', sub: '#854F0B' },
  match:   { bg: '#FAECE7', title: '#712B13', sub: '#993C1D' },
};
const ACT_SHORT = { gym: 'Gym', indiv: 'Indiv.', arsenal: 'Arsenal', match: 'Partido' };

function getSlot(time) {
  if (!time || time < '13:00') return 'morning';
  if (time < '18:00') return 'afternoon';
  return 'evening';
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function getDayActivities(dateStr, schedule, history, matches, weekTemplate) {
  const dow  = new Date(dateStr + 'T12:00:00').getDay();
  const tmpl = weekTemplate?.[dow] || {};
  const day  = history[dateStr];
  const acts = [];

  // Gym
  if (day?.gym || tmpl.gym) {
    acts.push({
      type: 'gym',
      time: tmpl.gymTime || tmpl.time || '07:00',
      done: !!day?.gym,
      fromTemplate: !day?.gym && !!tmpl.gym,
    });
  }

  // Individual routine
  const schedId = schedule[dateStr];
  const histId  = day?.done ? day.routineId : null;
  const tmplId  = tmpl.routineId;
  if (histId || schedId || tmplId) {
    acts.push({
      type: 'indiv',
      time: tmpl.indivTime || '08:10',
      done: !!day?.done,
      missed: !day?.done && !!schedId && dateStr < TODAY,
      routineId: histId || schedId || tmplId,
      fromTemplate: !schedId && !day?.done && !!tmplId,
    });
  }

  // Arsenal
  if (tmpl.arsenal) {
    acts.push({
      type: 'arsenal',
      time: tmpl.arsenalTime || '19:30',
      done: false,
    });
  }

  // Matches (real data)
  const defaultMatchTime = dow === 6 ? '15:00' : dow === 0 ? '16:00' : '15:00';
  const dayMatches = matches.filter(m => m.date === dateStr);
  dayMatches.forEach(m => acts.push({
    type: 'match',
    time: tmpl.matchTime || defaultMatchTime,
    done: true,
    match: m,
  }));

  // Match from template only
  if (tmpl.match && dayMatches.length === 0) {
    acts.push({
      type: 'match',
      time: tmpl.matchTime || defaultMatchTime,
      done: false,
      fromTemplate: true,
    });
  }

  return acts.sort((a, b) => a.time.localeCompare(b.time));
}

// ── Grid activity block (tiny, inside the 7-col grid) ─────────────────────────
function ActBlock({ act }) {
  const c = ACT_COLORS[act.type];
  return (
    <div
      className="wk2-block"
      style={{ background: c.bg, opacity: act.fromTemplate && !act.done ? 0.55 : 1 }}
    >
      <span className="wk2-block-name" style={{ color: c.title }}>{ACT_SHORT[act.type]}</span>
      <span className="wk2-block-time" style={{ color: c.sub }}>{act.time}</span>
    </div>
  );
}

// ── Activity row in day detail ─────────────────────────────────────────────────
function ActivityRow({ act, routines }) {
  const c = ACT_COLORS[act.type];
  let title = '', subtitle = '';

  if (act.type === 'gym') {
    title = 'Gimnasio';
  } else if (act.type === 'indiv') {
    const r = routines.find(r => r.id === act.routineId);
    title = r ? r.name : 'Entrenamiento individual';
    if (r) {
      const phases = r.phases?.length || 0;
      const dur    = r.duration || '';
      subtitle = [phases > 0 ? `${phases} fases` : '', dur].filter(Boolean).join(' · ');
    }
  } else if (act.type === 'arsenal') {
    title = 'Arsenal';
    subtitle = 'Entrenamiento con el equipo';
  } else if (act.type === 'match') {
    title = act.match?.competition || 'Partido';
    if (act.match?.result) {
      const labels = { ganamos: 'Ganamos', perdimos: 'Perdimos', empate: 'Empate' };
      subtitle = labels[act.match.result] || '';
      if (act.match.minutes) subtitle += ` · ${act.match.minutes} min`;
    }
  }

  return (
    <div className="wk2-act-row">
      <div className="wk2-act-time">{act.time}</div>
      <div className="wk2-act-pill" style={{ background: c.bg }}>
        <div className="wk2-act-title" style={{ color: c.title }}>{title}</div>
        {subtitle && <div className="wk2-act-sub" style={{ color: c.sub }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function GapIndicator({ gapMins }) {
  const hrs = (gapMins / 60).toFixed(1).replace('.0', '');
  return (
    <div className="wk2-gap">
      <div className="wk2-gap-line" />
      <span className="wk2-gap-label">~{hrs} hs libre</span>
    </div>
  );
}

// ── Main Semana component ──────────────────────────────────────────────────────
export default function Semana() {
  const { routines, schedule, history, matches, weekTemplate, applyWeekTemplate } = useStore();

  const [weekOffset,      setWeekOffset]      = useState(0);
  const [selectedDateStr, setSelectedDateStr] = useState(TODAY);
  const [editing,         setEditing]         = useState(false);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays     = getWeekDays(baseDate);
  const weekDateStrs = weekDays.map(d => toDateStr(d));

  // When week changes: snap selection to today (if in current week) or Monday
  useEffect(() => {
    setSelectedDateStr(weekOffset === 0 ? TODAY : weekDateStrs[0]);
    // Auto-apply template when this week has no schedule entries
    if (weekTemplate && Object.keys(weekTemplate).length > 0) {
      const hasAny = weekDateStrs.some(ds => schedule[ds]);
      if (!hasAny) applyWeekTemplate(weekDateStrs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Pre-compute activities for each day in the week
  const dayActs = useMemo(() => {
    const map = {};
    weekDateStrs.forEach(ds => {
      map[ds] = getDayActivities(ds, schedule, history, matches, weekTemplate);
    });
    return map;
  }, [schedule, history, matches, weekTemplate, weekOffset]);

  // Week range label
  const d0 = weekDays[0], d6 = weekDays[6];
  const weekLabel = d0.getMonth() === d6.getMonth()
    ? `${d0.getDate()} — ${d6.getDate()} de ${MONTHS_FULL[d0.getMonth()]}`
    : `${d0.getDate()} ${MONTHS_SHORT[d0.getMonth()]} — ${d6.getDate()} ${MONTHS_SHORT[d6.getMonth()]}`;

  // Selected day data
  const selActs      = dayActs[selectedDateStr] || [];
  const selDate      = new Date(selectedDateStr + 'T12:00:00');
  const isSelToday   = selectedDateStr === TODAY;

  // Edit mode: full-page DayEditor
  if (editing) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 12px', background: 'white', borderBottom: '1px solid var(--border-color)' }}>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setEditing(false)}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            {DAY_FULL[selDate.getDay()]}, {selDate.getDate()} de {MONTHS_FULL[selDate.getMonth()]}
          </span>
        </div>
        <DayEditor dateStr={selectedDateStr} />
      </div>
    );
  }

  const FRANJAS = [
    { id: 'morning',   label: 'Mañana' },
    { id: 'afternoon', label: 'Tarde' },
    { id: 'evening',   label: 'Noche' },
  ];

  return (
    <div className="page-content">

      {/* ── Week navigation ── */}
      <div className="wk2-nav">
        <button className="wk2-nav-btn" onClick={() => setWeekOffset(o => o - 1)}>‹</button>
        <div className="wk2-nav-center">
          <div className="wk2-nav-label">{weekLabel}</div>
          {weekOffset !== 0 && (
            <button className="wk2-nav-today-btn" onClick={() => setWeekOffset(0)}>Hoy</button>
          )}
        </div>
        <button className="wk2-nav-btn" onClick={() => setWeekOffset(o => o + 1)}>›</button>
      </div>

      {/* ── Apply template banner ── */}
      {weekTemplate && Object.keys(weekTemplate).length > 0 && (
        <div className="wk2-apply-bar">
          <span>Semana tipo disponible</span>
          <button onClick={() => applyWeekTemplate(weekDateStrs)}>Aplicar</button>
        </div>
      )}

      {/* ── Weekly grid ── */}
      <div className="wk2-grid-wrap">
        <div className="wk2-grid">

          {/* Day name + number circles */}
          {weekDays.map((d, i) => {
            const ds    = weekDateStrs[i];
            const isSel = ds === selectedDateStr;
            const isTod = ds === TODAY;
            return (
              <div key={`h-${ds}`} className="wk2-day-col" onClick={() => setSelectedDateStr(ds)}>
                <div className="wk2-day-name">{DAY_SHORT[d.getDay()]}</div>
                <div className={`wk2-day-circle${isSel ? ' wk2-day-sel' : isTod ? ' wk2-day-tod' : ''}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}

          {/* Three time franjas */}
          {FRANJAS.map((franja, fi) => (
            <div key={franja.id} style={{ display: 'contents' }}>
              <div
                className={`wk2-franja-label${fi > 0 ? ' wk2-franja-sep' : ''}`}
                style={{ gridColumn: '1 / -1' }}
              >
                {franja.label}
              </div>
              {weekDateStrs.map(ds => {
                const acts = (dayActs[ds] || []).filter(a => getSlot(a.time) === franja.id);
                return (
                  <div
                    key={`${franja.id}-${ds}`}
                    className={`wk2-franja-cell${ds === selectedDateStr ? ' wk2-franja-cell-sel' : ''}`}
                    onClick={() => setSelectedDateStr(ds)}
                  >
                    {acts.length === 0
                      ? <span className="wk2-empty">—</span>
                      : acts.map((act, ai) => <ActBlock key={ai} act={act} />)
                    }
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="wk2-legend">
          {Object.entries(ACT_COLORS).map(([type, c]) => (
            <div key={type} className="wk2-legend-item">
              <div className="wk2-legend-dot" style={{ background: c.bg, borderColor: c.sub }} />
              <span style={{ color: c.title }}>{ACT_SHORT[type]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Day detail panel ── */}
      <div className="wk2-detail">
        <div className="wk2-detail-hdr">
          <div>
            <span className="wk2-detail-day">
              {DAY_FULL[selDate.getDay()]} {selDate.getDate()}
            </span>
            {isSelToday && <span className="wk2-detail-today"> · hoy</span>}
          </div>
          <span className="wk2-detail-count">
            {selActs.length === 0 ? 'Sin actividades' : `${selActs.length} actividad${selActs.length !== 1 ? 'es' : ''}`}
          </span>
        </div>

        {selActs.length === 0 ? (
          <div className="wk2-detail-empty">Descanso</div>
        ) : (
          selActs.map((act, i) => {
            const prev    = selActs[i - 1];
            const gapMins = prev ? timeToMinutes(act.time) - timeToMinutes(prev.time) : 0;
            return (
              <div key={i}>
                {gapMins > 120 && <GapIndicator gapMins={gapMins} />}
                <ActivityRow act={act} routines={routines} />
              </div>
            );
          })
        )}

        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary btn-full" onClick={() => setEditing(true)}>
            Editar día
          </button>
        </div>
      </div>

    </div>
  );
}
