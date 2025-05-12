import { NextResponse } from 'next/server';
import { deleteImage } from '../../../../lib/googleDriveService';

export async function DELETE(request) {
    try {
        const { fileUrl } = await request.json();

        if (!fileUrl) {
            return NextResponse.json(
                { error: 'No file URL provided' },
                { status: 400 }
            );
        }

        await deleteImage(fileUrl);

        return NextResponse.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Error in delete API route:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to delete file'
            },
            { status: 500 }
        );
    }
}