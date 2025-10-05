/**
 * Rupert Command Overlay Manager
 * Handles the visual feedback overlay that appears during voice command processing
 */

class RupertCommandOverlay {
    constructor() {
        this.overlay = null;
        this.currentState = null;
        this.progressInterval = null;
        this.hideTimeout = null;
        this.isVisible = false;
        this.states = {
            WAKE_WORD: 'wake-word',
            PROCESSING: 'processing',
            SUCCESS: 'success',
            ERROR: 'error'
        };

        this.init();
        this.setupMessageListener();

        console.log('🎭 Rupert Command Overlay initialized');
    }

    init() {
        this.createOverlay();
        this.injectIntoPage();
    }

    createOverlay() {
        // Create the main overlay container
        this.overlay = document.createElement('div');
        this.overlay.id = 'rupert-command-overlay';
        this.overlay.className = 'command-overlay hidden';

        // Create the overlay content
        this.overlay.innerHTML = `
            <div class="overlay-content">
                <!-- Wake Word Detection State -->
                <div class="state-container wake-word-state" id="wakeWordState">
                    <div class="pulse-animation">
                        <div class="pulse-circle"></div>
                        <div class="pulse-circle delay-1"></div>
                        <div class="pulse-circle delay-2"></div>
                    </div>
                    <div class="status-icon">🎤</div>
                    <div class="status-text">Wake word detected!</div>
                    <div class="subtitle">Listening for your command...</div>
                </div>

                <!-- Command Processing State -->
                <div class="state-container processing-state hidden" id="processingState">
                    <div class="spinner-container">
                        <div class="spinner"></div>
                        <div class="spinner-inner"></div>
                    </div>
                    <div class="status-icon">⚡</div>
                    <div class="status-text">Processing command...</div>
                    <div class="subtitle" id="commandText">Please wait</div>
                </div>

                <!-- Command Success State -->
                <div class="state-container success-state hidden" id="successState">
                    <div class="checkmark-container">
                        <div class="checkmark">✓</div>
                    </div>
                    <div class="status-text">Command executed!</div>
                    <div class="subtitle" id="successMessage">Task completed successfully</div>
                </div>

                <!-- Command Error State -->
                <div class="state-container error-state hidden" id="errorState">
                    <div class="error-icon">❌</div>
                    <div class="status-text">Command failed</div>
                    <div class="subtitle" id="errorMessage">Please try again</div>
                </div>

                <!-- Progress Bar -->
                <div class="progress-container">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
            </div>
        `;
    }

    injectIntoPage() {
        // Inject CSS if not already present
        if (!document.getElementById('rupert-overlay-styles')) {
            this.injectStyles();
        }

        // Add overlay to page
        if (!document.getElementById('rupert-command-overlay')) {
            document.body.appendChild(this.overlay);
        }
    }

    injectStyles() {
        const style = document.createElement('style');
        style.id = 'rupert-overlay-styles';
        style.textContent = `
            /* Critical CSS for overlay functionality */
            #rupert-command-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(10px);
                z-index: 999999;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 1;
                transform: scale(1);
            }

            #rupert-command-overlay.hidden {
                opacity: 0;
                transform: scale(0.9);
                pointer-events: none;
            }

            .overlay-content {
                background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%);
                border-radius: 24px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
                border: 1px solid rgba(255, 255, 255, 0.2);
                min-width: 320px;
                max-width: 400px;
                color: white;
                position: relative;
                overflow: hidden;
            }

            .state-container {
                transition: all 0.3s ease-in-out;
            }

            .state-container.hidden {
                opacity: 0;
                transform: translateY(20px);
                position: absolute;
                pointer-events: none;
            }

            .status-text {
                font-size: 24px;
                font-weight: 700;
                margin-bottom: 8px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .subtitle {
                font-size: 16px;
                opacity: 0.9;
                font-weight: 400;
                margin-bottom: 20px;
            }

            .progress-container {
                margin-top: 25px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                height: 6px;
                overflow: hidden;
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #22c55e, #3b82f6);
                border-radius: 10px;
                transition: width 0.3s ease;
                width: 0%;
            }
        `;
        document.head.appendChild(style);
    }

    show(state = this.states.WAKE_WORD, options = {}) {
        console.log(`🎭 Showing overlay in ${state} state`);

        this.currentState = state;
        this.isVisible = true;

        // Clear any existing timeouts
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        // Show overlay
        this.overlay.classList.remove('hidden');

        // Hide all state containers first
        this.hideAllStates();

        // Show the appropriate state
        this.showState(state, options);

        // Start progress if specified
        if (options.progress !== false) {
            this.startProgress(options.duration || 3000);
        }

        // Auto-hide if specified
        if (options.autoHide) {
            this.hideTimeout = setTimeout(() => {
                this.hide();
            }, options.autoHide);
        }
    }

