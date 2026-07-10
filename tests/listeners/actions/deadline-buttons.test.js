import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';
import { _resetDeadlines, addDeadline, getDeadline } from '../../../agent/tools/deadline-store.js';
import { handleDeadlineDone, handleDeadlineSnooze } from '../../../listeners/actions/deadline-buttons.js';

describe('deadline action buttons', () => {
  let ack;
  let respond;
  let logger;

  beforeEach(() => {
    _resetDeadlines();
    ack = mock.fn(async () => {});
    respond = mock.fn(async () => {});
    logger = { error: mock.fn() };
  });

  it('Mark done removes the deadline and confirms', async () => {
    const rec = addDeadline({ title: 'Filing', dueDate: '2026-08-09', channelId: 'C1', createdBy: 'U1' });
    const body = { actions: [{ value: rec.id }] };

    await handleDeadlineDone({ ack, body, respond, logger });

    assert.strictEqual(ack.mock.callCount(), 1);
    assert.strictEqual(getDeadline(rec.id), undefined);
    const arg = respond.mock.calls[0].arguments[0];
    assert.strictEqual(arg.replace_original, true);
    assert.ok(/done/i.test(arg.text));
  });

  it('Snooze re-arms the deadline and confirms', async () => {
    const rec = addDeadline({ title: 'Filing', dueDate: '2026-08-09', channelId: 'C1', createdBy: 'U1' });
    const body = { actions: [{ value: rec.id }] };

    await handleDeadlineSnooze({ ack, body, respond, logger });

    assert.ok(getDeadline(rec.id).remindAfter, 'snooze set a remindAfter date');
    const arg = respond.mock.calls[0].arguments[0];
    assert.strictEqual(arg.replace_original, true);
    assert.ok(/snooze/i.test(arg.text));
  });

  it('handles a missing deadline gracefully', async () => {
    await handleDeadlineSnooze({ ack, body: { actions: [{ value: 'gone' }] }, respond, logger });
    assert.strictEqual(respond.mock.callCount(), 1);
    assert.strictEqual(logger.error.mock.callCount(), 0);
  });
});
