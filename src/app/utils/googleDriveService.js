// utils/googleDriveService.js
import { google } from 'googleapis';

// Create a OAuth2 client
function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// Get the Drive API with authenticated client
async function getDriveApi(accessToken) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Upload a file to Google Drive
 * @param {Object} file - The file to upload
 * @param {string} accessToken - Google OAuth access token
 * @param {string} folderId - Optional folder ID to upload to
 * @returns {Promise<Object>} - The uploaded file metadata
 */
export async function uploadFileToDrive(file, accessToken, folderId = null) {
    try {
        const drive = await getDriveApi(accessToken);

        // Create file metadata
        const fileMetadata = {
            name: file.name || `inventory_image_${Date.now()}`,
            ...(folderId && { parents: [folderId] }),
        };

        // Set up file media
        const media = {
            mimeType: file.type || 'image/jpeg',
            body: file.stream || file,
        };

        // Upload file
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id,name,webViewLink,webContentLink',
        });

        // Make the file publicly accessible
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Get updated file with link
        const fileData = await drive.files.get({
            fileId: response.data.id,
            fields: 'id,name,webViewLink,webContentLink',
        });

        return fileData.data;
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}

/**
 * Delete a file from Google Drive
 * @param {string} fileId - The ID of the file to delete
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<void>}
 */
export async function deleteFileFromDrive(fileId, accessToken) {
    try {
        if (!fileId) return;

        const drive = await getDriveApi(accessToken);
        await drive.files.delete({ fileId });

        return true;
    } catch (error) {
        console.error('Error deleting file from Google Drive:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}

/**
 * Create a folder in Google Drive
 * @param {string} folderName - Name of the folder
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<string>} - The folder ID
 */
export async function createDriveFolder(folderName, accessToken) {
    try {
        const drive = await getDriveApi(accessToken);

        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };

        const response = await drive.files.create({
            resource: folderMetadata,
            fields: 'id',
        });

        return response.data.id;
    } catch (error) {
        console.error('Error creating folder in Google Drive:', error);
        throw new Error(`Failed to create folder: ${error.message}`);
    }
}

/**
 * Get a file from Google Drive
 * @param {string} fileId - The ID of the file
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<Object>} - The file metadata
 */
export async function getFileFromDrive(fileId, accessToken) {
    try {
        if (!fileId) return null;

        const drive = await getDriveApi(accessToken);
        const response = await drive.files.get({
            fileId,
            fields: 'id,name,webViewLink,webContentLink',
        });

        return response.data;
    } catch (error) {
        console.error('Error getting file from Google Drive:', error);
        throw new Error(`Failed to get file: ${error.message}`);
    }
}

/**
 * Find or create the inventory folder
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<string>} - The folder ID
 */
export async function getInventoryFolder(accessToken) {
    try {
        const drive = await getDriveApi(accessToken);

        // Check if folder already exists
        const response = await drive.files.list({
            q: "name='Inventory Images' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)',
        });

        // Return the folder ID if it exists
        if (response.data.files.length > 0) {
            return response.data.files[0].id;
        }

        // Create a new folder if it doesn't exist
        return createDriveFolder('Inventory Images', accessToken);
    } catch (error) {
        console.error('Error getting inventory folder:', error);
        throw new Error(`Failed to get inventory folder: ${error.message}`);
    }
}

/**
 * Extract file ID from Google Drive URL
 * @param {string} url - Google Drive URL
 * @returns {string|null} - File ID or null if not found
 */
export function extractFileIdFromUrl(url) {
    if (!url) return null;

    // Handle different Google Drive URL formats
    const patterns = [
        /\/d\/([^/]+)/,          // Drive link format: https://drive.google.com/file/d/FILE_ID/view
        /id=([^&]+)/,            // Old format with id parameter
        /\/open\?id=([^&]+)/     // Open link format
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}