    hide() {
        console.log('🎭 Hiding overlay');

        this.overlay.classList.add('hidden');
        this.isVisible = false;

        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        // Reset progress bar
        setTimeout(() => {
            this.setProgress(0);
        }, 300);
    }

    hideAllStates() {
        const states = ['wakeWordState', 'processingState', 'successState', 'errorState'];
        states.forEach(stateId => {
            const element = document.getElementById(stateId);
            if (element) {
                element.classList.add('hidden');
            }
        });
    }

    showState(state, options = {}) {
        let stateElementId;

        switch (state) {
            case this.states.WAKE_WORD:
                stateElementId = 'wakeWordState';
                break;
            case this.states.PROCESSING:
                stateElementId = 'processingState';
                if (options.command) {
                    const commandTextEl = document.getElementById('commandText');
                    if (commandTextEl) {
                        commandTextEl.textContent = `Processing: "${options.command}"`;
                    }
                }
                break;
            case this.states.SUCCESS:
                stateElementId = 'successState';
                if (options.message) {
                    const successMessageEl = document.getElementById('successMessage');
                    if (successMessageEl) {
                        successMessageEl.textContent = options.message;
                    }
                }
                break;
            case this.states.ERROR:
                stateElementId = 'errorState';
                if (options.message) {
                    const errorMessageEl = document.getElementById('errorMessage');
                    if (errorMessageEl) {
                        errorMessageEl.textContent = options.message;
                    }
                }
                break;
            default:
                console.warn('Unknown state:', state);
                return;
        }

        const stateElement = document.getElementById(stateElementId);
        if (stateElement) {
            stateElement.classList.remove('hidden');
        }
    }

    updateState(state, options = {}) {
        if (!this.isVisible) {
            this.show(state, options);
            return;
        }

        this.hideAllStates();
        this.showState(state, options);
        this.currentState = state;

        console.log(`🎭 Updated overlay to ${state} state`);
    }

    setProgress(percentage) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }
    }

    startProgress(duration = 3000) {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        let progress = 0;
        const step = 100 / (duration / 50); // Update every 50ms

        this.progressInterval = setInterval(() => {
            progress += step;
            this.setProgress(progress);

            if (progress >= 100) {
                clearInterval(this.progressInterval);
            }
        }, 50);
    }

    setupMessageListener() {
        // Listen for messages from the content script or background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('🎭 Overlay received message:', message);

            switch (message.type) {
                case 'WAKE_WORD_DETECTED':
                    this.show(this.states.WAKE_WORD, {
                        autoHide: 10000 // Hide after 10 seconds if no command
                    });
                    break;

                case 'COMMAND_PROCESSING':
                    this.updateState(this.states.PROCESSING, {
                        command: message.command || 'voice command',
                        duration: message.duration || 3000
                    });
                    break;

                case 'COMMAND_SUCCESS':
                    this.updateState(this.states.SUCCESS, {
                        message: message.message || 'Command executed successfully',
                        autoHide: 2000
                    });
                    break;

                case 'COMMAND_ERROR':
                    this.updateState(this.states.ERROR, {
                        message: message.error || 'Command failed',
                        autoHide: 3000
                    });
                    break;

                case 'HIDE_OVERLAY':
                    this.hide();
                    break;

                default:
                    break;
            }

            sendResponse({ success: true });
        });
    }

    // Public API methods
    showWakeWord() {
        this.show(this.states.WAKE_WORD, { autoHide: 10000 });
    }

    showProcessing(command = '') {
        this.updateState(this.states.PROCESSING, { 
            command, 
            duration: 3000 
        });
    }

    showSuccess(message = 'Command executed successfully') {
        this.updateState(this.states.SUCCESS, { 
            message, 
            autoHide: 2000 
        });
    }

    showError(message = 'Command failed') {
        this.updateState(this.states.ERROR, { 
            message, 
            autoHide: 3000 
        });
    }

    getState() {
        return {
            isVisible: this.isVisible,
            currentState: this.currentState
        };
    }
}

// Initialize the overlay when the script loads
let rupertOverlay;

// Initialize when DOM is ready
function initRupertOverlay() {
    if (!rupertOverlay) {
        rupertOverlay = new RupertCommandOverlay();

        // Make it globally accessible
        window.rupertOverlay = rupertOverlay;

        console.log('🎭 Rupert Command Overlay ready');
    }
}

// Initialize based on document state
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRupertOverlay);
} else {
    initRupertOverlay();
}

// Expose API for testing and external access
window.RupertCommandOverlay = RupertCommandOverlay;

// Testing functions (remove in production)
window.testOverlay = {
    showWakeWord: () => rupertOverlay?.showWakeWord(),
    showProcessing: (cmd) => rupertOverlay?.showProcessing(cmd || 'test command'),
    showSuccess: (msg) => rupertOverlay?.showSuccess(msg || 'Test successful'),
    showError: (msg) => rupertOverlay?.showError(msg || 'Test error'),
    hide: () => rupertOverlay?.hide()
};

console.log('🎭 Rupert Command Overlay script loaded');
