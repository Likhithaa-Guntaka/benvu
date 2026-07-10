import assert from 'node:assert';

/**
 * Matches emoji / pictographic characters. Extended_Pictographic covers the
 * emoji Slack renders; the variation selector and keycap catch composed emoji.
 */
const EMOJI_RE = /\p{Extended_Pictographic}|\u{FE0F}|\u{20E3}/u;

/**
 * True if a string contains any emoji character.
 * @param {string} s
 * @returns {boolean}
 */
export function containsEmoji(s) {
  return EMOJI_RE.test(String(s ?? ''));
}

/**
 * Recursively collect every string leaf in a Block Kit structure.
 * @param {unknown} node
 * @param {string[]} [out]
 * @returns {string[]}
 */
function collectStrings(node, out = []) {
  if (typeof node === 'string') {
    out.push(node);
  } else if (Array.isArray(node)) {
    for (const item of node) collectStrings(item, out);
  } else if (node && typeof node === 'object') {
    for (const value of Object.values(node)) collectStrings(value, out);
  }
  return out;
}

/**
 * Assert that no visible string in a Block Kit view/blocks structure contains an
 * emoji. Action IDs and values are plain ASCII in this codebase, so scanning all
 * string leaves is a strict, safe check on generated UI copy.
 * @param {unknown} blocksOrView
 * @param {string} [message]
 */
export function assertNoEmoji(blocksOrView, message = 'UI copy must not contain emoji') {
  for (const s of collectStrings(blocksOrView)) {
    assert.ok(!containsEmoji(s), `${message} — found emoji in: ${JSON.stringify(s)}`);
  }
}
