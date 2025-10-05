// Enhanced Command Processor with Hardcoded Commands
// Implements specific voice commands while maintaining AI integration capabilities

class EnhancedCommandProcessor {
    constructor() {
        this.hardcodedCommands = this.initializeHardcodedCommands();
        this.isProcessing = false;

        console.log('🎯 Enhanced Command Processor initialized with hardcoded commands');
    }

    initializeHardcodedCommands() {
        return {
            // New Tab Commands
            new_tab: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:open\s+(?:a\s+)?new\s+tab|new\s+tab|create\s+(?:a\s+)?new\s+tab)/i,
                    /(?:hey rupert,?\s+)?(?:open\s+tab|new\s+browser\s+tab)/i
                ],
                action: 'new_tab',
                url: null,
                confidence: 0.95,
                description: 'Opens a new browser tab'
            },

            // Amazon Commands
            open_amazon: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:open\s+amazon|go\s+to\s+amazon|amazon\.com)/i,
                    /(?:hey rupert,?\s+)?(?:navigate\s+to\s+amazon|visit\s+amazon)/i,
                    /(?:hey rupert,?\s+)?(?:take\s+me\s+to\s+amazon|show\s+me\s+amazon)/i
                ],
                action: 'open_website',
                url: 'https://amazon.com',
                confidence: 0.95,
                description: 'Opens Amazon.com in a new tab'
            },

            // Google Commands
            open_google: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:open\s+google|go\s+to\s+google|google\.com)/i,
                    /(?:hey rupert,?\s+)?(?:navigate\s+to\s+google|visit\s+google)/i
                ],
                action: 'open_website',
                url: 'https://google.com',
                confidence: 0.90,
                description: 'Opens Google.com in a new tab'
            },

            // YouTube Commands
            open_youtube: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:open\s+youtube|go\s+to\s+youtube|youtube\.com)/i,
                    /(?:hey rupert,?\s+)?(?:navigate\s+to\s+youtube|visit\s+youtube)/i
                ],
                action: 'open_website',
                url: 'https://youtube.com',
                confidence: 0.90,
                description: 'Opens YouTube.com in a new tab'
            },

            // Search Commands
            search_web: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:search\s+(?:for\s+)?(.+)|google\s+(?:search\s+)?(.+)|look\s+up\s+(.+))/i,
                    /(?:hey rupert,?\s+)?(?:find\s+(.+)|what\s+is\s+(.+))/i
                ],
                action: 'search',
                url: null,
                confidence: 0.85,
                description: 'Searches Google for the specified term'
            },

            // Tab Management Commands
            close_tab: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:close\s+(?:this\s+)?tab|close\s+current\s+tab)/i,
                    /(?:hey rupert,?\s+)?(?:close\s+tab\s+(\d+))/i
                ],
                action: 'close_tab',
                url: null,
                confidence: 0.90,
                description: 'Closes the current tab or specified tab number'
            },

            // Navigation Commands
            go_back: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:go\s+back|navigate\s+back|back)/i,
                    /(?:hey rupert,?\s+)?(?:previous\s+page)/i
                ],
                action: 'navigate_back',
                url: null,
                confidence: 0.90,
                description: 'Goes back to the previous page'
            },

            go_forward: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:go\s+forward|navigate\s+forward|forward)/i,
                    /(?:hey rupert,?\s+)?(?:next\s+page)/i
                ],
                action: 'navigate_forward',
                url: null,
                confidence: 0.90,
                description: 'Goes forward to the next page'
            },

            // Scroll Commands
            scroll_down: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:scroll\s+down|page\s+down)/i,
                    /(?:hey rupert,?\s+)?(?:go\s+down|move\s+down)/i
                ],
                action: 'scroll',
                target: 'down',
                confidence: 0.85,
                description: 'Scrolls down on the current page'
            },

            scroll_up: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:scroll\s+up|page\s+up)/i,
                    /(?:hey rupert,?\s+)?(?:go\s+up|move\s+up)/i
                ],
                action: 'scroll',
                target: 'up',
                confidence: 0.85,
                description: 'Scrolls up on the current page'
            },

            // Refresh Commands
            refresh_page: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:refresh|reload|refresh\s+page|reload\s+page)/i,
                    /(?:hey rupert,?\s+)?(?:update\s+page)/i
                ],
                action: 'refresh',
                url: null,
                confidence: 0.90,
                description: 'Refreshes the current page'
            }
        };
    }

    // Enhanced command parsing with hardcoded patterns
    parseCommand(transcript) {
        console.log('🔍 Parsing command:', transcript);

        if (!transcript || transcript.trim().length === 0) {
            return {
                action: 'unknown',
                confidence: 0,
                message: 'No transcript provided'
            };
        }

        const cleanTranscript = transcript.toLowerCase().trim();
        console.log('🧹 Clean transcript:', cleanTranscript);

        // Check hardcoded commands first (higher priority)
        const hardcodedResult = this.checkHardcodedCommands(cleanTranscript);
        if (hardcodedResult.action !== 'unknown') {
            console.log('✅ Hardcoded command matched:', hardcodedResult);
            return hardcodedResult;
        }

        // Fallback to basic pattern matching
        const fallbackResult = this.basicPatternMatching(cleanTranscript);
        console.log('🔄 Fallback result:', fallbackResult);

        return fallbackResult;
    }

    checkHardcodedCommands(transcript) {
        for (const [commandKey, command] of Object.entries(this.hardcodedCommands)) {
            for (const pattern of command.patterns) {
                const match = transcript.match(pattern);
                if (match) {
                    console.log(`🎯 Matched hardcoded command: ${commandKey}`, { pattern: pattern.source, match });

                    // Extract parameters from the match
                    const extractedParams = this.extractParameters(match, command);

                    return {
                        action: command.action,
                        target: extractedParams.target || command.target || null,
                        url: command.url,
                        confidence: command.confidence,
                        explanation: command.description,
                        matched_command: commandKey,
                        matched_pattern: pattern.source,
                        raw_match: match[0]
                    };
                }
            }
        }

        return { action: 'unknown', confidence: 0 };
    }

    extractParameters(match, command) {
        const result = { target: null };

        // Extract search terms for search commands
        if (command.action === 'search') {
            // Find the first non-empty captured group (search term)
            for (let i = 1; i < match.length; i++) {
                if (match[i] && match[i].trim()) {
                    result.target = match[i].trim();
                    break;
                }
            }
        }

        // Extract tab numbers for close tab commands
        if (command.action === 'close_tab' && match[1]) {
            result.target = parseInt(match[1]);
        }

        return result;
    }

    basicPatternMatching(transcript) {
        // Basic fallback patterns for unknown commands
        const basicPatterns = [
            { pattern: /new\s+tab/i, action: 'new_tab', confidence: 0.7 },
            { pattern: /close\s+tab/i, action: 'close_tab', confidence: 0.7 },
            { pattern: /scroll\s+down/i, action: 'scroll', target: 'down', confidence: 0.6 },
            { pattern: /scroll\s+up/i, action: 'scroll', target: 'up', confidence: 0.6 },
            { pattern: /go\s+back/i, action: 'navigate_back', confidence: 0.6 },
            { pattern: /refresh/i, action: 'refresh', confidence: 0.6 }
        ];

        for (const { pattern, action, target, confidence } of basicPatterns) {
            if (pattern.test(transcript)) {
                return {
                    action,
                    target: target || null,
                    confidence,
                    explanation: `Basic pattern match for ${action}`,
                    matched_pattern: pattern.source
                };
            }
        }

        return {
            action: 'unknown',
            confidence: 0,
            explanation: 'No matching command pattern found',
            transcript: transcript
        };
    }

    // Get all available commands for help
    getAvailableCommands() {
        return Object.keys(this.hardcodedCommands).map(key => ({
            command: key,
            description: this.hardcodedCommands[key].description,
            examples: this.hardcodedCommands[key].patterns.map(p => 
                p.source.replace(/\(\?:|\)/g, '').replace(/\\\\/g, ' ')
            )
        }));
    }
}

