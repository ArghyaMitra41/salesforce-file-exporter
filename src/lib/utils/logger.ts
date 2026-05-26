/**
 * Simple in-memory logger for export jobs.
 * Entries are added to the exportStore log array.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
}

export function formatLogEntry(level: LogLevel, message: string): string {
  const ts = new Date().toLocaleTimeString();
  const icon = { info: 'ℹ', warn: '⚠', error: '✗', success: '✓' }[level];
  return `[${ts}] ${icon} ${message}`;
}
