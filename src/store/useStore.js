import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_CATALOG, INITIAL_ROUTINES } from '../data/initialData';
import { todayStr, addDays, getWeekStart } from '../utils/dates';

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
      excusedGym: 0, excusedIndividual: 0, excusedSessions: 0, excusedReasons: {},
    };
  }

  const wantsGym = activityType === 'gym' || activityType === 'both';
  const wantsInd = activityType === 'individual' || activityType === 'both';

  let gymSessions = 0;
  let individualSessions = 0;
  let excusedGym = 0;
  let excusedIndividual = 0;
  const excusedReasons = {}; // motivo → nº de sesiones justificadas
  for (const [dateStr, day] of Object.entries(history)) {
    if (dateStr < startDate || dateStr > endDate) continue;
    if (wantsGym && day.gym) gymSessions++;
    if (wantsInd && day.done
        && (routineIds.length === 0 || routineIds.includes(day.routineId))) individualSessions++;
    const exc = day.excused?.activities;
    if (exc?.length) {
      const reason = day.excused.reason || 'Sin motivo';
      if (wantsGym && exc.includes('gym') && !day.gym) { excusedGym++; excusedReasons[reason] = (excusedReasons[reason] || 0) + 1; }
      if (wantsInd && exc.includes('indiv') && !day.done) { excusedIndividual++; excusedReasons[reason] = (excusedReasons[reason] || 0) + 1; }
    }
  }

  const completedSessions = gymSessions + individualSessions;
  const excusedSessions   = excusedGym + excusedIndividual;

  // El objetivo NO cambia por excepciones: effTotal = meta original.
  // Las justificadas solo se cuentan aparte (stats) y evitan deuda/penalización
  // (eso vive en getPlanWeeks y en la racha), pero nunca achican el denominador.
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

  // Las sesiones son números enteros: redondeamos siempre hacia arriba (ceil).
  const neededGymPerWeek = weeksRemaining > 0.5 && effGymTarget
    ? Math.ceil(gymLeft / weeksRemaining) : gymLeft;
  const neededIndividualPerWeek = weeksRemaining > 0.5 && effIndTarget
    ? Math.ceil(indLeft / weeksRemaining) : indLeft;
  const neededPerWeek = weeksRemaining > 0.5
    ? Math.ceil(totalLeft / weeksRemaining) : totalLeft;

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
    excusedGym, excusedIndividual, excusedSessions, excusedReasons,
  };
}

// ─── Plan weekly breakdown ────────────────────────────────────────────────────

export function getPlanWeeks(plan, history) {
  const {
    startDate, endDate, activityType = 'individual', routineIds = [],
    gymWeeklyFrequency = 0, individualWeeklyFrequency = 0,
  } = plan;
  const today = todayStr();
  const MS_DAY = 86400000;
  const weeks = [];
  let weekStart = getWeekStart(startDate);

  const wantsGym = activityType === 'gym' || activityType === 'both';
  const wantsInd = activityType === 'individual' || activityType === 'both';

  while (weekStart <= endDate) {
    const weekEnd = addDays(weekStart, 6);
    let gym = 0, individual = 0, excusedGym = 0, excusedIndividual = 0;

    for (const [dateStr, day] of Object.entries(history)) {
      if (dateStr < startDate || dateStr > endDate) continue;
      if (dateStr < weekStart || dateStr > weekEnd) continue;
      if (wantsGym && day.gym) gym++;
      if (wantsInd && day.done
          && (routineIds.length === 0 || routineIds.includes(day.routineId))) individual++;
      const exc = day.excused?.activities;
      if (exc?.length) {
        if (wantsGym && exc.includes('gym') && !day.gym) excusedGym++;
        if (wantsInd && exc.includes('indiv') && !day.done) excusedIndividual++;
      }
    }

    const effectiveStart = weekStart > startDate ? weekStart : startDate;
    const effectiveEnd   = weekEnd < endDate ? weekEnd : endDate;
    const isPast         = effectiveEnd < today;
    const isCurrent      = effectiveStart <= today && today <= effectiveEnd;
    const isFuture       = effectiveStart > today;

    // Semanas parciales (primera/última): target prorrateado por días disponibles
    const daysInWeek = Math.round(
      (new Date(effectiveEnd + 'T12:00:00') - new Date(effectiveStart + 'T12:00:00')) / MS_DAY
    ) + 1;
    const prorate = base => (base <= 0 || daysInWeek >= 7)
      ? base
      : Math.min(base, Math.ceil(base * daysInWeek / 7));
    // Objetivo efectivo de la semana: prorrateado y descontando las sesiones justificadas
    const gymTarget        = Math.max(0, prorate(gymWeeklyFrequency || 0) - excusedGym);
    const individualTarget = Math.max(0, prorate(individualWeeklyFrequency || 0) - excusedIndividual);
    const gymMet         = gymTarget === 0 || gym >= gymTarget;
    const individualMet  = individualTarget === 0 || individual >= individualTarget;

    weeks.push({
      num: weeks.length + 1,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      gym, individual,
      gymTarget, individualTarget,
      excusedGym, excusedIndividual,
      gymMet, individualMet,
      isCompliant: gymMet && individualMet,
      isPast, isCurrent, isFuture,
    });

    weekStart = addDays(weekStart, 7);
  }
  return weeks;
}

