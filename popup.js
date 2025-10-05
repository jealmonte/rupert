// Enhanced Popup.js - Real-time Transcript Testing for Rupert Voice Assistant
// Shows live speech recognition results with wake word detection

console.log('🎤 Rupert Enhanced Popup Script Loading...');

// State management
let isActive = false;
let debugLog = [];
let debugVisible = false;
let permissionStatus = {
    microphone: false,
    service: false
};

// Testing variables
let testingMicrophone = false;
let speechRecognition = null;
let transcriptHistory = [];

// ===== UTILITY FUNCTIONS =====

function addDebugMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    debugLog.push(`${timestamp}: ${message}`);
    const debugElement = document.getElementById('debug-log');
    if (debugElement) {
        debugElement.innerHTML = debugLog.slice(-20).join('<br>');
    }
    console.log('[RUPERT]', message);
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
    messageDiv.textContent = message;
    messageDiv.classList.add('fade-in');
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
        permissionStatus.service = true;
    } else {
        dot.style.backgroundColor = '#EF4444';
        text.textContent = 'Disconnected';
        permissionStatus.service = false;
    }
}

function updateMicrophoneStatus(granted) {
    const indicator = document.getElementById('mic-permission');
    const text = document.getElementById('mic-status-text');

    if (granted) {
        indicator.style.backgroundColor = '#22C55E';
        indicator.classList.add('granted');
        text.textContent = 'Granted';
        permissionStatus.microphone = true;

        // Show microphone test section
        showMicrophoneTest();
        hidePermissionRequest();

        addDebugMessage('Microphone permission granted');
    } else {
        indicator.style.backgroundColor = '#EF4444';
        indicator.classList.remove('granted');
        text.textContent = 'Denied';
        permissionStatus.microphone = false;

        // Show permission request section
        hideMicrophoneTest();
        showPermissionRequest();

        addDebugMessage('Microphone permission denied');
    }

    updateToggleAvailability();
}

function updateToggleAvailability() {
    const toggleButton = document.getElementById('main-toggle');
    const canEnable = permissionStatus.microphone && permissionStatus.service;

    if (!canEnable && isActive) {
        isActive = false;
        updateToggleButton();
    }

    if (canEnable) {
        toggleButton.classList.remove('disabled');
        toggleButton.style.opacity = '1';
        toggleButton.style.pointerEvents = 'auto';
    } else {
        toggleButton.classList.add('disabled');
        toggleButton.style.opacity = '0.5';
        toggleButton.style.pointerEvents = 'none';
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
        slider.style.transform = 'translateX(28px)';
    } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
        text.textContent = 'Turn On';
        description.textContent = 'Start voice recognition';
        slider.style.transform = 'translateX(0)';
    }
}

// ===== MICROPHONE TEST UI FUNCTIONS =====

function showMicrophoneTest() {
    const testSection = document.getElementById('microphone-test');
    if (testSection) {
        testSection.classList.remove('hidden');
        addDebugMessage('Microphone test section shown');
    }
}

function hideMicrophoneTest() {
    const testSection = document.getElementById('microphone-test');
    if (testSection) {
        testSection.classList.add('hidden');
        addDebugMessage('Microphone test section hidden');
    }
}

function showPermissionRequest() {
    const permissionSection = document.getElementById('permission-request');
    if (permissionSection) {
        permissionSection.classList.remove('hidden');
        addDebugMessage('Permission request section shown');
    }
}

function hidePermissionRequest() {
    const permissionSection = document.getElementById('permission-request');
    if (permissionSection) {
        permissionSection.classList.add('hidden');
        addDebugMessage('Permission request section hidden');
    }
}

function updateTestStatus(message, className = 'status') {
    const statusEl = document.getElementById('test-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'test-status ' + className;
    }
    addDebugMessage('Test status: ' + message);
}

function updateTranscriptDisplay(transcript, isWakeWord = false) {
    const transcriptEl = document.getElementById('transcript-text');
    if (transcriptEl) {
        transcriptEl.classList.remove('transcript-empty');

        // Add timestamp
        const timestamp = new Date().toLocaleTimeString();

        if (isWakeWord) {
            // Highlight wake words
            const highlightedTranscript = transcript
                .replace(/(hey rupert|rupert)/gi, '<span class="wake-word-highlight">$1</span>');
            transcriptEl.innerHTML = `[${timestamp}] ${highlightedTranscript}`;
        } else {
            transcriptEl.textContent = `[${timestamp}] ${transcript}`;
        }

        // Add to history
        transcriptHistory.push({
            timestamp: timestamp,
            transcript: transcript,
            isWakeWord: isWakeWord
        });

        // Keep only last 10 entries
        if (transcriptHistory.length > 10) {
            transcriptHistory = transcriptHistory.slice(-10);
        }

        addDebugMessage(`Transcript updated: "${transcript}" (wake word: ${isWakeWord})`);
    }
}

