// Rupert AI Voice Assistant - Background Script with CURRENT WORKING GEMINI MODEL
console.log('🚀 Rupert AI Voice Assistant Starting (Current Model)...');

let geminiAssistant = null;

// State management
let extensionState = {
    isEnabled: false,
    isListening: false,
    isAwake: false,
    lastActivity: Date.now(),
    activeTab: null,
    permissionsGranted: false,
    microphonePermission: false,
    geminiConfigured: false
};

// Gemini Voice Assistant Class with CURRENT WORKING MODEL
class GeminiVoiceAssistant {
    constructor() {
        this.geminiApiKey = null;
        this.isInitialized = false;
        this.initialize();
        console.log('🤖 GeminiVoiceAssistant constructed with current working model');
    }

    async initialize() {
        try {
            const result = await chrome.storage.local.get(['geminiApiKey']);
            this.geminiApiKey = result.geminiApiKey;
            this.isInitialized = !!this.geminiApiKey;
            console.log('🔑 Gemini initialized, has key:', !!this.geminiApiKey);
            if (this.isInitialized) {
                console.log('✅ Gemini API key length:', this.geminiApiKey.length);
            }
        } catch (error) {
            console.error('❌ Gemini initialization error:', error);
            this.isInitialized = false;
        }
    }

    async setApiKey(apiKey) {
        console.log('🔐 setApiKey called, key length:', apiKey?.length);

        if (!apiKey || apiKey.length < 20) {
            console.error('❌ Invalid API key provided');
            return { success: false, error: 'Invalid API key - must be at least 20 characters' };
        }

        this.geminiApiKey = apiKey;
        this.isInitialized = true;

        try {
            await chrome.storage.local.set({ geminiApiKey: apiKey });
            console.log('✅ API key stored successfully in Chrome storage');
            return { success: true, enabled: true, message: 'API key saved successfully' };
        } catch (error) {
            console.error('❌ Error storing API key:', error);
            this.isInitialized = false;
            return { success: false, error: 'Failed to store API key: ' + error.message };
        }
    }

    async processVoiceCommand(transcript) {
        console.log('🎯 Processing voice command:', transcript);

        if (!this.isInitialized) {
            console.error('❌ Gemini AI not configured');
            return { success: false, message: 'Gemini AI not configured - please add API key' };
        }

        if (!transcript || transcript.trim().length === 0) {
            console.error('❌ Empty transcript provided');
            return { success: false, message: 'No command provided' };
        }

        try {
            console.log('📡 Calling Gemini API for command processing...');
            const prompt = this.createCommandPrompt(transcript.trim());
            const aiResponse = await this.callGeminiAPI(prompt);
            console.log('📥 Raw AI response received:', aiResponse.substring(0, 200) + '...');

            const parsedCommand = this.parseAIResponse(aiResponse);
            console.log('🔍 Parsed command:', parsedCommand);

            if (!parsedCommand.success) {
                return parsedCommand;
            }

            console.log('⚡ Executing command:', parsedCommand.action);
            return await this.executeCommand(parsedCommand);
        } catch (error) {
            console.error('❌ Voice command processing error:', error);
            return { 
                success: false, 
                message: 'Error processing command: ' + error.message,
                error: error.message 
            };
        }
    }

    createCommandPrompt(transcript) {
        return `You are Rupert, an AI voice assistant for web browsing. Analyze this voice command and return a JSON response.

Voice Command: "${transcript}"

Available actions:
- navigate: Go to a website (provide full URL in "url" field)
- search: Search Google (provide search terms in "query" field)
- newtab: Open new tab
- closetab: Close current tab  
- scroll: Scroll page (provide "up" or "down" in "direction" field)

Response format (return ONLY valid JSON):
{
  "success": true,
  "action": "navigate",
  "url": "https://example.com",
  "query": "search terms",
  "direction": "up",
  "confidence": 0.85,
  "explanation": "Opening example.com"
}

For navigation commands like "open Amazon", "go to YouTube", etc., use action "navigate" with full URLs.
For search commands like "search for cats", use action "search" with the search terms.
For scroll commands, use action "scroll" with direction "up" or "down".

Return ONLY valid JSON, no other text.`;
    }

