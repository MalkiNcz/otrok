const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { logAction } = require('../../utils/audit');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Zabanuje uživatele ze serveru')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((opt) => opt.setName('uzivatel').setDescription('Uživatel k zabanování').setRequired(true))
    .addStringOption((opt) => opt.setName('duvod').setDescription('Důvod banu').setRequired(false))
    .addIntegerOption((opt) =>
      opt
        .setName('smazat_zpravy_dny')
        .setDescription('Kolik dní zpráv smazat (0-7, výchozí 0)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('uzivatel', true);
    const reason = interaction.options.getString('duvod') || 'Nebyl uveden žádný důvod.';
    const deleteDays = interaction.options.getInteger('smazat_zpravy_dny') || 0;

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Nelze provést', 'Nemůžeš zabanovat sám sebe.')], ephemeral: true });
    }
    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Nelze provést', 'Nemůžeš zabanovat bota samotného.')], ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (member) {
      if (!member.bannable) {
        return interaction.reply({
          embeds: [errorEmbed('Nedostatek oprávnění', 'Tohoto uživatele nemohu zabanovat (vyšší nebo stejná role, případně vlastník serveru).')],
          ephemeral: true,
        });
      }
      if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.guild.ownerId !== interaction.user.id) {
        return interaction.reply({
          embeds: [errorEmbed('Nedostatek oprávnění', 'Tento uživatel má stejnou nebo vyšší roli než ty.')],
          ephemeral: true,
        });
      }
    }

    await interaction.guild.bans.create(targetUser.id, { deleteMessageSeconds: deleteDays * 86400, reason: `${interaction.user.tag}: ${reason}` });

    // Zalogováno přímo zde, protože Discord by jinak ve svém audit logu
    // označil jako "executora" bota (volání proběhlo přes jeho token), ne
    // skutečného moderátora. Event guildBanAdd tento zápis kvůli tomu přeskočí.
    await logAction(interaction.client, {
      guildId: interaction.guild.id,
      type: 'ban',
      user: targetUser,
      moderator: interaction.user,
      reason,
    });

    return interaction.reply({
      embeds: [successEmbed('Uživatel zabanován', `**${targetUser.tag}** byl zabanován.\n**Důvod:** ${reason}`)],
    });
  },
};
