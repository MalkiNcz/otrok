const { SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Zobrazí přehled dostupných příkazů'),

  async execute(interaction) {
    const embed = infoEmbed('📖 Přehled příkazů', 'Otrok je multifunkční bot pro správu serveru.')
      .addFields(
        {
          name: '🛡️ Moderace',
          value:
            '`/ban` `/kick` `/mute` `/unmute` `/purge`\nVšechny podporují uvedení důvodu a zapisují se do audit logu.',
        },
        {
          name: '⚙️ Nastavení',
          value:
            '`/setwelcome` `/setleave` `/setlog` `/setrules` `/setstats`\nKompletně lze vše nastavit i přes `/dashboard`.',
        },
        {
          name: '🌐 Dashboard',
          value: '`/dashboard` - odkaz na webové rozhraní pro pohodlnou správu bez příkazů.',
        }
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
