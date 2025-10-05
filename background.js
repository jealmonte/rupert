// background.js - Comprehensive Chrome Extension Service Worker for Rupert Voice Assistant
// Merged version with complete functionality

console.log('🎤 Rupert Background Service Worker Starting...');

// ===== STATE MANAGEMENT =====
let extensionState = {
    isEnabled: false,
    isListening: false,
    isAwake: false,
    lastActivity: Date.now(),
    activeTab: null
};

let currentTabId = null;
let allTabs = [];

// ===== SERVICE WORKER INITIALIZATION =====
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('🔧 Rupert Extension Installed/Updated:', details.reason);
    
    try {
        // Load saved state
        const savedState = await chrome.storage.local.get(['extensionState']);
        if (savedState.extensionState) {
            extensionState = { ...extensionState, ...savedState.extensionState };
        }
        
        // Initialize wake word detection on all tabs
        await initializeAllTabs();
        
        // Update badge
        updateBadge('😴');
        
        console.log('📊 Initial State Loaded:', extensionState);
    } catch (error) {
        console.error('❌ Initialization Error:', error);
    }
});

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

async function findTabByContent(searchText) {
    const tabs = await getAllTabs();
    const matches = tabs.filter(tab =>
        tab.title.toLowerCase().includes(searchText.toLowerCase()) ||
        tab.url.toLowerCase().includes(searchText.toLowerCase())
    );
    return matches;
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

async function closeTabs(tabIds) {
    try {
        if (Array.isArray(tabIds)) {
            await chrome.tabs.remove(tabIds);
        } else {
            await chrome.tabs.remove([tabIds]);
        }
        await getAllTabs(); // Refresh tab list
        return { success: true };
    } catch (error) {
        console.error('Error closing tabs:', error);
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

async function duplicateTab(tabId) {
    try {
        const tab = await chrome.tabs.duplicate(tabId);
        return { success: true, tab: tab };
    } catch (error) {
        console.error('Error duplicating tab:', error);
        return { success: false, error: error.message };
    }
}

async function getTabSummaries() {
    const tabs = await getAllTabs();
    return tabs.map((tab, index) => ({
        index: index + 1,
        id: tab.id,
        title: tab.title,
        url: tab.url,
        active: tab.active
    }));
}

// ===== WAKE WORD DETECTION FUNCTIONS =====
async function initializeAllTabs() {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            await initializeWakeWordInTab(tab.id);
        }
    } catch (error) {
        console.error('Error initializing all tabs:', error);
    }
}

async function initializeWakeWordInTab(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                if (window.wakeWordDetector && !window.wakeWordDetector.isInitialized) {
                    window.wakeWordDetector.initialize();
                }
            }
        });
    } catch (error) {
        // Tab might not support content scripts (chrome://, etc)
        console.log(`Cannot initialize wake word in tab ${tabId}`);
    }
}

async function startWakeWordDetection() {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { action: 'start_wake_word_detection' })
                .catch(() => {}); // Ignore errors for tabs without content scripts
        }
        console.log('Wake word detection started on all tabs');
    } catch (error) {
        console.error('Error starting wake word detection:', error);
    }
}

async function stopWakeWordDetection() {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { action: 'stop_wake_word_detection' })
                .catch(() => {}); // Ignore errors
        }
        console.log('Wake word detection stopped on all tabs');
    } catch (error) {
        console.error('Error stopping wake word detection:', error);
    }
}

// ===== GEMINI API INTEGRATION =====
async function getGeminiApiKey() {
    try {
        const result = await chrome.storage.local.get(['geminiApiKey']);
        return result.geminiApiKey;
    } catch (error) {
        console.error('Error getting API key:', error);
        return null;
    }
}

