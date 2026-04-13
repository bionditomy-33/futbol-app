import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { todayStr } from '../utils/dates';
import { CheckIcon, PlayIcon, GymIcon, CheckCircleIcon, GripIcon } from './Icons';
import { useDragSort } from '../hooks/useDragSort';

function getPhaseColor(displayIdx) {
  if (displayIdx === 0) return '#1D3461'; // navy
  if (displayIdx === 1) return '#059669'; // emerald
  if (displayIdx === 2) return '#D97706'; // amber
  return '#475569'; // slate
}

function getPhaseBg(displayIdx) {
  if (displayIdx === 0) return '#EDF1F9';
  if (displayIdx === 1) return '#ECFDF5';
  if (displayIdx === 2) return '#FFFBEB';
  return '#F8FAFC';
}

const RATING_COLORS = ['', '#EF5350', '#FF7043', '#FFC107', '#66BB6A', '#2E7D32'];
const RATING_LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'];

function RatingModal({ onSave, onSkip }) {
  const [rating, setRating] = useState(null);
  const [hardest, setHardest] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 4 }}>
          ¿Cómo estuvo la sesión?
        </div>
        <div style={{ fontSize: 13, color: '#78909C', marginBottom: 20 }}>
          Evaluá tu entrenamiento de hoy
        </div>

        {/* Rating 1-5 */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              style={{
                width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 800, fontSize: 18,
                background: rating === n ? RATING_COLORS[n] : '#F1F5F4',
                color: rating === n ? 'white' : '#78909C',
                transition: 'all 0.15s',
                transform: rating === n ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        {rating && (
          <div style={{ textAlign: 'center', fontSize: 13, color: RATING_COLORS[rating], fontWeight: 700, marginBottom: 20 }}>
            {RATING_LABELS[rating]}
          </div>
        )}
        {!rating && <div style={{ height: 28 }} />}

        {/* Ejercicio más difícil */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">¿Qué ejercicio te costó más? <span style={{ color: '#B0BEC5' }}>(opcional)</span></label>
          <input
            className="input"
            placeholder="ej: Rondos, Sprint 1v1..."
            value={hardest}
            onChange={e => setHardest(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onSkip}>
            Saltear
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={() => onSave(rating, hardest.trim() || null)}
          >
            Guardar y cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function RatingDisplay({ rating, hardestExercise }) {
  if (!rating) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', marginBottom: hardestExercise ? 6 : 0 }}>
        {[1,2,3,4,5].map(n => (
          <div key={n} style={{
            width: 26, height: 26, borderRadius: '50%',
            background: n <= rating ? RATING_COLORS[rating] : '#E8ECEB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
            color: n <= rating ? 'white' : '#B0BEC5',
          }}>
            {n}
          </div>
        ))}
        <span style={{ fontSize: 13, color: RATING_COLORS[rating], fontWeight: 700, marginLeft: 4 }}>
          {RATING_LABELS[rating]}
        </span>
      </div>
      {hardestExercise && (
        <div style={{ fontSize: 12, color: '#78909C', textAlign: 'center' }}>
          Más difícil: <span style={{ color: '#37474F', fontWeight: 600 }}>{hardestExercise}</span>
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

function RoutineSelector({ routines, onSelect, onClear, onCancel, showCancel }) {
  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#263238' }}>
        Seleccionar rutina
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #F1F5F4', cursor: 'pointer' }}
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
          <div key={r.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid #F1F5F4', cursor: 'pointer' }}
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

export default function DayEditor({ dateStr }) {
  const {
    routines, schedule, exerciseMap,
    getDay, updateDay, toggleExercise, completeDay,
    assignRoutine, removeSchedule, updatePhaseObjective,
  } = useStore();

  const assignedId = schedule[dateStr];
  const routine = routines.find(r => r.id === assignedId) || null;
  const day = getDay(dateStr);
  const completed = day.completed || {};

  const [showSelector, setShowSelector] = useState(false);
  const [showRating, setShowRating]     = useState(false);

  // Objetivos locales por nombre de fase; se sincronizan cuando cambia la rutina
  const [objectives, setObjectives] = useState(() =>
    routine ? Object.fromEntries(routine.phases.map(p => [p.phase, p.objective || ''])) : {}
  );
  useEffect(() => {
    if (routine) {
      setObjectives(Object.fromEntries(routine.phases.map(p => [p.phase, p.objective || ''])));
    }
  }, [routine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Orden visual de fases (local, no persiste en la rutina)
  const [localPhases, setLocalPhases] = useState(() => routine ? [...routine.phases] : []);
  useEffect(() => {
    if (routine) setLocalPhases([...routine.phases]);
  }, [routine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag sort para fases (visual only)
  const {
    containerRef: phaseContainerRef,
    displayItems: displayPhases,
    origIndices: phaseOrigIndices,
    getItemStyle: getPhaseItemStyle,
    onHandlePointerDown: onPhaseHandleDown,
  } = useDragSort(localPhases, setLocalPhases);

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
    setShowRating(true);
  }

  function handleRatingSave(rating, hardestExercise) {
    completeDay(dateStr, assignedId);
    if (rating !== null || hardestExercise) {
      updateDay(dateStr, {
        ...(rating !== null ? { rating } : {}),
        ...(hardestExercise ? { hardestExercise } : {}),
      });
    }
    setShowRating(false);
  }

  function handleRatingSkip() {
    completeDay(dateStr, assignedId);
    setShowRating(false);
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
          <div style={{ color: '#059669', marginBottom: 8 }}>
            <CheckCircleIcon size={36} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#064E3B', marginBottom: 4 }}>
            Entrenamiento completado
          </div>
          {r && <div style={{ fontSize: 14, color: '#37474F', marginBottom: 6 }}>{r.name}</div>}
          <div style={{ fontSize: 13, color: '#78909C', marginBottom: 12 }}>
            {doneCount}/{totalEx} ejercicios{day.gym ? ' · Gym ✓' : ''}
          </div>

          <RatingDisplay rating={day.rating} hardestExercise={day.hardestExercise} />

          {day.notes && (
            <div style={{ fontSize: 13, color: '#37474F', background: 'white', borderRadius: 8, padding: '8px 12px', textAlign: 'left', marginBottom: 16 }}>
              {day.notes}
            </div>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleUncomplete}>
            Reabrir entrenamiento
          </button>
        </div>

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
          <div style={{ fontSize: 15, fontWeight: 700, color: '#263238', marginBottom: 4 }}>Sin rutina asignada</div>
          <div style={{ fontSize: 13, color: '#78909C', marginBottom: 16 }}>Elegí una rutina o dejá el dia como descanso</div>
          <button className="btn btn-primary" onClick={() => setShowSelector(true)}>Asignar rutina</button>
        </div>
      )}

      {showSelector && (
        <RoutineSelector
          routines={routines}
          onSelect={handleSelectRoutine}
          onClear={handleClear}
          onCancel={() => setShowSelector(false)}
          showCancel
        />
      )}

      {routine && !showSelector && (
        <>
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', letterSpacing: '-0.01em' }}>{routine.name}</div>
                {routine.subtitle && <div style={{ fontSize: 13, color: '#78909C', marginTop: 2 }}>{routine.subtitle}</div>}
                <div style={{ fontSize: 12, color: '#78909C', marginTop: 4 }}>{routine.duration} · {totalEx} ejercicios</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSelector(true)}>Cambiar</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#78909C' }}>Progreso</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#263238' }}>{doneCount}/{totalEx}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Bloques de fases con diseño de flujo vertical */}
          <div ref={phaseContainerRef} style={{ padding: '0 16px' }}>
            {displayPhases.map((phase, displayIdx) => {
              const pi     = phaseOrigIndices[displayIdx]; // índice original en routine.phases
              const color  = getPhaseColor(displayIdx);
              const isLast = displayIdx === displayPhases.length - 1;
              return (
                <div key={phase.phase} style={getPhaseItemStyle(displayIdx)}>
                  {/* Tarjeta del bloque */}
                  <div style={{
                    background: getPhaseBg(displayIdx),
                    borderRadius: 10,
                    border: '1px solid #DDE3EE',
                    borderLeft: `4px solid ${color}`,
                    overflow: 'hidden',
                  }}>
                    {/* Header del bloque */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: '0.5px solid #F1F5F4' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          onPointerDown={e => onPhaseHandleDown(e, displayIdx)}
                          style={{ cursor: 'grab', color: '#C8D8CC', padding: '3px 2px', touchAction: 'none', flexShrink: 0 }}
                        >
                          <GripIcon size={12} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {phase.phase}
                        </span>
                      </div>
                      {phase.time && (
                        <span style={{ fontSize: 11, color: '#B0BEC5', fontWeight: 600 }}>{phase.time}</span>
                      )}
                    </div>

                    <div style={{ padding: '10px 14px 12px' }}>
                      {/* Objetivo del bloque */}
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                          Objetivo
                        </label>
                        <textarea
                          className="input"
                          style={{ fontSize: 12, minHeight: 48, resize: 'none', lineHeight: 1.4 }}
                          placeholder="¿Qué querés lograr en este bloque?"
                          value={objectives[phase.phase] !== undefined ? objectives[phase.phase] : (phase.objective || '')}
                          onChange={e => setObjectives(o => ({ ...o, [phase.phase]: e.target.value }))}
                          onBlur={e => {
                            const val = e.target.value;
                            const origIdx = routine.phases.findIndex(p => p.phase === phase.phase);
                            if (val !== (phase.objective || '')) {
                              updatePhaseObjective(routine.id, origIdx, val || null);
                            }
                          }}
                        />
                      </div>

                      {/* Nota de la fase */}
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
                  </div>

                  {/* Conector entre bloques */}
                  {!isLast && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 2, height: 10, background: '#C8E6C9' }} />
                        <div style={{ fontSize: 9, color: '#A5D6A7', lineHeight: 1 }}>▼</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

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

      {routine && !showSelector && (
        <div style={{ padding: '0 16px 8px' }}>
          <button className="btn btn-primary btn-full" onClick={handleComplete} style={{ padding: '14px 18px', fontSize: 15 }}>
            Completar entrenamiento
          </button>
        </div>
      )}


      {showRating && (
        <RatingModal onSave={handleRatingSave} onSkip={handleRatingSkip} />
      )}
    </div>
  );
}
