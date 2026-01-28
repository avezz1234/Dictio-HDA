/*
 * THESAURUS COMMAND HANDLER
 * ========================
 * 
 * FILE INTERACTION ARCHITECTURE:
 * -----------------------------
 * This module exports a command definition and handler for the /thesaurus slash command.
 * It is consumed by:
 *   → main.js (line ~26) - imports getThesaurusCommand() to register with Discord
 *   → main.js (line ~61) - imports handleThesaurusCommand() in the interactionCreate event
 * 
 * This module depends on:
 *   → discord.js - SlashCommandBuilder for command registration schema
 *   → node-fetch - makes HTTP GET requests to Dictionary API (for synonyms/antonyms)
 *   → ../../config/constants.js - imports API.DICTIONARY_URL, FEATURES.EPHEMERAL_RESPONSES
 *   → ../utils/spellChecker.js - calls getSuggestions() when API returns 404
 *   → ../utils/embedBuilder.js - calls buildThesaurusEmbed() to format synonyms/antonyms
 * 
 * ARCHITECTURAL ROLE:
 * ------------------
 * Implements the complete /thesaurus command lifecycle, parallel to defineCommand.js:
 *   1. Command registration: Defines slash command schema
 *   2. User input handling: Extracts and sanitizes word parameter
 *   3. API interaction: Fetches definition data (to extract synonyms/antonyms)
 *   4. Data aggregation: Deduplicates and merges synonyms/antonyms across all meanings
 *   5. Error handling: 404 → spell suggestions, no results → helpful message
 *   6. Response formatting: Delegates to embedBuilder for consistent presentation
 */

const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const constants = require('../../config/constants');
const { getSuggestions } = require('../utils/spellChecker');
const { buildThesaurusEmbed } = require('../utils/embedBuilder');

/**
 * Get the /thesaurus command schema for Discord registration.
 * 
 * @returns {SlashCommandBuilder} Command definition with name, description, and options
 */
function getThesaurusCommand() {
    return new SlashCommandBuilder()
        .setName('thesaurus')
        .setDescription('Get synonyms and antonyms for a word')
        .addStringOption(option =>
            option
                .setName('word')
                .setDescription('The word to look up')
                .setRequired(true)
        );
}

/**
 * Handle the /thesaurus command interaction.
 * 
 * @param {CommandInteraction} interaction - Discord.js interaction object from interactionCreate event
 */
async function handleThesaurusCommand(interaction) {
    const word = interaction.options.getString('word').toLowerCase().trim();

    await interaction.deferReply({ ephemeral: constants.FEATURES.EPHEMERAL_RESPONSES });

    try {
        const response = await fetch(`${constants.API.DICTIONARY_URL}${word}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                const suggestions = await getSuggestions(word);
                
                if (suggestions.length > 0) {
                    const suggestionText = suggestions.slice(0, 3).map(s => `\`${s}\``).join(', ');
                    return interaction.editReply({
                        content: `❌ No thesaurus data found for **${word}**.\n\n💡 Did you mean: ${suggestionText}?`
                    });
                }
                
                return interaction.editReply({
                    content: `❌ No thesaurus data found for **${word}**. Check your spelling!`
                });
            }
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const entry = data[0];

        // Aggregate synonyms and antonyms from all meanings
        const allSynonyms = [];
        const allAntonyms = [];

        entry.meanings.forEach(meaning => {
            meaning.definitions.forEach(def => {
                if (def.synonyms) {
                    allSynonyms.push(...def.synonyms);
                }
                if (def.antonyms) {
                    allAntonyms.push(...def.antonyms);
                }
            });
            // Also check meaning-level synonyms/antonyms
            if (meaning.synonyms) {
                allSynonyms.push(...meaning.synonyms);
            }
            if (meaning.antonyms) {
                allAntonyms.push(...meaning.antonyms);
            }
        });

        // Deduplicate using Set
        const uniqueSynonyms = [...new Set(allSynonyms)];
        const uniqueAntonyms = [...new Set(allAntonyms)];

        if (uniqueSynonyms.length === 0 && uniqueAntonyms.length === 0) {
            return interaction.editReply({
                content: `❌ No synonyms or antonyms found for **${word}**.`
            });
        }

        const embed = buildThesaurusEmbed(word, uniqueSynonyms, uniqueAntonyms);
        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Error fetching thesaurus data:', error);
        await interaction.editReply({
            content: '❌ An error occurred while fetching thesaurus data. Please try again later.'
        });
    }
}

module.exports = {
    getThesaurusCommand,
    handleThesaurusCommand
};
