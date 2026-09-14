const { config } = require('@otrok/shared');

const API_BASE = 'https://discord.com/api/v10';
const PERMISSION_MANAGE_GUILD = 0x20n;

class DiscordApiError extends Error {
  constructor(status, body) {
    super(`Discord API error ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

async function request(method, path, { token, body, reason } = {}) {
  const headers = { Authorization: token || `Bot ${config.token}` };
  if (body) headers['Content-Type'] = 'application/json';
  if (reason) headers['X-Audit-Log-Reason'] = encodeURIComponent(reason).slice(0, 500);

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new DiscordApiError(res.status, data || text);
  return data;
}

// --- OAuth2 -----------------------------------------------------------------

async function exchangeCodeForToken(code) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${config.dashboard.baseUrl}/auth/callback`,
  });

  const res = await fetch(`${API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new DiscordApiError(res.status, data);
  return data; // { access_token, refresh_token, expires_in, ... }
}

function getCurrentUser(accessToken) {
  return request('GET', '/users/@me', { token: `Bearer ${accessToken}` });
}

function getUserGuilds(accessToken) {
  return request('GET', '/users/@me/guilds', { token: `Bearer ${accessToken}` });
}

/** Guilds the manageable list should be filtered to: owner or has MANAGE_GUILD. */
function filterManageableGuilds(guilds) {
  return guilds.filter((g) => g.owner || (BigInt(g.permissions) & PERMISSION_MANAGE_GUILD) === PERMISSION_MANAGE_GUILD);
}

// --- Bot-token guild data -----------------------------------------------------

function getBotGuilds() {
  return request('GET', '/users/@me/guilds');
}

function getGuild(guildId) {
  return request('GET', `/guilds/${guildId}?with_counts=true`);
}

function getGuildChannels(guildId) {
  return request('GET', `/guilds/${guildId}/channels`);
}

function getGuildRoles(guildId) {
  return request('GET', `/guilds/${guildId}/roles`);
}

function getGuildMember(guildId, userId) {
  return request('GET', `/guilds/${guildId}/members/${userId}`);
}

function getUser(userId) {
  return request('GET', `/users/${userId}`);
}

// --- Moderation actions -------------------------------------------------------

function banMember(guildId, userId, reason, deleteMessageSeconds = 0) {
  return request('PUT', `/guilds/${guildId}/bans/${userId}`, {
    reason,
    body: { delete_message_seconds: deleteMessageSeconds },
  });
}

function unbanMember(guildId, userId, reason) {
  return request('DELETE', `/guilds/${guildId}/bans/${userId}`, { reason });
}

function kickMember(guildId, userId, reason) {
  return request('DELETE', `/guilds/${guildId}/members/${userId}`, { reason });
}

function timeoutMember(guildId, userId, untilIso, reason) {
  return request('PATCH', `/guilds/${guildId}/members/${userId}`, {
    reason,
    body: { communication_disabled_until: untilIso },
  });
}

function sendMessage(channelId, payload) {
  return request('POST', `/channels/${channelId}/messages`, { body: payload });
}

function getChannelMessages(channelId, limit = 100) {
  return request('GET', `/channels/${channelId}/messages?limit=${limit}`);
}

function deleteMessage(channelId, messageId, reason) {
  return request('DELETE', `/channels/${channelId}/messages/${messageId}`, { reason });
}

function bulkDeleteMessages(channelId, messageIds, reason) {
  return request('POST', `/channels/${channelId}/messages/bulk-delete`, { reason, body: { messages: messageIds } });
}

module.exports = {
  DiscordApiError,
  exchangeCodeForToken,
  getCurrentUser,
  getUserGuilds,
  filterManageableGuilds,
  getBotGuilds,
  getGuild,
  getGuildChannels,
  getGuildRoles,
  getGuildMember,
  getUser,
  banMember,
  unbanMember,
  kickMember,
  timeoutMember,
  sendMessage,
  getChannelMessages,
  deleteMessage,
  bulkDeleteMessages,
};
