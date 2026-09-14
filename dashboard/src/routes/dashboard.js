const express = require('express');
const { config } = require('@otrok/shared');
const discordApi = require('../discordApi');
const { ensureAuth, ensureGuildAccess } = require('../middleware/auth');

const router = express.Router();

router.use(ensureAuth);

router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (!req.session.manageableGuilds || now - (req.session.guildsFetchedAt || 0) > 5 * 60 * 1000) {
      const guilds = await discordApi.getUserGuilds(req.session.accessToken);
      req.session.manageableGuilds = discordApi.filterManageableGuilds(guilds);
      req.session.guildsFetchedAt = now;
    }

    let botGuildIds = new Set();
    try {
      const botGuilds = await discordApi.getBotGuilds();
      botGuildIds = new Set(botGuilds.map((g) => g.id));
    } catch (err) {
      console.error('Nepodařilo se načíst servery bota:', err.message);
    }

    const guilds = req.session.manageableGuilds.map((g) => ({
      ...g,
      botPresent: botGuildIds.has(g.id),
      iconUrl: g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
        : null,
    }));

    res.render('guilds', { title: 'Tvé servery', guilds, inviteUrl: inviteUrl() });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { title: 'Chyba', message: 'Nepodařilo se načíst seznam serverů.' });
  }
});

function inviteUrl() {
  // Kick, Ban, Manage Channels, View Audit Log, View Channels, Send Messages,
  // Manage Messages, Embed Links, Read Message History, Manage Roles, Moderate Members (timeout)
  const permissions = '1099780156566';
  const params = new URLSearchParams({
    client_id: config.clientId,
    permissions,
    scope: 'bot applications.commands',
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

router.use('/:guildId', ensureGuildAccess, require('./guild'));

module.exports = router;
