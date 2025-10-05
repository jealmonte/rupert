// permission.js - Handle microphone and extension permissions
class PermissionManager {
  constructor() {
    this.statusEl = document.getElementById('status');
    this.testBtn = document.getElementById('testMicrophone');
    this.requestBtn = document.getElementById('requestPermission');
    this.settingsBtn = document.getElementById('openSettings');
    
    this.initializeEventListeners();
    this.checkInitialPermissions();
  }

  initializeEventListeners() {
    // Request permissions button
    this.requestBtn?.addEventListener('click', () => this.requestAllPermissions());
    
    // Test microphone button
    this.testBtn?.addEventListener('click', () => this.testMicrophone());
    
    // Open settings button (if microphone is denied)
    this.settingsBtn?.addEventListener('click', () => this.openExtensionSettings());
  }

  async checkInitialPermissions() {
    this.updateStatus('Checking permissions...', 'status');
    
    try {
      // Check if microphone permission was previously granted
      const micPermission = await navigator.permissions.query({ name: 'microphone' });
      
      if (micPermission.state === 'granted') {
        this.updateStatus('✅ Microphone already enabled!', 'status success');
        this.showTestButton();
        this.autoCloseWindow();
      } else if (micPermission.state === 'denied') {
        this.updateStatus('❌ Microphone access denied. Click to open settings.', 'status error');
        this.showSettingsButton();
      } else {
        this.updateStatus('🎤 Click to grant microphone permission', 'status');
      }
    } catch (error) {
      console.log('Permission API not supported, using fallback');
      this.updateStatus('🎤 Click to grant microphone permission', 'status');
    }
  }

  async requestAllPermissions() {
    this.updateStatus('Requesting permissions...', 'status');
    
    try {
      // Step 1: Request microphone permission
      const microphoneGranted = await this.requestMicrophonePermission();
      
      if (!microphoneGranted) {
        throw new Error('Microphone permission denied');
      }

      // Step 2: Request optional Chrome extension permissions
      await this.requestOptionalPermissions();
      
      // Step 3: Notify background script
      this.notifyBackgroundScript();
      
      // Step 4: Show success and test option
      this.updateStatus('✅ All permissions granted successfully!', 'status success');
      this.showTestButton();
      this.autoCloseWindow();
      
    } catch (error) {
      console.error('Permission error:', error);
      this.handlePermissionError(error);
    }
  }

