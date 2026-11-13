/*
 * The audit log (BR-63): a list that only grows. Every sensitive action adds one line, with who,
 * what, to what and the detail. Pure.
 */
import type { AuditEntry } from './fixtures/types.ts';

/** Who does something: a person with the role they act in, or the system. */
export interface Actor {
  name: string;
  /** `Lễ tân`, `Chủ cơ sở`, `Tự động`. */
  role: string;
}

export const SYSTEM_ACTOR: Actor = { name: 'Hệ thống', role: 'Tự động' };

export interface AuditInput {
  action: string;
  object: string;
  detail: string;
  /** A path under `/mock/app/[tenant]`. */
  href?: string;
}

/** The list with one more line at the end; nothing already there changes. */
export function addAudit(
  list: readonly AuditEntry[],
  at: string,
  actor: Actor,
  input: AuditInput,
): AuditEntry[] {
  const entry: AuditEntry = {
    id: `au-${list.length + 1}`,
    at,
    by: actor.name,
    role: actor.role,
    action: input.action,
    object: input.object,
    detail: input.detail,
    ...(input.href ? { href: input.href } : {}),
  };
  return [...list, entry];
}

/** Lines to add in one go, in order. */
export function addAudits(
  list: readonly AuditEntry[],
  at: string,
  actor: Actor,
  inputs: readonly AuditInput[],
): AuditEntry[] {
  return inputs.reduce((acc, input) => addAudit(acc, at, actor, input), [...list]);
}
