/**
 * Date/Time Helpers
 *
 * All times are in East Africa Time (EAT, UTC+3).
 * The election runs in Kenya, so EAT is the canonical timezone.
 */

const EAT_TIMEZONE = 'Africa/Nairobi';

/**
 * Format a date for display in EAT: "23 Apr 2026, 10:47 AM"
 */
export function formatEAT(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-KE', {
    timeZone: EAT_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date as date only: "23 Apr 2026"
 */
export function formatDateEAT(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-KE', {
    timeZone: EAT_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date as time only: "10:47 AM"
 */
export function formatTimeEAT(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-KE', {
    timeZone: EAT_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Check if the current time falls within a voting/registration window.
 */
export function isWithinWindow(opensAt: Date, closesAt: Date): boolean {
  const now = new Date();
  return now >= opensAt && now <= closesAt;
}

/**
 * Get a human-readable time-until string: "2 hours, 15 minutes"
 */
export function timeUntil(target: Date | string): string {
  const d = typeof target === 'string' ? new Date(target) : target;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();

  if (diffMs <= 0) return 'now';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

  return parts.join(', ') || 'less than a minute';
}

/**
 * Get the current time in EAT as a Date object.
 */
export function nowEAT(): Date {
  return new Date();
}

/**
 * Check voting window state.
 */
export type VotingWindowState = 'not_open' | 'open' | 'closed_time' | 'closed_manual';

export function getVotingWindowState(
  opensAt: Date,
  closesAt: Date,
  isManuallyClosed: boolean
): VotingWindowState {
  if (isManuallyClosed) return 'closed_manual';
  const now = new Date();
  if (now < opensAt) return 'not_open';
  if (now > closesAt) return 'closed_time';
  return 'open';
}
