import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_CATALOG, INITIAL_ROUTINES } from '../data/initialData';

// Migrate old phase names to current names (covers all previous versions in one pass)
const PHASE_MIGRATION = {
  // v1 names
  'Movilidad':             'Activacion - Bloque Agilidad',
  'Calentamiento':         'Bloque Entrenamiento Principal',
  'Entrenamiento':         'Vuelta a la calma',
  // v2 names
  'Calentamiento corporal':  'Activacion - Bloque Agilidad',
  'Calentamiento con balon': 'Bloque Entrenamiento Principal',
  'Sesion principal':        'Vuelta a la calma',
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

function buildExerciseMap(catalog) {
  const map = {};
  for (const [, exercises] of Object.entries(catalog)) {
    for (const ex of exercises) {
      map[ex.id] = ex;
    }
  }
  return map;
}

// ─── Module-level singleton state ────────────────────────────────────────────

let listeners = [];

let state = {
  catalog:  INITIAL_CATALOG,
  routines: INITIAL_ROUTINES,
  schedule: {},
  history:  {},
  matches:  [],
  isReady:  false,
};

export function getState() { return state; }

function setState(partial) {
  state = { ...state, ...partial };
  listeners.forEach(l => l());
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

function writeDoc(docName, data) {
  setDoc(doc(db, 'app', docName), { data }).catch(err => {
    console.error(`[store] Failed to write ${docName}:`, err);
  });
}

// Track which docs have had their first snapshot (Set prevents double-counting)
const docLoadedSet = new Set();
const TOTAL_DOCS = 5;

function onDocFirstLoad(docName) {
  if (!docLoadedSet.has(docName)) {
    docLoadedSet.add(docName);
    if (docLoadedSet.size >= TOTAL_DOCS) {
      setState({ isReady: true });
    }
  }
}

// ─── Firestore initialization (runs once at module load) ──────────────────────

let initialized = false;

function initFirestore() {
  if (initialized) return;
  initialized = true;

  const DOCS = ['catalog', 'routines', 'schedule', 'history', 'matches'];

  DOCS.forEach(docName => {
    const ref = doc(db, 'app', docName);

    onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        // Primera vez: crear el documento con los datos iniciales
        let initialData;
        if (docName === 'catalog')  initialData = INITIAL_CATALOG;
        else if (docName === 'routines') initialData = INITIAL_ROUTINES;
        else if (docName === 'matches')  initialData = [];
        else initialData = {};

        writeDoc(docName, initialData);
        // El estado en memoria ya tiene los valores iniciales; solo marcar como listo
        onDocFirstLoad(docName);
      } else {
        let data = snap.data().data;
        if (docName === 'routines') data = migrateRoutines(data);
        setState({ [docName]: data });
        onDocFirstLoad(docName);
      }
    }, (err) => {
      console.error(`[store] onSnapshot error for ${docName}:`, err);
      onDocFirstLoad(docName); // No bloquear la app si un doc falla
    });
  });
}

