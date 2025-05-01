// app/api/upload/route.js
import { NextResponse } from 'next/server';
import { uploadFileToDrive, getInventoryFolder } from '../../../utils/googleDriveService';

// POST /api/upload - Upload a file to Google Drive
export async function POST(request) {
    try {
        const accessToken = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Get inventory folder
        const folderId = await getInventoryFolder(accessToken);

        // Upload file to Drive
        const fileData = await uploadFileToDrive(file, accessToken, folderId);

        return NextResponse.json(fileData);
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}