/*
 * CONFIGURATION CONSTANTS MODULE
 * ==============================
 * FILE INTERACTION ARCHITECTURE:
 * -----------------------------
 * This module is the single source of truth for all bot configuration.
 * It is imported by:
 *   → main.js (line ~4) - reads TOKEN, BOT_STATUS, BOT_ACTIVITY for client initialization
 *   → src/commands/defineCommand.js (line ~5) - reads API.DICTIONARY_URL, LIMITS.*, COLORS.DICTIONARY
 *   → src/commands/thesaurusCommand.js (line ~5) - reads API.DICTIONARY_URL, LIMITS.*, COLORS.THESAURUS
 *   → src/utils/embedBuilder.js (line ~3) - reads COLORS.*, LIMITS.*, FEATURES.* for embed formatting
 *   → src/utils/spellChecker.js (line ~2) - reads API.DICTIONARY_URL for pattern validation
 * 
 * ARCHITECTURAL ROLE:
 * ------------------
 * Centralizes all magic numbers, API endpoints, feature flags, and styling constants.
 * This allows configuration changes without touching business logic. For example:
 *   - Changing MAX_DEFINITIONS affects both commands and embed builder automatically
 *   - Toggling FEATURES.EPHEMERAL_RESPONSES changes all command responses at once
 *   - Updating COLORS.* instantly rebrands all embeds
 * 
 * SECURITY NOTE:
 * The TOKEN should come from process.env.DISCORD_TOKEN (loaded via dotenv in main.js).
 * The hardcoded fallback is for development only and should be removed in production.
 */

module.exports = {
    // Discord Bot Authentication
    // ---------------------------
    // Read from environment variable (set in .env file) for security
    // No fallback - bot will fail fast if TOKEN is missing
    TOKEN: process.env.DISCORD_TOKEN,
    
    // Bot Presence Configuration
    // --------------------------
    // Used by main.js on the 'ready' event to set bot status and activity display
    BOT_PREFIX: '!',
    BOT_STATUS: 'online', // online, idle, dnd, invisible
    BOT_ACTIVITY: {
        name: 'DICTIO | /define | /thesaurus',
        type: 'WATCHING' // PLAYING, STREAMING, LISTENING, WATCHING, COMPETING
    },
    
    // Embed Color Palette
    // -------------------
    // Hex colors used by embedBuilder.js to theme different response types
    // Provides consistent visual identity across all bot interactions
    COLORS: {
        DICTIONARY: '#4f9dde',  // Blue - used for /define embeds
        THESAURUS: '#4ade80',   // Green - used for /thesaurus embeds
        ERROR: '#ff5f57',       // Red - for error messages
        SUCCESS: '#28c840',     // Green - for success confirmations
        INFO: '#a89888'         // Tan - for informational notices
    },
    
    // External API Configuration
    // --------------------------
    // Free Dictionary API: https://dictionaryapi.dev/
    // Used by both command handlers and spell checker for word lookups
    API: {
        DICTIONARY_URL: 'https://api.dictionaryapi.dev/api/v2/entries/en/',
        TIMEOUT: 5000 // 5 seconds - maximum wait time for API responses
    },
    
    // Display Truncation Limits
    // -------------------------
    // Prevents overwhelming users with too much data in a single embed
    // Discord has a 6000 character limit per embed, these keep us well under
    LIMITS: {
        MAX_DEFINITIONS: 3,          // Max meanings (parts of speech) to show in /define
        MAX_DEFINITIONS_PER_TYPE: 2, // Max definitions per part of speech
        MAX_SYNONYMS: 15,            // Max synonyms to display in /thesaurus
        MAX_ANTONYMS: 15             // Max antonyms to display in /thesaurus
    },
    
    // Feature Flags
    // -------------
    // Toggle bot capabilities without code changes
    // Used by command handlers and embed builder to conditionally enable features
    FEATURES: {
        EPHEMERAL_RESPONSES: true,  // If true, only the command user sees responses
        SHOW_PHONETICS: true,       // Include pronunciation in /define embeds
        SHOW_EXAMPLES: true,        // Include usage examples in definitions
        SHOW_SOURCE_LINKS: true     // Include Dictionary API source URLs
    }
};