// Enhanced command execution with better error handling
class EnhancedCommandExecutor {
    constructor() {
        this.processor = new EnhancedCommandProcessor();
        console.log('⚡ Enhanced Command Executor initialized');
    }

    async executeCommand(parsedCommand) {
        console.log('⚡ Executing enhanced command:', parsedCommand);

        if (parsedCommand.confidence < 0.5) {
            return {
                success: false,
                message: `I'm not confident about that command (${Math.round(parsedCommand.confidence * 100)}%). Please try again.`,
                confidence: parsedCommand.confidence
            };
        }

        try {
            switch (parsedCommand.action) {
                case 'new_tab':
                    return await this.executeNewTab();

                case 'open_website':
                    return await this.executeOpenWebsite(parsedCommand.url, parsedCommand.explanation);

                case 'search':
                    return await this.executeSearch(parsedCommand.target);

                case 'close_tab':
                    return await this.executeCloseTab(parsedCommand.target);

                case 'navigate_back':
                    return await this.executeNavigateBack();

                case 'navigate_forward':
                    return await this.executeNavigateForward();

                case 'scroll':
                    return await this.executeScroll(parsedCommand.target);

                case 'refresh':
                    return await this.executeRefresh();

                default:
                    return {
                        success: false,
                        message: `Unknown command: ${parsedCommand.action}. Try "open new tab" or "open amazon".`,
                        action: parsedCommand.action
                    };
            }
        } catch (error) {
            console.error('Command execution error:', error);
            return {
                success: false,
                message: `Error executing command: ${error.message}`,
                error: error.message
            };
        }
    }

