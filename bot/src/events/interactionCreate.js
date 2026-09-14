const { db } = require('@otrok/shared');
const { errorEmbed, successEmbed } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`Chyba v příkazu ${interaction.commandName}:`, err);
        const payload = {
          embeds: [errorEmbed('Došlo k chybě', 'Při provádění příkazu nastala neočekávaná chyba.')],
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => null);
        } else {
          await interaction.reply(payload).catch(() => null);
        }
      }
      return;
    }

    if (interaction.isButton() && interaction.customId === 'rules_agree') {
      const rulesConfig = db.getRulesConfig(interaction.guild.id);
      if (!rulesConfig.role_id) {
        return interaction.reply({ embeds: [errorEmbed('Nenastaveno', 'Role pro pravidla není nastavena.')], ephemeral: true });
      }

      const role = await interaction.guild.roles.fetch(rulesConfig.role_id).catch(() => null);
      if (!role) {
        return interaction.reply({ embeds: [errorEmbed('Chyba', 'Nastavená role už na serveru neexistuje.')], ephemeral: true });
      }
      if (interaction.member.roles.cache.has(role.id)) {
        return interaction.reply({ embeds: [successEmbed('Už máš přístup', 'Tuto roli už máš přiřazenou.')], ephemeral: true });
      }

      await interaction.member.roles.add(role).catch(() => null);
      return interaction.reply({ embeds: [successEmbed('Vítej!', `Role ${role} ti byla přidělena.`)], ephemeral: true });
    }
  },
};
