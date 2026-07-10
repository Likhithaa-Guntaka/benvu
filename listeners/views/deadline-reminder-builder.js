import { daysUntil } from '../../agent/tools/deadline-store.js';
import { actions, button, context, header, section, sectionFields } from './kit.js';

/** Action IDs for the reminder buttons. */
export const DEADLINE_DONE_ACTION = 'deadline_done';
export const DEADLINE_SNOOZE_ACTION = 'deadline_snooze';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Reformat an ISO date (YYYY-MM-DD) as "Aug 9, 2026".
 * @param {string} iso
 * @returns {string}
 */
export function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${month} ${Number(m[3])}, ${m[1]}`;
}

/**
 * A short, plain-language phrase for how much time is left.
 * @param {number} remaining - Whole days until due (negative = overdue).
 * @returns {string}
 */
function timeLeft(remaining) {
  if (remaining < 0) return `${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'} overdue`;
  if (remaining === 0) return 'Due today';
  return `In ${remaining} day${remaining === 1 ? '' : 's'}`;
}

/**
 * Who to address the reminder to: a named owner, the person who set it, or the team.
 * @param {import('../../agent/tools/deadline-store.js').TrackedDeadline} d
 * @returns {string}
 */
function mention(d) {
  return d.owner || (d.createdBy !== 'unknown' ? `<@${d.createdBy}>` : 'team');
}

/**
 * Plain-text fallback for notifications and non-block clients.
 * @param {import('../../agent/tools/deadline-store.js').TrackedDeadline} d
 * @returns {string}
 */
export function buildDeadlineReminderText(d) {
  const remaining = daysUntil(d.dueDate);
  const phrase = remaining < 0 ? `is ${timeLeft(remaining).toLowerCase()}` : `is due ${prettyDate(d.dueDate)}`;
  return `Reminder for ${mention(d)}: "${d.title}" ${phrase}.`;
}

/**
 * Block Kit reminder: header, a short mention body, the details as fields, and
 * "Mark done" / "Snooze" actions. The deadline id rides in the button values.
 * @param {import('../../agent/tools/deadline-store.js').TrackedDeadline} d
 * @returns {import('@slack/types').KnownBlock[]}
 */
export function buildDeadlineReminderBlocks(d) {
  const remaining = daysUntil(d.dueDate);

  /** @type {import('@slack/types').KnownBlock[]} */
  const blocks = [
    header('Deadline reminder'),
    section(`${mention(d)}, this is coming up: *${d.title}*.`),
    sectionFields([
      ['Due', prettyDate(d.dueDate)],
      ['Time left', timeLeft(remaining)],
      ['Owner', d.owner || (d.createdBy !== 'unknown' ? `<@${d.createdBy}>` : 'Unassigned')],
    ]),
  ];

  if (d.notes) blocks.push(context(d.notes));

  blocks.push(
    actions('deadline_actions', [
      button({ text: 'Mark done', actionId: DEADLINE_DONE_ACTION, value: d.id, style: 'primary' }),
      button({ text: 'Snooze 1 day', actionId: DEADLINE_SNOOZE_ACTION, value: d.id }),
    ]),
  );

  return blocks;
}
