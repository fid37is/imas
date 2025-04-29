// functions/src/driveService.js
import { getDrive, DRIVE_FOLDER_ID } from './googleServiceSetup';
import * as functions from 'firebase-functions';

/**
 * Upload an image to Google Drive
 * @param {string} base64Data - Image as base64 string
 * @param {string} filename - Filename
 * @param {string} contentType - File MIME type
 * @returns {Promise<string>} - URL to the uploaded image
 */
const uploadImageToDriveHelper = async (base64Data, filename, contentType) => {
    try {
        const drive = getDrive();
        // Create a buffer from the base64 data
        const fileBuffer = Buffer.from(base64Data, 'base64');
        // Upload file to Drive
        const response = await drive.files.create({
            requestBody: {
                name: filename,
                mimeType: contentType,
                parents: [DRIVE_FOLDER_ID],
            },
            media: {
                mimeType: contentType,
                body: fileBuffer,
            },
        });
        const fileId = response.data.id;
        // Make the file publicly accessible
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
        // Get the webViewLink or webContentLink
        const getResponse = await drive.files.get({
            fileId: fileId,
            fields: 'webViewLink, webContentLink',
        });
        // Return direct link to the image
        return getResponse.data.webContentLink || getResponse.data.webViewLink;
    } catch (error) {
        console.error('Error uploading to Drive:', error);
        throw new Error(`Failed to upload image to Google Drive: ${error.message}`);
    }
};

// Cloud Function to handle image uploads
export const uploadImageToDrive = functions.https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }
        
        // Destructure only what we need from data
        const { base64Data, filename, contentType } = data;
        // Omitting fallbackUrl since it's not used
        
        if (!base64Data || !filename || !contentType) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'The function requires base64Data, filename, and contentType parameters.'
            );
        }

        const imageUrl = await uploadImageToDriveHelper(base64Data, filename, contentType);
        return {
            success: true,
            imageUrl: imageUrl
        };
    } catch (error) {
        console.error('Error in uploadImageToDrive function:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});