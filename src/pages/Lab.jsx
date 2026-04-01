import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import ExercisePicker from '../components/ExercisePicker';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon, XIcon, BodyIcon, BallIcon, FireIcon, GripIcon } from '../components/Icons';
import { useDragSort } from '../hooks/useDragSort';

// Fases verdaderamente fijas: no se pueden renombrar ni eliminar
const TRULY_FIXED = new Set(['Bloque Entrenamiento Principal', 'Calentamiento con pelota']);

// Colores y clases por posicion en el display (0=verde, 1=amarillo, 2=azul, 3+=gris)
function getPhaseClass(displayIdx) {
  if (displayIdx === 0) return 'phase-corporal';
  if (displayIdx === 1) return 'phase-balon';
  if (displayIdx === 2) return 'phase-principal';
  return 'phase-extra';
}

function getPhaseAccentColor(displayIdx) {
  if (displayIdx === 0) return '#2E7D32';
  if (displayIdx === 1) return '#F57F17';
  if (displayIdx === 2) return '#1565C0';
  return '#607D8B';
}

function getPhaseIcon(displayIdx) {
  if (displayIdx === 0) return <BodyIcon size={13} />;
  if (displayIdx === 1) return <BallIcon size={13} />;
  if (displayIdx === 2) return <FireIcon size={13} />;
  return null;
}

const DEFAULT_PHASES = [
  'Activacion - Bloque Agilidad',
  'Bloque Entrenamiento Principal',
  'Calentamiento con pelota',
];

function emptyRoutine() {
  return {
    id: `r-${Date.now()}`,
    name: '',
    subtitle: '',
    duration: '',
    phases: DEFAULT_PHASES.map(phase => ({ phase, time: '', note: '', exercises: [] })),
  };
}

