import { useState } from 'react';
import { useStore } from '../store/useStore';
import { ChevronDown, ChevronUp, PlayIcon, EditIcon, TrashIcon, PlusIcon, XIcon, CheckIcon, ChevronLeft } from '../components/Icons';

function generateId(category) {
  return `custom-${category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
}

export default function Catalogo({ onBack } = {}) {
  const { catalog, addExercise, editExercise, deleteExercise, addCategory, deleteCategory, isExerciseUsed } = useStore();
  const [open, setOpen] = useState({});

  // Add exercise form
  const [showAddEx, setShowAddEx] = useState(false);
  const [newEx, setNewEx] = useState({ name: '', category: '', link: '', newCatName: '' });
  const [isNewCat, setIsNewCat] = useState(false);

  // Edit exercise
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }));

  const totalExercises = Object.values(catalog).reduce((sum, exs) => sum + exs.length, 0);
  const categories = Object.keys(catalog);

  function handleAddExercise() {
    const catName = isNewCat ? newEx.newCatName.trim() : newEx.category;
    if (!newEx.name.trim() || !catName) return;
    if (isNewCat) addCategory(catName);
    const exercise = {
      id: generateId(catName),
      name: newEx.name.trim(),
      ...(newEx.link.trim() ? { link: newEx.link.trim() } : {}),
    };
    addExercise(catName, exercise);
    setNewEx({ name: '', category: '', link: '', newCatName: '' });
    setIsNewCat(false);
    setShowAddEx(false);
    setOpen(o => ({ ...o, [catName]: true }));
  }

  function startEdit(ex) {
    setEditingId(ex.id);
    setEditForm({ name: ex.name, link: ex.link || '' });
  }

  function saveEdit(id) {
    editExercise(id, {
      name: editForm.name.trim() || editForm.name,
      link: editForm.link.trim() || undefined,
    });
    setEditingId(null);
  }

  function handleDeleteExercise(id) {
    if (confirmDeleteId === id) {
      deleteExercise(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  function handleDeleteCategory(cat) {
    const exs = catalog[cat] || [];
    if (exs.length > 0) return; // shouldn't happen - button disabled
    deleteCategory(cat);
  }

  // Category color map (cycle through a few)
  const CAT_COLORS = [
    { bg: '#E8F5E9', color: '#2E7D32' },
    { bg: '#E3F2FD', color: '#1565C0' },
    { bg: '#FFF8E1', color: '#F57F17' },
    { bg: '#FCE4EC', color: '#AD1457' },
    { bg: '#EDE7F6', color: '#4527A0' },
    { bg: '#E0F2F1', color: '#00695C' },
    { bg: '#FBE9E7', color: '#BF360C' },
    { bg: '#F3E5F5', color: '#6A1B9A' },
  ];
  function getCatColor(idx) {
    return CAT_COLORS[idx % CAT_COLORS.length];
  }

  return (
    <div className="page-content">
      <div className="page-header" style={{ paddingBottom: 8 }}>
        {onBack && (
          <button className="btn btn-ghost" style={{ padding: '6px 8px', marginRight: 4 }} onClick={onBack}>
            <ChevronLeft size={18} />
          </button>
        )}
        <h1 className="page-title">Catálogo</h1>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="badge badge-gray">{totalExercises} ejercicios</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddEx(true)}>
            <PlusIcon size={12} /> Agregar
          </button>
        </div>
      </div>

      {/* Add exercise form */}
      {showAddEx && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#263238' }}>Nuevo ejercicio</span>
            <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { setShowAddEx(false); setIsNewCat(false); }}>
              <XIcon size={15} />
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input
              className="input"
              placeholder="Nombre del ejercicio"
              value={newEx.name}
              onChange={e => setNewEx(n => ({ ...n, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Categoria *</label>
            {!isNewCat ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  className="input"
                  value={newEx.category}
                  onChange={e => setNewEx(n => ({ ...n, category: e.target.value }))}
                  style={{ flex: 1 }}
                >
                  <option value="">Seleccionar categoria...</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { setIsNewCat(true); setNewEx(n => ({ ...n, category: '' })); }}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  + Nueva
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  placeholder="Nombre de la nueva categoria"
                  value={newEx.newCatName}
                  onChange={e => setNewEx(n => ({ ...n, newCatName: e.target.value }))}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setIsNewCat(false)}>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Link de video (opcional)</label>
            <input
              className="input"
              placeholder="https://..."
              value={newEx.link}
              onChange={e => setNewEx(n => ({ ...n, link: e.target.value }))}
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={handleAddExercise}
            disabled={!newEx.name.trim() || (!newEx.category && !(isNewCat && newEx.newCatName.trim()))}
          >
            Agregar ejercicio
          </button>
        </div>
      )}

      {/* Category list */}
      <div style={{ padding: '0 0 8px' }}>
        {categories.map((cat, catIdx) => {
          const exercises = catalog[cat];
          const { bg, color } = getCatColor(catIdx);
          const isEmpty = exercises.length === 0;

          return (
            <div key={cat} style={{ borderBottom: '1px solid #F1F5F4' }}>
              <div className="category-header" onClick={() => toggle(cat)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    background: bg,
                    color,
                    borderRadius: 8,
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                  }}>
                    {cat}
                  </div>
                  <span className="badge badge-gray" style={{ fontSize: 11 }}>{exercises.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isEmpty && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#EF5350', padding: '3px 6px', fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); handleDeleteCategory(cat); }}
                    >
                      <TrashIcon size={12} />
                    </button>
                  )}
                  {open[cat] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {open[cat] && (
                <div style={{ paddingBottom: 8 }}>
                  {exercises.length === 0 && (
                    <div style={{ padding: '10px 16px', fontSize: 13, color: '#B0BEC5' }}>
                      Sin ejercicios. Podés eliminar esta categoria.
                    </div>
                  )}
                  {exercises.map(ex => (
                    <div key={ex.id}>
                      {editingId === ex.id ? (
                        // Edit form inline
                        <div style={{ padding: '10px 16px', background: '#F8FAFA', borderBottom: '0.5px solid #F1F5F4' }}>
                          <input
                            className="input"
                            value={editForm.name}
                            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            style={{ marginBottom: 8 }}
                            placeholder="Nombre"
                          />
                          <input
                            className="input"
                            value={editForm.link}
                            onChange={e => setEditForm(f => ({ ...f, link: e.target.value }))}
                            style={{ marginBottom: 10 }}
                            placeholder="Link de video (opcional)"
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(ex.id)} disabled={!editForm.name.trim()}>
                              Guardar
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex', alignItems: 'center',
                            padding: '9px 16px',
                            borderBottom: '0.5px solid #F9FAFA',
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 14, color: '#37474F', fontWeight: 500 }}>{ex.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {ex.link && (
                              <a
                                href={ex.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="video-btn"
                                onClick={e => e.stopPropagation()}
                              >
                                <PlayIcon size={9} /> Video
                              </a>
                            )}
                            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }} onClick={() => startEdit(ex)}>
                              <EditIcon size={13} />
                            </button>
                            {confirmDeleteId === ex.id ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                {isExerciseUsed(ex.id) && (
                                  <span style={{ fontSize: 10, color: '#F57F17', fontWeight: 600 }}>En uso</span>
                                )}
                                <button
                                  className="btn btn-danger btn-sm"
                                  style={{ padding: '4px 8px', fontSize: 11 }}
                                  onClick={() => handleDeleteExercise(ex.id)}
                                >
                                  Borrar
                                </button>
                                <button className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }} onClick={() => setConfirmDeleteId(null)}>
                                  <XIcon size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '4px 6px', color: '#EF5350' }}
                                onClick={() => handleDeleteExercise(ex.id)}
                              >
                                <TrashIcon size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
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
