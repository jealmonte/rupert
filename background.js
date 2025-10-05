// Enhanced Background.js with Hardcoded Voice Commands
// Integrates specific commands: "hey rupert open new tab" and "hey rupert open amazon"

console.log('🎤 Rupert Enhanced Background Service Worker Starting...');

// Import enhanced command processing
let commandExecutor = null;

// ===== ENHANCED STATE MANAGEMENT =====
let extensionState = {
    isEnabled: false,
    isListening: false,
    isAwake: false,
    lastActivity: Date.now(),
    activeTab: null,
    permissionsGranted: false,
    microphonePermission: false
};

let currentTabId = null;
let allTabs = [];

// ===== SERVICE WORKER INITIALIZATION =====
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('🔧 Rupert Extension Installed/Updated:', details.reason);

    try {
        // Initialize command executor
        commandExecutor = new EnhancedCommandExecutor();
        console.log('⚡ Command executor initialized');

        // Load saved state
        const savedState = await chrome.storage.local.get(['extensionState']);
        if (savedState.extensionState) {
            extensionState = { ...extensionState, ...savedState.extensionState };
        }

        // Check initial permissions
        await checkAllPermissions();

        // Initialize wake word detection on all tabs if permissions are granted
        if (extensionState.permissionsGranted) {
            await initializeAllTabs();
        }

        updateExtensionBadge();
        console.log('📊 Initial State Loaded:', extensionState);

    } catch (error) {
        console.error('❌ Initialization Error:', error);
    }
});

// ===== PERMISSION MANAGEMENT =====
async function checkAllPermissions() {
    console.log('🔍 Checking all permissions...');
    try {
        const data = await chrome.storage.local.get(['microphonePermission']);
        extensionState.microphonePermission = data.microphonePermission || false;
        extensionState.permissionsGranted = extensionState.microphonePermission;

        console.log('Permission status:', {
            microphone: extensionState.microphonePermission,
            overall: extensionState.permissionsGranted
        });

        return extensionState.permissionsGranted;
    } catch (error) {
        console.error('Permission check error:', error);
        return false;
    }
}

async function handlePermissionGranted() {
    console.log('✅ Microphone permission granted');
    extensionState.microphonePermission = true;
    extensionState.permissionsGranted = true;

    // Save permission state
    await chrome.storage.local.set({
        microphonePermission: true,
        extensionState: extensionState
    });

    // Initialize wake word detection
    if (extensionState.isEnabled) {
        await initializeAllTabs();
        await startWakeWordDetection();
    }

    updateExtensionBadge();
}

async function handlePermissionDenied() {
    console.log('❌ Microphone permission denied');
    extensionState.microphonePermission = false;
    extensionState.permissionsGranted = false;
    extensionState.isEnabled = false;
    extensionState.isListening = false;

    // Save permission state
    await chrome.storage.local.set({
        microphonePermission: false,
        extensionState: extensionState
    });

    // Stop any active listening
    await stopAllListening();
    updateExtensionBadge();
}

// ===== TAB MANAGEMENT FUNCTIONS =====
async function getAllTabs() {
    try {
        const tabs = await chrome.tabs.query({});
        allTabs = tabs;
        console.log(`Found ${tabs.length} open tabs`);
        return tabs;
    } catch (error) {
        console.error('Error getting all tabs:', error);
        return [];
    }
}

async function switchToTab(tabId) {
    try {
        await chrome.tabs.update(tabId, { active: true });
        const tab = await chrome.tabs.get(tabId);
        await chrome.windows.update(tab.windowId, { focused: true });
        currentTabId = tabId;
        extensionState.activeTab = tabId;
        console.log(`Switched to tab: ${tab.title}`);
        return { success: true, tab: tab };
    } catch (error) {
        console.error('Error switching to tab:', error);
        return { success: false, error: error.message };
    }
}

async function createNewTab(url = 'chrome://newtab/') {
    try {
        const tab = await chrome.tabs.create({ url: url, active: true });
        currentTabId = tab.id;
        extensionState.activeTab = tab.id;
        return { success: true, tab: tab };
    } catch (error) {
        console.error('Error creating new tab:', error);
        return { success: false, error: error.message };
    }
}

// ===== WAKE WORD DETECTION FUNCTIONS =====
async function initializeAllTabs() {
    if (!extensionState.permissionsGranted) {
        console.log('Cannot initialize tabs: permissions not granted');
        return;
    }

    try {
        const tabs = await chrome.tabs.query({});
        let initializedCount = 0;

        for (const tab of tabs) {
            try {
                await initializeWakeWordInTab(tab.id);
                initializedCount++;
            } catch (error) {
                // Some tabs can't be initialized (chrome://, etc.)
            }
        }

        console.log(`Initialized wake word detection in ${initializedCount}/${tabs.length} tabs`);
    } catch (error) {
        console.error('Error initializing all tabs:', error);
    }
}

