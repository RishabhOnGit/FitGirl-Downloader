// DOM Elements
const linksInput = document.getElementById('links-input');
const startDownloadBtn = document.getElementById('start-download-btn');
const clearLinksBtn = document.getElementById('clear-links-btn');
const clearLogBtn = document.getElementById('clear-log-btn');
const downloadStatus = document.getElementById('download-status');
const statusMessage = downloadStatus.querySelector('.status-message');
const progressIndicator = document.getElementById('progress-indicator');
const progressStats = document.getElementById('progress-stats');
const logOutput = document.getElementById('log-output');
const downloadQueue = document.getElementById('download-queue');

// State variables
let isDownloading = false;
let downloadLinks = [];
let currentDownloadIndex = 0;
let totalDownloadsCompleted = 0;
let downloadedFiles = new Set(); // Track which files have been downloaded

// Create the browser settings popup
function createBrowserSettingsPopup() {
    // Check if we've already shown this popup in this session
    if (localStorage.getItem('downloadSettingsShown')) {
        return;
    }
    
    const popup = document.createElement('div');
    popup.className = 'browser-settings-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <h2>⚙️ Optimize Your Download Experience</h2>
            <p>For the best experience with automatic downloads, we recommend configuring your browser settings:</p>
            
            <div class="browser-instructions">
                <div class="browser-section">
                    <h3>Chrome / Edge Users:</h3>
                    <ol>
                        <li>Go to <strong>Settings → Downloads</strong></li>
                        <li>Turn <strong>OFF</strong> "Ask where to save each file before downloading"</li>
                        <li>Set a default download location</li>
                    </ol>
                </div>
                
                <div class="browser-section">
                    <h3>Firefox Users:</h3>
                    <ol>
                        <li>Go to <strong>Options → General → Downloads</strong></li>
                        <li>Select "Save files to..." instead of "Always ask you where to save files"</li>
                    </ol>
                </div>
            </div>
            
            <div class="popup-buttons">
                <button id="dont-show-again" class="secondary-btn">Don't show again</button>
                <button id="close-popup" class="primary-btn">Got it!</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // Add event listeners for buttons
    document.getElementById('close-popup').addEventListener('click', () => {
        document.body.removeChild(popup);
    });
    
    document.getElementById('dont-show-again').addEventListener('click', () => {
        localStorage.setItem('downloadSettingsShown', 'true');
        document.body.removeChild(popup);
    });
}

// Event Listeners
startDownloadBtn.addEventListener('click', handleStartDownload);
clearLinksBtn.addEventListener('click', clearLinks);
clearLogBtn.addEventListener('click', clearLog);

