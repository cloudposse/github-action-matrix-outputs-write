export type ContextName =
  | 'HTML'
  | 'XML'
  | 'SVG'
  | 'SQL'
  | 'SQL-STRICT'
  | 'SHELL'
  | 'REDOS'
  | 'NOSQL'
  | 'LOG';

export interface MatchResult {
  context: string;
  id: string;
  description: string;
  pattern: RegExp;
}

export type ContextArg = ContextName | ContextName[] | RegExp;

export const VALID_CONTEXTS: { readonly [K in ContextName]: K };

export function isUnsafe(value: string, context: ContextArg): boolean;
export function whyUnsafe(value: string, context: ContextArg): MatchResult | null;
export function allUnsafe(value: string, context: ContextArg): MatchResult[];

declare const isUnsafeDefault: typeof isUnsafe;
export default isUnsafeDefault;