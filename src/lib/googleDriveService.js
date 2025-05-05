// src/lib/googleDriveService.js
import { authorizeJwtClient, getDrive } from './googleAuth';

// Upload image or file to Google Drive
export const uploadImageToDrive = async (file) => {
    try {
        await authorizeJwtClient();
        const drive = getDrive();

        // Create file metadata
        const fileMetadata = {
            name: `inventory_${Date.now()}_${file.name || 'file'}`,
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] // Folder ID where to store images
        };

        // Create file in Google Drive
        const response = await drive.files.create({
            resource: fileMetadata,
            media: {
                mimeType: file.type,
                body: file.stream || file
            },
            fields: 'id,webViewLink'
        });

        // Make the file public
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Get the direct download URL
        const getUrl = await drive.files.get({
            fileId: response.data.id,
            fields: 'webContentLink'
        });

        return getUrl.data.webContentLink;
    } catch (error) {
        console.error("Error uploading to Google Drive:", error);
        throw error;
    }
};

// Delete a file from Google Drive
export const deleteFileFromDrive = async (fileUrl) => {
    try {
        // Extract file ID from the URL
        const fileId = extractFileIdFromUrl(fileUrl);

        if (!fileId) {
            throw new Error("Invalid file URL");
        }

        await authorizeJwtClient();
        const drive = getDrive();

        // Delete the file
        await drive.files.delete({
            fileId: fileId
        });

        return true;
    } catch (error) {
        console.error("Error deleting file from Google Drive:", error);
        throw error;
    }
};

// Helper function to extract file ID from Google Drive URL
export const extractFileIdFromUrl = (url) => {
    if (!url) return null;

    // Look for the ID in the URL structure
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
};