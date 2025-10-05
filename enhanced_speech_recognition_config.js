// Enhanced Speech Recognition Accuracy Configuration
// Multiple strategies to improve recognition performance

class EnhancedSpeechRecognitionConfig {
    constructor() {
        // Advanced recognition settings
        this.baseConfig = {
            // Language and locale optimization
            language: 'en-US',
            alternativeLanguages: ['en-GB', 'en-CA', 'en-AU'],

            // Audio quality settings
            audioConfig: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100,
                sampleSize: 16,
                channelCount: 1
            },

            // Recognition parameters
            continuous: true,
            interimResults: true,
            maxAlternatives: 5, // Increased for better alternatives

            // Performance tuning
            confidence_threshold: {
                wake_word: 0.7,    // Higher threshold for wake words
                commands: 0.6,      // Lower threshold for commands
                interim: 0.85       // High threshold for interim results
            },

            // Context and grammar hints
            speechContext: {
                phrases: [
                    'Hey Rupert',
                    'Rupert',
                    'new tab',
                    'close tab',
                    'switch tab',
                    'scroll down',
                    'scroll up',
                    'go back',
                    'go forward',
                    'refresh page',
                    'search for'
                ]
            }
        };

        // Wake word variations with phonetic alternatives
        this.wakeWordVariations = [
            // Primary wake words
            'hey rupert',
            'rupert',

            // Common mispronunciations
            'hey robert',
            'hey ruber',
            'hey ruppert',
            'a rupert',
            'hay rupert',
            'hey rupe',

            // Shortened versions
            'rupe',
            'rup',

            // Alternative activations
            'okay rupert',
            'hi rupert'
        ];

        // Command patterns with variations
        this.commandPatterns = {
            navigation: [
                // Tab commands
                {patterns: ['new tab', 'open tab', 'create tab'], action: 'new_tab'},
                {patterns: ['close tab', 'close this tab', 'close current tab'], action: 'close_tab'},
                {patterns: ['switch to tab (\\d+)', 'go to tab (\\d+)', 'tab (\\d+)'], action: 'switch_tab'},

                // Scrolling
                {patterns: ['scroll down', 'scroll', 'page down'], action: 'scroll_down'},
                {patterns: ['scroll up', 'page up', 'go up'], action: 'scroll_up'},

                // Navigation
                {patterns: ['go back', 'back', 'previous'], action: 'go_back'},
                {patterns: ['go forward', 'forward', 'next'], action: 'go_forward'},
                {patterns: ['refresh', 'reload', 'refresh page'], action: 'refresh'},

                // Search
                {patterns: ['search for (.+)', 'google (.+)', 'find (.+)'], action: 'search'}
            ]
        };
    }

    // Get optimized recognition settings for wake word detection
    getWakeWordConfig() {
        return {
            continuous: true,
            interimResults: true,
            lang: this.baseConfig.language,
            maxAlternatives: 5,

            // Enhanced audio settings for wake word detection
            audioConstraints: {
                audio: {
                    ...this.baseConfig.audioConfig,
                    // Optimized for wake word detection
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false, // Disabled for consistent volume
                    googEchoCancellation: true,
                    googAutoGainControl: false,
                    googNoiseSuppression: true,
                    googHighpassFilter: true,
                    googTypingNoiseDetection: true
                }
            }
        };
    }

    // Get optimized recognition settings for command recognition
    getCommandConfig() {
        return {
            continuous: false,
            interimResults: false,
            lang: this.baseConfig.language,
            maxAlternatives: 3,

            // Enhanced audio settings for command recognition
            audioConstraints: {
                audio: {
                    ...this.baseConfig.audioConfig,
                    // Optimized for command recognition
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            }
        };
    }

    // Advanced wake word detection with fuzzy matching
    detectWakeWord(transcript, confidence) {
        const cleanTranscript = transcript.toLowerCase().trim();

        // Method 1: Exact matching
        for (const wakeWord of this.wakeWordVariations) {
            if (cleanTranscript.includes(wakeWord)) {
                return {
                    detected: true,
                    method: 'exact',
                    matched: wakeWord,
                    confidence: confidence
                };
            }
        }

        // Method 2: Phonetic similarity (Levenshtein distance)
        const words = cleanTranscript.split(' ');
        const recentWords = words.slice(-3).join(' '); // Last 3 words

        for (const wakeWord of ['hey rupert', 'rupert']) {
            const similarity = this.calculateSimilarity(recentWords, wakeWord);
            if (similarity > 0.8 && confidence > 0.7) {
                return {
                    detected: true,
                    method: 'fuzzy',
                    matched: wakeWord,
                    similarity: similarity,
                    confidence: confidence
                };
            }
        }

        // Method 3: Individual word matching
        for (const word of words.slice(-2)) { // Last 2 words
            if (this.isSimilarToRupert(word) && confidence > 0.75) {
                return {
                    detected: true,
                    method: 'word_match',
                    matched: word,
                    confidence: confidence
                };
            }
        }

        return {
            detected: false,
            confidence: confidence
        };
    }

    // Calculate string similarity using Levenshtein distance
    calculateSimilarity(str1, str2) {
        const matrix = [];
        const len1 = str1.length;
        const len2 = str2.length;

        // Create matrix
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        // Fill matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        // Calculate similarity percentage
        const maxLen = Math.max(len1, len2);
        return (maxLen - matrix[len1][len2]) / maxLen;
    }

    // Check if word is similar to "Rupert"
    isSimilarToRupert(word) {
        const rupertVariants = ['rupert', 'robert', 'ruber', 'ruppert', 'rupe', 'rup'];
        return rupertVariants.some(variant => 
            this.calculateSimilarity(word.toLowerCase(), variant) > 0.7
        );
    }

    // Enhanced command parsing with pattern matching
    parseCommand(transcript) {
        const cleanTranscript = transcript.toLowerCase().trim();

        for (const category of Object.values(this.commandPatterns)) {
            for (const commandSet of category) {
                for (const pattern of commandSet.patterns) {
                    const regex = new RegExp(pattern, 'i');
                    const match = cleanTranscript.match(regex);

                    if (match) {
                        return {
                            action: commandSet.action,
                            matched_pattern: pattern,
                            full_match: match[0],
                            parameters: match.slice(1),
                            confidence: 'high'
                        };
                    }
                }
            }
        }

        return {
            action: 'unknown',
            transcript: cleanTranscript,
            confidence: 'low'
        };
    }

    // Get speech context hints for better recognition
    getSpeechContextHints() {
        return {
            phrases: [
                ...this.wakeWordVariations,
                ...this.baseConfig.speechContext.phrases
            ],
            boost: 10 // Boost recognition of these phrases
        };
    }
}

// Export the configuration
window.EnhancedSpeechRecognitionConfig = EnhancedSpeechRecognitionConfig;
console.log('Enhanced Speech Recognition Configuration Loaded');