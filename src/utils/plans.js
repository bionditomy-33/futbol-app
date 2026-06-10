import { todayStr, toDateStr } from './dates';

export function daysUntil(dateStr) {
  const nowMs    = new Date(todayStr() + 'T12:00:00').getTime();
  const targetMs = new Date(dateStr    + 'T12:00:00').getTime();
  return Math.round((targetMs - nowMs) / 86400000);
}

// Mismo criterio que getPlanProgress.totalWeeks: ceil de los días / 7
export function weeksBetween(startDate, endDate) {
  const startMs = new Date(startDate + 'T12:00:00').getTime();
  const endMs   = new Date(endDate   + 'T12:00:00').getTime();
  const days    = Math.round((endMs - startMs) / 86400000);
  return Math.max(1, Math.ceil(days / 7));
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
