import { useState, useEffect, useCallback } from 'react';
import { INITIAL_CATALOG, INITIAL_ROUTINES } from '../data/initialData';

function loadFromLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Migrate old phase names to new ones
const PHASE_MIGRATION = {
  'Movilidad': 'Calentamiento corporal',
  'Calentamiento': 'Calentamiento con balon',
  'Entrenamiento': 'Sesion principal',
};

function migrateRoutines(routines) {
  return routines.map(r => ({
    ...r,
    phases: r.phases.map(p => ({
      ...p,
      phase: PHASE_MIGRATION[p.phase] || p.phase,
    }))
  }));
}

// Flat map of all exercises by id
function buildExerciseMap(catalog) {
  const map = {};
  for (const [, exercises] of Object.entries(catalog)) {
    for (const ex of exercises) {
      map[ex.id] = ex;
    }
  }
  return map;
}

let listeners = [];

const rawRoutines = loadFromLS('routines', INITIAL_ROUTINES);
const migratedRoutines = migrateRoutines(rawRoutines);
// Save migrated back if there were changes
if (JSON.stringify(rawRoutines) !== JSON.stringify(migratedRoutines)) {
  saveToLS('routines', migratedRoutines);
}

let state = {
  catalog: loadFromLS('catalog', INITIAL_CATALOG),
  routines: migratedRoutines,
  schedule: loadFromLS('schedule', {}),
  history: loadFromLS('history', {}),
};

export function getState() { return state; }

function setState(partial) {
  state = { ...state, ...partial };
  if (partial.catalog !== undefined) saveToLS('catalog', state.catalog);
  if (partial.routines !== undefined) saveToLS('routines', state.routines);
  if (partial.schedule !== undefined) saveToLS('schedule', state.schedule);
  if (partial.history !== undefined) saveToLS('history', state.history);
  listeners.forEach(l => l());
}

export function useStore() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender(n => n + 1);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  const catalog = state.catalog;
  const routines = state.routines;
  const schedule = state.schedule;
  const history = state.history;
  const exerciseMap = buildExerciseMap(catalog);

  // Schedule actions
  const assignRoutine = useCallback((dateStr, routineId) => {
    setState({ schedule: { ...state.schedule, [dateStr]: routineId } });
  }, []);

  const removeSchedule = useCallback((dateStr) => {
    const s = { ...state.schedule };
    delete s[dateStr];
    setState({ schedule: s });
  }, []);

  // History actions
  const getDay = useCallback((dateStr) => {
    return state.history[dateStr] || { done: false, routineId: null, completed: {}, gym: false, notes: '' };
  }, []);

  const updateDay = useCallback((dateStr, patch) => {
    const current = state.history[dateStr] || { done: false, routineId: null, completed: {}, gym: false, notes: '' };
    setState({ history: { ...state.history, [dateStr]: { ...current, ...patch } } });
  }, []);

  const toggleExercise = useCallback((dateStr, exerciseId) => {
    const day = state.history[dateStr] || { done: false, routineId: null, completed: {}, gym: false, notes: '' };
    const completed = { ...day.completed, [exerciseId]: !day.completed[exerciseId] };
    setState({ history: { ...state.history, [dateStr]: { ...day, completed } } });
  }, []);

  const completeDay = useCallback((dateStr, routineId) => {
    const day = state.history[dateStr] || { done: false, routineId, completed: {}, gym: false, notes: '' };
    setState({ history: { ...state.history, [dateStr]: { ...day, done: true, routineId } } });
  }, []);

  const uncompleteDay = useCallback((dateStr) => {
    const day = state.history[dateStr];
    if (!day) return;
    setState({ history: { ...state.history, [dateStr]: { ...day, done: false } } });
  }, []);

  // Routine actions
  const saveRoutine = useCallback((routine) => {
    const exists = state.routines.find(r => r.id === routine.id);
    if (exists) {
      setState({ routines: state.routines.map(r => r.id === routine.id ? routine : r) });
    } else {
      setState({ routines: [...state.routines, routine] });
    }
  }, []);

  const deleteRoutine = useCallback((id) => {
    setState({ routines: state.routines.filter(r => r.id !== id) });
    const s = { ...state.schedule };
    for (const [date, rid] of Object.entries(s)) {
      if (rid === id) delete s[date];
    }
    setState({ schedule: s });
  }, []);

  const updatePhaseObjective = useCallback((routineId, phaseIndex, objective) => {
    const updatedRoutines = state.routines.map(r => {
      if (r.id !== routineId) return r;
      return {
        ...r,
        phases: r.phases.map((p, i) => i === phaseIndex ? { ...p, objective: objective || null } : p),
      };
    });
    setState({ routines: updatedRoutines });
  }, []);

  const duplicateRoutine = useCallback((id) => {
    const source = state.routines.find(r => r.id === id);
    if (!source) return null;
    const copy = {
      ...JSON.parse(JSON.stringify(source)),
      id: `r-${Date.now()}`,
      name: `${source.name} (copia)`
    };
    setState({ routines: [...state.routines, copy] });
    return copy;
  }, []);

  // Catalog CRUD
  const addExercise = useCallback((category, exercise) => {
    const cat = state.catalog[category] || [];
    setState({
      catalog: { ...state.catalog, [category]: [...cat, exercise] }
    });
  }, []);

  const editExercise = useCallback((id, patch) => {
    const newCatalog = {};
    for (const [cat, exercises] of Object.entries(state.catalog)) {
      newCatalog[cat] = exercises.map(ex => ex.id === id ? { ...ex, ...patch } : ex);
    }
    setState({ catalog: newCatalog });
  }, []);

  const deleteExercise = useCallback((id) => {
    const newCatalog = {};
    for (const [cat, exercises] of Object.entries(state.catalog)) {
      const filtered = exercises.filter(ex => ex.id !== id);
      if (filtered.length > 0) newCatalog[cat] = filtered;
      else newCatalog[cat] = filtered; // keep empty categories visible until manually deleted
    }
    setState({ catalog: newCatalog });
  }, []);

  const addCategory = useCallback((name) => {
    if (state.catalog[name]) return;
    setState({ catalog: { ...state.catalog, [name]: [] } });
  }, []);

  const deleteCategory = useCallback((name) => {
    const newCatalog = { ...state.catalog };
    delete newCatalog[name];
    setState({ catalog: newCatalog });
  }, []);

  // Check if exercise is used in any routine
  const isExerciseUsed = useCallback((id) => {
    return state.routines.some(r =>
      r.phases.some(p => p.exercises.some(ex => ex.ref === id))
    );
  }, []);

  return {
    catalog,
    routines,
    schedule,
    history,
    exerciseMap,
    assignRoutine,
    removeSchedule,
    getDay,
    updateDay,
    toggleExercise,
    completeDay,
    uncompleteDay,
    saveRoutine,
    deleteRoutine,
    duplicateRoutine,
    updatePhaseObjective,
    addExercise,
    editExercise,
    deleteExercise,
    addCategory,
    deleteCategory,
    isExerciseUsed,
  };
}
