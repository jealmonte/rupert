// Enhanced Background Service Worker - Rupert Voice Assistant
// Now includes listening indicator control

console.log('🎤 Rupert Background Service Worker Starting...');

// Enhanced state management
let extensionState = {
    isEnabled: false,
    isListening: false,
    lastActivity: Date.now(),
    activeTab: null
};

// Service Worker Installation
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('🔧 Rupert Extension Installed/Updated:', details.reason);

    try {
        // Load saved state
        const savedState = await chrome.storage.local.get(['extensionState']);
        if (savedState.extensionState) {
            extensionState = { ...extensionState, ...savedState.extensionState };
        }

        console.log('📊 Initial State Loaded:', extensionState);

    } catch (error) {
        console.error('❌ Initialization Error:', error);
    }
});

// Enhanced message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Message Received:', message.type, 'from', sender.tab?.id || 'popup');

    switch (message.type) {
        case 'GET_EXTENSION_STATUS':
            handleGetStatus(sendResponse);
            break;

        case 'TOGGLE_EXTENSION':
            handleToggleExtension(sendResponse);
            break;

        case 'START_LISTENING':
            handleStartListening(sender, sendResponse);
            break;

        case 'STOP_LISTENING':
            handleStopListening(sender, sendResponse);
            break;

        case 'UPDATE_LISTENING_STATUS':
            handleUpdateListeningStatus(message, sendResponse);
            break;

        case 'CONTENT_SCRIPT_READY':
            handleContentScriptReady(sender.tab, sendResponse);
            break;

        default:
            console.warn('⚠️ Unknown message type:', message.type);
            sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Keep message channel open
});

// Get extension status
async function handleGetStatus(sendResponse) {
    try {
        const response = {
            success: true,
            isEnabled: extensionState.isEnabled,
            isListening: extensionState.isListening,
            lastActivity: extensionState.lastActivity,
            activeTab: extensionState.activeTab
        };

        console.log('📊 Status requested:', response);
        sendResponse(response);
    } catch (error) {
        console.error('❌ Get status error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Toggle extension state
async function handleToggleExtension(sendResponse) {
    try {
        extensionState.isEnabled = !extensionState.isEnabled;
        extensionState.lastActivity = Date.now();

        // If disabling, stop listening
        if (!extensionState.isEnabled && extensionState.isListening) {
            await stopListeningOnAllTabs();
        }

        // Save state
        await chrome.storage.local.set({ extensionState });

        console.log('🔄 Extension toggled:', extensionState.isEnabled);

        sendResponse({
            success: true,
            isEnabled: extensionState.isEnabled
        });

        // Update badge
        updateExtensionBadge();

    } catch (error) {
        console.error('❌ Toggle extension error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Start listening (triggered by "Hey Rupert" - Team 1 integration point)
async function handleStartListening(sender, sendResponse) {
    try {
        if (!extensionState.isEnabled) {
            sendResponse({ success: false, error: 'Extension is not enabled' });
            return;
        }

        extensionState.isListening = true;
        extensionState.activeTab = sender.tab?.id;
        extensionState.lastActivity = Date.now();

        console.log('👂 Listening started on tab:', sender.tab?.id);

        // Show listening indicator on the current tab
        if (sender.tab) {
            await chrome.tabs.sendMessage(sender.tab.id, {
                type: 'SHOW_LISTENING_INDICATOR',
                state: 'listening',
                message: 'Listening...'
            }).catch(error => {
                console.warn('⚠️ Could not show indicator:', error);
            });
        }

        // Save state
        await chrome.storage.local.set({ extensionState });

        sendResponse({ success: true, isListening: true });

    } catch (error) {
        console.error('❌ Start listening error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Stop listening
async function handleStopListening(sender, sendResponse) {
    try {
        extensionState.isListening = false;
        extensionState.activeTab = null;
        extensionState.lastActivity = Date.now();

        console.log('👂 Listening stopped');

        // Hide listening indicator on all tabs
        await stopListeningOnAllTabs();

        // Save state
        await chrome.storage.local.set({ extensionState });

        sendResponse({ success: true, isListening: false });

    } catch (error) {
        console.error('❌ Stop listening error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Update listening status (for different states like processing)
async function handleUpdateListeningStatus(message, sendResponse) {
    try {
        if (!extensionState.isListening) {
            sendResponse({ success: false, error: 'Not currently listening' });
            return;
        }

        console.log('🔄 Updating listening status:', message.state, message.message);

        // Update status on active tab
        if (extensionState.activeTab) {
            await chrome.tabs.sendMessage(extensionState.activeTab, {
                type: 'UPDATE_LISTENING_STATUS',
                state: message.state,
                message: message.message
            }).catch(error => {
                console.warn('⚠️ Could not update indicator:', error);
            });
        }

        sendResponse({ success: true });

    } catch (error) {
        console.error('❌ Update listening status error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Stop listening on all tabs
async function stopListeningOnAllTabs() {
    try {
        const tabs = await chrome.tabs.query({});

        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    type: 'HIDE_LISTENING_INDICATOR'
                });
            } catch (error) {
                // Tab might not have content script, ignore
            }
        }

        console.log('🛑 Listening stopped on all tabs');

    } catch (error) {
        console.warn('⚠️ Could not stop listening on all tabs:', error);
    }
}

// Content script ready handler
function handleContentScriptReady(tab, sendResponse) {
    console.log('📄 Content script ready on tab:', tab.id, tab.url);

    sendResponse({
        success: true,
        extensionState: extensionState,
        message: 'Background script connected'
    });
}

// Update extension badge
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

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
    console.log('🔗 Connection established:', port.name);
});

// Periodic state save and cleanup
setInterval(async () => {
    try {
        await chrome.storage.local.set({ extensionState });

        // Auto-stop listening after 30 seconds of inactivity (safety feature)
        if (extensionState.isListening) {
            const timeSinceLastActivity = Date.now() - extensionState.lastActivity;
            if (timeSinceLastActivity > 30000) { // 30 seconds
                console.log('⏰ Auto-stopping listening due to inactivity');
                extensionState.isListening = false;
                extensionState.activeTab = null;
                await stopListeningOnAllTabs();
                updateExtensionBadge();
            }
        }

    } catch (error) {
        console.warn('⚠️ Periodic maintenance failed:', error);
    }
}, 60000); // Every 60 seconds

console.log('✅ Enhanced Rupert Background Service Worker Initialized');
console.log('📊 Initial State:', extensionState);

// INTEGRATION FUNCTIONS FOR TEAM 1 (Voice Recognition)
// These functions can be called by Team 1 when implementing voice detection

/**
 * Call this when "Hey Rupert" is detected
 * @param {number} tabId - The tab where voice was detected
 */
async function triggerListening(tabId) {
    console.log('🗣️ Hey Rupert detected on tab:', tabId);

    try {
        // Send start listening message
        await chrome.runtime.sendMessage({
            type: 'START_LISTENING'
        });
    } catch (error) {
        console.error('❌ Could not start listening:', error);
    }
}

/**
 * Call this when processing voice command
 * @param {string} message - Status message to display
 */
async function setProcessingStatus(message = 'Processing...') {
    try {
        await chrome.runtime.sendMessage({
            type: 'UPDATE_LISTENING_STATUS',
            state: 'processing',
            message: message
        });
    } catch (error) {
        console.error('❌ Could not update processing status:', error);
    }
}

/**
 * Call this when voice command is complete
 */
async function stopListening() {
    try {
        await chrome.runtime.sendMessage({
            type: 'STOP_LISTENING'
        });
    } catch (error) {
        console.error('❌ Could not stop listening:', error);
    }
}