const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { db, placeholders } = require('@otrok/shared');
const { successEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setstats')
    .setDescription('Spravuje kanály/kategorie, jejichž název zobrazuje počet členů')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('pridat')
        .setDescription('Přidá statistický kanál nebo kategorii')
        .addChannelOption((opt) =>
          opt
            .setName('kanal')
            .setDescription('Hlasový kanál nebo kategorie, jejíž název se bude aktualizovat')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('metrika')
            .setDescription('Co počítat')
            .addChoices(
              { name: 'Všichni členové', value: 'members' },
              { name: 'Jen lidé (bez botů)', value: 'humans' },
              { name: 'Jen boti', value: 'bots' }
            )
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('sablona').setDescription('Šablona názvu, použij {count}. Výchozí: "👥 Členové: {count}"').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('odebrat')
        .setDescription('Přestane aktualizovat název kanálu/kategorie')
        .addChannelOption((opt) =>
          opt
            .setName('kanal')
            .setDescription('Kanál nebo kategorie')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildCategory)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel('kanal', true);

    if (sub === 'odebrat') {
      db.removeStatChannel(channel.id);
      return interaction.reply({ embeds: [successEmbed('Statistický kanál odebrán', `${channel} se už nebude automaticky přejmenovávat.`)], ephemeral: true });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        embeds: [errorEmbed('Nedostatek oprávnění', 'Bot potřebuje oprávnění "Spravovat kanály", aby mohl přejmenovávat kanály.')],
        ephemeral: true,
      });
    }

    const metric = interaction.options.getString('metrika', true);
    const template = interaction.options.getString('sablona') || '👥 Členové: {count}';
    const channelType = channel.type === ChannelType.GuildCategory ? 'category' : 'voice';

    db.addStatChannel({ guildId: interaction.guild.id, channelId: channel.id, channelType, metric, template });

    const count = metric === 'members' ? interaction.guild.memberCount : null;
    const preview = placeholders.applyPlaceholders(template, { count: count ?? '…' });

    return interaction.reply({
      embeds: [
        successEmbed(
          'Statistický kanál nastaven',
          `${channel} se nyní bude aktualizovat každých 10 minut (limit Discordu).\nUkázka názvu: \`${preview}\``
        ),
      ],
      ephemeral: true,
    });
  },
};
