import assert from 'node:assert';
import { describe, it } from 'node:test';

import { ARTS_CULTURE } from '../../../listeners/arts-culture.js';
import {
  buildAppHomeView,
  CATEGORIES,
  DESCRIPTION,
  greeting,
  HOME_GROUPS,
  TAGLINE,
} from '../../../listeners/views/app-home-builder.js';
import { assertNoEmoji } from '../../helpers/no-emoji.js';

/** @param {any} view @param {string} id */
function block(view, id) {
  return view.blocks.find((b) => b.block_id === id);
}
/** @param {any} view @param {string} type */
function blocksOfType(view, type) {
  return view.blocks.filter((b) => b.type === type);
}
/** Every button element across the grouped action rows. @param {any} view */
function groupButtons(view) {
  return blocksOfType(view, 'actions')
    .filter((b) => String(b.block_id || '').startsWith('home_group_'))
    .flatMap((b) => b.elements);
}

const homeOpts = { firstName: 'A', now: new Date('2026-07-10T09:00:00') };
const greetingText = (view) =>
  view.blocks.find((b) => b.type === 'section' && /worth your five minutes/.test(b.text?.text || ''))?.text.text;
const heroText = (view) => block(view, 'quick_actions_1')?.text.text;

describe('buildAppHomeView', () => {
  it('greets as an arts and culture assistant from the first screen — no picker step', () => {
    const view = buildAppHomeView(null, homeOpts);
    assert.strictEqual(view.type, 'home');
    assert.ok(block(view, 'quick_actions_1'), 'hero call-sheet present on first screen');
    assert.ok(block(view, 'home_tailored_prompts'), 'tailored prompt row present');
  });

  it('never contains emoji', () => {
    assertNoEmoji(buildAppHomeView(null, homeOpts));
  });

  it('leads directly with the greeting section — no image block anywhere', () => {
    const blocks = buildAppHomeView(null, homeOpts).blocks;
    // No image block in the Home at all.
    assert.ok(!blocks.some((b) => b.type === 'image'));
    // blocks[0]: the bold greeting section.
    assert.strictEqual(blocks[0].type, 'section');
    assert.match(blocks[0].text.text, /^\*(Morning|Afternoon|Evening)/);
  });

  it('ends after the grouped action rows with no footer context block', () => {
    const view = buildAppHomeView(null, homeOpts);
    const blocks = view.blocks;
    // The last block is the grouped rows' closing divider — nothing after it.
    assert.strictEqual(blocks[blocks.length - 1].type, 'divider');
    // The last non-divider block is the final group's actions row.
    const lastActions = blocks[blocks.length - 2];
    assert.strictEqual(lastActions.type, 'actions');
    assert.strictEqual(lastActions.block_id, `home_group_${HOME_GROUPS.length - 1}`);
    // No footer copy survives anywhere in the view.
    const allText = JSON.stringify(blocks);
    assert.ok(!/small arts teams actually work/.test(allText), 'no "built for" footer line');
    assert.ok(!/Reach me anytime/.test(allText), 'no reach-line footer');
    assert.ok(!allText.includes(ARTS_CULTURE.label), 'no arts-focus marketing footer');
  });

  describe('branded header', () => {
    it('does not render a branded header in the onboarded view', () => {
      const blocks = buildAppHomeView(null, homeOpts).blocks;
      assert.strictEqual(
        blocks.find((b) => b.type === 'header'),
        undefined,
      );
      assert.ok(!blocks.some((b) => b.text?.text === TAGLINE));
      assert.ok(!blocks.some((b) => b.text?.text === DESCRIPTION));
    });
  });

  describe('personalized greeting', () => {
    it('greets the user by name and time of day in a bold section', () => {
      const view = buildAppHomeView(null, { firstName: 'Dedeepya', now: new Date('2026-07-10T14:30:00') });
      assert.strictEqual(greetingText(view), "*Afternoon, Dedeepya. Here's what's worth your five minutes.*");
    });

    it('falls back to a neutral greeting when the name is missing', () => {
      const view = buildAppHomeView(null, { now: new Date('2026-07-10T20:00:00') });
      assert.strictEqual(greetingText(view), "*Evening. Here's what's worth your five minutes.*");
    });
  });

  describe('hero call sheet', () => {
    const opts = (closingSoon) => ({ firstName: 'A', now: new Date('2026-07-10T09:00:00'), closingSoon });

    it('is a single section with exactly one primary button (no orphaned stats)', () => {
      const view = buildAppHomeView(null, opts({ count: 3, label: 'arts and culture' }));
      const hero = block(view, 'quick_actions_1');
      assert.strictEqual(hero.type, 'section');
      assert.strictEqual(hero.accessory?.type, 'button');
      assert.strictEqual(hero.accessory.style, 'primary');
      // The hero owns the only primary button in the whole view.
      const allButtons = view.blocks.flatMap((b) =>
        b.accessory?.type === 'button' ? [b.accessory] : Array.isArray(b.elements) ? b.elements : [],
      );
      assert.strictEqual(allButtons.filter((el) => el.style === 'primary').length, 1);
    });

    it('folds a positive closing-soon count into the hero sentence', () => {
      const view = buildAppHomeView(null, opts({ count: 5, label: 'arts and culture' }));
      assert.match(
        heroText(view),
        /\*5 arts and culture grants close in the next 30 days\* — worth a look before they close\./,
      );
      // The count is not also rendered as a standalone context line.
      assert.ok(!blocksOfType(view, 'context').some((b) => /close/.test(b.elements[0].text)));
      assertNoEmoji(view);
    });

    it('singularizes for a count of one', () => {
      const view = buildAppHomeView(null, opts({ count: 1, label: 'arts and culture' }));
      assert.match(
        heroText(view),
        /\*One arts and culture grant closes in the next 30 days\* — worth a look before they close\./,
      );
    });

    it('falls back to a neutral hero when the count is null (API slow/down/failed)', () => {
      const view = buildAppHomeView(null, opts(null));
      assert.match(heroText(view), /Nothing's on fire right now/);
      assert.match(heroText(view), /find the next grant worth chasing\./);
      assert.strictEqual(block(view, 'quick_actions_1').accessory.action_id, 'category_find_grants');
    });

    it('falls back to a neutral hero when the count is zero (nothing closing soon)', () => {
      const view = buildAppHomeView(null, opts({ count: 0, label: 'arts and culture' }));
      assert.match(heroText(view), /Nothing's on fire right now/);
    });
  });

  describe('grouped action rows', () => {
    it('renders three named groups, each a muted label plus a compact button row', () => {
      const view = buildAppHomeView(null, homeOpts);
      HOME_GROUPS.forEach((group, gi) => {
        const row = block(view, `home_group_${gi}`);
        assert.ok(row, `group ${gi} actions row present`);
        assert.strictEqual(row.type, 'actions');
        assert.strictEqual(row.elements.length, group.actionIds.length);
        // The muted label sits immediately before its actions row.
        const idx = view.blocks.indexOf(row);
        const labelBlock = view.blocks[idx - 1];
        assert.strictEqual(labelBlock.type, 'context');
        assert.strictEqual(labelBlock.elements[0].text, `*${group.label}*`);
      });
    });

    it('preserves every category action_id and value, none primary, no description text', () => {
      const view = buildAppHomeView(null, homeOpts);
      const buttons = groupButtons(view);
      assert.strictEqual(buttons.length, CATEGORIES.length, 'every category surfaced exactly once');
      for (const el of buttons) {
        assert.ok(el.action_id.startsWith('category_'));
        const cat = CATEGORIES.find((c) => c.actionId === el.action_id);
        assert.ok(cat, `action_id ${el.action_id} maps to a known category`);
        assert.strictEqual(el.value, cat.value, 'value preserved for the issue modal');
        assert.strictEqual(el.text.text, cat.label, 'compact label, no description text');
        assert.notStrictEqual(el.style, 'primary');
      }
      const ids = buttons.map((b) => b.action_id);
      assert.strictEqual(new Set(ids).size, ids.length, 'no duplicate action_ids');
    });

    it('leads with Find Grants under "Money and deadlines"', () => {
      const view = buildAppHomeView(null, homeOpts);
      const first = block(view, 'home_group_0');
      assert.strictEqual(first.elements[0].action_id, 'category_find_grants');
    });
  });

  describe('prompt rows', () => {
    it('renders the arts tailored and RTS prompt rows as prompt_run_ buttons', () => {
      const view = buildAppHomeView(null, homeOpts);
      const tailored = block(view, 'home_tailored_prompts');
      const rts = block(view, 'home_rts_prompts');
      assert.ok(tailored && rts, 'both prompt rows present');
      assert.strictEqual(tailored.elements.length, ARTS_CULTURE.tailoredPrompts.length);
      assert.strictEqual(rts.elements.length, ARTS_CULTURE.rtsPrompts.length);
      const all = [...tailored.elements, ...rts.elements];
      for (const el of all) {
        assert.ok(el.action_id.startsWith('prompt_run_'));
        assert.ok(typeof el.value === 'string' && el.value.length > 0);
      }
      const ids = all.map((e) => e.action_id);
      assert.strictEqual(new Set(ids).size, ids.length);
    });

    it('folds the "searches your own channels" aside under the RTS row only', () => {
      const view = buildAppHomeView(null, homeOpts);
      const asides = blocksOfType(view, 'context').filter((b) => /search your own channels/.test(b.elements[0].text));
      assert.strictEqual(asides.length, 1, 'exactly one channels aside');
      const rtsIdx = view.blocks.findIndex((b) => b.block_id === 'home_rts_prompts');
      const asideIdx = view.blocks.indexOf(asides[0]);
      assert.ok(rtsIdx >= 0 && asideIdx === rtsIdx + 1, 'aside sits directly under the RTS row');
    });
  });

  describe('notice banner', () => {
    it('shows a transient notice below the greeting and above the hero', () => {
      const notice = 'Sent to your messages, open the Messages tab.';
      const view = buildAppHomeView(null, { firstName: 'A', now: new Date('2026-07-10T09:00:00'), notice });
      const noticeIdx = view.blocks.findIndex((b) => b.type === 'section' && b.text?.text === notice);
      const greetingIdx = view.blocks.findIndex(
        (b) => b.type === 'section' && /worth your five minutes/.test(b.text?.text || ''),
      );
      const heroIdx = view.blocks.findIndex((b) => b.block_id === 'quick_actions_1');
      assert.ok(noticeIdx >= 0, 'notice banner is present');
      assert.ok(greetingIdx >= 0 && greetingIdx < noticeIdx, 'notice sits below the greeting');
      assert.ok(noticeIdx < heroIdx, 'notice sits above the hero');
      assertNoEmoji(view);
    });

    it('omits the notice banner when none is passed (auto-clears on refresh)', () => {
      const view = buildAppHomeView(null, homeOpts);
      assert.ok(!view.blocks.some((b) => b.type === 'section' && /messages tab/i.test(b.text?.text || '')));
    });
  });
});

describe('greeting', () => {
  it('picks morning / afternoon / evening by the hour', () => {
    assert.strictEqual(
      greeting(new Date('2026-07-10T06:00:00'), 'Sam'),
      "Morning, Sam. Here's what's worth your five minutes.",
    );
    assert.strictEqual(
      greeting(new Date('2026-07-10T11:59:00'), 'Sam'),
      "Morning, Sam. Here's what's worth your five minutes.",
    );
    assert.strictEqual(
      greeting(new Date('2026-07-10T12:00:00'), 'Sam'),
      "Afternoon, Sam. Here's what's worth your five minutes.",
    );
    assert.strictEqual(
      greeting(new Date('2026-07-10T17:59:00'), 'Sam'),
      "Afternoon, Sam. Here's what's worth your five minutes.",
    );
    assert.strictEqual(
      greeting(new Date('2026-07-10T18:00:00'), 'Sam'),
      "Evening, Sam. Here's what's worth your five minutes.",
    );
    assert.strictEqual(
      greeting(new Date('2026-07-10T23:30:00'), 'Sam'),
      "Evening, Sam. Here's what's worth your five minutes.",
    );
  });

  it('drops the name cleanly when it is missing or blank', () => {
    assert.strictEqual(greeting(new Date('2026-07-10T09:00:00')), "Morning. Here's what's worth your five minutes.");
    assert.strictEqual(
      greeting(new Date('2026-07-10T09:00:00'), '   '),
      "Morning. Here's what's worth your five minutes.",
    );
  });
});
