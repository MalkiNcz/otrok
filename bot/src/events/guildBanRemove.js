const { AuditLogEvent } = require('discord.js');
const { logAction } = require('../utils/audit');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban, client) {
    const { guild, user } = ban;
    let moderator = null;
    let reason = null;

    try {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit: 5 });
      const entry = logs.entries.find((e) => e.target?.id === user.id && Date.now() - e.createdTimestamp < 10_000);
      if (entry) {
        if (entry.executor?.id === client.user.id) return;
        moderator = entry.executor;
        reason = entry.reason;
      }
    } catch {
      // chybí oprávnění "Zobrazit audit log"
    }

    await logAction(client, { guildId: guild.id, type: 'unban', user, moderator, reason });
  },
};
