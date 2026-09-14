const fs = require('fs');
const path = require('path');

/**
 * Recursively loads every command module under bot/src/commands and
 * attaches them to client.commands (Collection<name, command>).
 */
function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commands = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const command = require(fullPath);
        if (!command?.data || !command?.execute) {
          console.warn(`[commands] Přeskakuji ${fullPath} - chybí "data" nebo "execute".`);
          continue;
        }
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      }
    }
  };

  walk(commandsPath);
  return commands;
}

module.exports = { loadCommands };
