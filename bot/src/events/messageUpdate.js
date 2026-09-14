const { logAction } = require('../utils/audit');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return; // ignoruj embed/pin-only updaty

    await logAction(client, {
      guildId: newMessage.guild.id,
      type: 'message_edit',
      user: newMessage.author,
      extra: {
        Kanál: newMessage.channel ? `#${newMessage.channel.name}` : 'neznámý',
        Před: oldMessage.content ? oldMessage.content.slice(0, 500) : '*(nedostupné)*',
        Po: newMessage.content ? newMessage.content.slice(0, 500) : '*(nedostupné)*',
        Odkaz: newMessage.url,
      },
    });
  },
};
