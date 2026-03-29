import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { todayStr, toDateStr } from '../utils/dates';
import { ChevronLeft } from '../components/Icons';
import DayEditor from '../components/DayEditor';

const TODAY = todayStr();
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_HEADERS = ['L','M','X','J','V','S','D'];
const DAY_NAMES_FULL = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const RESULT_COLORS  = { ganamos: '#2E7D32', perdimos: '#C62828', empate: '#F57F17' };
const RESULT_LABELS  = { ganamos: 'Ganamos',  perdimos: 'Perdimos',  empate: 'Empate'  };

function getDayIndicators(dateStr, history, schedule, routines, matches) {
  const day = history[dateStr];
  const inds = [];

  if (day?.done) {
    const r = routines.find(r => r.id === day.routineId);
    inds.push({ bg: '#C8E6C9', color: '#1B5E20', label: r ? r.name[0].toUpperCase() : '✓' });
  } else if (schedule[dateStr]) {
    const r = routines.find(r => r.id === schedule[dateStr]);
    const missed = dateStr < TODAY;
    inds.push({
      bg: missed ? '#FFCDD2' : '#DCEDC8',
      color: missed ? '#B71C1C' : '#33691E',
      label: r ? r.name[0].toUpperCase() : '?',
    });
  }

  if (day?.gym) inds.push({ bg: '#BBDEFB', color: '#0D47A1', label: 'G' });

  if (matches.some(m => m.date === dateStr))
    inds.push({ bg: '#FFE0B2', color: '#BF360C', label: 'P' });

  return inds;
}

