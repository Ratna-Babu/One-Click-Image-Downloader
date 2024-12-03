chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadImage") {
    console.log('Received download request:', message);

    chrome.storage.local.get(['defaultPath'], function(result) {
      let downloadPath = result.defaultPath || '';
      
      if (downloadPath) {
        downloadPath = downloadPath.replace(/\\/g, '/');
        if (!downloadPath.endsWith('/')) {
          downloadPath += '/';
        }
      }

      const fullPath = downloadPath + message.fileName;
      console.log('Downloading to:', fullPath);

      chrome.downloads.download({
        url: message.imageUrl,
        filename: fullPath,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download error:', chrome.runtime.lastError);
        } else {
          console.log('Download started:', downloadId);
        }
      });
    });
  }
  
  else if (message.action === "openDirectoryPicker") {
    chrome.downloads.showDefaultFolder();
    sendResponse({ path: 'downloads' });
  }
  
  return true; // Keep the message channel open for async responses
});

// Listen for download state changes
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state) {
    console.log('Download state changed:', delta);
  }
});
