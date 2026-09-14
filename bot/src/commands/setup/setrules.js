const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db } = require('@otrok/shared');
const { successEmbed, errorEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrules')
    .setDescription('Zveřejní zprávu s pravidly - kliknutím na tlačítko člen získá roli')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt.setName('kanal').setDescription('Kanál, kam zprávu zveřejnit').addChannelTypes(ChannelType.GuildText).setRequired(true)
    )
    .addRoleOption((opt) => opt.setName('role').setDescription('Role, kterou člen získá po odsouhlasení').setRequired(true))
    .addStringOption((opt) => opt.setName('nadpis').setDescription('Nadpis zprávy').setRequired(false))
    .addStringOption((opt) => opt.setName('text').setDescription('Text pravidel').setRequired(false))
    .addStringOption((opt) => opt.setName('tlacitko').setDescription('Text na tlačítku').setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('kanal', true);
    const role = interaction.options.getRole('role', true);
    const title = interaction.options.getString('nadpis') || 'Pravidla serveru';
    const description = interaction.options.getString('text') || 'Než budeš pokračovat, přečti si prosím pravidla a potvrď souhlas tlačítkem níže.';
    const buttonLabel = interaction.options.getString('tlacitko') || '✅ Souhlasím s pravidly';

    if (role.managed || role.id === interaction.guild.id) {
      return interaction.reply({ embeds: [errorEmbed('Neplatná role', 'Tuto roli nelze přiřazovat automaticky.')], ephemeral: true });
    }
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        embeds: [errorEmbed('Nedostatek oprávnění', 'Role bota musí být výše než role, kterou chceš přiřazovat.')],
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder().setColor(COLORS.primary).setTitle(title).setDescription(description);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rules_agree').setLabel(buttonLabel).setStyle(ButtonStyle.Success)
    );

    const message = await channel.send({ embeds: [embed], components: [row] });

    db.updateRulesConfig(interaction.guild.id, {
      channel_id: channel.id,
      message_id: message.id,
      role_id: role.id,
      title,
      description,
      button_label: buttonLabel,
    });

    return interaction.reply({
      embeds: [successEmbed('Zpráva s pravidly zveřejněna', `Zpráva byla odeslána do ${channel}. Klikem na tlačítko členové získají roli ${role}.`)],
      ephemeral: true,
    });
  },
};