// Check if server is available on load
window.addEventListener('load', async () => {
    try {
        const status = await window.api.checkServerStatus();
        logInfo("Server status", status.status);
        
        // Show the popup after a short delay
        setTimeout(createBrowserSettingsPopup, 1000);
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
    downloadedFiles.clear(); // Clear the tracked downloads
    
    // Update UI
    progressIndicator.classList.add('active');
    statusMessage.textContent = `Starting downloads...`;
    progressStats.textContent = `0/${downloadLinks.length}`;
    logInfo("Download queue", `Processing ${downloadLinks.length} links`);
    
    updateDownloadQueue();
    startDownload();
}

async function startDownload() {
    // Check if we've reached the end of the queue
    if (currentDownloadIndex >= downloadLinks.length) {
        logSuccess("All downloads completed", `${totalDownloadsCompleted}/${downloadLinks.length} files processed`);
        isDownloading = false;
        statusMessage.textContent = "All downloads completed";
        progressIndicator.classList.remove('active');
        return;
    }
    
    const currentLink = downloadLinks[currentDownloadIndex];
    
    statusMessage.textContent = `Downloading...`;
    progressStats.textContent = `${totalDownloadsCompleted}/${downloadLinks.length}`;
    
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
        
        // Check if we've already downloaded this file (by URL)
        if (downloadedFiles.has(processResult.downloadUrl)) {
            logWarning("Skipping duplicate download", processResult.fileName);
            currentDownloadIndex++;
            updateDownloadQueue();
            startDownload();
            return;
        }
        
        // Add to our tracking set
        downloadedFiles.add(processResult.downloadUrl);
        
        logInfo("Found download URL", `${processResult.downloadUrl.substring(0, 30)}...`);
        
        // Show the file name and download button (for fallback)
        const downloadEntryDiv = document.createElement('div');
        downloadEntryDiv.className = 'download-entry';
        downloadEntryDiv.innerHTML = `
            <span>${processResult.fileName}</span>
            <a href="${processResult.downloadUrl}" class="download-button" target="_blank">
                <i class="fas fa-download"></i> Download
            </a>
        `;
        logOutput.appendChild(downloadEntryDiv);
        
        // Trigger automatic download using a direct link
        // This approach is more likely to use browser's default save behavior
        triggerDownload(processResult.downloadUrl, processResult.fileName);
        
        // Log success
        logSuccess("Download starting", processResult.fileName);
        
        // Increment the completed count
        totalDownloadsCompleted++;
        
        // Update progress stats
        progressStats.textContent = `${totalDownloadsCompleted}/${downloadLinks.length}`;
        
        // Move to next download after a delay
        setTimeout(() => {
            currentDownloadIndex++;
            updateDownloadQueue();
            startDownload();
        }, 5000); // 5 second delay between downloads
        
    } catch (error) {
        logError("Processing error", error.message);
        // Move to next download
        currentDownloadIndex++;
        updateDownloadQueue();
        startDownload();
    }
}

function triggerDownload(url, fileName) {
    try {
        // Create a single anchor element for the download
        const link = document.createElement('a');
        link.href = url;
        
        // On some browsers, setting download attribute helps preserve 
        // filename and encourages browser to use download mode
        link.setAttribute('download', fileName);
        
        // Hide the element
        link.style.display = 'none';
        
        // Add to DOM
        document.body.appendChild(link);
        
        // Trigger click
        link.click();
        
        // Remove after a short delay
        setTimeout(() => {
            document.body.removeChild(link);
        }, 1000);
        
    } catch (error) {
        console.error("Download error:", error);
        logError("Automatic download failed", "Please use the download button");
    }
}

function updateDownloadQueue() {
    // Clear the queue display
    downloadQueue.innerHTML = '';
    
    // Don't show anything if there are no links in the queue
    if (downloadLinks.length === 0) return;
    
    // Add items that are still in the queue
    for (let i = currentDownloadIndex; i < downloadLinks.length; i++) {
        const link = downloadLinks[i];
        const li = document.createElement('li');
        
        // Highlight the current download
        if (i === currentDownloadIndex && isDownloading) {
            li.className = 'current-download';
            li.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${getShortLink(link)}`;
        } else {
            li.innerHTML = `<i class="fas fa-hourglass"></i> ${getShortLink(link)}`;
        }
        
        downloadQueue.appendChild(li);
    }
    
    // If queue is empty but we're still downloading
    if (currentDownloadIndex >= downloadLinks.length && isDownloading) {
        const li = document.createElement('li');
        li.innerHTML = `<i class="fas fa-check-circle"></i> Finishing up...`;
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
    progressStats.textContent = '';
    progressIndicator.classList.remove('active');
    logWarning("Download queue cleared", "All links removed");
}

function clearLog() {
    logOutput.innerHTML = '';
    logInfo("Log cleared", "");
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
    
    let icon = '';
    switch (type) {
        case 'info':
            icon = '<i class="fas fa-info-circle"></i>';
            break;
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
    }
    
    entry.innerHTML = `<span class="timestamp">${timestamp}</span> ${icon} ${content}`;
    
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
        // We're not using this anymore
    };
    
    window.downloadErrorCallback = (downloadId, error) => {
        // We're not using this anymore
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

// Add some styling for the download button and current download
const style = document.createElement('style');
style.textContent = `
    .download-button {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: var(--primary-color);
        color: white;
        padding: 5px 10px;
        border-radius: 4px;
        text-decoration: none;
        margin-left: 10px;
        font-size: 0.9rem;
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
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
`;
document.head.appendChild(style);

// Add download settings to the page
document.addEventListener('DOMContentLoaded', function() {
    // This will run once on load and attempt to set the default download behavior for the browser
    // Note: This won't work in all browsers due to security restrictions
    try {
        // Create a single-use handler to respond to the first download
        window.addEventListener('beforeunload', function(e) {
            // This is to prevent multiple dialogs in some browsers
            e.preventDefault();
            return false;
        }, {once: true});
        
    } catch (error) {
        console.error("Could not set download behavior:", error);
    }
});
