const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./config');

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema (idempotent - safe to run on every process start, both bot & dashboard)
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id              TEXT PRIMARY KEY,
  welcome_enabled       INTEGER NOT NULL DEFAULT 0,
  welcome_channel_id    TEXT,
  welcome_message       TEXT NOT NULL DEFAULT 'Vítej na serveru {server}, {user}! Jsi náš {membercount}. člen.',
  welcome_use_embed     INTEGER NOT NULL DEFAULT 1,
  leave_enabled         INTEGER NOT NULL DEFAULT 0,
  leave_channel_id      TEXT,
  leave_message         TEXT NOT NULL DEFAULT '{username} opustil/a server {server}. Zbývá {membercount} členů.',
  log_channel_id        TEXT,
  log_join              INTEGER NOT NULL DEFAULT 1,
  log_leave             INTEGER NOT NULL DEFAULT 1,
  log_ban               INTEGER NOT NULL DEFAULT 1,
  log_kick              INTEGER NOT NULL DEFAULT 1,
  log_mute              INTEGER NOT NULL DEFAULT 1,
  log_voice             INTEGER NOT NULL DEFAULT 1,
  log_message_delete    INTEGER NOT NULL DEFAULT 1,
  log_message_edit      INTEGER NOT NULL DEFAULT 1,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rules_config (
  guild_id      TEXT PRIMARY KEY,
  channel_id    TEXT,
  message_id    TEXT,
  role_id       TEXT,
  title         TEXT NOT NULL DEFAULT 'Pravidla serveru',
  description   TEXT NOT NULL DEFAULT 'Než budeš pokračovat, přečti si prosím pravidla a potvrď souhlas tlačítkem níže.',
  button_label  TEXT NOT NULL DEFAULT '✅ Souhlasím s pravidly',
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id        TEXT NOT NULL,
  type            TEXT NOT NULL,
  user_id         TEXT,
  user_tag        TEXT,
  moderator_id    TEXT,
  moderator_tag   TEXT,
  reason          TEXT,
  extra           TEXT,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_guild_created ON audit_log (guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_guild_type ON audit_log (guild_id, type);

CREATE TABLE IF NOT EXISTS stat_channels (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id      TEXT NOT NULL,
  channel_id    TEXT NOT NULL UNIQUE,
  channel_type  TEXT NOT NULL DEFAULT 'voice',
  metric        TEXT NOT NULL DEFAULT 'members',
  template      TEXT NOT NULL DEFAULT '👥 Členové: {count}',
  last_updated  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_stat_guild ON stat_channels (guild_id);
`);

// ---------------------------------------------------------------------------
// guild_settings
// ---------------------------------------------------------------------------
const DEFAULT_SETTINGS_STMT = db.prepare(`
  INSERT OR IGNORE INTO guild_settings (guild_id, created_at, updated_at) VALUES (?, ?, ?)
`);

function getGuildSettings(guildId) {
  const now = Date.now();
  DEFAULT_SETTINGS_STMT.run(guildId, now, now);
  return db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
}

const ALLOWED_SETTINGS_FIELDS = [
  'welcome_enabled', 'welcome_channel_id', 'welcome_message', 'welcome_use_embed',
  'leave_enabled', 'leave_channel_id', 'leave_message',
  'log_channel_id', 'log_join', 'log_leave', 'log_ban', 'log_kick', 'log_mute',
  'log_voice', 'log_message_delete', 'log_message_edit',
];

function updateGuildSettings(guildId, fields) {
  getGuildSettings(guildId); // ensure row exists
  const keys = Object.keys(fields).filter((k) => ALLOWED_SETTINGS_FIELDS.includes(k));
  if (keys.length === 0) return getGuildSettings(guildId);
  const setClause = keys.map((k) => `${k} = @${k}`).join(', ');
  const stmt = db.prepare(`UPDATE guild_settings SET ${setClause}, updated_at = @updated_at WHERE guild_id = @guild_id`);
  stmt.run({ ...fields, guild_id: guildId, updated_at: Date.now() });
  return getGuildSettings(guildId);
}

// ---------------------------------------------------------------------------
// rules_config
// ---------------------------------------------------------------------------
const DEFAULT_RULES_STMT = db.prepare(`
  INSERT OR IGNORE INTO rules_config (guild_id, updated_at) VALUES (?, ?)
`);

function getRulesConfig(guildId) {
  DEFAULT_RULES_STMT.run(guildId, Date.now());
  return db.prepare('SELECT * FROM rules_config WHERE guild_id = ?').get(guildId);
}

const ALLOWED_RULES_FIELDS = ['channel_id', 'message_id', 'role_id', 'title', 'description', 'button_label'];

function updateRulesConfig(guildId, fields) {
  getRulesConfig(guildId);
  const keys = Object.keys(fields).filter((k) => ALLOWED_RULES_FIELDS.includes(k));
  if (keys.length === 0) return getRulesConfig(guildId);
  const setClause = keys.map((k) => `${k} = @${k}`).join(', ');
  const stmt = db.prepare(`UPDATE rules_config SET ${setClause}, updated_at = @updated_at WHERE guild_id = @guild_id`);
  stmt.run({ ...fields, guild_id: guildId, updated_at: Date.now() });
  return getRulesConfig(guildId);
}

// ---------------------------------------------------------------------------
// audit_log
// ---------------------------------------------------------------------------
const INSERT_AUDIT_STMT = db.prepare(`
  INSERT INTO audit_log (guild_id, type, user_id, user_tag, moderator_id, moderator_tag, reason, extra, created_at)
  VALUES (@guild_id, @type, @user_id, @user_tag, @moderator_id, @moderator_tag, @reason, @extra, @created_at)
`);

function addAuditLog(entry) {
  INSERT_AUDIT_STMT.run({
    guild_id: entry.guildId,
    type: entry.type,
    user_id: entry.userId || null,
    user_tag: entry.userTag || null,
    moderator_id: entry.moderatorId || null,
    moderator_tag: entry.moderatorTag || null,
    reason: entry.reason || null,
    extra: entry.extra ? JSON.stringify(entry.extra) : null,
    created_at: Date.now(),
  });
}

function getAuditLog(guildId, { limit = 50, offset = 0, type = null } = {}) {
  let rows;
  if (type) {
    rows = db.prepare(
      'SELECT * FROM audit_log WHERE guild_id = ? AND type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(guildId, type, limit, offset);
  } else {
    rows = db.prepare(
      'SELECT * FROM audit_log WHERE guild_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(guildId, limit, offset);
  }
  return rows.map((r) => ({ ...r, extra: r.extra ? JSON.parse(r.extra) : null }));
}

function countAuditLog(guildId, type = null) {
  if (type) {
    return db.prepare('SELECT COUNT(*) AS c FROM audit_log WHERE guild_id = ? AND type = ?').get(guildId, type).c;
  }
  return db.prepare('SELECT COUNT(*) AS c FROM audit_log WHERE guild_id = ?').get(guildId).c;
}

// ---------------------------------------------------------------------------
// stat_channels
// ---------------------------------------------------------------------------
function listStatChannels(guildId) {
  return db.prepare('SELECT * FROM stat_channels WHERE guild_id = ? ORDER BY id ASC').all(guildId);
}

function listAllStatChannels() {
  return db.prepare('SELECT * FROM stat_channels').all();
}

function addStatChannel({ guildId, channelId, channelType, metric, template }) {
  db.prepare(`
    INSERT INTO stat_channels (guild_id, channel_id, channel_type, metric, template, last_updated)
    VALUES (@guild_id, @channel_id, @channel_type, @metric, @template, @last_updated)
    ON CONFLICT(channel_id) DO UPDATE SET
      channel_type = excluded.channel_type,
      metric = excluded.metric,
      template = excluded.template
  `).run({
    guild_id: guildId,
    channel_id: channelId,
    channel_type: channelType || 'voice',
    metric: metric || 'members',
    template: template || '👥 Členové: {count}',
    last_updated: null,
  });
}

function removeStatChannel(channelId) {
  db.prepare('DELETE FROM stat_channels WHERE channel_id = ?').run(channelId);
}

function touchStatChannel(channelId) {
  db.prepare('UPDATE stat_channels SET last_updated = ? WHERE channel_id = ?').run(Date.now(), channelId);
}

module.exports = {
  raw: db,
  getGuildSettings,
  updateGuildSettings,
  getRulesConfig,
  updateRulesConfig,
  addAuditLog,
  getAuditLog,
  countAuditLog,
  listStatChannels,
  listAllStatChannels,
  addStatChannel,
  removeStatChannel,
  touchStatChannel,
};
