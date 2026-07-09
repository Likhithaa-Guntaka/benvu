import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';

import {
  _resetDeadlines,
  addDeadline,
  daysUntil,
  getDueDeadlines,
  listDeadlines,
  markNotified,
} from '../../agent/tools/deadline-store.js';

/** ISO date N days from today. */
function isoInDays(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

describe('deadline-store', () => {
  beforeEach(() => _resetDeadlines());

  it('adds a deadline with an id and defaults', () => {
    const rec = addDeadline({ title: 'Report', dueDate: isoInDays(10), channelId: 'C1', createdBy: 'U1' });
    assert.match(rec.id, /^DL-\d+$/);
    assert.strictEqual(rec.remindDaysBefore, 7);
    assert.strictEqual(rec.notified, false);
    assert.strictEqual(listDeadlines().length, 1);
  });

  it('falls back to "unknown" channel/creator when omitted', () => {
    const rec = addDeadline({ title: 'X', dueDate: isoInDays(3) });
    assert.strictEqual(rec.channelId, 'unknown');
    assert.strictEqual(rec.createdBy, 'unknown');
  });

  it('daysUntil is 0 for today and positive for the future', () => {
    assert.strictEqual(daysUntil(isoInDays(0)), 0);
    assert.strictEqual(daysUntil(isoInDays(5)), 5);
    assert.strictEqual(daysUntil(isoInDays(-2)), -2);
  });

  it('getDueDeadlines returns items inside the reminder window', () => {
    addDeadline({ title: 'Soon', dueDate: isoInDays(3), remindDaysBefore: 7, channelId: 'C1', createdBy: 'U1' });
    addDeadline({ title: 'Later', dueDate: isoInDays(30), remindDaysBefore: 7, channelId: 'C1', createdBy: 'U1' });
    const due = getDueDeadlines();
    assert.strictEqual(due.length, 1);
    assert.strictEqual(due[0].title, 'Soon');
  });

  it('excludes deadlines with no real channel', () => {
    addDeadline({ title: 'NoChannel', dueDate: isoInDays(1), remindDaysBefore: 7 });
    assert.strictEqual(getDueDeadlines().length, 0);
  });

  it('markNotified removes an item from the due list', () => {
    const rec = addDeadline({ title: 'Soon', dueDate: isoInDays(2), channelId: 'C1', createdBy: 'U1' });
    assert.strictEqual(getDueDeadlines().length, 1);
    markNotified(rec.id);
    assert.strictEqual(getDueDeadlines().length, 0);
  });

  it('includes overdue deadlines', () => {
    addDeadline({ title: 'Overdue', dueDate: isoInDays(-1), channelId: 'C1', createdBy: 'U1' });
    assert.strictEqual(getDueDeadlines().length, 1);
  });
});
