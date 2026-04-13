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

function getPhaseStyle(pi) {
  if (pi === 0) return 'phase-corporal';
  if (pi === 1) return 'phase-balon';
  if (pi === 2) return 'phase-principal';
  return 'phase-extra';
}

function getPhaseIcon(pi) {
  if (pi === 0) return <BodyIcon size={14} />;
  if (pi === 1) return <BallIcon size={14} />;
  if (pi === 2) return <FireIcon size={14} />;
  return null;
}

function getPhaseAccentColor(pi) {
  if (pi === 0) return '#2E7D32';
  if (pi === 1) return '#E65100';
  if (pi === 2) return '#1565C0';
  return '#64748B';
}

function getPhaseChipStyle(pi) {
  if (pi === 0) return { background: '#E8F5E9', color: '#2E7D32' };
  if (pi === 1) return { background: '#FFF8E1', color: '#E65100' };
  if (pi === 2) return { background: '#E3F2FD', color: '#1565C0' };
  return { background: '#F1F5F9', color: '#64748B' };
}

function RutinaDetail({ routine, exerciseMap, onClose }) {
  const totalEx = countExercises(routine);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: 'white',
        borderBottom: '1px solid #E2E8F0',
      }}>
        <button className="btn btn-ghost" style={{ padding: '6px 8px' }} onClick={onClose}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1A2332', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            {routine.name}
          </div>
          {routine.subtitle && (
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{routine.subtitle}</div>
          )}
        </div>
      </div>

      {/* Meta badges */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {routine.duration && (
          <span className="badge badge-gray">⏱ {routine.duration}</span>
        )}
        <span className="badge badge-gray">{totalEx} ejercicios</span>
      </div>

      {/* Phases */}
      <div style={{ padding: '12px 16px 0' }}>
        {routine.phases.map((phase, pi) => {
          const phaseClass = getPhaseStyle(pi);
          const icon = getPhaseIcon(pi);
          const accentColor = getPhaseAccentColor(pi);

          return (
            <div key={pi} className={`phase-block ${phaseClass}`} style={{ marginBottom: 12 }}>
              <div className="phase-block-header">
                {icon && <span style={{ color: accentColor }}>{icon}</span>}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 800, fontSize: 11, color: accentColor,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    {phase.phase}
                  </div>
                  {phase.time && (
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{phase.time}</div>
                  )}
                </div>
                {phase.exercises.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>
                    {phase.exercises.length} ej.
                  </span>
                )}
              </div>

              <div style={{ padding: '8px 14px 12px' }}>
                {phase.note && (
                  <div style={{
                    fontSize: 12, color: '#64748B',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: 8, padding: '7px 10px', marginBottom: 8,
                  }}>
                    {phase.note}
                  </div>
                )}
                {phase.exercises.length === 0 && !phase.note && (
                  <div style={{ fontSize: 13, color: '#94A3B8', padding: '4px 0' }}>Sin ejercicios</div>
                )}
                {phase.exercises.map((ex, ei) => {
                  const info = exerciseMap[ex.ref];
                  if (!info) return null;
                  return (
                    <div key={ei} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 0',
                      borderBottom: ei < phase.exercises.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    }}>
                      <div style={{
                        width: 24, height: 24, minWidth: 24,
                        background: 'rgba(255,255,255,0.85)',
                        borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 800, color: accentColor,
                      }}>
                        {ei + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1A2332' }}>{info.name}</div>
                        {(ex.series || ex.reps) && (
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
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

      <div style={{ padding: '4px 16px 16px' }}>
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
          <div className="empty-state-icon">⚽</div>
          <div className="empty-state-title">Sin rutinas</div>
          <p>Creá tu primera rutina de entrenamiento</p>
          <button className="btn btn-primary" onClick={onNew}>Crear rutina</button>
        </div>
      )}

      {routines.map(routine => {
        const cats = getCategories(routine, catalog);
        const totalEx = countExercises(routine);

        return (
          <div key={routine.id} className="routine-card">
            {/* Card top */}
            <div className="routine-card-top">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 800, fontSize: 16, color: '#1A2332',
                    letterSpacing: '-0.02em', lineHeight: 1.2,
                  }}>
                    {routine.name}
                  </div>
                  {routine.subtitle && (
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{routine.subtitle}</div>
                  )}
                </div>
                {routine.duration && (
                  <span className="badge badge-gray" style={{ marginLeft: 10, flexShrink: 0 }}>
                    ⏱ {routine.duration}
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
                  {totalEx} ejercicios
                </span>
                {cats.slice(0, 3).map(cat => (
                  <span key={cat} className="badge badge-blue" style={{ fontSize: 9, padding: '2px 7px' }}>
                    {cat}
                  </span>
                ))}
                {cats.length > 3 && (
                  <span className="badge badge-gray" style={{ fontSize: 9, padding: '2px 7px' }}>
                    +{cats.length - 3}
                  </span>
                )}
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
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setConfirmDelete(null)}>
                  Cancelar
                </button>
              )}
            </div>

            {/* Phase chips */}
            <div className="routine-card-phases">
              {routine.phases.map((phase, pi) => {
                const chipStyle = getPhaseChipStyle(pi);
                return (
                  <div key={pi} className="routine-phase-chip" style={chipStyle}>
                    {phase.phase.split(' ')[0]}
                    {phase.exercises.length > 0 && (
                      <div style={{ fontWeight: 400, fontSize: 8, marginTop: 1, opacity: 0.8 }}>
                        {phase.exercises.length} ej
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
