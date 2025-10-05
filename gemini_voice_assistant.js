// Comprehensive Gemini AI Voice Assistant
// Handles ANY web navigation command through natural language processing

class GeminiVoiceAssistant {
    constructor() {
        this.geminiApiKey = null;
        this.isInitialized = false;
        this.conversationHistory = [];
        this.currentContext = null;

        console.log('🤖 Gemini Voice Assistant initializing...');
        this.initialize();
    }

    async initialize() {
        try {
            const result = await chrome.storage.local.get(['geminiApiKey']);
            this.geminiApiKey = result.geminiApiKey;
            this.isInitialized = !!this.geminiApiKey;

            if (this.isInitialized) {
                console.log('✅ Gemini Voice Assistant ready with API key');
                await this.loadCurrentContext();
            } else {
                console.log('⚠️ Gemini API key not found - assistant disabled');
            }
        } catch (error) {
            console.error('❌ Error initializing Gemini Voice Assistant:', error);
            this.isInitialized = false;
        }
    }

    async setApiKey(apiKey) {
        this.geminiApiKey = apiKey;
        this.isInitialized = !!apiKey;

        await chrome.storage.local.set({ geminiApiKey: apiKey });
        console.log('🔑 Gemini API key updated:', this.isInitialized ? 'enabled' : 'disabled');

        if (this.isInitialized) {
            await this.loadCurrentContext();
        }

        return { success: true, enabled: this.isInitialized };
    }

