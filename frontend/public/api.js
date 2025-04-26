// api.js - Client-side API functions for communicating with the server

// Base URL for API endpoints - use Render backend URL from env.js
const API_BASE_URL = window.env?.BACKEND_URL || 'https://fitgirl-downloader.onrender.com';

/**
 * Process a single download link
 * @param {string} link - The FitGirl repack link to process
 * @returns {Promise} - Promise resolving to the API response
 */
async function processLink(link) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ link }),
        });
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw new Error(`Failed to process link: ${error.message}`);
    }
}

/**
 * Start downloading a file
 * @param {string} downloadId - Unique identifier for this download
 * @param {string} url - The direct download URL
 * @param {string} fileName - Name to save the file as
 * @returns {Promise} - Promise resolving to the API response
 */
async function downloadFile(downloadId, url, fileName) {
    try {
        const encodedUrl = encodeURIComponent(url);
        const encodedFileName = encodeURIComponent(fileName);
        
        const response = await fetch(
            `${API_BASE_URL}/api/download/${downloadId}?url=${encodedUrl}&fileName=${encodedFileName}`,
            {
                method: 'GET',
            }
        );
        
        return await response.json();
    } catch (error) {
        console.error('Download Error:', error);
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

/**
 * Check server status
 * @returns {Promise} - Promise resolving to the server status response
 */
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        return await response.json();
    } catch (error) {
        console.error('Status Check Error:', error);
        throw new Error(`Server status check failed: ${error.message}`);
    }
}

// Export the API functions
window.api = {
    processLink,
    downloadFile,
    checkServerStatus,
};
