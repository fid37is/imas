// pages/api/upload.js
import formidable from 'formidable';
import fs from 'fs';
import { uploadImageToDrive } from '../../utils/googleDriveService';

// Disable the default body parser to handle form data
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    try {
        if (req.method !== 'POST') {
            res.setHeader('Allow', ['POST']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }

        // Parse the form data
        const form = new formidable.IncomingForm();
        form.keepExtensions = true;

        return new Promise((resolve) => {
            form.parse(req, async (err, fields, files) => {
                if (err) {
                    console.error('Form parsing error:', err);
                    res.status(500).json({ error: true, message: 'File upload failed' });
                    return resolve();
                }

                try {
                    // Get the file from the request
                    const file = files.file;

                    if (!file) {
                        res.status(400).json({ error: true, message: 'No file uploaded' });
                        return resolve();
                    }

                    // Create a readable stream from the file
                    const fileStream = fs.createReadStream(file.filepath);

                    // Prepare file object for Google Drive upload
                    const fileObject = {
                        name: file.originalFilename,
                        type: file.mimetype,
                        size: file.size,
                        stream: fileStream
                    };

                    // Upload to Google Drive
                    const imageUrl = await uploadImageToDrive(fileObject);

                    // Clean up the temporary file
                    fs.unlinkSync(file.filepath);

                    // Return the URL to the client
                    res.status(200).json({
                        success: true,
                        imageUrl: imageUrl
                    });

                    return resolve();
                } catch (error) {
                    console.error('Upload error:', error);
                    res.status(500).json({
                        error: true,
                        message: error.message || 'File upload failed'
                    });
                    return resolve();
                }
            });
        });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({
            error: true,
            message: error.message || 'An unexpected error occurred'
        });
    }
}