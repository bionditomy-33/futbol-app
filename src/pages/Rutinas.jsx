import { useState } from 'react';
import { useStore } from '../store/useStore';
import { EditIcon, CopyIcon, TrashIcon, PlusIcon, EyeIcon, ChevronLeft, PlayIcon, BodyIcon, BallIcon, FireIcon } from '../components/Icons';

function countExercises(routine) {
  return routine.phases.reduce((sum, p) => sum + p.exercises.length, 0);
}

function getCategories(routine, catalog) {
  const cats = new Set();
  const allEx = {};
  for (const [cat, exercises] of Object.entries(catalog)) {
    for (const ex of exercises) allEx[ex.id] = cat;
  }
  for (const phase of routine.phases) {
    for (const ex of phase.exercises) {
      if (allEx[ex.ref]) cats.add(allEx[ex.ref]);
    }
  }
  return [...cats];
}

const FIXED_PHASES = ['Calentamiento corporal', 'Calentamiento con balon', 'Sesion principal'];

function getPhaseStyle(phaseName) {
  if (phaseName === 'Calentamiento corporal') return 'phase-corporal';
  if (phaseName === 'Calentamiento con balon') return 'phase-balon';
  if (phaseName === 'Sesion principal') return 'phase-principal';
  return 'phase-extra';
}

function getPhaseIcon(phaseName) {
  if (phaseName === 'Calentamiento corporal') return <BodyIcon size={14} />;
  if (phaseName === 'Calentamiento con balon') return <BallIcon size={14} />;
  if (phaseName === 'Sesion principal') return <FireIcon size={14} />;
  return null;
}

function getPhaseAccentColor(phaseName) {
  if (phaseName === 'Calentamiento corporal') return '#2E7D32';
  if (phaseName === 'Calentamiento con balon') return '#F57F17';
  if (phaseName === 'Sesion principal') return '#1565C0';
  return '#607D8B';
}

function RutinaDetail({ routine, exerciseMap, onClose }) {
  const totalEx = countExercises(routine);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={onClose}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#263238', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {routine.name}
          </div>
          {routine.subtitle && (
            <div style={{ fontSize: 13, color: '#78909C', marginTop: 2 }}>{routine.subtitle}</div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div style={{ padding: '10px 16px 4px', display: 'flex', gap: 8 }}>
        {routine.duration && (
          <span className="badge badge-gray">⏱ {routine.duration}</span>
        )}
        <span className="badge badge-gray">{totalEx} ejercicios</span>
      </div>

      {/* Phases */}
      <div style={{ padding: '12px 16px 0' }}>
        {routine.phases.map((phase, pi) => {
          const phaseClass = getPhaseStyle(phase.phase);
          const icon = getPhaseIcon(phase.phase);
          const accentColor = getPhaseAccentColor(phase.phase);

          return (
            <div key={pi} className={`phase-block ${phaseClass}`} style={{ marginBottom: 12 }}>
              <div className="phase-block-header">
                {icon && <span style={{ color: accentColor }}>{icon}</span>}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {phase.phase}
                  </div>
                  {phase.time && (
                    <div style={{ fontSize: 11, color: '#78909C', marginTop: 1 }}>{phase.time}</div>
                  )}
                </div>
              </div>

              <div style={{ padding: '8px 14px 12px' }}>
                {phase.note && (
                  <div style={{ fontSize: 12, color: '#78909C', background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '6px 10px', marginBottom: 8 }}>
                    {phase.note}
                  </div>
                )}
                {phase.exercises.length === 0 && !phase.note && (
                  <div style={{ fontSize: 13, color: '#B0BEC5', padding: '4px 0' }}>Sin ejercicios</div>
                )}
                {phase.exercises.map((ex, ei) => {
                  const info = exerciseMap[ex.ref];
                  if (!info) return null;
                  return (
                    <div key={ei} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 0',
                      borderBottom: ei < phase.exercises.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                    }}>
                      <div style={{
                        width: 24, height: 24, minWidth: 24,
                        background: 'rgba(255,255,255,0.8)',
                        borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700, color: accentColor,
                      }}>
                        {ei + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#263238' }}>{info.name}</div>
                        {(ex.series || ex.reps) && (
                          <div style={{ fontSize: 12, color: '#78909C', marginTop: 1 }}>
                            {ex.series && `${ex.series} serie${ex.series !== '1' ? 's' : ''}`}
                            {ex.series && ex.reps ? ' · ' : ''}
                            {ex.reps}
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
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <button className="btn btn-secondary btn-full" onClick={onClose}>
          Volver a rutinas
        </button>
      </div>
    </div>
  );
}

export default function Rutinas({ onEdit, onNew }) {
  const { routines, catalog, exerciseMap, deleteRoutine, duplicateRoutine } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewing, setViewing] = useState(null);

  if (viewing) {
    return (
      <RutinaDetail
        routine={viewing}
        exerciseMap={exerciseMap}
        onClose={() => setViewing(null)}
      />
    );
  }

  function handleDelete(id) {
    if (confirmDelete === id) {
      deleteRoutine(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Rutinas</h1>
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          <PlusIcon size={12} /> Nueva
        </button>
      </div>

      {routines.length === 0 && (
        <div className="empty-state">
          <p>No hay rutinas creadas.</p>
          <button className="btn btn-primary" onClick={onNew}>Crear primera rutina</button>
        </div>
      )}

      {routines.map(routine => {
        const cats = getCategories(routine, catalog);
        const totalEx = countExercises(routine);

        return (
          <div key={routine.id} className="card">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#263238', letterSpacing: '-0.01em' }}>{routine.name}</div>
                {routine.subtitle && (
                  <div style={{ fontSize: 12, color: '#78909C', marginTop: 1 }}>{routine.subtitle}</div>
                )}
              </div>
              <span className="badge badge-gray" style={{ marginLeft: 8 }}>{routine.duration || '—'}</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#78909C' }}>{totalEx} ejercicios</span>
              {cats.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {cats.slice(0, 3).map(cat => (
                    <span key={cat} className="badge badge-blue" style={{ fontSize: 10, padding: '2px 6px' }}>
                      {cat}
                    </span>
                  ))}
                  {cats.length > 3 && (
                    <span className="badge badge-gray" style={{ fontSize: 10, padding: '2px 6px' }}>
                      +{cats.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Phase summary */}
            <div style={{ borderTop: '1px solid #F1F5F4', paddingTop: 10, marginBottom: 12 }}>
              {routine.phases.map(phase => (
                <div key={phase.phase} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#78909C', fontWeight: 500 }}>{phase.phase}</span>
                  <span style={{ fontSize: 12, color: '#37474F' }}>
                    {phase.exercises.length > 0
                      ? `${phase.exercises.length} ej.`
                      : phase.note ? 'Nota' : '—'}
                    {phase.time ? ` · ${phase.time}` : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setViewing(routine)}>
                <EyeIcon size={13} /> Ver
              </button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onEdit(routine)}>
                <EditIcon size={13} /> Editar
              </button>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => { const copy = duplicateRoutine(routine.id); if (copy) onEdit(copy); }}>
                <CopyIcon size={13} /> Copiar
              </button>
              <button
                className={`btn btn-sm ${confirmDelete === routine.id ? 'btn-danger' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => handleDelete(routine.id)}
              >
                <TrashIcon size={13} /> {confirmDelete === routine.id ? '¿Seguro?' : 'Borrar'}
              </button>
            </div>
            {confirmDelete === routine.id && (
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
