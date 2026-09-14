const express = require('express');
const { db, duration, auditLogger } = require('@otrok/shared');
const discordApi = require('../discordApi');
const { logAction } = require('../logAction');
const { verifyCsrfToken } = require('../middleware/csrf');
const { setFlash } = require('../middleware/flash');

const router = express.Router({ mergeParams: true });

router.use((req, res, next) => (req.method === 'POST' ? verifyCsrfToken(req, res, next) : next()));

function textChannels(channels) {
  return channels.filter((c) => c.type === 0 || c.type === 5).sort((a, b) => a.position - b.position);
}

function voiceAndCategoryChannels(channels) {
  return channels.filter((c) => c.type === 2 || c.type === 4).sort((a, b) => a.position - b.position);
}

function actingModerator(req) {
  return { id: req.session.user.id, username: req.session.user.username };
}

async function resolveUser(userId) {
  const user = await discordApi.getUser(userId).catch(() => null);
  if (!user) return { id: userId, username: userId };
  const tag = user.discriminator && user.discriminator !== '0' ? `${user.username}#${user.discriminator}` : user.username;
  return { id: user.id, username: user.username, tag };
}

// ---------------------------------------------------------------------------
// Přehled
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const settings = db.getGuildSettings(req.guild.id);
  const recent = db.getAuditLog(req.guild.id, { limit: 8 });
  res.render('guild/overview', { title: req.guild.name, guild: req.guild, settings, recent });
});

// ---------------------------------------------------------------------------
// Uvítací zprávy
// ---------------------------------------------------------------------------
router.get('/welcome', async (req, res) => {
  const settings = db.getGuildSettings(req.guild.id);
  const channels = await discordApi.getGuildChannels(req.guild.id).catch(() => []);
  res.render('guild/welcome', { title: 'Uvítací zprávy', guild: req.guild, settings, channels: textChannels(channels) });
});

router.post('/welcome', (req, res) => {
  const fields = {
    welcome_enabled: req.body.enabled ? 1 : 0,
    welcome_channel_id: req.body.channelId || null,
    welcome_use_embed: req.body.useEmbed ? 1 : 0,
  };
  if (req.body.message && req.body.message.trim()) fields.welcome_message = req.body.message.trim();
  db.updateGuildSettings(req.guild.id, fields);
  setFlash(req, 'success', 'Nastavení uvítacích zpráv uloženo.');
  res.redirect(`/dashboard/${req.guild.id}/welcome`);
});

// ---------------------------------------------------------------------------
// Zprávy o odchodu
// ---------------------------------------------------------------------------
router.get('/leave', async (req, res) => {
  const settings = db.getGuildSettings(req.guild.id);
  const channels = await discordApi.getGuildChannels(req.guild.id).catch(() => []);
  res.render('guild/leave', { title: 'Zprávy o odchodu', guild: req.guild, settings, channels: textChannels(channels) });
});

router.post('/leave', (req, res) => {
  const fields = {
    leave_enabled: req.body.enabled ? 1 : 0,
    leave_channel_id: req.body.channelId || null,
  };
  if (req.body.message && req.body.message.trim()) fields.leave_message = req.body.message.trim();
  db.updateGuildSettings(req.guild.id, fields);
  setFlash(req, 'success', 'Nastavení zpráv o odchodu uloženo.');
  res.redirect(`/dashboard/${req.guild.id}/leave`);
});

// ---------------------------------------------------------------------------
// Audit log - nastavení kanálu a typů událostí
// ---------------------------------------------------------------------------
router.get('/logging', async (req, res) => {
  const settings = db.getGuildSettings(req.guild.id);
  const channels = await discordApi.getGuildChannels(req.guild.id).catch(() => []);
  res.render('guild/logging', { title: 'Audit log', guild: req.guild, settings, channels: textChannels(channels) });
});

router.post('/logging', (req, res) => {
  const b = req.body;
  db.updateGuildSettings(req.guild.id, {
    log_channel_id: b.channelId || null,
    log_join: b.log_join ? 1 : 0,
    log_leave: b.log_leave ? 1 : 0,
    log_ban: b.log_ban ? 1 : 0,
    log_kick: b.log_kick ? 1 : 0,
    log_mute: b.log_mute ? 1 : 0,
    log_voice: b.log_voice ? 1 : 0,
    log_message_delete: b.log_message_delete ? 1 : 0,
    log_message_edit: b.log_message_edit ? 1 : 0,
  });
  setFlash(req, 'success', 'Nastavení audit logu uloženo.');
  res.redirect(`/dashboard/${req.guild.id}/logging`);
});

