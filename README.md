<a name="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">R.U.P./R.T Voice Assistant</h3>
  <p align="center">
    Intelligent AI-powered accessibility for everyone
    <br />
    <br />
    Chrome Extension with Voice Command Integration
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#technologies">Technologies</a>
      <ul>
        <li><a href="#chrome-extensions-api">Chrome Extensions API</a></li>
        <li><a href="#google-gemini-ai">Google Gemini AI</a></li>
        <li><a href="#web-speech-api">Web Speech API</a></li>
        <li><a href="#service-workers">Service Workers</a></li>
        <li><a href="#content-scripts">Content Scripts</a></li>
        <li><a href="#chrome-storage">Chrome Storage</a></li>
        <li><a href="#dom-manipulation">DOM Manipulation</a></li>
      </ul>
    </li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

R.U.P./R.T is a sophisticated Chrome extension that transforms web browsing through intelligent voice commands and AI-powered automation. The extension provides hands-free control over browser navigation, tab management, and webpage interaction using natural language processing.

**Key Features**

- **Wake Word Detection** - Activates with "Hey Rupert" voice commands across all browser tabs
- **Intelligent Command Processing** - Uses Google Gemini AI to interpret natural language commands and convert them to precise browser actions
- **Cross-Tab Voice Control** - Seamlessly operates across multiple browser tabs and windows
- **Smart Element Interaction** - Automatically numbers clickable elements and enables voice-controlled clicking
- **Advanced Tab Management** - Voice commands for switching, closing, and creating tabs
- **Real-Time Visual Feedback** - Dynamic indicators show listening status and command processing

**Voice Commands Supported**

- "Switch to tab 3" - Navigate between open tabs
- "Click number 5" - Interact with numbered page elements
- "Scroll down" - Page navigation
- "Google search dogs" - Automated web searches
- "Type hello world" - Text input automation
- "Close tab 2" - Tab management

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Built With

The extension leverages modern web technologies and Chrome's powerful extension framework:

[![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chrome Extensions](https://img.shields.io/badge/Chrome%20Extensions-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Web Speech API](https://img.shields.io/badge/Web%20Speech%20API-FF6B6B?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
[![Service Workers](https://img.shields.io/badge/Service%20Workers-FF9500?style=for-the-badge&logo=javascript&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
[![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- TECHNOLOGIES -->
## Technologies

### Chrome Extensions API

The extension is built on Chrome's Manifest V3 architecture, utilizing the latest service worker model for background processing. The comprehensive manifest.json defines permissions for tabs, activeTab, storage, and scripting APIs. Host permissions enable cross-origin requests to the Google Gemini API, while web accessible resources expose the permission management interface to users.

The extension maintains persistent state through Chrome's local storage and coordinates between background service workers and content scripts for seamless operation across browser sessions.

### Google Gemini AI

Google Gemini serves as the intelligent core of the extension, transforming natural speech into structured commands. The system sends voice transcripts along with current browser context (open tabs, page information) to Gemini's generative AI model.

The AI processes commands using sophisticated prompting that includes available browser tabs, returning structured JSON responses with action types, confidence scores, and execution parameters. This enables the extension to understand complex commands like "close the YouTube tab" or "click on the search button" with high accuracy.

### Web Speech API

The extension implements a dual speech recognition system using the browser's native Web Speech API. The WakeWordDetector class maintains continuous listening for trigger phrases like "Hey Rupert" across all tabs, using optimized recognition parameters for minimal resource usage.

Once activated, a separate SpeechRecognition instance captures the actual voice command with enhanced accuracy settings including echo cancellation and noise suppression. This two-tier approach balances always-on availability with precise command capture.

### Service Workers

The background.js file implements a comprehensive service worker that orchestrates the entire extension ecosystem. It manages extension state, coordinates cross-tab communication, handles AI command processing, and maintains persistent wake word detection.

The service worker uses sophisticated message passing to communicate with content scripts, manages tab lifecycle events, and implements keep-alive mechanisms to prevent Chrome from terminating background processes during active use.

### Content Scripts

Content scripts provide the interactive layer between the extension and web pages. The system includes intelligent element detection that identifies clickable elements using multiple selector strategies, from standard HTML elements to site-specific patterns for major platforms like YouTube, GitHub, and social media sites.

Visual feedback systems display numbered badges on interactive elements and show real-time listening indicators with smooth CSS animations. The content scripts handle natural text input simulation with proper event firing to ensure compatibility with modern JavaScript frameworks like React and Vue.

### Chrome Storage

State management utilizes Chrome's local storage API for persistent configuration and extension settings. The ConfigManager class provides environment-aware configuration loading, supporting both development and production deployments.

Settings include wake word sensitivity, visual feedback preferences, language selection, and notification controls. The storage system implements automatic fallbacks and error recovery to ensure extension reliability across browser restarts and updates.

### DOM Manipulation

Advanced DOM manipulation enables precise webpage interaction through programmatic element identification and interaction simulation. The system uses sophisticated element filtering to identify truly clickable elements, avoiding hidden or disabled components.

Text input simulation includes character-by-character typing with realistic delays, comprehensive event firing (keydown, keyup, input, change), and framework compatibility layers. The visual feedback system injects custom CSS animations and overlays without interfering with existing page functionality.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
