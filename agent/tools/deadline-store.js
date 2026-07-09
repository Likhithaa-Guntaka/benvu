/**
 * In-memory store of tracked grant/compliance deadlines.
 *
 * This is the persistence half of Benvu's deadline feature: `track_deadline`
 * (in `agent/benvu.js`) writes here, and the background scheduler (in
 * `agent/deadline-scheduler.js`) reads `getDueDeadlines()` to post Slack nudges.
 *
 * NOTE: process-local — resets on restart. Back it with a database (or the
 * SessionStore pattern in `thread-context/`) for production.
 */

/**
 * @typedef {Object} TrackedDeadline
 * @property {string} id
 * @property {string} title           What is due (grant/report/filing name).
 * @property {string} dueDate         ISO date (YYYY-MM-DD) the item is due.
 * @property {number} remindDaysBefore Days before dueDate to send the nudge.
 * @property {string} channelId       Slack channel to post the reminder to.
 * @property {string} createdBy       Slack user id who registered it.
 * @property {string} [owner]         Who is responsible (Slack handle or id), if given.
 * @property {string} [notes]         Extra context to include in the reminder.
 * @property {boolean} notified       Whether a reminder has already been sent.
 */

/** @type {Map<string, TrackedDeadline>} */
const deadlines = new Map();
let nextId = 1;

/**
 * Register a deadline to be reminded about.
 * @param {Object} input
 * @param {string} input.title
 * @param {string} input.dueDate           ISO YYYY-MM-DD.
 * @param {number} [input.remindDaysBefore] Default 7.
 * @param {string} [input.channelId]        Default 'unknown' (won't be nudged).
 * @param {string} [input.createdBy]        Default 'unknown'.
 * @param {string} [input.owner]
 * @param {string} [input.notes]
 * @returns {TrackedDeadline}
 */
export function addDeadline({ title, dueDate, remindDaysBefore = 7, channelId, createdBy, owner, notes }) {
  const id = `DL-${nextId++}`;
  /** @type {TrackedDeadline} */
  const record = {
    id,
    title,
    dueDate,
    remindDaysBefore,
    channelId: channelId || 'unknown',
    createdBy: createdBy || 'unknown',
    owner,
    notes,
    notified: false,
  };
  deadlines.set(id, record);
  return record;
}

/**
 * All tracked deadlines.
 * @returns {TrackedDeadline[]}
 */
export function listDeadlines() {
  return Array.from(deadlines.values());
}

/**
 * Whole days from today until an ISO due date. Negative means overdue.
 * @param {string} dueDate ISO YYYY-MM-DD.
 * @returns {number}
 */
export function daysUntil(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Deadlines that should be nudged now: not yet notified, posted to a real
 * channel, and within (or past) their reminder window.
 * @returns {TrackedDeadline[]}
 */
export function getDueDeadlines() {
  return listDeadlines().filter(
    (d) => !d.notified && d.channelId !== 'unknown' && daysUntil(d.dueDate) <= d.remindDaysBefore,
  );
}

/**
 * Mark a deadline as reminded so it is not nudged again.
 * @param {string} id
 */
export function markNotified(id) {
  const record = deadlines.get(id);
  if (record) record.notified = true;
}

/** Clear all deadlines. Test helper. */
export function _resetDeadlines() {
  deadlines.clear();
  nextId = 1;
}