// ---------------------------------------------------------------------------
// Pravidla a přiřazení role
// ---------------------------------------------------------------------------
router.get('/rules', async (req, res) => {
  const rulesConfig = db.getRulesConfig(req.guild.id);
  const channels = await discordApi.getGuildChannels(req.guild.id).catch(() => []);
  const roles = await discordApi.getGuildRoles(req.guild.id).catch(() => []);
  res.render('guild/rules', {
    title: 'Pravidla a role',
    guild: req.guild,
    rulesConfig,
    channels: textChannels(channels),
    roles: roles.filter((r) => !r.managed && r.id !== req.guild.id).sort((a, b) => b.position - a.position),
  });
});

router.post('/rules', (req, res) => {
  const { channelId, roleId, title, description, buttonLabel } = req.body;
  const fields = { channel_id: channelId || null, role_id: roleId || null };
  if (title && title.trim()) fields.title = title.trim();
  if (description && description.trim()) fields.description = description.trim();
  if (buttonLabel && buttonLabel.trim()) fields.button_label = buttonLabel.trim();
  db.updateRulesConfig(req.guild.id, fields);
  setFlash(req, 'success', 'Nastavení pravidel uloženo. Nezapomeň zprávu zveřejnit/aktualizovat tlačítkem níže.');
  res.redirect(`/dashboard/${req.guild.id}/rules`);
});

router.post('/rules/publish', async (req, res) => {
  const cfg = db.getRulesConfig(req.guild.id);
  if (!cfg.channel_id || !cfg.role_id) {
    setFlash(req, 'error', 'Nejdřív nastav kanál a roli a ulož je.');
    return res.redirect(`/dashboard/${req.guild.id}/rules`);
  }

  const payload = {
    embeds: [{ title: cfg.title, description: cfg.description, color: 0x5865f2 }],
    components: [
      { type: 1, components: [{ type: 2, style: 3, custom_id: 'rules_agree', label: cfg.button_label }] },
    ],
  };

  try {
    const message = await discordApi.sendMessage(cfg.channel_id, payload);
    db.updateRulesConfig(req.guild.id, { message_id: message.id });
    setFlash(req, 'success', 'Zpráva s pravidly byla zveřejněna.');
  } catch (err) {
    console.error(err);
    setFlash(req, 'error', 'Zprávu se nepodařilo odeslat - zkontroluj, že bot vidí zvolený kanál a má oprávnění tam psát.');
  }
  res.redirect(`/dashboard/${req.guild.id}/rules`);
});

// ---------------------------------------------------------------------------
// Moderace - rychlé akce (ban/kick/mute/unmute/purge)
// ---------------------------------------------------------------------------
router.get('/moderation', async (req, res) => {
  const channels = await discordApi.getGuildChannels(req.guild.id).catch(() => []);
  res.render('guild/moderation', { title: 'Moderace', guild: req.guild, channels: textChannels(channels) });
});

router.post('/moderation/ban', async (req, res) => {
  const { userId, reason, deleteDays } = req.body;
  const finalReason = (reason || '').trim() || 'Nebyl uveden žádný důvod.';
  try {
    const target = await resolveUser(userId);
    await discordApi.banMember(req.guild.id, userId, `${req.session.user.username}: ${finalReason}`, (parseInt(deleteDays, 10) || 0) * 86400);
    await logAction({ guildId: req.guild.id, type: 'ban', user: target, moderator: actingModerator(req), reason: finalReason });
    setFlash(req, 'success', `Uživatel ${target.tag || target.username} byl zabanován.`);
  } catch (err) {
    setFlash(req, 'error', `Ban se nezdařil: ${err.message}`);
  }
  res.redirect(`/dashboard/${req.guild.id}/moderation`);
});

router.post('/moderation/kick', async (req, res) => {
  const { userId, reason } = req.body;
  const finalReason = (reason || '').trim() || 'Nebyl uveden žádný důvod.';
  try {
    const target = await resolveUser(userId);
    await discordApi.kickMember(req.guild.id, userId, `${req.session.user.username}: ${finalReason}`);
    await logAction({ guildId: req.guild.id, type: 'kick', user: target, moderator: actingModerator(req), reason: finalReason });
    setFlash(req, 'success', `Uživatel ${target.tag || target.username} byl vykopnut.`);
  } catch (err) {
    setFlash(req, 'error', `Kick se nezdařil: ${err.message}`);
  }
  res.redirect(`/dashboard/${req.guild.id}/moderation`);
});

router.post('/moderation/mute', async (req, res) => {
  const { userId, reason, durationInput } = req.body;
  const finalReason = (reason || '').trim() || 'Nebyl uveden žádný důvod.';
  const ms = duration.parseDuration(durationInput);
  if (!ms) {
    setFlash(req, 'error', 'Neplatná doba trvání - použij např. 10m, 1h nebo 1d.');
    return res.redirect(`/dashboard/${req.guild.id}/moderation`);
  }
  try {
    const target = await resolveUser(userId);
    const until = new Date(Date.now() + ms).toISOString();
    await discordApi.timeoutMember(req.guild.id, userId, until, `${req.session.user.username}: ${finalReason}`);
    await logAction({
      guildId: req.guild.id,
      type: 'mute',
      user: target,
      moderator: actingModerator(req),
      reason: finalReason,
      extra: { Doba: duration.formatDuration(ms) },
    });
    setFlash(req, 'success', `Uživatel ${target.tag || target.username} byl umlčen na ${duration.formatDuration(ms)}.`);
  } catch (err) {
    setFlash(req, 'error', `Mute se nezdařil: ${err.message}`);
  }
  res.redirect(`/dashboard/${req.guild.id}/moderation`);
});

