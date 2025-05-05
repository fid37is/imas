// src/app/utils/clientDriveService.js

// Upload image or file to Google Drive via API route
export const uploadImageToDrive = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/drive/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to upload file');
        }

        const data = await response.json();
        return data.fileUrl;
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        throw error;
    }
};

// Delete a file from Google Drive via API route
export const deleteFileFromDrive = async (fileUrl) => {
    try {
        const response = await fetch('/api/drive/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileUrl }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete file');
        }

        return true;
    } catch (error) {
        console.error('Error deleting file from Google Drive:', error);
        throw error;
    }
};