async function initializeWakeWordInTab(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                if (window.wakeWordDetector && typeof window.wakeWordDetector.initialize === 'function') {
                    window.wakeWordDetector.initialize();
                }
            }
        });
        console.log(`Wake word detector initialized in tab ${tabId}`);
    } catch (error) {
        // Tab might not support content scripts
        console.log(`Cannot initialize wake word in tab ${tabId}:`, error.message);
    }
}

async function startWakeWordDetection() {
    if (!extensionState.permissionsGranted) {
        console.log('Cannot start wake word detection: permissions not granted');
        return { success: false, error: 'Microphone permission not granted' };
    }

    try {
        const tabs = await chrome.tabs.query({});
        let startedCount = 0;

        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, { 
                    type: 'START_WAKE_WORD_DETECTION',
                    action: 'start_wake_word_detection' 
                });
                startedCount++;
            } catch (error) {
                // Ignore tabs without content scripts
            }
        }

        extensionState.isListening = true;
        await chrome.storage.local.set({ extensionState });
        updateExtensionBadge();

        console.log(`Wake word detection started on ${startedCount}/${tabs.length} tabs`);
        return { success: true, message: `Started on ${startedCount} tabs` };
    } catch (error) {
        console.error('Error starting wake word detection:', error);
        return { success: false, error: error.message };
    }
}

async function stopWakeWordDetection() {
    try {
        const tabs = await chrome.tabs.query({});
        let stoppedCount = 0;

        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, { 
                    type: 'STOP_WAKE_WORD_DETECTION',
                    action: 'stop_wake_word_detection' 
                });
                stoppedCount++;
            } catch (error) {
                // Ignore errors
            }
        }

        extensionState.isListening = false;
        extensionState.isAwake = false;
        await chrome.storage.local.set({ extensionState });
        updateExtensionBadge();

        console.log(`Wake word detection stopped on ${stoppedCount}/${tabs.length} tabs`);
        return { success: true };
    } catch (error) {
        console.error('Error stopping wake word detection:', error);
        return { success: false, error: error.message };
    }
}

async function stopAllListening() {
    await stopWakeWordDetection();
    console.log('🛑 All listening stopped');
}

// ===== ENHANCED VOICE COMMAND PROCESSING =====
async function processVoiceCommand(transcript) {
    console.log('🗣️ Processing voice command:', transcript);

    if (!transcript || transcript.trim().length === 0) {
        return { success: false, message: 'No command detected' };
    }

    try {
        // Show processing indicator
        if (extensionState.activeTab) {
            chrome.tabs.sendMessage(extensionState.activeTab, {
                type: 'UPDATE_LISTENING_STATUS',
                state: 'processing',
                message: 'Processing command...'
            }).catch(() => {});
        }

        updateExtensionBadge();

        // Use enhanced command processor for hardcoded commands
        if (!commandExecutor) {
            commandExecutor = new EnhancedCommandExecutor();
        }

        console.log('🎯 Processing with enhanced command executor...');
        const result = await commandExecutor.processVoiceCommand(transcript);

        console.log('✅ Command processing result:', result);

        // Update badge and hide indicator based on result
        updateExtensionBadge();

        // Hide listening indicator after delay
        setTimeout(async () => {
            extensionState.isAwake = false;
            await stopAllListening();
            updateExtensionBadge();
        }, 2000);

        // Notify popup
        try {
            chrome.runtime.sendMessage({
                type: result.success ? 'COMMAND_PROCESSED' : 'COMMAND_ERROR',
                result: result.message,
                error: result.success ? null : result.message
            });
        } catch (e) {
            // Popup might not be open
        }

        return result;

    } catch (error) {
        console.error('Voice command processing error:', error);

        // Hide indicators and reset state
        setTimeout(async () => {
            extensionState.isAwake = false;
            await stopAllListening();
            updateExtensionBadge();
        }, 2000);

        // Notify popup of error
        try {
            chrome.runtime.sendMessage({
                type: 'COMMAND_ERROR',
                error: error.message
            });
        } catch (e) {
            // Popup might not be open
        }

        return { success: false, message: 'Error processing command: ' + error.message };
    }
}

async function handleWakeWord(keyword) {
    console.log('👂 Wake word detected:', keyword);
    extensionState.isAwake = true;
    extensionState.lastActivity = Date.now();

    // Show listening indicator on active tab
    if (extensionState.activeTab) {
        chrome.tabs.sendMessage(extensionState.activeTab, {
            type: 'SHOW_LISTENING_INDICATOR',
            state: 'listening',
            message: 'Listening for command...'
        }).catch(() => {});
    }

    // Notify popup
    try {
        chrome.runtime.sendMessage({ type: 'WAKE_WORD_DETECTED' });
    } catch (e) {
        // Popup might not be open
    }

    updateExtensionBadge();

    // Start listening timeout
    setTimeout(async () => {
        if (extensionState.isAwake) {
            console.log('⏰ Wake word timeout');
            extensionState.isAwake = false;
            await stopAllListening();
            updateExtensionBadge();
        }
    }, 10000); // 10 second timeout

    return { success: true, message: 'Wake word detected, listening for command...' };
}

