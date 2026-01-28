/*
 * DICTIO BOT - MAIN ENTRY POINT
 * ==============================
 * 
 * This is the main bot initialization file that:
 *   1. Creates and configures the Discord client
 *   2. Loads configuration from constants.js
 *   3. Registers slash commands (/define and /thesaurus)
 *   4. Handles the bot ready event
 *   5. Routes command interactions to their handlers
 */

const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const constants = require('./config/constants');
const { getDefineCommand, handleDefineCommand } = require('./src/commands/defineCommand');
const { getThesaurusCommand, handleThesaurusCommand } = require('./src/commands/thesaurusCommand');

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Bot ready event - fires once when bot successfully connects to Discord
client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    
    // Set bot presence (status and activity)
    client.user.setPresence({
        status: constants.BOT_STATUS,
        activities: [{
            name: constants.BOT_ACTIVITY.name,
            type: ActivityType[constants.BOT_ACTIVITY.type]
        }]
    });
    
    // Register slash commands globally
    try {
        const commands = [
            getDefineCommand().toJSON(),
            getThesaurusCommand().toJSON()
        ];
        
        await client.application.commands.set(commands);
        console.log('✅ Slash commands registered successfully');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    try {
        switch (interaction.commandName) {
            case 'define':
                await handleDefineCommand(interaction);
                break;
            case 'thesaurus':
                await handleThesaurusCommand(interaction);
                break;
            default:
                console.warn(`Unknown command: ${interaction.commandName}`);
        }
    } catch (error) {
        console.error(`Error handling command ${interaction.commandName}:`, error);
        
        // Try to respond to user if possible
        const errorMessage = '❌ An unexpected error occurred while processing your command.';
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: errorMessage }).catch(() => {});
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true }).catch(() => {});
        }
    }
});

// Login to Discord with bot token
if (!constants.TOKEN) {
    console.error('❌ DISCORD_TOKEN is not set in environment variables!');
    process.exit(1);
}

client.login(constants.TOKEN).catch(error => {
    console.error('❌ Failed to login to Discord:', error);
    process.exit(1);
});