    async loadCurrentContext() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                this.currentContext = {
                    url: activeTab.url,
                    title: activeTab.title,
                    domain: new URL(activeTab.url).hostname,
                    tabId: activeTab.id
                };
                console.log('📍 Current context loaded:', this.currentContext);
            }
        } catch (error) {
            console.error('Error loading context:', error);
            this.currentContext = null;
        }
    }

    async processVoiceCommand(transcript) {
        console.log('🎤 Processing voice command with Gemini:', transcript);

        if (!this.isInitialized) {
            return {
                success: false,
                message: 'Gemini AI not configured. Please add your API key.',
                needsSetup: true
            };
        }

        try {
            // Update context with current page
            await this.loadCurrentContext();

            // Get browser state for context
            const browserContext = await this.getBrowserContext();

            // Create AI prompt for command interpretation
            const prompt = this.createCommandPrompt(transcript, browserContext);

            // Get AI interpretation
            const aiResponse = await this.callGeminiAPI(prompt);
            const parsedCommand = this.parseAIResponse(aiResponse);

            if (!parsedCommand.success) {
                return parsedCommand;
            }

            // Execute the command
            const result = await this.executeCommand(parsedCommand);

            // Add to conversation history for better context
            this.addToHistory(transcript, result);

            console.log('✅ Command executed:', result);
            return result;

        } catch (error) {
            console.error('❌ Voice command processing error:', error);
            return {
                success: false,
                message: `Error processing command: ${error.message}`,
                error: error.message
            };
        }
    }

    createCommandPrompt(transcript, browserContext) {
        const contextInfo = this.currentContext ? 
            `Currently on: ${this.currentContext.title} (${this.currentContext.domain})` : 
            'No active page';

        return `You are Rupert, an intelligent web navigation assistant. Analyze this voice command and return a JSON response with the appropriate web action.

**Current Browser Context:**
${contextInfo}
${JSON.stringify(browserContext, null, 2)}

**Voice Command:** "${transcript}"

**Your Capabilities:**
1. **Navigation**: Open any website, go back/forward, refresh pages
2. **Tab Management**: Create, close, switch between tabs
3. **Search**: Search Google, search within specific sites
4. **Page Interaction**: Scroll, click elements, fill forms, find text
5. **Website-Specific Actions**: Navigate Amazon, YouTube, social media, etc.

**Available Actions:**
- **navigate**: Go to any website
- **search**: Search Google or site-specific search
- **new_tab**: Open new tab with optional URL
- **close_tab**: Close current or specific tab
- **switch_tab**: Switch to specific tab
- **scroll**: Scroll page (up/down/to_element)
- **click**: Click on page elements
- **type**: Type text into input fields
- **find**: Find text on page
- **extract**: Get information from page
- **wait**: Wait for page elements to load

**Response Format (JSON only):**
{
  "success": true,
  "action": "action_name",
  "target": "specific_target",
  "data": "additional_data",
  "url": "https://example.com",
  "confidence": 0.0-1.0,
  "explanation": "What I will do",
  "next_steps": ["Optional follow-up actions"]
}

**Examples:**

Command: "open amazon"
Response: {"success": true, "action": "navigate", "url": "https://amazon.com", "confidence": 0.95, "explanation": "Opening Amazon website"}

Command: "search for wireless headphones"
Response: {"success": true, "action": "search", "target": "wireless headphones", "url": "https://www.google.com/search?q=wireless+headphones", "confidence": 0.9, "explanation": "Searching Google for wireless headphones"}

Command: "scroll down"
Response: {"success": true, "action": "scroll", "target": "down", "confidence": 0.95, "explanation": "Scrolling down on current page"}

Command: "find the search box and search for laptops"
Response: {"success": true, "action": "type", "target": "search", "data": "laptops", "confidence": 0.85, "explanation": "Finding search box and searching for laptops"}

Command: "go to the second tab"
Response: {"success": true, "action": "switch_tab", "target": 2, "confidence": 0.9, "explanation": "Switching to tab number 2"}

**Important:**
- Always provide a confidence score (0.5+ for execution)
- If command is unclear, ask for clarification
- Consider current page context when interpreting commands
- Return ONLY the JSON object, no other text

Analyze: "${transcript}"`;
    }

    async getBrowserContext() {
        try {
            const tabs = await chrome.tabs.query({});
            const recentHistory = this.conversationHistory.slice(-3);

            return {
                tabs: tabs.slice(0, 10).map((tab, index) => ({
                    index: index + 1,
                    title: tab.title?.substring(0, 50) + (tab.title?.length > 50 ? '...' : ''),
                    url: tab.url,
                    active: tab.active
                })),
                recent_commands: recentHistory,
                total_tabs: tabs.length
            };
        } catch (error) {
            console.error('Error getting browser context:', error);
            return { tabs: [], recent_commands: [], total_tabs: 0 };
        }
    }

    async callGeminiAPI(prompt) {
        console.log('🧠 Calling Gemini API...');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 1,
                    topP: 0.8,
                    maxOutputTokens: 2048,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from Gemini API');
        }

        console.log('🧠 Gemini response received:', text.substring(0, 200) + '...');
        return text;
    }

    parseAIResponse(responseText) {
        try {
            // Extract JSON from response (handle markdown code blocks)
            let jsonText = responseText;

            // Remove markdown code blocks if present
            const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1];
            } else {
                // Look for JSON object
                const jsonMatch = responseText.match(/{[\s\S]*}/);
                if (jsonMatch) {
                    jsonText = jsonMatch[0];
                }
            }

            const parsed = JSON.parse(jsonText);

            // Validate required fields
            if (!parsed.hasOwnProperty('success') || !parsed.action) {
                throw new Error('Invalid response format from AI');
            }

            // Check confidence threshold
            if (parsed.confidence !== undefined && parsed.confidence < 0.5) {
                return {
                    success: false,
                    message: `I'm not confident about that command (${Math.round(parsed.confidence * 100)}%). Could you please rephrase it?`,
                    confidence: parsed.confidence
                };
            }

            return parsed;

        } catch (error) {
            console.error('Error parsing AI response:', error);
            return {
                success: false,
                message: 'I had trouble understanding that command. Could you try rephrasing it?',
                error: error.message
            };
        }
    }

    async executeCommand(command) {
        console.log('⚡ Executing AI command:', command);

        try {
            switch (command.action) {
                case 'navigate':
                    return await this.executeNavigate(command);

                case 'search':
                    return await this.executeSearch(command);

                case 'new_tab':
                    return await this.executeNewTab(command);

                case 'close_tab':
                    return await this.executeCloseTab(command);

                case 'switch_tab':
                    return await this.executeSwitchTab(command);

                case 'scroll':
                    return await this.executeScroll(command);

                case 'click':
                    return await this.executeClick(command);

                case 'type':
                    return await this.executeType(command);

                case 'find':
                    return await this.executeFind(command);

                case 'refresh':
                    return await this.executeRefresh();

                default:
                    return {
                        success: false,
                        message: `Unknown action: ${command.action}. I can navigate, search, manage tabs, scroll, click, and type.`
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

    async executeNavigate(command) {
        let url = command.url || command.target;

        if (!url) {
            return { success: false, message: 'No URL specified for navigation' };
        }

        // Handle common websites without full URLs
        const siteShortcuts = {
            'amazon': 'https://amazon.com',
            'google': 'https://google.com',
            'youtube': 'https://youtube.com',
            'gmail': 'https://gmail.com',
            'github': 'https://github.com',
            'twitter': 'https://twitter.com',
            'facebook': 'https://facebook.com',
            'linkedin': 'https://linkedin.com',
            'instagram': 'https://instagram.com'
        };

        const lowerUrl = url.toLowerCase();
        if (siteShortcuts[lowerUrl]) {
            url = siteShortcuts[lowerUrl];
        } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        console.log(`🌐 Navigating to: ${url}`);
        const tab = await chrome.tabs.create({ url: url, active: true });

        return {
            success: true,
            message: command.explanation || `Navigated to ${url}`,
            url: url,
            tabId: tab.id,
            action: 'navigate'
        };
    }

    async executeSearch(command) {
        const query = command.target || command.data;
        if (!query) {
            return { success: false, message: 'No search term provided' };
        }

        let searchUrl;

        // Context-aware search
        if (this.currentContext?.domain) {
            const domain = this.currentContext.domain;

            // Site-specific searches
            if (domain.includes('amazon.com')) {
                searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
            } else if (domain.includes('youtube.com')) {
                searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            } else if (domain.includes('github.com')) {
                searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}`;
            } else {
                // Default to Google search
                searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            }
        } else {
            // Use provided URL or default to Google
            searchUrl = command.url || `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }

        console.log(`🔍 Searching for: ${query} at ${searchUrl}`);
        const tab = await chrome.tabs.create({ url: searchUrl, active: true });

        return {
            success: true,
            message: command.explanation || `Searching for "${query}"`,
            query: query,
            url: searchUrl,
            tabId: tab.id,
            action: 'search'
        };
    }

    async executeNewTab(command) {
        const url = command.url || command.target || 'chrome://newtab/';

        console.log(`📄 Opening new tab: ${url}`);
        const tab = await chrome.tabs.create({ url: url, active: true });

        return {
            success: true,
            message: command.explanation || 'Opened new tab',
            url: url,
            tabId: tab.id,
            action: 'new_tab'
        };
    }

    async executeCloseTab(command) {
        const target = command.target;

        if (typeof target === 'number') {
            // Close specific tab by number
            const tabs = await chrome.tabs.query({});
            const targetTab = tabs[target - 1];

            if (targetTab) {
                await chrome.tabs.remove(targetTab.id);
                return {
                    success: true,
                    message: `Closed tab ${target}: ${targetTab.title}`,
                    action: 'close_tab'
                };
            } else {
                return { success: false, message: `Tab ${target} not found` };
            }
        } else {
            // Close current tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const tabTitle = tabs[0].title;
                await chrome.tabs.remove(tabs[0].id);
                return {
                    success: true,
                    message: `Closed current tab: ${tabTitle}`,
                    action: 'close_tab'
                };
            } else {
                return { success: false, message: 'No active tab to close' };
            }
        }
    }

    async executeSwitchTab(command) {
        const tabNumber = parseInt(command.target);

        if (isNaN(tabNumber)) {
            return { success: false, message: 'Invalid tab number' };
        }

        const tabs = await chrome.tabs.query({});
        const targetTab = tabs[tabNumber - 1];

        if (targetTab) {
            await chrome.tabs.update(targetTab.id, { active: true });
            return {
                success: true,
                message: `Switched to tab ${tabNumber}: ${targetTab.title}`,
                action: 'switch_tab'
            };
        } else {
            return { success: false, message: `Tab ${tabNumber} not found` };
        }
    }

    async executeScroll(command) {
        const direction = command.target || 'down';
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tabs.length > 0) {
            try {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'scroll',
                    direction: direction,
                    amount: command.data || 'normal'
                });

                return {
                    success: true,
                    message: command.explanation || `Scrolled ${direction}`,
                    action: 'scroll'
                };
            } catch (error) {
                // Fallback: inject script directly
                await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: (dir) => {
                        const scrollAmount = dir === 'up' ? -500 : 500;
                        window.scrollBy(0, scrollAmount);
                    },
                    args: [direction]
                });

                return {
                    success: true,
                    message: `Scrolled ${direction}`,
                    action: 'scroll'
                };
            }
        } else {
            return { success: false, message: 'No active tab found' };
        }
    }

    async executeClick(command) {
        const target = command.target;
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tabs.length > 0) {
            await chrome.tabs.sendMessage(tabs[0].id, {
                action: 'click',
                target: target,
                data: command.data
            });

            return {
                success: true,
                message: command.explanation || `Clicked on ${target}`,
                action: 'click'
            };
        } else {
            return { success: false, message: 'No active tab found' };
        }
    }

    async executeType(command) {
        const text = command.data;
        const target = command.target;
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tabs.length > 0) {
            await chrome.tabs.sendMessage(tabs[0].id, {
                action: 'type',
                target: target,
                text: text
            });

            return {
                success: true,
                message: command.explanation || `Typed "${text}" in ${target}`,
                action: 'type'
            };
        } else {
            return { success: false, message: 'No active tab found' };
        }
    }

    async executeFind(command) {
        const searchText = command.target || command.data;
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tabs.length > 0) {
            await chrome.tabs.sendMessage(tabs[0].id, {
                action: 'find',
                text: searchText
            });

            return {
                success: true,
                message: command.explanation || `Looking for "${searchText}" on page`,
                action: 'find'
            };
        } else {
            return { success: false, message: 'No active tab found' };
        }
    }

    async executeRefresh() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tabs.length > 0) {
            await chrome.tabs.reload(tabs[0].id);
            return {
                success: true,
                message: 'Page refreshed',
                action: 'refresh'
            };
        } else {
            return { success: false, message: 'No active tab found' };
        }
    }

    addToHistory(command, result) {
        this.conversationHistory.push({
            timestamp: Date.now(),
            command: command,
            result: result,
            context: this.currentContext?.domain
        });

        // Keep only last 10 commands
        if (this.conversationHistory.length > 10) {
            this.conversationHistory.shift();
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            hasApiKey: !!this.geminiApiKey,
            currentContext: this.currentContext,
            historyLength: this.conversationHistory.length,
            capabilities: [
                'Website Navigation',
                'Smart Search', 
                'Tab Management',
                'Page Interaction',
                'Form Filling',
                'Content Finding'
            ]
        };
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiVoiceAssistant;
} else {
    window.GeminiVoiceAssistant = GeminiVoiceAssistant;
}

console.log('🤖 Gemini Voice Assistant System Loaded');