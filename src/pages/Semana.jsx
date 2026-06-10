import { useState, useMemo, useEffect } from 'react';
import { useStore, computePlanWeeklyLog } from '../store/useStore';
import { toDateStr, getWeekDays } from '../utils/dates';
import { getDayActivities } from '../utils/activities';
import { ACT_COLORS } from '../utils/colors';
import { ChevronLeft, TrashIcon } from '../components/Icons';
import DayEditor from '../components/DayEditor';
import { useToday } from '../hooks/useToday';

const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MONTHS_FULL  = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAY_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAY_FULL  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const ACT_SHORT = { gym: 'Gym', indiv: 'Indiv.', arsenal: 'Arsenal', match: 'Partido' };
const ADD_LABEL = { gym: 'Gimnasio', indiv: 'Entrenamiento individual', arsenal: 'Arsenal' };
const ADD_DEFAULT_TIME = { gym: '07:00', indiv: '08:10', arsenal: '19:30' };

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

// ── Grid activity block (tiny, inside the 7-col grid) ─────────────────────────
function ActBlock({ act }) {
  const c = ACT_COLORS[act.type];
  const opacity = act.skipped ? 0.5 : (act.fromTemplate && !act.done ? 0.55 : 1);
  return (
    <div
      className="wk2-block"
      style={{ background: c.bg, opacity }}
    >
      <span className="wk2-block-name" style={{ color: c.title, textDecoration: act.skipped ? 'line-through' : 'none' }}>
        {ACT_SHORT[act.type]}
      </span>
      <span className="wk2-block-time" style={{ color: act.skipped ? '#DC2626' : c.sub }}>
        {act.skipped ? '✗' : act.time}
      </span>
    </div>
  );
}

