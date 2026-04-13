import { useState } from 'react';
import { useStore } from '../store/useStore';
import { todayStr, toDateStr, getWeekDays, formatDateShort } from '../utils/dates';
import { ChevronLeft, GymIcon } from '../components/Icons';
import DayEditor from '../components/DayEditor';

const TODAY = todayStr();

function getDayStatus(dateStr, schedule, history) {
  const day = history[dateStr];
  if (day?.done) return 'done';
  if (schedule[dateStr]) {
    if (dateStr < TODAY) return 'missed';
    return dateStr === TODAY ? 'pending' : 'planned';
  }
  return 'rest';
}

const STATUS_CONFIG = {
  done:    { label: 'Completado',  badgeClass: 'badge-green', barColor: '#43A047' },
  missed:  { label: 'No hecho',   badgeClass: 'badge-red',   barColor: '#EF5350' },
  pending: { label: 'Pendiente',  badgeClass: 'badge-yellow', barColor: '#F9A825' },
  planned: { label: 'Planificado', badgeClass: 'badge-blue', barColor: '#1976D2' },
  rest:    { label: 'Descanso',   badgeClass: 'badge-gray',  barColor: '#CBD5E1' },
};

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DAY_NAMES_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function Semana() {
  const { routines, schedule, history } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(baseDate);
  const weekDateStrs = weekDays.map(d => toDateStr(d));

  const planned = weekDateStrs.filter(d => !!schedule[d]).length;
  const done    = weekDateStrs.filter(d => history[d]?.done).length;
  const missed  = weekDateStrs.filter(d => getDayStatus(d, schedule, history) === 'missed').length;
  const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;

  let streak = 0;
  const checkDate = new Date();
  for (let i = 0; i < 60; i++) {
    const ds = toDateStr(checkDate);
    if (history[ds]?.done) streak++;
    else if (ds <= TODAY) break;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Vista de detalle de un día
  if (selectedDay) {
    const d = new Date(selectedDay + 'T12:00:00');
    const dayName = DAY_NAMES_FULL[d.getDay()];
    const dayNum = d.getDate();
    const monthNames = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const dateLabel = `${dayNum} de ${monthNames[d.getMonth()]}`;
    const isToday = selectedDay === TODAY;

    return (
      <div className="page-content">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px 0', background: 'white',
          borderBottom: '1px solid #E2E8F0', marginBottom: 4,
        }}>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 8px' }}
            onClick={() => setSelectedDay(null)}
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#1A2332', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {dayName}
              {isToday && (
                <span style={{
                  fontSize: 10, color: 'white', fontWeight: 700,
                  background: '#1B5E20', borderRadius: 6,
                  padding: '2px 6px', marginLeft: 8,
                }}>
                  HOY
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{dateLabel}</div>
          </div>
        </div>
        <DayEditor dateStr={selectedDay} />
      </div>
    );
  }

  // Vista semanal
  return (
    <div className="page-content">
      {/* Navegación de semana */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px', background: 'white',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o - 1)}>
          ‹ Anterior
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#1A2332', letterSpacing: '-0.01em' }}>
            {weekOffset === 0 ? 'Esta semana'
              : weekOffset === -1 ? 'Semana pasada'
              : weekOffset < 0 ? `Hace ${Math.abs(weekOffset)} semanas`
              : weekOffset === 1 ? 'Semana que viene'
              : `En ${weekOffset} semanas`}
          </div>
          {weekOffset !== 0 && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: 11, padding: '2px 6px', color: '#1B5E20', marginTop: 2 }}
              onClick={() => setWeekOffset(0)}
            >
              Volver a hoy
            </button>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o + 1)}>
          Siguiente ›
        </button>
      </div>

      {/* Métricas */}
      <div className="metrics-row" style={{ marginTop: 14 }}>
        <div className="metric-card">
          <div className="metric-value">{pct}%</div>
          <div className="metric-label">Cumplimiento</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{done}{planned > 0 ? `/${planned}` : ''}</div>
          <div className="metric-label">Completados</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: streak > 0 ? '#2E7D32' : undefined }}>
            {streak > 0 ? `${streak}🔥` : streak}
          </div>
          <div className="metric-label">Racha</div>
        </div>
      </div>

      {/* Tarjetas de días */}
      {weekDateStrs.map((dateStr, idx) => {
        const d = weekDays[idx];
        const isToday = dateStr === TODAY;
        const status = getDayStatus(dateStr, schedule, history);
        const statusCfg = STATUS_CONFIG[status];
        const assignedId = schedule[dateStr];
        const routine = routines.find(r => r.id === assignedId);
        const dayHistory = history[dateStr];
        const gymDone = dayHistory?.gym;
        const doneExCount = Object.values(dayHistory?.completed || {}).filter(Boolean).length;

        return (
          <div
            key={dateStr}
            className={`day-card${isToday ? ' today' : ''}`}
            onClick={() => setSelectedDay(dateStr)}
          >
            {/* Status bar */}
            <div className="day-card-status-bar" style={{ background: statusCfg.barColor }} />

            {/* Día */}
            <div style={{ width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {DAY_NAMES_SHORT[d.getDay()]}
              </div>
              <div style={{
                fontSize: 22, fontWeight: 800,
                color: isToday ? '#1B5E20' : '#1A2332',
                lineHeight: 1.1, letterSpacing: '-0.02em',
              }}>
                {d.getDate()}
              </div>
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <span className={`badge ${statusCfg.badgeClass}`}>{statusCfg.label}</span>
                {isToday && (
                  <span style={{
                    fontSize: 9, color: 'white', fontWeight: 700,
                    background: '#1B5E20', borderRadius: 5, padding: '1px 5px',
                    letterSpacing: '0.06em',
                  }}>
                    HOY
                  </span>
                )}
                {gymDone && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: 10, color: '#1565C0', fontWeight: 700,
                    background: '#E3F2FD', padding: '2px 7px', borderRadius: 99,
                  }}>
                    <GymIcon size={10} /> Gym
                  </span>
                )}
              </div>

              {routine ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A2332', lineHeight: 1.3 }}>
                    {routine.name}
                  </div>
                  {status === 'done' && doneExCount > 0 && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {doneExCount} ejercicios completados
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94A3B8' }}>
                  {gymDone ? 'Solo gimnasio' : 'Descanso'}
                </div>
              )}
            </div>

            {/* Flecha */}
            <div style={{ color: '#CBD5E1', fontSize: 18, alignSelf: 'center', fontWeight: 300 }}>›</div>
          </div>
        );
      })}
    </div>
  );
}
