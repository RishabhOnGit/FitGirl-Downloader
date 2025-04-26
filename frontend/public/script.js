// DOM Elements
const linksInput = document.getElementById('links-input');
const startDownloadBtn = document.getElementById('start-download-btn');
const clearLinksBtn = document.getElementById('clear-links-btn');
const downloadStatus = document.getElementById('download-status');
const statusMessage = downloadStatus.querySelector('.status-message');
const logOutput = document.getElementById('log-output');
const downloadQueue = document.getElementById('download-queue');

// State variables
let isDownloading = false;
let downloadLinks = [];
let currentDownloadIndex = 0;
let totalDownloadsCompleted = 0;
let popupWarningShown = false;

// Event Listeners
startDownloadBtn.addEventListener('click', handleStartDownload);
clearLinksBtn.addEventListener('click', clearLinks);

// Check if server is available on load
window.addEventListener('load', async () => {
    try {
        const status = await window.api.checkServerStatus();
        logInfo("Server status", status.status);
    } catch (error) {
        logError("Server connection", "Failed to connect to server");
    }
});

// Functions
async function handleStartDownload() {
    if (isDownloading) {
        logWarning("Downloads already in progress", "");
        return;
    }
    
    const links = linksInput.value.trim().split('\n').filter(link => link.trim() !== '');
    
    if (links.length === 0) {
        logError("No links entered", "Please enter at least one valid link");
        return;
    }
    
    // Reset state
    downloadLinks = links;
    currentDownloadIndex = 0;
    totalDownloadsCompleted = 0;
    isDownloading = true;
    popupWarningShown = false;
    
    // Update UI
    statusMessage.textContent = `Starting downloads: 0/${downloadLinks.length} completed`;
    logInfo("Download queue", `Processing ${downloadLinks.length} links`);
    
    // Remove popup warning if it exists
    const existingWarning = document.querySelector('.popup-warning');
    if (existingWarning) {
        document.body.removeChild(existingWarning);
    }
    
    updateDownloadQueue();
    startDownload();
}

async function startDownload() {
    // Check if we've reached the end of the queue
    if (currentDownloadIndex >= downloadLinks.length) {
        logSuccess("All downloads completed", `${totalDownloadsCompleted}/${downloadLinks.length} files processed`);
        isDownloading = false;
        statusMessage.textContent = "All downloads completed";
        return;
    }
    
    const currentLink = downloadLinks[currentDownloadIndex];
    
    statusMessage.textContent = `Downloading ${currentDownloadIndex + 1} of ${downloadLinks.length}`;
    
    logInfo("Started processing", getShortLink(currentLink));
    
    try {
        // Process the link to get download info
        const processResult = await window.api.processLink(currentLink);
        
        if (!processResult.success) {
            logError("Failed to process link", processResult.message || "Unknown error");
            // Still increment counters and move to next download
            currentDownloadIndex++;
            updateDownloadQueue();
            startDownload();
            return;
        }
        
        logInfo("Found download URL", `${processResult.downloadUrl.substring(0, 30)}...`);
        
        // Start the download with the URL obtained from the backend
        triggerDownload(
            processResult.downloadId, 
            processResult.downloadUrl, 
            processResult.fileName
        );
        
    } catch (error) {
        logError("Processing error", error.message);
        // Move to next download
        currentDownloadIndex++;
        updateDownloadQueue();
        startDownload();
    }
}

function triggerDownload(downloadId, url, fileName) {
    logInfo("Starting download", fileName);
    
    // Create a download entry in the UI with download link
    const downloadEntryDiv = document.createElement('div');
    downloadEntryDiv.className = 'download-entry';
    downloadEntryDiv.innerHTML = `
        <span>${fileName}</span>
        <a href="${url}" class="download-button">Download</a>
    `;
    
    logOutput.appendChild(downloadEntryDiv);
    
    // Try to download automatically
    try {
        // Create fetch request to get the file instead of opening in new tab
        fetch(url)
            .then(response => response.blob())
            .then(blob => {
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
                
                logSuccess("Download ready", "Saving to your downloads folder");
            })
            .catch(error => {
                console.error("Download error:", error);
                logError("Download failed", "Please use the download button");
                showPopupWarning();
            });
        
    } catch (error) {
        console.error("Download trigger error:", error);
        logError("Automatic download failed", "Please use the download button");
        showPopupWarning();
    }
    
    // Increment the completed count
    totalDownloadsCompleted++;
    
    // Move to next download after a delay to avoid browser blocking multiple downloads
    setTimeout(() => {
        // Move to the next download
        currentDownloadIndex++;
        updateDownloadQueue();
        startDownload();
    }, 3000);
}

function showPopupWarning() {
    if (popupWarningShown) return;
    
    popupWarningShown = true;
    
    const popupWarning = document.createElement('div');
    popupWarning.className = 'popup-warning';
    popupWarning.innerHTML = `
        <div class="warning-content">
            <p>⚠️ Your browser might be blocking automatic downloads</p>
            <p>Please check your browser settings or use the download buttons provided</p>
            <button class="dismiss-btn">Got it</button>
        </div>
    `;
    
    document.body.appendChild(popupWarning);
    
    // Add event listener to dismiss button
    const dismissBtn = popupWarning.querySelector('.dismiss-btn');
    dismissBtn.addEventListener('click', () => {
        document.body.removeChild(popupWarning);
    });
}