// ── Activity row in day detail ─────────────────────────────────────────────────
function ActivityRow({ act, routines, onToggleSkip, isPastOrToday, onDelete, onSetTime }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  const canSkip = isPastOrToday && !act.done && (act.type === 'gym' || act.type === 'indiv');

  return (
    <div className="wk2-act-row">
      <div className="wk2-act-time">
        {onSetTime ? (
          <input
            type="time"
            value={act.time || ''}
            onChange={e => { if (e.target.value) onSetTime(act.type, e.target.value); }}
            onClick={e => e.stopPropagation()}
            style={{ width: 56, fontSize: 11, fontWeight: 600, color: '#475569', border: '1px solid #E2E8F0', borderRadius: 5, padding: '2px 3px', fontFamily: 'inherit', background: 'white', cursor: 'pointer' }}
          />
        ) : (
          <>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{act.time}</span>
            {act.type === 'match' && act.match && (
              <span style={{ display: 'block', fontSize: 9, color: '#94A3B8', marginTop: 2, lineHeight: 1.2 }}>
                Editar en<br />Partidos
              </span>
            )}
          </>
        )}
      </div>
      <div className="wk2-act-pill" style={{ background: c.bg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <div>
            <div className="wk2-act-title" style={{ color: c.title }}>{title}</div>
            {subtitle && <div className="wk2-act-sub" style={{ color: c.sub }}>{subtitle}</div>}
          </div>
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); act.done ? setConfirmDelete(true) : onDelete(); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '2px 0 2px 4px', lineHeight: 0, flexShrink: 0 }}
            >
              <TrashIcon size={13} />
            </button>
          )}
        </div>
        {act.skipped && (
          <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, marginTop: 4 }}>No realizado</div>
        )}
        {confirmDelete && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(220,38,38,0.07)', borderRadius: 6 }}>
            <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginBottom: 6 }}>
              Actividad completada. ¿Eliminarla igual?
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setConfirmDelete(false)} style={{ flex: 1, fontSize: 11, padding: '4px 0', borderRadius: 5, border: '1px solid #CBD5E1', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => { setConfirmDelete(false); onDelete(); }} style={{ flex: 1, fontSize: 11, fontWeight: 600, padding: '4px 0', borderRadius: 5, border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                Eliminar
              </button>
            </div>
          </div>
        )}
        {canSkip && !confirmDelete && (
          <button
            onClick={e => { e.stopPropagation(); onToggleSkip?.(act.type); }}
            style={{
              marginTop: 6, fontSize: 11, fontWeight: 600,
              padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
              border: act.skipped ? '1px solid #CBD5E1' : '1px solid #FCA5A5',
              background: act.skipped ? '#F1F5F9' : '#FEF2F2',
              color: act.skipped ? '#64748B' : '#DC2626',
              display: 'block',
            }}
          >
            {act.skipped ? 'Restablecer' : 'No hecho'}
          </button>
        )}
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
function getWeekMondayStr(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return toDateStr(d);
}

function getDatesBetween(startStr, endStr) {
  const dates = [];
  const d = new Date(startStr + 'T12:00:00');
  const end = new Date(endStr + 'T12:00:00');
  while (d <= end) {
    dates.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export default function Semana({ editToday = false, onConsumed }) {
  const { routines, schedule, history, matches, weekTemplate, weekTemplates, plans, applyWeekTemplate, clearWeekSchedule, toggleSkipActivity, removeActivityFromDay, setActivityTime, addActivityToDay } = useStore();

  const TODAY = useToday();
  const [weekOffset,      setWeekOffset]      = useState(0);
  const [selectedDateStr, setSelectedDateStr] = useState(TODAY);
  const [editing,         setEditing]         = useState(editToday);

  useEffect(() => {
    if (editToday && onConsumed) onConsumed();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply modal state
  const [showApplyModal,  setShowApplyModal]  = useState(false);
  const [applyTmplId,     setApplyTmplId]     = useState(() => weekTemplates.find(t => t.isDefault)?.id || '');
  const [applyRange,      setApplyRange]      = useState('week'); // 'week' | 'until' | 'all'
  const [applyUntilDate,  setApplyUntilDate]  = useState('');
  const [applyConfirm,    setApplyConfirm]    = useState(false);

  // Clear modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Add-activity modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep,      setAddStep]      = useState('choose'); // 'choose' | 'gym' | 'indiv' | 'arsenal'
  const [addTime,      setAddTime]      = useState('');
  const [addRoutineId, setAddRoutineId] = useState('');

  const baseDate = new Date(TODAY + 'T12:00:00');
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays     = getWeekDays(baseDate);
  const weekDateStrs = weekDays.map(d => toDateStr(d));

  // When week changes: snap selection to today (if in current week) or Monday
  useEffect(() => {
    setSelectedDateStr(weekOffset === 0 ? TODAY : weekDateStrs[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Pre-compute activities for each day in the week
  const dayActs = useMemo(() => {
    const map = {};
    weekDateStrs.forEach(ds => {
      // Use the active plan's template for this date if available, else the default template
      const planForDay = plans.find(p =>
        p.status !== 'completed' && p.weekTemplateId && p.startDate <= ds && p.endDate >= ds
      );
      const effTmpl = planForDay
        ? (weekTemplates.find(t => t.id === planForDay.weekTemplateId)?.days || weekTemplate)
        : weekTemplate;
      map[ds] = getDayActivities(ds, schedule, history, matches, effTmpl);
    });
    return map;
  }, [schedule, history, matches, weekTemplate, weekTemplates, plans, weekOffset, TODAY]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active plan info + template info for the viewed week
  const weekPlanInfo = useMemo(() => {
    const mon = weekDateStrs[0];
    const sun = weekDateStrs[6];
    const active = plans.filter(p => p.status !== 'completed' && p.startDate <= sun && p.endDate >= mon);
    const primary = active[active.length - 1] || null;
    const withTemplate = active.filter(p => p.weekTemplateId);
    const conflict = withTemplate.length > 1 && new Set(withTemplate.map(p => p.weekTemplateId)).size > 1;
    let weekNum = null, totalWeeks = null;
    if (primary) {
      const planMon = getWeekMondayStr(primary.startDate);
      totalWeeks = Math.max(1, Math.ceil(
        (new Date(primary.endDate + 'T12:00:00') - new Date(primary.startDate + 'T12:00:00')) / (7 * 86400000)
      ));
      // Clamp igual que getPlanProgress (evita mostrar Sem 7/6 en semanas parciales)
      weekNum = Math.min(totalWeeks, Math.max(1, Math.round(
        (new Date(mon + 'T12:00:00') - new Date(planMon + 'T12:00:00')) / (7 * 86400000)
      ) + 1));
    }
    // Which week template drives this week?
    let templateInfo = null;
    if (primary?.weekTemplateId) {
      const tmpl = weekTemplates.find(t => t.id === primary.weekTemplateId);
      if (tmpl) templateInfo = { name: tmpl.name, fromPlan: primary.name };
    }
    if (!templateInfo) {
      const defTmpl = weekTemplates.find(t => t.isDefault);
      if (defTmpl && Object.values(defTmpl.days || {}).some(d => d?.routineId || d?.gym || d?.arsenal || d?.match)) {
        templateInfo = { name: defTmpl.name, isDefault: true };
      }
    }
    return { primary, conflict, weekNum, totalWeeks, templateInfo };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans, weekTemplates, weekOffset, TODAY]);

  // Compensation info for viewed week
  const compensationInfo = useMemo(() => {
    const plan = weekPlanInfo.primary;
    if (!plan || (!plan.gymWeeklyFrequency && !plan.individualWeeklyFrequency)) return null;
    const log = computePlanWeeklyLog(plan, history);
    const mon = weekDateStrs[0];
    const entry = log.find(w => w.startDate <= mon && w.endDate >= mon);
    if (!entry || (entry.gymCompAvail === 0 && entry.indivCompAvail === 0)) return null;
    return entry;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekPlanInfo, history, weekOffset, TODAY]);

  // Week range label
  const d0 = weekDays[0], d6 = weekDays[6];
  const weekLabel = d0.getMonth() === d6.getMonth()
    ? `${d0.getDate()} — ${d6.getDate()} de ${MONTHS_FULL[d0.getMonth()]}`
    : `${d0.getDate()} ${MONTHS_SHORT[d0.getMonth()]} — ${d6.getDate()} ${MONTHS_SHORT[d6.getMonth()]}`;

  // Selected day data
  const selActs       = dayActs[selectedDateStr] || [];
  const selDate       = new Date(selectedDateStr + 'T12:00:00');
  const isSelToday    = selectedDateStr === TODAY;
  const isPastOrToday = selectedDateStr <= TODAY;

  // Tipos que se pueden agregar al día (los que aún no están)
  const addableTypes = ['gym', 'indiv', 'arsenal'].filter(t => !selActs.some(a => a.type === t));

  function openAddModal() {
    setAddStep('choose');
    setAddTime('');
    setAddRoutineId('');
    setShowAddModal(true);
  }

  function confirmAdd() {
    if (addStep === 'indiv') {
      if (!addRoutineId) return;
      addActivityToDay(selectedDateStr, 'indiv', { time: addTime || ADD_DEFAULT_TIME.indiv, routineId: addRoutineId });
    } else if (addStep === 'gym' || addStep === 'arsenal') {
      addActivityToDay(selectedDateStr, addStep, { time: addTime || ADD_DEFAULT_TIME[addStep] });
    }
    setShowAddModal(false);
  }

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

      {/* ── Template + plan banner ── */}
      <div style={{ padding: '3px 12px 5px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {weekPlanInfo.templateInfo ? (
          <span style={{ fontSize: 11, color: '#475569' }}>
            Semana tipo:{' '}
            <strong style={{ color: '#1D3461' }}>{weekPlanInfo.templateInfo.name}</strong>
            {weekPlanInfo.templateInfo.isDefault && <span style={{ color: '#94A3B8' }}> (predeterminada)</span>}
            {weekPlanInfo.templateInfo.fromPlan && <span style={{ color: '#64748B' }}> — {weekPlanInfo.templateInfo.fromPlan}</span>}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#94A3B8' }}>Sin semana tipo aplicada</span>
        )}
        {weekPlanInfo.primary && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
            background: 'var(--bg-selected)', color: 'var(--navy-600)',
          }}>
            Sem {weekPlanInfo.weekNum}/{weekPlanInfo.totalWeeks}
          </span>
        )}
        {compensationInfo && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
            background: '#FEF3C7', color: '#92400E',
          }}>
            Comp:{' '}
            {[
              compensationInfo.gymCompAvail   > 0 && `+${compensationInfo.gymCompAvail} gym`,
              compensationInfo.indivCompAvail > 0 && `+${compensationInfo.indivCompAvail} indiv`,
            ].filter(Boolean).join(', ')}
          </span>
        )}
        {weekPlanInfo.conflict && (
          <span style={{ fontSize: 10, fontWeight: 600, color: '#DC2626' }}>⚠ Conflicto</span>
        )}
      </div>

      {/* ── Action buttons ── */}
      {weekTemplates.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '6px 12px 2px' }}>
          <button
            onClick={() => { setApplyTmplId(weekTemplates.find(t => t.isDefault)?.id || weekTemplates[0]?.id || ''); setApplyRange('week'); setApplyUntilDate(''); setShowApplyModal(true); }}
            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #CBD5E1', background: 'white', fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Aplicar semana tipo
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid #CBD5E1', background: 'white', fontSize: 12, fontWeight: 600, color: '#EF5350', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Limpiar semana
          </button>
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
                <ActivityRow
                  act={act}
                  routines={routines}
                  isPastOrToday={isPastOrToday}
                  onToggleSkip={(actType) => toggleSkipActivity(selectedDateStr, actType)}
                  onDelete={!(act.type === 'match' && act.done) ? () => removeActivityFromDay(selectedDateStr, act.type) : undefined}
                  onSetTime={!(act.type === 'match' && act.done) ? (actType, t) => setActivityTime(selectedDateStr, actType, t) : undefined}
                />
              </div>
            );
          })
        )}

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {addableTypes.length > 0 && (
            <button className="btn btn-secondary btn-full" onClick={openAddModal}>
              + Agregar actividad
            </button>
          )}
          <button className="btn btn-primary btn-full" onClick={() => setEditing(true)}>
            Editar día
          </button>
        </div>
      </div>

      {/* ── Apply modal ── */}
      {showApplyModal && (() => {
        const selectedTmpl = weekTemplates.find(t => t.id === applyTmplId);

        let affectedDates = [];
        if (applyRange === 'week') {
          affectedDates = weekDateStrs;
        } else if (applyRange === 'until' && applyUntilDate) {
          const fromMonday = weekDateStrs[0];
          const untilWeekEnd = (() => {
            const d = new Date(applyUntilDate + 'T12:00:00');
            const dow = d.getDay();
            d.setDate(d.getDate() + (dow === 0 ? 0 : 7 - dow));
            return toDateStr(d);
          })();
          affectedDates = getDatesBetween(fromMonday, untilWeekEnd);
        } else if (applyRange === 'all') {
          const fromMonday = weekDateStrs[0];
          const until = new Date(fromMonday + 'T12:00:00');
          until.setDate(until.getDate() + 12 * 7 - 1);
          affectedDates = getDatesBetween(fromMonday, toDateStr(until));
        }
        const affectedWeeks = Math.max(1, Math.ceil(affectedDates.length / 7));

        function doApply() {
          if (!selectedTmpl) return;
          applyWeekTemplate(affectedDates, selectedTmpl.days);
          setApplyConfirm(false);
          setShowApplyModal(false);
        }

        return (
          <div className="modal-overlay" onClick={() => { setShowApplyModal(false); setApplyConfirm(false); }}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '20px 20px 28px' }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#263238', marginBottom: 14 }}>
                Aplicar semana tipo
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Semana tipo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {weekTemplates.map(t => (
                  <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: applyTmplId === t.id ? '#E8EDF5' : '#F8FAFC', border: `1.5px solid ${applyTmplId === t.id ? '#1D3461' : 'transparent'}`, cursor: 'pointer' }}>
                    <input type="radio" name="tmpl" value={t.id} checked={applyTmplId === t.id} onChange={() => setApplyTmplId(t.id)} style={{ accentColor: '#1D3461' }} />
                    <span style={{ fontSize: 13, fontWeight: applyTmplId === t.id ? 700 : 400, color: '#263238' }}>{t.name}</span>
                    {t.isDefault && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99, background: '#1D3461', color: 'white', marginLeft: 'auto' }}>DEFAULT</span>}
                  </label>
                ))}
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Rango
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {[
                  { id: 'week', label: 'Solo esta semana' },
                  { id: 'until', label: 'Desde esta semana hasta…' },
                  { id: 'all', label: 'Las próximas 12 semanas' },
                ].map(opt => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="radio" name="range" value={opt.id} checked={applyRange === opt.id} onChange={() => setApplyRange(opt.id)} style={{ accentColor: '#1D3461' }} />
                    <span style={{ fontSize: 13, color: '#263238' }}>{opt.label}</span>
                  </label>
                ))}
                {applyRange === 'until' && (
                  <input type="date" className="input" value={applyUntilDate} min={weekDateStrs[0]}
                    onChange={e => setApplyUntilDate(e.target.value)} style={{ marginTop: 2 }} />
                )}
              </div>

              {applyConfirm ? (
                <div style={{ background: '#FEF3C7', borderRadius: 10, padding: '12px', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, color: '#92400E', fontWeight: 600, marginBottom: 10 }}>
                    Esto va a reemplazar las rutinas de {affectedWeeks} semana{affectedWeeks !== 1 ? 's' : ''}. ¿Continuar?
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setApplyConfirm(false)} className="btn btn-secondary" style={{ flex: 1 }}>Volver</button>
                    <button onClick={doApply} className="btn btn-primary" style={{ flex: 1 }}>Confirmar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowApplyModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                  <button
                    onClick={() => { if (!selectedTmpl || (applyRange === 'until' && !applyUntilDate)) return; setApplyConfirm(true); }}
                    className="btn btn-primary" style={{ flex: 2 }}
                    disabled={!selectedTmpl || (applyRange === 'until' && !applyUntilDate)}
                  >
                    Aplicar{affectedWeeks > 1 ? ` (${affectedWeeks} sem)` : ''}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Clear confirm ── */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#263238', marginBottom: 10 }}>Limpiar semana</div>
            <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
              Se van a borrar todas las rutinas asignadas a esta semana. ¿Continuar?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowClearConfirm(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, background: '#EF5350', borderColor: '#EF5350' }}
                onClick={() => { clearWeekSchedule(weekDateStrs); setShowClearConfirm(false); }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add activity modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '20px 20px 28px' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#263238', marginBottom: 4 }}>
              Agregar actividad
            </div>
            <div style={{ fontSize: 13, color: '#78909C', marginBottom: 16 }}>
              {DAY_FULL[selDate.getDay()]} {selDate.getDate()} de {MONTHS_FULL[selDate.getMonth()]}
            </div>

            {addStep === 'choose' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {addableTypes.map(t => {
                  const c = ACT_COLORS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => { setAddStep(t); setAddTime(ADD_DEFAULT_TIME[t]); setAddRoutineId(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 10, border: '1px solid #E2E8F0', background: c.bg, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.sub, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: c.title }}>{ADD_LABEL[t]}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {(addStep === 'gym' || addStep === 'arsenal') && (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#263238', marginBottom: 12 }}>{ADD_LABEL[addStep]}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Horario</span>
                  <input
                    type="time" value={addTime} onChange={e => setAddTime(e.target.value)}
                    style={{ fontSize: 14, border: '1.5px solid #CBD5E1', borderRadius: 6, padding: '6px 8px', fontFamily: 'inherit', background: 'white', color: '#263238' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAddStep('choose')}>Volver</button>
                  <button className="btn btn-primary" style={{ flex: 2 }} onClick={confirmAdd}>Agregar</button>
                </div>
              </>
            )}

            {addStep === 'indiv' && (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#263238', marginBottom: 10 }}>Elegí una rutina</div>
                {routines.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#78909C', marginBottom: 14 }}>No hay rutinas creadas.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, maxHeight: '40vh', overflowY: 'auto' }}>
                    {routines.map(r => {
                      const sel = addRoutineId === r.id;
                      const totalEx = r.phases.reduce((s, p) => s + (p.exercises?.length || 0), 0);
                      return (
                        <button
                          key={r.id} onClick={() => setAddRoutineId(r.id)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: sel ? '#E8EDF5' : '#F8FAFC', border: `1.5px solid ${sel ? '#1D3461' : 'transparent'}`, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                        >
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#263238' }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: '#78909C' }}>{r.duration ? `${r.duration} · ` : ''}{totalEx} ejercicios</div>
                          </div>
                          {sel && <span style={{ color: 'var(--emerald-600)', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Horario</span>
                  <input
                    type="time" value={addTime} onChange={e => setAddTime(e.target.value)}
                    style={{ fontSize: 14, border: '1.5px solid #CBD5E1', borderRadius: 6, padding: '6px 8px', fontFamily: 'inherit', background: 'white', color: '#263238' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAddStep('choose')}>Volver</button>
                  <button className="btn btn-primary" style={{ flex: 2 }} onClick={confirmAdd} disabled={!addRoutineId}>Agregar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