export default function Calendario() {
  const { history, schedule, routines } = useStore();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingDay, setEditingDay]   = useState(null);
  const [matches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('matches') || '[]'); } catch { return []; }
  });

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)); }

  const calDays = useMemo(() => {
    const first   = new Date(year, month, 1);
    const firstDow = first.getDay();
    const leadDays = firstDow === 0 ? 6 : firstDow - 1;
    const last     = new Date(year, month + 1, 0);
    const lastDow  = last.getDay();
    const trailDays = lastDow === 0 ? 0 : 7 - lastDow;
    const start = new Date(year, month, 1 - leadDays);
    const total = leadDays + last.getDate() + trailDays;
    const days = [];
    for (let i = 0; i < total; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ dateStr: toDateStr(d), inMonth: d.getMonth() === month, dayNum: d.getDate() });
    }
    return days;
  }, [year, month]);

  // ── Vista editor completo ──────────────────────────────────────────────
  if (editingDay) {
    const d = new Date(editingDay + 'T12:00:00');
    return (
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0' }}>
          <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={() => setEditingDay(null)}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#263238' }}>
              {DAY_NAMES_FULL[d.getDay()]}
              {editingDay === TODAY && (
                <span style={{ fontSize: 11, color: '#2E7D32', fontWeight: 700, marginLeft: 8 }}>HOY</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#78909C' }}>
              {d.getDate()} de {MONTHS_ES[d.getMonth()].toLowerCase()} {d.getFullYear()}
            </div>
          </div>
        </div>
        <DayEditor dateStr={editingDay} />
      </div>
    );
  }

  // ── Vista calendario ───────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Navegación de mes */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹ Ant.</button>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', letterSpacing: '-0.01em' }}>
          {MONTHS_ES[month]} {year}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Sig. ›</button>
      </div>

      {/* Grilla */}
      <div style={{ padding: '0 10px' }}>
        {/* Headers L M X J V S D */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 3 }}>
          {DAY_HEADERS.map(h => (
            <div key={h} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#78909C', padding: '3px 0' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {calDays.map(({ dateStr, inMonth, dayNum }) => {
            const isToday    = dateStr === TODAY;
            const isSelected = dateStr === selectedDay;
            const indicators = getDayIndicators(dateStr, history, schedule, routines, matches);

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                style={{
                  minHeight: 50,
                  padding: '4px 2px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isToday ? '#E8F5E9' : isSelected ? '#F1F8F1' : '#FAFAFA',
                  border: isToday ? '2px solid #1B5E20' : isSelected ? '2px solid #A5D6A7' : '1px solid #F0F4F0',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  opacity: inMonth ? 1 : 0.3,
                  transition: 'border-color 0.1s',
                }}
              >
                <div style={{
                  fontSize: 12, lineHeight: 1,
                  fontWeight: isToday ? 800 : 400,
                  color: isToday ? '#1B5E20' : '#263238',
                }}>
                  {dayNum}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                  {indicators.slice(0, 3).map((ind, i) => (
                    <div key={i} style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: ind.bg, color: ind.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, fontWeight: 800,
                    }}>
                      {ind.label}
                    </div>
                  ))}
                  {indicators.length > 3 && (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#E0E0E0', color: '#757575', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 800 }}>
                      +{indicators.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '10px 10px 0' }}>
        {[
          { bg: '#C8E6C9', color: '#1B5E20', label: 'Completado' },
          { bg: '#DCEDC8', color: '#33691E', label: 'Planificado' },
          { bg: '#FFCDD2', color: '#B71C1C', label: 'No hecho' },
          { bg: '#BBDEFB', color: '#0D47A1', label: 'Gym' },
          { bg: '#FFE0B2', color: '#BF360C', label: 'Partido' },
        ].map(({ bg, color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: bg, border: `1px solid ${color}20` }} />
            <span style={{ fontSize: 11, color: '#78909C' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Sheet detalle del día */}
      {selectedDay && (() => {
        const d           = new Date(selectedDay + 'T12:00:00');
        const dayHistory  = history[selectedDay];
        const assignedId  = schedule[selectedDay];
        const doneRoutine = dayHistory?.done ? routines.find(r => r.id === dayHistory.routineId) : null;
        const planRoutine = assignedId ? routines.find(r => r.id === assignedId) : null;
        const showRoutine = doneRoutine || planRoutine;
        const dayMatches  = matches.filter(m => m.date === selectedDay);
        const isToday     = selectedDay === TODAY;

        return (
          <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '20px 20px 32px' }}>
              {/* Encabezado */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: '#263238' }}>
                    {DAY_NAMES_FULL[d.getDay()]}
                    {isToday && <span style={{ fontSize: 11, color: '#2E7D32', fontWeight: 700, marginLeft: 8 }}>HOY</span>}
                  </div>
                  <div style={{ fontSize: 13, color: '#78909C' }}>
                    {d.getDate()} de {MONTHS_ES[d.getMonth()].toLowerCase()} {d.getFullYear()}
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: '3px 7px', fontSize: 16 }} onClick={() => setSelectedDay(null)}>✕</button>
              </div>

              {/* Rutina */}
              {showRoutine ? (
                <div style={{ background: '#F5F7F5', borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#78909C', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rutina</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#263238' }}>{showRoutine.name}</div>
                  <div style={{ fontSize: 12, color: '#78909C', marginTop: 2 }}>
                    {dayHistory?.done
                      ? `✓ Completado · ${Object.values(dayHistory.completed || {}).filter(Boolean).length} ejercicios`
                      : selectedDay < TODAY ? 'No realizado' : 'Planificado'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#B0BEC5', marginBottom: 10 }}>Sin rutina asignada</div>
              )}

              {/* Gym */}
              {dayHistory?.gym && (
                <div style={{ fontSize: 13, color: '#1565C0', fontWeight: 600, marginBottom: 10 }}>
                  💪 Fue al gym
                </div>
              )}

              {/* Partidos */}
              {dayMatches.map(match => (
                <div key={match.id} style={{ background: '#FFF8F0', borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#E65100', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Partido</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#263238' }}>{match.competition}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: RESULT_COLORS[match.result] }}>
                      {RESULT_LABELS[match.result]}
                    </span>
                  </div>
                  {match.minutes && <div style={{ fontSize: 11, color: '#78909C', marginTop: 2 }}>{match.minutes} min jugados</div>}
                  {match.notes && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{match.notes}</div>}
                </div>
              ))}

              {/* Notas del día */}
              {dayHistory?.notes && (
                <div style={{ fontSize: 13, color: '#374151', background: '#f9fafb', borderRadius: 8, padding: '8px 10px', borderLeft: '2px solid #e5e7eb', marginBottom: 10 }}>
                  {dayHistory.notes}
                </div>
              )}

              {/* Sin actividad */}
              {!showRoutine && !dayHistory?.gym && dayMatches.length === 0 && (
                <div style={{ fontSize: 13, color: '#B0BEC5', textAlign: 'center', padding: '8px 0 12px' }}>
                  Día sin actividad registrada
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 4 }}
                onClick={() => { setSelectedDay(null); setEditingDay(selectedDay); }}
              >
                Editar día
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
