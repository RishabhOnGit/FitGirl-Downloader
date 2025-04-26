const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const websocketServer = require('./websocket-server');

const app = express();
const PORT = process.env.PORT || 3000;

// Get allowed origins from environment or default to localhost
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'https://fitgirl-downloader.vercel.app'];

// Configure CORS for API routes
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is allowed
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server with CORS configuration
const wss = websocketServer.init(server, {
  verifyClient: (info) => {
    const origin = info.origin;
    // Allow if no origin or if origin is in the allowed list
    return !origin || allowedOrigins.includes(origin);
  }
});

// Enable JSON parsing in requests
app.use(express.json());

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Headers for requests
const headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.5',
    'referer': 'https://fitgirl-repacks.site/',
    'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

// API endpoint to start processing a link
app.post('/api/process', async (req, res) => {
    const { link } = req.body;
    
    if (!link) {
        return res.status(400).json({ success: false, message: 'No link provided' });
    }
    
    try {
        console.log(`Processing link: ${link}`);
        
        // Fetch the page
        const response = await axios.get(link, { headers });
        
        if (response.status !== 200) {
            return res.status(response.status).json({ 
                success: false, 
                message: `Failed to fetch page with status code: ${response.status}` 
            });
        }
        
        // Parse HTML
        const $ = cheerio.load(response.data);
        
        // Get the title
        const metaTitle = $('meta[name="title"]').attr('content');
        const fileName = metaTitle || 'default_file_name';
        
        // Find download function in script tags
        let downloadUrl = null;
        $('script').each((_, script) => {
            const scriptContent = $(script).html();
            if (scriptContent && scriptContent.includes('function download')) {
                const match = scriptContent.match(/window\.open\(["'](https?:\/\/[^\s"'\)]+)/);
                if (match) {
                    downloadUrl = match[1];
                }
            }
        });
        
        if (!downloadUrl) {
            return res.status(404).json({ 
                success: false, 
                message: 'Download URL not found in the page' 
            });
        }
        
        console.log(`Found download URL: ${downloadUrl}`);
        
        // Return the info so the frontend can start the download
        return res.json({
            success: true,
            fileName,
            downloadUrl,
            downloadId: Date.now().toString() // Unique ID for this download
        });
        
    } catch (error) {
        console.error('Error processing link:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Error processing link: ${error.message}` 
        });
    }
});

// API endpoint to download a file
app.get('/api/download/:downloadId', async (req, res) => {
    const { downloadId } = req.params;
    const { url, fileName } = req.query;
    
    if (!url || !fileName) {
        return res.status(400).json({ success: false, message: 'URL and fileName are required' });
    }
    
    try {
        // Create a safe filename
        const safeFileName = fileName.replace(/[^a-z0-9.-]/gi, '_');
        const filePath = path.join(downloadsDir, safeFileName);
        
        console.log(`Starting download: ${safeFileName}`);
        
        // Stream the download
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'stream',
            headers
        });
        
        // Get total size for progress calculation
        const totalSize = parseInt(response.headers['content-length'], 10);
        
        // Create write stream
        const writer = createWriteStream(filePath);
        
        // Set up progress
        // Set up progress tracking
        let downloaded = 0;
        response.data.on('data', (chunk) => {
            downloaded += chunk.length;
            const progress = Math.floor((downloaded / totalSize) * 100);
            
            // Emit progress event through WebSocket
            websocketServer.emitProgress(downloadId, progress, safeFileName);
        });
        
        // Pipe the download to the file
        await pipeline(response.data, writer);
        
        console.log(`Download completed: ${safeFileName}`);
        
        // Emit completion event
        websocketServer.emitComplete(downloadId, safeFileName, safeFileName);
        
        return res.json({ 
            success: true, 
            message: 'File downloaded successfully',
            filePath: safeFileName
        });
        
    } catch (error) {
        console.error('Error downloading file:', error);
        
        // Emit error event
        websocketServer.emitError(downloadId, fileName, error.message);
        
        return res.status(500).json({ 
            success: false, 
            message: `Error downloading file: ${error.message}` 
        });
    }
});

// Status endpoint
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'Server is running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