// ===== MESSAGE HANDLING =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action || request.type);

    const handleMessage = async () => {
        try {
            extensionState.lastActivity = Date.now();
            const action = request.action || request.type;

            switch (action) {
                // Permission-related messages
                case 'permissions_granted':
                    await handlePermissionGranted();
                    return { success: true };

                case 'permissions_denied':
                    await handlePermissionDenied();
                    return { success: true };

                // Wake word and voice command messages
                case 'wake_word_detected':
                    return await handleWakeWord(request.keyword || request.transcript);

                case 'voice_command':
                    return await processVoiceCommand(request.transcript);

                // Extension control messages
                case 'GET_EXTENSION_STATUS':
                    return {
                        success: true,
                        isEnabled: extensionState.isEnabled,
                        isListening: extensionState.isListening,
                        isAwake: extensionState.isAwake,
                        lastActivity: extensionState.lastActivity,
                        activeTab: extensionState.activeTab,
                        permissionsGranted: extensionState.permissionsGranted,
                        microphonePermission: extensionState.microphonePermission
                    };

                case 'TOGGLE_EXTENSION':
                    if (!extensionState.permissionsGranted) {
                        return { success: false, error: 'Microphone permission not granted' };
                    }

                    extensionState.isEnabled = !extensionState.isEnabled;

                    if (extensionState.isEnabled) {
                        const startResult = await startWakeWordDetection();
                        console.log(`Extension enabled, wake word detection: ${startResult.success ? 'started' : 'failed'}`);
                    } else {
                        await stopAllListening();
                        console.log('Extension disabled, all listening stopped');
                    }

                    await chrome.storage.local.set({ extensionState });
                    updateExtensionBadge();
                    return { success: true, isEnabled: extensionState.isEnabled };

                case 'START_WAKE_WORD_DETECTION':
                    if (!extensionState.permissionsGranted) {
                        return { success: false, error: 'Microphone permission not granted' };
                    }
                    return await startWakeWordDetection();

                case 'STOP_WAKE_WORD_DETECTION':
                    return await stopWakeWordDetection();

                // Content script readiness
                case 'CONTENT_SCRIPT_READY':
                    console.log('📄 Content script ready in tab', sender.tab?.id || 'unknown');
                    if (extensionState.isEnabled && extensionState.permissionsGranted && sender.tab) {
                        await initializeWakeWordInTab(sender.tab.id);
                    }
                    return {
                        success: true,
                        extensionState: extensionState,
                        message: 'Background script connected'
                    };

                // Get available commands
                case 'GET_AVAILABLE_COMMANDS':
                    if (!commandExecutor) {
                        commandExecutor = new EnhancedCommandExecutor();
                    }
                    return {
                        success: true,
                        commands: commandExecutor.processor.getAvailableCommands()
                    };

                default:
                    console.warn('Unknown message type:', action);
                    return { success: false, error: 'Unknown message type' };
            }

        } catch (error) {
            console.error('Message handling error:', error);
            return { success: false, error: error.message };
        }
    };

    handleMessage().then(sendResponse);
    return true; // Keep message channel open for async response
});

// ===== UTILITY FUNCTIONS =====
function updateExtensionBadge() {
    try {
        let badgeText = '';
        let badgeColor = '#EF4444';

        if (!extensionState.permissionsGranted) {
            badgeText = '!';
            badgeColor = '#F59E0B';
        } else if (extensionState.isEnabled) {
            if (extensionState.isAwake) {
                badgeText = '👂';
                badgeColor = '#22C55E';
            } else if (extensionState.isListening) {
                badgeText = '●';
                badgeColor = '#1B365D';
            } else {
                badgeText = '○';
                badgeColor = '#6B7280';
            }
        }

        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: badgeColor });

        console.log(`Badge updated: ${badgeText} (${badgeColor})`);
    } catch (error) {
        console.warn('Badge update failed:', error);
    }
}

// ===== TAB EVENT LISTENERS =====
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    currentTabId = activeInfo.tabId;
    extensionState.activeTab = activeInfo.tabId;
    console.log(`Tab activated: ${activeInfo.tabId}`);

    if (extensionState.isEnabled && extensionState.permissionsGranted) {
        await initializeWakeWordInTab(activeInfo.tabId);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && extensionState.isEnabled && extensionState.permissionsGranted) {
        await initializeWakeWordInTab(tabId);
        console.log(`Tab ${tabId} loaded: ${tab.url}`);
    }
});

