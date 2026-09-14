const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { logAction } = require('../../utils/audit');
const { parseDuration, formatDuration } = require('../../utils/duration');

const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000; // Discord's hard limit

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Umlčí (timeout) uživatele na danou dobu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((opt) => opt.setName('uzivatel').setDescription('Uživatel k umlčení').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('doba').setDescription('Délka mute, např. 10m, 1h, 1d (max 28d)').setRequired(true)
    )
    .addStringOption((opt) => opt.setName('duvod').setDescription('Důvod mute').setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('uzivatel', true);
    const durationInput = interaction.options.getString('doba', true);
    const reason = interaction.options.getString('duvod') || 'Nebyl uveden žádný důvod.';

    const durationMs = parseDuration(durationInput);
    if (!durationMs || durationMs <= 0) {
      return interaction.reply({
        embeds: [errorEmbed('Neplatná doba', 'Zadej dobu ve formátu např. `10m`, `2h`, `1d` (kombinace jsou možné, např. `1h30m`).')],
        ephemeral: true,
      });
    }
    if (durationMs > MAX_TIMEOUT_MS) {
      return interaction.reply({ embeds: [errorEmbed('Neplatná doba', 'Maximální délka mute je 28 dní.')], ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ embeds: [errorEmbed('Nenalezeno', 'Tento uživatel není členem serveru.')], ephemeral: true });
    }
    if (!member.moderatable) {
      return interaction.reply({
        embeds: [errorEmbed('Nedostatek oprávnění', 'Tohoto uživatele nemohu umlčet (vyšší nebo stejná role, případně vlastník serveru).')],
        ephemeral: true,
      });
    }

    await member.timeout(durationMs, `${interaction.user.tag}: ${reason}`);

    await logAction(interaction.client, {
      guildId: interaction.guild.id,
      type: 'mute',
      user: targetUser,
      moderator: interaction.user,
      reason,
      extra: { Doba: formatDuration(durationMs) },
    });

    return interaction.reply({
      embeds: [successEmbed('Uživatel umlčen', `**${targetUser.tag}** byl umlčen na **${formatDuration(durationMs)}**.\n**Důvod:** ${reason}`)],
    });
  },
};
