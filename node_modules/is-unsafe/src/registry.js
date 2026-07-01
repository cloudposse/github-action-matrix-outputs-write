/**
 * Context registry — maps context name strings to their pattern arrays.
 *
 * Adding a new context: create a file in ./contexts/, export a default array
 * of pattern objects, and register it here.
 *
 * Context name guide:
 *   SQL        — high-precision rules; safe for general text fields
 *   SQL-STRICT — SQL + three noisier rules (line comments, stacked queries, hex);
 *                use only for SQL-specific inputs
 *   REDOS      — detects ReDoS-prone patterns when string will be compiled as RegExp
 */

import HTML_PATTERNS from './contexts/html.js';
import XML_PATTERNS from './contexts/xml.js';
import SVG_PATTERNS from './contexts/svg.js';
import SQL_PATTERNS from './contexts/sql.js';
import SQL_STRICT_PATTERNS from './contexts/sql-strict.js';
import SHELL_PATTERNS from './contexts/shell.js';
import REDOS_PATTERNS from './contexts/redos.js';
import NOSQL_PATTERNS from './contexts/nosql.js';
import LOG_PATTERNS from './contexts/log.js';

/** @type {Record<string, Array<{id: string, description: string, pattern: RegExp}>>} */
const CONTEXT_REGISTRY = {
  HTML: HTML_PATTERNS,
  XML: XML_PATTERNS,
  SVG: SVG_PATTERNS,
  SQL: SQL_PATTERNS,
  'SQL-STRICT': SQL_STRICT_PATTERNS,
  SHELL: SHELL_PATTERNS,
  REDOS: REDOS_PATTERNS,
  NOSQL: NOSQL_PATTERNS,
  LOG: LOG_PATTERNS,
};

export default CONTEXT_REGISTRY;

/**
 * Enum of valid context names — e.g. `VALID_CONTEXTS.HTML === 'HTML'`.
 * @type {Record<string, string>}
 */
export const VALID_CONTEXTS = Object.freeze(
  Object.fromEntries(Object.keys(CONTEXT_REGISTRY).map((k) => [k, k]))
);