// ===== ENHANCED COMMAND PROCESSING CLASSES =====
// Enhanced Command Processor with Hardcoded Commands
class EnhancedCommandProcessor {
    constructor() {
        this.hardcodedCommands = this.initializeHardcodedCommands();
        console.log('🎯 Enhanced Command Processor initialized with hardcoded commands');
    }

    initializeHardcodedCommands() {
        return {
            new_tab: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:open\s+(?:a\s+)?new\s+tab|new\s+tab|create\s+(?:a\s+)?new\s+tab)/i,
                    /(?:hey rupert,?\s+)?(?:open\s+tab|new\s+browser\s+tab)/i
                ],
                action: 'new_tab',
                confidence: 0.95,
                description: 'Opens a new browser tab'
            },
            open_amazon: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:open\s+amazon|go\s+to\s+amazon|amazon\.com)/i,
                    /(?:hey rupert,?\s+)?(?:navigate\s+to\s+amazon|visit\s+amazon)/i
                ],
                action: 'open_website',
                url: 'https://amazon.com',
                confidence: 0.95,
                description: 'Opens Amazon.com in a new tab'
            },
            search_web: {
                patterns: [
                    /(?:hey rupert,?\s+)?(?:search\s+(?:for\s+)?(.+)|google\s+(?:search\s+)?(.+))/i
                ],
                action: 'search',
                confidence: 0.85,
                description: 'Searches Google for the specified term'
            }
        };
    }

    parseCommand(transcript) {
        console.log('🔍 Parsing command:', transcript);

        if (!transcript || transcript.trim().length === 0) {
            return { action: 'unknown', confidence: 0 };
        }

        const cleanTranscript = transcript.toLowerCase().trim();

        // Check hardcoded commands
        for (const [commandKey, command] of Object.entries(this.hardcodedCommands)) {
            for (const pattern of command.patterns) {
                const match = cleanTranscript.match(pattern);
                if (match) {
                    console.log(`🎯 Matched hardcoded command: ${commandKey}`);

                    const result = {
                        action: command.action,
                        confidence: command.confidence,
                        explanation: command.description,
                        matched_command: commandKey
                    };

                    // Add URL for website commands
                    if (command.url) {
                        result.url = command.url;
                    }

                    // Extract search terms
                    if (command.action === 'search' && match[1]) {
                        result.target = match[1].trim();
                    }

                    return result;
                }
            }
        }

        return { action: 'unknown', confidence: 0, transcript: cleanTranscript };
    }
}

// Enhanced Command Executor
class EnhancedCommandExecutor {
    constructor() {
        this.processor = new EnhancedCommandProcessor();
        console.log('⚡ Enhanced Command Executor initialized');
    }

    async executeCommand(parsedCommand) {
        console.log('⚡ Executing enhanced command:', parsedCommand);

        if (parsedCommand.confidence < 0.7) {
            return {
                success: false,
                message: `I'm not confident about that command. Try "hey rupert open new tab" or "hey rupert open amazon".`
            };
        }

        try {
            switch (parsedCommand.action) {
                case 'new_tab':
                    const newTab = await chrome.tabs.create({ url: 'chrome://newtab/', active: true });
                    return {
                        success: true,
                        message: 'Opened a new tab',
                        tabId: newTab.id
                    };

                case 'open_website':
                    const websiteTab = await chrome.tabs.create({ url: parsedCommand.url, active: true });
                    return {
                        success: true,
                        message: parsedCommand.explanation,
                        tabId: websiteTab.id
                    };

                case 'search':
                    if (!parsedCommand.target) {
                        return { success: false, message: 'No search term provided' };
                    }
                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(parsedCommand.target)}`;
                    const searchTab = await chrome.tabs.create({ url: searchUrl, active: true });
                    return {
                        success: true,
                        message: `Searching Google for "${parsedCommand.target}"`,
                        tabId: searchTab.id
                    };

                default:
                    return {
                        success: false,
                        message: 'Unknown command. Try "hey rupert open new tab" or "hey rupert open amazon".'
                    };
            }
        } catch (error) {
            console.error('Command execution error:', error);
            return {
                success: false,
                message: `Error executing command: ${error.message}`
            };
        }
    }

    async processVoiceCommand(transcript) {
        console.log('🎤 Processing voice command:', transcript);

        const parsedCommand = this.processor.parseCommand(transcript);
        console.log('📋 Parsed command:', parsedCommand);

        const result = await this.executeCommand(parsedCommand);
        console.log('✅ Execution result:', result);

        return result;
    }
}

console.log('✅ Enhanced Rupert Background Service Worker Initialized with Hardcoded Commands');
console.log('🎯 Supported commands: "hey rupert open new tab", "hey rupert open amazon"');