  async requestMicrophonePermission() {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      // Stop the stream immediately after permission is granted
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Microphone permission granted');
      return true;
      
    } catch (error) {
      console.error('Microphone permission denied:', error);
      
      if (error.name === 'NotAllowedError') {
        this.updateStatus('❌ Microphone blocked. Click to open settings.', 'status error');
        this.showSettingsButton();
      } else if (error.name === 'NotFoundError') {
        this.updateStatus('❌ No microphone found on this device.', 'status error');
      } else {
        this.updateStatus('❌ Microphone access failed. Try again.', 'status error');
      }
      
      return false;
    }
  }

  async requestOptionalPermissions() {
    try {
      // Request optional Chrome extension permissions if available
      if (chrome.permissions) {
        const optionalPermissions = {
          permissions: ['tabs', 'storage', 'activeTab'],
          origins: ['<all_urls>']
        };
        
        const granted = await chrome.permissions.request(optionalPermissions);
        console.log('Optional permissions granted:', granted);
        return granted;
      }
    } catch (error) {
      console.log('Optional permissions not available or already granted');
      return true;
    }
  }

  testMicrophone() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      this.updateStatus('❌ Speech recognition not supported', 'status error');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      this.updateStatus('🎤 Listening... say "Hey Rupert" or anything!', 'status listening');
      this.testBtn.disabled = true;
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const confidence = event.results[0][0].confidence;
      
      if (transcript.includes('hey rupert') || transcript.includes('rupert')) {
        this.updateStatus(`🎉 Perfect! Detected wake word: "${transcript}"`, 'status success');
      } else {
        this.updateStatus(`✅ Microphone working! Heard: "${transcript}" (${Math.round(confidence * 100)}% confidence)`, 'status success');
      }
      
      this.testBtn.disabled = false;
    };
    
    recognition.onerror = (event) => {
      let errorMessage = 'Microphone test failed';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Check browser settings.';
          this.showSettingsButton();
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Try speaking closer to microphone.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not found or in use by another app.';
          break;
        default:
          errorMessage = `Microphone error: ${event.error}`;
      }
      
      this.updateStatus(`❌ ${errorMessage}`, 'status error');
      this.testBtn.disabled = false;
    };
    
    recognition.onend = () => {
      this.testBtn.disabled = false;
      if (this.statusEl.textContent.includes('Listening')) {
        this.updateStatus('🔇 Test completed. Try again or close this window.', 'status');
      }
    };
    
    try {
      recognition.start();
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (recognition) {
          recognition.stop();
        }
      }, 10000);
      
    } catch (error) {
      this.updateStatus('❌ Could not start microphone test', 'status error');
      this.testBtn.disabled = false;
    }
  }

  openExtensionSettings() {
    // Open Chrome's extension settings page for this specific extension
    const extensionId = chrome.runtime.id;
    const settingsUrl = `chrome://extensions/?options=${extensionId}`;
    
    try {
      chrome.tabs.create({ url: settingsUrl });
      window.close();
    } catch (error) {
      // Fallback: open general site settings
      const fallbackUrl = `chrome://settings/content/siteDetails?site=chrome-extension%3A%2F%2F${extensionId}%2F`;
      chrome.tabs.create({ url: fallbackUrl });
      window.close();
    }
  }

  notifyBackgroundScript() {
    try {
      chrome.runtime.sendMessage({ 
        action: 'permissions_granted',
        timestamp: Date.now()
      });
    } catch (error) {
      console.log('Could not notify background script:', error);
    }
  }

  updateStatus(message, className) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
      this.statusEl.className = className;
    }
  }

  showTestButton() {
    if (this.testBtn) {
      this.testBtn.style.display = 'inline-block';
    }
  }

  showSettingsButton() {
    if (!this.settingsBtn) {
      // Create settings button if it doesn't exist
      this.settingsBtn = document.createElement('button');
      this.settingsBtn.id = 'openSettings';
      this.settingsBtn.textContent = 'Open Settings';
      this.settingsBtn.onclick = () => this.openExtensionSettings();
      this.requestBtn.parentNode.insertBefore(this.settingsBtn, this.requestBtn.nextSibling);
    }
    this.settingsBtn.style.display = 'inline-block';
  }

  autoCloseWindow() {
    // Auto-close after 5 seconds with countdown
    let countdown = 5;
    const countdownInterval = setInterval(() => {
      if (this.statusEl) {
        const baseMessage = this.statusEl.textContent.split(' (')[0];
        this.statusEl.textContent = `${baseMessage} (closing in ${countdown}s)`;
      }
      countdown--;
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        window.close();
      }
    }, 1000);
    
    // Allow user to cancel auto-close by clicking anywhere
    document.addEventListener('click', () => {
      clearInterval(countdownInterval);
      if (this.statusEl) {
        const baseMessage = this.statusEl.textContent.split(' (')[0];
        this.statusEl.textContent = baseMessage;
      }
    }, { once: true });
  }

  handlePermissionError(error) {
    if (error.message.includes('denied')) {
      this.updateStatus('❌ Permission denied. Click "Open Settings" to enable manually.', 'status error');
      this.showSettingsButton();
    } else {
      this.updateStatus('❌ Permission request failed. Please try again.', 'status error');
    }
  }
}

// Initialize permission manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  new PermissionManager();
});

// Handle messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'check_permissions') {
    sendResponse({ 
      permissionsGranted: true,
      timestamp: Date.now()
    });
  }
});
