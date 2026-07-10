import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';

import { runDeadlineCheck } from '../../agent/deadline-scheduler.js';
import { _resetDeadlines, addDeadline } from '../../agent/tools/deadline-store.js';

/** ISO date N days from today. */
function isoInDays(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fakeClient() {
  return { chat: { postMessage: mock.fn(async () => ({ ok: true })) } };
}

const silentLogger = { info: () => {}, error: () => {} };

describe('deadline-scheduler', () => {
  beforeEach(() => _resetDeadlines());

  it('posts a reminder for a due deadline and marks it sent', async () => {
    addDeadline({ title: 'Report', dueDate: isoInDays(3), channelId: 'C1', createdBy: 'U1' });
    const client = fakeClient();

    const sent = await runDeadlineCheck(client, silentLogger);

    assert.strictEqual(sent, 1);
    assert.strictEqual(client.chat.postMessage.mock.callCount(), 1);
    assert.strictEqual(client.chat.postMessage.mock.calls[0].arguments[0].channel, 'C1');
  });

  it('does not post again on the next check (no double-nudge)', async () => {
    addDeadline({ title: 'Report', dueDate: isoInDays(3), channelId: 'C1', createdBy: 'U1' });
    const client = fakeClient();

    await runDeadlineCheck(client, silentLogger);
    const secondPass = await runDeadlineCheck(client, silentLogger);

    assert.strictEqual(secondPass, 0);
    assert.strictEqual(client.chat.postMessage.mock.callCount(), 1);
  });

  it('skips deadlines outside the reminder window', async () => {
    addDeadline({ title: 'Later', dueDate: isoInDays(30), channelId: 'C1', createdBy: 'U1' });
    const client = fakeClient();

    const sent = await runDeadlineCheck(client, silentLogger);

    assert.strictEqual(sent, 0);
    assert.strictEqual(client.chat.postMessage.mock.callCount(), 0);
  });

  it('leaves a deadline un-notified when posting fails, so it retries', async () => {
    addDeadline({ title: 'Report', dueDate: isoInDays(2), channelId: 'C1', createdBy: 'U1' });
    const client = {
      chat: {
        postMessage: mock.fn(async () => {
          throw new Error('channel_not_found');
        }),
      },
    };

    const sent = await runDeadlineCheck(client, silentLogger);
    assert.strictEqual(sent, 0);

    // Now it succeeds — the failed one should still be pending and get sent.
    client.chat.postMessage = mock.fn(async () => ({ ok: true }));
    const retry = await runDeadlineCheck(client, silentLogger);
    assert.strictEqual(retry, 1);
  });

  it('posts both a text fallback and blocks', async () => {
    addDeadline({ title: 'Report', dueDate: isoInDays(2), channelId: 'C1', createdBy: 'U1' });
    const client = fakeClient();
    await runDeadlineCheck(client, silentLogger);
    const arg = client.chat.postMessage.mock.calls[0].arguments[0];
    assert.ok(typeof arg.text === 'string' && arg.text.length > 0);
    assert.ok(Array.isArray(arg.blocks) && arg.blocks.length > 0);
  });
});
