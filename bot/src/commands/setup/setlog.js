const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { db } = require('@otrok/shared');
const { successEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlog')
    .setDescription('Nastaví kanál pro audit log (join, leave, moderace, voice, zprávy)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((opt) =>
      opt.setName('kanal').setDescription('Kanál pro audit log').addChannelTypes(ChannelType.GuildText).setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('kanal', true);
    db.updateGuildSettings(interaction.guild.id, { log_channel_id: channel.id });

    return interaction.reply({
      embeds: [
        successEmbed(
          'Audit log nastaven',
          `Události se budou logovat do ${channel}.\nJednotlivé typy událostí (join/leave/ban/kick/mute/voice/zprávy) lze doladit ve webovém dashboardu.`
        ),
      ],
      ephemeral: true,
    });
  },
};
