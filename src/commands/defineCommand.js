/*
 * DEFINE COMMAND HANDLER
 * ======================
 * 
 * FILE INTERACTION ARCHITECTURE:
 * -----------------------------
 * This module exports a command definition and handler for the /define slash command.
 * It is consumed by:
 *   → main.js (line ~25) - imports getDefineCommand() to register with Discord
 *   → main.js (line ~60) - imports handleDefineCommand() in the interactionCreate event
 * 
 * This module depends on:
 *   → discord.js - SlashCommandBuilder for command registration schema
 *   → node-fetch - makes HTTP GET requests to Dictionary API
 *   → ../config/constants.js - imports API.DICTIONARY_URL, FEATURES.EPHEMERAL_RESPONSES
 *   → ../utils/spellChecker.js - calls getSuggestions() when API returns 404
 *   → ../utils/embedBuilder.js - calls buildDefinitionEmbed() to format API response
 * 
 * ARCHITECTURAL ROLE:
 * ------------------
 * Implements the complete /define command lifecycle:
 *   1. Command registration: Defines the slash command schema (name, description, options)
 *   2. User input handling: Extracts and sanitizes the word parameter
 *   3. API interaction: Fetches definition from Free Dictionary API
 *   4. Error handling: 404 → spell suggestions, other errors → generic error message
 *   5. Response formatting: Delegates to embedBuilder for consistent presentation
 * 
 * EXECUTION FLOW:
 * User types /define <word>
 *   → Discord sends interactionCreate event to main.js
 *   → main.js routes to handleDefineCommand()
 *   → This module defers reply (shows "Bot is thinking...")
 *   → Fetches from API
 *   → If 404: calls spellChecker.getSuggestions() and shows "Did you mean...?"
 *   → If 200: calls embedBuilder.buildDefinitionEmbed() and sends rich embed
 *   → If error: sends generic error message
 */

const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const constants = require('../../config/constants');
const { getSuggestions } = require('../utils/spellChecker');
const { buildDefinitionEmbed } = require('../utils/embedBuilder');

/**
 * Get the /define command schema for Discord registration.
 * 
 * This function returns the SlashCommandBuilder instance that main.js
 * passes to client.application.commands.set() during bot initialization.
 * 
 * @returns {SlashCommandBuilder} Command definition with name, description, and options
 */
function getDefineCommand() {
    return new SlashCommandBuilder()
        .setName('define')
        .setDescription('Get the definition of a word')
        .addStringOption(option =>
            option
                .setName('word')
                .setDescription('The word to define')
                .setRequired(true)
        );
}

/**
 * Handle the /define command interaction.
 * 
 * This is the main entry point called by main.js when a user invokes /define.
 * It manages the full request/response cycle including API calls, error handling,
 * and response formatting.
 * 
 * @param {CommandInteraction} interaction - Discord.js interaction object from interactionCreate event
 */
async function handleDefineCommand(interaction) {
    const word = interaction.options.getString('word').toLowerCase().trim();

    // Defer reply immediately to prevent timeout (Discord requires response within 3 seconds)
    // Ephemeral = true means only the command user sees the response (privacy)
    await interaction.deferReply({ ephemeral: constants.FEATURES.EPHEMERAL_RESPONSES });

    try {
        // Call Free Dictionary API: https://api.dictionaryapi.dev/api/v2/entries/en/{word}
        // Returns 200 with JSON array on success, 404 if word not found
        const response = await fetch(`${constants.API.DICTIONARY_URL}${word}`);
        
        if (!response.ok) {
            // Handle 404: Word not found
            if (response.status === 404) {
                // Delegate to spell checker utility to find similar words
                // This uses Levenshtein distance + pattern matching
                const suggestions = await getSuggestions(word);
                
                if (suggestions.length > 0) {
                    // Show top 3 suggestions as clickable inline code
                    const suggestionText = suggestions.slice(0, 3).map(s => `\`${s}\``).join(', ');
                    return interaction.editReply({
                        content: `❌ No definition found for **${word}**.\n\n💡 Did you mean: ${suggestionText}?`
                    });
                }
                
                // No suggestions found - user is completely off base
                return interaction.editReply({
                    content: `❌ No definition found for **${word}**. Check your spelling!`
                });
            }
            // Handle other HTTP errors (500, 503, etc.)
            throw new Error(`API Error: ${response.status}`);
        }

        // Parse successful response
        // API returns array of entries; we use the first one
        const data = await response.json();
        const entry = data[0];

        // Delegate formatting to embed builder utility
        // This keeps presentation logic separate from business logic
        const embed = buildDefinitionEmbed(entry);

        // Send the formatted embed to the user
        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        // Catch-all for network errors, JSON parse errors, or API failures
        console.error('Error fetching definition:', error);
        await interaction.editReply({
            content: '❌ An error occurred while fetching the definition. Please try again later.'
        });
    }
}

module.exports = {
    getDefineCommand,
    handleDefineCommand
};