router.post('/moderation/unmute', async (req, res) => {
  const { userId, reason } = req.body;
  const finalReason = (reason || '').trim() || 'Nebyl uveden žádný důvod.';
  try {
    const target = await resolveUser(userId);
    await discordApi.timeoutMember(req.guild.id, userId, null, `${req.session.user.username}: ${finalReason}`);
    await logAction({ guildId: req.guild.id, type: 'unmute', user: target, moderator: actingModerator(req), reason: finalReason });
    setFlash(req, 'success', `Umlčení uživatele ${target.tag || target.username} bylo zrušeno.`);
  } catch (err) {
    setFlash(req, 'error', `Akce se nezdařila: ${err.message}`);
  }
  res.redirect(`/dashboard/${req.guild.id}/moderation`);
});

router.post('/moderation/purge', async (req, res) => {
  const { channelId, amount } = req.body;
  const count = Math.max(1, Math.min(100, parseInt(amount, 10) || 0));
  const reasonHeader = `Purge přes dashboard (${req.session.user.username})`;

  try {
    const messages = await discordApi.getChannelMessages(channelId, count);
    const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
    const deletable = messages.filter((m) => Date.now() - new Date(m.timestamp).getTime() < TWO_WEEKS_MS);

    let deletedCount = 0;
    if (deletable.length === 1) {
      await discordApi.deleteMessage(channelId, deletable[0].id, reasonHeader);
      deletedCount = 1;
    } else if (deletable.length > 1) {
      await discordApi.bulkDeleteMessages(channelId, deletable.map((m) => m.id), reasonHeader);
      deletedCount = deletable.length;
    }

    await logAction({
      guildId: req.guild.id,
      type: 'purge',
      moderator: actingModerator(req),
      extra: { Kanál: `<#${channelId}>`, 'Smazáno zpráv': deletedCount },
    });

    setFlash(req, 'success', `Smazáno ${deletedCount} zpráv (zprávy starší 14 dní nelze hromadně mazat).`);
  } catch (err) {
    setFlash(req, 'error', `Mazání se nezdařilo: ${err.message}`);
  }
  res.redirect(`/dashboard/${req.guild.id}/moderation`);
});

// ---------------------------------------------------------------------------
// Historie audit logu
// ---------------------------------------------------------------------------
router.get('/auditlog', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const type = req.query.type || null;
  const limit = 25;
  const offset = (page - 1) * limit;

  const entries = db.getAuditLog(req.guild.id, { limit, offset, type });
  const total = db.countAuditLog(req.guild.id, type);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.render('guild/auditlog', {
    title: 'Historie audit logu',
    guild: req.guild,
    entries,
    page,
    totalPages,
    type,
    types: Object.keys(auditLogger.TYPE_META),
    typeMeta: auditLogger.TYPE_META,
  });
});

// ---------------------------------------------------------------------------
// Statistické kanály (počet členů v názvu)
// ---------------------------------------------------------------------------
router.get('/stats', async (req, res) => {
  const statChannels = db.listStatChannels(req.guild.id);
  const channels = await discordApi.getGuildChannels(req.guild.id).catch(() => []);
  res.render('guild/stats', { title: 'Statistické kanály', guild: req.guild, statChannels, channels: voiceAndCategoryChannels(channels) });
});

router.post('/stats/add', async (req, res) => {
  const { channelId, metric, template } = req.body;
  try {
    const channels = await discordApi.getGuildChannels(req.guild.id);
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) throw new Error('Kanál nebyl nalezen.');
    const channelType = channel.type === 4 ? 'category' : 'voice';
    db.addStatChannel({
      guildId: req.guild.id,
      channelId,
      channelType,
      metric,
      template: (template && template.trim()) || '👥 Členové: {count}',
    });
    setFlash(req, 'success', 'Statistický kanál přidán. Název se aktualizuje bota do ~10 minut (limit Discordu).');
  } catch (err) {
    setFlash(req, 'error', `Nepodařilo se přidat kanál: ${err.message}`);
  }
  res.redirect(`/dashboard/${req.guild.id}/stats`);
});

router.post('/stats/remove', (req, res) => {
  db.removeStatChannel(req.body.channelId);
  setFlash(req, 'success', 'Statistický kanál odebrán.');
  res.redirect(`/dashboard/${req.guild.id}/stats`);
});

module.exports = router;