    async callGeminiAPI(prompt) {
        console.log('📡 Making Gemini API request with CURRENT WORKING MODEL...');

        // UPDATED: Using the v1 API with the current working model name
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${this.geminiApiKey}`;

        try {
            console.log('🔗 Using API v1 with model: gemini-pro');
            const response = await fetch(url, {
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
                        maxOutputTokens: 1024
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Gemini API HTTP error:', response.status, errorText);

                // If v1 fails, try v1beta with different model
                console.log('🔄 Trying fallback model...');
                return await this.callGeminiFallback(prompt);
            }

            const data = await response.json();
            console.log('📊 Gemini API raw response:', data);

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No candidates in Gemini response');
            }

            const responseText = data.candidates[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                throw new Error('No response text from Gemini API');
            }

            console.log('✅ Gemini API response text received, length:', responseText.length);
            return responseText;
        } catch (error) {
            console.error('❌ Gemini API call failed:', error);
            console.log('🔄 Trying fallback approach...');
            return await this.callGeminiFallback(prompt);
        }
    }

    async callGeminiFallback(prompt) {
        console.log('🔄 Using fallback API approach...');

        // Try with different API version and model
        const fallbackUrls = [
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.geminiApiKey}`,
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${this.geminiApiKey}`,
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`
        ];

        for (const url of fallbackUrls) {
            try {
                console.log('🔗 Trying URL:', url);
                const response = await fetch(url, {
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
                            maxOutputTokens: 1024
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (responseText) {
                        console.log('✅ Fallback API succeeded with:', url);
                        return responseText;
                    }
                }
            } catch (error) {
                console.log('❌ Fallback attempt failed:', error.message);
                continue;
            }
        }

        // If all API calls fail, use manual command parsing
        console.log('🔧 All API calls failed, using manual parsing');
        return this.parseCommandManually(prompt);
    }

    parseCommandManually(prompt) {
        // Extract the voice command from the prompt
        const commandMatch = prompt.match(/Voice Command: "(.+?)"/);
        const command = commandMatch ? commandMatch[1].toLowerCase() : '';

        console.log('🔧 Manual parsing for command:', command);

        // Manual command detection
        if (command.includes('open') || command.includes('go to')) {
            if (command.includes('amazon')) {
                return JSON.stringify({
                    success: true,
                    action: 'navigate',
                    url: 'https://amazon.com',
                    explanation: 'Opening Amazon'
                });
            } else if (command.includes('google')) {
                return JSON.stringify({
                    success: true,
                    action: 'navigate',
                    url: 'https://google.com',
                    explanation: 'Opening Google'
                });
            } else if (command.includes('youtube')) {
                return JSON.stringify({
                    success: true,
                    action: 'navigate',
                    url: 'https://youtube.com',
                    explanation: 'Opening YouTube'
                });
            } else if (command.includes('new tab')) {
                return JSON.stringify({
                    success: true,
                    action: 'newtab',
                    explanation: 'Opening new tab'
                });
            }
        } else if (command.includes('search')) {
            const searchTerms = command.replace(/.*search (for )?/i, '').trim();
            return JSON.stringify({
                success: true,
                action: 'search',
                query: searchTerms || 'search query',
                explanation: `Searching for ${searchTerms}`
            });
        } else if (command.includes('scroll')) {
            const direction = command.includes('up') ? 'up' : 'down';
            return JSON.stringify({
                success: true,
                action: 'scroll',
                direction: direction,
                explanation: `Scrolling ${direction}`
            });
        } else if (command.includes('close')) {
            return JSON.stringify({
                success: true,
                action: 'closetab',
                explanation: 'Closing current tab'
            });
        }

        // Default fallback
        return JSON.stringify({
            success: false,
            message: 'Could not understand the command. Try saying "Hey Rupert, open Google" or "Hey Rupert, search for cats"'
        });
    }

