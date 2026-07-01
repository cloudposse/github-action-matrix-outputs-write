/**
 * is-unsafe
 *
 * Zero-dependency, DOM-free, pure predicate for detecting unsafe strings
 * across HTML, XML, SVG, SQL, SQL-STRICT, SHELL, REDOS, NOSQL, and LOG contexts.
 *
 * @module is-unsafe
 */

import CONTEXT_REGISTRY, { VALID_CONTEXTS } from './registry.js';

/**
 * @typedef {'HTML'|'XML'|'SVG'|'SQL'|'SQL-STRICT'|'SHELL'|'REDOS'|'NOSQL'|'LOG'} ContextName
 */

/**
 * @typedef {Object} MatchResult
 * @property {string} context   - The context in which the match was found
 * @property {string} id        - Rule identifier
 * @property {string} description - Human-readable description of what was matched
 * @property {RegExp} pattern   - The pattern that matched
 */

// ─── Validation helpers ────────────────────────────────────────────────────

/**
 * Validate that `value` is a string. Throws TypeError if not.
 * @param {unknown} value
 */
function assertString(value) {
  if (typeof value !== 'string') {
    throw new TypeError(
      `is-unsafe: first argument must be a string, got ${typeof value}`
    );
  }
}

/**
 * Validate that `context` is a recognised context name, an array of them,
 * or a RegExp instance. Throws TypeError if not.
 * @param {ContextName|ContextName[]|RegExp} context
 */
function assertContext(context) {
  if (context instanceof RegExp) return;

  if (typeof context === 'string') {
    if (!CONTEXT_REGISTRY[context]) {
      throw new TypeError(
        `is-unsafe: unknown context "${context}". Valid contexts: ${Object.keys(VALID_CONTEXTS).join(', ')}`
      );
    }
    return;
  }

  if (Array.isArray(context)) {
    if (context.length === 0) {
      throw new TypeError('is-unsafe: context array must not be empty');
    }
    for (const c of context) {
      if (typeof c !== 'string' || !CONTEXT_REGISTRY[c]) {
        throw new TypeError(
          `is-unsafe: unknown context "${c}" in array. Valid contexts: ${Object.keys(VALID_CONTEXTS).join(', ')}`
        );
      }
    }
    return;
  }

  throw new TypeError(
    `is-unsafe: second argument must be a context string, array of context strings, or RegExp. Got: ${typeof context}`
  );
}

// ─── Core matching logic ───────────────────────────────────────────────────

/**
 * Test a single value against one named context's patterns.
 * Returns the first matching MatchResult, or null if nothing matched.
 *
 * @param {string} value
 * @param {string} contextName
 * @returns {MatchResult|null}
 */
function matchContext(value, contextName) {
  const patterns = CONTEXT_REGISTRY[contextName];
  for (const rule of patterns) {
    if (rule.pattern.test(value)) {
      return { context: contextName, id: rule.id, description: rule.description, pattern: rule.pattern };
    }
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Returns `true` if `value` is unsafe in the given context(s), `false` otherwise.
 *
 * @param {string} value           - The string to test
 * @param {ContextName|ContextName[]|RegExp} context
 *   - A named context ('HTML', 'XML', 'SVG', 'SQL', 'SQL-STRICT', 'SHELL', 'REDOS', 'NOSQL', 'LOG')
 *   - An array of named contexts — returns true if unsafe in **any** of them
 *   - A custom RegExp — returns true if the pattern matches
 * @returns {boolean}
 *
 * @example
 * isUnsafe('<script>alert(1)</script>', 'HTML')  // true
 * isUnsafe('hello world', 'HTML')                // false
 * isUnsafe('value', ['HTML', 'SQL'])             // false
 * isUnsafe('value', /my-pattern/i)               // false
 */
function isUnsafe(value, context) {
  assertString(value);
  assertContext(context);

  // Custom RegExp — caller-supplied pattern
  if (context instanceof RegExp) {
    return context.test(value);
  }

  // Single named context
  if (typeof context === 'string') {
    return matchContext(value, context) !== null;
  }

  // Array of named contexts — unsafe if ANY context matches
  for (const c of context) {
    if (matchContext(value, c) !== null) return true;
  }
  return false;
}

/**
 * Like `isUnsafe`, but instead of a boolean returns the first `MatchResult`
 * describing **why** the value was flagged, or `null` if it is safe.
 *
 * Useful for logging, error messages, or policy reporting.
 *
 * @param {string} value
 * @param {ContextName|ContextName[]|RegExp} context
 * @returns {MatchResult|null}
 *
 * @example
 * whyUnsafe('<script>alert(1)</script>', 'HTML')
 * // { context: 'HTML', id: 'html-script-open', description: '...', pattern: /.../ }
 */
function whyUnsafe(value, context) {
  assertString(value);
  assertContext(context);

  if (context instanceof RegExp) {
    return context.test(value)
      ? { context: 'CUSTOM', id: 'custom-regex', description: 'Matched caller-supplied pattern', pattern: context }
      : null;
  }

  if (typeof context === 'string') {
    return matchContext(value, context);
  }

  for (const c of context) {
    const result = matchContext(value, c);
    if (result !== null) return result;
  }
  return null;
}

/**
 * Returns all matching rules across the given context(s), or an empty array
 * if the value is safe. Useful for comprehensive auditing.
 *
 * @param {string} value
 * @param {ContextName|ContextName[]|RegExp} context
 * @returns {MatchResult[]}
 */
function allUnsafe(value, context) {
  assertString(value);
  assertContext(context);

  const results = [];

  if (context instanceof RegExp) {
    if (context.test(value)) {
      results.push({ context: 'CUSTOM', id: 'custom-regex', description: 'Matched caller-supplied pattern', pattern: context });
    }
    return results;
  }

  const contexts = typeof context === 'string' ? [context] : context;

  for (const c of contexts) {
    const patterns = CONTEXT_REGISTRY[c];
    for (const rule of patterns) {
      if (rule.pattern.test(value)) {
        results.push({ context: c, id: rule.id, description: rule.description, pattern: rule.pattern });
      }
    }
  }

  return results;
}

export { isUnsafe, whyUnsafe, allUnsafe, VALID_CONTEXTS };
export default isUnsafe;