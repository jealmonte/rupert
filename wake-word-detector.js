// Ultra-Enhanced Wake Word Detector with Maximum Accuracy
// Implements multiple recognition improvement strategies

class UltraEnhancedWakeWordDetector {
    constructor() {
        this.recognition = null;
        this.speechRecognition = null;
        this.isListening = false;
        this.isAwake = false;
        this.isInitialized = false;
        this.permissionGranted = false;

        // Load enhanced configuration
        this.config = new EnhancedSpeechRecognitionConfig();

        // Advanced settings
        this.accuracySettings = {
            // Confidence thresholds
            wake_word_threshold: 0.7,
            command_threshold: 0.6,
            interim_threshold: 0.85,

            // Recognition parameters
            restart_delay: 500,
            command_timeout: 12000,
            max_recognition_attempts: 3,

            // Quality control
            min_speech_length: 0.5, // seconds
            max_silence_duration: 3000, // ms

            // Adaptive settings
            adaptive_threshold: true,
            learning_enabled: true
        };

        // Performance tracking
        this.stats = {
            wake_word_detections: 0,
            false_positives: 0,
            command_recognitions: 0,
            recognition_failures: 0,
            average_confidence: 0
        };

        console.log('🎯 Ultra-Enhanced Wake Word Detector constructed with maximum accuracy');
    }