    parseAIResponse(responseText) {
        try {
            console.log('🔍 Parsing AI response:', responseText);

            // Try to extract JSON from the response
            let jsonText = responseText.trim();

            // Look for JSON block markers
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                            responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                            responseText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                jsonText = jsonMatch[1] || jsonMatch[0];
                console.log('📋 Extracted JSON text:', jsonText);
            }

            const parsed = JSON.parse(jsonText);
            console.log('✅ Successfully parsed JSON:', parsed);

            // Validate required fields
            if (!parsed.success) {
                console.error('❌ AI response indicates failure:', parsed);
                return { 
                    success: false, 
                    message: parsed.message || 'AI could not process the command' 
                };
            }

            if (!parsed.action) {
                console.error('❌ No action specified in AI response');
                return { 
                    success: false, 
                    message: 'No action specified in AI response' 
                };
            }

            console.log('✅ Valid command parsed:', parsed.action);
            return parsed;

        } catch (error) {
            console.error('❌ JSON parse error:', error);
            console.log('Raw response that failed to parse:', responseText);

            // If JSON parsing fails, try manual parsing
            const manualResult = this.parseCommandManually(responseText);
            try {
                return JSON.parse(manualResult);
            } catch (e) {
                return { 
                    success: false, 
                    message: 'Could not understand the command. Please try rephrasing.' 
                };
            }
        }
    }

    async executeCommand(command) {
        console.log('⚡ Executing command:', command.action, command);

        try {
            switch (command.action.toLowerCase()) {
                case 'navigate':
                    return await this.executeNavigate(command);
                case 'search':
                    return await this.executeSearch(command);
                case 'newtab':
                    return await this.executeNewTab();
                case 'closetab':
                    return await this.executeCloseTab();
                case 'scroll':
                    return await this.executeScroll(command);
                default:
                    console.error('❌ Unknown action:', command.action);
                    return { 
                        success: false, 
                        message: `Unknown action: ${command.action}. Available actions: navigate, search, newtab, closetab, scroll` 
                    };
            }
        } catch (error) {
            console.error('❌ Command execution error:', error);
            return { 
                success: false, 
                message: 'Execution error: ' + error.message,
                error: error.message 
            };
        }
    }

    async executeNavigate(command) {
        console.log('🌐 Executing navigation to:', command.url);

        let url = command.url || command.target || command.site;

        if (!url) {
            console.error('❌ No URL provided for navigation');
            return { success: false, message: 'No URL provided for navigation' };
        }

        // Handle common site shortcuts
        const shortcuts = {
            'amazon': 'https://amazon.com',
            'google': 'https://google.com',
            'youtube': 'https://youtube.com',
            'github': 'https://github.com',
            'facebook': 'https://facebook.com',
            'twitter': 'https://twitter.com',
            'reddit': 'https://reddit.com',
            'netflix': 'https://netflix.com'
        };

        if (shortcuts[url.toLowerCase()]) {
            url = shortcuts[url.toLowerCase()];
            console.log('🔗 Using shortcut URL:', url);
        } else if (url && !url.startsWith('http')) {
            if (!url.includes('.')) {
                // If no domain, search instead
                console.log('🔍 No domain found, switching to search');
                return await this.executeSearch({ query: url });
            }
            url = 'https://' + url;
        }

        try {
            const tab = await chrome.tabs.create({ url: url, active: true });
            console.log('✅ Navigation successful, tab ID:', tab.id);
            return { 
                success: true, 
                message: command.explanation || `Opened ${url}`,
                tabId: tab.id,
                url: url
            };
        } catch (error) {
            console.error('❌ Navigation failed:', error);
            return { 
                success: false, 
                message: 'Failed to navigate to ' + url + ': ' + error.message 
            };
        }
    }

    async executeSearch(command) {
        console.log('🔍 Executing search for:', command.query);

        const query = command.query || command.target || command.data || command.search;
        if (!query) {
            console.error('❌ No search query provided');
            return { success: false, message: 'No search term provided' };
        }

        try {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            const tab = await chrome.tabs.create({ url: searchUrl, active: true });
            console.log('✅ Search successful, tab ID:', tab.id);
            return { 
                success: true, 
                message: `Searching for "${query}"`,
                tabId: tab.id,
                query: query,
                url: searchUrl
            };
        } catch (error) {
            console.error('❌ Search failed:', error);
            return { 
                success: false, 
                message: 'Failed to search for ' + query + ': ' + error.message 
            };
        }
    }

    async executeNewTab() {
        console.log('📄 Opening new tab');

        try {
            const tab = await chrome.tabs.create({ url: 'chrome://newtab/', active: true });
            console.log('✅ New tab created, tab ID:', tab.id);
            return { 
                success: true, 
                message: 'Opened new tab',
                tabId: tab.id 
            };
        } catch (error) {
            console.error('❌ New tab failed:', error);
            return { 
                success: false, 
                message: 'Failed to open new tab: ' + error.message 
            };
        }
    }

    async executeCloseTab() {
        console.log('❌ Closing current tab');

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                await chrome.tabs.remove(tabs[0].id);
                console.log('✅ Tab closed successfully, tab ID:', tabs[0].id);
                return { success: true, message: 'Closed current tab' };
            } else {
                console.log('❌ No active tab found to close');
                return { success: false, message: 'No active tab found to close' };
            }
        } catch (error) {
            console.error('❌ Close tab failed:', error);
            return { 
                success: false, 
                message: 'Failed to close tab: ' + error.message 
            };
        }
    }

    async executeScroll(command) {
        console.log('📜 Executing scroll:', command.direction);

        const direction = command.direction || command.target || 'down';

        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tabs.length > 0) {
                await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: function(dir) {
                        const amount = dir === 'up' ? -500 : 500;
                        window.scrollBy({
                            top: amount,
                            behavior: 'smooth'
                        });
                    },
                    args: [direction.toLowerCase()]
                });
                console.log('✅ Scroll executed successfully:', direction);
                return { success: true, message: `Scrolled ${direction}` };
            } else {
                console.log('❌ No active tab found for scrolling');
                return { success: false, message: 'No active tab found' };
            }
        } catch (error) {
            console.error('❌ Scroll failed:', error);
            return { 
                success: false, 
                message: 'Cannot scroll on this page: ' + error.message 
            };
        }
    }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async function(details) {
    console.log('🔧 Extension Installed/Updated with ROBUST MODEL HANDLING:', details.reason);

    try {
        console.log('🤖 Initializing Gemini Voice Assistant with fallback support...');
        geminiAssistant = new GeminiVoiceAssistant();

        console.log('📚 Loading saved extension state...');
        const savedState = await chrome.storage.local.get(['extensionState', 'geminiApiKey', 'microphonePermission']);

        if (savedState.extensionState) {
            extensionState = Object.assign({}, extensionState, savedState.extensionState);
            console.log('📊 Restored extension state:', extensionState);
        }

        extensionState.geminiConfigured = !!savedState.geminiApiKey;
        extensionState.microphonePermission = !!savedState.microphonePermission;
        extensionState.permissionsGranted = extensionState.microphonePermission;

        console.log('🔧 Extension state initialized:', {
            geminiConfigured: extensionState.geminiConfigured,
            microphonePermission: extensionState.microphonePermission,
            permissionsGranted: extensionState.permissionsGranted
        });

        updateExtensionBadge();
        console.log('✅ AI Assistant initialized successfully with ROBUST MODEL HANDLING');
    } catch (error) {
        console.error('❌ Initialization error:', error);
    }
});

