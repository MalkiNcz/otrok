const { EmbedBuilder } = require('discord.js');
const { db, placeholders } = require('@otrok/shared');
const { logAction } = require('../utils/audit');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const { guild, user } = member;

    await logAction(client, { guildId: guild.id, type: 'join', user });

    const settings = db.getGuildSettings(guild.id);
    if (!settings.welcome_enabled || !settings.welcome_channel_id) return;

    const channel = await guild.channels.fetch(settings.welcome_channel_id).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const text = placeholders.applyPlaceholders(settings.welcome_message, {
      user: `<@${user.id}>`,
      username: user.username,
      tag: user.tag,
      server: guild.name,
      membercount: guild.memberCount,
    });

    if (settings.welcome_use_embed) {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setDescription(text)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => null);
    } else {
      await channel.send({ content: text }).catch(() => null);
    }
  },
};