    async executeNewTab() {
        console.log('📄 Opening new tab...');
        const tab = await chrome.tabs.create({ url: 'chrome://newtab/', active: true });
        return {
            success: true,
            message: 'Opened a new tab',
            action: 'new_tab',
            tabId: tab.id
        };
    }

    async executeOpenWebsite(url, description) {
        console.log(`🌐 Opening website: ${url}`);
        const tab = await chrome.tabs.create({ url: url, active: true });
        return {
            success: true,
            message: description || `Opened ${url}`,
            action: 'open_website',
            url: url,
            tabId: tab.id
        };
    }

    async executeSearch(query) {
        if (!query || query.trim().length === 0) {
            return {
                success: false,
                message: 'No search term provided'
            };
        }

        console.log(`🔍 Searching for: ${query}`);
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        const tab = await chrome.tabs.create({ url: searchUrl, active: true });

        return {
            success: true,
            message: `Searching Google for "${query}"`,
            action: 'search',
            query: query,
            tabId: tab.id
        };
    }

    async executeCloseTab(tabNumber) {
        console.log('❌ Closing tab...');

        if (tabNumber) {
            // Close specific tab by number
            const tabs = await chrome.tabs.query({});
            const targetTab = tabs[tabNumber - 1];

            if (targetTab) {
                await chrome.tabs.remove(targetTab.id);
                return {
                    success: true,
                    message: `Closed tab ${tabNumber}`,
                    action: 'close_tab'
                };
            } else {
                return {
                    success: false,
                    message: `Tab ${tabNumber} not found`
                };
            }
        } else {
            // Close current tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                await chrome.tabs.remove(tabs[0].id);
                return {
                    success: true,
                    message: 'Closed current tab',
                    action: 'close_tab'
                };
            } else {
                return {
                    success: false,
                    message: 'No active tab to close'
                };
            }
        }
    }

    async executeNavigateBack() {
        console.log('⬅️ Navigating back...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            await chrome.tabs.goBack(tabs[0].id);
            return {
                success: true,
                message: 'Navigated back',
                action: 'navigate_back'
            };
        } else {
            return {
                success: false,
                message: 'No active tab found'
            };
        }
    }

    async executeNavigateForward() {
        console.log('➡️ Navigating forward...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            await chrome.tabs.goForward(tabs[0].id);
            return {
                success: true,
                message: 'Navigated forward',
                action: 'navigate_forward'
            };
        } else {
            return {
                success: false,
                message: 'No active tab found'
            };
        }
    }

    async executeScroll(direction) {
        console.log(`📜 Scrolling ${direction}...`);
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tabs.length > 0) {
            const response = await chrome.tabs.sendMessage(tabs[0].id, {
                action: 'scroll',
                direction: direction
            });

            return {
                success: true,
                message: `Scrolled ${direction}`,
                action: 'scroll'
            };
        } else {
            return {
                success: false,
                message: 'No active tab found'
            };
        }
    }

    async executeRefresh() {
        console.log('🔄 Refreshing page...');
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tabs.length > 0) {
            await chrome.tabs.reload(tabs[0].id);
            return {
                success: true,
                message: 'Page refreshed',
                action: 'refresh'
            };
        } else {
            return {
                success: false,
                message: 'No active tab found'
            };
        }
    }

    // Parse and execute voice command
    async processVoiceCommand(transcript) {
        console.log('🎤 Processing voice command:', transcript);

        const parsedCommand = this.processor.parseCommand(transcript);
        console.log('📋 Parsed command:', parsedCommand);

        const result = await this.executeCommand(parsedCommand);
        console.log('✅ Execution result:', result);

        return result;
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedCommandProcessor, EnhancedCommandExecutor };
} else {
    window.EnhancedCommandProcessor = EnhancedCommandProcessor;
    window.EnhancedCommandExecutor = EnhancedCommandExecutor;
}

console.log('🎯 Enhanced Command Processing System Loaded');