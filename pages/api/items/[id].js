// pages/api/items/[id].js
import { getInventoryItems, updateInventoryItem, deleteInventoryItem } from '../../../src/app/utils/googleDriveService';
import { deleteFileFromDrive } from '../../../src/app/utils/googleDriveService';

export default async function handler(req, res) {
    // Set CORS headers if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Get item ID from request query
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Item ID is required' });
        }

        // GET - Fetch a specific item
        if (req.method === 'GET') {
            const allItems = await getInventoryItems();
            const item = allItems.find(item => item.id === id);

            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }

            return res.status(200).json(item);
        }

        // PUT - Update an existing item
        if (req.method === 'PUT') {
            const updatedItem = req.body;

            // Basic validation
            if (!updatedItem.name || !updatedItem.sku) {
                return res.status(400).json({ message: 'Name and SKU are required fields' });
            }

            // Ensure ID in body matches URL param
            if (updatedItem.id !== id) {
                return res.status(400).json({ message: 'Item ID mismatch' });
            }

            // Update the item
            await updateInventoryItem(updatedItem);
            return res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
        }

        // DELETE - Remove an item
        if (req.method === 'DELETE') {
            // Get current item to extract image URL before deletion
            const allItems = await getInventoryItems();
            const item = allItems.find(item => item.id === id);

            if (!item) {
                return res.status(404).json({ message: 'Item not found' });
            }

            // Delete the item from Google Sheets
            await deleteInventoryItem(id);

            // If item has an image, delete it from Google Drive
            if (item.imageUrl) {
                try {
                    // Extract file ID from Drive URL if needed
                    const fileId = extractFileIdFromUrl(item.imageUrl);
                    if (fileId) {
                        await deleteFileFromDrive(fileId);
                    }
                } catch (driveError) {
                    console.error('Failed to delete image from Drive:', driveError);
                    // Continue with response even if image deletion fails
                }
            }

            return res.status(200).json({ message: 'Item deleted successfully' });
        }

        // Method not allowed
        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
}

/**
 * Extract Google Drive file ID from URL
 * @param {String} url - Google Drive URL
 * @returns {String|null} - File ID or null if not found
 */
function extractFileIdFromUrl(url) {
    if (!url) return null;
    
    try {
        // Handle different Google Drive URL formats
        if (url.includes('drive.google.com')) {
            // Format: https://drive.google.com/file/d/FILE_ID/view
            // or: https://drive.google.com/open?id=FILE_ID
            const idMatch = url.match(/\/d\/([^\/]+)\/|id=([^&]+)/);
            return idMatch ? (idMatch[1] || idMatch[2]) : null;
        } else if (url.includes('googleusercontent.com')) {
            // Format: https://lh3.googleusercontent.com/...
            // For these URLs, we might need the original file ID stored elsewhere
            return null;
        } else {
            // Assume the URL itself might be the ID
            return url;
        }
    } catch (error) {
        console.error('Error extracting file ID:', error);
        return null;
    }
}