import {
  buildDeadlineReminderBlocks,
  buildDeadlineReminderText,
} from '../listeners/views/deadline-reminder-builder.js';
import { getDueDeadlines, markNotified } from './tools/deadline-store.js';

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
      await client.chat.postMessage({
        channel: d.channelId,
        text: buildDeadlineReminderText(d),
        blocks: buildDeadlineReminderBlocks(d),
      });
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