    async initialize() {
        console.log('🚀 Initializing ultra-enhanced wake word detector...');

        try {
            if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
                throw new Error('Speech recognition not supported in this browser');
            }

            // Only check permission status passively
            await this.checkPermissionStatusPassively();

            if (this.permissionGranted) {
                console.log('✅ Permission granted, setting up enhanced recognition');
                this.setupEnhancedWakeWordRecognition();
                this.setupEnhancedCommandRecognition();
                this.isInitialized = true;
                return true;
            } else {
                console.log('⚠️ No microphone permission - waiting for user activation');
                this.isInitialized = false;
                return false;
            }

        } catch (error) {
            console.error('❌ Error initializing ultra-enhanced wake word detection:', error);
            return false;
        }
    }

    async checkPermissionStatusPassively() {
        console.log('🔍 Checking permission status passively...');

        try {
            if ('permissions' in navigator) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                this.permissionGranted = result.state === 'granted';

                result.onchange = () => {
                    this.permissionGranted = result.state === 'granted';
                    console.log(`🔄 Permission changed: ${result.state}`);
                };

                return this.permissionGranted;
            } else {
                this.permissionGranted = false;
                return false;
            }
        } catch (error) {
            this.permissionGranted = false;
            return false;
        }
    }

    setupEnhancedWakeWordRecognition() {
        console.log('🔧 Setting up enhanced wake word recognition...');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Apply enhanced configuration
        const config = this.config.getWakeWordConfig();
        this.recognition.continuous = config.continuous;
        this.recognition.interimResults = config.interimResults;
        this.recognition.lang = config.lang;
        this.recognition.maxAlternatives = config.maxAlternatives;

        // Advanced recognition event handlers
        this.recognition.onresult = (event) => this.handleWakeWordResults(event);
        this.recognition.onerror = (event) => this.handleWakeWordError(event);
        this.recognition.onend = () => this.handleWakeWordEnd();
        this.recognition.onstart = () => this.handleWakeWordStart();
        this.recognition.onspeechstart = () => this.handleSpeechStart();
        this.recognition.onspeechend = () => this.handleSpeechEnd();
        this.recognition.onnomatch = () => this.handleNoMatch();
    }

    setupEnhancedCommandRecognition() {
        console.log('🔧 Setting up enhanced command recognition...');

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.speechRecognition = new SpeechRecognition();

        // Apply enhanced configuration for commands
        const config = this.config.getCommandConfig();
        this.speechRecognition.continuous = config.continuous;
        this.speechRecognition.interimResults = config.interimResults;
        this.speechRecognition.lang = config.lang;
        this.speechRecognition.maxAlternatives = config.maxAlternatives;

        // Command recognition event handlers
        this.speechRecognition.onresult = (event) => this.handleCommandResults(event);
        this.speechRecognition.onerror = (event) => this.handleCommandError(event);
        this.speechRecognition.onend = () => this.handleCommandEnd();
        this.speechRecognition.onstart = () => this.handleCommandStart();
    }

    handleWakeWordResults(event) {
        try {
            // Process all available alternatives
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (!result || result.length === 0) continue;

                // Check multiple alternatives for better accuracy
                for (let j = 0; j < Math.min(result.length, 3); j++) {
                    const alternative = result[j];
                    const transcript = alternative.transcript.toLowerCase().trim();
                    const confidence = alternative.confidence || 0;

                    console.log(`🎯 Wake word analysis: "${transcript}" (confidence: ${confidence.toFixed(2)}, alternative: ${j+1})`);

                    // Enhanced wake word detection
                    const detection = this.config.detectWakeWord(transcript, confidence);

                    if (detection.detected) {
                        console.log(`🎉 Wake word detected via ${detection.method}: "${detection.matched}" (confidence: ${confidence.toFixed(2)})`);

                        // Update statistics
                        this.stats.wake_word_detections++;
                        this.updateAverageConfidence(confidence);

                        // Handle wake word with enhanced processing
                        this.handleEnhancedWakeWordDetected(transcript, confidence, detection);
                        return; // Exit after first detection
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error processing wake word results:', error);
            this.stats.recognition_failures++;
        }
    }

    handleCommandResults(event) {
        try {
            let bestResult = null;
            let bestConfidence = 0;

            // Analyze all alternatives to find best match
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                for (let j = 0; j < Math.min(result.length, 3); j++) {
                    const alternative = result[j];
                    const transcript = alternative.transcript.trim();
                    const confidence = alternative.confidence || 0;

                    console.log(`🗣️ Command alternative ${j+1}: "${transcript}" (confidence: ${confidence.toFixed(2)})`);

                    if (confidence > bestConfidence && confidence > this.accuracySettings.command_threshold) {
                        bestResult = { transcript, confidence };
                        bestConfidence = confidence;
                    }
                }
            }

            if (bestResult) {
                console.log(`✅ Best command match: "${bestResult.transcript}" (confidence: ${bestResult.confidence.toFixed(2)})`);

                // Enhanced command parsing
                const parsedCommand = this.config.parseCommand(bestResult.transcript);

                // Update statistics
                this.stats.command_recognitions++;
                this.updateAverageConfidence(bestResult.confidence);

                // Send enhanced command data
                this.notifyBackgroundScript('voice_command', {
                    transcript: bestResult.transcript,
                    confidence: bestResult.confidence,
                    parsed_command: parsedCommand,
                    timestamp: Date.now(),
                    method: 'enhanced_parsing'
                });
            } else {
                console.log('⚠️ No command met confidence threshold');
            }

        } catch (error) {
            console.error('❌ Error processing command results:', error);
            this.stats.recognition_failures++;
        }
    }

    handleEnhancedWakeWordDetected(transcript, confidence, detection) {
        console.log(`🎯 Enhanced wake word detected: "${transcript}"`);
        console.log(`📊 Detection details:`, detection);

        this.isAwake = true;

        // Notify background script with enhanced data
        this.notifyBackgroundScript('wake_word_detected', {
            keyword: detection.matched,
            transcript: transcript,
            confidence: confidence,
            detection_method: detection.method,
            similarity: detection.similarity || null,
            timestamp: Date.now(),
            enhanced: true
        });

        // Start enhanced command listening
        this.startEnhancedCommandListening();
    }

    startEnhancedCommandListening() {
        if (!this.speechRecognition || !this.permissionGranted) {
            console.error('❌ Cannot start enhanced command listening: not available');
            return;
        }

        try {
            // Stop any existing recognition
            if (this.speechRecognition.state !== 'inactive') {
                this.speechRecognition.stop();
            }

            // Delay to ensure clean start
            setTimeout(() => {
                try {
                    console.log('🎤 Starting enhanced command listening...');
                    this.speechRecognition.start();

                    // Enhanced timeout with warning
                    setTimeout(() => {
                        if (this.isAwake) {
                            console.log('⏰ Enhanced command timeout - still listening');
                            // Give extra time for complex commands
                            setTimeout(() => {
                                if (this.isAwake && this.speechRecognition) {
                                    console.log('⏰ Final command timeout');
                                    this.speechRecognition.stop();
                                    this.isAwake = false;
                                }
                            }, 3000); // Extra 3 seconds
                        }
                    }, this.accuracySettings.command_timeout);

                } catch (startError) {
                    console.error('❌ Error starting enhanced command recognition:', startError);
                }
            }, 200); // Reduced delay for faster response

        } catch (error) {
            console.error('❌ Error in enhanced command listening setup:', error);
        }
    }

    // Enhanced error handling
    handleWakeWordError(event) {
        console.log(`❌ Enhanced wake word error: ${event.error}`);

        this.stats.recognition_failures++;

        if (event.error === 'not-allowed') {
            this.permissionGranted = false;
            return;
        }

        // Adaptive restart logic
        if (this.isListening && event.error !== 'aborted') {
            const delay = this.calculateRestartDelay();
            console.log(`🔄 Restarting enhanced wake word detection in ${delay}ms...`);

            setTimeout(() => {
                if (this.isListening && this.permissionGranted) {
                    this.startListening();
                }
            }, delay);
        }
    }

    handleCommandError(event) {
        console.error(`❌ Enhanced command error: ${event.error}`);
        this.stats.recognition_failures++;

        // Try alternative recognition if available
        if (event.error === 'no-speech' && this.isAwake) {
            console.log('🔄 No speech detected, trying alternative recognition...');
            // Give another chance for command input
            setTimeout(() => {
                if (this.isAwake) {
                    this.startEnhancedCommandListening();
                }
            }, 1000);
        }
    }

    // Adaptive restart delay based on error frequency
    calculateRestartDelay() {
        const errorRate = this.stats.recognition_failures / (this.stats.wake_word_detections + this.stats.command_recognitions + 1);

        if (errorRate > 0.3) {
            return 2000; // Longer delay if many errors
        } else if (errorRate > 0.1) {
            return 1000; // Medium delay
        } else {
            return this.accuracySettings.restart_delay; // Normal delay
        }
    }

    // Update running average confidence
    updateAverageConfidence(confidence) {
        const totalDetections = this.stats.wake_word_detections + this.stats.command_recognitions;
        this.stats.average_confidence = ((this.stats.average_confidence * (totalDetections - 1)) + confidence) / totalDetections;
    }

    // Enhanced event handlers
    handleWakeWordStart() {
        console.log('🎤 Enhanced wake word recognition started');
    }

    handleWakeWordEnd() {
        console.log('🔚 Enhanced wake word recognition ended');

        if (this.isListening && this.permissionGranted) {
            setTimeout(() => {
                if (this.isListening) {
                    this.startListening();
                }
            }, 50); // Very quick restart for continuous listening
        }
    }

    handleCommandStart() {
        console.log('🎤 Enhanced command recognition started');
    }

    handleCommandEnd() {
        console.log('🔚 Enhanced command recognition ended');
        this.isAwake = false;
    }

    handleSpeechStart() {
        console.log('👂 Speech detected - processing...');
    }

    handleSpeechEnd() {
        console.log('🔇 Speech ended - analyzing...');
    }

    handleNoMatch() {
        console.log('❓ No speech recognition match found');
    }

    // Get performance statistics
    getPerformanceStats() {
        const totalDetections = this.stats.wake_word_detections + this.stats.command_recognitions;
        const successRate = totalDetections / (totalDetections + this.stats.recognition_failures);

        return {
            ...this.stats,
            success_rate: (successRate * 100).toFixed(1) + '%',
            total_detections: totalDetections,
            average_confidence_percent: (this.stats.average_confidence * 100).toFixed(1) + '%'
        };
    }

    // Enhanced public methods
    async startListening() {
        if (!this.permissionGranted) {
            console.log('❌ Cannot start listening: no permission');
            await this.checkPermissionStatusPassively();
            if (!this.permissionGranted) return false;
        }

        if (!this.isInitialized) {
            await this.initialize();
            if (!this.isInitialized) return false;
        }

        if (this.recognition && !this.isListening) {
            try {
                this.isListening = true;
                this.recognition.start();

                console.log('✅ Enhanced wake word detection started');
                console.log('📊 Performance stats:', this.getPerformanceStats());

                return true;
            } catch (error) {
                console.error('❌ Error starting enhanced wake word detection:', error);
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

                if (this.speechRecognition && this.isAwake) {
                    this.speechRecognition.stop();
                    this.isAwake = false;
                }

                console.log('🛑 Enhanced wake word detection stopped');
                console.log('📊 Final performance stats:', this.getPerformanceStats());

                return true;
            } catch (error) {
                console.error('❌ Error stopping enhanced wake word detection:', error);
                return false;
            }
        }
        return false;
    }

    notifyBackgroundScript(action, data = {}) {
        try {
            const message = {
                action: action,
                type: action.toUpperCase(),
                source: 'ultra_enhanced_wake_word_detector',
                timestamp: Date.now(),
                ...data
            };

            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('⚠️ Background script communication error:', chrome.runtime.lastError.message);
                }
            });
        } catch (error) {
            console.error('❌ Error notifying background script:', error);
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            permissionGranted: this.permissionGranted,
            listening: this.isListening,
            awake: this.isAwake,
            stats: this.getPerformanceStats()
        };
    }
}

