const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { logAction } = require('../../utils/audit');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Zruší umlčení (timeout) uživatele')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('uzivatel').setDescription('Uživatel k odmlčení').setRequired(true))
    .addStringOption((opt) => opt.setName('duvod').setDescription('Důvod').setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('uzivatel', true);
    const reason = interaction.options.getString('duvod') || 'Nebyl uveden žádný důvod.';

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Nenalezeno', 'Tento uživatel není členem serveru.')], ephemeral: true });
    }
    if (!member.communicationDisabledUntil) {
      return interaction.reply({ embeds: [errorEmbed('Nelze provést', 'Tento uživatel aktuálně není umlčen.')], ephemeral: true });
    }

    await member.timeout(null, `${interaction.user.tag}: ${reason}`);

    await logAction(interaction.client, {
      guildId: interaction.guild.id,
      type: 'unmute',
      user: targetUser,
      moderator: interaction.user,
      reason,
    });

    return interaction.reply({ embeds: [successEmbed('Umlčení zrušeno', `**${targetUser.tag}** už není umlčen.`)] });
  },
};
