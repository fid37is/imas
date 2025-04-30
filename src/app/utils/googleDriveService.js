// src/utils/googleDriveService.js
import { getDriveClient } from './googleAuth';
import path from 'path';
import { Readable } from 'stream';

// Google Drive folder ID from environment variable
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

/**
 * Upload a file to Google Drive and get public URL
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} fileName - Original file name
 * @param {String} mimeType - File MIME type
 * @returns {String} Public URL of the uploaded file
 */
export const uploadFileToDrive = async (fileBuffer, fileName, mimeType) => {
    try {
        const drive = await getDriveClient();

        // Create a clean file name (remove special chars, spaces to underscore)
        const cleanFileName = fileName
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .toLowerCase();

        // Get file extension
        const fileExtension = path.extname(cleanFileName);

        // Generate a unique filename with timestamp
        const uniqueFileName = `${path.basename(cleanFileName, fileExtension)}_${Date.now()}${fileExtension}`;

        // Create a readable stream from the buffer
        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null); // Signal the end of the stream

        // Upload file metadata
        const fileMetadata = {
            name: uniqueFileName,
            parents: [DRIVE_FOLDER_ID]
        };

        // File media content
        const media = {
            mimeType: mimeType,
            body: readableStream
        };

        // Upload the file
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id,webViewLink'
        });

        // Make the file publicly accessible (anyone with the link can view)
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Get the direct download link
        const file = await drive.files.get({
            fileId: response.data.id,
            fields: 'webContentLink'
        });

        // Return the web content link
        return file.data.webContentLink;
    } catch (error) {
        console.error('Error uploading file to Drive:', error);
        throw new Error('Failed to upload file to Google Drive');
    }
};

/**
 * Delete a file from Google Drive by URL
 * @param {String} fileUrl - The file URL to delete
 * @returns {Boolean} Success status
 */
export const deleteFileFromDrive = async (fileUrl) => {
    try {
        // Extract file ID from URL (Google Drive URLs contain the file ID)
        // Example URL: https://drive.google.com/uc?id=FILE_ID&export=download
        const urlObj = new URL(fileUrl);
        const fileId = urlObj.searchParams.get('id');

        if (!fileId) {
            throw new Error('Invalid file URL, could not extract file ID');
        }

        const drive = await getDriveClient();

        // Delete the file
        await drive.files.delete({
            fileId: fileId
        });

        return true;
    } catch (error) {
        console.error('Error deleting file from Drive:', error);
        throw new Error('Failed to delete file from Google Drive');
    }
};