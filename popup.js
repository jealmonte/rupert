// Simplified Working Popup.js - Rupert Voice Assistant
console.log('🎤 Rupert Working Popup Loading...');

// State management
let isActive = false;
let debugLog = [];
let debugVisible = false;
let permissionStatus = {
    microphone: false,
    service: false,
    apiKey: false
};

// Voice recognition variables
let speechRecognition = null;
let transcriptHistory = [];
let isListening = false;

// ===== UTILITY FUNCTIONS =====
function addDebugMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    debugLog.push(`${timestamp}: ${message}`);
    const debugElement = document.getElementById('debug-log');
    if (debugElement) {
        debugElement.innerHTML = debugLog.slice(-30).join('<br>');
        debugElement.scrollTop = debugElement.scrollHeight;
    }
    console.log('[RUPERT]', message);
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'message error' : 
                          type === 'success' ? 'message success' : 'message info';
    messageDiv.textContent = message;
    messageDiv.classList.add('fade-in');
    container.innerHTML = '';
    container.appendChild(messageDiv);
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);

    addDebugMessage(`Message (${type}): ${message}`);
}

function updateTranscriptBox(transcript, isFinal = false, isWakeWord = false) {
    const transcriptElement = document.getElementById('live-transcript');
    const statusElement = document.getElementById('transcript-status');

    if (transcriptElement) {
        if (isFinal) {
            // Add to history
            transcriptHistory.unshift({
                transcript: transcript,
                timestamp: new Date().toLocaleTimeString(),
                isWakeWord: isWakeWord
            });

            // Update history display
            updateTranscriptHistory();

            // Clear live transcript
            transcriptElement.textContent = 'Listening...';
        } else {
            // Update live transcript
            transcriptElement.textContent = transcript || 'Listening...';
        }

        // Update status
        if (statusElement) {
            if (isWakeWord) {
                statusElement.textContent = 'Wake word detected! Processing...';
                statusElement.className = 'transcript-status wake-word';

                // Send command to background script
                sendVoiceCommand(transcript);
            } else if (isFinal) {
                statusElement.textContent = 'Command processed';
                statusElement.className = 'transcript-status processing';
            } else {
                statusElement.textContent = 'Listening...';
                statusElement.className = 'transcript-status listening';
            }
        }
    }
}

async function sendVoiceCommand(transcript) {
    addDebugMessage(`🎯 Sending voice command: "${transcript}"`);

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'voice_command',
            transcript: transcript,
            timestamp: Date.now()
        });

        addDebugMessage(`📥 Command response: ${JSON.stringify(response)}`);

        if (response && response.success) {
            showMessage(response.message || 'Command executed successfully', 'success');
        } else {
            showMessage(response?.message || 'Command failed', 'error');
        }
    } catch (error) {
        addDebugMessage(`❌ Command sending error: ${error.message}`);
        showMessage('Failed to send command: ' + error.message, 'error');
    }
}

function updateTranscriptHistory() {
    const historyElement = document.getElementById('transcript-history');
    if (historyElement && transcriptHistory.length > 0) {
        historyElement.innerHTML = '';
        transcriptHistory.slice(0, 5).forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = `transcript-entry ${entry.isWakeWord ? 'wake-word' : ''}`;
            entryDiv.innerHTML = `
                <span class="transcript-time">${entry.timestamp}</span>
                <span class="transcript-text">${entry.transcript}</span>
                ${entry.isWakeWord ? '<span class="wake-word-badge">WAKE</span>' : ''}
            `;
            historyElement.appendChild(entryDiv);
        });
        historyElement.classList.remove('hidden');
    }
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('connection-dot');
    const text = document.getElementById('connection-text');
    if (connected) {
        dot.style.backgroundColor = '#22C55E';
        text.textContent = 'Connected';
        permissionStatus.service = true;
    } else {
        dot.style.backgroundColor = '#EF4444';
        text.textContent = 'Disconnected';
        permissionStatus.service = false;
    }
    addDebugMessage(`Service connection: ${connected ? 'connected' : 'disconnected'}`);
}

