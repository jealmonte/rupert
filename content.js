// Enhanced Content Script - Rupert Voice Assistant
// Updated with non-conflicting keyboard shortcuts

console.log('🎤 Rupert Content Script Loading...');

// Global state
let isRupertListening = false;
let listeningIndicator = null;
let keyboardShortcutEnabled = true;

// Initialize Rupert content script
function initializeRupert() {
    console.log('🔧 Initializing Rupert content script...');

    // Create listening indicator element
    createListeningIndicator();

    // Set up keyboard shortcuts for testing
    setupKeyboardShortcuts();

    // Listen for messages from background script
    setupMessageListener();

    console.log('✅ Rupert content script initialized');
}

// Create the floating listening indicator
function createListeningIndicator() {
    if (listeningIndicator) {
        return; // Already exists
    }

    // Create indicator container
    listeningIndicator = document.createElement('div');
    listeningIndicator.id = 'rupert-listening-indicator';

    // Set innerHTML
    listeningIndicator.innerHTML = `
        <span class="rupert-icon">🎤</span>
        <span class="rupert-text" id="rupert-status-text">Listening...</span>
        <div class="rupert-status-dot"></div>
    `;

    // Inject CSS styles
    injectListeningStyles();

    // Add to page (hidden initially)
    document.body.appendChild(listeningIndicator);

    console.log('📱 Listening indicator created');
}

// Inject CSS styles for the listening indicator
function injectListeningStyles() {
    if (document.getElementById('rupert-listening-styles')) {
        return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'rupert-listening-styles';
    style.textContent = `
        #rupert-listening-indicator {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;

            background: linear-gradient(135deg, #1B365D 0%, #2E5984 100%);
            color: white;

            padding: 12px 20px;
            border-radius: 25px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);

            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Arial', sans-serif;
            font-size: 14px;
            font-weight: 600;

            display: flex;
            align-items: center;
            gap: 10px;

            opacity: 0;
            transform: translateY(-20px) scale(0.8);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: none;

            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        #rupert-listening-indicator.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        #rupert-listening-indicator.listening {
            background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
        }

        #rupert-listening-indicator.processing {
            background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        }

        #rupert-listening-indicator.error {
            background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
        }

        #rupert-listening-indicator .rupert-icon {
            font-size: 16px;
            animation: rupert-pulse 2s infinite;
        }

        #rupert-listening-indicator .rupert-text {
            font-size: 13px;
            font-weight: 500;
        }

        #rupert-listening-indicator .rupert-status-dot {
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            animation: rupert-blink 1.5s infinite;
        }

        @keyframes rupert-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }

        @keyframes rupert-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
            #rupert-listening-indicator {
                top: 15px;
                right: 15px;
                padding: 10px 16px;
                font-size: 12px;
            }
        }
    `;

    document.head.appendChild(style);
    console.log('🎨 Listening indicator styles injected');
}

// Show listening indicator with different states
function showListeningIndicator(state = 'listening', message = 'Listening...') {
    if (!listeningIndicator) {
        createListeningIndicator();
    }

    // Update text and state
    const textElement = listeningIndicator.querySelector('#rupert-status-text');
    if (textElement) {
        textElement.textContent = message;
    }

    // Remove existing state classes
    listeningIndicator.classList.remove('listening', 'processing', 'error');

    // Add new state class
    if (state) {
        listeningIndicator.classList.add(state);
    }

    // Show the indicator
    listeningIndicator.classList.add('visible');
    isRupertListening = true;

    console.log(`👁️ Listening indicator shown: ${state} - ${message}`);
}

// Hide listening indicator
function hideListeningIndicator() {
    if (!listeningIndicator) {
        return;
    }

    listeningIndicator.classList.remove('visible');
    isRupertListening = false;

    console.log('👁️ Listening indicator hidden');
}

// Setup keyboard shortcuts for testing (UPDATED - Non-conflicting shortcuts)
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        if (!keyboardShortcutEnabled) return;

        // Alt+Shift+L - Toggle listening indicator (L for Listen)
        if (event.altKey && event.shiftKey && event.key === 'L') {
            event.preventDefault();

            if (isRupertListening) {
                hideListeningIndicator();
            } else {
                showListeningIndicator('listening', 'Listening...');

                // Auto-hide after 5 seconds for testing
                setTimeout(() => {
                    if (isRupertListening) {
                        hideListeningIndicator();
                    }
                }, 5000);
            }

            console.log('🎹 Keyboard shortcut triggered: Alt+Shift+L');
        }

        // Alt+Shift+P - Show processing state (P for Processing)
        if (event.altKey && event.shiftKey && event.key === 'P') {
            event.preventDefault();
            showListeningIndicator('processing', 'Processing...');

            setTimeout(() => {
                hideListeningIndicator();
            }, 3000);

            console.log('🎹 Keyboard shortcut triggered: Alt+Shift+P');
        }

        // Alt+Shift+E - Show error state (E for Error)
        if (event.altKey && event.shiftKey && event.key === 'E') {
            event.preventDefault();
            showListeningIndicator('error', 'Error occurred');

            setTimeout(() => {
                hideListeningIndicator();
            }, 3000);

            console.log('🎹 Keyboard shortcut triggered: Alt+Shift+E');
        }

        // Alt+Shift+H - Hide indicator manually (H for Hide)
        if (event.altKey && event.shiftKey && event.key === 'H') {
            event.preventDefault();
            hideListeningIndicator();
            console.log('🎹 Keyboard shortcut triggered: Alt+Shift+H');
        }
    });

    console.log('⌨️ Updated keyboard shortcuts enabled:');
    console.log('   Alt+Shift+L - Toggle listening indicator');
    console.log('   Alt+Shift+P - Show processing state');
    console.log('   Alt+Shift+E - Show error state');
    console.log('   Alt+Shift+H - Hide indicator');
}

