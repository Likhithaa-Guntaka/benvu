/**
 * Block Kit primitives — small, pure helpers that return Block Kit JSON.
 *
 * The visual system is emoji-free by design: pass plain-text labels and let
 * structure (headers, dividers, fields, button styles) carry the hierarchy.
 * These helpers also enforce Slack's hard limits so callers can't overflow a
 * section, actions block, or button label.
 */

/** Slack hard limits. */
export const LIMITS = {
  headerText: 150,
  sectionText: 3000,
  fieldText: 2000,
  fieldsPerSection: 10,
  buttonText: 75,
  buttonValue: 2000,
  elementsPerActions: 10,
  contextElements: 10,
};

// Keep a little headroom under the section limit when splitting long text.
const SECTION_SPLIT_AT = 2900;

/**
 * Truncate a string to `max` characters, adding an ellipsis when cut.
 * @param {string} s
 * @param {number} max
 * @returns {string}
 */
export function truncate(s, max) {
  const str = String(s ?? '');
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
}

/**
 * A plain_text object with emoji parsing turned off (we render no emoji).
 * @param {string} text
 * @param {number} [max]
 * @returns {import('@slack/types').PlainTextElement}
 */
export function plain(text, max = LIMITS.headerText) {
  return { type: 'plain_text', text: truncate(text, max), emoji: false };
}

/**
 * A header block.
 * @param {string} text
 * @returns {import('@slack/types').HeaderBlock}
 */
export function header(text) {
  return { type: 'header', text: plain(text, LIMITS.headerText) };
}

/**
 * A section block with mrkdwn body and an optional accessory (e.g. a button).
 * @param {string} text
 * @param {import('@slack/types').Button} [accessory]
 * @returns {import('@slack/types').SectionBlock}
 */
export function section(text, accessory) {
  /** @type {import('@slack/types').SectionBlock} */
  const block = { type: 'section', text: { type: 'mrkdwn', text: truncate(text, LIMITS.sectionText) } };
  if (accessory) block.accessory = accessory;
  return block;
}

/**
 * A section block laid out as two-column key/value fields.
 * @param {Array<[string, string]>} pairs - [label, value] tuples.
 * @returns {import('@slack/types').SectionBlock}
 */
export function sectionFields(pairs) {
  return {
    type: 'section',
    fields: pairs
      .slice(0, LIMITS.fieldsPerSection)
      .map(([label, value]) => ({ type: 'mrkdwn', text: truncate(`*${label}*\n${value}`, LIMITS.fieldText) })),
  };
}

/**
 * A divider block.
 * @returns {import('@slack/types').DividerBlock}
 */
export function divider() {
  return { type: 'divider' };
}

/**
 * A context block from one or more mrkdwn strings.
 * @param {...string} texts
 * @returns {import('@slack/types').ContextBlock}
 */
export function context(...texts) {
  return {
    type: 'context',
    elements: texts
      .slice(0, LIMITS.contextElements)
      .map((t) => ({ type: 'mrkdwn', text: truncate(t, LIMITS.sectionText) })),
  };
}

/**
 * A button element.
 * @param {Object} opts
 * @param {string} opts.text
 * @param {string} opts.actionId
 * @param {string} [opts.value]
 * @param {'primary' | 'danger'} [opts.style]
 * @param {string} [opts.url]
 * @returns {import('@slack/types').Button}
 */
export function button({ text, actionId, value, style, url }) {
  /** @type {import('@slack/types').Button} */
  const el = { type: 'button', text: plain(text, LIMITS.buttonText), action_id: actionId };
  if (value !== undefined) el.value = truncate(value, LIMITS.buttonValue);
  if (style) el.style = style;
  if (url) el.url = url;
  return el;
}

/**
 * An actions block. Caps at Slack's element limit so a caller can't overflow it.
 * @param {string} blockId
 * @param {import('@slack/types').Button[]} elements
 * @returns {import('@slack/types').ActionsBlock}
 */
export function actions(blockId, elements) {
  return { type: 'actions', block_id: blockId, elements: elements.slice(0, LIMITS.elementsPerActions) };
}

/**
 * Split long mrkdwn into as many section blocks as needed to stay under Slack's
 * per-section character limit. Always returns at least one section.
 * @param {string} text
 * @returns {import('@slack/types').SectionBlock[]}
 */
export function splitSections(text) {
  /** @type {import('@slack/types').SectionBlock[]} */
  const out = [];
  let remaining = text || '';
  do {
    out.push(section(remaining.slice(0, SECTION_SPLIT_AT)));
    remaining = remaining.slice(SECTION_SPLIT_AT);
  } while (remaining.length > 0);
  return out;
}