function updateMicrophoneStatus(granted) {
    const indicator = document.getElementById('mic-permission');
    const text = document.getElementById('mic-status-text');
    if (granted) {
        indicator.style.backgroundColor = '#22C55E';
        indicator.classList.add('granted');
        text.textContent = 'Granted';
        permissionStatus.microphone = true;
        showMicrophoneTest();
        hidePermissionRequest();
        addDebugMessage('✅ Microphone permission granted');
    } else {
        indicator.style.backgroundColor = '#EF4444';
        indicator.classList.remove('granted');
        text.textContent = 'Denied';
        permissionStatus.microphone = false;
        hideMicrophoneTest();
        showPermissionRequest();
        addDebugMessage('❌ Microphone permission denied');
    }
    updateToggleAvailability();
}

function updateApiKeyStatus(configured) {
    const indicator = document.getElementById('ai-status');
    const text = document.getElementById('ai-status-text');
    const banner = document.getElementById('ai-status-banner');
    const setup = document.getElementById('gemini-setup');

    if (configured) {
        indicator.style.backgroundColor = '#22C55E';
        text.textContent = 'Ready';
        banner.classList.remove('not-configured');
        banner.querySelector('.ai-status-text').textContent = '🤖 Gemini AI Ready';
        banner.querySelector('.ai-status-detail').textContent = 'AI voice commands enabled';
        setup.classList.add('hidden');
        permissionStatus.apiKey = true;
        addDebugMessage('✅ Gemini AI configured and ready');
    } else {
        indicator.style.backgroundColor = '#EF4444';
        text.textContent = 'Not Configured';
        banner.classList.add('not-configured');
        banner.querySelector('.ai-status-text').textContent = '🔑 Gemini AI Not Configured';
        banner.querySelector('.ai-status-detail').textContent = 'Add your API key below to enable AI voice commands';
        setup.classList.remove('hidden');
        permissionStatus.apiKey = false;
        addDebugMessage('❌ Gemini AI not configured');
    }
    updateToggleAvailability();
}

function updateToggleAvailability() {
    const toggleButton = document.getElementById('main-toggle');
    const toggleText = toggleButton.querySelector('.toggle-text');
    const toggleDesc = toggleButton.querySelector('.toggle-description');
    const canEnable = permissionStatus.microphone && permissionStatus.service && permissionStatus.apiKey;

    if (!canEnable && isActive) {
        isActive = false;
        updateToggleButton();
    }

    if (canEnable) {
        toggleButton.classList.remove('disabled');
        toggleButton.style.opacity = '1';
        toggleButton.style.pointerEvents = 'auto';
        if (!isActive) {
            toggleText.textContent = 'Turn On';
            toggleDesc.textContent = 'Start voice recognition';
        }
    } else {
        toggleButton.classList.add('disabled');
        toggleButton.style.opacity = '0.5';
        toggleButton.style.pointerEvents = 'none';
        toggleText.textContent = 'Setup Required';
        toggleDesc.textContent = 'Configure permissions and API';
    }
}

function updateToggleButton() {
    const button = document.getElementById('main-toggle');
    const text = button.querySelector('.toggle-text');
    const description = button.querySelector('.toggle-description');
    const slider = document.getElementById('toggle-slider');

    if (isActive) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        text.textContent = 'Turn Off';
        description.textContent = 'Stop voice recognition';
        slider.style.transform = 'translateX(32px)';
        // Show transcript box when active
        showTranscriptBox();
        startVoiceRecognition();
        addDebugMessage('🎯 Extension activated - voice listening enabled');
    } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
        text.textContent = 'Turn On';
        description.textContent = 'Start voice recognition';
        slider.style.transform = 'translateX(0)';
        // Hide transcript box when inactive
        hideTranscriptBox();
        stopVoiceRecognition();
        addDebugMessage('🛑 Extension deactivated - voice listening disabled');
    }
}

function showTranscriptBox() {
    const transcriptSection = document.getElementById('transcript-section');
    if (transcriptSection) {
        transcriptSection.classList.remove('hidden');
    }
}

function hideTranscriptBox() {
    const transcriptSection = document.getElementById('transcript-section');
    if (transcriptSection) {
        transcriptSection.classList.add('hidden');
    }
}