// ─── Plan weekly compensation log ─────────────────────────────────────────────

export function computePlanWeeklyLog(plan, history) {
  const { gymWeeklyFrequency: gymBase = 0, individualWeeklyFrequency: indivBase = 0 } = plan;
  const weeks = getPlanWeeks(plan, history);
  let accGym = 0;
  let accIndiv = 0;

  return weeks.map(week => {
    // Usa el target prorrateado de la semana (semanas parciales no generan deuda injusta)
    const gymCompAvail  = gymBase  > 0 ? Math.min(accGym,   2) : 0;
    const indivCompAvail = indivBase > 0 ? Math.min(accIndiv, 2) : 0;
    const gymEffTarget  = week.gymTarget        + gymCompAvail;
    const indivEffTarget = week.individualTarget + indivCompAvail;

    if (week.isPast) {
      if (gymBase > 0) {
        const comp = Math.max(0, Math.min(week.gym - week.gymTarget, gymCompAvail));
        const miss = Math.max(0, week.gymTarget - week.gym);
        accGym = Math.max(0, accGym - comp + miss);
      }
      if (indivBase > 0) {
        const comp = Math.max(0, Math.min(week.individual - week.individualTarget, indivCompAvail));
        const miss = Math.max(0, week.individualTarget - week.individual);
        accIndiv = Math.max(0, accIndiv - comp + miss);
      }
    }

    return {
      ...week,
      gymEffTarget,
      indivEffTarget,
      gymCompAvail,
      indivCompAvail,
      accGymDebt:   week.isPast ? accGym   : null,
      accIndivDebt: week.isPast ? accIndiv : null,
    };
  });
}

// ─── Ruta crítica ──────────────────────────────────────────────────────────────
// Proyecta, semana por semana, lo que cuesta NO completar la semana actual:
// si esta semana cierra como está hoy, su faltante se vuelve deuda y se arrastra.
// Cada semana siguiente queda con objetivo OBLIGATORIO = base + deuda arrastrada.
// La recuperación realista es de 2/tipo por semana (tope de compensación del
// modelo de computePlanWeeklyLog): lo que excede ese tope se vuelve a arrastrar,
// y si al final del plan todavía queda deuda, el plan se rompe (no cierra).
const COMP_CAP = 2; // máximo recuperable por tipo en una semana

