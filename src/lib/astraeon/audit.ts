import type { AuditEvent } from "./types";

let counter = 0;

export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function isoNow(date = new Date()): string {
  return date.toISOString();
}

export function appendEvent(events: AuditEvent[], event: AuditEvent, cap = 500): AuditEvent[] {
  return [...events, event].slice(-cap);
}
