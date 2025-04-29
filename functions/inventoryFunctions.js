const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * Add a new inventory item
 */
exports.addInventoryItem = functions.https.onCall(async (data, context) => {
    try {
        // Log incoming data for debugging
        console.log('Adding inventory item:', data);

        // Check if user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }

        // Add created timestamp
        const itemData = {
            ...data,
            createdBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add to Firestore
        const docRef = await db.collection('inventory').add(itemData);

        // Return the item with ID
        return {
            id: docRef.id,
            ...itemData
        };
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
        console.log('Updating inventory item:', data);

        // Check if user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }

        // Check if item ID exists
        if (!data.id) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Item ID is required'
            );
        }

        // Extract ID and prepare update data
        const { id, ...updateData } = data;

        // Add updated timestamp
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.updatedBy = context.auth.uid;

        // Update in Firestore
        await db.collection('inventory').doc(id).update(updateData);

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
        console.log('Deleting inventory item:', data);

        // Check if user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }

        // Check if item ID exists
        if (!data.id) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Item ID is required'
            );
        }

        // Delete from Firestore
        await db.collection('inventory').doc(data.id).delete();

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
        console.log('Getting inventory');

        // Check if user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }

        // Get all items from Firestore
        const snapshot = await db.collection('inventory').get();

        // Convert to array
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
        console.log('Recording sale:', data);

        // Check if user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'The function must be called by an authenticated user'
            );
        }

        // Add timestamps and user ID
        const saleData = {
            ...data,
            createdBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add to Firestore
        const docRef = await db.collection('sales').add(saleData);

        // Return the sale with ID
        return {
            id: docRef.id,
            ...saleData
        };
    } catch (error) {
        console.error('Error recording sale:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});