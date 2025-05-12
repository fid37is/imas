// lib/googleDriveService.js
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

// Configure Google Drive API
const configureGoogleDrive = () => {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS),
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        return google.drive({ version: 'v3', auth });
    } catch (error) {
        console.error('Error configuring Google Drive:', error);
        return null;
    }
};

// Function to upload image to Google Drive
export const uploadToGoogleDrive = async (fileObject) => {
    try {
        const drive = configureGoogleDrive();

        if (!drive) {
            throw new Error('Google Drive configuration failed');
        }

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
            }
        });

        // Make the file publicly accessible
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Get the file's web view link
        const fileData = await drive.files.get({
            fileId: response.data.id,
            fields: 'webViewLink,webContentLink'
        });

        return fileData.data.webContentLink || fileData.data.webViewLink;
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
        return await uploadToGoogleDrive(fileObject);
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
        if (fileUrl.includes('drive.google.com')) {
            // Extract file ID from URL
            const fileId = new URL(fileUrl).searchParams.get('id');
            if (!fileId) throw new Error('Invalid Google Drive URL');

            const drive = configureGoogleDrive();
            await drive.files.delete({ fileId });
        } else {
            // It's a local file
            const filePath = path.join(process.cwd(), 'public', fileUrl);
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