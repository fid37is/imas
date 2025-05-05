// src/app/api/drive/upload/route.js
import { NextResponse } from 'next/server';
import { uploadImageToDrive } from '../../../../lib/googleDriveService';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Convert file to stream for Google Drive upload
        const fileStream = file.stream();
        const fileObject = {
            name: file.name,
            type: file.type,
            stream: fileStream
        };

        const fileUrl = await uploadImageToDrive(fileObject);

        return NextResponse.json({ fileUrl });
    } catch (error) {
        console.error('Error in upload API route:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload file' },
            { status: 500 }
        );
    }
}