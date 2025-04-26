// websocket.js - Handle real-time progress updates via WebSockets

// Initialize the WebSocket connection
function initializeWebSocket() {
    // Connect to the Render backend WebSocket URL from env.js
    const wsUrl = window.env?.WEBSOCKET_URL || 'wss://fitgirl-downloader.onrender.com/ws';
    
    const socket = new WebSocket(wsUrl);
    
    // WebSocket connection opened
    socket.addEventListener('open', (event) => {
        console.log('WebSocket connection established');
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    // Connection closed
    socket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed, attempting to reconnect in 5 seconds...');
        setTimeout(initializeWebSocket, 5000);
    });
    
    // Connection error
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });
    
    return socket;
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(data) {
    // Messages should contain an event type and relevant data
    switch (data.type) {
        case 'download_progress':
            updateDownloadProgress(data);
            break;
            
        case 'download_complete':
            completeDownload(data);
            break;
            
        case 'download_error':
            handleDownloadError(data);
            break;
            
        case 'server_status':
            updateServerStatus(data);
            break;
            
        default:
            console.log('Unknown WebSocket message type:', data.type);
    }
}

// Update progress for a specific download
function updateDownloadProgress(data) {
    const { downloadId, progress, fileName } = data;
    
    // Find the progress bar for this download
    const progressBar = document.querySelector(`[data-download-id="${downloadId}"] .progress-bar-fill`);
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    // Update log if significant progress change
    if (progress % 25 === 0) {
        window.logInfo(`Download progress: ${fileName}`, `${progress}%`);
    }
}

// Handle a completed download
function completeDownload(data) {
    const { downloadId, fileName, filePath } = data;
    
    // Update progress to 100%
    const progressBar = document.querySelector(`[data-download-id="${downloadId}"] .progress-bar-fill`);
    if (progressBar) {
        progressBar.style.width = '100%';
    }
    
    window.logSuccess(`Download complete: ${fileName}`, `Saved to: ${filePath}`);
    
    // Notify the main script that this download is finished
    if (window.downloadCompleteCallback) {
        window.downloadCompleteCallback(downloadId);
    }
}

// Handle download errors
function handleDownloadError(data) {
    const { downloadId, fileName, error } = data;
    
    // Mark progress bar as failed
    const progressBar = document.querySelector(`[data-download-id="${downloadId}"] .progress-bar-fill`);
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = 'var(--error-color)';
    }
    
    window.logError(`Download failed: ${fileName}`, error);
    
    // Notify the main script of the error
    if (window.downloadErrorCallback) {
        window.downloadErrorCallback(downloadId, error);
    }
}

// Update server status display
function updateServerStatus(data) {
    const { status, message } = data;
    
    if (status === 'ok') {
        window.logInfo('Server status', message || 'Connected');
    } else {
        window.logWarning('Server status', message || 'Issue detected');
    }
}

// Export the WebSocket functionality
window.ws = {
    initialize: initializeWebSocket,
    // Add functions to send messages to the server
    sendMessage: (socket, type, data) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type,
                ...data
            }));
        }
    }
};
