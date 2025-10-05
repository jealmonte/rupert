// Enhanced Content Script for Web Page Interaction
// Handles page manipulation commands from Gemini AI

class WebPageInteractor {
    constructor() {
        this.isInitialized = false;
        this.highlightedElements = [];

        console.log('🌐 Web Page Interactor initializing...');
        this.initialize();
    }

    initialize() {
        this.setupMessageListener();
        this.isInitialized = true;
        console.log('✅ Web Page Interactor ready for commands');
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('📨 Content script received message:', request.action);

            const handleAction = async () => {
                try {
                    switch (request.action) {
                        case 'scroll':
                            return this.handleScroll(request);

                        case 'click':
                            return this.handleClick(request);

                        case 'type':
                            return this.handleType(request);

                        case 'find':
                            return this.handleFind(request);

                        case 'extract':
                            return this.handleExtract(request);

                        case 'highlight':
                            return this.handleHighlight(request);

                        case 'wait':
                            return this.handleWait(request);

                        case 'get_page_info':
                            return this.getPageInfo();

                        case 'search_on_page':
                            return this.searchOnPage(request);

                        default:
                            return { success: false, message: `Unknown action: ${request.action}` };
                    }
                } catch (error) {
                    console.error('Content script action error:', error);
                    return { success: false, message: error.message };
                }
            };

            handleAction().then(sendResponse);
            return true; // Keep message channel open for async response
        });
    }

    handleScroll(request) {
        const direction = request.direction || 'down';
        const amount = request.amount || 'normal';

        let scrollAmount;
        switch (amount) {
            case 'small': scrollAmount = 200; break;
            case 'large': scrollAmount = 800; break;
            default: scrollAmount = 500; break;
        }

        const scrollValue = direction === 'up' ? -scrollAmount : scrollAmount;

        if (direction === 'top') {
            window.scrollTo(0, 0);
        } else if (direction === 'bottom') {
            window.scrollTo(0, document.body.scrollHeight);
        } else {
            window.scrollBy(0, scrollValue);
        }

        console.log(`📜 Scrolled ${direction} by ${scrollAmount}px`);
        return { 
            success: true, 
            message: `Scrolled ${direction}`,
            scrollPosition: window.pageYOffset
        };
    }

    handleClick(request) {
        const target = request.target;
        let element = null;

        try {
            // Try different methods to find the element
            if (target.startsWith('#')) {
                // ID selector
                element = document.getElementById(target.substring(1));
            } else if (target.startsWith('.')) {
                // Class selector
                element = document.querySelector(target);
            } else {
                // Try various selectors
                const selectors = [
                    target, // Direct selector
                    `[data-testid="${target}"]`, // Data test ID
                    `[aria-label*="${target}" i]`, // Aria label
                    `[title*="${target}" i]`, // Title attribute
                    `button:contains("${target}")`, // Button with text
                    `a:contains("${target}")`, // Link with text
                    `input[placeholder*="${target}" i]`, // Input placeholder
                    `*[class*="${target}" i]` // Class containing text
                ];

                for (const selector of selectors) {
                    try {
                        element = document.querySelector(selector);
                        if (element) break;
                    } catch (e) {
                        // Try text content search
                        const elements = Array.from(document.querySelectorAll('button, a, [role="button"], [onclick]'));
                        element = elements.find(el => 
                            el.textContent.toLowerCase().includes(target.toLowerCase()) ||
                            el.getAttribute('aria-label')?.toLowerCase().includes(target.toLowerCase())
                        );
                        if (element) break;
                    }
                }
            }

            if (element) {
                // Scroll element into view
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Highlight element briefly
                this.highlightElement(element);

                // Click the element
                element.click();

                console.log('👆 Clicked element:', element);
                return { 
                    success: true, 
                    message: `Clicked on ${target}`,
                    elementType: element.tagName,
                    elementText: element.textContent?.substring(0, 50)
                };
            } else {
                console.log('❌ Element not found:', target);
                return { 
                    success: false, 
                    message: `Could not find element: ${target}` 
                };
            }
        } catch (error) {
            console.error('Click error:', error);
            return { success: false, message: `Click error: ${error.message}` };
        }
    }

    handleType(request) {
        const target = request.target || 'search';
        const text = request.text;

        if (!text) {
            return { success: false, message: 'No text provided to type' };
        }

        try {
            let inputElement = null;

            // Find input element
            const inputSelectors = [
                `input[name*="${target}" i]`,
                `input[id*="${target}" i]`,
                `input[placeholder*="${target}" i]`,
                `input[type="text"]`,
                `input[type="search"]`,
                `textarea`,
                '[contenteditable="true"]'
            ];

            for (const selector of inputSelectors) {
                inputElement = document.querySelector(selector);
                if (inputElement) break;
            }

            // If still not found, try to find any visible input
            if (!inputElement) {
                const allInputs = document.querySelectorAll('input, textarea, [contenteditable]');
                inputElement = Array.from(allInputs).find(input => {
                    const style = window.getComputedStyle(input);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });
            }

            if (inputElement) {
                // Focus and clear the input
                inputElement.focus();
                inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Highlight element
                this.highlightElement(inputElement);

                // Clear existing content
                if (inputElement.tagName === 'INPUT' || inputElement.tagName === 'TEXTAREA') {
                    inputElement.value = '';
                    inputElement.value = text;

                    // Trigger input events
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    // For contenteditable elements
                    inputElement.textContent = text;
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                }

                console.log('⌨️ Typed text:', text);
                return { 
                    success: true, 
                    message: `Typed "${text}" in ${target}`,
                    elementType: inputElement.tagName
                };
            } else {
                return { success: false, message: `Could not find input field: ${target}` };
            }
        } catch (error) {
            console.error('Type error:', error);
            return { success: false, message: `Type error: ${error.message}` };
        }
    }

    handleFind(request) {
        const searchText = request.text;

        if (!searchText) {
            return { success: false, message: 'No search text provided' };
        }

        try {
            // Clear previous highlights
            this.clearHighlights();

            // Search for text in page
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const foundElements = [];
            let node;

            while (node = walker.nextNode()) {
                if (node.textContent.toLowerCase().includes(searchText.toLowerCase())) {
                    const parent = node.parentElement;
                    if (parent && this.isElementVisible(parent)) {
                        foundElements.push(parent);
                        this.highlightElement(parent, 'yellow');
                    }
                }
            }

            if (foundElements.length > 0) {
                // Scroll to first found element
                foundElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });

                console.log(`🔍 Found ${foundElements.length} instances of "${searchText}"`);
                return { 
                    success: true, 
                    message: `Found ${foundElements.length} instances of "${searchText}"`,
                    count: foundElements.length
                };
            } else {
                return { 
                    success: false, 
                    message: `Text "${searchText}" not found on page` 
                };
            }
        } catch (error) {
            console.error('Find error:', error);
            return { success: false, message: `Find error: ${error.message}` };
        }
    }

    handleExtract(request) {
        const target = request.target || 'all';

        try {
            let extractedData = {};

            switch (target) {
                case 'title':
                    extractedData.title = document.title;
                    break;

                case 'links':
                    extractedData.links = Array.from(document.querySelectorAll('a[href]')).map(link => ({
                        text: link.textContent.trim(),
                        href: link.href
                    })).filter(link => link.text).slice(0, 20);
                    break;

                case 'images':
                    extractedData.images = Array.from(document.querySelectorAll('img[src]')).map(img => ({
                        alt: img.alt,
                        src: img.src
                    })).slice(0, 10);
                    break;

                case 'text':
                    extractedData.text = document.body.innerText.substring(0, 1000);
                    break;

                default:
                    extractedData = {
                        title: document.title,
                        url: window.location.href,
                        text_preview: document.body.innerText.substring(0, 500),
                        link_count: document.querySelectorAll('a[href]').length,
                        image_count: document.querySelectorAll('img[src]').length
                    };
                    break;
            }

            console.log('📊 Extracted data:', extractedData);
            return { 
                success: true, 
                message: `Extracted ${target} from page`,
                data: extractedData
            };
        } catch (error) {
            console.error('Extract error:', error);
            return { success: false, message: `Extract error: ${error.message}` };
        }
    }

    searchOnPage(request) {
        const query = request.query || request.text;

        if (!query) {
            return { success: false, message: 'No search query provided' };
        }

        // Use browser's built-in find functionality
        if (window.find) {
            const found = window.find(query, false, false, true);
            return {
                success: found,
                message: found ? `Found "${query}" on page` : `"${query}" not found`
            };
        } else {
            // Fallback to our custom find
            return this.handleFind({ text: query });
        }
    }

    highlightElement(element, color = 'lightblue') {
        if (!element) return;

        const originalStyle = {
            backgroundColor: element.style.backgroundColor,
            outline: element.style.outline,
            transition: element.style.transition
        };

        element.style.transition = 'all 0.3s ease';
        element.style.backgroundColor = color;
        element.style.outline = '3px solid #007acc';

        this.highlightedElements.push({ element, originalStyle });

        // Remove highlight after 2 seconds
        setTimeout(() => {
            this.removeHighlight(element);
        }, 2000);
    }

    removeHighlight(targetElement) {
        const index = this.highlightedElements.findIndex(item => item.element === targetElement);
        if (index !== -1) {
            const { element, originalStyle } = this.highlightedElements[index];

            element.style.backgroundColor = originalStyle.backgroundColor;
            element.style.outline = originalStyle.outline;
            element.style.transition = originalStyle.transition;

            this.highlightedElements.splice(index, 1);
        }
    }

    clearHighlights() {
        this.highlightedElements.forEach(({ element, originalStyle }) => {
            element.style.backgroundColor = originalStyle.backgroundColor;
            element.style.outline = originalStyle.outline;
            element.style.transition = originalStyle.transition;
        });
        this.highlightedElements = [];
    }

    isElementVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0';
    }

    getPageInfo() {
        const info = {
            title: document.title,
            url: window.location.href,
            domain: window.location.hostname,
            scrollPosition: window.pageYOffset,
            pageHeight: document.body.scrollHeight,
            viewportHeight: window.innerHeight,
            forms: document.querySelectorAll('form').length,
            inputs: document.querySelectorAll('input, textarea').length,
            buttons: document.querySelectorAll('button, [role="button"]').length,
            links: document.querySelectorAll('a[href]').length,
            images: document.querySelectorAll('img').length
        };

        console.log('📄 Page info:', info);
        return { success: true, data: info };
    }

    handleWait(request) {
        const duration = request.duration || 1000;

        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ 
                    success: true, 
                    message: `Waited ${duration}ms` 
                });
            }, duration);
        });
    }
}

// Initialize the web page interactor
const webPageInteractor = new WebPageInteractor();

// Make it globally available
window.webPageInteractor = webPageInteractor;

// Add CSS selector extensions for text content
document.querySelectorAll = (function(originalQuerySelectorAll) {
    return function(selector) {
        // Handle :contains() pseudo-selector
        if (selector.includes(':contains(')) {
            const match = selector.match(/(.*):contains\(["'](.+)["']\)(.*)/);
            if (match) {
                const [, prefix, text, suffix] = match;
                const elements = Array.from(document.querySelectorAll(prefix || '*'));
                return elements.filter(el => 
                    el.textContent.toLowerCase().includes(text.toLowerCase())
                );
            }
        }
        return originalQuerySelectorAll.call(this, selector);
    };
})(Document.prototype.querySelectorAll);

console.log('🌐 Enhanced Content Script Loaded - Ready for AI commands');