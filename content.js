// RUPERT: Rutgers University Programmable Engagement and Response Technology
// Enhanced Content Script - Merged Voice Assistant + DOM Controller
console.log('🎯🎤 Rupert Enhanced Content Script Loading...');

// ===== VOICE ASSISTANT FEATURES (from main branch) =====

// Global state for voice features
let isRupertListening = false;
let listeningIndicator = null;
let keyboardShortcutEnabled = true;

// ===== DOM CONTROLLER CLASS (from your working version) =====

class RupertDOMController {
  constructor() {
    this.numberedElements = [];
    this.isNumberingActive = false;
    this.isCurrentlySelecting = false;
    this.clickTimeout = null;
    console.log('🔧 DOM Controller constructed');
  }

  // ===== DOM CONTROLLER METHODS =====
  
  setupDOMKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only process Ctrl+Shift shortcuts (DOM Controller)
      if (e.ctrlKey && e.shiftKey) {
        console.log('🔧 DOM shortcut - Key pressed:', e.key);

        // Ctrl+Shift+R to show numbers
        if (e.key === 'R') {
          e.preventDefault();
          console.log('🔴 Keyboard shortcut: Showing numbers');
          this.showElementNumbers('clickable');
          return;
        }
        
        // Ctrl+Shift+H to hide numbers  
        if (e.key === 'H') {
          e.preventDefault();
          console.log('❌ Keyboard shortcut: Hiding numbers');
          this.hideElementNumbers();
          return;
        }
        
        // Ctrl+Shift+S to scroll down
        if (e.key === 'S') {
          e.preventDefault();
          console.log('📜 Keyboard shortcut: Scrolling down');
          this.handleScroll('down', 'normal');
          return;
        }

        // Ctrl+Shift+U to scroll up
        if (e.key === 'U') {
          e.preventDefault();
          console.log('📜 Keyboard shortcut: Scrolling up');
          this.handleScroll('up', 'normal');
          return;
        }

        // Ctrl+Shift+Q for test
        if (e.key === 'Q') {
          e.preventDefault();
          console.log('🧪 Keyboard shortcut: Running test sequence');
          this.runTestSequence();
          return;
        }

        // Numbers 1-9
        const numberKey = e.key;
        if (/^[1-9]$/.test(numberKey)) {
          e.preventDefault();
          const number = parseInt(numberKey);
          console.log(`🎯 Keyboard shortcut: Selecting element ${number}`);
          this.selectNumberedElement(number);
          return;
        }

        // Shift symbols ! @ # $ % ^ & * (
        const shiftNumberMap = {
          '!': 1, '@': 2, '#': 3, '$': 4, '%': 5,
          '^': 6, '&': 7, '*': 8, '(': 9
        };
        
        if (shiftNumberMap[numberKey]) {
          e.preventDefault();
          const number = shiftNumberMap[numberKey];
          console.log(`🎯 Keyboard shortcut: Selecting element ${number} (via shift symbol)`);
          this.selectNumberedElement(number);
          return;
        }
      }
    });
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 DOM Controller received command:', request.action);
      
      switch(request.action) {
        case 'showNumbers':
          const count = this.showElementNumbers(request.elementType || 'clickable');
          sendResponse({success: true, count: count});
          break;
        case 'hideNumbers':
          this.hideElementNumbers();
          sendResponse({success: true});
          break;
        case 'scroll':
          this.handleScroll(request.direction || 'down', request.amount || 'normal');
          sendResponse({success: true});
          break;
        case 'selectNumber':
          const result = this.selectNumberedElement(request.number);
          sendResponse({success: result});
          break;
        case 'test':
          this.runTestSequence();
          sendResponse({success: true});
          break;
        case 'voiceCommand':
          const voiceResult = this.processVoiceCommand(request.command);
          sendResponse({success: voiceResult});
          break;
      }
      return true;
    });
  }

  processVoiceCommand(command) {
    const cmd = command.toLowerCase().trim();
    console.log('🎤 Processing voice command:', cmd);
    
    if (cmd.includes('show numbers') || cmd.includes('show number')) {
      this.showElementNumbers('clickable');
      return true;
    }
    
    if (cmd.includes('hide numbers') || cmd.includes('hide number')) {
      this.hideElementNumbers();
      return true;
    }
    
    if (cmd.includes('scroll down')) {
      this.handleScroll('down', 'normal');
      return true;
    }
    
    if (cmd.includes('scroll up')) {
      this.handleScroll('up', 'normal');
      return true;
    }
    
    const numberMatch = cmd.match(/(?:select|click).*?(\d+)/);
    if (numberMatch) {
      const number = parseInt(numberMatch[1]);
      return this.selectNumberedElement(number);
    }
    
    if (cmd.includes('test') || cmd.includes('run test')) {
      this.runTestSequence();
      return true;
    }
    
    console.log('❓ Unknown voice command:', command);
    return false;
  }

  showElementNumbers(elementType = 'clickable') {
    this.hideElementNumbers();
    
    console.log('🔍 Starting targeted element detection...');
    
    // Your comprehensive element detection code
    let priorityElements = Array.from(document.querySelectorAll(`
      /* Video content - highest priority */
      ytd-rich-item-renderer a#video-title,
      ytd-video-renderer a#video-title, 
      ytd-compact-video-renderer a#video-title,
      a#video-title,
      ytd-thumbnail a,
      .ytd-thumbnail a,
      
      /* Filter chips - ENHANCED SELECTORS */
      ytd-chip-cloud-chip-renderer,
      yt-formatted-string.ytd-chip-cloud-chip-renderer,
      ytd-chip-cloud-chip-renderer button,
      ytd-chip-cloud-chip-renderer a,
      .ytd-chip-cloud-chip-renderer,
      [class*="chip-cloud-chip-renderer"],
      ytd-feed-filter-chip-bar-renderer button,
      ytd-feed-filter-chip-bar-renderer a,
      
      /* Search elements */
      input#search,
      input[name="search_query"],
      .ytd-searchbox input,
      ytd-searchbox input,
      #search-input input,
      [aria-label*="Search"],
      
      /* Twitch search */
      input[data-a-target="tw-input"],
      input[placeholder*="Search"],
      [data-a-target="nav-search-input"],
      
      /* Main navigation buttons */
      button[aria-label*="Search"],
      button[aria-label*="Create"],
      button[aria-label*="Notifications"], 
      button[aria-label*="YouTube apps"],
      button[title*="Notifications"],
      button[title*="Create"],
      #avatar-btn,
      ytd-notification-topbar-button-renderer button,
      ytd-topbar-menu-button-renderer button,
      
      /* Sidebar navigation */
      ytd-guide-entry-renderer a,
      a[title="Home"],
      a[title="Shorts"], 
      a[title="Subscriptions"],
      
      /* YouTube Shorts */
      ytd-reel-item-renderer,
      .ytd-reel-item-renderer a,
      
      /* Twitch specific elements */
      [data-a-target*="card"],
      [data-a-target*="preview"],
      [data-a-target*="link"],
      a[data-a-target]
    `));
  
    let secondaryElements = Array.from(document.querySelectorAll(`
      button:not([aria-hidden="true"]):not([tabindex="-1"]):not([disabled]),
      a[href]:not([aria-hidden="true"]):not([tabindex="-1"]),
      input[type="search"]:not([aria-hidden="true"]),
      input[type="text"]:not([aria-hidden="true"]):not([readonly]),
      [role="button"]:not([aria-hidden="true"]),
      [role="tab"]:not([aria-hidden="true"]), 
      [role="link"]:not([aria-hidden="true"]),
      [role="textbox"]:not([aria-hidden="true"]),
      [onclick]:not([aria-hidden="true"]),
      [tabindex="0"]:not([aria-hidden="true"])
    `));
  
    let specificElements = Array.from(document.querySelectorAll(`
      ytd-feed-filter-chip-bar-renderer *[role="tab"],
      ytd-chip-cloud-renderer *[role="tab"],
      [class*="chip"][role="tab"],
      #search input,
      [placeholder*="search" i],
      [placeholder*="Search"],
      [aria-label*="notification" i],
      [title*="notification" i],
      ytd-notification-topbar-button-renderer,
      [data-a-target="nav-search-input"],
      [data-a-target*="search"]
    `));
  
    let allElements = [...priorityElements, ...secondaryElements, ...specificElements];
    
    let elements = allElements.filter(el => {
      if (el.classList.contains('rupert-number-overlay')) return false;
      if (el.classList.contains('rupert-listening-indicator')) return false; // Don't number the voice indicator
      if (el.getAttribute('aria-hidden') === 'true') return false;
      if (el.getAttribute('tabindex') === '-1') return false;
      if (el.disabled) return false;
      
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      const isVisible = (
        rect.width > 0 && rect.height > 0 &&
        style.visibility !== 'hidden' && 
        style.display !== 'none' &&
        parseFloat(style.opacity) > 0.05 &&
        rect.top < window.innerHeight + 100 && 
        rect.bottom > -50 &&
        rect.left < window.innerWidth + 100 && 
        rect.right > -50
      );
      
      if (!isVisible) return false;
      
      const hasRelevantContent = (
        (el.textContent && el.textContent.trim().length > 0) ||
        el.matches('#video-title') ||
        el.closest('ytd-thumbnail') ||
        el.matches('button') ||
        el.matches('input') ||
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        el.getAttribute('data-a-target')
      );
      
      const hasGoodSize = rect.width >= 15 && rect.height >= 10;
      
      return hasRelevantContent && hasGoodSize;
    });
  
    // Remove duplicates and limit
    elements = this.removeIntelligentDuplicates(elements);
    elements = elements.slice(0, 45);

    console.log(`🔍 Found ${elements.length} elements to number`);

    elements.forEach((element, index) => {
      this.addNumberToElement(element, index + 1);
    });
  
    this.numberedElements = elements;
    this.isNumberingActive = true;
    
    console.log(`✅ Added ${elements.length} numbered elements`);
    return elements.length;
  }

  removeIntelligentDuplicates(elements) {
    const unique = [];
    const usedPositions = new Map();
    
    const sortedElements = elements.sort((a, b) => {
      const getPriority = (el) => {
        if (el.matches('#video-title') || el.closest('ytd-thumbnail')) return 5;
        if (el.closest('ytd-chip-cloud-chip-renderer')) return 4;
        if (el.matches('button[aria-label]')) return 3;
        if (el.closest('ytd-guide-entry-renderer')) return 2;
        return 1;
      };
      
      const priorityDiff = getPriority(b) - getPriority(a);
      if (priorityDiff !== 0) return priorityDiff;
      
      const aArea = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
      const bArea = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      return bArea - aArea;
    });
    
    sortedElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const centerX = Math.round(rect.left + rect.width / 2);
      const centerY = Math.round(rect.top + rect.height / 2);
      const posKey = `${Math.floor(centerX / 20) * 20}-${Math.floor(centerY / 20) * 20}`;
      
      let tooClose = false;
      const tolerance = 40;
      
      for (let [existingPos, existingEl] of usedPositions) {
        const [existingX, existingY] = existingPos.split('-').map(Number);
        const distance = Math.sqrt(Math.pow(centerX - existingX, 2) + Math.pow(centerY - existingY, 2));
        
        if (distance < tolerance) {
          const currentPriority = el.matches('#video-title') ? 3 : el.matches('button') ? 2 : 1;
          const existingPriority = existingEl.matches('#video-title') ? 3 : existingEl.matches('button') ? 2 : 1;
          
          if (currentPriority > existingPriority) {
            const existingIndex = unique.indexOf(existingEl);
            if (existingIndex > -1) unique.splice(existingIndex, 1);
            usedPositions.delete(existingPos);
          } else {
            tooClose = true;
          }
          break;
        }
      }
      
      if (!tooClose) {
        unique.push(el);
        usedPositions.set(posKey, el);
      }
    });
    
    return unique;
  }

  addNumberToElement(element, number) {
    const numberDiv = document.createElement('div');
    numberDiv.className = 'rupert-number-overlay';
    numberDiv.textContent = number;
    numberDiv.setAttribute('data-rupert-number', number);
    
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    numberDiv.style.cssText = `
      position: absolute !important;
      top: ${rect.top + scrollTop}px !important;
      left: ${rect.left + scrollLeft}px !important;
      z-index: 999999 !important;
      background: #ff4444 !important;
      color: white !important;
      padding: 6px 10px !important;
      border-radius: 15px !important;
      font-size: 14px !important;
      font-weight: bold !important;
      font-family: Arial, sans-serif !important;
      border: 2px solid #cc0000 !important;
      box-shadow: 0 3px 8px rgba(0,0,0,0.5) !important;
      cursor: pointer !important;
      user-select: none !important;
      transition: all 0.2s ease !important;
      min-width: 25px !important;
      text-align: center !important;
    `;
    
    numberDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log(`🖱️ Clicked number overlay ${number}`);
      this.selectNumberedElement(number);
    });
    
    numberDiv.addEventListener('mouseenter', () => {
      numberDiv.style.transform = 'scale(1.2)';
      numberDiv.style.background = '#cc0000';
    });
    
    numberDiv.addEventListener('mouseleave', () => {
      numberDiv.style.transform = 'scale(1)';
      numberDiv.style.background = '#ff4444';
    });
    
    document.body.appendChild(numberDiv);
  }

  hideElementNumbers() {
    const existingNumbers = document.querySelectorAll('.rupert-number-overlay');
    existingNumbers.forEach(num => {
      num.style.opacity = '0';
      num.style.transform = 'scale(0.5)';
      setTimeout(() => num.remove(), 200);
    });
    
    this.numberedElements = [];
    this.isNumberingActive = false;
    console.log('❌ Removed all number overlays');
  }

  selectNumberedElement(number) {
    if (this.isCurrentlySelecting) {
      console.log('🛑 Already selecting an element, ignoring duplicate call');
      return false;
    }
    
    const targetElement = this.numberedElements[number - 1];
    if (!targetElement) {
      console.log(`❌ No element found for number ${number}`);
      return false;
    }

    this.isCurrentlySelecting = true;

    console.log(`🎯 Selecting element ${number}:`, {
      tagName: targetElement.tagName,
      className: targetElement.className.split(' ')[0],
      text: targetElement.textContent?.slice(0, 30) || 'No text'
    });
    
    this.hideElementNumbers();
    
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // Highlight the element
    const originalOutline = targetElement.style.outline;
    const originalBackgroundColor = targetElement.style.backgroundColor;
    
    targetElement.style.outline = '4px solid #00ff00';
    targetElement.style.outlineOffset = '2px';
    targetElement.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    
    // Simple single click
    setTimeout(() => {
      let clickTarget = targetElement;
      
      if (targetElement.tagName !== 'BUTTON' && targetElement.tagName !== 'A') {
        const button = targetElement.querySelector('button');
        const link = targetElement.querySelector('a');
        
        if (button) {
          clickTarget = button;
        } else if (link) {
          clickTarget = link;
        }
      }

      try {
        clickTarget.click();
        console.log('✅ Element clicked');
      } catch (e) {
        console.log('❌ Click failed:', e.message);
      }
      
      setTimeout(() => {
        targetElement.style.outline = originalOutline;
        targetElement.style.backgroundColor = originalBackgroundColor;
        this.isCurrentlySelecting = false;
      }, 1000);
      
    }, 10);
    
    return true;
  }

  handleScroll(direction, amount = 'normal') {
    const scrollAmounts = {
      small: 300,
      normal: 500,
      large: 800
    };

    const scrollDistance = scrollAmounts[amount] || scrollAmounts.normal;

    switch(direction.toLowerCase()) {
      case 'down':
        window.scrollBy({ top: scrollDistance, behavior: 'smooth' });
        console.log(`📜 Scrolled down ${scrollDistance}px`);
        break;
      case 'up':
        window.scrollBy({ top: -scrollDistance, behavior: 'smooth' });
        console.log(`📜 Scrolled up ${scrollDistance}px`);
        break;
    }
  }

  runTestSequence() {
    console.log('🧪 Test Sequence Starting...');
    
    const count = this.showElementNumbers('clickable');
    console.log(`Step 1: Found ${count} elements`);
    
    setTimeout(() => {
      console.log('Step 2: Scrolling down');
      this.handleScroll('down', 'normal');
    }, 3000);
    
    setTimeout(() => {
      if (this.numberedElements.length > 0) {
        console.log('Step 3: Selecting first element');
        this.selectNumberedElement(1);
      }
    }, 6000);
  }
}

