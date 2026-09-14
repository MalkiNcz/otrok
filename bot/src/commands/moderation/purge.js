const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { logAction } = require('../../utils/audit');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Smaže zadaný počet zpráv v aktuálním kanálu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt.setName('pocet').setDescription('Počet zpráv ke smazání (1-100)').setMinValue(1).setMaxValue(100).setRequired(true)
    )
    .addUserOption((opt) => opt.setName('uzivatel').setDescription('Smazat jen zprávy od tohoto uživatele').setRequired(false)),

  async execute(interaction) {
    if (interaction.channel.type !== ChannelType.GuildText && interaction.channel.type !== ChannelType.GuildAnnouncement) {
      return interaction.reply({ embeds: [errorEmbed('Nelze provést', 'Tento příkaz lze použít jen v textových kanálech.')], ephemeral: true });
    }

    const amount = interaction.options.getInteger('pocet', true);
    const filterUser = interaction.options.getUser('uzivatel');

    await interaction.deferReply({ ephemeral: true });

    let messages = await interaction.channel.messages.fetch({ limit: filterUser ? 100 : amount });
    if (filterUser) {
      messages = messages.filter((m) => m.author.id === filterUser.id).first(amount);
    }

    const deleted = await interaction.channel.bulkDelete(messages, true).catch(() => null);
    if (!deleted) {
      return interaction.editReply({
        embeds: [errorEmbed('Chyba', 'Zprávy se nepodařilo smazat (mohou být starší než 14 dní).')],
      });
    }

    await logAction(interaction.client, {
      guildId: interaction.guild.id,
      type: 'purge',
      moderator: interaction.user,
      extra: { Kanál: `#${interaction.channel.name}`, 'Smazáno zpráv': deleted.size, Filtr: filterUser ? filterUser.tag : 'žádný' },
    });

    return interaction.editReply({ embeds: [successEmbed('Zprávy smazány', `Smazáno **${deleted.size}** zpráv v ${interaction.channel}.`)] });
  },
};
