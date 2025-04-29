// index.js - Cloud Functions file

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');
const { OAuth2 } = google.auth;
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Google Auth configurations (should be stored in environment variables in production)
const GOOGLE_CLIENT_ID = functions.config().google.client_id;
const GOOGLE_CLIENT_SECRET = functions.config().google.client_secret;
const GOOGLE_REFRESH_TOKEN = functions.config().google.refresh_token;
const DRIVE_FOLDER_ID = functions.config().google.drive_folder_id;
const SHEET_ID = functions.config().google.sheet_id;

// Constants
const INVENTORY_HEADER_RANGE = 'Inventory!A1:N1';
const INVENTORY_DATA_RANGE = 'Inventory!A2:N';
const SALES_HEADER_RANGE = 'Sales!A1:J1';
const SALES_DATA_RANGE = 'Sales!A2:J';

// Google OAuth2 client setup
const oAuth2Client = new OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET
);
oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

/**
 * Schedule automatic inventory and sales data backup to Google Sheets
 * Runs every day at midnight
 */
exports.scheduledBackupToSheets = functions.pubsub.schedule('0 0 * * *')
    .timeZone('America/New_York')
    .onRun(async (context) => {
        try {
            // Setup Google Sheets
            await setupGoogleSheets();

            // Sync inventory
            const inventorySnapshot = await db.collection('inventory').get();
            const inventoryRows = [];

            inventorySnapshot.forEach(doc => {
                const item = doc.data();

                // Format timestamps if they exist
                let createdAtStr = '';
                let updatedAtStr = '';

                if (item.createdAt && item.createdAt.toDate) {
                    createdAtStr = item.createdAt.toDate().toISOString();
                } else if (item.createdAt) {
                    createdAtStr = new Date(item.createdAt).toISOString();
                }

                if (item.updatedAt && item.updatedAt.toDate) {
                    updatedAtStr = item.updatedAt.toDate().toISOString();
                } else if (item.updatedAt) {
                    updatedAtStr = new Date(item.updatedAt).toISOString();
                }

                // Prepare row data
                inventoryRows.push([
                    doc.id,
                    item.sku || '',
                    item.name || '',
                    item.category || '',
                    item.description || '',
                    parseFloat(item.price) || 0,
                    parseInt(item.quantity) || 0,
                    item.supplier || '',
                    item.lowStockThreshold || 0,
                    createdAtStr,
                    updatedAtStr,
                    item.createdBy || '',
                    item.updatedBy || '',
                    item.imageUrl || ''
                ]);
            });

            // Create backup sheet with today's date
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
            const backupSheetName = `Inventory_${dateStr}`;

            const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

            // Add a new sheet for today's backup
            try {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: SHEET_ID,
                    resource: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: backupSheetName
                                    }
                                }
                            }
                        ]
                    }
                });
            } catch (error) {
                console.log(`Sheet ${backupSheetName} might already exist, continuing...`);
            }

            // Add headers
            const inventoryHeaders = [
                ['ID', 'SKU', 'Name', 'Category', 'Description', 'Price', 'Quantity',
                    'Supplier', 'Low Stock Threshold', 'Created At', 'Updated At',
                    'Created By', 'Updated By', 'Image URL']
            ];

            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `${backupSheetName}!A1:N1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: inventoryHeaders
                }
            });

            // Add data
            if (inventoryRows.length > 0) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SHEET_ID,
                    range: `${backupSheetName}!A2:N`,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: inventoryRows
                    }
                });
            }

            console.log(`Scheduled backup completed: ${inventoryRows.length} items backed up to ${backupSheetName}`);
            return null;
        } catch (error) {
            console.error('Error in scheduled backup:', error);
            return null;
        }
    });

/**
 * Add a new inventory item
 */
exports.addInventoryItem = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Validate required fields
        if (!data.name || !data.category || !data.price) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Name, category, and price are required.'
            );
        }

        // If SKU is not provided, generate one
        if (!data.sku) {
            const categoryCode = data.category.substring(0, 3).toUpperCase();
            const nameCode = data.name.replace(/\s/g, '').substring(0, 4).toUpperCase();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            data.sku = `${categoryCode}-${nameCode}-${randomNum}`;
        }

        // Add created timestamp and user info
        const itemData = {
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add to Firestore
        const itemRef = await db.collection('inventory').add(itemData);

        // Get the item with ID
        const newItem = {
            id: itemRef.id,
            ...itemData
        };

        // Add item to Google Sheets
        await addItemToSheet(newItem);

        // If there's an image, process it
        if (data.imageBase64) {
            const imageResult = await uploadImageToDriveInternal(data.imageBase64, `${data.sku || newItem.id}_image.jpg`);

            // Update the item with image URL
            await itemRef.update({
                imageUrl: imageResult.imageUrl,
                imageId: imageResult.fileId
            });

            // Update our return object
            newItem.imageUrl = imageResult.imageUrl;
            newItem.imageId = imageResult.fileId;
        }

        // Return the created item with its ID
        return newItem;
    } catch (error) {
        console.error('Error adding inventory item:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Update an existing inventory item
 */
exports.updateInventoryItem = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Validate ID
        if (!data.id) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Item ID is required for updates.'
            );
        }

        // Update timestamp
        const updateData = {
            ...data,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: context.auth.uid
        };

        // Remove ID from the data to be updated
        const { id, imageBase64, ...itemData } = updateData;

        // Update in Firestore
        await db.collection('inventory').doc(id).update(itemData);

        // If there's a new image, process it
        if (imageBase64) {
            const itemDoc = await db.collection('inventory').doc(id).get();
            const item = itemDoc.data();
            const imageResult = await uploadImageToDriveInternal(
                imageBase64,
                `${item.sku || id}_image.jpg`
            );

            // Update the item with new image URL
            await db.collection('inventory').doc(id).update({
                imageUrl: imageResult.imageUrl,
                imageId: imageResult.fileId
            });
        }

        // Update the item in Google Sheets
        await updateItemInSheet(id);

        return { success: true };
    } catch (error) {
        console.error('Error updating inventory item:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Delete an inventory item
 */
exports.deleteInventoryItem = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Validate ID
        if (!data.id) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Item ID is required for deletion.'
            );
        }

        // Get the item first (to find related image if any)
        const itemDoc = await db.collection('inventory').doc(data.id).get();
        if (itemDoc.exists) {
            const itemData = itemDoc.data();

            // Delete image from Drive if exists
            if (itemData.imageId) {
                try {
                    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
                    await drive.files.delete({
                        fileId: itemData.imageId
                    });
                } catch (imageError) {
                    console.warn('Error deleting image from Drive:', imageError);
                    // Continue with deletion even if image deletion fails
                }
            }
        }

        // Delete from Firestore
        await db.collection('inventory').doc(data.id).delete();

        // Delete from Google Sheets
        await deleteItemFromSheet(data.id);

        return { success: true };
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get all inventory items
 */
exports.getInventory = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Query Firestore
        const snapshot = await db.collection('inventory').get();

        // Convert to array of items with IDs
        const items = [];
        snapshot.forEach(doc => {
            items.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return items;
    } catch (error) {
        console.error('Error getting inventory:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Record a sale
 */
exports.recordSale = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Validate required fields
        if (!data.itemId || !data.quantity || !data.price) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'ItemId, quantity, and price are required.'
            );
        }

        // Add created timestamp and user info
        const saleData = {
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid
        };

        // Add to Firestore
        const saleRef = await db.collection('sales').add(saleData);

        // Update inventory quantity
        const itemRef = db.collection('inventory').doc(data.itemId);
        const itemDoc = await itemRef.get();

        if (itemDoc.exists) {
            const itemData = itemDoc.data();
            const newQuantity = Math.max(0, itemData.quantity - data.quantity);

            await itemRef.update({
                quantity: newQuantity,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: context.auth.uid
            });

            // Update item in sheets after quantity change
            await updateItemInSheet(data.itemId);
        }

        // Add sale to Sales sheet
        await addSaleToSheet({
            id: saleRef.id,
            ...saleData
        });

        // Return the sale record with its ID
        return {
            id: saleRef.id,
            ...saleData
        };
    } catch (error) {
        console.error('Error recording sale:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get all sales records
 */
exports.getSales = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Query options (date range, limit, etc.)
        const { startDate, endDate, limit } = data || {};

        let query = db.collection('sales');

        // Apply date filters if provided
        if (startDate) {
            query = query.where('date', '>=', startDate);
        }
        if (endDate) {
            query = query.where('date', '<=', endDate);
        }

        // Order by date
        query = query.orderBy('date', 'desc');

        // Apply limit if provided
        if (limit) {
            query = query.limit(limit);
        }

        // Execute query
        const snapshot = await query.get();

        // Convert to array of sales with IDs
        const sales = [];
        snapshot.forEach(doc => {
            sales.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return sales;
    } catch (error) {
        console.error('Error getting sales:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Upload image to Google Drive
 */
exports.uploadImageToDrive = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Validate required fields
        if (!data.base64Data || !data.filename) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Base64 data and filename are required.'
            );
        }

        return await uploadImageToDriveInternal(data.base64Data, data.filename, data.contentType);
    } catch (error) {
        console.error('Error uploading image to Drive:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Generate a thumbnail from an image and upload both to Drive
 */
exports.generateThumbnail = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Validate required fields
        if (!data.base64Data || !data.filename) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Base64 data and filename are required.'
            );
        }

        // Upload original image first
        const originalResult = await uploadImageToDriveInternal(
            data.base64Data,
            data.filename,
            data.contentType
        );

        // Create thumbnail (using Sharp library)
        const buffer = Buffer.from(data.base64Data, 'base64');
        const sharp = require('sharp');

        // Generate thumbnail (resize to 200px width)
        const thumbnailBuffer = await sharp(buffer)
            .resize(200, null, { withoutEnlargement: true })
            .toBuffer();

        // Get filename parts
        const filenameParts = data.filename.split('.');
        const extension = filenameParts.pop();
        const filenameBase = filenameParts.join('.');
        const thumbnailFilename = `${filenameBase}_thumb.${extension}`;

        // Upload thumbnail to Drive
        const thumbnailResult = await uploadImageToDriveInternal(
            thumbnailBuffer.toString('base64'),
            thumbnailFilename,
            data.contentType
        );

        return {
            original: originalResult,
            thumbnail: thumbnailResult
        };
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Internal function to upload image to Google Drive
 */
async function uploadImageToDriveInternal(base64Data, filename, contentType = 'image/jpeg') {
    // Create Drive instance
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    // Prepare the file
    const buffer = Buffer.from(base64Data, 'base64');

    // Create temporary file
    const tempFilePath = path.join(os.tmpdir(), filename);
    fs.writeFileSync(tempFilePath, buffer);

    // Upload to Drive
    const driveResponse = await drive.files.create({
        requestBody: {
            name: `${Date.now()}-${filename}`,
            mimeType: contentType,
            parents: [DRIVE_FOLDER_ID]
        },
        media: {
            mimeType: contentType,
            body: fs.createReadStream(tempFilePath)
        }
    });

    // Set file permissions (public read)
    await drive.permissions.create({
        fileId: driveResponse.data.id,
        requestBody: {
            role: 'reader',
            type: 'anyone'
        }
    });

    // Get webContentLink
    const fileData = await drive.files.get({
        fileId: driveResponse.data.id,
        fields: 'webContentLink,webViewLink'
    });

    // Clean up temp files
    fs.unlinkSync(tempFilePath);

    return {
        imageUrl: fileData.data.webContentLink,
        viewUrl: fileData.data.webViewLink,
        fileId: driveResponse.data.id
    };
}

/**
 * Sync all sales to Google Sheets
 */
exports.syncSalesToSheets = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Create or verify sheets exist
        await setupGoogleSheets();

        // Get all sales
        const snapshot = await db.collection('sales').get();

        // Clear existing sheet data (keeping header row)
        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: SALES_DATA_RANGE,
        });

        // Batch prepare rows
        const rows = [];
        const itemCache = {}; // Cache for item lookups to avoid repeated database calls

        for (const doc of snapshot.docs) {
            const sale = doc.data();

            // Get item details (using cache if available)
            let itemName = 'Unknown Item';
            let itemSku = '';

            if (!itemCache[sale.itemId]) {
                const itemDoc = await db.collection('inventory').doc(sale.itemId).get();
                if (itemDoc.exists) {
                    itemCache[sale.itemId] = {
                        name: itemDoc.data().name || '',
                        sku: itemDoc.data().sku || ''
                    };
                }
            }

            if (itemCache[sale.itemId]) {
                itemName = itemCache[sale.itemId].name;
                itemSku = itemCache[sale.itemId].sku;
            }

            // Format timestamps if they exist
            let createdAtStr = '';

            if (sale.createdAt && sale.createdAt.toDate) {
                createdAtStr = sale.createdAt.toDate().toISOString();
            } else if (sale.createdAt) {
                createdAtStr = new Date(sale.createdAt).toISOString();
            }

            // Calculate total
            const total = parseFloat(sale.price) * parseInt(sale.quantity);

            // Prepare row data
            rows.push([
                doc.id,
                sale.itemId,
                itemName,
                itemSku,
                parseInt(sale.quantity) || 0,
                parseFloat(sale.price) || 0,
                total,
                sale.customer || '',
                createdAtStr,
                sale.createdBy || ''
            ]);
        }

        // Write all rows at once
        if (rows.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: SALES_DATA_RANGE,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: rows
                }
            });
        }

        return {
            success: true,
            salesCount: rows.length
        };
    } catch (error) {
        console.error('Error syncing sales to sheets:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get dashboard metrics
 */
exports.getDashboardMetrics = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Get total inventory count
        const inventorySnapshot = await db.collection('inventory').get();
        const totalItems = inventorySnapshot.size;

        // Calculate total inventory value
        let totalValue = 0;
        let lowStockCount = 0;
        let categoryCounts = {};

        inventorySnapshot.forEach(doc => {
            const item = doc.data();
            totalValue += (item.price || 0) * (item.quantity || 0);

            // Check for low stock
            if (item.quantity <= item.lowStockThreshold) {
                lowStockCount++;
            }

            // Count by category
            if (item.category) {
                categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
            }
        });

        // Get recent sales data
        const salesSnapshot = await db.collection('sales')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const recentSales = [];
        salesSnapshot.forEach(doc => {
            recentSales.push({
                id: doc.id,
                ...doc.data()
            });
        });

        return {
            totalItems,
            totalValue,
            lowStockCount,
            categoryCounts,
            recentSales
        };
    } catch (error) {
        console.error('Error getting dashboard metrics:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Add inventory item to Google Sheet
 */
async function addItemToSheet(item) {
    try {
        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

        // Format timestamps if they exist
        let createdAtStr = '';
        let updatedAtStr = '';

        if (item.createdAt && item.createdAt.toDate) {
            createdAtStr = item.createdAt.toDate().toISOString();
        } else if (item.createdAt) {
            createdAtStr = new Date(item.createdAt).toISOString();
        }

        if (item.updatedAt && item.updatedAt.toDate) {
            updatedAtStr = item.updatedAt.toDate().toISOString();
        } else if (item.updatedAt) {
            updatedAtStr = new Date(item.updatedAt).toISOString();
        }

        // Prepare row data
        const rowData = [
            item.id,
            item.sku || '',
            item.name || '',
            item.category || '',
            item.description || '',
            parseFloat(item.price) || 0,
            parseInt(item.quantity) || 0,
            item.supplier || '',
            item.lowStockThreshold || 0,
            createdAtStr,
            updatedAtStr,
            item.createdBy || '',
            item.updatedBy || '',
            item.imageUrl || ''
        ];

        // Append to sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: INVENTORY_DATA_RANGE,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData]
            }
        });

        return true;
    } catch (error) {
        console.error('Error adding item to sheet:', error);
        // Don't throw, just log the error and continue
        return false;
    }
}

/**
 * Update inventory item in Google Sheet
 */
async function updateItemInSheet(itemId) {
    try {
        // Get the item from Firestore
        const itemDoc = await db.collection('inventory').doc(itemId).get();
        if (!itemDoc.exists) {
            console.warn(`Item ${itemId} not found for sheet update`);
            return false;
        }

        const item = {
            id: itemDoc.id,
            ...itemDoc.data()
        };

        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

        // Find the row with this item ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Inventory!A:A'
        });

        const rows = response.data.values || [];
        let rowIndex = -1;

        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === itemId) {
                rowIndex = i + 1; // 1-based index for Sheets API
                break;
            }
        }

        if (rowIndex === -1) {
            // Item not found in sheet, add it instead
            return await addItemToSheet(item);
        }

        // Format timestamps if they exist
        let createdAtStr = '';
        let updatedAtStr = '';

        if (item.createdAt && item.createdAt.toDate) {
            createdAtStr = item.createdAt.toDate().toISOString();
        } else if (item.createdAt) {
            createdAtStr = new Date(item.createdAt).toISOString();
        }

        if (item.updatedAt && item.updatedAt.toDate) {
            updatedAtStr = item.updatedAt.toDate().toISOString();
        } else if (item.updatedAt) {
            updatedAtStr = new Date(item.updatedAt).toISOString();
        }

        // Prepare row data
        const rowData = [
            item.id,
            item.sku || '',
            item.name || '',
            item.category || '',
            item.description || '',
            parseFloat(item.price) || 0,
            parseInt(item.quantity) || 0,
            item.supplier || '',
            item.lowStockThreshold || 0,
            createdAtStr,
            updatedAtStr,
            item.createdBy || '',
            item.updatedBy || '',
            item.imageUrl || ''
        ];

        // Update the row
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: `Inventory!A${rowIndex}:N${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData]
            }
        });

        return true;
    } catch (error) {
        console.error('Error updating item in sheet:', error);
        // Don't throw, just log the error and continue
        return false;
    }
}

