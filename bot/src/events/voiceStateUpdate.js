const { logAction } = require('../utils/audit');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const user = newState.member?.user ?? oldState.member?.user;
    if (!user) return;
    const guildId = newState.guild.id;

    if (!oldState.channelId && newState.channelId) {
      await logAction(client, { guildId, type: 'voice_connect', user, extra: { Kanál: newState.channel?.name } });
    } else if (oldState.channelId && !newState.channelId) {
      await logAction(client, { guildId, type: 'voice_disconnect', user, extra: { Kanál: oldState.channel?.name } });
    } else if (oldState.channelId !== newState.channelId) {
      await logAction(client, {
        guildId,
        type: 'voice_move',
        user,
        extra: { Z: oldState.channel?.name, Do: newState.channel?.name },
      });
    }
  },
};