initFirestore();

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStore() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender(n => n + 1);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  const { catalog, routines, schedule, history, matches, isReady } = state;
  const exerciseMap = buildExerciseMap(catalog);

  // ── Schedule ──────────────────────────────────────────────────────────────
  const assignRoutine = useCallback((dateStr, routineId) => {
    const next = { ...state.schedule, [dateStr]: routineId };
    setState({ schedule: next });
    writeDoc('schedule', next);
  }, []);

  const removeSchedule = useCallback((dateStr) => {
    const next = { ...state.schedule };
    delete next[dateStr];
    setState({ schedule: next });
    writeDoc('schedule', next);
  }, []);

  // ── History ───────────────────────────────────────────────────────────────
  const getDay = useCallback((dateStr) => {
    return state.history[dateStr] || { done: false, routineId: null, completed: {}, gym: false, notes: '' };
  }, []);

  const updateDay = useCallback((dateStr, patch) => {
    const current = state.history[dateStr] || { done: false, routineId: null, completed: {}, gym: false, notes: '' };
    const next = { ...state.history, [dateStr]: { ...current, ...patch } };
    setState({ history: next });
    writeDoc('history', next);
  }, []);

  const toggleExercise = useCallback((dateStr, exerciseId) => {
    const day = state.history[dateStr] || { done: false, routineId: null, completed: {}, gym: false, notes: '' };
    const completed = { ...day.completed, [exerciseId]: !day.completed[exerciseId] };
    const next = { ...state.history, [dateStr]: { ...day, completed } };
    setState({ history: next });
    writeDoc('history', next);
  }, []);

  const completeDay = useCallback((dateStr, routineId) => {
    const day = state.history[dateStr] || { done: false, routineId, completed: {}, gym: false, notes: '' };
    const next = { ...state.history, [dateStr]: { ...day, done: true, routineId } };
    setState({ history: next });
    writeDoc('history', next);
  }, []);

  const uncompleteDay = useCallback((dateStr) => {
    const day = state.history[dateStr];
    if (!day) return;
    const next = { ...state.history, [dateStr]: { ...day, done: false } };
    setState({ history: next });
    writeDoc('history', next);
  }, []);

  // ── Routines ──────────────────────────────────────────────────────────────
  const saveRoutine = useCallback((routine) => {
    const exists = state.routines.find(r => r.id === routine.id);
    const next = exists
      ? state.routines.map(r => r.id === routine.id ? routine : r)
      : [...state.routines, routine];
    setState({ routines: next });
    writeDoc('routines', next);
  }, []);

  const deleteRoutine = useCallback((id) => {
    const nextRoutines = state.routines.filter(r => r.id !== id);
    setState({ routines: nextRoutines });
    writeDoc('routines', nextRoutines);

    const nextSchedule = { ...state.schedule };
    for (const [date, rid] of Object.entries(nextSchedule)) {
      if (rid === id) delete nextSchedule[date];
    }
    setState({ schedule: nextSchedule });
    writeDoc('schedule', nextSchedule);
  }, []);

  const updatePhaseObjective = useCallback((routineId, phaseIndex, objective) => {
    const next = state.routines.map(r => {
      if (r.id !== routineId) return r;
      return {
        ...r,
        phases: r.phases.map((p, i) => i === phaseIndex ? { ...p, objective: objective || null } : p),
      };
    });
    setState({ routines: next });
    writeDoc('routines', next);
  }, []);

  const duplicateRoutine = useCallback((id) => {
    const source = state.routines.find(r => r.id === id);
    if (!source) return null;
    const copy = {
      ...JSON.parse(JSON.stringify(source)),
      id: `r-${Date.now()}`,
      name: `${source.name} (copia)`,
    };
    const next = [...state.routines, copy];
    setState({ routines: next });
    writeDoc('routines', next);
    return copy;
  }, []);

  // ── Catalog ───────────────────────────────────────────────────────────────
  const addExercise = useCallback((category, exercise) => {
    const cat = state.catalog[category] || [];
    const next = { ...state.catalog, [category]: [...cat, exercise] };
    setState({ catalog: next });
    writeDoc('catalog', next);
  }, []);

  const editExercise = useCallback((id, patch) => {
    const next = {};
    for (const [cat, exercises] of Object.entries(state.catalog)) {
      next[cat] = exercises.map(ex => ex.id === id ? { ...ex, ...patch } : ex);
    }
    setState({ catalog: next });
    writeDoc('catalog', next);
  }, []);

  const deleteExercise = useCallback((id) => {
    const next = {};
    for (const [cat, exercises] of Object.entries(state.catalog)) {
      next[cat] = exercises.filter(ex => ex.id !== id); // keep category even if empty
    }
    setState({ catalog: next });
    writeDoc('catalog', next);
  }, []);

  const addCategory = useCallback((name) => {
    if (state.catalog[name]) return;
    const next = { ...state.catalog, [name]: [] };
    setState({ catalog: next });
    writeDoc('catalog', next);
  }, []);

  const deleteCategory = useCallback((name) => {
    const next = { ...state.catalog };
    delete next[name];
    setState({ catalog: next });
    writeDoc('catalog', next);
  }, []);

  const isExerciseUsed = useCallback((id) => {
    return state.routines.some(r =>
      r.phases.some(p => p.exercises.some(ex => ex.ref === id))
    );
  }, []);

  // ── Matches ───────────────────────────────────────────────────────────────
  const setMatches = useCallback((newMatches) => {
    setState({ matches: newMatches });
    writeDoc('matches', newMatches);
  }, []);

  // ── Import (reemplaza todos los datos) ────────────────────────────────────
  const importData = useCallback(async ({ catalog: cat, routines: rts, schedule: sch, history: hist }) => {
    const migratedRts = migrateRoutines(rts);
    setState({ catalog: cat, routines: migratedRts, schedule: sch, history: hist });
    await Promise.all([
      setDoc(doc(db, 'app', 'catalog'),  { data: cat }),
      setDoc(doc(db, 'app', 'routines'), { data: migratedRts }),
      setDoc(doc(db, 'app', 'schedule'), { data: sch }),
      setDoc(doc(db, 'app', 'history'),  { data: hist }),
    ]);
  }, []);

  return {
    catalog,
    routines,
    schedule,
    history,
    matches,
    isReady,
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
    setMatches,
    importData,
  };
}
