/*
 * EMBED BUILDER UTILITY MODULE
 * ============================
 * 
 * FILE INTERACTION ARCHITECTURE:
 * -----------------------------
 * This module is consumed by:
 *   → src/commands/defineCommand.js (line ~50-80) - uses buildDefinitionEmbed() to format API response
 *   → src/commands/thesaurusCommand.js (line ~60-85) - uses buildThesaurusEmbed() to format synonyms/antonyms
 * 
 * External dependencies:
 *   → discord.js - imports EmbedBuilder class for creating rich embeds
 *   → ../config/constants.js - imports COLORS and LIMITS to apply consistent styling
 * 
 * ARCHITECTURAL ROLE:
 * ------------------
 * Centralizes all Discord embed formatting logic. Commands handle business logic (API calls,
 * error handling, data extraction) while this module handles presentation (colors, field layout,
 * truncation, footer branding). This separation allows:
 *   1. Consistent UI/UX across all bot responses
 *   2. Easy styling updates without touching command logic
 *   3. Testable formatting independent of Discord API interaction
 * 
 * Both builder functions return ready-to-send EmbedBuilder instances that commands
 * pass directly to interaction.editReply({ embeds: [...] }).
 */

const { EmbedBuilder } = require('discord.js');
const constants = require('./config/constants');

/**
 * Build a rich embed for dictionary definitions.
 * 
 * Takes raw Dictionary API data and formats it into a visually structured embed with:
 *   - Title: Capitalized word with book emoji
 *   - Description: Phonetic pronunciation
 *   - Fields: One per part of speech, with numbered definitions and examples
 *   - Footer: "DICTIO" branding with timestamp
 *   - Color: Blue theme from constants.COLORS.DICTIONARY
 * 
 * Respects LIMITS.MAX_DEFINITIONS and LIMITS.MAX_DEFINITIONS_PER_TYPE to prevent
 * overwhelming the user with too much data.
 * 
 * @param {object} entry - Raw API response entry (data[0] from Dictionary API)
 * @returns {EmbedBuilder} Fully configured embed ready to send
 */
function buildDefinitionEmbed(entry) {
    const wordTitle = entry.word;
    const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || 'N/A';
    const meanings = entry.meanings.slice(0, constants.LIMITS.MAX_DEFINITIONS);

    const embed = new EmbedBuilder()
        .setColor(constants.COLORS.DICTIONARY)
        .setTitle(`📖 ${wordTitle.charAt(0).toUpperCase() + wordTitle.slice(1)}`)
        .setDescription(`**Phonetic:** ${phonetic}`)
        .setTimestamp()
        .setFooter({ text: 'DICTIO' });

    // Add one field per part of speech (noun, verb, adjective, etc.)
    meanings.forEach((meaning) => {
        const partOfSpeech = meaning.partOfSpeech;
        const definitions = meaning.definitions.slice(0, constants.LIMITS.MAX_DEFINITIONS_PER_TYPE);

        let definitionText = '';
        definitions.forEach((def, defIndex) => {
            definitionText += `${defIndex + 1}. ${def.definition}\n`;
            if (def.example && constants.FEATURES.SHOW_EXAMPLES) {
                definitionText += `   *Example: "${def.example}"*\n`;
            }
        });

        embed.addFields({
            name: `${partOfSpeech.charAt(0).toUpperCase() + partOfSpeech.slice(1)}`,
            value: definitionText || 'No definition available',
            inline: false
        });
    });

    // Add source link if available and enabled
    if (constants.FEATURES.SHOW_SOURCE_LINKS && entry.sourceUrls && entry.sourceUrls.length > 0) {
        embed.addFields({
            name: '🔗 Source',
            value: entry.sourceUrls[0],
            inline: false
        });
    }

    return embed;
}

/**
 * Build a rich embed for thesaurus data (synonyms and antonyms).
 * 
 * Takes raw Dictionary API data and formats it into a clean embed with:
 *   - Title: Capitalized word with books emoji
 *   - Fields: Separate sections for synonyms (green checkmark) and antonyms (red X)
 *   - Truncation: Shows "and N more..." when word lists exceed LIMITS.MAX_SYNONYMS/ANTONYMS
 *   - Footer: "DICTIO" branding with timestamp
 *   - Color: Green theme from constants.COLORS.THESAURUS
 * 
 * @param {string} word - The word being looked up
 * @param {string[]} allSynonyms - Deduplicated array of synonyms
 * @param {string[]} allAntonyms - Deduplicated array of antonyms
 * @returns {EmbedBuilder} Fully configured embed ready to send
 */
function buildThesaurusEmbed(word, allSynonyms, allAntonyms) {
    const embed = new EmbedBuilder()
        .setColor(constants.COLORS.THESAURUS)
        .setTitle(`📚 Thesaurus: ${word.charAt(0).toUpperCase() + word.slice(1)}`)
        .setTimestamp()
        .setFooter({ text: 'DICTIO' });

    // Add synonyms field with truncation
    if (allSynonyms.length > 0) {
        const synonymText = allSynonyms.slice(0, constants.LIMITS.MAX_SYNONYMS).join(', ');
        const overflowText = allSynonyms.length > constants.LIMITS.MAX_SYNONYMS 
            ? `, and ${allSynonyms.length - constants.LIMITS.MAX_SYNONYMS} more...` 
            : '';
        embed.addFields({
            name: '✅ Synonyms',
            value: synonymText + overflowText,
            inline: false
        });
    }

    // Add antonyms field with truncation
    if (allAntonyms.length > 0) {
        const antonymText = allAntonyms.slice(0, constants.LIMITS.MAX_ANTONYMS).join(', ');
        const overflowText = allAntonyms.length > constants.LIMITS.MAX_ANTONYMS 
            ? `, and ${allAntonyms.length - constants.LIMITS.MAX_ANTONYMS} more...` 
            : '';
        embed.addFields({
            name: '❌ Antonyms',
            value: antonymText + overflowText,
            inline: false
        });
    }

    return embed;
}

module.exports = {
    buildDefinitionEmbed,
    buildThesaurusEmbed
};
