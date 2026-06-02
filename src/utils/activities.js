import { todayStr } from './dates';

// Normalize a schedule entry — handles legacy string (routineId) and new object format
export function getScheduleEntry(schedule, dateStr) {
  const val = schedule[dateStr];
  if (!val) return {};
  return typeof val === 'string' ? { routineId: val } : val;
}

export function getDayActivities(dateStr, schedule, history, matches, weekTemplate) {
  const today = todayStr();
  const dow   = new Date(dateStr + 'T12:00:00').getDay();
  const tmpl  = weekTemplate?.[dow] || {};
  const day   = history[dateStr];
  const acts  = [];
  const sched = getScheduleEntry(schedule, dateStr);

  const suppressTemplate = !!(day?.cleared && !day?.done && !day?.gym);
  const suppressed = sched.suppressedTypes || [];

  // Gym (from history, schedule entry, or template)
  if (!suppressed.includes('gym') && (day?.gym || sched.gym || (!suppressTemplate && tmpl.gym))) {
    acts.push({
      type: 'gym',
      time: tmpl.gymTime || tmpl.time || '07:00',
      done: !!day?.gym,
      skipped: !!(day?.skipped?.includes('gym')),
      fromTemplate: !day?.gym && !sched.gym && !!tmpl.gym,
    });
  }

  // Individual routine
  const schedId = sched.routineId;
  const histId  = day?.done ? day.routineId : null;
  const tmplId  = !suppressTemplate ? tmpl.routineId : null;
  if (!suppressed.includes('indiv') && (histId || schedId || tmplId)) {
    acts.push({
      type: 'indiv',
      time: tmpl.indivTime || '08:10',
      done: !!day?.done,
      skipped: !!(day?.skipped?.includes('indiv')),
      missed: !day?.done && !!schedId && dateStr < today,
      routineId: histId || schedId || tmplId,
      fromTemplate: !schedId && !day?.done && !!tmplId,
    });
  }

  // Arsenal (from schedule entry or template)
  if (!suppressed.includes('arsenal') && (sched.arsenal || (!suppressTemplate && tmpl.arsenal))) {
    acts.push({
      type: 'arsenal',
      time: tmpl.arsenalTime || '19:30',
      done: false,
      fromTemplate: !sched.arsenal,
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

  // Match from schedule or template (if no real match data)
  if (dayMatches.length === 0 && !suppressed.includes('match') && (sched.match || (!suppressTemplate && tmpl.match))) {
    acts.push({
      type: 'match',
      time: tmpl.matchTime || defaultMatchTime,
      done: false,
      fromTemplate: !sched.match,
    });
  }

  return acts.sort((a, b) => a.time.localeCompare(b.time));
}