function updateConfidenceDisplay(confidence) {
    const percentageEl = document.getElementById('confidence-percentage');
    const fillEl = document.getElementById('confidence-fill');

    const confidencePercent = Math.round(confidence * 100);

    if (percentageEl) {
        percentageEl.textContent = confidencePercent + '%';
    }

    if (fillEl) {
        fillEl.style.width = confidencePercent + '%';
    }

    addDebugMessage(`Confidence updated: ${confidencePercent}%`);
}

function clearTranscript() {
    const transcriptEl = document.getElementById('transcript-text');
    if (transcriptEl) {
        transcriptEl.textContent = 'Transcript cleared. Speak after clicking "Test Microphone" to see your words here...';
        transcriptEl.classList.add('transcript-empty');
    }

    transcriptHistory = [];
    updateConfidenceDisplay(0);
    updateTestStatus('Transcript cleared', 'status');
    addDebugMessage('Transcript cleared by user');
}

// ===== MICROPHONE TESTING FUNCTIONS =====

async function testMicrophone() {
    addDebugMessage('🎤 Starting comprehensive microphone test...');

    // Check if already testing
    if (testingMicrophone) {
        addDebugMessage('⚠️ Test already in progress');
        return;
    }

    // Check speech recognition support
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        updateTestStatus('❌ Speech recognition not supported in this browser', 'error');
        showMessage('Speech recognition not supported in this browser', 'error');
        addDebugMessage('❌ Speech recognition API not available');
        return;
    }

    testingMicrophone = true;
    const testBtn = document.getElementById('test-microphone');

    // Update UI
    if (testBtn) {
        testBtn.disabled = true;
        testBtn.innerHTML = '<span>🛑</span> Stop Test';
        addDebugMessage('✅ Test button updated to stop mode');
    }

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();

    // Configure recognition
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';
    speechRecognition.maxAlternatives = 1;

    speechRecognition.onstart = () => {
        updateTestStatus('🎤 Listening... Say "Hey Rupert" or anything!', 'listening');
        addDebugMessage('🎤 Speech recognition started - listening for speech');
    };

    speechRecognition.onresult = (event) => {
        const result = event.results[0][0];
        const transcript = result.transcript.toLowerCase();
        const confidence = result.confidence || 0;

        addDebugMessage(`📝 Speech detected: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

        // Update confidence display
        updateConfidenceDisplay(confidence);

        // Check for wake words
        const isWakeWord = transcript.includes('hey rupert') || transcript.includes('rupert');

        if (isWakeWord) {
            updateTestStatus(`🎉 Perfect! Wake word detected: "${transcript}"`, 'success');
            updateTranscriptDisplay(transcript, true);
            showMessage(`Wake word test successful: "${transcript}"`, 'success');
            addDebugMessage(`🎯 Wake word detected: "${transcript}"`);
        } else {
            updateTestStatus(`✅ Microphone working! Heard: "${transcript}" (${Math.round(confidence * 100)}% confidence)`, 'success');
            updateTranscriptDisplay(transcript, false);
            showMessage(`Speech recognized: "${transcript}"`, 'success');
            addDebugMessage(`✅ Regular speech detected: "${transcript}"`);
        }

        resetTestButton();
    };

    speechRecognition.onerror = (event) => {
        let errorMessage = 'Microphone test failed';

        addDebugMessage(`❌ Speech recognition error: ${event.error}`);

        switch (event.error) {
            case 'not-allowed':
                errorMessage = '❌ Microphone access denied. Please grant permission.';
                updateMicrophoneStatus(false);
                break;
            case 'no-speech':
                errorMessage = '❌ No speech detected. Try speaking closer to your microphone.';
                break;
            case 'audio-capture':
                errorMessage = '❌ Microphone not found or in use by another application.';
                break;
            case 'network':
                errorMessage = '❌ Network error occurred during speech recognition.';
                break;
            case 'service-not-allowed':
                errorMessage = '❌ Speech service not allowed.';
                break;
            case 'bad-grammar':
                errorMessage = '❌ Speech recognition grammar error.';
                break;
            default:
                errorMessage = `❌ Speech recognition error: ${event.error}`;
        }

        updateTestStatus(errorMessage, 'error');
        showMessage(errorMessage, 'error');
        resetTestButton();
    };

    speechRecognition.onend = () => {
        addDebugMessage('🔚 Speech recognition session ended');

        if (testingMicrophone) {
            // If still in testing mode and recognition ended naturally, restart
            setTimeout(() => {
                if (testingMicrophone) {
                    addDebugMessage('🔄 Restarting speech recognition for continuous testing');
                    testMicrophone();
                }
            }, 1000);
        }
    };

    try {
        speechRecognition.start();
        addDebugMessage('🚀 Speech recognition started successfully');

    } catch (error) {
        updateTestStatus('❌ Could not start microphone test', 'error');
        showMessage('Could not start microphone test: ' + error.message, 'error');
        addDebugMessage(`❌ Error starting speech recognition: ${error.message}`);
        resetTestButton();
    }
}

function stopMicrophoneTest() {
    if (testingMicrophone && speechRecognition) {
        addDebugMessage('🛑 Stopping microphone test by user request');
        testingMicrophone = false;

        try {
            speechRecognition.stop();
        } catch (error) {
            addDebugMessage(`Warning: Error stopping recognition: ${error.message}`);
        }

        updateTestStatus('Test stopped by user', 'status');
        resetTestButton();
    }
}

function resetTestButton() {
    testingMicrophone = false;
    const testBtn = document.getElementById('test-microphone');
    if (testBtn) {
        testBtn.disabled = false;
        testBtn.innerHTML = '<span>🎤</span> Test Microphone';
        addDebugMessage('✅ Test button reset to normal state');
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
        addDebugMessage(`Permission request failed: ${error.name} - ${error.message}`);

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
            addDebugMessage('Background script notified: ' + JSON.stringify(response));
        });
    } catch (error) {
        addDebugMessage('Could not notify background script: ' + error.message);
    }
}

// ===== EXTENSION TOGGLE FUNCTIONS =====

async function toggleExtension() {
    addDebugMessage('🔄 Toggle button clicked');

    if (!permissionStatus.microphone) {
        showMessage('Microphone permission required', 'error');
        return;
    }

    if (!permissionStatus.service) {
        showMessage('Service not connected', 'error');
        return;
    }

    try {
        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'TOGGLE_EXTENSION' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);

        if (response && response.success !== false) {
            isActive = response.isEnabled;
            updateToggleButton();
            showMessage(`Extension ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
        } else {
            throw new Error(response?.error || 'Invalid response');
        }

    } catch (error) {
        addDebugMessage(`Background service failed: ${error.message}`);

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
            addDebugMessage(`Permission API check failed: ${permError.message}`);
            updateMicrophoneStatus(false);
        }
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
    addDebugMessage('🚀 Initializing enhanced popup...');
    document.getElementById('load-time').textContent = new Date().toLocaleString();

    // Check permissions
    await checkPermissions();

    // Connect to background service
    try {
        const response = await Promise.race([
            chrome.runtime.sendMessage({ type: 'GET_EXTENSION_STATUS' }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);

        if (response && response.success !== false) {
            isActive = response.isEnabled || false;
            updateConnectionStatus(true);
        } else {
            throw new Error('Invalid response');
        }

    } catch (error) {
        addDebugMessage(`Background service failed: ${error.message}`);
        updateConnectionStatus(false);

        try {
            const data = await chrome.storage.local.get(['isEnabled']);
            isActive = data.isEnabled || false;
        } catch (storageError) {
            addDebugMessage(`Storage failed: ${storageError.message}`);
            isActive = false;
        }
    }

    updateToggleButton();
    updateToggleAvailability();
    addDebugMessage('✅ Enhanced popup initialization complete');
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

    // Permission request
    const requestBtn = document.getElementById('request-permission');
    if (requestBtn) {
        requestBtn.addEventListener('click', requestMicrophonePermission);
        addDebugMessage('✅ Permission request button bound');
    }

    // Microphone test
    const testBtn = document.getElementById('test-microphone');
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            if (testingMicrophone) {
                stopMicrophoneTest();
            } else {
                testMicrophone();
            }
        });
        addDebugMessage('✅ Test microphone button bound');
    }

    // Clear transcript
    const clearBtn = document.getElementById('clear-transcript');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearTranscript);
        addDebugMessage('✅ Clear transcript button bound');
    }

    // Debug toggle
    const debugBtn = document.getElementById('debug-button');
    if (debugBtn) {
        debugBtn.addEventListener('click', toggleDebugInfo);
        addDebugMessage('✅ Debug button bound');
    }

    addDebugMessage('✅ All event listeners bound successfully');
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    addDebugMessage(`📨 Received message: ${message.type}`);

    switch (message.type) {
        case 'WAKE_WORD_DETECTED':
            showMessage('Wake word detected! Listening...', 'success');
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

addDebugMessage('✅ Enhanced Rupert Popup Script Loaded with Transcript Testing');