// ===== VOICE RECOGNITION FUNCTIONS =====
function startVoiceRecognition() {
    if (!permissionStatus.microphone) {
        addDebugMessage('❌ Cannot start voice recognition - no microphone permission');
        return;
    }

    addDebugMessage('🎤 Starting voice recognition...');

    try {
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            throw new Error('Speech recognition not supported');
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();

        // Configure speech recognition
        speechRecognition.continuous = true;
        speechRecognition.interimResults = true;
        speechRecognition.lang = 'en-US';
        speechRecognition.maxAlternatives = 1;

        speechRecognition.onstart = () => {
            addDebugMessage('🎙️ Speech recognition started');
            isListening = true;
            updateTranscriptBox('Listening...', false);
        };

        speechRecognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (finalTranscript) {
                addDebugMessage(`📝 Final transcript: "${finalTranscript}"`);
                const isWakeWord = finalTranscript.toLowerCase().includes('hey rupert') || 
                                 finalTranscript.toLowerCase().includes('rupert');
                updateTranscriptBox(finalTranscript, true, isWakeWord);

                if (isWakeWord) {
                    addDebugMessage('🎯 WAKE WORD DETECTED!');
                    showMessage('Wake word detected! Processing command...', 'success');
                }
            } else if (interimTranscript) {
                updateTranscriptBox(interimTranscript, false);
            }
        };

        speechRecognition.onerror = (event) => {
            addDebugMessage(`❌ Speech recognition error: ${event.error}`);
            if (event.error === 'not-allowed') {
                updateMicrophoneStatus(false);
                showMessage('Microphone permission denied', 'error');
            }
        };

        speechRecognition.onend = () => {
            addDebugMessage('🛑 Speech recognition ended');
            isListening = false;
            if (isActive) {
                // Restart if we're still active
                setTimeout(() => {
                    if (isActive) {
                        speechRecognition.start();
                    }
                }, 1000);
            }
        };

        speechRecognition.start();

    } catch (error) {
        addDebugMessage(`❌ Voice recognition start failed: ${error.message}`);
        showMessage('Speech recognition not available: ' + error.message, 'error');
    }
}

function stopVoiceRecognition() {
    addDebugMessage('🛑 Stopping voice recognition');
    isListening = false;

    if (speechRecognition) {
        speechRecognition.stop();
        speechRecognition = null;
    }

    updateTranscriptBox('Not listening', false);
}

// ===== API KEY FUNCTIONS =====
async function saveApiKey() {
    const apiKeyInput = document.getElementById('api-key-input');
    const saveBtn = document.getElementById('save-api-key');
    const testBtn = document.getElementById('test-api');

    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showMessage('Please enter a valid API key', 'error');
        return;
    }

    if (apiKey.length < 20) {
        showMessage('API key seems too short. Please check it.', 'error');
        return;
    }

    try {
        saveBtn.classList.add('loading');
        saveBtn.textContent = 'Saving...';
        addDebugMessage(`🔐 Attempting to save API key (length: ${apiKey.length})`);

        const response = await chrome.runtime.sendMessage({
            type: 'SET_GEMINI_API_KEY',
            apiKey: apiKey
        });

        addDebugMessage(`📤 API key save response: ${JSON.stringify(response)}`);

        if (response && response.success) {
            // Mask the API key for display
            apiKeyInput.value = '•'.repeat(Math.min(apiKey.length, 40));
            testBtn.classList.remove('hidden');
            updateApiKeyStatus(true);
            showMessage('Gemini API key saved successfully!', 'success');
        } else {
            showMessage(response?.error || 'Failed to save API key', 'error');
        }

    } catch (error) {
        console.error('Save API key error:', error);
        addDebugMessage(`❌ Save API key error: ${error.message}`);
        showMessage('Error saving API key: ' + error.message, 'error');
    } finally {
        saveBtn.classList.remove('loading');
        saveBtn.textContent = 'Save API Key';
    }
}

async function testApiConnection() {
    const testBtn = document.getElementById('test-api');

    try {
        testBtn.classList.add('loading');
        testBtn.textContent = 'Testing...';
        addDebugMessage('🧪 Testing Gemini AI connection...');

        const response = await chrome.runtime.sendMessage({
            type: 'TEST_AI_COMMAND',
            command: 'test connection'
        });

        addDebugMessage(`🧪 API test response: ${JSON.stringify(response)}`);

        if (response && response.success) {
            showMessage('Gemini AI connection successful!', 'success');
        } else {
            showMessage('API test failed: ' + (response?.message || 'Unknown error'), 'error');
        }

    } catch (error) {
        console.error('API test error:', error);
        addDebugMessage(`❌ API test error: ${error.message}`);
        showMessage('Error testing API connection: ' + error.message, 'error');
    } finally {
        testBtn.classList.remove('loading');
        testBtn.textContent = 'Test AI';
    }
}

// ===== UI FUNCTIONS =====
function showMicrophoneTest() {
    const testSection = document.getElementById('microphone-test');
    if (testSection) {
        testSection.classList.remove('hidden');
        addDebugMessage('📱 Microphone test section shown');
    }
}

