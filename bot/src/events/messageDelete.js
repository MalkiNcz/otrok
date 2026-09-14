const { logAction } = require('../utils/audit');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    await logAction(client, {
      guildId: message.guild.id,
      type: 'message_delete',
      user: message.author,
      extra: {
        Kanál: message.channel ? `#${message.channel.name}` : 'neznámý',
        Obsah: message.content ? message.content.slice(0, 1000) : '*(obsah nedostupný - zpráva nebyla v cache)*',
      },
    });
  },
};
