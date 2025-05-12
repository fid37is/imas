// lib/googleDriveService.js
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { authorizeJwtClient, getDrive } from './googleSheetsService';

// Function to upload image to Google Drive
export const uploadToGoogleDrive = async (fileObject) => {
    try {
        // Use the existing JWT client that's already working for Sheets
        await authorizeJwtClient();
        const drive = getDrive();

        console.log('Uploading to Google Drive folder:', process.env.GOOGLE_DRIVE_FOLDER_ID);
        
        const buffer = await fileObject.arrayBuffer();
        const stream = Readable.from(Buffer.from(buffer));

        const response = await drive.files.create({
            requestBody: {
                name: fileObject.name,
                mimeType: fileObject.type,
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
            },
            media: {
                mimeType: fileObject.type,
                body: stream
            },
            fields: 'id,webViewLink,webContentLink'
        });

        console.log('File created in Drive with ID:', response.data.id);

        // Make the file publicly accessible
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        console.log('Public permission applied to file');

        // Return a direct URL that works for image display
        // This format is more reliable for displaying images in browsers
        return `https://drive.google.com/thumbnail?id=${response.data.id}&sz=w1000`;
    } catch (error) {
        console.error('Google Drive upload error:', error);
        throw error;
    }
};

// Function to save file locally as fallback
export const saveFileLocally = async (fileObject) => {
    try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const fileExtension = path.extname(fileObject.name);
        const uniqueFilename = `${uuidv4()}${fileExtension}`;
        const filePath = path.join(uploadsDir, uniqueFilename);

        // Write file to disk
        const buffer = await fileObject.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));

        console.log('File saved locally at:', filePath);

        // Return URL path that can be used in browser
        return `/uploads/${uniqueFilename}`;
    } catch (error) {
        console.error('Local file save error:', error);
        throw error;
    }
};

// Main upload function with fallback
export const uploadImage = async (fileObject) => {
    try {
        // First try Google Drive
        console.log('Attempting to upload to Google Drive first...');
        const driveUrl = await uploadToGoogleDrive(fileObject);
        console.log('Successfully uploaded to Google Drive:', driveUrl);
        return driveUrl;
    } catch (googleDriveError) {
        console.warn('Google Drive upload failed, falling back to local storage:', googleDriveError.message);
        
        // Fallback to local storage
        return await saveFileLocally(fileObject);
    }
};

// Function to delete a file
export const deleteImage = async (fileUrl) => {
    try {
        // Check if it's a Google Drive URL or local file
        if (fileUrl && fileUrl.includes('drive.google.com')) {
            // Extract file ID from URL
            let fileId;
            
            if (fileUrl.includes('thumbnail?id=')) {
                // Handle our thumbnail URL format
                fileId = new URL(fileUrl).searchParams.get('id');
            } else if (fileUrl.includes('export=view&id=')) {
                // Handle our other URL format
                fileId = new URL(fileUrl).searchParams.get('id');
            } else {
                // Handle standard Drive URLs
                const matches = fileUrl.match(/[-\w]{25,}/);
                fileId = matches ? matches[0] : null;
            }
            
            if (!fileId) throw new Error('Invalid Google Drive URL');

            console.log('Deleting file from Google Drive with ID:', fileId);
            await authorizeJwtClient();
            const drive = getDrive();
            await drive.files.delete({ fileId });
        } else if (fileUrl && !fileUrl.startsWith('http')) {
            // It's a local file
            const filePath = path.join(process.cwd(), 'public', fileUrl);
            console.log('Deleting local file:', filePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        return true;
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
};