async function getGeminiCommandInterpretation(transcript) {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
        throw new Error('Gemini API key not found');
    }
    
    const tabs = await getTabSummaries();
    
    const prompt = `You are a browser voice assistant with access to all open tabs. Parse this voice command and return ONLY a JSON object with these fields:

Available tabs: ${JSON.stringify(tabs.slice(0, 10))}

Voice command: "${transcript}"

Return JSON with:
- action: "switch_tab"|"close_tab"|"new_tab"|"click_number"|"scroll"|"type"|"search"|"list_tabs"|"unknown"
- target: tab number/element number/search term (if applicable)
- confidence: 0-1 score
- explanation: brief description

Examples:
"switch to tab 3" → {"action":"switch_tab","target":3,"confidence":0.9,"explanation":"Switch to tab 3"}
"close tab 2" → {"action":"close_tab","target":2,"confidence":0.9,"explanation":"Close tab 2"}
"click number 5" → {"action":"click_number","target":5,"confidence":0.8,"explanation":"Click element 5"}
"scroll down" → {"action":"scroll","target":"down","confidence":0.9,"explanation":"Scroll down"}
"type hello world" → {"action":"type","target":"hello world","confidence":0.9,"explanation":"Type text"}
"google search dogs" → {"action":"search","target":"dogs","confidence":0.8,"explanation":"Search for dogs"}

Only return the JSON object, nothing else.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('No response from Gemini API');
        }

        // Parse JSON from response
        const jsonMatch = text.match(/{.*}/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('Invalid JSON response from Gemini');
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    }
}

async function executeCommand(command) {
    console.log('Executing command:', command);
    
    if (command.confidence < 0.5) {
        return { success: false, message: "I'm not confident about that command. Please try again." };
    }
    
    try {
        switch (command.action) {
            case 'switch_tab':
                const tabIndex = parseInt(command.target) - 1;
                const tabs = await getAllTabs();
                if (tabs[tabIndex]) {
                    await switchToTab(tabs[tabIndex].id);
                    return { success: true, message: `Switched to tab ${command.target}` };
                }
                return { success: false, message: `Tab ${command.target} not found` };
                
            case 'close_tab':
                const closeTabIndex = parseInt(command.target) - 1;
                const closeTabs = await getAllTabs();
                if (closeTabs[closeTabIndex]) {
                    await chrome.tabs.remove(closeTabs[closeTabIndex].id);
                    return { success: true, message: `Closed tab ${command.target}` };
                }
                return { success: false, message: `Tab ${command.target} not found` };
                
            case 'new_tab':
                await createNewTab();
                return { success: true, message: 'Opened new tab' };
                
            case 'click_number':
                const elementNumber = parseInt(command.target);
                return await sendToActiveTab({ 
                    action: 'click_number', 
                    number: elementNumber 
                });
                
            case 'scroll':
                return await sendToActiveTab({ 
                    action: 'scroll', 
                    direction: command.target 
                });
                
            case 'type':
                return await sendToActiveTab({ 
                    action: 'type', 
                    text: command.target 
                });
                
            case 'search':
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(command.target)}`;
                await createNewTab(searchUrl);
                return { success: true, message: `Searching for "${command.target}"` };
                
            case 'list_tabs':
                const tabList = await getTabSummaries();
                const tabNames = tabList.slice(0, 5).map(tab => `${tab.index}: ${tab.title}`).join(', ');
                return { success: true, message: `Open tabs: ${tabNames}` };
                
            default:
                return { success: false, message: "I didn't understand that command. Try saying 'help' for available commands." };
        }
    } catch (error) {
        console.error('Command execution error:', error);
        return { success: false, message: 'Error executing command' };
    }
}

async function sendToActiveTab(message) {
    try {
        const activeTab = extensionState.activeTab || currentTabId;
        if (!activeTab) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const response = await chrome.tabs.sendMessage(tabs[0].id, message);
                return response;
            }
            return { success: false, message: 'No active tab found' };
        }
        
        const response = await chrome.tabs.sendMessage(activeTab, message);
        return response;
    } catch (error) {
        console.error('Error sending message to active tab:', error);
        return { success: false, message: 'Could not communicate with tab' };
    }
}

