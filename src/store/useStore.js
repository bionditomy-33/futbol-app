import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_CATALOG, INITIAL_ROUTINES } from '../data/initialData';
import { todayStr } from '../utils/dates';

// ─── Date helpers (store-local) ───────────────────────────────────────────────

function storeDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysStore(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return storeDateStr(d);
}

function getWeekStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  date.setDate(date.getDate() + diff);
  return storeDateStr(date);
}

// ─── Plan progress (pure computation, exported for use in pages) ──────────────

export function getPlanProgress(plan, history) {
  const {
    routineIds = [], startDate, endDate, targetSessions,
    activityType = 'individual',
    gymWeeklyFrequency, individualWeeklyFrequency,
    targetGymSessions, targetIndividualSessions,
  } = plan;

  const today    = todayStr();
  const MS_DAY   = 86400000;
  const startMs  = new Date(startDate + 'T12:00:00').getTime();
  const endMs    = new Date(endDate   + 'T12:00:00').getTime();
  const nowMs    = new Date(today     + 'T12:00:00').getTime();

  // Total weeks of plan
  const totalDays  = Math.max(1, Math.round((endMs - startMs) / MS_DAY));
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const isPending      = today < startDate;
  const daysUntilStart = isPending ? Math.round((startMs - nowMs) / MS_DAY) : 0;

  if (isPending) {
    return {
      completedSessions: 0, gymSessions: 0, individualSessions: 0,
      pct: 0, gymPct: null, individualPct: null,
      isComplete: false, isExpired: false, needsClosing: false,
      remainingDays: 0, isOnTrack: true, neededPerWeek: 0,
      neededGymPerWeek: 0, neededIndividualPerWeek: 0,
      gymOnTrack: true, individualOnTrack: true,
      isPending: true, daysUntilStart,
      currentWeekNum: 0, totalWeeks,
    };
  }

  let gymSessions = 0;
  let individualSessions = 0;
  for (const [dateStr, day] of Object.entries(history)) {
    if (dateStr < startDate || dateStr > endDate) continue;
    if ((activityType === 'gym' || activityType === 'both') && day.gym) gymSessions++;
    if ((activityType === 'individual' || activityType === 'both') && day.done
        && (routineIds.length === 0 || routineIds.includes(day.routineId))) individualSessions++;
  }

  const completedSessions = gymSessions + individualSessions;

  // Effective targets
  const effGymTarget = targetGymSessions ?? (activityType === 'gym' ? targetSessions : null);
  const effIndTarget = targetIndividualSessions ?? (activityType === 'individual' ? targetSessions : null);
  const effTotal     = targetSessions || ((effGymTarget || 0) + (effIndTarget || 0));

  const pct           = Math.min(100, Math.round((completedSessions / Math.max(1, effTotal)) * 100));
  const gymPct        = effGymTarget != null ? Math.min(100, Math.round((gymSessions / Math.max(1, effGymTarget)) * 100)) : null;
  const individualPct = effIndTarget != null ? Math.min(100, Math.round((individualSessions / Math.max(1, effIndTarget)) * 100)) : null;

  const isComplete   = completedSessions >= effTotal;
  const isExpired    = today > endDate;
  const needsClosing = (isComplete || isExpired) && plan.status !== 'completed';

  const elapsedDays   = Math.max(0, Math.round((Math.min(nowMs, endMs) - startMs) / MS_DAY));
  const remainingDays = Math.max(0, Math.round((endMs - nowMs) / MS_DAY));
  const elapsedWeeks  = elapsedDays / 7;
  const weeksRemaining = remainingDays / 7;

  // On-track per type
  const gymOnTrack = gymWeeklyFrequency
    ? gymSessions >= elapsedWeeks * gymWeeklyFrequency - 0.5
    : true;
  const individualOnTrack = individualWeeklyFrequency
    ? individualSessions >= elapsedWeeks * individualWeeklyFrequency - 0.5
    : true;
  const isOnTrack = gymOnTrack && individualOnTrack;

  // Sessions still needed
  const gymLeft = Math.max(0, (effGymTarget || 0) - gymSessions);
  const indLeft = Math.max(0, (effIndTarget || 0) - individualSessions);
  const totalLeft = Math.max(0, effTotal - completedSessions);

  const neededGymPerWeek = weeksRemaining > 0.5 && effGymTarget
    ? Math.round((gymLeft / weeksRemaining) * 10) / 10 : gymLeft;
  const neededIndividualPerWeek = weeksRemaining > 0.5 && effIndTarget
    ? Math.round((indLeft / weeksRemaining) * 10) / 10 : indLeft;
  const neededPerWeek = weeksRemaining > 0.5
    ? Math.round((totalLeft / weeksRemaining) * 10) / 10 : totalLeft;

  // Current week number within the plan
  const planWeekStart    = getWeekStart(startDate);
  const todayClamped     = today > endDate ? endDate : today;
  const currentWeekStart = getWeekStart(todayClamped);
  const weeksSinceStart  = Math.max(0, Math.round(
    (new Date(currentWeekStart + 'T12:00:00').getTime() - new Date(planWeekStart + 'T12:00:00').getTime()) / (7 * MS_DAY)
  ));
  const currentWeekNum = Math.min(totalWeeks, weeksSinceStart + 1);

  return {
    completedSessions, gymSessions, individualSessions,
    pct, gymPct, individualPct,
    isComplete, isExpired, needsClosing,
    remainingDays, isOnTrack, neededPerWeek,
    neededGymPerWeek, neededIndividualPerWeek,
    gymOnTrack, individualOnTrack,
    isPending: false, daysUntilStart: 0,
    currentWeekNum, totalWeeks,
    effTotal, effGymTarget, effIndTarget,
  };
}