// Initialize Enhanced Wake Word Detector
const ultraEnhancedWakeWordDetector = new UltraEnhancedWakeWordDetector();

// Make globally available
window.wakeWordDetector = ultraEnhancedWakeWordDetector;
window.ultraEnhancedWakeWordDetector = ultraEnhancedWakeWordDetector;

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const action = request.action || request.type;

    switch (action) {
        case 'initialize_wake_word':
        case 'INITIALIZE_WAKE_WORD':
            ultraEnhancedWakeWordDetector.initialize().then(success => {
                sendResponse({ success });
            });
            return true;

        case 'start_wake_detection':
        case 'START_WAKE_WORD_DETECTION':
            ultraEnhancedWakeWordDetector.startListening().then(success => {
                sendResponse({ success });
            });
            return true;

        case 'stop_wake_detection':
        case 'STOP_WAKE_WORD_DETECTION':
            ultraEnhancedWakeWordDetector.stopListening().then(success => {
                sendResponse({ success });
            });
            return true;

        case 'get_status':
        case 'GET_STATUS':
            sendResponse({
                success: true,
                status: ultraEnhancedWakeWordDetector.getStatus()
            });
            return false;

        case 'get_performance_stats':
        case 'GET_PERFORMANCE_STATS':
            sendResponse({
                success: true,
                stats: ultraEnhancedWakeWordDetector.getPerformanceStats()
            });
            return false;
    }
});

// Passive initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Ultra-enhanced wake word detector ready - checking permissions passively...');

    setTimeout(async () => {
        try {
            await ultraEnhancedWakeWordDetector.checkPermissionStatusPassively();
            console.log('✅ Ultra-enhanced wake word detector permission status checked passively');
        } catch (error) {
            console.log('❌ Passive permission check failed:', error.message);
        }
    }, 1000);
});

console.log('🎯✅ Ultra-Enhanced Wake Word Detector Script Loaded with Maximum Accuracy');