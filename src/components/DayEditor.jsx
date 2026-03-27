import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { todayStr } from '../utils/dates';
import { CheckIcon, PlayIcon, GymIcon, CheckCircleIcon, XIcon } from './Icons';

const TIMER_PRESETS = [20, 30, 45, 60, 90];

function RestTimer({ onClose }) {
  const [seconds, setSeconds] = useState(null);   // null = no running, number = remaining
  const [selected, setSelected] = useState(null); // preset selected
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);

  function startTimer(secs) {
    clearInterval(intervalRef.current);
    setSeconds(secs);
    setSelected(secs);
    setFinished(false);
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setFinished(true);
          try { navigator.vibrate([400, 150, 400, 150, 600]); } catch {}
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function cancelTimer() {
    clearInterval(intervalRef.current);
    setSeconds(null);
    setSelected(null);
    setFinished(false);
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const mins = seconds !== null ? Math.floor(seconds / 60) : 0;
  const secs = seconds !== null ? seconds % 60 : 0;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 480,
      background: '#1B5E20',
      borderRadius: '16px 16px 0 0',
      padding: '16px 20px 32px',
      zIndex: 300,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Timer de descanso</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', color: 'white' }}>
          <XIcon size={15} />
        </button>
      </div>

      {/* Presets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TIMER_PRESETS.map(s => (
          <button
            key={s}
            onClick={() => startTimer(s)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              background: selected === s ? '#A5D6A7' : 'rgba(255,255,255,0.15)',
              color: selected === s ? '#1B5E20' : 'white',
              transition: 'background 0.15s',
            }}
          >
            {s}s
          </button>
        ))}
      </div>

      {/* Countdown */}
      {seconds !== null && (
        <div style={{ textAlign: 'center' }}>
          {finished ? (
            <div style={{ fontSize: 40, fontWeight: 800, color: '#A5D6A7', letterSpacing: '-0.02em' }}>
              ¡Tiempo!
            </div>
          ) : (
            <div style={{ fontSize: 56, fontWeight: 800, color: 'white', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {mins > 0 ? `${mins}:${String(secs).padStart(2,'0')}` : `${secs}s`}
            </div>
          )}
          <button
            onClick={cancelTimer}
            style={{
              marginTop: 12,
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 20px',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {seconds === null && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          Elegí un tiempo para empezar
        </div>
      )}
    </div>
  );
}

const TODAY = todayStr();

function countExercises(routine) {
  if (!routine) return 0;
  return routine.phases.reduce((sum, p) => sum + p.exercises.length, 0);
}

function ExerciseRow({ ex, exerciseMap, completed, onToggle }) {
  const info = exerciseMap[ex.ref];
  if (!info) return null;
  const done = !!completed[ex.ref];
  return (
    <div className={`exercise-item${done ? ' done' : ''}`}>
      <div onClick={onToggle} style={{ cursor: 'pointer' }}>
        <div className={`checkbox-custom${done ? ' checked' : ''}`}>
          {done && <CheckIcon size={11} />}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: '#263238', fontWeight: done ? 400 : 500, lineHeight: 1.3 }}>
          {info.name}
        </div>
        {(ex.series || ex.reps) && (
          <div style={{ fontSize: 12, color: '#78909C', marginTop: 2 }}>
            {ex.series && `${ex.series}s`}{ex.series && ex.reps ? ' · ' : ''}{ex.reps}
          </div>
        )}
      </div>
      {info.link && (
        <a href={info.link} target="_blank" rel="noopener noreferrer" className="video-btn" onClick={e => e.stopPropagation()}>
          <PlayIcon size={9} /> Video
        </a>
      )}
    </div>
  );
}

// Selector de rutina: incluye Descanso/Limpiar + todas las rutinas
function RoutineSelector({ routines, onSelect, onClear, onCancel, showCancel }) {
  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#263238' }}>
        Seleccionar rutina
      </div>

      {/* Opcion Descanso / Sin rutina */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 0', borderBottom: '0.5px solid #F1F5F4', cursor: 'pointer',
        }}
        onClick={onClear}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#263238' }}>Sin rutina / Descanso</div>
          <div style={{ fontSize: 12, color: '#78909C' }}>Quitar la rutina asignada</div>
        </div>
        <span style={{ color: '#78909C', fontWeight: 700, fontSize: 13 }}>Limpiar</span>
      </div>

      {routines.length === 0 ? (
        <div style={{ color: '#78909C', fontSize: 13, padding: '10px 0' }}>No hay rutinas creadas.</div>
      ) : (
        routines.map(r => (
          <div
            key={r.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0', borderBottom: '0.5px solid #F1F5F4', cursor: 'pointer',
            }}
            onClick={() => onSelect(r.id)}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#263238' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: '#78909C' }}>{r.duration} · {countExercises(r)} ejercicios</div>
            </div>
            <span style={{ color: '#1B5E20', fontWeight: 700, fontSize: 14 }}>Elegir</span>
          </div>
        ))
      )}

      {showCancel && (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={onCancel}>
          Cancelar
        </button>
      )}
    </div>
  );
}

