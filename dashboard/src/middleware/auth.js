const { config } = require('@otrok/shared');
const discordApi = require('../discordApi');

function ensureAuth(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
  next();
}

/**
 * Loads (and short-term caches in the session) the list of guilds this user
 * can manage, then verifies they may access :guildId - either MANAGE_GUILD /
 * owner on that guild, or listed as a bot owner via BOT_OWNER_IDS.
 */
async function ensureGuildAccess(req, res, next) {
  const { guildId } = req.params;
  const isBotOwner = config.ownerIds.includes(req.session.user.id);

  try {
    const now = Date.now();
    if (!req.session.manageableGuilds || now - (req.session.guildsFetchedAt || 0) > 5 * 60 * 1000) {
      const guilds = await discordApi.getUserGuilds(req.session.accessToken);
      req.session.manageableGuilds = discordApi.filterManageableGuilds(guilds);
      req.session.guildsFetchedAt = now;
    }

    const manageable = req.session.manageableGuilds.find((g) => g.id === guildId);
    if (!manageable && !isBotOwner) {
      return res.status(403).render('error', { title: 'Přístup odepřen', message: 'Nemáš oprávnění "Spravovat server" na tomto serveru.' });
    }

    const botGuild = await discordApi.getGuild(guildId).catch(() => null);
    if (!botGuild) {
      return res.status(404).render('error', {
        title: 'Bot není na serveru',
        message: 'Otrok bot není členem tohoto serveru, nebo je špatně nastavený DISCORD_TOKEN.',
      });
    }

    req.guild = botGuild;
    next();
  } catch (err) {
    console.error('ensureGuildAccess error:', err);
    return res.status(500).render('error', { title: 'Chyba', message: 'Nepodařilo se ověřit přístup k serveru.' });
  }
}

module.exports = { ensureAuth, ensureGuildAccess };
