import { useState, useEffect, useRef, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { useStore } from '../store/useStore';
import { getScheduleEntry, getEffectiveTemplateDays } from '../utils/activities';
import { CheckIcon, PlayIcon, GymIcon, CheckCircleIcon, GripIcon } from './Icons';
import { useDragSort } from '../hooks/useDragSort';
import ExerciseGroupedList from './ExerciseGroupedList';
import ProgressBar from './ProgressBar';

function getPhaseColor(displayIdx) {
  if (displayIdx === 0) return 'var(--navy-600)'; // navy
  if (displayIdx === 1) return 'var(--emerald-600)'; // emerald
  if (displayIdx === 2) return 'var(--amber-600)'; // amber
  return 'var(--text-secondary)'; // slate
}


const RATING_COLORS = ['', 'var(--red-600)', 'var(--amber-800)', 'var(--amber-600)', 'var(--emerald-400)', 'var(--emerald-600)'];
const RATING_LABELS = ['', 'Muy mal', 'Mal', 'Regular', 'Bien', 'Excelente'];

function RatingModal({ onSave, onSkip }) {
  const [rating, setRating] = useState(null);
  const [hardest, setHardest] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', marginBottom: 4 }}>
          ¿Cómo estuvo la sesión?
        </div>
        <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 20 }}>
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
                background: rating === n ? RATING_COLORS[n] : 'var(--divider)',
                color: rating === n ? 'white' : 'var(--gray-mid)',
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
          <label className="form-label">¿Qué ejercicio te costó más? <span style={{ color: 'var(--text-light)' }}>(opcional)</span></label>
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
            background: n <= rating ? RATING_COLORS[rating] : 'var(--divider)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
            color: n <= rating ? 'white' : 'var(--text-light)',
          }}>
            {n}
          </div>
        ))}
        <span style={{ fontSize: 13, color: RATING_COLORS[rating], fontWeight: 700, marginLeft: 4 }}>
          {RATING_LABELS[rating]}
        </span>
      </div>
      {hardestExercise && (
        <div style={{ fontSize: 12, color: 'var(--gray-mid)', textAlign: 'center' }}>
          Más difícil: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{hardestExercise}</span>
        </div>
      )}
    </div>
  );
}

function countExercises(routine) {
  if (!routine) return 0;
  return routine.phases.reduce((sum, p) => sum + p.exercises.length, 0);
}

