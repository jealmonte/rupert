// Enhanced Wake Word Detection Handler - PERMISSION-CONTROLLED VERSION
// NO automatic microphone requests - only when user explicitly grants permission

class EnhancedWakeWordDetector {
    constructor() {
        this.recognition = null;
        this.speechRecognition = null;
        this.isListening = false;
        this.isAwake = false;
        this.isInitialized = false;
        this.permissionGranted = false;

        // Wake word variations for better detection
        this.wakeWords = ['hey rupert', 'rupert', 'hey robert'];

        // Detection settings
        this.confidence_threshold = 0.6;
        this.restart_delay = 1000;
        this.command_timeout = 10000;

        console.log('🎤 Enhanced Wake Word Detector constructed (permission-controlled)');
    }

    async initialize() {
        console.log('🚀 Initializing enhanced wake word detector (permission-aware)...');

        try {
            // Check if speech recognition is supported
            if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                throw new Error('Speech recognition not supported in this browser');
            }

            // ONLY check permission status passively - don't request
            await this.checkPermissionStatusPassively();

            if (this.permissionGranted) {
                console.log('✅ Permission already granted, setting up recognition');
                this.setupWakeWordRecognition();
                this.setupSpeechRecognition();
                this.isInitialized = true;
                console.log('✅ Enhanced wake word detection initialized successfully');
                return true;
            } else {
                console.log('⚠️ No microphone permission - waiting for user activation');
                this.isInitialized = false;
                return false;
            }

        } catch (error) {
            console.error('❌ Error initializing enhanced wake word detection:', error);
            this.notifyBackgroundScript('initialization_failed', { error: error.message });
            return false;
        }
    }

    // PASSIVE permission check - NEVER calls getUserMedia()
    async checkPermissionStatusPassively() {
        console.log('🔍 Checking permission status passively (no getUserMedia)...');

        try {
            // ONLY use Permissions API - never getUserMedia
            if ('permissions' in navigator) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                this.permissionGranted = result.state === 'granted';

                console.log(`📊 Permission status (passive check): ${result.state}`);

                // Listen for permission changes
                result.onchange = () => {
                    const oldState = this.permissionGranted;
                    this.permissionGranted = result.state === 'granted';
                    console.log(`🔄 Microphone permission changed: ${result.state}`);

                    this.notifyBackgroundScript('permission_status_changed', {
                        granted: this.permissionGranted,
                        state: result.state,
                        previousState: oldState
                    });

                    if (this.permissionGranted && !this.isInitialized) {
                        console.log('🔄 Permission granted - initializing...');
                        this.initialize();
                    } else if (!this.permissionGranted && this.isListening) {
                        console.log('🛑 Permission revoked - stopping listening...');
                        this.stopListening();
                    }
                };

                return this.permissionGranted;
            } else {
                console.log('⚠️ Permissions API not available - assuming no permission');
                this.permissionGranted = false;
                return false;
            }
        } catch (error) {
            console.log(`❌ Passive permission check failed: ${error.message}`);
            this.permissionGranted = false;
            return false;
        }
    }

    // EXPLICIT permission request - only called when user requests activation
    async requestMicrophonePermissionExplicitly() {
        console.log('🔐 User explicitly requesting microphone permission...');

        try {
            // This is the ONLY place where getUserMedia is called
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Stop the stream immediately after permission is granted
            stream.getTracks().forEach(track => track.stop());

            this.permissionGranted = true;
            console.log('✅ Microphone permission explicitly granted');

            this.notifyBackgroundScript('permission_granted', {
                timestamp: Date.now(),
                source: 'wake_word_detector',
                method: 'explicit_request'
            });

            // Now we can initialize
            if (!this.isInitialized) {
                await this.initialize();
            }

            return true;

        } catch (error) {
            this.permissionGranted = false;
            console.log(`❌ Microphone permission denied: ${error.name}`);

            this.notifyBackgroundScript('permission_denied', {
                error: error.name,
                message: error.message,
                timestamp: Date.now(),
                method: 'explicit_request'
            });

            return false;
        }
    }

    setupWakeWordRecognition() {
        if (!this.permissionGranted) {
            console.log('❌ Cannot setup wake word recognition: no permission');
            return;
        }

        console.log('🔧 Setting up wake word recognition...');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configure for continuous wake word detection
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;

        this.recognition.onresult = (event) => {
            try {
                // Process the most recent result
                const lastResult = event.results[event.results.length - 1];
                if (!lastResult || !lastResult[0]) return;

                const transcript = lastResult[0].transcript.toLowerCase().trim();
                const confidence = lastResult[0].confidence || 0;

                // Only process final results or high-confidence interim results
                if (lastResult.isFinal || confidence > 0.8) {
                    console.log(`🎯 Wake word detection: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

                    // Check for wake word in the last few words
                    const words = transcript.split(' ').slice(-4); // Last 4 words
                    const recentText = words.join(' ');

                    // Check if any wake word is present with sufficient confidence
                    const wakeWordDetected = this.wakeWords.some(wakeWord => {
                        const detected = recentText.includes(wakeWord);
                        if (detected) {
                            console.log(`🎯 Wake word "${wakeWord}" detected in: "${recentText}"`);
                        }
                        return detected;
                    });

                    if (wakeWordDetected && confidence > this.confidence_threshold) {
                        this.handleWakeWordDetected(transcript, confidence);
                    }
                }
            } catch (error) {
                console.error('❌ Error processing wake word result:', error);
            }
        };

        this.recognition.onerror = (event) => {
            console.log(`❌ Wake word recognition error: ${event.error}`);

            if (event.error === 'not-allowed') {
                this.permissionGranted = false;
                this.notifyBackgroundScript('permission_lost', { 
                    error: event.error,
                    context: 'wake_word_recognition' 
                });
                return;
            }

            // Auto-restart on most errors if still supposed to be listening
            if (this.isListening && event.error !== 'aborted') {
                console.log('🔄 Restarting wake word detection after error...');
                setTimeout(() => {
                    if (this.isListening && this.permissionGranted) {
                        this.startListening();
                    }
                }, this.restart_delay);
            }
        };

        this.recognition.onend = () => {
            console.log('🔚 Wake word recognition ended');

            // Auto-restart to maintain continuous listening if still enabled
            if (this.isListening && this.permissionGranted) {
                console.log('🔄 Auto-restarting wake word detection...');
                setTimeout(() => {
                    if (this.isListening) {
                        this.startListening();
                    }
                }, 100);
            }
        };

        this.recognition.onstart = () => {
            console.log('🎤 Wake word recognition started');
        };
    }

    setupSpeechRecognition() {
        if (!this.permissionGranted) {
            console.log('❌ Cannot setup command recognition: no permission');
            return;
        }

        console.log('🔧 Setting up command recognition...');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.speechRecognition = new SpeechRecognition();

        // Configure for command recognition
        this.speechRecognition.continuous = false;
        this.speechRecognition.interimResults = false;
        this.speechRecognition.lang = 'en-US';
        this.speechRecognition.maxAlternatives = 1;

        this.speechRecognition.onresult = (event) => {
            try {
                const result = event.results[0][0];
                const transcript = result.transcript.trim();
                const confidence = result.confidence || 0;

                console.log(`🗣️ Voice command detected: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

                // Send command to background script
                this.notifyBackgroundScript('voice_command', {
                    transcript: transcript,
                    confidence: confidence,
                    timestamp: Date.now()
                });

            } catch (error) {
                console.error('❌ Error processing voice command:', error);
            }
        };

        this.speechRecognition.onerror = (event) => {
            console.error(`❌ Speech recognition error: ${event.error}`);
            this.notifyBackgroundScript('speech_error', {
                error: event.error,
                message: this.getErrorMessage(event.error)
            });
        };

        this.speechRecognition.onend = () => {
            console.log('🔚 Speech recognition ended');
            this.isAwake = false;
            this.notifyBackgroundScript('speech_ended');
        };

        this.speechRecognition.onstart = () => {
            console.log('🎤 Speech recognition started for command');
        };
    }

    getErrorMessage(error) {
        const errorMessages = {
            'not-allowed': 'Microphone access denied',
            'no-speech': 'No speech detected',
            'audio-capture': 'Microphone not available',
            'network': 'Network error occurred',
            'service-not-allowed': 'Speech service not allowed',
            'bad-grammar': 'Grammar error in recognition'
        };
        return errorMessages[error] || `Speech recognition error: ${error}`;
    }

    handleWakeWordDetected(transcript, confidence) {
        console.log(`🎯 Wake word detected: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

        this.isAwake = true;

        // Notify background script
        this.notifyBackgroundScript('wake_word_detected', {
            keyword: 'hey rupert',
            transcript: transcript,
            confidence: confidence,
            timestamp: Date.now()
        });

        // Start listening for voice command
        this.startCommandListening();
    }

    startCommandListening() {
        if (!this.speechRecognition || !this.permissionGranted) {
            console.error('❌ Cannot start command listening: speech recognition not available or permission denied');
            return;
        }

        try {
            // Stop any existing command recognition
            if (this.speechRecognition.state !== 'inactive') {
                this.speechRecognition.stop();
            }

            setTimeout(() => {
                try {
                    this.speechRecognition.start();
                    console.log('🎤 Started listening for voice command...');

                    // Auto-timeout after specified duration
                    setTimeout(() => {
                        if (this.isAwake && this.speechRecognition) {
                            console.log('⏰ Command listening timeout');
                            this.speechRecognition.stop();
                            this.isAwake = false;
                        }
                    }, this.command_timeout);

                } catch (startError) {
                    console.error('❌ Error starting command recognition:', startError);
                }
            }, 500); // Small delay to ensure previous recognition has stopped

        } catch (error) {
            console.error('❌ Error starting speech recognition:', error);
        }
    }

    async startListening() {
        if (!this.permissionGranted) {
            console.log('❌ Cannot start listening: microphone permission not granted');
            // Just check status passively - don't request
            await this.checkPermissionStatusPassively();
            if (!this.permissionGranted) {
                return false;
            }
        }

        if (!this.isInitialized) {
            console.log('⚠️ Cannot start listening: wake word detector not initialized');
            await this.initialize();
            if (!this.isInitialized) {
                return false;
            }
        }

        if (this.recognition && !this.isListening) {
            try {
                this.isListening = true;
                this.recognition.start();

                this.notifyBackgroundScript('listening_started');
                console.log('✅ Enhanced wake word detection started');
                return true;

            } catch (error) {
                console.error('❌ Error starting wake word detection:', error);
                this.isListening = false;
                return false;
            }
        }
        return false;
    }

    async stopListening() {
        if (this.recognition && this.isListening) {
            try {
                this.isListening = false;
                this.recognition.stop();

                // Also stop command recognition if active
                if (this.speechRecognition && this.isAwake) {
                    this.speechRecognition.stop();
                    this.isAwake = false;
                }

                this.notifyBackgroundScript('listening_stopped');
                console.log('🛑 Enhanced wake word detection stopped');
                return true;

            } catch (error) {
                console.error('❌ Error stopping wake word detection:', error);
                return false;
            }
        }
        return false;
    }

    async destroy() {
        console.log('🗑️ Destroying enhanced wake word detector...');
        await this.stopListening();

        if (this.speechRecognition) {
            this.speechRecognition.stop();
        }

        this.recognition = null;
        this.speechRecognition = null;
        this.isInitialized = false;
        this.isListening = false;
        this.isAwake = false;

        console.log('✅ Enhanced wake word detector destroyed');
    }

    notifyBackgroundScript(action, data = {}) {
        try {
            const message = {
                action: action,
                type: action.toUpperCase(),
                source: 'wake_word_detector',
                timestamp: Date.now(),
                ...data
            };

            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('⚠️ Background script communication error:', chrome.runtime.lastError.message);
                } else {
                    console.log(`📨 Notified background script: ${action}`, response);
                }
            });
        } catch (error) {
            console.error('❌ Error notifying background script:', error);
        }
    }

    // Public method to check if detector is ready
    isReady() {
        return this.isInitialized && this.permissionGranted;
    }

    // Public method to get current status
    getStatus() {
        return {
            initialized: this.isInitialized,
            permissionGranted: this.permissionGranted,
            listening: this.isListening,
            awake: this.isAwake
        };
    }
}

// Initialize Enhanced Wake Word Detector
const enhancedWakeWordDetector = new EnhancedWakeWordDetector();

// Make it globally available
window.wakeWordDetector = enhancedWakeWordDetector;
window.enhancedWakeWordDetector = enhancedWakeWordDetector;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Wake word detector received message:', request);

    const action = request.action || request.type;

    switch (action) {
        case 'initialize_wake_word':
        case 'INITIALIZE_WAKE_WORD':
            enhancedWakeWordDetector.initialize().then(success => {
                sendResponse({ success });
            });
            return true;

        case 'request_microphone_permission':
        case 'REQUEST_MICROPHONE_PERMISSION':
            enhancedWakeWordDetector.requestMicrophonePermissionExplicitly().then(granted => {
                sendResponse({ success: granted });
            });
            return true;

        case 'start_wake_detection':
        case 'START_WAKE_WORD_DETECTION':
        case 'start_wake_word_detection':
            enhancedWakeWordDetector.startListening().then(success => {
                sendResponse({ success });
            });
            return true;

        case 'stop_wake_detection':
        case 'STOP_WAKE_WORD_DETECTION':
        case 'stop_wake_word_detection':
            enhancedWakeWordDetector.stopListening().then(success => {
                sendResponse({ success });
            });
            return true;

        case 'destroy_wake_word':
        case 'DESTROY_WAKE_WORD':
            enhancedWakeWordDetector.destroy().then(() => {
                sendResponse({ success: true });
            });
            return true;

        case 'get_status':
        case 'GET_STATUS':
            sendResponse({
                success: true,
                status: enhancedWakeWordDetector.getStatus()
            });
            return false;

        case 'permissions_granted':
        case 'PERMISSION_GRANTED':
            enhancedWakeWordDetector.permissionGranted = true;
            if (!enhancedWakeWordDetector.isInitialized) {
                enhancedWakeWordDetector.initialize();
            }
            sendResponse({ success: true });
            return false;

        case 'permissions_denied':
        case 'PERMISSION_DENIED':
            enhancedWakeWordDetector.permissionGranted = false;
            enhancedWakeWordDetector.stopListening();
            sendResponse({ success: true });
            return false;

        default:
            console.log('❓ Unknown message action:', action);
            sendResponse({ success: false, error: 'Unknown action' });
            return false;
    }
});

// PASSIVE initialization when page loads - NO getUserMedia calls!
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Enhanced wake word detector DOM ready - checking permission status passively...');

    setTimeout(async () => {
        try {
            // ONLY check permission status passively - NEVER request or initialize automatically
            await enhancedWakeWordDetector.checkPermissionStatusPassively();
            console.log('✅ Wake word detector permission status checked passively (no getUserMedia)');

            // Log the result for debugging
            console.log(`📊 Permission status: ${enhancedWakeWordDetector.permissionGranted ? 'GRANTED' : 'DENIED'}`);

        } catch (error) {
            console.log('❌ Passive permission check failed:', error.message);
        }
    }, 1000); // Small delay to ensure everything is loaded
});

console.log('🎤✅ Enhanced Wake Word Detector Script Loaded (PERMISSION-CONTROLLED - no auto getUserMedia)');