// ─── Plan weekly breakdown ────────────────────────────────────────────────────

export function getPlanWeeks(plan, history) {
  const {
    startDate, endDate, activityType = 'individual', routineIds = [],
    gymWeeklyFrequency = 0, individualWeeklyFrequency = 0,
  } = plan;
  const today = todayStr();
  const weeks = [];
  let weekStart = getWeekStart(startDate);

  while (weekStart <= endDate) {
    const weekEnd = addDaysStore(weekStart, 6);
    let gym = 0, individual = 0;

    for (const [dateStr, day] of Object.entries(history)) {
      if (dateStr < startDate || dateStr > endDate) continue;
      if (dateStr < weekStart || dateStr > weekEnd) continue;
      if ((activityType === 'gym' || activityType === 'both') && day.gym) gym++;
      if ((activityType === 'individual' || activityType === 'both') && day.done
          && (routineIds.length === 0 || routineIds.includes(day.routineId))) individual++;
    }

    const effectiveEnd   = weekEnd < endDate ? weekEnd : endDate;
    const isPast         = effectiveEnd < today;
    const isCurrent      = weekStart <= today && today <= effectiveEnd;
    const isFuture       = weekStart > today;
    const gymTarget      = gymWeeklyFrequency || 0;
    const individualTarget = individualWeeklyFrequency || 0;
    const gymMet         = gymTarget === 0 || gym >= gymTarget;
    const individualMet  = individualTarget === 0 || individual >= individualTarget;

    weeks.push({
      num: weeks.length + 1,
      startDate: weekStart,
      endDate: effectiveEnd,
      gym, individual,
      gymTarget, individualTarget,
      gymMet, individualMet,
      isCompliant: gymMet && individualMet,
      isPast, isCurrent, isFuture,
    });

    weekStart = addDaysStore(weekStart, 7);
  }
  return weeks;
}

// Migrate old phase names to current names
const PHASE_MIGRATION = {
  'Movilidad':             'Activacion - Bloque Agilidad',
  'Calentamiento':         'Bloque Entrenamiento Principal',
  'Entrenamiento':         'Vuelta a la calma',
  'Calentamiento corporal':  'Activacion - Bloque Agilidad',
  'Calentamiento con balon': 'Bloque Entrenamiento Principal',
  'Sesion principal':        'Calentamiento con pelota',
  'Vuelta a la calma':       'Calentamiento con pelota',
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
    for (const ex of exercises) map[ex.id] = ex;
  }
  return map;
}

// ─── Module-level singleton state ────────────────────────────────────────────

let listeners = [];

