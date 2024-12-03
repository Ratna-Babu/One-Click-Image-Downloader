document.addEventListener('DOMContentLoaded', function() {
    const defaultPath = document.getElementById('defaultPath');
    const currentPath = document.getElementById('currentPath');
    const browsePath = document.getElementById('browsePath');
    const setPath = document.getElementById('setPath');
    const fileNamePattern = document.getElementById('fileNamePattern');
    const togglePattern = document.getElementById('togglePattern');
    const singleClickMode = document.getElementById('singleClickMode');
    const doubleClickMode = document.getElementById('doubleClickMode');
    const saveSettings = document.getElementById('saveSettings');
    const saveMessage = document.getElementById('saveMessage');
    const toggleTheme = document.getElementById('toggleTheme');

    // Load saved settings
    chrome.storage.local.get([
        'defaultPath',
        'fileNamePattern',
        'clickMode',
        'patternEnabled',
        'darkMode'
    ], function(result) {
        // Set path display
        if (result.defaultPath && result.defaultPath.trim()) {
            defaultPath.value = result.defaultPath;
            currentPath.textContent = result.defaultPath;
        } else {
            defaultPath.value = '';
            currentPath.textContent = 'Default';
        }
        
        // Set file name pattern
        fileNamePattern.value = result.fileNamePattern || 'image_{date}_{index}';
        
        // Set pattern toggle state
        togglePattern.checked = result.patternEnabled === undefined ? true : result.patternEnabled;
        fileNamePattern.disabled = !togglePattern.checked;

        // Set click mode
        const currentMode = result.clickMode || 'single';
        updateClickModeButtons(currentMode);

        // Set theme toggle state and apply theme
        const isDarkMode = result.darkMode || false;
        toggleTheme.checked = isDarkMode;
        applyTheme(isDarkMode);
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

    // Handle pattern toggle
    togglePattern.addEventListener('change', function() {
        fileNamePattern.disabled = !this.checked;
        saveAllSettings();
    });

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
            showSaveMessage();
        });
    }

    // Save all settings
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
            showSaveMessage();
        });
    }

    function showSaveMessage() {
        saveMessage.style.display = 'block';
        setTimeout(() => {
            saveMessage.style.display = 'none';
        }, 2000);
    }

    // Add theme toggle handler
    toggleTheme.addEventListener('change', function() {
        const isDarkMode = this.checked;
        applyTheme(isDarkMode);
        
        chrome.storage.local.set({ darkMode: isDarkMode }, function() {
            // Notify popup of theme change
            chrome.runtime.sendMessage({ 
                action: "updateTheme", 
                darkMode: isDarkMode 
            });
            showSaveMessage();
        });
    });

    function applyTheme(isDarkMode) {
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    }
}); 