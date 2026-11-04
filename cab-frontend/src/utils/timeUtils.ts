/**
 * Time and Duration Utilities for INDIAN CABS
 * 
 * - Timestamps are stored in UTC in MongoDB
 * - Displays all dates & times in Indian Standard Time (Asia/Kolkata)
 * - Calculates actual duration from completedAt.getTime() - startedAt.getTime()
 * - Safe fallbacks for legacy rides without crashing
 */

/**
 * Converts a duration in minutes to hours and minutes formatted string.
 * Examples:
 *   30 -> "30 min"
 *   60 -> "1 hr 0 min"
 *   90 -> "1 hr 30 min"
 *   282 -> "4 hr 42 min"
 */
export function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes) || totalMinutes < 0) {
    return '–';
  }

  const rounded = Math.floor(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

/**
 * Calculates actual ride duration between startedAt and completedAt.
 * Formula: completedAt.getTime() - startedAt.getTime()
 * 
 * Returns formatted string like "4 hr 42 min" or fallback for old rides.
 */
export function getRideDurationDisplay(ride: any): string {
  if (!ride) return '–';

  const startVal = ride.startedAt || ride.started_at;
  const endVal = ride.completedAt || ride.completed_at;

  if (startVal && endVal) {
    const start = new Date(startVal);
    const end = new Date(endVal);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end.getTime() >= start.getTime()) {
      const diffMs = end.getTime() - start.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      return formatMinutesToDuration(diffMinutes);
    }
  }

  // Fallback for legacy rides without startedAt and completedAt
  const estimated = ride.estimatedDuration ?? ride.estimated_duration ?? ride.duration;
  if (estimated !== undefined && estimated !== null && !isNaN(Number(estimated))) {
    return `${formatMinutesToDuration(Number(estimated))} (est.)`;
  }

  return '–';
}

/**
 * Formats a date/timestamp to Indian Standard Time (Asia/Kolkata).
 * Example output: "3 Nov 2026, 12:51 PM"
 * 
 * Ensures consistent display across devices and prevents double-conversion bugs.
 */
export function formatISTDateTime(dateVal: any): string {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '—';

  const formatted = d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Capitalize AM/PM for clean consistent presentation (e.g. "3 Nov 2026, 12:51 PM")
  return formatted.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

