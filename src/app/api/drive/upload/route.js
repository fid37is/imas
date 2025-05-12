import { NextResponse } from 'next/server';
import { uploadImage } from '../../../../lib/googleDriveService';

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

        console.log('Received file for upload:', file.name);

        // Prepare file for upload
        const fileObject = {
            name: file.name,
            type: file.type,
            stream: () => file.stream(),
            arrayBuffer: async () => await file.arrayBuffer()
        };

        // Upload with fallback to local storage if Google Drive fails
        const fileUrl = await uploadImage(fileObject);

        return NextResponse.json({
            success: true,
            fileUrl: fileUrl,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('Error in upload API route:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to upload file'
            },
            { status: 500 }
        );
    }
}