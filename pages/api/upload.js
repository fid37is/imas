// pages/api/upload.js

import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { uploadFileToDrive } from '../../src/app/utils/googleDriveService';

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const form = formidable({
        keepExtensions: true,
        multiples: false, // Ensure single file
    });

    return new Promise((resolve) => {
        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('❌ Form parsing error:', err);
                res.status(500).json({ message: 'Error parsing form data' });
                return resolve();
            }

            const file = files.file;
            if (!file) {
                res.status(400).json({ message: 'No file uploaded' });
                return resolve();
            }

            // Different versions of formidable (v3+) have slightly different structures
            const filePath = file.filepath || file.path; // fallback support
            const originalFilename = file.originalFilename || file.name || 'file.jpg';
            const mimeType = file.mimetype || 'image/jpeg';
            const itemName = fields.itemName || '';

            const fileName = itemName
                ? `${itemName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}${path.extname(originalFilename)}`
                : originalFilename;

            try {
                const fileBuffer = fs.readFileSync(filePath);

                const imageUrl = await uploadFileToDrive(fileBuffer, fileName, mimeType);
                console.log('✅ File uploaded successfully:', imageUrl);

                res.status(200).json({ imageUrl });

                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.warn('⚠️ Failed to clean up temp file:', unlinkErr);
                });

                return resolve();
            } catch (error) {
                console.error('❌ Upload error:', error);
                res.status(500).json({ message: error.message || 'Failed to upload file' });
                return resolve();
            }
        });
    });
}
