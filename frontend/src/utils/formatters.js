/**
 * Format schedule info into a user-friendly string (e.g. "30m", "1h", "2h 30m")
 */
export function formatScheduleInterval(scheduleInfo) {
  if (!scheduleInfo) return '6h';

  let total = scheduleInfo.total_minutes;
  if (total === undefined || total === null) {
    const h = scheduleInfo.interval_hours || 0;
    const m = scheduleInfo.interval_minutes || 0;
    total = h * 60 + m;
    if (total === 0) total = 360; // 6h default
  }

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

/**
 * Format interval into human readable text (e.g. "Every 30 minutes", "Every 2 hours 15 minutes")
 */
export function formatScheduleIntervalFull(scheduleInfo) {
  if (!scheduleInfo) return 'Every 6 hours';

  let total = scheduleInfo.total_minutes;
  if (total === undefined || total === null) {
    const h = scheduleInfo.interval_hours || 0;
    const m = scheduleInfo.interval_minutes || 0;
    total = h * 60 + m;
    if (total === 0) total = 360;
  }

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }

  return parts.length > 0 ? `Every ${parts.join(' ')}` : 'Every 1 minute';
}
