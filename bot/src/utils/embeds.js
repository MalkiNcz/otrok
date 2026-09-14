const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  neutral: 0x2b2d31,
};

function baseEmbed(color = COLORS.primary) {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function successEmbed(title, description) {
  return baseEmbed(COLORS.success).setTitle(`✅ ${title}`).setDescription(description || null);
}

function errorEmbed(title, description) {
  return baseEmbed(COLORS.danger).setTitle(`❌ ${title}`).setDescription(description || null);
}

function infoEmbed(title, description) {
  return baseEmbed(COLORS.primary).setTitle(title).setDescription(description || null);
}

module.exports = { COLORS, baseEmbed, successEmbed, errorEmbed, infoEmbed };
