const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { config } = require('@otrok/shared');
const { loadCommands } = require('./handlers/loadCommands');
const { loadEvents } = require('./handlers/loadEvents');
const { startStatChannelScheduler } = require('./utils/statChannels');

if (!config.token || !config.clientId) {
  console.error('Chybí DISCORD_TOKEN nebo DISCORD_CLIENT_ID v .env souboru. Zkopíruj .env.example a doplň hodnoty.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // privileged - musí být zapnuto v Developer Portalu
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged - musí být zapnuto v Developer Portalu
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();
loadCommands(client);
loadEvents(client);

client.once('ready', () => {
  startStatChannelScheduler(client);
});

client.login(config.token).catch((err) => {
  console.error('Přihlášení bota selhalo:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});