export function computeCriticalPath(plan, history) {
  const { activityType = 'individual' } = plan;
  const log = computePlanWeeklyLog(plan, history);
  const current = log.find(w => w.isCurrent);
  if (!current) return { isCritical: false, cascade: [], breaks: false, nextWeek: null };

  const wantsGym = activityType === 'gym' || activityType === 'both';
  const wantsInd = activityType === 'individual' || activityType === 'both';

  const today  = todayStr();
  const MS_DAY = 86400000;
  const daysLeft = Math.max(0, Math.round(
    (new Date(current.endDate + 'T12:00:00') - new Date(today + 'T12:00:00')) / MS_DAY
  ) + 1);

  // Faltantes vs objetivo efectivo de la semana (incluye compensación arrastrada)
  const gymMissing   = wantsGym ? Math.max(0, (current.gymEffTarget   || 0) - current.gym)        : 0;
  const indivMissing = wantsInd ? Math.max(0, (current.indivEffTarget || 0) - current.individual) : 0;
  const totalMissing = gymMissing + indivMissing;

  // Crítico: no entran en los días que quedan (cada día rinde como mucho ~1.5 sesiones)
  const capacity   = daysLeft * 1.5;
  const isCritical = totalMissing > 0 && totalMissing > capacity;

  // Para NO sumar deuda nueva esta semana hay que llegar al menos al objetivo base
  const recommended = {
    gym:   wantsGym ? Math.max(0, (current.gymTarget        || 0) - current.gym)        : 0,
    indiv: wantsInd ? Math.max(0, (current.individualTarget || 0) - current.individual) : 0,
  };

  // Deuda que se arrastra si esta semana cierra como está hoy (incluye deuda previa)
  const idx  = log.indexOf(current);
  const prev = idx > 0 ? log[idx - 1] : null;
  const debtAfter = (prior, target, done) => {
    const comp = Math.max(0, Math.min(done - target, Math.min(prior, COMP_CAP)));
    const miss = Math.max(0, target - done);
    return Math.max(0, prior - comp + miss);
  };
  let gymDebt = wantsGym ? debtAfter(prev?.accGymDebt   || 0, current.gymTarget        || 0, current.gym)        : 0;
  let indDebt = wantsInd ? debtAfter(prev?.accIndivDebt || 0, current.individualTarget || 0, current.individual) : 0;

  // Cascada por cada semana futura: obligatorio = base + deuda; lo no recuperable
  // (más de COMP_CAP por tipo) se arrastra a la siguiente.
  const cascade = [];
  for (const fw of log.filter(w => w.isFuture)) {
    const gymBase   = wantsGym ? (fw.gymTarget        || 0) : 0;
    const indivBase = wantsInd ? (fw.individualTarget || 0) : 0;
    const gymComp   = gymDebt;
    const indivComp = indDebt;
    cascade.push({
      num: fw.num,
      gymBase,   gymComp,   gym:   gymBase + gymComp,     gymImpossible:   wantsGym && gymComp > COMP_CAP,
      indivBase, indivComp, indiv: indivBase + indivComp, indivImpossible: wantsInd && indivComp > COMP_CAP,
      impossible: (wantsGym && gymComp > COMP_CAP) || (wantsInd && indivComp > COMP_CAP),
    });
    gymDebt = Math.max(0, gymDebt - COMP_CAP);
    indDebt = Math.max(0, indDebt - COMP_CAP);
  }
  // Si tras la última semana queda deuda, no alcanzan las semanas para recuperar
  const breaks = gymDebt > 0 || indDebt > 0;

  const c0 = cascade[0];
  const nextWeek = c0
    ? { num: c0.num, gym: c0.gym, indiv: c0.indiv, total: c0.gym + c0.indiv, impossible: c0.impossible }
    : null;

  return {
    isCritical,
    weekNum: current.num,
    daysLeft,
    gymMissing, indivMissing, totalMissing,
    recommended,
    cascade, breaks,
    nextWeek,
  };
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
  catLinks:      {},
  routines:      INITIAL_ROUTINES,
  schedule:      {},
  history:       {},
  matches:       [],
  plans:         [],
  weekTemplates: [], // array of { id, name, days, isDefault }
  isReady:       false,
  loadError:     false,
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

function stripUndefined(val) {
  if (Array.isArray(val)) return val.map(stripUndefined);
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefined(v)])
    );
  }
  return val;
}

