// Popup.js - Separated JavaScript to fix CSP errors
// Rupert Voice Assistant Extension

console.log('🎤 Rupert Popup Script Loading...');

let isActive = false;
let debugLog = [];
let debugVisible = false;

// Utility functions
function addDebugMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    debugLog.push(`${timestamp}: ${message}`);
    const debugElement = document.getElementById('debug-log');
    if (debugElement) {
        debugElement.innerHTML = debugLog.slice(-10).join('<br>');
    }
    console.log('[RUPERT]', message);
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    container.innerHTML = '';
    container.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-text');

    if (connected) {
        dot.style.backgroundColor = '#22C55E';
        text.textContent = 'Connected';
    } else {
        dot.style.backgroundColor = '#EF4444';
        text.textContent = 'Disconnected';
    }
}

function updateToggleButton() {
    const button = document.getElementById('main-toggle');
    const text = button.querySelector('.toggle-text');
    const slider = document.getElementById('toggle-slider');

    if (isActive) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        text.textContent = 'Turn Off';
        slider.style.transform = 'translateX(28px)';
    } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
        text.textContent = 'Turn On';
        slider.style.transform = 'translateX(0)';
    }
}

async function toggleExtension() {
    addDebugMessage('Toggle button clicked');

    try {
        addDebugMessage('Attempting to contact background service...');

        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);

        addDebugMessage(`Background service responded: ${JSON.stringify(response)}`);

        if (response && response.success !== false) {
            isActive = response.isEnabled;
            updateToggleButton();
            showMessage('Extension toggled successfully', 'success');
        } else {
            throw new Error(response?.error || 'Invalid response');
        }

    } catch (error) {
        addDebugMessage(`Background service failed: ${error.message}`);
        addDebugMessage('Using local toggle fallback...');

        // Local fallback
        isActive = !isActive;
        updateToggleButton();

        try {
            await chrome.storage.local.set({ isEnabled: isActive });
            addDebugMessage('State saved to local storage');
            showMessage(`Extension ${isActive ? 'activated' : 'deactivated'} (local mode)`, 'success');
        } catch (storageError) {
            addDebugMessage(`Storage save failed: ${storageError.message}`);
            showMessage(`Extension ${isActive ? 'activated' : 'deactivated'} (memory only)`, 'success');
        }
    }
}

async function checkPermissions() {
    try {
        // Check microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());

        document.getElementById('mic-permission').classList.add('granted');
        document.getElementById('mic-status-text').textContent = 'Granted';
        addDebugMessage('Microphone permission granted');
    } catch (error) {
        document.getElementById('mic-status-text').textContent = 'Denied';
        addDebugMessage(`Microphone permission denied: ${error.message}`);
    }
}

function toggleDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    const debugButton = document.getElementById('debug-button');

    debugVisible = !debugVisible;

    if (debugVisible) {
        debugInfo.classList.add('visible');
        debugButton.textContent = 'Hide Debug Information';
    } else {
        debugInfo.classList.remove('visible');
        debugButton.textContent = 'Show Debug Information';
    }
}

async function initializePopup() {
    addDebugMessage('Initializing popup...');
    document.getElementById('load-time').textContent = new Date().toLocaleString();

    // Check permissions
    await checkPermissions();

    // Try to load from background service
    try {
        addDebugMessage('Contacting background service...');
        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATUS' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);

        addDebugMessage(`Background response: ${JSON.stringify(response)}`);

        if (response && response.success !== false) {
            isActive = response.isEnabled || false;
            updateConnectionStatus(true);
            addDebugMessage('Background service connected');
        } else {
            throw new Error('Invalid response');
        }

    } catch (error) {
        addDebugMessage(`Background service failed: ${error.message}`);
        updateConnectionStatus(false);

        try {
            const data = await chrome.storage.local.get(['isEnabled']);
            isActive = data.isEnabled || false;
            addDebugMessage(`Loaded from local storage: ${isActive}`);
        } catch (storageError) {
            addDebugMessage(`Storage also failed: ${storageError.message}`);
            isActive = false;
        }
    }

    updateToggleButton();
    addDebugMessage('Popup initialization complete');
}

// Event listeners
function bindEventListeners() {
    // Main toggle button
    const mainToggle = document.getElementById('main-toggle');
    if (mainToggle) {
        mainToggle.addEventListener('click', toggleExtension);
    }

    // Debug toggle button
    const debugButton = document.getElementById('debug-button');
    if (debugButton) {
        debugButton.addEventListener('click', toggleDebugInfo);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        addDebugMessage('DOM Content Loaded');
        bindEventListeners();
        initializePopup();
    });
} else {
    addDebugMessage('Document already ready, initializing immediately');
    bindEventListeners();
    initializePopup();
}