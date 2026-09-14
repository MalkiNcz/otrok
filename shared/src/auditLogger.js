const db = require('./database');

const TYPE_META = {
  join: { label: '📥 Člen připojen', color: 0x57f287, settingKey: 'log_join' },
  leave: { label: '📤 Člen odešel', color: 0x2b2d31, settingKey: 'log_leave' },
  ban: { label: '🔨 Ban', color: 0xed4245, settingKey: 'log_ban' },
  unban: { label: '🔓 Unban', color: 0x57f287, settingKey: 'log_ban' },
  kick: { label: '👢 Kick', color: 0xfee75c, settingKey: 'log_kick' },
  mute: { label: '🔇 Mute (timeout)', color: 0xfee75c, settingKey: 'log_mute' },
  unmute: { label: '🔊 Unmute', color: 0x57f287, settingKey: 'log_mute' },
  voice_connect: { label: '🎙️ Připojení do voice', color: 0x57f287, settingKey: 'log_voice' },
  voice_disconnect: { label: '🔌 Odpojení z voice', color: 0x2b2d31, settingKey: 'log_voice' },
  voice_move: { label: '↔️ Přesun ve voice', color: 0x5865f2, settingKey: 'log_voice' },
  message_delete: { label: '🗑️ Zpráva smazána', color: 0xed4245, settingKey: 'log_message_delete' },
  message_edit: { label: '✏️ Zpráva upravena', color: 0xfee75c, settingKey: 'log_message_edit' },
  purge: { label: '🧹 Hromadné smazání zpráv', color: 0xfee75c, settingKey: 'log_message_delete' },
};

function buildEmbedPayload(meta, entry) {
  const fields = [];
  if (entry.user) {
    fields.push({ name: 'Uživatel', value: `${entry.user.tag ?? entry.user.username} (\`${entry.user.id}\`)` });
  }
  if (entry.moderator) {
    fields.push({ name: 'Moderátor', value: `${entry.moderator.tag ?? entry.moderator.username} (\`${entry.moderator.id}\`)` });
  }
  if (entry.reason) {
    fields.push({ name: 'Důvod', value: entry.reason });
  }
  if (entry.extra) {
    for (const [key, value] of Object.entries(entry.extra)) {
      if (value === undefined || value === null || value === '') continue;
      fields.push({ name: key, value: String(value).slice(0, 1024) });
    }
  }
  const embed = { title: meta.label, color: meta.color, timestamp: new Date().toISOString(), fields };
  if (entry.user?.avatarURL) embed.thumbnail = { url: entry.user.avatarURL };
  return { embeds: [embed] };
}

/**
 * Builds a logAction(entry) function backed by a transport-specific `sendEmbed`
 * callback (discord.js client.send vs. plain REST), so the DB write + settings
 * gating + embed-building logic lives in one place for both the bot and dashboard.
 *
 * entry: { guildId, type, user, moderator, reason, extra }
 *   user / moderator: { id, tag?, username?, avatarURL? }
 */
function createAuditLogger(sendEmbed) {
  return async function logAction(entry) {
    const meta = TYPE_META[entry.type] || { label: entry.type, color: 0x2b2d31, settingKey: null };

    db.addAuditLog({
      guildId: entry.guildId,
      type: entry.type,
      userId: entry.user?.id,
      userTag: entry.user?.tag ?? entry.user?.username,
      moderatorId: entry.moderator?.id,
      moderatorTag: entry.moderator?.tag ?? entry.moderator?.username,
      reason: entry.reason,
      extra: entry.extra,
    });

    const settings = db.getGuildSettings(entry.guildId);
    if (!settings.log_channel_id) return;
    if (meta.settingKey && !settings[meta.settingKey]) return;

    const payload = buildEmbedPayload(meta, entry);
    await sendEmbed(settings.log_channel_id, payload).catch(() => null);
  };
}

module.exports = { createAuditLogger, TYPE_META };