function writeCatalog(catalog, catLinks) {
  const raw = Object.keys(catLinks).length > 0
    ? { ...catalog, __catLinks: catLinks }
    : catalog;
  setDoc(doc(db, 'app', 'catalog'), { data: stripUndefined(raw) }).catch(err => {
    console.error('[store] Failed to write catalog:', err);
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
        if (docName === 'catalog') {
          const { __catLinks = {}, ...catalog } = data || {};
          setState({ catalog, catLinks: __catLinks });
        } else {
          setState({ [docName]: data });
        }
        onDocFirstLoad(docName);
      }
    }, (err) => {
      console.error(`[store] onSnapshot error for ${docName}:`, err);
      setState({ loadError: true });
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

  const { catalog, catLinks, routines, schedule, history, matches, weekTemplates, isReady, loadError } = state;
  const exerciseMap = buildExerciseMap(catalog);
  // Backward-compat: expose default template's days as weekTemplate
  const weekTemplate = weekTemplates.find(t => t.isDefault)?.days || {};

  // ── Schedule ──────────────────────────────────────────────────────────────
  const assignRoutine = useCallback((dateStr, routineId) => {
    // Merge con la entrada existente (preserva gym/arsenal/horarios) y des-suprime 'indiv'
    const cur = state.schedule[dateStr];
    const sched = typeof cur === 'string' ? {} : (cur ? { ...cur } : {});
    sched.routineId = routineId;
    if (sched.suppressedTypes?.includes('indiv')) {
      const rest = sched.suppressedTypes.filter(t => t !== 'indiv');
      if (rest.length > 0) sched.suppressedTypes = rest;
      else delete sched.suppressedTypes;
    }
    const next = { ...state.schedule, [dateStr]: sched };
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
    // Completar deja sin efecto la excepción del entrenamiento individual
    const excusedRest = (day.excused?.activities || []).filter(t => t !== 'indiv');
    const excused = (day.excused && excusedRest.length > 0)
      ? { activities: excusedRest, reason: day.excused.reason ?? null }
      : null;
    const next = { ...state.history, [dateStr]: { ...day, done: true, routineId, excused } };
    setState({ history: next });
    writeDoc('history', next);
  }, []);

  // Marca o limpia la excepción ("justificado") de un día.
  // activities: lista de tipos justificados (['gym','indiv']); vacío/null la limpia.
  const setDayExcused = useCallback((dateStr, activities, reason = null) => {
    const current = state.history[dateStr] || { done: false, routineId: null, completed: {}, gym: false, notes: '' };
    const next = { ...current };
    if (activities && activities.length > 0) {
      next.excused = { activities, reason: reason ?? null };
      // Estados mutuamente excluyentes: justificar borra hecho / no hecho de esos tipos
      if (activities.includes('gym')) next.gym = false;
      if (activities.includes('indiv')) next.done = false;
      next.skipped = (current.skipped || []).filter(t => !activities.includes(t));
    } else {
      next.excused = null;
    }
    const nextHistory = { ...state.history, [dateStr]: next };
    setState({ history: nextHistory });
    writeDoc('history', nextHistory);
  }, []);

  const removeActivityFromDay = useCallback((dateStr, actType) => {
    // Suppress via schedule entry (prevents template/schedule from re-showing)
    const currentSched = state.schedule[dateStr];
    const sched = typeof currentSched === 'string'
      ? { routineId: currentSched }
      : (currentSched ? { ...currentSched } : {});
    const suppressed = sched.suppressedTypes || [];
    if (!suppressed.includes(actType)) {
      const nextSched = { ...sched, suppressedTypes: [...suppressed, actType] };
      const nextSchedule = { ...state.schedule, [dateStr]: nextSched };
      setState({ schedule: nextSchedule });
      writeDoc('schedule', nextSchedule);
    }
    // If done, also undo in history
    const day = state.history[dateStr];
    if (!day) return;
    if (actType === 'gym' && day.gym) {
      const next = { ...state.history, [dateStr]: { ...day, gym: false } };
      setState({ history: next });
      writeDoc('history', next);
    } else if (actType === 'indiv' && day.done) {
      const next = { ...state.history, [dateStr]: { ...day, done: false, routineId: null } };
      setState({ history: next });
      writeDoc('history', next);
    }
  }, []);

  const toggleSkipActivity = useCallback((dateStr, actType) => {
    const day = state.history[dateStr] || { done: false, routineId: null, completed: {}, gym: false, notes: '' };
    const skipped = day.skipped || [];
    const nextSkipped = skipped.includes(actType)
      ? skipped.filter(t => t !== actType)
      : [...skipped, actType];
    const patch = nextSkipped.length > 0 ? { skipped: nextSkipped } : { skipped: [] };
    const next = { ...state.history, [dateStr]: { ...day, ...patch } };
    setState({ history: next });
    writeDoc('history', next);
  }, []);

  const setActivityTime = useCallback((dateStr, actType, newTime) => {
    const timeField = actType === 'gym' ? 'gymTime' : actType === 'indiv' ? 'indivTime' : actType === 'arsenal' ? 'arsenalTime' : 'matchTime';
    const currentSched = state.schedule[dateStr];
    const sched = typeof currentSched === 'string'
      ? { routineId: currentSched }
      : (currentSched ? { ...currentSched } : {});
    const nextSched = { ...sched, [timeField]: newTime };
    const nextSchedule = { ...state.schedule, [dateStr]: nextSched };
    setState({ schedule: nextSchedule });
    writeDoc('schedule', nextSchedule);
  }, []);

  // Add a single activity to one day's schedule entry, merging (no afecta la semana tipo)
  const addActivityToDay = useCallback((dateStr, actType, { time, routineId } = {}) => {
    const currentSched = state.schedule[dateStr];
    const sched = typeof currentSched === 'string'
      ? { routineId: currentSched }
      : (currentSched ? { ...currentSched } : {});
    // Si el tipo había sido eliminado/suprimido, dejar de suprimirlo
    if (sched.suppressedTypes?.includes(actType)) {
      const rest = sched.suppressedTypes.filter(t => t !== actType);
      if (rest.length > 0) sched.suppressedTypes = rest;
      else delete sched.suppressedTypes;
    }
    if (actType === 'gym') {
      sched.gym = true;
      if (time) sched.gymTime = time;
    } else if (actType === 'arsenal') {
      sched.arsenal = true;
      if (time) sched.arsenalTime = time;
    } else if (actType === 'indiv') {
      if (routineId) sched.routineId = routineId;
      if (time) sched.indivTime = time;
    }
    const nextSchedule = { ...state.schedule, [dateStr]: sched };
    setState({ schedule: nextSchedule });
    writeDoc('schedule', nextSchedule);
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
    for (const [date, val] of Object.entries(nextSchedule)) {
      const rid = typeof val === 'string' ? val : val?.routineId;
      if (rid === id) {
        if (typeof val !== 'string') {
          const { routineId: _r, ...rest } = val;
          if (Object.keys(rest).length > 0) { nextSchedule[date] = rest; continue; }
        }
        delete nextSchedule[date];
      }
    }
    setState({ schedule: nextSchedule });
    writeDoc('schedule', nextSchedule);

    // Limpiar referencias muertas en las semanas tipo (days[*].routineId)
    let templatesChanged = false;
    const nextTemplates = state.weekTemplates.map(t => {
      let dayChanged = false;
      const days = {};
      for (const [dow, day] of Object.entries(t.days || {})) {
        if (day && day.routineId === id) { days[dow] = { ...day, routineId: null }; dayChanged = true; }
        else days[dow] = day;
      }
      if (dayChanged) { templatesChanged = true; return { ...t, days }; }
      return t;
    });
    if (templatesChanged) {
      setState({ weekTemplates: nextTemplates });
      writeDoc('weekTemplates', nextTemplates);
    }

    // Quitar la rutina de los planes que la tuvieran asignada (routineIds)
    let plansChanged = false;
    const nextPlans = state.plans.map(p => {
      if (Array.isArray(p.routineIds) && p.routineIds.includes(id)) {
        plansChanged = true;
        return { ...p, routineIds: p.routineIds.filter(r => r !== id) };
      }
      return p;
    });
    if (plansChanged) {
      setState({ plans: nextPlans });
      writeDoc('plans', nextPlans);
    }
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
    writeCatalog(next, state.catLinks);
  }, []);

  const editExercise = useCallback((id, patch) => {
    const next = {};
    for (const [cat, exercises] of Object.entries(state.catalog)) {
      next[cat] = exercises.map(ex => {
        if (ex.id !== id) return ex;
        const updated = { ...ex, ...patch };
        if (!updated.link) delete updated.link;
        return updated;
      });
    }
    setState({ catalog: next });
    writeCatalog(next, state.catLinks);
  }, []);

  const deleteExercise = useCallback((id) => {
    const next = {};
    for (const [cat, exercises] of Object.entries(state.catalog)) {
      next[cat] = exercises.filter(ex => ex.id !== id);
    }
    setState({ catalog: next });
    writeCatalog(next, state.catLinks);
  }, []);

  const addCategory = useCallback((name) => {
    if (state.catalog[name]) return;
    const next = { ...state.catalog, [name]: [] };
    setState({ catalog: next });
    writeCatalog(next, state.catLinks);
  }, []);

  const deleteCategory = useCallback((name) => {
    const nextCatalog = { ...state.catalog };
    delete nextCatalog[name];
    const nextLinks = { ...state.catLinks };
    delete nextLinks[name];
    setState({ catalog: nextCatalog, catLinks: nextLinks });
    writeCatalog(nextCatalog, nextLinks);
  }, []);

  const editCategory = useCallback((catName, newName, link) => {
    let nextCatalog = { ...state.catalog };
    let nextLinks = { ...state.catLinks };
    const trimmedNew = newName.trim();
    const effectiveName = (trimmedNew && trimmedNew !== catName) ? trimmedNew : catName;

    if (effectiveName !== catName) {
      nextCatalog[effectiveName] = nextCatalog[catName];
      delete nextCatalog[catName];
      if (nextLinks[catName] !== undefined) {
        nextLinks[effectiveName] = nextLinks[catName];
        delete nextLinks[catName];
      }
    }

    const trimmedLink = link.trim();
    if (trimmedLink) {
      nextLinks[effectiveName] = trimmedLink;
    } else {
      delete nextLinks[effectiveName];
    }

    setState({ catalog: nextCatalog, catLinks: nextLinks });
    writeCatalog(nextCatalog, nextLinks);
  }, []);

  const moveLinkToCategory = useCallback((catName, exerciseId) => {
    const exercise = (state.catalog[catName] || []).find(ex => ex.id === exerciseId);
    if (!exercise?.link) return null;
    const link = exercise.link;

    const nextCatalog = { ...state.catalog };
    nextCatalog[catName] = nextCatalog[catName].map(ex => {
      if (ex.id !== exerciseId) return ex;
      const { link: _removed, ...rest } = ex;
      return rest;
    });
    const nextLinks = { ...state.catLinks, [catName]: link };

    setState({ catalog: nextCatalog, catLinks: nextLinks });
    writeCatalog(nextCatalog, nextLinks);
    return link;
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

  // Apply a template's days to a set of date strings (persists full day config)
  const applyWeekTemplate = useCallback((dateStrs, days = null) => {
    const tmpl = days || state.weekTemplates.find(t => t.isDefault)?.days;
    if (!tmpl || Object.keys(tmpl).length === 0) return;

    const newSchedule = { ...state.schedule };
    dateStrs.forEach(dateStr => {
      const dow = new Date(dateStr + 'T12:00:00').getDay();
      const dayTmpl = tmpl[dow] || {};
      const entry = {};
      if (dayTmpl.routineId) {
        entry.routineId = dayTmpl.routineId;
        if (dayTmpl.indivTime) entry.indivTime = dayTmpl.indivTime;
      }
      if (dayTmpl.gym) {
        entry.gym = true;
        if (dayTmpl.gymTime) entry.gymTime = dayTmpl.gymTime;
      }
      if (dayTmpl.arsenal) {
        entry.arsenal = true;
        if (dayTmpl.arsenalTime) entry.arsenalTime = dayTmpl.arsenalTime;
      }
      if (dayTmpl.match) {
        entry.match = true;
        if (dayTmpl.matchTime) entry.matchTime = dayTmpl.matchTime;
      }
      // Reemplazo real: el schedule del período queda exactamente como el template
      // (los días que el template deja vacíos quedan libres).
      if (Object.keys(entry).length > 0) newSchedule[dateStr] = entry;
      else delete newSchedule[dateStr];
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
      if (!hasRealData && !day?.cleared) {
        // Merge en vez de pisar: preserva progreso parcial (completed, rating, skipped)
        nextHistory[ds] = day
          ? { ...day, cleared: true }
          : { done: false, routineId: null, completed: {}, gym: false, notes: '', cleared: true };
        changed = true;
      }
    });
    if (changed) {
      setState({ history: nextHistory });
      writeDoc('history', nextHistory);
    }
  }, []);

  // ── Import ────────────────────────────────────────────────────────────────
  // matches/plans/weekTemplates/catLinks son opcionales: backups viejos no los
  // incluían y en ese caso se preservan los datos actuales.
  const importData = useCallback(async ({
    catalog: cat, routines: rts, schedule: sch, history: hist,
    matches: mts, plans: pls, weekTemplates: wts, catLinks: lnk,
  }) => {
    const migratedRts = migrateRoutines(rts);
    const links = lnk !== undefined ? lnk : state.catLinks;
    const rawCatalog = Object.keys(links || {}).length > 0
      ? { ...cat, __catLinks: links }
      : cat;

    const partial = { catalog: cat, catLinks: links || {}, routines: migratedRts, schedule: sch, history: hist };
    const writes = [
      setDoc(doc(db, 'app', 'catalog'),  { data: stripUndefined(rawCatalog) }),
      setDoc(doc(db, 'app', 'routines'), { data: migratedRts }),
      setDoc(doc(db, 'app', 'schedule'), { data: sch }),
      setDoc(doc(db, 'app', 'history'),  { data: hist }),
    ];
    if (mts !== undefined) { partial.matches = mts;       writes.push(setDoc(doc(db, 'app', 'matches'),       { data: mts })); }
    if (pls !== undefined) { partial.plans = pls;         writes.push(setDoc(doc(db, 'app', 'plans'),         { data: pls })); }
    if (wts !== undefined) { partial.weekTemplates = wts; writes.push(setDoc(doc(db, 'app', 'weekTemplates'), { data: wts })); }

    setState(partial);
    await Promise.all(writes);
  }, []);

  const { plans } = state;

  return {
    catalog,
    catLinks,
    routines,
    schedule,
    history,
    matches,
    plans,
    weekTemplate,    // computed: default template's days (backward compat)
    weekTemplates,   // full array
    isReady,
    loadError,
    exerciseMap,
    assignRoutine,
    getDay,
    updateDay,
    toggleExercise,
    completeDay,
    setDayExcused,
    removeActivityFromDay,
    toggleSkipActivity,
    setActivityTime,
    addActivityToDay,
    saveRoutine,
    deleteRoutine,
    duplicateRoutine,
    updatePhaseObjective,
    addExercise,
    editExercise,
    deleteExercise,
    addCategory,
    deleteCategory,
    editCategory,
    moveLinkToCategory,
    isExerciseUsed,
    setMatches,
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