let state = {
  catalog:       INITIAL_CATALOG,
  routines:      INITIAL_ROUTINES,
  schedule:      {},
  history:       {},
  matches:       [],
  plans:         [],
  weekTemplates: [], // array of { id, name, days, isDefault }
  isReady:       false,
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

const docLoadedSet = new Set();
const TOTAL_DOCS = 7;

function onDocFirstLoad(docName) {
  if (!docLoadedSet.has(docName)) {
    docLoadedSet.add(docName);
    if (docLoadedSet.size >= TOTAL_DOCS) setState({ isReady: true });
  }
}

// ─── Firestore initialization ─────────────────────────────────────────────────

let initialized = false;

function initFirestore() {
  if (initialized) return;
  initialized = true;

  // 'challenges' → 'plans' migration, 'weekTemplate' → 'weekTemplates' migration
  const DOCS = ['catalog', 'routines', 'schedule', 'history', 'matches', 'plans', 'weekTemplates'];

  DOCS.forEach(docName => {
    const ref = doc(db, 'app', docName);

    onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        if (docName === 'plans') {
          // Migrate from legacy 'challenges' doc if it exists
          try {
            const legacySnap = await getDoc(doc(db, 'app', 'challenges'));
            const data = legacySnap.exists() ? (legacySnap.data().data || []) : [];
            await setDoc(doc(db, 'app', 'plans'), { data });
            if (legacySnap.exists()) deleteDoc(doc(db, 'app', 'challenges'));
          } catch (err) {
            console.error('[store] Plans migration failed:', err);
            setState({ plans: [] });
            onDocFirstLoad('plans');
          }
          return;
        }

        if (docName === 'weekTemplates') {
          // Migrate from legacy single 'weekTemplate' doc if it exists
          try {
            const oldSnap = await getDoc(doc(db, 'app', 'weekTemplate'));
            const oldDays = oldSnap.exists() ? (oldSnap.data().data || {}) : {};
            const hasData = Object.keys(oldDays).length > 0;
            const templates = hasData ? [{
              id: `wt-${Date.now()}`,
              name: 'Mi semana tipo',
              days: oldDays,
              isDefault: true,
            }] : [];
            await setDoc(doc(db, 'app', 'weekTemplates'), { data: templates });
            if (oldSnap.exists()) deleteDoc(doc(db, 'app', 'weekTemplate'));
          } catch (err) {
            console.error('[store] weekTemplates migration failed:', err);
            setState({ weekTemplates: [] });
            onDocFirstLoad('weekTemplates');
          }
          return;
        }

        let initialData;
        if (docName === 'catalog')   initialData = INITIAL_CATALOG;
        else if (docName === 'routines') initialData = INITIAL_ROUTINES;
        else if (docName === 'matches')  initialData = [];
        else initialData = {};

        writeDoc(docName, initialData);
        onDocFirstLoad(docName);
      } else {
        let data = snap.data().data;
        if (docName === 'routines')      data = migrateRoutines(data);
        if (docName === 'weekTemplates') data = Array.isArray(data) ? data : [];
        setState({ [docName]: data });
        onDocFirstLoad(docName);
      }
    }, (err) => {
      console.error(`[store] onSnapshot error for ${docName}:`, err);
      onDocFirstLoad(docName);
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

  const { catalog, routines, schedule, history, matches, weekTemplates, isReady } = state;
  const exerciseMap = buildExerciseMap(catalog);
  // Backward-compat: expose default template's days as weekTemplate
  const weekTemplate = weekTemplates.find(t => t.isDefault)?.days || {};

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
      next[cat] = exercises.filter(ex => ex.id !== id);
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

  // ── Plans ─────────────────────────────────────────────────────────────────
  const createPlan = useCallback((data) => {
    const plan = {
      id: `p-${Date.now()}`,
      ...data,
      status: 'active',
      completedAt: null,
      finalRating: null,
      closingNotes: null,
    };
    const next = [...state.plans, plan];
    setState({ plans: next });
    writeDoc('plans', next);
  }, []);

  const completePlan = useCallback((id, finalRating, closingNotes = null) => {
    const next = state.plans.map(p =>
      p.id === id ? { ...p, status: 'completed', finalRating, closingNotes, completedAt: todayStr() } : p
    );
    setState({ plans: next });
    writeDoc('plans', next);
  }, []);

  const deletePlan = useCallback((id) => {
    const next = state.plans.filter(p => p.id !== id);
    setState({ plans: next });
    writeDoc('plans', next);
  }, []);

  const updatePlan = useCallback((id, data) => {
    const next = state.plans.map(p => p.id === id ? { ...p, ...data } : p);
    setState({ plans: next });
    writeDoc('plans', next);
  }, []);

  const markPlanAutoApplied = useCallback((id) => {
    const next = state.plans.map(p => p.id === id ? { ...p, autoApplied: true } : p);
    setState({ plans: next });
    writeDoc('plans', next);
  }, []);

  // ── Week Templates ────────────────────────────────────────────────────────

  const createWeekTemplate = useCallback(({ name, days }) => {
    const tmpl = {
      id: `wt-${Date.now()}`,
      name: name || 'Nueva semana tipo',
      days: days || {},
      isDefault: state.weekTemplates.length === 0,
    };
    const next = [...state.weekTemplates, tmpl];
    setState({ weekTemplates: next });
    writeDoc('weekTemplates', next);
    return tmpl.id;
  }, []);

  const updateWeekTemplate = useCallback((id, patch) => {
    const next = state.weekTemplates.map(t => t.id === id ? { ...t, ...patch } : t);
    setState({ weekTemplates: next });
    writeDoc('weekTemplates', next);
  }, []);

  const deleteWeekTemplate = useCallback((id) => {
    let next = state.weekTemplates.filter(t => t.id !== id);
    if (next.length > 0 && !next.some(t => t.isDefault)) {
      next = next.map((t, i) => i === 0 ? { ...t, isDefault: true } : t);
    }
    setState({ weekTemplates: next });
    writeDoc('weekTemplates', next);
  }, []);

  const duplicateWeekTemplate = useCallback((id) => {
    const src = state.weekTemplates.find(t => t.id === id);
    if (!src) return;
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id: `wt-${Date.now()}`,
      name: `${src.name} (copia)`,
      isDefault: false,
    };
    const next = [...state.weekTemplates, copy];
    setState({ weekTemplates: next });
    writeDoc('weekTemplates', next);
  }, []);

  const setDefaultTemplate = useCallback((id) => {
    const next = state.weekTemplates.map(t => ({ ...t, isDefault: t.id === id }));
    setState({ weekTemplates: next });
    writeDoc('weekTemplates', next);
  }, []);

  // Backward-compat shim: updates the default template's days
  const saveWeekTemplate = useCallback((days) => {
    const defIdx = state.weekTemplates.findIndex(t => t.isDefault);
    if (defIdx >= 0) {
      const next = state.weekTemplates.map(t => t.isDefault ? { ...t, days } : t);
      setState({ weekTemplates: next });
      writeDoc('weekTemplates', next);
    } else {
      const tmpl = { id: `wt-${Date.now()}`, name: 'Mi semana tipo', days, isDefault: true };
      const next = [...state.weekTemplates, tmpl];
      setState({ weekTemplates: next });
      writeDoc('weekTemplates', next);
    }
  }, []);

  // Apply a template's days to a set of date strings (sets schedule routineIds)
  const applyWeekTemplate = useCallback((dateStrs, days = null) => {
    const tmpl = days || state.weekTemplates.find(t => t.isDefault)?.days;
    if (!tmpl || Object.keys(tmpl).length === 0) return;

    const newSchedule = { ...state.schedule };
    dateStrs.forEach(dateStr => {
      const dow = new Date(dateStr + 'T12:00:00').getDay();
      const dayTmpl = tmpl[dow];
      if (dayTmpl?.routineId) newSchedule[dateStr] = dayTmpl.routineId;
    });
    setState({ schedule: newSchedule });
    writeDoc('schedule', newSchedule);

    // Remove any 'cleared' flags so template activities show again
    const needsUpdate = dateStrs.some(ds => state.history[ds]?.cleared);
    if (needsUpdate) {
      const nextHistory = { ...state.history };
      dateStrs.forEach(ds => {
        if (nextHistory[ds]?.cleared) {
          const { cleared: _removed, ...rest } = nextHistory[ds];
          nextHistory[ds] = rest;
        }
      });
      setState({ history: nextHistory });
      writeDoc('history', nextHistory);
    }
  }, []);

  // Clear schedule + suppress template activities for a set of date strings
  const clearWeekSchedule = useCallback((dateStrs) => {
    // 1. Remove schedule entries
    const nextSchedule = { ...state.schedule };
    dateStrs.forEach(ds => delete nextSchedule[ds]);
    setState({ schedule: nextSchedule });
    writeDoc('schedule', nextSchedule);

    // 2. Mark days with no real training data so getDayActivities hides template activities
    const nextHistory = { ...state.history };
    let changed = false;
    dateStrs.forEach(ds => {
      const day = nextHistory[ds];
      const hasRealData = day && (day.done || day.gym || day.notes?.trim());
      if (!hasRealData) {
        nextHistory[ds] = { done: false, routineId: null, completed: {}, gym: false, notes: '', cleared: true };
        changed = true;
      }
    });
    if (changed) {
      setState({ history: nextHistory });
      writeDoc('history', nextHistory);
    }
  }, []);

  // ── Import ────────────────────────────────────────────────────────────────
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

  const { plans } = state;

  return {
    catalog,
    routines,
    schedule,
    history,
    matches,
    plans,
    weekTemplate,    // computed: default template's days (backward compat)
    weekTemplates,   // full array
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
    saveWeekTemplate,     // backward compat shim
    createWeekTemplate,
    updateWeekTemplate,
    deleteWeekTemplate,
    duplicateWeekTemplate,
    setDefaultTemplate,
    applyWeekTemplate,
    clearWeekSchedule,
    createPlan,
    completePlan,
    deletePlan,
    updatePlan,
    markPlanAutoApplied,
    importData,
  };
}
