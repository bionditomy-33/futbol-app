import { todayStr, toDateStr, addDays } from './dates';

export function daysUntil(dateStr) {
  const nowMs    = new Date(todayStr() + 'T12:00:00').getTime();
  const targetMs = new Date(dateStr    + 'T12:00:00').getTime();
  return Math.round((targetMs - nowMs) / 86400000);
}

export function weeksBetween(startDate, endDate) {
  const startMs = new Date(startDate + 'T12:00:00').getTime();
  const endMs   = new Date(endDate   + 'T12:00:00').getTime();
  return Math.round((endMs - startMs) / (7 * 86400000));
}

export function getDatesBetween(startStr, endStr) {
  const dates = [];
  const d   = new Date(startStr + 'T12:00:00');
  const end = new Date(endStr   + 'T12:00:00');
  while (d <= end) {
    dates.push(toDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export function emptyForm() {
  const today = todayStr();
  return {
    name: '',
    objective: '',
    startDate: today,
    endDate: addDays(today, 42),
    activityType: 'individual',
    routineIds: [],
    gymWeeklyFrequency: '',
    individualWeeklyFrequency: '',
    targetSessions: '',
    targetSessionsManual: false,
    initialRating: 5,
    weekTemplateId: null,
  };
}

export function validateForm(form) {
  const errs = {};
  if (!form.name.trim())      errs.name      = 'El nombre es obligatorio';
  if (!form.objective.trim()) errs.objective = 'El objetivo es obligatorio';
  if (!form.endDate)          errs.endDate   = 'La fecha de fin es obligatoria';
  if (form.endDate <= form.startDate) errs.endDate = 'La fecha de fin debe ser posterior al inicio';
  if (!form.targetSessions || parseInt(form.targetSessions) < 1) errs.targetSessions = 'Ingresá una meta válida';
  return errs;
}

export function buildPlanData(form) {
  const today  = todayStr();
  const weeks  = weeksBetween(form.startDate || today, form.endDate || today);
  const gymFreq = parseInt(form.gymWeeklyFrequency) || null;
  const indFreq = parseInt(form.individualWeeklyFrequency) || null;
  return {
    name: form.name.trim(),
    objective: form.objective.trim(),
    startDate: form.startDate || today,
    endDate: form.endDate,
    activityType: form.activityType,
    routineIds: form.activityType === 'gym' ? [] : form.routineIds,
    gymWeeklyFrequency: (form.activityType === 'gym' || form.activityType === 'both') ? gymFreq : null,
    individualWeeklyFrequency: (form.activityType === 'individual' || form.activityType === 'both') ? indFreq : null,
    targetSessions: parseInt(form.targetSessions),
    targetGymSessions: gymFreq && (form.activityType === 'gym' || form.activityType === 'both')
      ? gymFreq * weeks : null,
    targetIndividualSessions: indFreq && (form.activityType === 'individual' || form.activityType === 'both')
      ? indFreq * weeks : null,
    initialRating: form.initialRating,
    weekTemplateId: form.weekTemplateId || null,
  };
}

export function activityLabel(plan, routines) {
  const t = plan.activityType || 'individual';
  if (t === 'gym') return 'Gimnasio';
  if (t === 'both') return 'Individual + Gym';
  if (!plan.routineIds?.length) return 'Todas las rutinas';
  return plan.routineIds.map(id => routines.find(r => r.id === id)?.name).filter(Boolean).join(', ') || 'Rutinas eliminadas';
}