/**
 * Delete inventory item from Google Sheet
 */
async function deleteItemFromSheet(itemId) {
    try {
        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

        // Find the row with this item ID
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Inventory!A:A'
        });

        const rows = response.data.values || [];
        let rowIndex = -1;

        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === itemId) {
                rowIndex = i + 1; // 1-based index for Sheets API
                break;
            }
        }

        if (rowIndex === -1) {
            // Item not found in sheet
            return false;
        }

        // Get spreadsheet info to find the sheet ID
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SHEET_ID
        });

        const inventorySheet = spreadsheet.data.sheets.find(sheet =>
            sheet.properties.title === 'Inventory'
        );

        if (!inventorySheet) {
            console.warn('Inventory sheet not found');
            return false;
        }

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SHEET_ID,
            resource: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: inventorySheet.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: rowIndex - 1, // 0-based index for batchUpdate
                                endIndex: rowIndex // exclusive end
                            }
                        }
                    }
                ]
            }
        });

        return true;
    } catch (error) {
        console.error('Error deleting item from sheet:', error);
        // Don't throw, just log the error and continue
        return false;
    }
}

/**
 * Add sale record to Sales sheet
 */
async function addSaleToSheet(sale) {
    try {
        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

        // Get item details
        const itemDoc = await db.collection('inventory').doc(sale.itemId).get();
        const itemName = itemDoc.exists ? itemDoc.data().name || '' : 'Unknown Item';
        const itemSku = itemDoc.exists ? itemDoc.data().sku || '' : '';

        // Format timestamps if they exist
        let createdAtStr = '';

        if (sale.createdAt && sale.createdAt.toDate) {
            createdAtStr = sale.createdAt.toDate().toISOString();
        } else if (sale.createdAt) {
            createdAtStr = new Date(sale.createdAt).toISOString();
        }

        // Calculate total
        const total = parseFloat(sale.price) * parseInt(sale.quantity);

        // Prepare row data
        const rowData = [
            sale.id,
            sale.itemId,
            itemName,
            itemSku,
            parseInt(sale.quantity) || 0,
            parseFloat(sale.price) || 0,
            total,
            sale.customer || '',
            createdAtStr,
            sale.createdBy || ''
        ];

        // Append to sheet
        await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: SALES_DATA_RANGE,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData]
            }
        });

        return true;
    } catch (error) {
        console.error('Error adding sale to sheet:', error);
        // Don't throw, just log the error and continue
        return false;
    }
}

