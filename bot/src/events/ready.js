const { ActivityType } = require('discord.js');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Přihlášen jako ${client.user.tag} (${client.guilds.cache.size} serverů).`);
    client.user.setActivity('/dashboard | /help', { type: ActivityType.Watching });
  },
};
