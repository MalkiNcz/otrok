const express = require('express');
const { config } = require('@otrok/shared');
const discordApi = require('../discordApi');

const router = express.Router();

router.get('/login', (req, res) => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${config.dashboard.baseUrl}/auth/callback`,
    response_type: 'code',
    scope: 'identify guilds',
    prompt: 'none',
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.status(400).render('error', { title: 'Přihlášení zrušeno', message: 'Discord vrátil chybu nebo bylo přihlášení zrušeno.' });
  }

  try {
    const token = await discordApi.exchangeCodeForToken(code);
    const user = await discordApi.getCurrentUser(token.access_token);

    req.session.accessToken = token.access_token;
    req.session.user = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`,
    };

    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).render('error', { title: 'Chyba přihlášení', message: 'Nepodařilo se dokončit přihlášení přes Discord.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
