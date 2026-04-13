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
const RESULT_COLORS  = { ganamos: '#059669', perdimos: '#DC2626', empate: '#D97706' };
const RESULT_LABELS  = { ganamos: 'Ganamos', perdimos: 'Perdimos', empate: 'Empate' };

function getDayIndicators(dateStr, history, schedule, routines, matches) {
  const day = history[dateStr];
  const inds = [];

  if (day?.done) {
    const r = routines.find(r => r.id === day.routineId);
    inds.push({ bg: '#A7F3D0', color: '#065F46', label: r ? r.name[0].toUpperCase() : '✓' });
  } else if (schedule[dateStr]) {
    const r = routines.find(r => r.id === schedule[dateStr]);
    const missed = dateStr < TODAY;
    inds.push({
      bg: missed ? '#FECACA' : '#BFDBFE',
      color: missed ? '#991B1B' : '#1E40AF',
      label: r ? r.name[0].toUpperCase() : '?',
    });
  }

  if (day?.gym) inds.push({ bg: '#E8EDF5', color: '#1D3461', label: 'G' });
  if (matches.some(m => m.date === dateStr))
    inds.push({ bg: '#FEF3C7', color: '#92400E', label: 'P' });

  return inds;
}

export default function Calendario() {
  const { history, schedule, routines, matches } = useStore();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [editingDay, setEditingDay]   = useState(null);

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

  // ── Vista editor completo ──────────────────────────────────────────────
  if (editingDay) {
    const d = new Date(editingDay + 'T12:00:00');
    return (
      <div className="page-content">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', background: 'white',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={() => setEditingDay(null)}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#1A2332', letterSpacing: '-0.02em' }}>
              {DAY_NAMES_FULL[d.getDay()]}
              {editingDay === TODAY && (
                <span style={{
                  fontSize: 10, color: 'white', fontWeight: 700,
                  background: '#0A1628', borderRadius: 6, padding: '2px 6px', marginLeft: 8,
                }}>
                  HOY
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {d.getDate()} de {MONTHS_ES[d.getMonth()].toLowerCase()} {d.getFullYear()}
            </div>
          </div>
        </div>
        <DayEditor dateStr={editingDay} />
      </div>
    );
  }

  // ── Vista calendario ──────────────────────────────────────────────────
  return (
    <div className="page-content">
      {/* Navegación de mes */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 12px', background: 'white',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹ Ant.</button>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#1A2332', letterSpacing: '-0.02em' }}>
          {MONTHS_ES[month]} {year}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>Sig. ›</button>
      </div>

      {/* Grilla */}
      <div style={{ padding: '12px 12px 4px', background: 'white' }}>
        {/* Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
          {DAY_HEADERS.map(h => (
            <div key={h} style={{
              textAlign: 'center', fontSize: 10, fontWeight: 700,
              color: '#94A3B8', padding: '3px 0',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {calDays.map(({ dateStr, inMonth, dayNum }) => {
            const isToday    = dateStr === TODAY;
            const isSelected = dateStr === selectedDay;
            const indicators = getDayIndicators(dateStr, history, schedule, routines, matches);

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                style={{
                  minHeight: 52,
                  padding: '5px 2px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: isToday ? '#0A1628' : isSelected ? '#EEF2F7' : '#FAFAFA',
                  border: isToday ? 'none' : isSelected ? '2px solid #1D3461' : '1px solid #EEF2F7',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  opacity: inMonth ? 1 : 0.28,
                  transition: 'all 0.1s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{
                  fontSize: 13, lineHeight: 1,
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? 'white' : '#1A2332',
                }}>
                  {dayNum}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                  {indicators.slice(0, 3).map((ind, i) => (
                    <div key={i} style={{
                      width: 13, height: 13, borderRadius: '50%',
                      background: ind.bg, color: ind.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, fontWeight: 800,
                    }}>
                      {ind.label}
                    </div>
                  ))}
                  {indicators.length > 3 && (
                    <div style={{
                      width: 13, height: 13, borderRadius: '50%',
                      background: '#E0E0E0', color: '#757575',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 7, fontWeight: 800,
                    }}>
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '10px 14px 6px', background: 'white' }}>
        {[
          { bg: '#A7F3D0', color: '#065F46', label: 'Completado' },
          { bg: '#BFDBFE', color: '#1E40AF', label: 'Planificado' },
          { bg: '#FECACA', color: '#991B1B', label: 'No hecho' },
          { bg: '#E8EDF5', color: '#1D3461', label: 'Gym' },
          { bg: '#FEF3C7', color: '#92400E', label: 'Partido' },
        ].map(({ bg, color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: bg }} />
            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>{label}</span>
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
              <div className="modal-drag-handle" />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: '#1A2332', letterSpacing: '-0.02em' }}>
                    {DAY_NAMES_FULL[d.getDay()]}
                    {isToday && (
                      <span style={{
                        fontSize: 10, color: 'white', fontWeight: 700,
                        background: '#0A1628', borderRadius: 6, padding: '2px 6px', marginLeft: 8,
                      }}>
                        HOY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                    {d.getDate()} de {MONTHS_ES[d.getMonth()].toLowerCase()} {d.getFullYear()}
                  </div>
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '5px 8px', color: '#94A3B8' }}
                  onClick={() => setSelectedDay(null)}
                >
                  ✕
                </button>
              </div>

              {/* Rutina */}
              {showRoutine ? (
                <div style={{
                  background: '#F8FAFC', borderRadius: 12,
                  padding: '11px 14px', marginBottom: 10,
                  border: '1px solid #E2E8F0',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Rutina
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2332' }}>{showRoutine.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>
                    {dayHistory?.done
                      ? `✓ Completado · ${Object.values(dayHistory.completed || {}).filter(Boolean).length} ejercicios`
                      : selectedDay < TODAY ? 'No realizado' : 'Planificado'}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Sin rutina asignada</div>
              )}

              {/* Gym */}
              {dayHistory?.gym && (
                <div style={{
                  fontSize: 13, color: '#1565C0', fontWeight: 700,
                  marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  💪 Fue al gimnasio
                </div>
              )}

              {/* Partidos */}
              {dayMatches.map(match => (
                <div key={match.id} style={{
                  background: '#FFF8F0', borderRadius: 10,
                  padding: '10px 12px', marginBottom: 8,
                  border: '1px solid #FFE0B2',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#E65100', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Partido
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#1A2332', fontWeight: 600 }}>{match.competition}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: RESULT_COLORS[match.result] }}>
                      {RESULT_LABELS[match.result]}
                    </span>
                  </div>
                  {match.minutes && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>{match.minutes} min jugados</div>
                  )}
                  {match.notes && (
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 5 }}>{match.notes}</div>
                  )}
                </div>
              ))}

              {/* Notas */}
              {dayHistory?.notes && (
                <div style={{
                  fontSize: 13, color: '#475569',
                  background: '#F8FAFC', borderRadius: 8,
                  padding: '9px 12px', borderLeft: '3px solid #E2E8F0',
                  marginBottom: 12, lineHeight: 1.5,
                }}>
                  {dayHistory.notes}
                </div>
              )}

              {/* Sin actividad */}
              {!showRoutine && !dayHistory?.gym && dayMatches.length === 0 && (
                <div style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '10px 0 14px' }}>
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
