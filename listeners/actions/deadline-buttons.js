import { getDeadline, resolveDeadline, snoozeDeadline } from '../../agent/tools/deadline-store.js';
import { prettyDate } from '../views/deadline-reminder-builder.js';
import { context, header, section } from '../views/kit.js';

/**
 * Replace a reminder message with a short confirmation. Uses response_url so it
 * works on the posted reminder without extra scopes.
 * @param {import('@slack/bolt').RespondFn} respond
 * @param {string} title
 * @param {string} line
 */
async function replaceWith(respond, title, line) {
  await respond({
    replace_original: true,
    text: line,
    blocks: [header(title), section(line)],
  });
}

/**
 * "Mark done" — remove the deadline and confirm.
 * @param {import('@slack/bolt').AllMiddlewareArgs & import('@slack/bolt').SlackActionMiddlewareArgs<import('@slack/bolt').BlockButtonAction>} args
 * @returns {Promise<void>}
 */
export async function handleDeadlineDone({ ack, body, respond, logger }) {
  await ack();
  try {
    const id = body.actions[0].value ?? '';
    const d = getDeadline(id);
    resolveDeadline(id);
    const label = d ? `"${d.title}"` : 'That deadline';
    await replaceWith(respond, 'Deadline done', `${label} is marked done. I won't remind you about it again.`);
  } catch (e) {
    logger.error(`Failed to mark deadline done: ${e}`);
  }
}

/**
 * "Snooze" — re-arm the deadline for one day and confirm.
 * @param {import('@slack/bolt').AllMiddlewareArgs & import('@slack/bolt').SlackActionMiddlewareArgs<import('@slack/bolt').BlockButtonAction>} args
 * @returns {Promise<void>}
 */
export async function handleDeadlineSnooze({ ack, body, respond, logger }) {
  await ack();
  try {
    const id = body.actions[0].value ?? '';
    const record = snoozeDeadline(id, 1);
    if (!record) {
      await replaceWith(respond, 'Deadline snoozed', "I couldn't find that deadline anymore.");
      return;
    }
    const line = `Snoozed *${record.title}*. I'll remind you again after ${prettyDate(/** @type {string} */ (record.remindAfter))}.`;
    await respond({
      replace_original: true,
      text: `Snoozed: ${record.title}`,
      blocks: [header('Deadline snoozed'), section(line), context(`Still due ${prettyDate(record.dueDate)}.`)],
    });
  } catch (e) {
    logger.error(`Failed to snooze deadline: ${e}`);
  }
}
