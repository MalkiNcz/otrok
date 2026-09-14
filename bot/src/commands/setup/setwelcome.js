const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { db } = require('@otrok/shared');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Nastaví uvítací zprávy pro nové členy')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('zapnout')
        .setDescription('Zapne uvítací zprávy')
        .addChannelOption((opt) =>
          opt.setName('kanal').setDescription('Kanál pro uvítací zprávy').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('zprava')
            .setDescription('Text zprávy. Placeholdery: {user} {username} {server} {membercount}')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName('vypnout').setDescription('Vypne uvítací zprávy')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'vypnout') {
      db.updateGuildSettings(interaction.guild.id, { welcome_enabled: 0 });
      return interaction.reply({ embeds: [successEmbed('Uvítací zprávy vypnuty')], ephemeral: true });
    }

    const channel = interaction.options.getChannel('kanal', true);
    const message = interaction.options.getString('zprava');

    const fields = { welcome_enabled: 1, welcome_channel_id: channel.id };
    if (message) fields.welcome_message = message;
    db.updateGuildSettings(interaction.guild.id, fields);

    return interaction.reply({
      embeds: [successEmbed('Uvítací zprávy zapnuty', `Nové zprávy se budou posílat do ${channel}.`)],
      ephemeral: true,
    });
  },
};
