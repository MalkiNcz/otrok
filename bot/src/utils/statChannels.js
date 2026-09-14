const cron = require('node-cron');
const { db, placeholders } = require('@otrok/shared');

async function computeCount(guild, metric) {
  if (metric === 'members') {
    return guild.memberCount;
  }
  // humans / bots need the member cache populated.
  const members = await guild.members.fetch().catch(() => null);
  if (!members) return guild.memberCount;
  if (metric === 'bots') return members.filter((m) => m.user.bot).size;
  return members.filter((m) => !m.user.bot).size; // humans
}

async function updateStatChannel(client, row) {
  const guild = client.guilds.cache.get(row.guild_id);
  if (!guild) return;

  const channel = await guild.channels.fetch(row.channel_id).catch(() => null);
  if (!channel) {
    db.removeStatChannel(row.channel_id);
    return;
  }

  const count = await computeCount(guild, row.metric);
  const newName = placeholders.applyPlaceholders(row.template, { count, membercount: count }).slice(0, 100);

  if (channel.name === newName) return;

  await channel.setName(newName).catch((err) => {
    console.error(`[statChannels] Nepodařilo se přejmenovat kanál ${row.channel_id}:`, err.message);
  });
  db.touchStatChannel(row.channel_id);
}

async function updateAllStatChannels(client) {
  const rows = db.listAllStatChannels();
  for (const row of rows) {
    // Sequential on purpose: Discord allows only 2 channel-name edits / 10 min
    // per channel, and this whole pass runs on a shared 10-minute cron tick.
    await updateStatChannel(client, row);
  }
}

function startStatChannelScheduler(client) {
  // Runs every 10 minutes - matches Discord's per-channel rename rate limit.
  cron.schedule('*/10 * * * *', () => {
    updateAllStatChannels(client).catch((err) => console.error('[statChannels] scheduler error:', err));
  });

  // Run once shortly after startup too, so names are fresh immediately.
  setTimeout(() => {
    updateAllStatChannels(client).catch((err) => console.error('[statChannels] initial run error:', err));
  }, 10_000);
}

module.exports = { startStatChannelScheduler, updateAllStatChannels, updateStatChannel };