function hideMicrophoneTest() {
    const testSection = document.getElementById('microphone-test');
    if (testSection) {
        testSection.classList.add('hidden');
        addDebugMessage('📱 Microphone test section hidden');
    }
}

function showPermissionRequest() {
    const permissionSection = document.getElementById('permission-request');
    if (permissionSection) {
        permissionSection.classList.remove('hidden');
        addDebugMessage('🔐 Permission request section shown');
    }
}

function hidePermissionRequest() {
    const permissionSection = document.getElementById('permission-request');
    if (permissionSection) {
        permissionSection.classList.add('hidden');
        addDebugMessage('🔐 Permission request section hidden');
    }
}

// ===== PERMISSION FUNCTIONS =====
async function requestMicrophonePermission() {
    addDebugMessage('🔐 Requesting microphone permission...');
    const requestBtn = document.getElementById('request-permission');
    if (requestBtn) requestBtn.disabled = true;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 44100
            }
        });

        // Stop the stream immediately after permission is granted
        stream.getTracks().forEach(track => track.stop());
        updateMicrophoneStatus(true);
        showMessage('Microphone access granted successfully!', 'success');

        // Notify background script
        notifyBackgroundScript(true);
        return true;

    } catch (error) {
        addDebugMessage(`❌ Permission request failed: ${error.name} - ${error.message}`);
        updateMicrophoneStatus(false);
        showMessage('Microphone permission denied', 'error');
        notifyBackgroundScript(false);
        return false;
    } finally {
        if (requestBtn) requestBtn.disabled = false;
    }
}

function notifyBackgroundScript(granted) {
    try {
        chrome.runtime.sendMessage({
            action: granted ? 'permissions_granted' : 'permissions_denied',
            type: granted ? 'permissions_granted' : 'permissions_denied',
            timestamp: Date.now(),
            source: 'popup'
        }, (response) => {
            addDebugMessage(`📤 Background script notified: ${JSON.stringify(response)}`);
        });
    } catch (error) {
        addDebugMessage(`❌ Could not notify background script: ${error.message}`);
    }
}