// ===== ENHANCED MESSAGE HANDLING =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action || request.type);
    
    const handleMessage = async () => {
        try {
            extensionState.lastActivity = Date.now();
            
            // Handle both old and new message formats
            const action = request.action || request.type;
            
            switch (action) {
                // Legacy message types
                case 'wake_word_detected':
                    return await handleWakeWord(request.keyword);
                    
                case 'voice_command':
                    return await processVoiceCommand(request.transcript);
                    
                case 'request_microphone_permission':
                    return await requestMicrophonePermission();
                    
                case 'get_listening_status':
                    return {
                        isListening: extensionState.isListening,
                        isAwake: extensionState.isAwake,
                        isEnabled: extensionState.isEnabled
                    };
                    
                case 'start_listening':
                    return await startListening();
                    
                case 'stop_listening':
                    return await stopListening();
                    
                case 'set_api_key':
                    await chrome.storage.local.set({ geminiApiKey: request.apiKey });
                    return { success: true };
                    
                // Enhanced message types
                case 'GET_EXTENSION_STATUS':
                    return {
                        success: true,
                        isEnabled: extensionState.isEnabled,
                        isListening: extensionState.isListening,
                        isAwake: extensionState.isAwake,
                        lastActivity: extensionState.lastActivity,
                        activeTab: extensionState.activeTab
                    };
                    
                case 'TOGGLE_EXTENSION':
                    extensionState.isEnabled = !extensionState.isEnabled;
                    if (!extensionState.isEnabled && extensionState.isListening) {
                        await stopListeningOnAllTabs();
                    }
                    await chrome.storage.local.set({ extensionState });
                    updateExtensionBadge();
                    return { success: true, isEnabled: extensionState.isEnabled };
                    
                case 'START_LISTENING':
                    if (!extensionState.isEnabled) {
                        return { success: false, error: 'Extension is not enabled' };
                    }
                    extensionState.isListening = true;
                    extensionState.activeTab = sender.tab?.id;
                    await chrome.storage.local.set({ extensionState });
                    updateExtensionBadge();
                    return { success: true, isListening: true };
                    
                case 'STOP_LISTENING':
                    extensionState.isListening = false;
                    extensionState.isAwake = false;
                    extensionState.activeTab = null;
                    await stopListeningOnAllTabs();
                    await chrome.storage.local.set({ extensionState });
                    updateExtensionBadge();
                    return { success: true, isListening: false };
                    
                case 'UPDATE_LISTENING_STATUS':
                    if (extensionState.activeTab) {
                        chrome.tabs.sendMessage(extensionState.activeTab, {
                            type: 'UPDATE_LISTENING_STATUS',
                            state: request.state,
                            message: request.message
                        }).catch(() => {});
                    }
                    return { success: true };
                    
                case 'CONTENT_SCRIPT_READY':
                    return {
                        success: true,
                        extensionState: extensionState,
                        message: 'Background script connected'
                    };
                    
                default:
                    console.warn('⚠️ Unknown message type:', action);
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

// ===== VOICE PROCESSING FUNCTIONS =====
async function handleWakeWord(keyword) {
    console.log('👂 Wake word detected:', keyword);
    extensionState.isAwake = true;
    extensionState.isListening = true;
    updateBadge('👂');
    
    // Start listening timeout
    setTimeout(() => {
        if (extensionState.isAwake && extensionState.isListening) {
            console.log('⏰ Wake word timeout');
            stopListening();
        }
    }, 10000); // 10 second timeout
    
    return { success: true, message: 'Wake word detected, listening for command...' };
}

async function processVoiceCommand(transcript) {
    console.log('🗣️ Processing voice command:', transcript);
    
    if (!transcript || transcript.trim().length === 0) {
        return { success: false, message: 'No command detected' };
    }
    
    try {
        updateBadge('🤔');
        
        // Get AI interpretation
        const command = await getGeminiCommandInterpretation(transcript);
        console.log('🧠 AI interpreted command:', command);
        
        // Execute the command
        const result = await executeCommand(command);
        
        // Update badge based on result
        updateBadge(result.success ? '✅' : '❌');
        
        // Auto-stop listening after command
        setTimeout(() => stopListening(), 2000);
        
        return result;
        
    } catch (error) {
        console.error('Voice command processing error:', error);
        updateBadge('❌');
        setTimeout(() => stopListening(), 2000);
        return { success: false, message: 'Error processing command: ' + error.message };
    }
}

async function startListening() {
    if (!extensionState.isEnabled) {
        return { success: false, message: 'Extension is not enabled' };
    }
    
    extensionState.isListening = true;
    extensionState.isAwake = true;
    updateBadge('🎤');
    await startWakeWordDetection();
    
    console.log('🎤 Started listening for wake word');
    return { success: true, message: 'Listening for "Hey Rupert"...' };
}

async function stopListening() {
    extensionState.isListening = false;
    extensionState.isAwake = false;
    extensionState.activeTab = null;
    
    await stopWakeWordDetection();
    await stopListeningOnAllTabs();
    updateBadge(extensionState.isEnabled ? '😴' : '');
    
    console.log('🛑 Stopped listening');
    return { success: true, message: 'Stopped listening' };
}

// ===== PERMISSION MANAGEMENT =====
async function requestMicrophonePermission() {
    try {
        const permissionWindow = await chrome.windows.create({
            url: chrome.runtime.getURL('permission.html'),
            type: 'popup',
            width: 500,
            height: 400,
            focused: true
        });
        
        return { success: true, windowId: permissionWindow.id };
    } catch (error) {
        console.error('Error opening permission window:', error);
        return { success: false, error: error.message };
    }
}

// ===== UTILITY FUNCTIONS =====
function updateBadge(text, color = '#1B365D') {
    try {
        chrome.action.setBadgeText({ text: text });
        chrome.action.setBadgeBackgroundColor({ color: color });
    } catch (error) {
        console.warn('Badge update failed:', error);
    }
}

function updateExtensionBadge() {
    try {
        let badgeText = '';
        let badgeColor = '#EF4444';
        
        if (extensionState.isEnabled) {
            if (extensionState.isListening) {
                badgeText = '👂';
                badgeColor = '#22C55E';
            } else {
                badgeText = '●';
                badgeColor = '#1B365D';
            }
        }
        
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    } catch (error) {
        console.warn('⚠️ Badge update failed:', error);
    }
}

async function stopListeningOnAllTabs() {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'HIDE_LISTENING_INDICATOR'
            }).catch(() => {}); // Ignore errors
        }
        console.log('🛑 Listening stopped on all tabs');
    } catch (error) {
        console.warn('⚠️ Could not stop listening on all tabs:', error);
    }
}

