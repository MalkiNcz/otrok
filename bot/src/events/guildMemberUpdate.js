const { AuditLogEvent } = require('discord.js');
const { logAction } = require('../utils/audit');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;
    if (oldTimeout === newTimeout) return;

    const isNowMuted = Boolean(newTimeout && newTimeout > Date.now());
    const type = isNowMuted ? 'mute' : 'unmute';

    let moderator = null;
    let reason = null;
    try {
      const logs = await newMember.guild.fetchAuditLogs({ type: AuditLogEvent.MemberUpdate, limit: 5 });
      const entry = logs.entries.find((e) => e.target?.id === newMember.id && Date.now() - e.createdTimestamp < 10_000);
      if (entry) {
        if (entry.executor?.id === client.user.id) return; // už zalogováno přímo (/mute, /unmute nebo dashboard)
        moderator = entry.executor;
        reason = entry.reason;
      }
    } catch {
      // chybí oprávnění "Zobrazit audit log"
    }

    await logAction(client, {
      guildId: newMember.guild.id,
      type,
      user: newMember.user,
      moderator,
      reason,
      extra: isNowMuted ? { Do: new Date(newTimeout).toLocaleString('cs-CZ') } : undefined,
    });
  },
};
