import { uploadImageToDrive } from '../app/utils/clientDriveService';

/**
 * Upload image with fallback handling
 * @param {File|Object} file - File object to upload
 * @param {boolean} useLocalFallback - Whether to use local fallback when Google Drive fails
 * @returns {Promise<string>} URL of the uploaded file
 */
export async function uploadImage(file, useLocalFallback = true) {
    try {
        // Try Google Drive first
        try {
            const fileUrl = await uploadImageToDrive(file);
            console.log('Successfully uploaded to Google Drive:', fileUrl);
            return fileUrl;
        } catch (driveError) {
            console.warn('Google Drive upload failed:', driveError.message);

            // If fallback is enabled and we got a Drive error, try local storage
            if (useLocalFallback) {
                console.log('Falling back to local storage...');
                const localUrl = await saveFileLocally(file);
                console.log('Successfully saved locally:', localUrl);
                return localUrl;
            } else {
                throw driveError;
            }
        }
    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
}