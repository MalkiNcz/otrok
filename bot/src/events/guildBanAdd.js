const { AuditLogEvent } = require('discord.js');
const { logAction } = require('../utils/audit');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban, client) {
    const { guild, user } = ban;
    let moderator = null;
    let reason = ban.reason || null;

    try {
      const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 });
      const entry = logs.entries.find((e) => e.target?.id === user.id && Date.now() - e.createdTimestamp < 10_000);
      if (entry) {
        // Pokud akci provedl sám bot (přes /ban nebo dashboard), už byla
        // zalogována přímo na místě se skutečným moderátorem - nezdvojujeme.
        if (entry.executor?.id === client.user.id) return;
        moderator = entry.executor;
        reason = entry.reason || reason;
      }
    } catch {
      // chybí oprávnění "Zobrazit audit log" - zalogujeme bez moderátora
    }

    await logAction(client, { guildId: guild.id, type: 'ban', user, moderator, reason });
  },
};
