const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  InteractionType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
} = require('discord.js');
const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'abmeldung') {
    const modal = new ModalBuilder()
      .setCustomId('abmeldung_modal')
      .setTitle('Abmeldung');

    const startNameInput = new TextInputBuilder()
      .setCustomId('abmeldung_Name_date')
      .setLabel('Name/Ig')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Name');

    const startDateInput = new TextInputBuilder()
      .setCustomId('abmeldung_start_date')
      .setLabel('Datum von wann')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('TT.MM.JJJJ');

    const endDateInput = new TextInputBuilder()
      .setCustomId('abmeldung_end_date')
      .setLabel('Datum bis wann')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('TT.MM.JJJJ');

    const reasonInput = new TextInputBuilder()
      .setCustomId('abmeldung_reason')
      .setLabel('Grund')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Gib hier den Grund ein');

    modal.addComponents(
      new ActionRowBuilder().addComponents(startNameInput),
      new ActionRowBuilder().addComponents(startDateInput),
      new ActionRowBuilder().addComponents(endDateInput),
      new ActionRowBuilder().addComponents(reasonInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'abmeldung_modal') {
    const startDate = interaction.fields.getTextInputValue('abmeldung_start_date');
    const endDate = interaction.fields.getTextInputValue('abmeldung_end_date');
    const reason = interaction.fields.getTextInputValue('abmeldung_reason');
    const name = interaction.fields.getTextInputValue('abmeldung_Name_date');

    await interaction.reply({
      content: `Deine Abmeldung wurde erfolgreich eingetragen:\nName: ${name}\nVon: ${startDate}\nBis: ${endDate}\nGrund: ${reason}`,
      ephemeral: true,
    });

    const channel = client.channels.cache.get(interaction.channelId);
    if (channel) {
      const sentMessage = await channel.send({
        content: `Ig: ${name}\nWann: ${startDate}\nBis: ${endDate}\nGrund: ${reason}`,
      });
      await sentMessage.react('✅');
      await sentMessage.react('❌');
    }
  }

  // == /event ==
  if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'event') {
    const modal = new ModalBuilder()
      .setCustomId('create_event_modal')
      .setTitle('Event-Kanal erstellen');

    const nameInput = new TextInputBuilder()
      .setCustomId('channel_name_input')
      .setLabel('Wie soll der Kanal heißen?')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('z. B. Community-Talk')
      .setRequired(true);

    const typeInput = new TextInputBuilder()
      .setCustomId('channel_type_input')
      .setLabel('Kanaltyp (text, voice, stage)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Gib text, voice oder stage ein')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(typeInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'create_event_modal') {
    const channelName = interaction.fields.getTextInputValue('channel_name_input');
    const channelTypeInput = interaction.fields.getTextInputValue('channel_type_input').toLowerCase();
    const guild = interaction.guild;

    const exists = guild.channels.cache.find(c => c.name === channelName);
    if (exists) {
      return interaction.reply({
        content: `❌ Der Kanal "${channelName}" existiert bereits.`,
        ephemeral: true,
      });
    }

    let type;
    if (channelTypeInput === 'stage') type = ChannelType.GuildStageVoice;
    else if (channelTypeInput === 'voice') type = ChannelType.GuildVoice;
    else if (channelTypeInput === 'text') type = ChannelType.GuildText;
    else {
      return interaction.reply({
        content: `❌ Ungültiger Kanaltyp: "${channelTypeInput}". Erlaubt: text, voice, stage`,
        ephemeral: true,
      });
    }

    await guild.channels.create({
      name: channelName,
      type: type,
      reason: `Erstellt über /event von ${interaction.user.tag}`,
    });

    await interaction.reply({
      content: `✅ Kanal **${channelName}** (${channelTypeInput}) wurde erstellt.`,
      ephemeral: true,
    });
  }

// === /update ===
if (interaction.type === InteractionType.ApplicationCommand && interaction.commandName === 'update') {
  const modal = new ModalBuilder()
    .setCustomId('update_modal')
    .setTitle('Update-Punkte eingeben');

  const pointsInput = new TextInputBuilder()
    .setCustomId('update_points')
    .setLabel('Update-Punkte (eine Zeile = ein Satz)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('z. B. Magnet-Bug behoben – Beschreibung...')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(pointsInput));
  await interaction.showModal(modal);
}

if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'update_modal') {
  const points = interaction.fields.getTextInputValue('update_points');

  const date = new Date();
  const formattedDate = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const lines = points
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `🟢 ${line}`);

  const finalMessage = `**UPDATE ${formattedDate}**\n\n${lines.join('\n')}\n\nEuer <@&1344783602877071468>\n\n`;
  const updateChannel = await client.channels.fetch('1344783603686572183');

  if (!updateChannel || !updateChannel.isTextBased()) {
    return interaction.reply({
      content: '❌ Fehler: Ziel-Channel nicht gefunden oder ungültig.',
      ephemeral: true,
    });
  }

  const sentMessage = await updateChannel.send({
    content: '@everyone\n' + finalMessage,
  });

  await sentMessage.react('✅');
  await sentMessage.react('❌');

  await interaction.reply({
    content: '✅ Update wurde erfolgreich im Ziel-Channel gepostet.',
    ephemeral: true,
  });
}
});

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

(async () => {
  try {
    console.log('Registriere Slash-Befehle...');

    await rest.put(
      Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
      {
        body: [
          { name: 'abmeldung', description: 'Reiche eine Abmeldung ein.' },
          { name: 'event', description: 'Erstelle ein Event mit Name und Typ.' },
          { name: 'update', description: 'Poste ein neues Update mit grünen Punkten.' },
        ],
      }
    );

    console.log('✅ Befehle registriert.');
  } catch (error) {
    console.error('❌ Fehler beim Registrieren der Slash-Befehle:', error);
  }

  client.login(config.TOKEN);
})();