// Setup message listener for background script communication
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Content script received message:', message);

        switch (message.type) {
            case 'SHOW_LISTENING_INDICATOR':
                showListeningIndicator(
                    message.state || 'listening',
                    message.message || 'Listening...'
                );
                sendResponse({ success: true });
                break;

            case 'HIDE_LISTENING_INDICATOR':
                hideListeningIndicator();
                sendResponse({ success: true });
                break;

            case 'UPDATE_LISTENING_STATUS':
                if (isRupertListening && listeningIndicator) {
                    const textElement = listeningIndicator.querySelector('#rupert-status-text');
                    if (textElement && message.message) {
                        textElement.textContent = message.message;
                    }

                    if (message.state) {
                        listeningIndicator.classList.remove('listening', 'processing', 'error');
                        listeningIndicator.classList.add(message.state);
                    }
                }
                sendResponse({ success: true });
                break;

            case 'GET_LISTENING_STATUS':
                sendResponse({ 
                    success: true, 
                    isListening: isRupertListening 
                });
                break;

            default:
                console.log('⚠️ Unknown message type:', message.type);
                sendResponse({ success: false, error: 'Unknown message type' });
        }

        return true; // Keep message channel open for async response
    });

    console.log('📡 Message listener setup complete');
}

// Cleanup function
function cleanup() {
    if (listeningIndicator && listeningIndicator.parentNode) {
        listeningIndicator.parentNode.removeChild(listeningIndicator);
    }

    const styles = document.getElementById('rupert-listening-styles');
    if (styles && styles.parentNode) {
        styles.parentNode.removeChild(styles);
    }

    console.log('🧹 Rupert content script cleanup complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRupert);
} else {
    initializeRupert();
}

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);

// Notify background script that content script is ready
chrome.runtime.sendMessage({ 
    type: 'CONTENT_SCRIPT_READY',
    url: window.location.href
}).catch(error => {
    console.warn('⚠️ Could not notify background script:', error);
});

console.log('✅ Rupert Enhanced Content Script Loaded with Updated Shortcuts');