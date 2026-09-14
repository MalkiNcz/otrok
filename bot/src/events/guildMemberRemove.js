const { AuditLogEvent } = require('discord.js');
const { db, placeholders } = require('@otrok/shared');
const { logAction } = require('../utils/audit');

/** Looks for a very recent MemberKick audit-log entry targeting this user. */
async function findKickEntry(guild, userId) {
  try {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 5 });
    const entry = logs.entries.find((e) => e.target?.id === userId && Date.now() - e.createdTimestamp < 10_000);
    return entry || null;
  } catch {
    return null; // chybí oprávnění "Zobrazit audit log" nebo jiná chyba
  }
}

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const { guild, user } = member;

    const kickEntry = await findKickEntry(guild, user.id);

    if (kickEntry) {
      // Pokud kick provedl sám bot (přes /kick nebo dashboard), už byl
      // zalogován přímo na místě se skutečným moderátorem - nezdvojujeme.
      if (kickEntry.executor?.id !== client.user.id) {
        await logAction(client, {
          guildId: guild.id,
          type: 'kick',
          user,
          moderator: kickEntry.executor,
          reason: kickEntry.reason,
        });
      }
    } else {
      await logAction(client, { guildId: guild.id, type: 'leave', user });
    }

    const settings = db.getGuildSettings(guild.id);
    if (!settings.leave_enabled || !settings.leave_channel_id) return;

    const channel = await guild.channels.fetch(settings.leave_channel_id).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const text = placeholders.applyPlaceholders(settings.leave_message, {
      username: user.username,
      tag: user.tag,
      server: guild.name,
      membercount: guild.memberCount,
    });

    await channel.send({ content: text }).catch(() => null);
  },
};
