# FitGirl Downloader

A modern web application for automating the download process of FitGirl repack files. This project allows users to batch process multiple download links with an elegant interface and real-time status updates.

## 🚀 Features

- **Batch Processing**: Enter multiple links and process them sequentially
- **Automatic Downloads**: Handles downloads without requiring manual clicks for each file
- **Real-time Status**: Live updates on download progress and status
- **Smart Queue Management**: Efficiently processes multiple links with proper timing
- **Modern UI**: Clean, responsive interface with intuitive controls
- **Backend Integration**: Separate frontend and backend architecture for scalability
- **WebSocket Support**: Real-time communication between client and server
- **Duplicate Prevention**: Smart detection of repeated download attempts
- **Browser Integration**: Optimized for different browser download behaviors

## 📋 Prerequisites

### For Users
- Modern web browser (Chrome, Firefox, Edge recommended)
- For optimal experience, configure your browser to use automatic downloads

### For Developers
- Node.js (v16+)
- Git

## 🔧 Installation & Setup

### Deployment Options
The application is designed to be deployed to:
- Frontend: [Vercel](https://vercel.com)
- Backend: [Render](https://render.com)

### Clone the Repository
```bash
git clone https://github.com/yourusername/fitgirl-downloader.git
cd fitgirl-downloader
```

### Frontend Setup
```bash
cd frontend
# No build step required for static files
```

### Backend Setup
```bash
cd backend
npm install
npm start
```

### Development Mode
```bash
# For backend
cd backend
npm run dev

# For frontend (using a simple HTTP server)
cd frontend
npx serve public
```

## 🏗️ Project Structure

```
fitgirl-downloader/
├── frontend/              # Frontend code (deployed to Vercel)
│   ├── public/            # Static files
│   │   ├── index.html     # Main HTML page
│   │   ├── styles.css     # CSS styling
│   │   ├── script.js      # Main frontend logic
│   │   ├── api.js         # API communication functions
│   │   ├── websocket.js   # WebSocket client functions
│   │   └── env.js         # Environment configuration
│   └── vercel.json        # Vercel deployment configuration
├── backend/               # Backend code (deployed to Render)
│   ├── server.js          # Express server with API endpoints
│   ├── websocket-server.js # WebSocket server functionality
│   ├── package.json       # Node.js dependencies
│   └── render.yaml        # Render deployment configuration
└── README.md             # This documentation
```

## 🔌 Environment Configuration

The frontend communicates with the backend through environment variables defined in `env.js`:

```javascript
window.env = {
  BACKEND_URL: 'https://your-backend-url.onrender.com',
  WEBSOCKET_URL: 'wss://your-backend-url.onrender.com/ws'
};
```

The backend accepts configurations through environment variables:
- `PORT`: The port to run the server on (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend origins

## 🖥️ Usage

1. Navigate to the deployed application URL
2. Enter FitGirl repack links in the text area (one per line)
3. Click "Start Downloads" to begin processing
4. Monitor real-time progress in the Download Log section
5. Use the provided download buttons as fallbacks if automatic downloads fail
6. Configure your browser settings as suggested by the application popup for optimal experience

## 🛠️ API Endpoints

### Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Check server status |
| `/api/process` | POST | Process a download link and extract download URL |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `download_progress` | Server → Client | Real-time download progress updates |
| `download_complete` | Server → Client | Notification of completed download |
| `download_error` | Server → Client | Error notification for failed downloads |

## 📱 Browser Compatibility

- ✅ Chrome (Recommended)
- ✅ Firefox
- ✅ Edge
- ⚠️ Safari (Limited automatic download support)
- ⚠️ Mobile browsers (May require manual download interaction)

## 🔒 Security Considerations

- The application runs entirely in the browser and on your own server
- No user data is collected or stored
- Downloads are processed through your own browser's download mechanism
- The backend server only extracts download URLs, it doesn't store any files

## ⚠️ Disclaimer

This tool is created for educational purposes only. Please ensure you comply with all applicable laws and terms of service when downloading content.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/RishabhOnGit">Rishabh</a>
</p>
