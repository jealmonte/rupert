// Wake Word Detection Handler
class WakeWordDetector {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.isAwake = false;
    this.speechRecognition = null;
    this.wakeWords = ['hey rupert', 'rupert', 'hey robert']; // variations
  }

  async initialize() {
    try {
      // Initialize wake word detection
      this.setupWakeWordRecognition();
      
      // Initialize command speech recognition (separate from wake word)
      this.setupSpeechRecognition();
      
      console.log('Wake word detection initialized');
      return true;
    } catch (error) {
      console.error('Error initializing wake word detection:', error);
      return false;
    }
  }

  setupWakeWordRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        
        // Check for wake word in the last few words
        const words = transcript.split(' ').slice(-3); // Last 3 words
        const recentText = words.join(' ');
        
        if (this.wakeWords.some(wake => recentText.includes(wake))) {
          this.handleWakeWordDetected(transcript);
        }
      };
      
      this.recognition.onerror = (event) => {
        console.log('Wake word recognition error:', event.error);
        // Auto-restart on errors
        if (this.isListening) {
          setTimeout(() => this.startListening(), 1000);
        }
      };
      
      this.recognition.onend = () => {
        // Auto-restart to maintain continuous listening
        if (this.isListening) {
          setTimeout(() => this.startListening(), 100);
        }
      };
    }
  }

  setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'en-US';
      this.speechRecognition.maxAlternatives = 1;

      this.speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        console.log('Voice command:', transcript);
        
        // Send command to background script
        chrome.runtime.sendMessage({
          action: 'voice_command',
          transcript: transcript
        });
      };

      this.speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        chrome.runtime.sendMessage({
          action: 'speech_error',
          error: event.error
        });
      };

      this.speechRecognition.onend = () => {
        console.log('Speech recognition ended');
        this.isAwake = false;
        chrome.runtime.sendMessage({ action: 'speech_ended' });
      };
    }
  }

  handleWakeWordDetected(transcript) {
    console.log('Wake word detected in:', transcript);
    this.isAwake = true;
    
    // Notify background script
    chrome.runtime.sendMessage({
      action: 'wake_word_detected',
      keyword: 'hey rupert'
    });

    // Start listening for voice command
    if (this.speechRecognition) {
      try {
        this.speechRecognition.start();
        console.log('Started listening for voice command...');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }

    // Auto-sleep after 10 seconds if no command
    setTimeout(() => {
      if (this.isAwake && this.speechRecognition) {
        this.speechRecognition.stop();
        this.isAwake = false;
      }
    }, 10000);
  }

  async startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.isListening = true;
        this.recognition.start();
        
        chrome.runtime.sendMessage({ action: 'listening_started' });
        console.log('Wake word detection started');
        return true;
      } catch (error) {
        console.error('Error starting wake word detection:', error);
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
        
        chrome.runtime.sendMessage({ action: 'listening_stopped' });
        console.log('Wake word detection stopped');
        return true;
      } catch (error) {
        console.error('Error stopping wake word detection:', error);
        return false;
      }
    }
    return false;
  }

  async destroy() {
    await this.stopListening();
    
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
    
    this.recognition = null;
    this.speechRecognition = null;
  }
}

// Initialize Wake Word Detector
const wakeWordDetector = new WakeWordDetector();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'initialize_wake_word':
      wakeWordDetector.initialize().then(success => {
        sendResponse({ success });
      });
      return true;
      
    case 'start_wake_detection':
      wakeWordDetector.startListening().then(success => {
        sendResponse({ success });
      });
      return true;
      
    case 'stop_wake_detection':
      wakeWordDetector.stopListening().then(success => {
        sendResponse({ success });
      });
      return true;
      
    case 'destroy_wake_word':
      wakeWordDetector.destroy().then(() => {
        sendResponse({ success: true });
      });
      return true;
  }
});

// Auto-initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(async () => {
    try {
      // First try to initialize normally
      const success = await wakeWordDetector.initialize();
      if (success) {
        await wakeWordDetector.startListening();
      }
    } catch (error) {
      // If initialization fails, request permission through background
      console.log('Wake word detection failed, requesting permissions...');
      chrome.runtime.sendMessage({ action: 'request_microphone_permission' });
    }
  }, 2000);
});