function RoutineSelector({ routines, onSelect, onClear, onCancel, showCancel }) {
  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)' }}>
        Seleccionar rutina
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--divider)', cursor: 'pointer' }}
        onClick={onClear}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Sin rutina / Descanso</div>
          <div style={{ fontSize: 12, color: 'var(--gray-mid)' }}>Quitar la rutina asignada</div>
        </div>
        <span style={{ color: 'var(--gray-mid)', fontWeight: 700, fontSize: 13 }}>Limpiar</span>
      </div>
      {routines.length === 0 ? (
        <div style={{ color: 'var(--gray-mid)', fontSize: 13, padding: '10px 0' }}>No hay rutinas creadas.</div>
      ) : (
        routines.map(r => (
          <div key={r.id}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--divider)', cursor: 'pointer' }}
            onClick={() => onSelect(r.id)}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{r.name}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-mid)' }}>{r.duration} · {countExercises(r)} ejercicios</div>
            </div>
            <span style={{ color: 'var(--emerald-600)', fontWeight: 700, fontSize: 14 }}>Elegir</span>
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
    routines, schedule, exerciseMap, catalog, catLinks,
    getDay, updateDay, toggleExercise, completeDay,
    assignRoutine, removeActivityFromDay, updatePhaseObjective,
    setActivityTime, weekTemplate, weekTemplates, plans,
  } = useStore();

  const day = getDay(dateStr);
  const schedEntry = getScheduleEntry(schedule, dateStr);

  // Misma lógica de visibilidad que getDayActivities: tipos suprimidos y días limpiados
  // no muestran la rutina (ni la del schedule ni la de la semana tipo).
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  const effDays = getEffectiveTemplateDays(dateStr, plans, weekTemplates, weekTemplate);
  const tmplDayEntry = effDays?.[dow] || {};
  const suppressed = schedEntry.suppressedTypes || [];
  const suppressTemplate = !!(day.cleared && !day.done && !day.gym);
  const assignedId = suppressed.includes('indiv')
    ? null
    : (schedEntry.routineId || (!suppressTemplate ? tmplDayEntry.routineId : null) || null);
  const routine = routines.find(r => r.id === assignedId) || null;

  const currentIndivTime = schedEntry.indivTime || tmplDayEntry.indivTime || '08:10';
  const completed = day.completed || {};

  // Notas con debounce: estado local para escritura fluida + persistencia 800ms
  // después de dejar de tipear (evita reescribir todo el history en cada tecla).
  const [notesLocal, setNotesLocal] = useState(day.notes || '');
  const debouncedSaveNotes = useMemo(
    () => debounce((ds, value) => updateDay(ds, { notes: value }), 800),
    [updateDay]
  );
  // Al cambiar de día: persistir lo pendiente del día anterior y resincronizar.
  useEffect(() => {
    debouncedSaveNotes.flush();
    setNotesLocal(day.notes || '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);
  // Al desmontar: no perder la última nota tipeada.
  useEffect(() => () => debouncedSaveNotes.flush(), [debouncedSaveNotes]);

  function handleNotesChange(value) {
    setNotesLocal(value);
    debouncedSaveNotes(dateStr, value);
  }

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
    // Suprime el tipo 'indiv' (cubre tanto rutina del schedule como de la semana tipo)
    removeActivityFromDay(dateStr, 'indiv');
    setShowSelector(false);
  }

  function handleComplete() {
    debouncedSaveNotes.flush(); // persistir nota pendiente antes de cerrar
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
          <div style={{ color: 'var(--emerald-600)', marginBottom: 8 }}>
            <CheckCircleIcon size={36} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--emerald-800)', marginBottom: 4 }}>
            Entrenamiento completado
          </div>
          {r && <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>{r.name}</div>}
          <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 12 }}>
            {doneCount}/{totalEx} ejercicios{day.gym ? ' · Gym ✓' : ''}
          </div>

          <RatingDisplay rating={day.rating} hardestExercise={day.hardestExercise} />

          {day.notes && (
            <div style={{ fontSize: 13, color: 'var(--text-primary)', background: 'white', borderRadius: 8, padding: '8px 12px', textAlign: 'left', marginBottom: 16 }}>
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
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Fui al gimnasio</span>
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
      {/* Progreso siempre visible durante el entrenamiento */}
      {routine && !showSelector && totalEx > 0 && (
        <div className="de-sticky-progress">
          <div className="de-sticky-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Rutina eliminada — assignedId existe pero el routines array no la tiene */}
      {assignedId && !routine && !showSelector && (
        <div className="card" style={{ textAlign: 'center', padding: '20px 16px', borderColor: 'var(--red-300)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red-800)', marginBottom: 4 }}>Esta rutina ya no existe</div>
          <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 16 }}>La rutina asignada fue eliminada. Podés asignar otra o dejar el día como descanso.</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => { handleClear(); }}>Quitar asignación</button>
            <button className="btn btn-primary" onClick={() => setShowSelector(true)}>Asignar otra</button>
          </div>
        </div>
      )}

      {/* Sin rutina asignada */}
      {!assignedId && !routine && !showSelector && (
        <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚽</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Sin rutina asignada</div>
          <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginBottom: 16 }}>Elegí una rutina o dejá el dia como descanso</div>
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
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{routine.name}</div>
                {routine.subtitle && <div style={{ fontSize: 13, color: 'var(--gray-mid)', marginTop: 2 }}>{routine.subtitle}</div>}
                <div style={{ fontSize: 12, color: 'var(--gray-mid)', marginTop: 4 }}>{routine.duration} · {totalEx} ejercicios</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSelector(true)}>Cambiar</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '0.5px solid var(--divider)' }}>
              <span style={{ fontSize: 12, color: 'var(--gray-mid)', fontWeight: 600 }}>Horario</span>
              <input
                type="time"
                value={currentIndivTime}
                onChange={e => { if (e.target.value) setActivityTime(dateStr, 'indiv', e.target.value); }}
                style={{ fontSize: 12, border: '1px solid var(--border-strong)', borderRadius: 6, padding: '3px 6px', fontFamily: 'inherit', background: 'white', color: 'var(--text-primary)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progreso</div>
                <div style={{ fontSize: 13, color: 'var(--gray-mid)', fontWeight: 600 }}>{doneCount} de {totalEx} ejercicios</div>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: progress === 100 ? 'var(--emerald-600)' : 'var(--navy-600)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {progress}%
              </div>
            </div>
            <ProgressBar value={progress} thick />
          </div>

          {/* Bloques de fases con diseño de flujo vertical */}
          <div ref={phaseContainerRef} style={{ padding: '0 16px' }}>
            {displayPhases.map((phase, displayIdx) => {
              const pi     = phaseOrigIndices[displayIdx]; // índice original en routine.phases
              const color  = getPhaseColor(displayIdx);
              const isLast = displayIdx === displayPhases.length - 1;
              return (
                <div key={phase.phase} style={getPhaseItemStyle(displayIdx)}>
                  {/* Tarjeta del bloque: blanca con acento lateral grueso del color de la fase */}
                  <div style={{
                    background: 'var(--bg-main)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `5px solid ${color}`,
                    boxShadow: 'var(--shadow-xs)',
                    overflow: 'hidden',
                  }}>
                    {/* Header del bloque */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: '0.5px solid var(--divider)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div
                          onPointerDown={e => onPhaseHandleDown(e, displayIdx)}
                          style={{ cursor: 'grab', color: 'var(--border-strong)', padding: '3px 2px', touchAction: 'none', flexShrink: 0 }}
                        >
                          <GripIcon size={12} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {phase.phase}
                        </span>
                      </div>
                      {phase.time && (
                        <span style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600 }}>{phase.time}</span>
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
                        <div style={{ fontSize: 12, color: 'var(--gray-mid)', background: 'var(--bg-subtle)', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
                          {phase.note}
                        </div>
                      )}

                      {phase.exercises.length === 0 && !phase.note && (
                        <div style={{ fontSize: 13, color: 'var(--text-light)' }}>Sin ejercicios asignados</div>
                      )}

                      <ExerciseGroupedList
                        exercises={phase.exercises}
                        catalog={catalog}
                        exerciseMap={exerciseMap}
                        catLinks={catLinks}
                        completed={completed}
                        onToggle={(ref) => toggleExercise(dateStr, ref)}
                        mode="edit"
                      />
                    </div>
                  </div>

                  {/* Conector entre bloques */}
                  {!isLast && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: 2, height: 10, background: 'var(--border-strong)' }} />
                        <div style={{ fontSize: 9, color: 'var(--text-light)', lineHeight: 1 }}>▼</div>
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
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Fui al gimnasio</span>
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
            value={notesLocal}
            onChange={e => handleNotesChange(e.target.value)}
            onBlur={() => debouncedSaveNotes.flush()}
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
