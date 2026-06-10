import { useState, useMemo } from 'react';
import { CheckIcon, PlayIcon } from './Icons';
import { CAT_PALETTE as CAT_COLORS_PALETTE } from '../utils/colors';

function ExPills({ series, reps }) {
  if (!series && !reps) return null;
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
      {series && (
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--divider)', borderRadius: 5, padding: '2px 8px', lineHeight: 1.4 }}>
          {series}s
        </span>
      )}
      {reps && (
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-600)', background: 'var(--navy-100)', borderRadius: 5, padding: '2px 8px', lineHeight: 1.4 }}>
          {reps}
        </span>
      )}
    </div>
  );
}

function groupByCategory(exercises, catByExId) {
  const groups = [];
  for (const ex of exercises) {
    const cat = catByExId[ex.ref] || 'Sin categoría';
    const last = groups[groups.length - 1];
    if (last && last.cat === cat) {
      last.exercises.push(ex);
    } else {
      groups.push({ cat, exercises: [ex] });
    }
  }
  return groups;
}

// mode="edit": checkboxes para marcar ejercicios
// mode="read": solo visualizacion, sin checkboxes
export default function ExerciseGroupedList({
  exercises,
  catalog,
  exerciseMap,
  catLinks = {},
  completed = {},
  onToggle,
  mode = 'read',
}) {
  const [expandedGroups, setExpandedGroups] = useState({});

  const catByExId = useMemo(() => {
    const map = {};
    for (const [cat, exs] of Object.entries(catalog)) {
      for (const ex of exs) map[ex.id] = cat;
    }
    return map;
  }, [catalog]);

  const catColorMap = useMemo(() => {
    const cats = Object.keys(catalog);
    return Object.fromEntries(cats.map((cat, i) => [cat, CAT_COLORS_PALETTE[i % CAT_COLORS_PALETTE.length]]));
  }, [catalog]);

  const groups = useMemo(() => groupByCategory(exercises, catByExId), [exercises, catByExId]);

  if (exercises.length === 0) return null;

  return (
    <>
      {groups.map(({ cat, exercises: catExs }, idx) => {
        const isExpanded = expandedGroups[idx] !== false;
        const catColor = catColorMap[cat] || 'var(--text-light)';
        const catLink = catLinks[cat];
        const total = catExs.length;
        const done = mode === 'edit' ? catExs.filter(ex => !!completed[ex.ref]).length : 0;

        return (
          <div key={idx} style={{ marginBottom: 6, borderLeft: `4px solid ${catColor}`, paddingLeft: 10, marginLeft: 2 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0 5px', cursor: 'pointer', borderBottom: '0.5px solid var(--divider)' }}
              onClick={() => setExpandedGroups(prev => ({ ...prev, [idx]: !isExpanded }))}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {catLink && (
                  <a
                    href={catLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ color: catColor, lineHeight: 0, display: 'flex' }}
                  >
                    <PlayIcon size={9} />
                  </a>
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{cat}</span>
                <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  {mode === 'edit' ? `(${done}/${total})` : `(${total})`}
                </span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-light)' }}>{isExpanded ? '▼' : '▶'}</span>
            </div>

            {isExpanded && catExs.map((ex, ei) => {
              const info = exerciseMap[ex.ref];
              if (!info) return null;

              if (mode === 'edit') {
                const isDone = !!completed[ex.ref];
                return (
                  <div
                    key={`${ex.ref}-${ei}`}
                    className={`exercise-item${isDone ? ' done' : ''}`}
                    onClick={() => onToggle?.(ex.ref)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`checkbox-custom checkbox-lg${isDone ? ' checked' : ''}`}>
                      {isDone && <CheckIcon size={13} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: isDone ? 400 : 600, lineHeight: 1.3 }}>
                        {info.name}
                      </div>
                      <ExPills series={ex.series} reps={ex.reps} />
                    </div>
                    {info.link && (
                      <a href={info.link} target="_blank" rel="noopener noreferrer" className="video-btn" onClick={e => e.stopPropagation()}>
                        <PlayIcon size={9} /> Video
                      </a>
                    )}
                  </div>
                );
              }

              return (
                <div key={`${ex.ref}-${ei}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: ei < catExs.length - 1 ? '0.5px solid var(--divider)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{info.name}</div>
                    <ExPills series={ex.series} reps={ex.reps} />
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
        );
      })}
    </>
  );
}
