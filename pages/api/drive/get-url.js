// pages/api/drive/get-url.js
import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get user session to verify authentication
        const session = await getServerSession(req, res, authOptions);
        if (!session) {
            return res.status(401).json({ error: 'You must be signed in' });
        }

        const { fileId } = req.query;

        if (!fileId) {
            return res.status(400).json({ error: 'File ID is required' });
        }

        // Set up Google Drive client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Use the access token from session
        oauth2Client.setCredentials({
            access_token: session.accessToken,
            refresh_token: session.refreshToken,
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Get file metadata
        const file = await drive.files.get({
            fileId,
            fields: 'id,name,webContentLink,webViewLink,thumbnailLink',
        });

        // For images, you might want to create a direct view/download URL
        let directUrl = null;
        if (file.data.webContentLink) {
            directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        }

        return res.status(200).json({
            id: file.data.id,
            name: file.data.name,
            webContentLink: file.data.webContentLink,
            webViewLink: file.data.webViewLink,
            thumbnailLink: file.data.thumbnailLink,
            directUrl,
        });

    } catch (error) {
        console.error('Error getting Google Drive file URL:', error);
        return res.status(500).json({ error: 'Failed to get file URL' });
    }
}