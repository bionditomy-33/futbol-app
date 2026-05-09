import { todayStr } from './dates';

export function getDayActivities(dateStr, schedule, history, matches, weekTemplate) {
  const today = todayStr();
  const dow   = new Date(dateStr + 'T12:00:00').getDay();
  const tmpl  = weekTemplate?.[dow] || {};
  const day   = history[dateStr];
  const acts  = [];

  const suppressTemplate = !!(day?.cleared && !day?.done && !day?.gym);

  // Gym
  if (day?.gym || (!suppressTemplate && tmpl.gym)) {
    acts.push({
      type: 'gym',
      time: tmpl.gymTime || tmpl.time || '07:00',
      done: !!day?.gym,
      fromTemplate: !day?.gym && !!tmpl.gym,
    });
  }

  // Individual routine
  const schedId = schedule[dateStr];
  const histId  = day?.done ? day.routineId : null;
  const tmplId  = !suppressTemplate ? tmpl.routineId : null;
  if (histId || schedId || tmplId) {
    acts.push({
      type: 'indiv',
      time: tmpl.indivTime || '08:10',
      done: !!day?.done,
      missed: !day?.done && !!schedId && dateStr < today,
      routineId: histId || schedId || tmplId,
      fromTemplate: !schedId && !day?.done && !!tmplId,
    });
  }

  // Arsenal
  if (!suppressTemplate && tmpl.arsenal) {
    acts.push({
      type: 'arsenal',
      time: tmpl.arsenalTime || '19:30',
      done: false,
      fromTemplate: true,
    });
  }

  // Matches (real data always shows)
  const defaultMatchTime = dow === 6 ? '15:00' : dow === 0 ? '16:00' : '15:00';
  const dayMatches = matches.filter(m => m.date === dateStr);
  dayMatches.forEach(m => acts.push({
    type: 'match',
    time: tmpl.matchTime || defaultMatchTime,
    done: true,
    match: m,
  }));

  // Match from template only
  if (!suppressTemplate && tmpl.match && dayMatches.length === 0) {
    acts.push({
      type: 'match',
      time: tmpl.matchTime || defaultMatchTime,
      done: false,
      fromTemplate: true,
    });
  }

  return acts.sort((a, b) => a.time.localeCompare(b.time));
}
