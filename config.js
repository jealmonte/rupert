// config.js - Enhanced Configuration with Environment Variable Support

class ConfigManager {
  static envConfig = null;

  // Load environment variables (for development)
  static async loadEnvConfig() {
    if (this.envConfig) return this.envConfig;
    
    try {
      // In development, you can load from a config file
      // For production, use Chrome storage or hardcoded fallbacks
      const response = await fetch(chrome.runtime.getURL('config/env.json'));
      if (response.ok) {
        this.envConfig = await response.json();
      }
    } catch (error) {
      console.log('No env.json found, using Chrome storage');
    }
    
    return this.envConfig || {};
  }

  static async getGeminiApiKey() {
    try {
      // First try environment config
      const envConfig = await this.loadEnvConfig();
      if (envConfig.GEMINI_API_KEY && envConfig.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
        return envConfig.GEMINI_API_KEY;
      }

      // Fallback to Chrome storage
      const result = await chrome.storage.local.get(['geminiApiKey']);
      return result.geminiApiKey || null;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  static async setGeminiApiKey(apiKey) {
    try {
      await chrome.storage.local.set({ geminiApiKey: apiKey });
      return true;
    } catch (error) {
      console.error('Error setting API key:', error);
      return false;
    }
  }

  static async clearGeminiApiKey() {
    try {
      await chrome.storage.local.remove(['geminiApiKey']);
      return true;
    } catch (error) {
      console.error('Error clearing API key:', error);
      return false;
    }
  }

  static validateApiKey(apiKey) {
    // Enhanced validation for Gemini API keys
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    // Gemini API keys typically start with 'AIza' and are 39 characters long
    const geminiPattern = /^AIza[0-9A-Za-z-_]{35}$/;
    return geminiPattern.test(apiKey) || apiKey.length > 20; // Fallback for other formats
  }

  static async getSettings() {
    const envConfig = await this.loadEnvConfig();
    const result = await chrome.storage.local.get([
      'wakeWordEnabled',
      'visualFeedbackEnabled', 
      'listeningTimeout',
      'language',
      'notificationsEnabled'
    ]);

    return {
      wakeWordEnabled: result.wakeWordEnabled ?? envConfig.WAKE_WORD_ENABLED ?? true,
      visualFeedbackEnabled: result.visualFeedbackEnabled ?? envConfig.VISUAL_FEEDBACK_ENABLED ?? true,
      listeningTimeout: result.listeningTimeout || envConfig.LISTENING_TIMEOUT || 30000,
      language: result.language || envConfig.LANGUAGE || 'en-US',
      notificationsEnabled: result.notificationsEnabled ?? envConfig.NOTIFICATIONS_ENABLED ?? true,
      wakeWords: envConfig.WAKE_WORDS ? envConfig.WAKE_WORDS.split(',') : ['hey rupert', 'rupert', 'hey robert']
    };
  }

  static async updateSettings(settings) {
    await chrome.storage.local.set(settings);
  }

  static async getGeminiConfig() {
    const envConfig = await this.loadEnvConfig();
    return {
      apiKey: await this.getGeminiApiKey(),
      model: envConfig.GEMINI_MODEL || 'gemini-pro',
      apiUrl: envConfig.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
      debugMode: envConfig.DEBUG_MODE === 'true'
    };
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConfigManager;
}
