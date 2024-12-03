document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleExtension');
    const statusText = document.getElementById('statusText');
    const defaultPath = document.getElementById('defaultPath');
    const currentPath = document.getElementById('currentPath');
    const browsePath = document.getElementById('browsePath');
    const setPath = document.getElementById('setPath');
    const fileNamePattern = document.getElementById('fileNamePattern');
    const saveSettings = document.getElementById('saveSettings');
    const saveMessage = document.getElementById('saveMessage');

    const singleClickMode = document.getElementById('singleClickMode');
    const doubleClickMode = document.getElementById('doubleClickMode');

    // Add references to containers that need to be disabled
    const modeButtonsContainer = document.getElementById('modeButtonsContainer');
    const downloadSection = document.getElementById('downloadSection');
    const saveSettingsButton = document.getElementById('saveSettings');

    const togglePattern = document.getElementById('togglePattern');

    function updateUIState(enabled) {
        // Update status text
        statusText.textContent = enabled ? 'Enabled' : 'Disabled';
        
        // Toggle disabled state for sections
        [modeButtonsContainer, downloadSection].forEach(element => {
            if (enabled) {
                element.classList.remove('disabled');
                element.parentElement.classList.remove('disabled-section');
            } else {
                element.classList.add('disabled');
                element.parentElement.classList.add('disabled-section');
            }
        });

        // Toggle save button
        if (enabled) {
            saveSettingsButton.classList.remove('disabled');
        } else {
            saveSettingsButton.classList.add('disabled');
        }

        // Disable all inputs and buttons except the extension toggle
        const inputs = document.querySelectorAll('input:not(#toggleExtension)');
        const buttons = document.querySelectorAll('button');
        
        inputs.forEach(input => {
            input.disabled = !enabled;
        });
        
        buttons.forEach(button => {
            if (button !== toggleSwitch) {
                button.disabled = !enabled;
            }
        });

        // Also update the pattern toggle
        if (!enabled) {
            togglePattern.disabled = true;
            fileNamePattern.disabled = true;
        } else {
            togglePattern.disabled = false;
            fileNamePattern.disabled = !togglePattern.checked;
        }
    }

    // Load saved settings
    chrome.storage.local.get([
        'enabled',
        'defaultPath',
        'fileNamePattern',
        'clickMode',
        'patternEnabled'
    ], function(result) {
        toggleSwitch.checked = result.enabled === undefined ? true : result.enabled;
        updateUIState(toggleSwitch.checked);
        
        // Set path display
        if (result.defaultPath && result.defaultPath.trim()) {
            defaultPath.value = result.defaultPath;
            currentPath.textContent = result.defaultPath;
        } else {
            defaultPath.value = '';
            currentPath.textContent = 'Default';
        }
        
        fileNamePattern.value = result.fileNamePattern || 'image_{date}_{index}';
        
        // Set pattern toggle state
        togglePattern.checked = result.patternEnabled === undefined ? true : result.patternEnabled;
        fileNamePattern.disabled = !togglePattern.checked;

        // Set click mode
        const currentMode = result.clickMode || 'single';
        updateClickModeButtons(currentMode);
    });

    // Handle toggle changes
    toggleSwitch.addEventListener('change', function() {
        const enabled = toggleSwitch.checked;
        updateUIState(enabled);
        
        chrome.storage.local.set({ enabled: enabled });
        
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { 
                    action: "toggleExtension", 
                    enabled: enabled 
                });
            });
        });
    });

    // Handle manual path input
    setPath.addEventListener('click', function() {
        const path = defaultPath.value.trim();
        if (path) {
            // Clean up the path
            const cleanPath = path
                .replace(/\\/g, '/') // Convert backslashes to forward slashes
                .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
                .replace(/\/+/g, '/'); // Remove multiple consecutive slashes
            
            defaultPath.value = cleanPath;
            currentPath.textContent = cleanPath || 'Default';
            saveAllSettings();
        }
    });

    // Handle browse button click
    browsePath.addEventListener('click', function() {
        chrome.downloads.showDefaultFolder();
        chrome.downloads.onChanged.addListener(function(delta) {
            if (delta.state && delta.state.current === 'complete') {
                const path = delta.filename.current;
                const newPath = path.substring(0, path.lastIndexOf('/'));
                defaultPath.value = newPath;
                currentPath.textContent = newPath;
                saveAllSettings();
            }
        });
    });

    // Handle Enter key in path input
    defaultPath.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            setPath.click();
        }
    });

    // Save settings
    saveSettings.addEventListener('click', function() {
        saveAllSettings();
    });

    function saveAllSettings() {
        const settings = {
            defaultPath: defaultPath.value.trim(),
            fileNamePattern: fileNamePattern.value.trim(),
            patternEnabled: togglePattern.checked
        };

        chrome.storage.local.set(settings, function() {
            // Update path display after saving
            currentPath.textContent = settings.defaultPath || 'Default';
            
            saveMessage.style.display = 'block';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 2000);
        });
    }

    // Handle click mode buttons
    singleClickMode.addEventListener('click', function() {
        updateClickModeButtons('single');
        saveClickMode('single');
    });

    doubleClickMode.addEventListener('click', function() {
        updateClickModeButtons('double');
        saveClickMode('double');
    });

    function updateClickModeButtons(mode) {
        singleClickMode.classList.toggle('active', mode === 'single');
        doubleClickMode.classList.toggle('active', mode === 'double');
    }

    function saveClickMode(mode) {
        chrome.storage.local.set({ clickMode: mode }, function() {
            // Notify content script of mode change
            chrome.tabs.query({}, function(tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "updateClickMode", 
                        mode: mode 
                    });
                });
            });

            // Show save message
            saveMessage.style.display = 'block';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 2000);
        });
    }

    togglePattern.addEventListener('change', function() {
        fileNamePattern.disabled = !this.checked;
        
        chrome.storage.local.set({ 
            patternEnabled: this.checked 
        }, function() {
            // Show save message
            saveMessage.style.display = 'block';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 2000);
        });
    });

    // Load theme setting
    chrome.storage.local.get(['darkMode'], function(result) {
        const isDarkMode = result.darkMode || false;
        applyTheme(isDarkMode);
    });

    // Listen for theme changes from options page
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "updateTheme") {
            applyTheme(message.darkMode);
        }
    });

    function applyTheme(isDarkMode) {
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }
}); 