// Enhanced message handler with better error handling
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    const action = request.action || request.type;
    console.log('📨 Message received:', action, 'from:', sender.tab?.id || 'popup');

    const handleMessage = async function() {
        try {
            switch (action) {
                case 'permissions_granted':
                    console.log('✅ Microphone permissions granted');
                    extensionState.microphonePermission = true;
                    extensionState.permissionsGranted = true;
                    await chrome.storage.local.set({ 
                        microphonePermission: true, 
                        extensionState: extensionState 
                    });
                    updateExtensionBadge();
                    return { success: true, message: 'Permissions granted successfully' };

                case 'permissions_denied':
                    console.log('❌ Microphone permissions denied');
                    extensionState.microphonePermission = false;
                    extensionState.permissionsGranted = false;
                    await chrome.storage.local.set({ 
                        microphonePermission: false, 
                        extensionState: extensionState 
                    });
                    updateExtensionBadge();
                    return { success: false, message: 'Permissions denied' };

                case 'wake_word_detected':
                    console.log('👂 Wake word detected:', request.keyword);
                    return await handleWakeWord(request.keyword || 'hey rupert');

                case 'voice_command':
                    console.log('🎯 Voice command received:', request.transcript);
                    return await processVoiceCommand(request.transcript);

                case 'SET_GEMINI_API_KEY':
                    console.log('🔐 Setting Gemini API key, length:', request.apiKey?.length);
                    if (!geminiAssistant) {
                        console.log('🤖 Creating new Gemini assistant instance');
                        geminiAssistant = new GeminiVoiceAssistant();
                    }

                    const setResult = await geminiAssistant.setApiKey(request.apiKey);
                    console.log('📊 API key set result:', setResult);

                    if (setResult.success) {
                        extensionState.geminiConfigured = true;
                        await chrome.storage.local.set({ extensionState });
                        updateExtensionBadge();
                        console.log('✅ Gemini API configured successfully');
                    } else {
                        console.error('❌ Failed to configure Gemini API:', setResult.error);
                    }

                    return setResult;

                case 'GET_EXTENSION_STATUS':
                    console.log('📊 Getting extension status');
                    const status = {
                        success: true,
                        ...extensionState,
                        timestamp: Date.now()
                    };
                    console.log('📤 Returning status:', status);
                    return status;

                case 'TOGGLE_EXTENSION':
                    console.log('🔄 Toggling extension, current state:', extensionState.isEnabled);

                    if (!extensionState.permissionsGranted) {
                        console.error('❌ Cannot toggle - microphone permission not granted');
                        return { 
                            success: false, 
                            error: 'Microphone permission not granted. Please allow microphone access first.' 
                        };
                    }

                    if (!extensionState.geminiConfigured) {
                        console.error('❌ Cannot toggle - API key not configured');
                        return { 
                            success: false, 
                            error: 'Gemini API key not configured. Please add your API key first.' 
                        };
                    }

                    extensionState.isEnabled = !extensionState.isEnabled;
                    console.log('🎯 Extension toggled to:', extensionState.isEnabled);

                    await chrome.storage.local.set({ extensionState });
                    updateExtensionBadge();

                    return { 
                        success: true, 
                        isEnabled: extensionState.isEnabled,
                        message: `Extension ${extensionState.isEnabled ? 'enabled' : 'disabled'} successfully`
                    };

                case 'TEST_AI_COMMAND':
                    console.log('🧪 Testing AI command:', request.command);
                    const testResult = await processVoiceCommand(request.command || 'open google');
                    console.log('🧪 Test result:', testResult);
                    return testResult;

                default:
                    console.warn('❓ Unknown action received:', action);
                    return { 
                        success: false, 
                        error: 'Unknown action: ' + action 
                    };
            }
        } catch (error) {
            console.error('❌ Message handler error:', error);
            return { 
                success: false, 
                error: 'Message handler error: ' + error.message,
                details: error.stack 
            };
        }
    };

    // Execute async handler and send response
    handleMessage()
        .then(function(result) {
            console.log('📤 Sending response:', result);
            sendResponse(result);
        })
        .catch(function(error) {
            console.error('❌ Handler promise error:', error);
            sendResponse({ 
                success: false, 
                error: error.message,
                details: error.stack 
            });
        });

    return true; // Keep message channel open for async response
});

