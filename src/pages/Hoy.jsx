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
      if (isDone)                    { color = '#059669'; bg = '#D1FAE5'; }
      else if (isPast && hasRoutine) { color = '#DC2626'; bg = '#FEE2E2'; }
      else if (hasRoutine)           { color = '#D97706'; bg = '#FEF3C7'; }
      else                           { color = '#CBD5E1'; bg = '#F1F5F9'; }
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

      {/* ── Dark header ── */}
      <div className="hoy-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="hoy-header-day">{todayDayName}</div>
            <div className="hoy-header-date">{todayDateFull}</div>
          </div>
          {streak > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12,
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              position: 'relative',
              zIndex: 1,
            }}>
              <span style={{ fontSize: 20 }}>🔥</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#FCD34D', lineHeight: 1, letterSpacing: '-0.02em' }}>{streak}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Racha</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="metrics-row" style={{ marginTop: 16 }}>
        <div className="metric-card">
          <div className="metric-value" style={{ color: streak > 0 ? '#D97706' : undefined }}>
            {streak > 0 ? streak : '—'}
          </div>
          <div className="metric-label">Racha</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {weekStats.done}{weekStats.planned > 0 ? `/${weekStats.planned}` : ''}
          </div>
          <div className="metric-label">Esta semana</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{monthStats}%</div>
          <div className="metric-label">Este mes</div>
        </div>
      </div>

      {/* ── Mini calendario ── */}
      <div className="card" style={{ padding: '14px 12px' }}>
        <div className="section-label">Esta semana</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {miniCalDays.map(({ ds, isToday, color, bg, num }, idx) => (
            <div
              key={ds}
              className="mini-cal-day"
              style={{ background: isToday ? '#0A1628' : bg }}
            >
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: isToday ? 'rgba(255,255,255,0.65)' : '#94A3B8',
                letterSpacing: '0.05em',
              }}>
                {DAY_LABELS_SHORT[idx]}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 800,
                color: isToday ? '#ffffff' : '#1A2332',
                lineHeight: 1,
              }}>
                {num}
              </div>
              <div className="mini-cal-dot" style={{ background: isToday ? 'rgba(255,255,255,0.55)' : color }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Editor del día ── */}
      <DayEditor dateStr={TODAY} />

      {/* ── Desafios activos ── */}
      {activeChallenges.length > 0 && (
        <div
          className="card"
          style={{ cursor: onGoToDesafios ? 'pointer' : 'default' }}
          onClick={onGoToDesafios}
        >
          <div className="section-label">Desafios activos</div>
          {activeChallenges.map((c, i) => {
            const prog = getChallengeProgress(c, history);
            const isLast = i === activeChallenges.length - 1;
            return (
              <div key={c.id} style={{ marginBottom: isLast ? 0 : 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1A2332' }}>{c.name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                    background: prog.needsClosing ? '#D1FAE5' : prog.isOnTrack ? '#D1FAE5' : '#FEE2E2',
                    color: prog.needsClosing ? '#065F46' : prog.isOnTrack ? '#059669' : '#991B1B',
                  }}>
                    {prog.needsClosing ? '¡Cerrar!' : prog.isOnTrack ? 'Vas bien' : 'Atrasado'}
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${prog.pct}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                  {prog.completedSessions}/{c.targetSessions} sesiones · {prog.pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Próximo entrenamiento ── */}
      <div className="next-training-card">
        <div className="next-training-icon">📅</div>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#94A3B8',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
          }}>
            Próximo entrenamiento
          </div>
          {nextTraining ? (
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2332' }}>
              {nextTraining.dayName} — {nextTraining.routine?.name || 'Rutina sin nombre'}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: '#94A3B8' }}>No hay entrenamientos programados</div>
          )}
        </div>
      </div>

    </div>
  );
}
