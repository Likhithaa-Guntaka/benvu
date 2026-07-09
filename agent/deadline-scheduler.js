import { daysUntil, getDueDeadlines, markNotified } from './tools/deadline-store.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Reformat an ISO date (YYYY-MM-DD) as "Aug 9, 2026".
 * @param {string} iso
 * @returns {string}
 */
function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${month} ${Number(m[3])}, ${m[1]}`;
}

/**
 * Compose the reminder message for a due deadline. Matches Benvu's warm,
 * plain-language tone.
 * @param {import('./tools/deadline-store.js').TrackedDeadline} d
 * @returns {string}
 */
export function buildReminderText(d) {
  const remaining = daysUntil(d.dueDate);
  const who = d.owner || (d.createdBy !== 'unknown' ? `<@${d.createdBy}>` : 'team');
  const timing =
    remaining < 0
      ? `is *${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'} overdue*`
      : remaining === 0
        ? 'is *due today*'
        : `is due in *${remaining} day${remaining === 1 ? '' : 's'}*`;

  const notes = d.notes ? `\n${d.notes}` : '';
  return (
    `⏰ Reminder for ${who}\n` +
    `*${d.title}* ${timing} — ${prettyDate(d.dueDate)}.${notes}\n\n` +
    'Reply here if you want me to draft the report or find related grants.'
  );
}

/**
 * Post reminders for every deadline currently inside its reminder window.
 * Each is nudged once, then marked so it won't repeat.
 * @param {import('@slack/web-api').WebClient} client
 * @param {{ info(msg: string): void, error(msg: string): void }} [logger]
 * @returns {Promise<number>} how many reminders were sent
 */
export async function runDeadlineCheck(client, logger = console) {
  const due = getDueDeadlines();
  let sent = 0;

  for (const d of due) {
    try {
      await client.chat.postMessage({ channel: d.channelId, text: buildReminderText(d) });
      markNotified(d.id);
      sent += 1;
    } catch (e) {
      // Leave it un-notified so the next tick retries.
      logger.error(`Deadline reminder failed for ${d.id}: ${e}`);
    }
  }

  return sent;
}

/**
 * Start the recurring deadline reminder loop. Returns a stop function.
 *
 * Interval is configurable via DEADLINE_CHECK_INTERVAL_MS (default 60s so demos
 * fire quickly; raise it for production).
 * @param {import('@slack/web-api').WebClient} client
 * @param {{ info(msg: string): void, error(msg: string): void }} [logger]
 * @returns {() => void} stop function that clears the timers
 */
export function startDeadlineScheduler(client, logger = console) {
  const intervalMs = Number.parseInt(process.env.DEADLINE_CHECK_INTERVAL_MS || '60000', 10);

  const tick = () => {
    runDeadlineCheck(client, logger).catch((e) => logger.error(`Deadline check failed: ${e}`));
  };

  // Run once shortly after startup, then on the interval.
  const kickoff = setTimeout(tick, 5000);
  const timer = setInterval(tick, intervalMs);

  // Don't keep the process alive solely for these timers.
  if (typeof timer.unref === 'function') timer.unref();
  if (typeof kickoff.unref === 'function') kickoff.unref();

  logger.info(`Deadline scheduler started (checking every ${Math.round(intervalMs / 1000)}s).`);

  return () => {
    clearTimeout(kickoff);
    clearInterval(timer);
  };
}
