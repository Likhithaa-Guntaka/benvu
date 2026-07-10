import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  buildDeadlineReminderBlocks,
  buildDeadlineReminderText,
  DEADLINE_DONE_ACTION,
  DEADLINE_SNOOZE_ACTION,
  prettyDate,
} from '../../../listeners/views/deadline-reminder-builder.js';
import { assertNoEmoji } from '../../helpers/no-emoji.js';

/** A deadline record fixture. */
function deadline(overrides = {}) {
  return {
    id: 'DL-1',
    title: 'Q3 filing',
    dueDate: '2026-08-09',
    remindDaysBefore: 7,
    channelId: 'C1',
    createdBy: 'U1',
    notified: false,
    ...overrides,
  };
}

describe('prettyDate', () => {
  it('formats an ISO date as a friendly string', () => {
    assert.strictEqual(prettyDate('2026-08-09'), 'Aug 9, 2026');
  });
});

describe('buildDeadlineReminderText', () => {
  it('names the deadline and mentions the owner/creator', () => {
    const text = buildDeadlineReminderText(deadline());
    assert.ok(text.includes('Q3 filing'));
    assert.ok(text.includes('<@U1>'));
  });
});

describe('buildDeadlineReminderBlocks', () => {
  it('has a header, a mention body, detail fields, and done/snooze actions', () => {
    const blocks = buildDeadlineReminderBlocks(deadline());
    assert.strictEqual(blocks[0].type, 'header');

    const body = blocks.find((b) => b.type === 'section' && b.text);
    assert.ok(body.text.text.includes('<@U1>'));
    assert.ok(body.text.text.includes('Q3 filing'));

    const fields = blocks.find((b) => b.type === 'section' && b.fields);
    const labels = fields.fields.map((f) => f.text);
    assert.ok(labels.some((t) => t.includes('Due')));
    assert.ok(labels.some((t) => t.includes('Time left')));

    const acts = blocks.find((b) => b.type === 'actions');
    assert.strictEqual(acts.elements.length, 2);
    assert.strictEqual(acts.elements[0].action_id, DEADLINE_DONE_ACTION);
    assert.strictEqual(acts.elements[0].value, 'DL-1');
    assert.strictEqual(acts.elements[0].style, 'primary');
    assert.strictEqual(acts.elements[1].action_id, DEADLINE_SNOOZE_ACTION);
    assert.strictEqual(acts.elements[1].value, 'DL-1');
  });

  it('includes notes as a context block when present', () => {
    const blocks = buildDeadlineReminderBlocks(deadline({ notes: 'Attach the budget.' }));
    assert.ok(blocks.some((b) => b.type === 'context' && b.elements[0].text.includes('Attach the budget.')));
  });

  it('has no emoji', () => {
    assertNoEmoji(buildDeadlineReminderBlocks(deadline({ notes: 'note', owner: 'Maria' })));
  });
});
