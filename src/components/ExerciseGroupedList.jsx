import { useState, useMemo } from 'react';
import { CheckIcon, PlayIcon } from './Icons';

const CAT_COLORS_PALETTE = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#EC4899'];

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
        const catColor = catColorMap[cat] || '#94A3B8';
        const catLink = catLinks[cat];
        const total = catExs.length;
        const done = mode === 'edit' ? catExs.filter(ex => !!completed[ex.ref]).length : 0;

        return (
          <div key={idx} style={{ marginBottom: 4, borderLeft: `3px solid ${catColor}`, paddingLeft: 8, marginLeft: 4 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0 5px', cursor: 'pointer', borderBottom: '0.5px solid #E8ECEB' }}
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
                <span style={{ fontSize: 12, fontWeight: 700, color: '#37474F' }}>{cat}</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>
                  {mode === 'edit' ? `(${done}/${total})` : `(${total})`}
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#B0BEC5' }}>{isExpanded ? '▼' : '▶'}</span>
            </div>

            {isExpanded && catExs.map((ex, ei) => {
              const info = exerciseMap[ex.ref];
              if (!info) return null;

              if (mode === 'edit') {
                const isDone = !!completed[ex.ref];
                return (
                  <div key={`${ex.ref}-${ei}`} className={`exercise-item${isDone ? ' done' : ''}`}>
                    <div onClick={() => onToggle?.(ex.ref)} style={{ cursor: 'pointer' }}>
                      <div className={`checkbox-custom${isDone ? ' checked' : ''}`}>
                        {isDone && <CheckIcon size={11} />}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#263238', fontWeight: isDone ? 400 : 500, lineHeight: 1.3 }}>
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

              return (
                <div key={`${ex.ref}-${ei}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: ei < catExs.length - 1 ? '0.5px solid #F1F5F4' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: '#263238', fontWeight: 500 }}>{info.name}</div>
                    {(ex.series || ex.reps) && (
                      <div style={{ fontSize: 12, color: '#78909C', marginTop: 1 }}>
                        {ex.series ? `${ex.series}s` : ''}{ex.series && ex.reps ? ' · ' : ''}{ex.reps || ''}
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
        );
      })}
    </>
  );
}
