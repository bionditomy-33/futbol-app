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
  done:    { label: 'Completado',  badgeClass: 'badge-green' },
  missed:  { label: 'No hecho',    badgeClass: 'badge-red' },
  pending: { label: 'Pendiente',   badgeClass: 'badge-yellow' },
  planned: { label: 'Planificado', badgeClass: 'badge-blue' },
  rest:    { label: 'Descanso',    badgeClass: 'badge-gray' },
};

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const DAY_NAMES_FULL  = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function Semana() {
  const { routines, schedule, history } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null); // dateStr | null

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
        {/* Header con volver */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0' }}>
          <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={() => setSelectedDay(null)}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#263238', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {dayName}
              {isToday && <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 700, marginLeft: 8 }}>HOY</span>}
            </div>
            <div style={{ fontSize: 13, color: '#78909C' }}>{dateLabel}</div>
          </div>
        </div>

        {/* Editor completo del día */}
        <DayEditor dateStr={selectedDay} />
      </div>
    );
  }

  // Vista semanal
  return (
    <div className="page-content">
      {/* Navegación de semana */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o - 1)}>
          ‹ Anterior
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#263238' }}>
            {weekOffset === 0 ? 'Esta semana'
              : weekOffset === -1 ? 'Semana pasada'
              : weekOffset < 0 ? `Hace ${Math.abs(weekOffset)} semanas`
              : weekOffset === 1 ? 'Semana que viene'
              : `En ${weekOffset} semanas`}
          </div>
          {weekOffset !== 0 && (
            <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px', color: '#1B5E20' }} onClick={() => setWeekOffset(0)}>
              Volver a hoy
            </button>
          )}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(o => o + 1)}>
          Siguiente ›
        </button>
      </div>

      {/* Métricas de la semana */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-value">{pct}%</div>
          <div className="metric-label">Cumplimiento</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{done}/{planned || '—'}</div>
          <div className="metric-label">Completados</div>
        </div>
        <div className="metric-card">
          <div className="metric-value" style={{ color: streak > 0 ? '#2E7D32' : undefined }}>{streak}</div>
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

        return (
          <div
            key={dateStr}
            className={`day-card${isToday ? ' today' : ''}`}
            onClick={() => setSelectedDay(dateStr)}
            style={{ cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            {/* Día */}
            <div style={{ width: 44, flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
                {DAY_NAMES_SHORT[d.getDay()]}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: isToday ? '#1B5E20' : '#111827', lineHeight: 1.1 }}>
                {d.getDate()}
              </div>
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                <span className={`badge ${statusCfg.badgeClass}`}>{statusCfg.label}</span>
                {isToday && <span style={{ fontSize: 10, color: '#1B5E20', fontWeight: 700 }}>HOY</span>}
                {gymDone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#1565C0', fontWeight: 600, background: '#E3F2FD', padding: '2px 7px', borderRadius: 99 }}>
                    <GymIcon size={11} /> Gym
                  </span>
                )}
              </div>

              {routine ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{routine.name}</div>
                  {status === 'done' && dayHistory && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      {Object.values(dayHistory.completed || {}).filter(Boolean).length} ejercicios
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {gymDone ? 'Solo gym' : 'Sin rutina'}
                </div>
              )}
            </div>

            {/* Flecha */}
            <div style={{ color: '#CFD8DC', fontSize: 16, alignSelf: 'center' }}>›</div>
          </div>
        );
      })}
    </div>
  );
}
