const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { config } = require('@otrok/shared');

if (!config.token || !config.clientId) {
  console.error('Chybí DISCORD_TOKEN nebo DISCORD_CLIENT_ID v .env souboru.');
  process.exit(1);
}

function collectCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commands = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name.endsWith('.js')) {
        const command = require(fullPath);
        if (command?.data) commands.push(command.data.toJSON());
      }
    }
  };

  walk(commandsPath);
  return commands;
}

async function main() {
  const commands = collectCommands();
  const rest = new REST().setToken(config.token);

  console.log(`Registruji ${commands.length} slash příkazů...`);

  if (config.devGuildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.devGuildId), { body: commands });
    console.log(`Hotovo - příkazy nasazeny okamžitě jen na vývojový server ${config.devGuildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log('Hotovo - příkazy nasazeny globálně (propagace na všechny servery může trvat až ~1 hodinu).');
  }
}

main().catch((err) => {
  console.error('Registrace příkazů selhala:', err);
  process.exit(1);
});