// ===== TAB EVENT LISTENERS =====
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    currentTabId = activeInfo.tabId;
    extensionState.activeTab = activeInfo.tabId;
    await initializeWakeWordInTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        await initializeWakeWordInTab(tabId);
    }
});

// ===== KEEP-ALIVE AND CLEANUP =====
chrome.runtime.onConnect.addListener((port) => {
    console.log('🔗 Connection established:', port.name);
});

// Periodic maintenance
setInterval(async () => {
    try {
        await chrome.storage.local.set({ extensionState });
        
        // Auto-stop listening after 30 seconds of inactivity
        if (extensionState.isListening) {
            const timeSinceLastActivity = Date.now() - extensionState.lastActivity;
            if (timeSinceLastActivity > 30000) {
                console.log('⏰ Auto-stopping listening due to inactivity');
                await stopListening();
            }
        }
    } catch (error) {
        console.warn('⚠️ Periodic maintenance failed:', error);
    }
}, 60000); // Every 60 seconds

// ===== INTEGRATION FUNCTIONS =====
// These functions can be called by other parts of the extension

async function triggerListening(tabId) {
    console.log('🗣️ Hey Rupert detected on tab:', tabId);
    return await handleWakeWord('hey rupert');
}

async function setProcessingStatus(message = 'Processing...') {
    try {
        if (extensionState.activeTab) {
            await chrome.tabs.sendMessage(extensionState.activeTab, {
                type: 'UPDATE_LISTENING_STATUS',
                state: 'processing',
                message: message
            });
        }
        updateBadge('🤔');
    } catch (error) {
        console.error('❌ Could not update processing status:', error);
    }
}

console.log('✅ Comprehensive Rupert Background Service Worker Initialized');
console.log('📊 Initial State:', extensionState);

// Make integration functions available globally
globalThis.triggerListening = triggerListening;
globalThis.setProcessingStatus = setProcessingStatus;
globalThis.stopListening = stopListening;

chrome.action.onClicked.addListener((tab) => {
    // Send test command to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'showNumbers',
      elementType: 'clickable'
    });
  });
  
  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'test') {
      console.log('Background received test message');
      sendResponse({success: true});
    }
  });
