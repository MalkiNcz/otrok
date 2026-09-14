const path = require('path');
const dotenv = require('dotenv');

// Root .env is shared by both the bot and the dashboard process.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

function list(value) {
  return (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  devGuildId: process.env.DEV_GUILD_ID || null,
  ownerIds: list(process.env.BOT_OWNER_IDS),
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(__dirname, '..', '..', process.env.DATABASE_PATH)
    : path.resolve(__dirname, '..', '..', 'data', 'otrok.db'),
  dashboard: {
    port: parseInt(process.env.DASHBOARD_PORT || '3000', 10),
    baseUrl: process.env.DASHBOARD_BASE_URL || 'http://localhost:3000',
    sessionSecret: process.env.SESSION_SECRET || 'change-me-in-dot-env',
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};
