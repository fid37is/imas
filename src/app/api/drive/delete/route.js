// src/app/api/drive/delete/route.js
import { NextResponse } from 'next/server';
import { deleteFileFromDrive } from '../../../../lib/googleDriveService';

export async function DELETE(request) {
    try {
        const { fileUrl } = await request.json();

        if (!fileUrl) {
            return NextResponse.json(
                { error: 'No file URL provided' },
                { status: 400 }
            );
        }

        await deleteFileFromDrive(fileUrl);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in delete API route:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete file' },
            { status: 500 }
        );
    }
}