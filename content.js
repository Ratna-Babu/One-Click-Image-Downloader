let extensionEnabled = true;
let fileNamePattern = 'image_{date}_{index}';
let downloadIndex = 1;
let clickMode = 'single'; // Default to single click
let patternEnabled = true;

// Load settings
function loadSettings() {
    try {
        chrome.storage.local.get([
            'enabled',
            'fileNamePattern',
            'clickMode',
            'patternEnabled'
        ], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading settings:', chrome.runtime.lastError);
                return;
            }
            extensionEnabled = result.enabled === undefined ? true : result.enabled;
            fileNamePattern = result.fileNamePattern || 'image_{date}_{index}';
            clickMode = result.clickMode || 'single';
            patternEnabled = result.patternEnabled === undefined ? true : result.patternEnabled;
            console.log('Settings loaded:', { extensionEnabled, fileNamePattern, clickMode, patternEnabled });
            
            // Update event listeners based on click mode
            updateEventListeners();
        });
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

// Generate filename based on pattern
function generateFileName(originalUrl) {
    if (!patternEnabled) {
        // Return the original filename from the URL
        return originalUrl.split('/').pop().split('?')[0];
    }
    
    const date = new Date().toISOString().split('T')[0];
    const extension = originalUrl.split('.').pop().split('?')[0] || 'jpg';
    
    return fileNamePattern
        .replace('{date}', date)
        .replace('{index}', downloadIndex++)
        .replace('{original}', originalUrl.split('/').pop().split('?')[0])
        + '.' + extension;
}

// Handle image download
function handleImageDownload(event) {
    try {
        if (!extensionEnabled) return;

        if (event.target.tagName === "IMG") {
            event.preventDefault();
            
            const imageUrl = event.target.src;
            console.log('Image clicked:', imageUrl);

            if (!imageUrl) {
                console.error('No valid image URL found');
                return;
            }

            const fileName = generateFileName(imageUrl);
            console.log('Generated filename:', fileName);

            chrome.runtime.sendMessage({
                action: "downloadImage",
                imageUrl: imageUrl,
                fileName: fileName
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                    return;
                }
                console.log('Download message sent successfully');
            });
        }
    } catch (error) {
        console.error('Error in download handler:', error);
        if (error.message.includes('Extension context invalidated')) {
            removeEventListeners();
        }
    }
}

// Handle single click
function handleSingleClick(event) {
    if (clickMode === 'single') {
        handleImageDownload(event);
    }
}

// Handle double click
function handleDoubleClick(event) {
    if (clickMode === 'double') {
        handleImageDownload(event);
    }
}

// Update event listeners based on click mode
function updateEventListeners() {
    // First remove all listeners
    removeEventListeners();
    
    // Then add the appropriate ones
    if (clickMode === 'single') {
        document.addEventListener("click", handleSingleClick);
    } else {
        document.addEventListener("dblclick", handleDoubleClick);
    }
}

// Remove event listeners
function removeEventListeners() {
    document.removeEventListener("click", handleSingleClick);
    document.removeEventListener("dblclick", handleDoubleClick);
}

// Initial load
loadSettings();

// Listen for messages including click mode updates
try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            return;
        }
        
        if (message.action === "toggleExtension") {
            extensionEnabled = message.enabled;
            console.log('Extension state changed:', extensionEnabled);
        } else if (message.action === "updateClickMode") {
            clickMode = message.mode;
            console.log('Click mode updated:', clickMode);
            updateEventListeners(); // Update listeners when mode changes
        }
    });
} catch (error) {
    console.error('Error setting up message listener:', error);
}

// Listen for storage changes
try {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        if (chrome.runtime.lastError) {
            console.error('Storage error:', chrome.runtime.lastError);
            return;
        }
        
        if (namespace === 'local') {
            loadSettings();
        }
    });
} catch (error) {
    console.error('Error setting up storage listener:', error);
}
