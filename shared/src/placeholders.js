/**
 * Replaces {placeholders} used in welcome/leave messages and stat-channel templates.
 */
function applyPlaceholders(template, data) {
  if (!template) return '';
  return template
    .replace(/\{user\}/g, data.user ?? '')
    .replace(/\{username\}/g, data.username ?? '')
    .replace(/\{tag\}/g, data.tag ?? data.username ?? '')
    .replace(/\{server\}/g, data.server ?? '')
    .replace(/\{membercount\}/g, data.membercount ?? '')
    .replace(/\{count\}/g, data.count ?? data.membercount ?? '');
}

module.exports = { applyPlaceholders };