async function handleWakeWord(keyword) {
    console.log('👂 Processing wake word:', keyword);
    extensionState.isAwake = true;

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            extensionState.activeTab = tabs[0].id;
        }
    } catch (error) {
        console.error('❌ Error getting active tab:', error);
    }

    updateExtensionBadge('listening');

    setTimeout(() => {
        if (extensionState.isAwake) {
            extensionState.isAwake = false;
            updateExtensionBadge();
        }
    }, 15000);

    return { success: true, message: 'Wake word detected - listening for command...' };
}

async function processVoiceCommand(transcript) {
    console.log('🎯 Processing voice command:', transcript);

    if (!transcript || !extensionState.geminiConfigured) {
        const error = !transcript ? 'No transcript provided' : 'Gemini AI not configured';
        console.error('❌ Cannot process command:', error);
        return { success: false, message: error };
    }

    try {
        updateExtensionBadge('processing');

        if (!geminiAssistant) {
            console.log('🤖 Creating Gemini assistant instance for command processing');
            geminiAssistant = new GeminiVoiceAssistant();
            await geminiAssistant.initialize();
        }

        const result = await geminiAssistant.processVoiceCommand(transcript);
        console.log('✅ Command processed:', result);

        updateExtensionBadge(result.success ? 'success' : 'error');

        setTimeout(() => {
            extensionState.isAwake = false;
            updateExtensionBadge();
        }, 3000);

        return result;
    } catch (error) {
        console.error('❌ Voice command processing error:', error);

        setTimeout(() => {
            extensionState.isAwake = false;
            updateExtensionBadge();
        }, 3000);

        return { 
            success: false, 
            message: 'Error processing command: ' + error.message,
            error: error.message 
        };
    }
}

