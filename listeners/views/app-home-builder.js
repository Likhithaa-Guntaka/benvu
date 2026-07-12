import { ARTS_CULTURE } from '../arts-culture.js';
import { actions, button, context, divider, section } from './kit.js';
import { buildPromptButtons } from './onboarding-builder.js';

/**
 * @typedef {Object} Category
 * @property {string} actionId
 * @property {string} text
 * @property {string} value
 * @property {string} description - One-line plain description (used by the issue modal, not the Home rows).
 * @property {string} cta - Short button label for the card accessory (<= 75 chars).
 * @property {string} label - Compact, self-explanatory button label for the grouped Home rows.
 */

/** One-line tagline under the Kala name in the branded header. */
export const TAGLINE = 'Find arts funding, write reports, and hit every deadline, in any language.';

/** One-to-two line description of what Kala is and who it's for (branded header). */
export const DESCRIPTION =
  "I'm Kala, an AI teammate for arts and culture nonprofits. Tell me what you need, in any language, and " +
  "I'll find the grant, draft the report, or track the deadline.";

/** The full set of actions Kala can take from the Home tab. */
/** @type {Category[]} */
export const CATEGORIES = [
  {
    actionId: 'category_find_grants',
    text: 'Find Grants',
    value: 'Find Grants',
    description: 'Search real, open federal grants that fit your mission and budget.',
    cta: 'Find grants',
    label: 'Find grants',
  },
  {
    actionId: 'category_draft_report',
    text: 'Draft a Report',
    value: 'Draft a Report',
    description: 'Turn a line about your impact into a ready-to-send report.',
    cta: 'Draft report',
    label: 'Draft a report',
  },
  {
    actionId: 'category_track_deadline',
    text: 'Track a Deadline',
    value: 'Track a Deadline',
    description: "I'll remember a due date and nudge your team before it's here.",
    cta: 'Track deadline',
    label: 'Track a deadline',
  },
  {
    actionId: 'category_summarize_meeting',
    text: 'Summarize Meeting Notes',
    value: 'Summarize Meeting Notes',
    description: 'Paste notes and get a clean summary with decisions and action items.',
    cta: 'Summarize',
    label: 'Summarize notes',
  },
  {
    actionId: 'category_donor_thankyou',
    text: 'Draft Donor Thank You',
    value: 'Draft Donor Thank You',
    description: 'Write a warm, genuine thank-you for your donors in seconds.',
    cta: 'Draft note',
    label: 'Draft a thank-you',
  },
  {
    actionId: 'category_volunteer_announcement',
    text: 'Create Volunteer Announcement',
    value: 'Create Volunteer Announcement',
    description: 'Post a clear call for volunteers for an upcoming shift or event.',
    cta: 'Create post',
    label: 'Volunteer call',
  },
  {
    actionId: 'category_track_engagement',
    text: 'Track an Engagement',
    value: 'Track an Engagement',
    description: 'Track contracts, W-9s, and invoices for each artist or contractor.',
    cta: 'Track engagement',
    label: 'Track an engagement',
  },
  {
    actionId: 'category_track_event',
    text: 'Track Event RSVPs',
    value: 'Track Event RSVPs',
    description: 'Collect RSVPs for a free event and get a live head count.',
    cta: 'Track RSVPs',
    label: 'Event RSVPs',
  },
  {
    actionId: 'category_track_schedule',
    text: 'Track a Schedule Change',
    value: 'Track a Schedule Change',
    description: 'Post a schedule change and track who has confirmed they saw it.',
    cta: 'Track change',
    label: 'Schedule change',
  },
];

/**
 * The three Home groups, named the way small arts staff think about their week
 * rather than by corporate department. Each lists the action IDs it surfaces, in
 * order; the labels and values come from CATEGORIES so nothing drifts.
 * @type {{ label: string, actionIds: string[] }[]}
 */
export const HOME_GROUPS = [
  { label: 'Money and deadlines', actionIds: ['category_find_grants', 'category_track_deadline'] },
  {
    label: 'Getting the word out',
    actionIds: [
      'category_draft_report',
      'category_donor_thankyou',
      'category_summarize_meeting',
      'category_volunteer_announcement',
    ],
  },
  {
    label: 'Behind the scenes',
    actionIds: ['category_track_engagement', 'category_track_event', 'category_track_schedule'],
  },
];

/**
 * A time-of-day greeting in a light, human voice, optionally personalized with the
 * user's first name. Time-aware (morning / afternoon / evening) and testable via
 * the injected `now`.
 * @param {Date} now - Server time (injected so the greeting is testable).
 * @param {string} [firstName] - The user's first name, if it could be fetched.
 * @returns {string}
 */
export function greeting(now, firstName) {
  const hour = now.getHours();
  const partOfDay = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const name = (firstName || '').trim();
  const salutation = name ? `${partOfDay}, ${name}` : partOfDay;
  return `${salutation}. Here's what's worth your five minutes.`;
}

