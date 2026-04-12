import { useState, useMemo } from 'react';
import { useStore, getChallengeProgress } from '../store/useStore';
import { todayStr, toDateStr, formatDate, getWeekDays } from '../utils/dates';
import { CheckCircleIcon, GymIcon, CheckIcon } from '../components/Icons';
import DayEditor from '../components/DayEditor';

const TODAY = todayStr();

const DAY_LABELS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_NAMES_FULL = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export default function Hoy({ onGoToDesafios }) {
  const { routines, schedule, history, challenges } = useStore();

  const streak = useMemo(() => {
    let s = 0;
    const d = new Date(TODAY);
    for (let i = 0; i < 60; i++) {
      const ds = toDateStr(d);
      if (history[ds]?.done) s++;
      else if (ds <= TODAY) break;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [history]);

  const weekStats = useMemo(() => {
    const weekDays = getWeekDays(new Date());
    const weekDateStrs = weekDays.map(d => toDateStr(d));
    const planned = weekDateStrs.filter(d => !!schedule[d]).length;
    const done = weekDateStrs.filter(d => history[d]?.done).length;
    return { planned, done };
  }, [schedule, history]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth() + 1;
    const todayDate = parseInt(TODAY.split('-')[2]);
    let planned = 0, done = 0;
    for (let d = 1; d <= todayDate; d++) {
      const ds = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      if (schedule[ds]) planned++;
      if (history[ds]?.done) done++;
    }
    return planned > 0 ? Math.round((done / planned) * 100) : 0;
  }, [schedule, history]);

  const miniCalDays = useMemo(() => {
    const weekDays = getWeekDays(new Date());
    return weekDays.map(d => {
      const ds = toDateStr(d);
      const isToday = ds === TODAY;
      const isDone = history[ds]?.done;
      const hasRoutine = !!schedule[ds];
      const isPast = ds < TODAY;
      let color, bg;
      if (isDone)                    { color = '#2E7D32'; bg = '#E8F5E9'; }
      else if (isPast && hasRoutine) { color = '#EF5350'; bg = '#FFEBEE'; }
      else if (hasRoutine)           { color = '#F57F17'; bg = '#FFF8E1'; }
      else                           { color = '#B0BEC5'; bg = '#F5F5F5'; }
      return { d, ds, isToday, color, bg, num: d.getDate() };
    });
  }, [history, schedule]);

  const nextTraining = useMemo(() => {
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = toDateStr(d);
      if (schedule[ds]) {
        const r = routines.find(r => r.id === schedule[ds]);
        return { routine: r, dayName: DAY_NAMES_FULL[d.getDay()] };
      }
    }
    return null;
  }, [schedule, routines]);

  const activeChallenges = useMemo(
    () => challenges.filter(c => c.status === 'active'),
    [challenges]
  );

  const todayDayName = DAY_NAMES_FULL[new Date(TODAY + 'T12:00:00').getDay()];
  const todayDateFull = formatDate(TODAY);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#263238', letterSpacing: '-0.02em' }}>
          {todayDayName}
        </div>
        <div style={{ fontSize: 13, color: '#78909C', marginTop: 2 }}>{todayDateFull}</div>
      </div>

      {/* Stats */}
      <div className="metrics-row" style={{ marginTop: 16 }}>
        <div className="metric-card">
          <div className="metric-value" style={{ color: streak > 0 ? '#2E7D32' : undefined }}>
            {streak > 0 ? `${streak}🔥` : streak}
          </div>
          <div className="metric-label">Racha</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{weekStats.done}{weekStats.planned > 0 ? `/${weekStats.planned}` : ''}</div>
          <div className="metric-label">Esta semana</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{monthStats}%</div>
          <div className="metric-label">Este mes</div>
        </div>
      </div>

      {/* Mini calendario */}
      <div className="card" style={{ padding: '12px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#78909C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Esta semana
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {miniCalDays.map(({ ds, isToday, color, bg, num }, idx) => (
            <div key={ds} className="mini-cal-day" style={{ background: isToday ? '#1B5E20' : bg }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? 'rgba(255,255,255,0.7)' : '#78909C', letterSpacing: '0.04em' }}>
                {DAY_LABELS_SHORT[idx]}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? '#ffffff' : '#263238', lineHeight: 1 }}>
                {num}
              </div>
              <div className="mini-cal-dot" style={{ background: isToday ? 'rgba(255,255,255,0.5)' : color }} />
            </div>
          ))}
        </div>
      </div>

      {/* Editor del día de hoy — usa DayEditor */}
      <DayEditor dateStr={TODAY} />

      {/* Desafios activos */}
      {activeChallenges.length > 0 && (
        <div
          className="card"
          style={{ cursor: onGoToDesafios ? 'pointer' : 'default' }}
          onClick={onGoToDesafios}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#78909C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Desafios activos
          </div>
          {activeChallenges.map(c => {
            const prog = getChallengeProgress(c, history);
            return (
              <div key={c.id} style={{ marginBottom: activeChallenges[activeChallenges.length - 1].id === c.id ? 0 : 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#263238' }}>{c.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: prog.needsClosing ? '#E8F5E9' : prog.isOnTrack ? '#E8F5E9' : '#FFEBEE',
                    color: prog.needsClosing ? '#1B5E20' : prog.isOnTrack ? '#2E7D32' : '#C62828',
                  }}>
                    {prog.needsClosing ? '¡Cerrar!' : prog.isOnTrack ? 'Vas bien' : 'Atrasado'}
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 5 }}>
                  <div className="progress-fill" style={{ width: `${prog.pct}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#B0BEC5', marginTop: 3 }}>
                  {prog.completedSessions}/{c.targetSessions} sesiones · {prog.pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Próximo entrenamiento */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 24 }}>📅</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#78909C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            Proximo entrenamiento
          </div>
          {nextTraining ? (
            <div style={{ fontSize: 14, fontWeight: 600, color: '#263238' }}>
              {nextTraining.dayName} — {nextTraining.routine?.name || 'Rutina sin nombre'}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#B0BEC5' }}>No hay entrenamientos programados</div>
          )}
        </div>
      </div>

    </div>
  );
}