// ===== VOICE ASSISTANT FUNCTIONS (from main branch) =====

function createListeningIndicator() {
  if (listeningIndicator) {
    return;
  }

  listeningIndicator = document.createElement('div');
  listeningIndicator.id = 'rupert-listening-indicator';
  listeningIndicator.className = 'rupert-listening-indicator'; // Add class to prevent numbering

  listeningIndicator.innerHTML = `
    <span class="rupert-icon">🎤</span>
    <span class="rupert-text" id="rupert-status-text">Listening...</span>
    <div class="rupert-status-dot"></div>
  `;

  injectListeningStyles();
  document.body.appendChild(listeningIndicator);

  console.log('📱 Listening indicator created');
}

function injectListeningStyles() {
  if (document.getElementById('rupert-listening-styles')) {
    return;
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

function showListeningIndicator(state = 'listening', message = 'Listening...') {
  if (!listeningIndicator) {
    createListeningIndicator();
  }

  const textElement = listeningIndicator.querySelector('#rupert-status-text');
  if (textElement) {
    textElement.textContent = message;
  }

  listeningIndicator.classList.remove('listening', 'processing', 'error');

  if (state) {
    listeningIndicator.classList.add(state);
  }

  listeningIndicator.classList.add('visible');
  isRupertListening = true;

  console.log(`👁️ Listening indicator shown: ${state} - ${message}`);
}

function hideListeningIndicator() {
  if (!listeningIndicator) {
    return;
  }

  listeningIndicator.classList.remove('visible');
  isRupertListening = false;

  console.log('👁️ Listening indicator hidden');
}

function setupVoiceKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    if (!keyboardShortcutEnabled) return;

    // Only process Alt+Shift shortcuts (Voice Assistant)
    if (event.altKey && event.shiftKey) {
      // Alt+Shift+L - Toggle listening indicator
      if (event.key === 'L') {
        event.preventDefault();

        if (isRupertListening) {
          hideListeningIndicator();
        } else {
          showListeningIndicator('listening', 'Listening...');

          setTimeout(() => {
            if (isRupertListening) {
              hideListeningIndicator();
            }
          }, 5000);
        }

        console.log('🎹 Voice shortcut triggered: Alt+Shift+L');
      }

      // Alt+Shift+P - Show processing state
      if (event.key === 'P') {
        event.preventDefault();
        showListeningIndicator('processing', 'Processing...');

        setTimeout(() => {
          hideListeningIndicator();
        }, 3000);

        console.log('🎹 Voice shortcut triggered: Alt+Shift+P');
      }

      // Alt+Shift+E - Show error state
      if (event.key === 'E') {
        event.preventDefault();
        showListeningIndicator('error', 'Error occurred');

        setTimeout(() => {
          hideListeningIndicator();
        }, 3000);

        console.log('🎹 Voice shortcut triggered: Alt+Shift+E');
      }

      // Alt+Shift+H - Hide indicator manually (H for Hide)
      if (event.key === 'H') {
        event.preventDefault();
        hideListeningIndicator();
        console.log('🎹 Voice shortcut triggered: Alt+Shift+H');
      }
    }
  });
}

function setupVoiceMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Voice assistant received message:', message);

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

    return true;
  });

  console.log('📡 Voice message listener setup complete');
}

// ===== INITIALIZATION =====

function initializeRupert() {
  console.log('🔧 Initializing merged Rupert content script...');

  // Initialize DOM Controller
  const domController = new RupertDOMController();
  domController.setupDOMKeyboardShortcuts();
  domController.setupMessageListener();

  // Initialize Voice Assistant
  createListeningIndicator();
  setupVoiceKeyboardShortcuts();
  setupVoiceMessageListener();

  // Expose DOM controller globally
  window.rupertDOMController = domController;

  console.log('✅ Rupert merged content script initialized');
  
  // Show setup instructions
  setTimeout(() => {
    console.log('');
    console.log('🎯🎤 RUPERT ENHANCED READY!');
    console.log('');
    console.log('⌨️  DOM Controller Shortcuts (Ctrl+Shift):');
    console.log('   Ctrl+Shift+R = Show Red Numbers');
    console.log('   Ctrl+Shift+H = Hide Numbers');
    console.log('   Ctrl+Shift+S = Scroll Down');
    console.log('   Ctrl+Shift+U = Scroll Up');
    console.log('   Ctrl+Shift+Q = Run Test');
    console.log('   Ctrl+Shift+1-9 = Select Element 1-9');
    console.log('');
    console.log('🎤 Voice Assistant Shortcuts (Alt+Shift):');
    console.log('   Alt+Shift+L = Toggle listening indicator');
    console.log('   Alt+Shift+P = Show processing state');
    console.log('   Alt+Shift+E = Show error state');
    console.log('   Alt+Shift+H = Hide indicator');
    console.log('');
  }, 2000);
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

  const numberOverlays = document.querySelectorAll('.rupert-number-overlay');
  numberOverlays.forEach(overlay => overlay.remove());

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

console.log('✅ Rupert Enhanced Content Script Loaded with Both Features');
