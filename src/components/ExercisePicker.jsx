import { useState } from 'react';
import { XIcon, PlayIcon, ChevronDown, ChevronUp } from './Icons';

const CAT_COLORS = [
  { bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' },
  { bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' },
  { bg: '#FFF8E1', color: '#F57F17', border: '#FFE082' },
  { bg: '#FCE4EC', color: '#AD1457', border: '#F48FB1' },
  { bg: '#EDE7F6', color: '#4527A0', border: '#CE93D8' },
  { bg: '#E0F2F1', color: '#00695C', border: '#80CBC4' },
  { bg: '#FBE9E7', color: '#BF360C', border: '#FFAB91' },
  { bg: '#F3E5F5', color: '#6A1B9A', border: '#CE93D8' },
];

function getCatColor(idx) {
  return CAT_COLORS[idx % CAT_COLORS.length];
}

export default function ExercisePicker({ catalog, onSelect, onClose }) {
  const [open, setOpen] = useState({});
  const [search, setSearch] = useState('');

  const toggleCat = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }));

  const searchLower = search.toLowerCase().trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span style={{ fontWeight: 800, fontSize: 16, color: '#263238' }}>Agregar ejercicio</span>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '4px' }}>
            <XIcon size={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 12px' }}>
          <input
            className="input"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {Object.entries(catalog).map(([cat, exercises], catIdx) => {
          const filtered = searchLower
            ? exercises.filter(ex => ex.name.toLowerCase().includes(searchLower))
            : exercises;

          if (filtered.length === 0) return null;

          const { bg, color, border } = getCatColor(catIdx);
          const isOpen = open[cat] || !!searchLower;

          return (
            <div key={cat}>
              {/* Category button */}
              {!searchLower && (
                <div
                  onClick={() => toggleCat(cat)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: isOpen ? bg : 'white',
                    borderBottom: `1px solid ${isOpen ? border : '#F1F5F4'}`,
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      background: bg, color, border: `1px solid ${border}`,
                      borderRadius: 8, padding: '4px 10px',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {cat}
                    </div>
                    <span style={{ fontSize: 12, color: '#78909C' }}>{exercises.length}</span>
                  </div>
                  <span style={{ color: '#B0BEC5' }}>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </div>
              )}

              {searchLower && (
                <div style={{ padding: '4px 16px 2px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 6, padding: '2px 8px' }}>{cat}</span>
                </div>
              )}

              {isOpen && (
                <div style={{ paddingBottom: searchLower ? 8 : 4 }}>
                  {filtered.map(ex => (
                    <div
                      key={ex.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 16px',
                        borderBottom: '0.5px solid #F5F7F5',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      onClick={() => { onSelect(ex); onClose(); }}
                      onMouseEnter={e => e.currentTarget.style.background = bg}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <span style={{ fontSize: 14, color: '#263238', fontWeight: 500 }}>{ex.name}</span>
                        {ex.link && (
                          <span className="video-btn" onClick={e => { e.stopPropagation(); window.open(ex.link, '_blank'); }}>
                            <PlayIcon size={9} /> Video
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 18, color, fontWeight: 700, marginLeft: 8, lineHeight: 1
                      }}>+</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
