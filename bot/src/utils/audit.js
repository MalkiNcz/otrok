const { auditLogger } = require('@otrok/shared');

/**
 * Logs a moderation/audit event: writes to the shared DB and, if enabled,
 * posts an embed to the guild's configured log channel via the live client.
 */
async function logAction(client, entry) {
  const logger = auditLogger.createAuditLogger(async (channelId, payload) => {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel && channel.isTextBased()) await channel.send(payload);
  });
  return logger(entry);
}

module.exports = { logAction, TYPE_META: auditLogger.TYPE_META };
