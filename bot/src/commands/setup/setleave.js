const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { db } = require('@otrok/shared');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setleave')
    .setDescription('Nastaví zprávy o odchodu členů')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('zapnout')
        .setDescription('Zapne zprávy o odchodu')
        .addChannelOption((opt) =>
          opt.setName('kanal').setDescription('Kanál pro zprávy o odchodu').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('zprava')
            .setDescription('Text zprávy. Placeholdery: {username} {server} {membercount}')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName('vypnout').setDescription('Vypne zprávy o odchodu')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'vypnout') {
      db.updateGuildSettings(interaction.guild.id, { leave_enabled: 0 });
      return interaction.reply({ embeds: [successEmbed('Zprávy o odchodu vypnuty')], ephemeral: true });
    }

    const channel = interaction.options.getChannel('kanal', true);
    const message = interaction.options.getString('zprava');

    const fields = { leave_enabled: 1, leave_channel_id: channel.id };
    if (message) fields.leave_message = message;
    db.updateGuildSettings(interaction.guild.id, fields);

    return interaction.reply({
      embeds: [successEmbed('Zprávy o odchodu zapnuty', `Zprávy se budou posílat do ${channel}.`)],
      ephemeral: true,
    });
  },
};
