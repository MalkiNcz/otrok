const UNITS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/**
 * Parses strings like "10m", "1h30m", "2d" into milliseconds.
 * Returns null if the string is not a valid duration.
 */
function parseDuration(input) {
  if (!input) return null;
  const regex = /(\d+)\s*(s|m|h|d)/gi;
  let match;
  let total = 0;
  let matched = false;
  while ((match = regex.exec(input)) !== null) {
    matched = true;
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    total += amount * UNITS[unit];
  }
  return matched ? total : null;
}

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0s';
  const days = Math.floor(ms / UNITS.d);
  const hours = Math.floor((ms % UNITS.d) / UNITS.h);
  const minutes = Math.floor((ms % UNITS.h) / UNITS.m);
  const seconds = Math.floor((ms % UNITS.m) / UNITS.s);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds && parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ') || '0s';
}

module.exports = { parseDuration, formatDuration };
