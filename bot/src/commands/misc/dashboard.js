const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { config } = require('@otrok/shared');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Zobrazí odkaz na webový dashboard pro tento server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const url = `${config.dashboard.baseUrl}/dashboard/${interaction.guild.id}`;
    return interaction.reply({
      embeds: [infoEmbed('🌐 Webový dashboard', `Spravuj tento server pohodlně z prohlížeče:\n${url}`)],
      ephemeral: true,
    });
  },
};