/**
 * Export inventory items as a CSV file in Google Drive
 */
exports.exportInventoryToCSV = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Get all inventory items
        const snapshot = await db.collection('inventory').get();

        // Create CSV content
        let csvContent = 'ID,SKU,Name,Category,Description,Price,Quantity,Supplier,Low Stock Threshold,Created At,Updated At\n';

        snapshot.forEach(doc => {
            const item = doc.data();

            // Format timestamps if they exist
            let createdAtStr = '';
            let updatedAtStr = '';

            if (item.createdAt && item.createdAt.toDate) {
                createdAtStr = item.createdAt.toDate().toISOString();
            } else if (item.createdAt) {
                createdAtStr = new Date(item.createdAt).toISOString();
            }

            if (item.updatedAt && item.updatedAt.toDate) {
                updatedAtStr = item.updatedAt.toDate().toISOString();
            } else if (item.updatedAt) {
                updatedAtStr = new Date(item.updatedAt).toISOString();
            }

            // Sanitize values for CSV
            const sanitize = (value) => {
                if (value === null || value === undefined) return '';
                value = String(value).replace(/"/g, '""');
                return `"${value}"`;
            };

            // Add row to CSV
            csvContent += [
                sanitize(doc.id),
                sanitize(item.sku),
                sanitize(item.name),
                sanitize(item.category),
                sanitize(item.description),
                sanitize(item.price),
                sanitize(item.quantity),
                sanitize(item.supplier),
                sanitize(item.lowStockThreshold),
                sanitize(createdAtStr),
                sanitize(updatedAtStr)
            ].join(',') + '\n';
        });

        // Save CSV to Drive
        const filename = `inventory_export_${Date.now()}.csv`;
        const tempFilePath = path.join(os.tmpdir(), filename);
        fs.writeFileSync(tempFilePath, csvContent);

        // Create Drive instance
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });

        // Upload to Drive
        const driveResponse = await drive.files.create({
            requestBody: {
                name: filename,
                mimeType: 'text/csv',
                parents: [DRIVE_FOLDER_ID]
            },
            media: {
                mimeType: 'text/csv',
                body: fs.createReadStream(tempFilePath)
            }
        });

        // Set file permissions (private to owner)
        await drive.permissions.create({
            fileId: driveResponse.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Get file link
        const fileData = await drive.files.get({
            fileId: driveResponse.data.id,
            fields: 'webContentLink,webViewLink'
        });

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        return {
            success: true,
            downloadUrl: fileData.data.webContentLink,
            viewUrl: fileData.data.webViewLink,
            itemCount: snapshot.size
        };
    } catch (error) {
        console.error('Error exporting inventory to CSV:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Sync all inventory to Google Sheets
 */
exports.syncInventoryToSheets = functions.https.onCall(async (data, context) => {
    try {
        // Ensure user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called while authenticated.'
            );
        }

        // Create or verify sheets exist
        await setupGoogleSheets();

        // Get all inventory items
        const snapshot = await db.collection('inventory').get();

        // Clear existing sheet data (keeping header row)
        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
        await sheets.spreadsheets.values.clear({
            spreadsheetId: SHEET_ID,
            range: INVENTORY_DATA_RANGE,
        });

        // Batch prepare rows
        const rows = [];
        snapshot.forEach(doc => {
            const item = doc.data();

            // Format timestamps if they exist
            let createdAtStr = '';
            let updatedAtStr = '';

            if (item.createdAt && item.createdAt.toDate) {
                createdAtStr = item.createdAt.toDate().toISOString();
            } else if (item.createdAt) {
                createdAtStr = new Date(item.createdAt).toISOString();
            }

            if (item.updatedAt && item.updatedAt.toDate) {
                updatedAtStr = item.updatedAt.toDate().toISOString();
            } else if (item.updatedAt) {
                updatedAtStr = new Date(item.updatedAt).toISOString();
            }

            // Prepare row data
            rows.push([
                doc.id,
                item.sku || '',
                item.name || '',
                item.category || '',
                item.description || '',
                parseFloat(item.price) || 0,
                parseInt(item.quantity) || 0,
                item.supplier || '',
                item.lowStockThreshold || 0,
                createdAtStr,
                updatedAtStr,
                item.createdBy || '',
                item.updatedBy || '',
                item.imageUrl || ''
            ]);
        });

        // Write all rows at once
        if (rows.length > 0) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: INVENTORY_DATA_RANGE,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: rows
                }
            });
        }

        return {
            success: true,
            itemsCount: rows.length
        };
    } catch (error) {
        console.error('Error syncing inventory to sheets:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Setup Google Sheets for inventory management
 */
async function setupGoogleSheets() {
    try {
        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

        // Check if spreadsheet exists, create if not
        let spreadsheet;
        try {
            spreadsheet = await sheets.spreadsheets.get({
                spreadsheetId: SHEET_ID
            });
        } catch (error) {
            if (error.code === 404) {
                // Create new spreadsheet
                const createResponse = await sheets.spreadsheets.create({
                    resource: {
                        properties: {
                            title: 'Inventory Management System',
                        },
                        sheets: [
                            {
                                properties: {
                                    title: 'Inventory',
                                }
                            },
                            {
                                properties: {
                                    title: 'Sales',
                                }
                            }
                        ]
                    }
                });

                spreadsheet = createResponse;

                // Update config with new sheet ID if needed
                console.log(`Created new spreadsheet with ID: ${createResponse.data.spreadsheetId}`);
            } else {
                throw error;
            }
        }

        // Setup Inventory sheet headers
        const inventoryHeaders = [
            ['ID', 'SKU', 'Name', 'Category', 'Description', 'Price', 'Quantity',
                'Supplier', 'Low Stock Threshold', 'Created At', 'Updated At',
                'Created By', 'Updated By', 'Image URL']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: INVENTORY_HEADER_RANGE,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: inventoryHeaders
            }
        });

        // Format inventory headers
        const inventorySheet = spreadsheet.data.sheets.find(sheet =>
            sheet.properties.title === 'Inventory'
        );

        if (inventorySheet) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                resource: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: inventorySheet.properties.sheetId,
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                                        textFormat: {
                                            bold: true,
                                            foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }
                                        }
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat)'
                            }
                        }
                    ]
                }
            });
        }

        // Setup Sales sheet headers
        const salesHeaders = [
            ['ID', 'Item ID', 'Item Name', 'SKU', 'Quantity', 'Price',
                'Total', 'Customer', 'Date', 'Created By']
        ];

        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: SALES_HEADER_RANGE,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: salesHeaders
            }
        });

        // Format sales headers
        const salesSheet = spreadsheet.data.sheets.find(sheet =>
            sheet.properties.title === 'Sales'
        );

        if (salesSheet) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                resource: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: salesSheet.properties.sheetId,
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                                        textFormat: {
                                            bold: true,
                                            foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 }
                                        }
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat)'
                            }
                        }
                    ]
                }
            });
        }

        return true;
    } catch (error) {
        console.error('Error setting up Google Sheets:', error);
        return false;
    }
}