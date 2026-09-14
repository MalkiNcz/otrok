const { auditLogger } = require('@otrok/shared');
const discordApi = require('./discordApi');

const logAction = auditLogger.createAuditLogger((channelId, payload) => discordApi.sendMessage(channelId, payload));

module.exports = { logAction };