// ===== EXTENSION TOGGLE FUNCTIONS =====
async function toggleExtension() {
    addDebugMessage('🔄 Toggle button clicked');

    if (!permissionStatus.microphone) {
        showMessage('Microphone permission required', 'error');
        return;
    }

    if (!permissionStatus.apiKey) {
        showMessage('Gemini API key required', 'error');
        return;
    }

    if (!permissionStatus.service) {
        showMessage('Service not connected', 'error');
        return;
    }

    try {
        addDebugMessage('📤 Sending toggle message to background script...');
        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        addDebugMessage(`📥 Toggle response: ${JSON.stringify(response)}`);

        if (response && response.success !== false) {
            isActive = response.isEnabled;
            updateToggleButton();
            showMessage(`Extension ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
        } else {
            throw new Error(response?.error || 'Invalid response');
        }

    } catch (error) {
        addDebugMessage(`❌ Background service failed: ${error.message}`);
        // Local fallback
        isActive = !isActive;
        updateToggleButton();
        showMessage(`Extension ${isActive ? 'activated' : 'deactivated'} (local mode)`, 'success');
    }
}

// ===== INITIALIZATION FUNCTIONS =====
async function checkPermissions() {
    addDebugMessage('🔍 Checking microphone permissions...');
    try {
        // Try to access the microphone to check permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        updateMicrophoneStatus(true);
    } catch (error) {
        try {
            if ('permissions' in navigator) {
                const micPermission = await navigator.permissions.query({ name: 'microphone' });
                updateMicrophoneStatus(micPermission.state === 'granted');
                micPermission.onchange = () => {
                    updateMicrophoneStatus(micPermission.state === 'granted');
                };
            } else {
                updateMicrophoneStatus(false);
            }
        } catch (permError) {
            addDebugMessage(`❌ Permission API check failed: ${permError.message}`);
            updateMicrophoneStatus(false);
        }
    }
}

async function checkApiKey() {
    try {
        addDebugMessage('🔍 Checking for existing API key...');
        const data = await chrome.storage.local.get(['geminiApiKey']);
        if (data.geminiApiKey) {
            const apiKeyInput = document.getElementById('api-key-input');
            const testBtn = document.getElementById('test-api');

            // Show masked API key
            apiKeyInput.value = '•'.repeat(Math.min(data.geminiApiKey.length, 40));
            testBtn.classList.remove('hidden');
            updateApiKeyStatus(true);
            addDebugMessage(`✅ Existing API key found (length: ${data.geminiApiKey.length})`);
        } else {
            updateApiKeyStatus(false);
            addDebugMessage('❌ No API key found');
        }
    } catch (error) {
        addDebugMessage(`❌ Error checking API key: ${error.message}`);
        updateApiKeyStatus(false);
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
    addDebugMessage(`🐛 Debug info ${debugVisible ? 'shown' : 'hidden'}`);
}

async function initializePopup() {
    addDebugMessage('🚀 Initializing working popup...');
    document.getElementById('load-time').textContent = new Date().toLocaleString();

    // Check permissions and API key
    await checkPermissions();
    await checkApiKey();

    // Connect to background service
    try {
        addDebugMessage('🔌 Connecting to background service...');
        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATUS' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);

        addDebugMessage(`📥 Background service response: ${JSON.stringify(response)}`);

        if (response && response.success !== false) {
            isActive = response.isEnabled || false;
            updateConnectionStatus(true);
        } else {
            throw new Error('Invalid response');
        }

    } catch (error) {
        addDebugMessage(`❌ Background service failed: ${error.message}`);
        updateConnectionStatus(false);

        try {
            const data = await chrome.storage.local.get(['isEnabled']);
            isActive = data.isEnabled || false;
        } catch (storageError) {
            addDebugMessage(`❌ Storage failed: ${storageError.message}`);
            isActive = false;
        }
    }

    updateToggleButton();
    updateToggleAvailability();
    addDebugMessage('✅ Working popup initialization complete');
}

// ===== EVENT LISTENERS =====
function bindEventListeners() {
    addDebugMessage('🔗 Binding event listeners...');

    // Main toggle
    const mainToggle = document.getElementById('main-toggle');
    if (mainToggle) {
        mainToggle.addEventListener('click', toggleExtension);
        addDebugMessage('✅ Main toggle bound');
    }

    // API key functions
    const saveApiKeyBtn = document.getElementById('save-api-key');
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener('click', saveApiKey);
        addDebugMessage('✅ Save API key button bound');
    }

    const testApiBtn = document.getElementById('test-api');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', testApiConnection);
        addDebugMessage('✅ Test API button bound');
    }

    const apiKeyInput = document.getElementById('api-key-input');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveApiKey();
            }
        });
        // Clear masked input when user starts typing
        apiKeyInput.addEventListener('focus', (e) => {
            if (e.target.value.includes('•')) {
                e.target.value = '';
            }
        });
        addDebugMessage('✅ API key input bound');
    }

    // Permission request
    const requestBtn = document.getElementById('request-permission');
    if (requestBtn) {
        requestBtn.addEventListener('click', requestMicrophonePermission);
        addDebugMessage('✅ Permission request button bound');
    }

    // Debug toggle
    const debugBtn = document.getElementById('debug-button');
    if (debugBtn) {
        debugBtn.addEventListener('click', toggleDebugInfo);
        addDebugMessage('✅ Debug button bound');
    }

    // Transcript controls
    const clearTranscriptBtn = document.getElementById('clear-transcript');
    if (clearTranscriptBtn) {
        clearTranscriptBtn.addEventListener('click', () => {
            transcriptHistory = [];
            updateTranscriptHistory();
            document.getElementById('transcript-history').classList.add('hidden');
            addDebugMessage('🗑️ Transcript history cleared');
        });
    }

    addDebugMessage('✅ All event listeners bound successfully');
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    addDebugMessage(`📨 Received message: ${message.type}`);
    switch (message.type) {
        case 'WAKE_WORD_DETECTED':
            updateTranscriptBox(message.transcript || 'Wake word detected', true, true);
            showMessage('Wake word detected! Processing command...', 'success');
            break;
        case 'COMMAND_PROCESSED':
            showMessage(message.result || 'Command processed', 'success');
            break;
        case 'COMMAND_ERROR':
            showMessage(message.error || 'Command failed', 'error');
            break;
    }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        addDebugMessage('📄 DOM Content Loaded');
        bindEventListeners();
        initializePopup();
    });
} else {
    addDebugMessage('📄 Document ready, initializing immediately');
    bindEventListeners();
    initializePopup();
}

addDebugMessage('✅ Working Rupert Popup Script Loaded');