function updateDownloadQueue() {
    // Clear the queue display
    downloadQueue.innerHTML = '';
    
    // Don't show anything if there are no links in the queue
    if (downloadLinks.length === 0) return;
    
    // Update status message
    statusMessage.textContent = `Downloads: ${totalDownloadsCompleted}/${downloadLinks.length} completed`;
    
    // Add items that are still in the queue
    for (let i = currentDownloadIndex; i < downloadLinks.length; i++) {
        const link = downloadLinks[i];
        const li = document.createElement('li');
        li.textContent = getShortLink(link);
        
        // Highlight the current download
        if (i === currentDownloadIndex && isDownloading) {
            li.className = 'current-download';
        }
        
        downloadQueue.appendChild(li);
    }
    
    // If queue is empty but we're still downloading
    if (currentDownloadIndex >= downloadLinks.length && isDownloading) {
        const li = document.createElement('li');
        li.textContent = 'Finishing up...';
        downloadQueue.appendChild(li);
    }
}

function clearLinks() {
    if (isDownloading) {
        if (!confirm("Downloads are in progress. Do you want to clear all links and stop downloading?")) {
            return;
        }
    }
    
    linksInput.value = '';
    downloadLinks = [];
    currentDownloadIndex = 0;
    totalDownloadsCompleted = 0;
    isDownloading = false;
    downloadQueue.innerHTML = '';
    statusMessage.textContent = "Ready to download";
    logWarning("Download queue cleared", "All links removed");
}

// Logging functions
function logInfo(message, details) {
    addLogEntry('info', message, details);
}

function logSuccess(message, details) {
    addLogEntry('success', message, details);
}

function logError(message, details) {
    addLogEntry('error', message, details);
}

function logWarning(message, details) {
    addLogEntry('warning', message, details);
}

function addLogEntry(type, message, details) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    
    const timestamp = getCurrentTimestamp();
    const content = details ? `${message}: ${details}` : message;
    
    entry.innerHTML = `<span class="timestamp">${timestamp}</span> [${type.toUpperCase()}] ${content}`;
    
    logOutput.appendChild(entry);
    logOutput.scrollTop = logOutput.scrollHeight; // Auto-scroll to bottom
}

function getCurrentTimestamp() {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
}

function getShortLink(link) {
    if (link.length <= 50) return link;
    return link.substring(0, 25) + '...' + link.substring(link.length - 25);
}

// Backend status element
const backendStatusElement = document.getElementById('backend-status');

// Update backend status display
function updateBackendStatus(isConnected, message = '') {
    if (isConnected) {
        backendStatusElement.textContent = 'Connected';
        backendStatusElement.className = 'connected';
    } else if (message === 'connecting') {
        backendStatusElement.textContent = 'Connecting...';
        backendStatusElement.className = 'connecting';
    } else {
        backendStatusElement.textContent = 'Disconnected';
        backendStatusElement.className = 'disconnected';
    }
}

// Check if backend is available
async function checkBackendConnection() {
    updateBackendStatus(false, 'connecting');
    
    try {
        const status = await window.api.checkServerStatus();
        if (status && status.status) {
            updateBackendStatus(true);
            logInfo("Backend status", status.status);
            return true;
        }
    } catch (error) {
        updateBackendStatus(false);
        logError("Backend connection", "Failed to connect to backend server");
        console.error("Backend connection error:", error);
    }
    
    return false;
}

// Initialize WebSocket if available
let wsConnection = null;
try {
    wsConnection = window.ws.initialize();
    
    // Set callbacks for WebSocket
    window.downloadCompleteCallback = (downloadId) => {
        setTimeout(() => {
            // This was previously moving to next download, 
            // but now we handle that in triggerDownload
        }, 1000);
    };
    
    window.downloadErrorCallback = (downloadId, error) => {
        setTimeout(() => {
            // This was previously moving to next download, 
            // but now we handle that in triggerDownload
        }, 3000);
    };
} catch (error) {
    console.error("WebSocket initialization error:", error);
}

// Initialize
statusMessage.textContent = "Ready to download";
logInfo("Application started", "Ready to download");

// Initial backend check
checkBackendConnection().then(isConnected => {
    if (!isConnected) {
        // Retry every 5 seconds
        setInterval(checkBackendConnection, 5000);
    }
});

// Add some styling for the download button, popup warning, and current download
const style = document.createElement('style');
style.textContent = `
    .download-button {
        display: inline-block;
        background: var(--primary-color);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        text-decoration: none;
        margin-top: 5px;
        margin-bottom: 10px;
    }
    .download-button:hover {
        background: #7442e6;
    }
    .current-download {
        font-weight: bold;
        color: var(--primary-color);
    }
    .download-entry {
        margin: 10px 0;
        padding: 5px 0;
    }
    .popup-warning {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: var(--card-bg);
        border: 1px solid var(--warning-color);
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        max-width: 400px;
        text-align: center;
    }
    .warning-content p {
        margin-bottom: 10px;
    }
    .dismiss-btn {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
    }
    .dismiss-btn:hover {
        background: #7442e6;
    }
`;
document.head.appendChild(style);
