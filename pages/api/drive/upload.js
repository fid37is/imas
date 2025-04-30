// pages/api/drive/upload.js
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get user session to verify authentication
        const session = await getServerSession(req, res, authOptions);
        if (!session) {
            return res.status(401).json({ error: 'You must be signed in' });
        }

        // Parse form data with uploaded file
        const form = new formidable.IncomingForm();
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        // Get file info
        const file = files.file;
        const folderID = fields.folderID || null;

        // Set up Google Drive client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Use the access token from session (depends on your auth setup)
        oauth2Client.setCredentials({
            access_token: session.accessToken,
            // Include refresh_token if available
            refresh_token: session.refreshToken,
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Upload file to Google Drive
        const response = await drive.files.create({
            requestBody: {
                name: file.originalFilename,
                mimeType: file.mimetype,
                parents: folderID ? [folderID] : [],
            },
            media: {
                mimeType: file.mimetype,
                body: fs.createReadStream(file.filepath),
            },
            fields: 'id,name,webViewLink',
        });

        return res.status(200).json({
            success: true,
            fileId: response.data.id,
            name: response.data.name,
            webViewLink: response.data.webViewLink,
        });

    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        return res.status(500).json({ error: 'Failed to upload file' });
    }
}