// Componente principal: editor de un día cualquiera
export default function DayEditor({ dateStr }) {
  const {
    routines, schedule, exerciseMap,
    getDay, updateDay, toggleExercise, completeDay,
    assignRoutine, removeSchedule,
  } = useStore();

  const [showSelector, setShowSelector] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  const assignedId = schedule[dateStr];
  const routine = routines.find(r => r.id === assignedId) || null;
  const day = getDay(dateStr);
  const completed = day.completed || {};

  const allExercises = routine ? routine.phases.flatMap(p => p.exercises) : [];
  const totalEx = allExercises.length;
  const doneCount = allExercises.filter(e => !!completed[e.ref]).length;
  const progress = totalEx > 0 ? Math.round((doneCount / totalEx) * 100) : 0;

  function handleSelectRoutine(id) {
    assignRoutine(dateStr, id);
    setShowSelector(false);
  }

  function handleClear() {
    removeSchedule(dateStr);
    setShowSelector(false);
  }

  function handleComplete() {
    completeDay(dateStr, assignedId);
  }

  function handleUncomplete() {
    updateDay(dateStr, { done: false });
  }

  // Estado: entrenamiento completado
  if (day.done) {
    const r = routines.find(r => r.id === day.routineId);
    return (
      <div>
        <div className="completed-banner">
          <div style={{ color: '#2E7D32', marginBottom: 8 }}>
            <CheckCircleIcon size={36} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#1B5E20', marginBottom: 4 }}>
            Entrenamiento completado
          </div>
          {r && <div style={{ fontSize: 14, color: '#37474F', marginBottom: 6 }}>{r.name}</div>}
          <div style={{ fontSize: 13, color: '#78909C', marginBottom: 16 }}>
            {doneCount}/{totalEx} ejercicios{day.gym ? ' · Gym ✓' : ''}
          </div>
          {day.notes && (
            <div style={{ fontSize: 13, color: '#37474F', background: 'white', borderRadius: 8, padding: '8px 12px', textAlign: 'left', marginBottom: 16 }}>
              {day.notes}
            </div>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleUncomplete}>
            Reabrir entrenamiento
          </button>
        </div>

        {/* Gym siempre visible, incluso si está completado */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GymIcon size={16} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#263238' }}>Fui al gimnasio</span>
          </div>
          <div
            className={`checkbox-custom${day.gym ? ' checked' : ''}`}
            onClick={() => updateDay(dateStr, { gym: !day.gym })}
          >
            {day.gym && <CheckIcon size={11} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Sin rutina asignada */}
      {!routine && !showSelector && (
        <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚽</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#263238', marginBottom: 4 }}>
            Sin rutina asignada
          </div>
          <div style={{ fontSize: 13, color: '#78909C', marginBottom: 16 }}>
            Elegí una rutina o dejá el dia como descanso
          </div>
          <button className="btn btn-primary" onClick={() => setShowSelector(true)}>
            Asignar rutina
          </button>
        </div>
      )}

      {/* Selector */}
      {showSelector && (
        <RoutineSelector
          routines={routines}
          onSelect={handleSelectRoutine}
          onClear={handleClear}
          onCancel={() => setShowSelector(false)}
          showCancel
        />
      )}

      {/* Rutina asignada */}
      {routine && !showSelector && (
        <>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', letterSpacing: '-0.01em' }}>{routine.name}</div>
                {routine.subtitle && <div style={{ fontSize: 13, color: '#78909C', marginTop: 2 }}>{routine.subtitle}</div>}
                <div style={{ fontSize: 12, color: '#78909C', marginTop: 4 }}>
                  {routine.duration} · {totalEx} ejercicios
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSelector(true)}>
                Cambiar
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#78909C' }}>Progreso</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#263238' }}>{doneCount}/{totalEx}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {routine.phases.map((phase, pi) => (
            <div key={pi} className="card" style={{ paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span className="phase-label">{phase.phase}</span>
                {phase.time && <span style={{ fontSize: 11, color: '#B0BEC5' }}>{phase.time}</span>}
              </div>
              {phase.note && (
                <div style={{ fontSize: 12, color: '#78909C', background: '#F5F7F5', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
                  {phase.note}
                </div>
              )}
              {phase.exercises.length === 0 && !phase.note && (
                <div style={{ fontSize: 13, color: '#B0BEC5' }}>Sin ejercicios asignados</div>
              )}
              {phase.exercises.map((ex, ei) => (
                <ExerciseRow
                  key={`${ex.ref}-${ei}`}
                  ex={ex}
                  exerciseMap={exerciseMap}
                  completed={completed}
                  onToggle={() => toggleExercise(dateStr, ex.ref)}
                />
              ))}
            </div>
          ))}
        </>
      )}

      {/* Gym: siempre visible */}
      {!showSelector && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GymIcon size={16} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#263238' }}>Fui al gimnasio</span>
          </div>
          <div
            className={`checkbox-custom${day.gym ? ' checked' : ''}`}
            onClick={() => updateDay(dateStr, { gym: !day.gym })}
          >
            {day.gym && <CheckIcon size={11} />}
          </div>
        </div>
      )}

      {/* Notas */}
      {!showSelector && (
        <div className="card">
          <div className="form-label">Notas</div>
          <textarea
            className="input"
            placeholder="Escribi tus notas aqui..."
            value={day.notes || ''}
            onChange={e => updateDay(dateStr, { notes: e.target.value })}
          />
        </div>
      )}

      {/* Boton completar (solo si hay rutina y no está completado) */}
      {routine && !showSelector && (
        <div style={{ padding: '0 16px 8px' }}>
          <button className="btn btn-primary btn-full" onClick={handleComplete} style={{ padding: '14px 18px', fontSize: 15 }}>
            Completar entrenamiento
          </button>
        </div>
      )}

      {/* Boton flotante timer — solo cuando hay rutina activa */}
      {!showSelector && !day.done && (
        <>
          <div style={{ height: 72 }} /> {/* espacio para no tapar contenido */}
          <button
            onClick={() => setShowTimer(t => !t)}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 'calc(50% - 228px)',
              zIndex: 250,
              background: showTimer ? '#2E7D32' : '#1B5E20',
              color: 'white',
              border: 'none',
              borderRadius: 99,
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(27,94,32,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ⏱ Timer
          </button>
          {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
        </>
      )}
    </div>
  );
}
