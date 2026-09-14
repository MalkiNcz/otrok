const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { logAction } = require('../../utils/audit');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Vykopne uživatele ze serveru')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((opt) => opt.setName('uzivatel').setDescription('Uživatel k vykopnutí').setRequired(true))
    .addStringOption((opt) => opt.setName('duvod').setDescription('Důvod kicku').setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('uzivatel', true);
    const reason = interaction.options.getString('duvod') || 'Nebyl uveden žádný důvod.';

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Nelze provést', 'Nemůžeš vykopnout sám sebe.')], ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Nenalezeno', 'Tento uživatel není členem serveru.')], ephemeral: true });
    }
    if (!member.kickable) {
      return interaction.reply({
        embeds: [errorEmbed('Nedostatek oprávnění', 'Tohoto uživatele nemohu vykopnout (vyšší nebo stejná role, případně vlastník serveru).')],
        ephemeral: true,
      });
    }
    if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Nedostatek oprávnění', 'Tento uživatel má stejnou nebo vyšší roli než ty.')], ephemeral: true });
    }

    await member.kick(`${interaction.user.tag}: ${reason}`);

    await logAction(interaction.client, {
      guildId: interaction.guild.id,
      type: 'kick',
      user: targetUser,
      moderator: interaction.user,
      reason,
    });

    return interaction.reply({
      embeds: [successEmbed('Uživatel vykopnut', `**${targetUser.tag}** byl vykopnut ze serveru.\n**Důvod:** ${reason}`)],
    });
  },
};