// ── Sub-component: exercise list with drag sort ───────────────────────────────
function PhaseExercises({ exercises, exerciseMap, onReorder, onMove, onRemove, onUpdate }) {
  const { containerRef, displayItems, origIndices, getItemStyle, onHandlePointerDown } =
    useDragSort(exercises, onReorder);

  return (
    <div ref={containerRef} style={{ marginBottom: 10 }}>
      {displayItems.map((ex, displayIdx) => {
        const ei = origIndices[displayIdx];
        const info = exerciseMap[ex.ref];
        return (
          <div key={ei} style={{ marginBottom: 6, ...getItemStyle(displayIdx) }}>
            <div style={{
              background: 'rgba(255,255,255,0.75)',
              borderRadius: 8,
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.07)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <div
                    onPointerDown={e => onHandlePointerDown(e, displayIdx)}
                    style={{ cursor: 'grab', color: '#B0BEC5', padding: '3px 2px', touchAction: 'none', flexShrink: 0 }}
                  >
                    <GripIcon size={12} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#263238', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {info ? info.name : ex.ref}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '3px 5px', opacity: ei === 0 ? 0.25 : 1, pointerEvents: ei === 0 ? 'none' : 'auto' }}
                    onClick={() => onMove(ei, -1)}
                  >
                    <ArrowUpIcon size={12} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '3px 5px', opacity: ei === exercises.length - 1 ? 0.25 : 1, pointerEvents: ei === exercises.length - 1 ? 'none' : 'auto' }}
                    onClick={() => onMove(ei, 1)}
                  >
                    <ArrowDownIcon size={12} />
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '3px 5px', color: '#EF5350' }}
                    onClick={() => onRemove(ei)}
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: 9 }}>Series</label>
                  <input
                    className="input"
                    style={{ padding: '6px 8px', fontSize: 13 }}
                    placeholder="ej: 3"
                    value={ex.series}
                    onChange={e => onUpdate(ei, 'series', e.target.value)}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <label className="form-label" style={{ fontSize: 9 }}>Reps / Indicacion</label>
                  <input
                    className="input"
                    style={{ padding: '6px 8px', fontSize: 13 }}
                    placeholder="ej: 10 reps"
                    value={ex.reps}
                    onChange={e => onUpdate(ei, 'reps', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Lab({ routine: initialRoutine, onDone, onDirtyChange }) {
  const { catalog, saveRoutine, exerciseMap } = useStore();
  const initialFormRef = useRef(null);
  const [form, setForm] = useState(() => {
    const data = initialRoutine ? JSON.parse(JSON.stringify(initialRoutine)) : emptyRoutine();
    initialFormRef.current = JSON.stringify(data);
    return data;
  });
  const [picker, setPicker] = useState(null); // original phase index
  const [errors, setErrors] = useState({});
  const [newPhaseName, setNewPhaseName] = useState('');
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [deleteConfirmPhase, setDeleteConfirmPhase] = useState(null);

  // Drag sort for phases
  const {
    containerRef: phasesContainerRef,
    displayItems: displayPhases,
    origIndices: phaseOrigIndices,
    getItemStyle: getPhaseItemStyle,
    onHandlePointerDown: onPhaseHandleDown,
  } = useDragSort(form.phases, newPhases => setForm(f => ({ ...f, phases: newPhases })));

  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(JSON.stringify(form) !== initialFormRef.current);
    }
  }, [form]);

  function updateField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  }

  function updatePhase(pi, field, value) {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) => i === pi ? { ...p, [field]: value } : p),
    }));
  }

  function addExercise(pi, exInfo) {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) =>
        i !== pi ? p : { ...p, exercises: [...p.exercises, { ref: exInfo.id, series: '', reps: '' }] }
      ),
    }));
  }

  function removeExercise(pi, ei) {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) =>
        i !== pi ? p : { ...p, exercises: p.exercises.filter((_, j) => j !== ei) }
      ),
    }));
  }

  function updateExercise(pi, ei, field, value) {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) =>
        i !== pi ? p : { ...p, exercises: p.exercises.map((ex, j) => j === ei ? { ...ex, [field]: value } : ex) }
      ),
    }));
  }

  function moveExercise(pi, ei, dir) {
    setForm(f => {
      const phases = f.phases.map((p, i) => {
        if (i !== pi) return p;
        const exs = [...p.exercises];
        const target = ei + dir;
        if (target < 0 || target >= exs.length) return p;
        [exs[ei], exs[target]] = [exs[target], exs[ei]];
        return { ...p, exercises: exs };
      });
      return { ...f, phases };
    });
  }

  function reorderExercises(pi, newExercises) {
    setForm(f => ({
      ...f,
      phases: f.phases.map((p, i) => i === pi ? { ...p, exercises: newExercises } : p),
    }));
  }

  function addCustomPhase() {
    const name = newPhaseName.trim();
    if (!name) return;
    setForm(f => ({
      ...f,
      phases: [...f.phases, { phase: name, time: '', note: '', exercises: [] }]
    }));
    setNewPhaseName('');
    setShowAddPhase(false);
  }

  function removeCustomPhase(pi) {
    setForm(f => ({ ...f, phases: f.phases.filter((_, i) => i !== pi) }));
  }

  function movePhase(pi, dir) {
    setForm(f => {
      const target = pi + dir;
      if (target < 0 || target >= f.phases.length) return f;
      const phases = [...f.phases];
      [phases[pi], phases[target]] = [phases[target], phases[pi]];
      return { ...f, phases };
    });
  }

  function handleSave() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'El nombre es obligatorio';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    saveRoutine(form);
    onDone();
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">{initialRoutine ? 'Editar rutina' : 'Nueva rutina'}</h1>
      </div>

      {/* General fields */}
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input
            className="input"
            placeholder="Nombre de la rutina"
            value={form.name}
            onChange={e => updateField('name', e.target.value)}
            style={errors.name ? { borderColor: '#EF5350' } : {}}
          />
          {errors.name && <div style={{ fontSize: 12, color: '#EF5350', marginTop: 4 }}>{errors.name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label className="form-label">Subtitulo</label>
            <input className="input" placeholder="Descripcion breve" value={form.subtitle} onChange={e => updateField('subtitle', e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Duracion</label>
            <input className="input" placeholder="~60 min" value={form.duration} onChange={e => updateField('duration', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Phases */}
      <div style={{ padding: '0 16px' }}>
        {/* Phases container — only phase items here so drag index matches children */}
        <div ref={phasesContainerRef}>
          {displayPhases.map((phase, displayIdx) => {
            const pi          = phaseOrigIndices[displayIdx]; // original index in form.phases
            const isTrulyFixed = TRULY_FIXED.has(phase.phase);
            const canDelete    = !isTrulyFixed; // first phase + custom phases
            const canRename    = pi === 0 && !isTrulyFixed; // only first slot if not truly fixed
            const phaseClass   = getPhaseClass(displayIdx);
            const accentColor  = getPhaseAccentColor(displayIdx);
            const icon         = getPhaseIcon(displayIdx);

            return (
              <div
                key={pi}
                style={{ marginBottom: 12, borderRadius: 12, ...getPhaseItemStyle(displayIdx) }}
              >
                <div className={`phase-block ${phaseClass}`} style={{ margin: 0 }}>
                  <div className="phase-block-header" style={{ justifyContent: 'space-between' }}>
                    {/* Left: grip + icon + name (editable if canRename) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <div
                        onPointerDown={e => onPhaseHandleDown(e, displayIdx)}
                        style={{ cursor: 'grab', color: '#B0BEC5', padding: '4px 3px', touchAction: 'none', flexShrink: 0 }}
                      >
                        <GripIcon size={14} />
                      </div>
                      {icon && <span style={{ color: accentColor, flexShrink: 0 }}>{icon}</span>}
                      {canRename ? (
                        <input
                          className="input"
                          style={{
                            fontSize: 11, fontWeight: 700, color: accentColor,
                            padding: '3px 7px', background: 'rgba(255,255,255,0.6)',
                            border: `1px solid ${accentColor}50`, borderRadius: 5,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            minWidth: 0, flex: 1,
                          }}
                          value={phase.phase}
                          onChange={e => updatePhase(pi, 'phase', e.target.value)}
                          placeholder="Nombre de la fase"
                        />
                      ) : (
                        <span style={{ fontWeight: 700, fontSize: 12, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {phase.phase}
                        </span>
                      )}
                    </div>
                    {/* Right: up/down + optional delete */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '5px 7px', color: '#607D8B', opacity: pi === 0 ? 0.25 : 1, pointerEvents: pi === 0 ? 'none' : 'auto' }}
                        onClick={() => movePhase(pi, -1)}
                      >
                        <ArrowUpIcon size={14} />
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '5px 7px', color: '#607D8B', opacity: pi >= form.phases.length - 1 ? 0.25 : 1, pointerEvents: pi >= form.phases.length - 1 ? 'none' : 'auto' }}
                        onClick={() => movePhase(pi, 1)}
                      >
                        <ArrowDownIcon size={14} />
                      </button>
                      {canDelete && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '5px 7px', color: '#EF5350' }}
                          onClick={() => {
                            if (phase.exercises.length > 0) setDeleteConfirmPhase(pi);
                            else removeCustomPhase(pi);
                          }}
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px' }}>
                    {/* Time + Note */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Tiempo</label>
                        <input className="input" placeholder="ej: 8 min" value={phase.time} onChange={e => updatePhase(pi, 'time', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label className="form-label">Nota (opcional)</label>
                      <input className="input" placeholder="Indicaciones generales..." value={phase.note} onChange={e => updatePhase(pi, 'note', e.target.value)} />
                    </div>

                    {/* Exercises with drag sort */}
                    {phase.exercises.length > 0 && (
                      <PhaseExercises
                        exercises={phase.exercises}
                        exerciseMap={exerciseMap}
                        onReorder={newExs => reorderExercises(pi, newExs)}
                        onMove={(ei, dir) => moveExercise(pi, ei, dir)}
                        onRemove={ei => removeExercise(pi, ei)}
                        onUpdate={(ei, field, value) => updateExercise(pi, ei, field, value)}
                      />
                    )}

                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(255,255,255,0.8)', border: `1.5px solid ${accentColor}40`, color: accentColor, fontWeight: 600 }}
                      onClick={() => setPicker(pi)}
                    >
                      <PlusIcon size={11} /> Agregar ejercicio
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add custom phase (outside containerRef so it doesn't interfere with drag index) */}
        {showAddPhase ? (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#263238', marginBottom: 10 }}>Nueva seccion</div>
            <input
              className="input"
              placeholder="Nombre de la seccion..."
              value={newPhaseName}
              onChange={e => setNewPhaseName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomPhase()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={addCustomPhase} disabled={!newPhaseName.trim()}>
                Agregar
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddPhase(false); setNewPhaseName(''); }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-outline btn-full"
            style={{ marginBottom: 16, borderStyle: 'dashed' }}
            onClick={() => setShowAddPhase(true)}
          >
            <PlusIcon size={13} /> Agregar seccion extra
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '8px 16px 16px', display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onDone}>
          Cancelar
        </button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>
          {initialRoutine ? 'Guardar cambios' : 'Crear rutina'}
        </button>
      </div>

      {/* Delete phase confirmation modal */}
      {deleteConfirmPhase !== null && (() => {
        const phase = form.phases[deleteConfirmPhase];
        if (!phase) return null;
        return (
          <div className="modal-overlay" onClick={() => setDeleteConfirmPhase(null)}>
            <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ padding: '24px 20px 32px' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#263238', marginBottom: 10 }}>
                Eliminar sección
              </div>
              <div style={{ fontSize: 14, color: '#78909C', marginBottom: 24, lineHeight: 1.5 }}>
                La sección <strong style={{ color: '#263238' }}>"{phase.phase}"</strong> tiene{' '}
                <strong style={{ color: '#263238' }}>{phase.exercises.length} ejercicio{phase.exercises.length !== 1 ? 's' : ''}</strong>.
                {' '}¿Estás seguro de que querés eliminarla?
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeleteConfirmPhase(null)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#C62828', borderColor: '#C62828' }}
                  onClick={() => { removeCustomPhase(deleteConfirmPhase); setDeleteConfirmPhase(null); }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Exercise picker modal */}
      {picker !== null && (
        <ExercisePicker
          catalog={catalog}
          onSelect={ex => addExercise(picker, ex)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