function updateExtensionBadge(status) {
    try {
        let badgeText = '';
        let badgeColor = '#EF4444';
        let title = 'Rupert AI Voice Assistant';

        if (status === 'processing') {
            badgeText = '⚡';
            badgeColor = '#F59E0B';
            title = 'Processing voice command...';
        } else if (status === 'listening') {
            badgeText = '👂';
            badgeColor = '#22C55E';
            title = 'Listening for voice command...';
        } else if (status === 'success') {
            badgeText = '✅';
            badgeColor = '#22C55E';
            title = 'Command executed successfully';
        } else if (status === 'error') {
            badgeText = '❌';
            badgeColor = '#EF4444';
            title = 'Command execution failed';
        } else if (!extensionState.permissionsGranted) {
            badgeText = '🎤';
            badgeColor = '#F59E0B';
            title = 'Microphone permission required';
        } else if (!extensionState.geminiConfigured) {
            badgeText = '🔑';
            badgeColor = '#F59E0B';
            title = 'Gemini API key required';
        } else if (extensionState.isEnabled) {
            badgeText = extensionState.isAwake ? '👂' : '🟢';
            badgeColor = extensionState.isAwake ? '#22C55E' : '#1B365D';
            title = extensionState.isAwake ? 'Listening for command...' : 'Voice assistant active';
        } else {
            badgeText = '🔴';
            badgeColor = '#6B7280';
            title = 'Voice assistant disabled';
        }

        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: badgeColor });
        chrome.action.setTitle({ title: title });
    } catch (error) {
        console.warn('❌ Badge update error:', error);
    }
}

chrome.tabs.onActivated.addListener(async function(activeInfo) {
    extensionState.activeTab = activeInfo.tabId;
    console.log('📄 Tab activated:', activeInfo.tabId);
});

console.log('🎉 Rupert AI Voice Assistant Background Script Ready with ROBUST MODEL HANDLING');