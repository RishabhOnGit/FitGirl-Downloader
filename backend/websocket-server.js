// websocket-server.js - WebSocket server for real-time updates
const WebSocket = require('ws');
const EventEmitter = require('events');

// Create an event emitter for handling download events
const downloadEvents = new EventEmitter();

// Initialize WebSocket server
function initWebSocketServer(server, options = {}) {
    const wss = new WebSocket.Server({ 
        server,
        ...options
    });
    
    // Handle new connections
    wss.on('connection', (ws) => {
        console.log('New WebSocket connection established');
        
        // Send initial server status
        ws.send(JSON.stringify({
            type: 'server_status',
            status: 'ok',
            message: 'Connected to FitGirl Downloader server'
        }));
        
        // Setup event listeners for this connection
        setupEventListeners(ws);
        
        // Handle messages from client
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                handleClientMessage(ws, data);
            } catch (error) {
                console.error('Error handling WebSocket message:', error);
            }
        });
        
        // Handle connection close
        ws.on('close', () => {
            console.log('WebSocket connection closed');
            removeEventListeners(ws);
        });
        
        // Handle connection errors
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });
    
    return wss;
}

// Set up event listeners for download progress updates
function setupEventListeners(ws) {
    // Store the listeners so we can remove them later
    ws.downloadListeners = {
        progress: (downloadId, progress, fileName) => {
            sendIfConnected(ws, {
                type: 'download_progress',
                downloadId,
                progress,
                fileName
            });
        },
        
        complete: (downloadId, fileName, filePath) => {
            sendIfConnected(ws, {
                type: 'download_complete',
                downloadId,
                fileName,
                filePath
            });
        },
        
        error: (downloadId, fileName, error) => {
            sendIfConnected(ws, {
                type: 'download_error',
                downloadId,
                fileName,
                error
            });
        }
    };
    
    // Register the event listeners
    downloadEvents.on('progress', ws.downloadListeners.progress);
    downloadEvents.on('complete', ws.downloadListeners.complete);
    downloadEvents.on('error', ws.downloadListeners.error);
}

// Remove event listeners when connection closes
function removeEventListeners(ws) {
    if (ws.downloadListeners) {
        downloadEvents.off('progress', ws.downloadListeners.progress);
        downloadEvents.off('complete', ws.downloadListeners.complete);
        downloadEvents.off('error', ws.downloadListeners.error);
    }
}

// Send a message if the connection is still open
function sendIfConnected(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// Handle messages from the client
function handleClientMessage(ws, data) {
    const { type } = data;
    
    switch (type) {
        case 'ping':
            sendIfConnected(ws, { type: 'pong', timestamp: Date.now() });
            break;
            
        default:
            console.log('Unknown message type from client:', type);
    }
}

// Broadcast a message to all connected clients
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Emit download progress event
function emitProgress(downloadId, progress, fileName) {
    downloadEvents.emit('progress', downloadId, progress, fileName);
}

// Emit download complete event
function emitComplete(downloadId, fileName, filePath) {
    downloadEvents.emit('complete', downloadId, fileName, filePath);
}

// Emit download error event
function emitError(downloadId, fileName, error) {
    downloadEvents.emit('error', downloadId, fileName, error);
}

module.exports = {
    init: initWebSocketServer,
    emitProgress,
    emitComplete,
    emitError,
    broadcast
};