/**
 * The hero "call sheet" line: one human sentence about the single most relevant
 * thing right now, with a button attached so no fact is left orphaned. Driven by
 * the live closing-soon count when we have it, with a graceful fallback otherwise.
 * The only primary-styled button in the view.
 * @param {{ count: number, label: string } | null | undefined} closingSoon
 * @returns {import('@slack/types').SectionBlock}
 */
function heroBlock(closingSoon) {
  let text;
  let cta;
  if (closingSoon && closingSoon.count > 0) {
    const n = closingSoon.count;
    const countWord = n === 1 ? 'One' : String(n);
    const grants = n === 1 ? 'grant' : 'grants';
    const closes = n === 1 ? 'closes' : 'close';
    text = `*${countWord} ${closingSoon.label} ${grants} ${closes} in the next 30 days* — worth a look before they close.`;
    cta = "See what's closing";
  } else {
    text = "*Nothing's on fire right now* — good moment to go find the next grant worth chasing.";
    cta = 'Find grants';
  }
  const accessory = button({ text: cta, actionId: 'category_find_grants', value: 'Find Grants', style: 'primary' });
  const block = section(text, accessory);
  block.block_id = 'quick_actions_1';
  return block;
}

/**
 * The arts and culture operational-language prompt rows: the tailored prompts,
 * plus a separate row of RTS-grounded prompts. The "searches your own channels"
 * aside is folded into a single light line under the RTS row only. Clicking a
 * prompt runs it via the shared prompt_run_ handler. Emoji-free by design.
 * @returns {import('@slack/types').KnownBlock[]}
 */
function tailoredPromptBlocks() {
  /** @type {import('@slack/types').KnownBlock[]} */
  const blocks = [section('*A few things I can do for you*')];
  blocks.push(buildPromptButtons(ARTS_CULTURE.tailoredPrompts, 'home_tailored_prompts'));

  if (ARTS_CULTURE.rtsPrompts?.length) {
    blocks.push(buildPromptButtons(ARTS_CULTURE.rtsPrompts, 'home_rts_prompts', ARTS_CULTURE.tailoredPrompts.length));
    blocks.push(context('These search your own channels, so answers reflect what your team actually said.'));
  }
  return blocks;
}

/**
 * The three grouped action rows: each a small muted label followed by a compact
 * row of self-explanatory buttons (no per-button description text). Every button
 * keeps its existing category_ action_id and value so the issue modal and
 * handleIssueButton keep working unchanged; none are primary-styled (the hero owns
 * the single primary button).
 * @returns {import('@slack/types').KnownBlock[]}
 */
function groupedActionRows() {
  /** @type {import('@slack/types').KnownBlock[]} */
  const blocks = [];
  HOME_GROUPS.forEach((group, gi) => {
    blocks.push(context(`*${group.label}*`));
    const elements = group.actionIds
      .map((id) => CATEGORIES.find((c) => c.actionId === id))
      .filter((cat) => cat !== undefined)
      .map((cat) => button({ text: cat.label, actionId: cat.actionId, value: cat.value }));
    blocks.push(actions(`home_group_${gi}`, elements));
  });
  return blocks;
}

/**
 * Build the App Home view for Kala.
 *
 * The Home opens directly into a light personalized greeting, a hero "call sheet"
 * line (the single most relevant thing, with a button), the arts and culture prompt
 * rows, and three grouped action rows. There is no branded header and no footer:
 * the view ends after the grouped rows' closing divider.
 *
 * @param {string | null} [_botUserId] - Unused; kept so existing call sites stay unchanged.
 * @param {{ firstName?: string, now?: Date, notice?: string, closingSoon?: { count: number, label: string } | null }} [opts] -
 *   Personalization: the user's first name (for the greeting), the current time
 *   (injected for testability), a transient `notice` banner shown once at the top,
 *   and an optional live `closingSoon` count ({ count, label }) that drives the hero
 *   line — falls back to a neutral hero when null/absent.
 * @returns {import('@slack/types').HomeView}
 */
export function buildAppHomeView(_botUserId = null, opts = {}) {
  const notice = (opts.notice || '').trim();
  const now = opts.now instanceof Date ? opts.now : new Date();

  /** @type {import('@slack/types').KnownBlock[]} */
  const blocks = [section(`*${greeting(now, opts.firstName)}*`)];

  if (notice) {
    blocks.push(section(notice));
  }

  blocks.push(divider());
  blocks.push(heroBlock(opts.closingSoon));

  blocks.push(divider());
  blocks.push(...tailoredPromptBlocks());

  blocks.push(divider());
  blocks.push(...groupedActionRows());
  blocks.push(divider());

  return { type: 'home', blocks };
}
