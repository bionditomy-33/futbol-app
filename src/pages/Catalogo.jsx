import { useState, useMemo } from 'react';
import { useToast } from '../components/useToast';
import { useStore } from '../store/useStore';
import {
  PlayIcon, EditIcon, TrashIcon, PlusIcon, XIcon,
  ChevronDown, ChevronLeft, MoreHorizIcon, SearchIcon,
} from '../components/Icons';
import { CAT_PALETTE as CAT_COLORS } from '../utils/colors';

function generateId(category) {
  return `custom-${category.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
}

export default function Catalogo({ onBack } = {}) {
  const {
    catalog, catLinks,
    addExercise, editExercise, deleteExercise,
    addCategory, deleteCategory, editCategory, moveLinkToCategory,
    isExerciseUsed,
  } = useStore();

  const [open, setOpen] = useState({});
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState('default');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showAddEx, setShowAddEx] = useState(false);
  const [newEx, setNewEx] = useState({ name: '', category: '', link: '', newCatName: '' });
  const [isNewCat, setIsNewCat] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [catEditForm, setCatEditForm] = useState({ name: '', link: '' });
  const { showToast, ToastEl } = useToast();

  const totalExercises = useMemo(
    () => Object.values(catalog).reduce((s, ex) => s + ex.length, 0),
    [catalog],
  );

  const colorMap = useMemo(
    () => Object.fromEntries(Object.keys(catalog).map((cat, i) => [cat, CAT_COLORS[i % CAT_COLORS.length]])),
    [catalog],
  );

  const sortedCats = useMemo(() => {
    const cats = Object.keys(catalog);
    if (sortMode === 'az') return [...cats].sort((a, b) => a.localeCompare(b));
    if (sortMode === 'count') return [...cats].sort((a, b) => catalog[b].length - catalog[a].length);
    return cats;
  }, [catalog, sortMode]);

  const q = search.trim().toLowerCase();

  const visibleCats = useMemo(() => {
    if (!q) return sortedCats.map(cat => ({ cat, exercises: catalog[cat] }));
    return sortedCats
      .map(cat => ({ cat, exercises: catalog[cat].filter(ex => ex.name.toLowerCase().includes(q)) }))
      .filter(({ exercises }) => exercises.length > 0);
  }, [sortedCats, catalog, q]);

  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }));

  function handleAddExercise() {
    const catName = isNewCat ? newEx.newCatName.trim() : newEx.category;
    if (!newEx.name.trim() || !catName) return;
    if (isNewCat) addCategory(catName);
    addExercise(catName, {
      id: generateId(catName),
      name: newEx.name.trim(),
      ...(newEx.link.trim() ? { link: newEx.link.trim() } : {}),
    });
    setNewEx({ name: '', category: '', link: '', newCatName: '' });
    setIsNewCat(false);
    setShowAddEx(false);
    setOpen(o => ({ ...o, [catName]: true }));
  }

  function startEdit(ex) {
    setEditingId(ex.id);
    setEditForm({ name: ex.name, link: ex.link || '' });
    setOpenMenuId(null);
  }

  function saveEdit(id) {
    editExercise(id, { name: editForm.name.trim() || editForm.name, link: editForm.link.trim() || null });
    setEditingId(null);
  }

  function handleDeleteExercise(id) {
    setOpenMenuId(null);
    if (confirmDeleteId === id) {
      deleteExercise(id);
      setConfirmDeleteId(null);
      showToast('Ejercicio eliminado');
    } else {
      setConfirmDeleteId(id);
    }
  }

  function handleDeleteCategory(cat) {
    if ((catalog[cat] || []).length > 0) return;
    deleteCategory(cat);
    showToast('Categoría eliminada');
  }

  function startEditCat(cat) {
    setCatEditForm({ name: cat, link: catLinks[cat] || '' });
    setEditingCat(cat);
    setOpen(o => ({ ...o, [cat]: true }));
  }

  function saveEditCat(cat) {
    editCategory(cat, catEditForm.name, catEditForm.link);
    setEditingCat(null);
  }

  const allCategories = Object.keys(catalog);

  return (
    <div className="catalog-page" onClick={() => { setOpenMenuId(null); }}>

      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h1 className="page-title">Catálogo</h1>
          <span className="badge badge-navy">{totalExercises}</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddEx(true)}>
          <PlusIcon size={12} /> Agregar
        </button>
      </div>

      <div className="catalog-body">

        {/* ── Add exercise form ── */}
        {showAddEx && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Nuevo ejercicio</span>
              <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => { setShowAddEx(false); setIsNewCat(false); }}>
                <XIcon size={15} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="input" placeholder="Nombre del ejercicio" value={newEx.name} onChange={e => setNewEx(n => ({ ...n, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría *</label>
              {!isNewCat ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="input" value={newEx.category} onChange={e => setNewEx(n => ({ ...n, category: e.target.value }))} style={{ flex: 1 }}>
                    <option value="">Seleccionar categoría...</option>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button className="btn btn-outline btn-sm" onClick={() => { setIsNewCat(true); setNewEx(n => ({ ...n, category: '' })); }} style={{ whiteSpace: 'nowrap' }}>
                    + Nueva
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="Nombre de la nueva categoría" value={newEx.newCatName} onChange={e => setNewEx(n => ({ ...n, newCatName: e.target.value }))} autoFocus style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => setIsNewCat(false)}>Cancelar</button>
                </div>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Link de video <span style={{ color: 'var(--text-light)', fontWeight: 500 }}>(opcional)</span></label>
              <input className="input" placeholder="https://..." value={newEx.link} onChange={e => setNewEx(n => ({ ...n, link: e.target.value }))} />
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

        {/* ── Search ── */}
        <div className="catalog-search">
          <SearchIcon size={15} />
          <input
            className="catalog-search-input"
            placeholder="Buscar ejercicio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="catalog-search-clear" onClick={() => setSearch('')}>
              <XIcon size={12} />
            </button>
          )}
        </div>

        {/* ── Sort bar ── */}
        <div className="catalog-sort-bar">
          <span className="catalog-sort-label">Ordenar:</span>
          <select className="catalog-sort-select" value={sortMode} onChange={e => setSortMode(e.target.value)}>
            <option value="default">Predeterminado</option>
            <option value="az">A – Z</option>
            <option value="count">Cantidad</option>
          </select>
        </div>

        {/* ── Category cards ── */}
        {visibleCats.map(({ cat, exercises }) => {
          const color = colorMap[cat] || 'var(--gray-mid)';
          const isOpen = open[cat] || !!q;
          const catTotal = catalog[cat];
          const isEmpty = catTotal.length === 0;
          const catLink = catLinks[cat];
          const isEditingThisCat = editingCat === cat;

          return (
            <div key={cat} className="catalog-cat-card" style={{ borderLeftColor: color }}>

              {/* ── Category header ── */}
              <div
                className="catalog-cat-header"
                onClick={() => { if (!isEditingThisCat) toggle(cat); }}
              >
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="catalog-cat-name">{cat}</span>
                  {catLink && !isEditingThisCat && (
                    <a
                      href={catLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="catalog-cat-play"
                      onClick={e => e.stopPropagation()}
                      title="Ver video de la categoría"
                    >
                      <PlayIcon size={9} />
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="catalog-count-badge">
                    {catTotal.length} ejercicio{catTotal.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    className="catalog-cat-action-btn"
                    onClick={e => { e.stopPropagation(); isEditingThisCat ? setEditingCat(null) : startEditCat(cat); }}
                    title={isEditingThisCat ? 'Cancelar edición' : 'Editar categoría'}
                  >
                    {isEditingThisCat ? <XIcon size={13} /> : <EditIcon size={13} />}
                  </button>
                  {isEmpty && !q && !isEditingThisCat && (
                    <button
                      className="catalog-delete-cat-btn"
                      onClick={e => { e.stopPropagation(); handleDeleteCategory(cat); }}
                    >
                      <TrashIcon size={12} />
                    </button>
                  )}
                  {!isEditingThisCat && (
                    <span className={`catalog-chevron${isOpen ? ' is-open' : ''}`}>
                      <ChevronDown size={15} />
                    </span>
                  )}
                </div>
              </div>

              {/* ── Category edit form ── */}
              {isEditingThisCat && (
                <div className="catalog-cat-edit-form" onClick={e => e.stopPropagation()}>
                  <div className="form-group">
                    <label className="form-label">Nombre de la categoría</label>
                    <input
                      className="input"
                      value={catEditForm.name}
                      onChange={e => setCatEditForm(f => ({ ...f, name: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: moveLinkSuggestion(exercises, catLinks, cat, catEditForm) ? 10 : 14 }}>
                    <label className="form-label">
                      Video de la categoría <span style={{ color: 'var(--text-light)', fontWeight: 500 }}>(opcional)</span>
                    </label>
                    <input
                      className="input"
                      placeholder="https://..."
                      value={catEditForm.link}
                      onChange={e => setCatEditForm(f => ({ ...f, link: e.target.value }))}
                    />
                  </div>
                  <MoveLinkNotice
                    exercises={exercises}
                    catLinks={catLinks}
                    cat={cat}
                    catEditFormLink={catEditForm.link}
                    onMove={(exWithLink) => {
                      const link = moveLinkToCategory(cat, exWithLink.id);
                      if (link) setCatEditForm(f => ({ ...f, link }));
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => saveEditCat(cat)}
                      disabled={!catEditForm.name.trim()}
                    >
                      Guardar
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingCat(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* ── Exercises list ── */}
              {isOpen && !isEditingThisCat && (
                <div className="catalog-exercises-list" style={{ backgroundColor: color + '12' }}>
                  {exercises.length === 0 && (
                    <div className="catalog-empty-state">
                      Sin ejercicios. Podés eliminar esta categoría.
                    </div>
                  )}
                  {exercises.map(ex => (
                    <div key={ex.id} className="catalog-ex-item">
                      {editingId === ex.id ? (
                        <div className="catalog-ex-edit">
                          <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ marginBottom: 8 }} placeholder="Nombre" />
                          <input className="input" value={editForm.link} onChange={e => setEditForm(f => ({ ...f, link: e.target.value }))} style={{ marginBottom: 10 }} placeholder="Link de video (opcional)" />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(ex.id)} disabled={!editForm.name.trim()}>Guardar</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="catalog-ex-row" onClick={e => e.stopPropagation()}>
                          <div className="catalog-ex-name-area">
                            <span className="catalog-ex-name">{ex.name}</span>
                            {ex.link && (
                              <a
                                href={ex.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="catalog-ex-play"
                                onClick={e => e.stopPropagation()}
                                title="Ver video"
                              >
                                <PlayIcon size={8} />
                              </a>
                            )}
                          </div>

                          {confirmDeleteId === ex.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {isExerciseUsed(ex.id) && <span className="catalog-in-use-badge">En uso</span>}
                              <button className="btn btn-danger btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleDeleteExercise(ex.id)}>
                                Borrar
                              </button>
                              <button className="btn btn-ghost btn-sm" style={{ padding: '3px 5px' }} onClick={() => setConfirmDeleteId(null)}>
                                <XIcon size={11} />
                              </button>
                            </div>
                          ) : (
                            <div className="catalog-ex-actions" onClick={e => e.stopPropagation()}>
                              <button className="catalog-ex-action-btn" onClick={() => startEdit(ex)} title="Editar">
                                <EditIcon size={13} />
                              </button>
                              <button className="catalog-ex-action-btn catalog-ex-action-danger" onClick={() => handleDeleteExercise(ex.id)} title="Eliminar">
                                <TrashIcon size={13} />
                              </button>
                              <div className="catalog-ex-mobile-menu">
                                <button
                                  className="catalog-ex-dots-btn"
                                  onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === ex.id ? null : ex.id); }}
                                >
                                  <MoreHorizIcon size={16} />
                                </button>
                                {openMenuId === ex.id && (
                                  <div className="catalog-ex-dropdown" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => startEdit(ex)}><EditIcon size={12} /> Editar</button>
                                    <button className="danger" onClick={() => { setOpenMenuId(null); setConfirmDeleteId(ex.id); }}><TrashIcon size={12} /> Eliminar</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {q && visibleCats.length === 0 && (
          <div className="catalog-no-results">
            No hay ejercicios que coincidan con "<strong>{q}</strong>"
          </div>
        )}

      </div>
      {ToastEl}
    </div>
  );
}

function moveLinkSuggestion(exercises, catLinks, cat, catEditForm) {
  if (catLinks[cat] || catEditForm.link) return false;
  return exercises.some(ex => ex.link);
}

function MoveLinkNotice({ exercises, catLinks, cat, catEditFormLink, onMove }) {
  if (catLinks[cat] || catEditFormLink) return null;
  const exWithLink = exercises.find(ex => ex.link);
  if (!exWithLink) return null;
  return (
    <div className="catalog-move-link-notice">
      <span>
        El ejercicio <strong>{exWithLink.name}</strong> tiene un video asignado. ¿Querés moverlo a la categoría?
      </span>
      <button className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => onMove(exWithLink)}>
        Mover
      </button>
    </div>
  );
}
