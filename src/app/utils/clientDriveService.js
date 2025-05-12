// src/app/utils/clientDriveService.js

// Upload image or file to Google Drive via API route
export const uploadImageToDrive = async (file) => {
    try {
        // Show upload in progress or some loading state
        console.log('Starting file upload:', file.name);
        
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
        console.log('File uploaded successfully:', data.fileUrl);
        return data.fileUrl;
    } catch (error) {
        console.error('Error uploading to Google Drive:', error);
        
        // We'll let the caller handle the error, as the server already attempted
        // the fallback mechanism to local storage
        throw error;
    }
};

// Delete a file from Google Drive via API route
export const deleteFileFromDrive = async (fileUrl) => {
    try {
        // Don't try to delete empty URLs
        if (!fileUrl) return true;
        
        console.log('Deleting file:', fileUrl);
        
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

        console.log('File deleted successfully');
        return true;
    } catch (error) {
        console.error('Error deleting file from Google Drive:', error);
        throw error;
    }
};