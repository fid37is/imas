// src/app/utils/inventoryService.js
import { uploadImageToDrive, deleteFileFromDrive } from './clientDriveService';
import { addRowToSheet, getRowsFromSheet, updateRowInSheet, deleteRowFromSheet } from './clientSheetsService';
import { generateItemId } from './idGenerator';

// Sheet configuration
const INVENTORY_SHEET_RANGE = 'Inventory!A:Z';
const SALES_SHEET_RANGE = 'Sales!A:Z';

// Helper function to safely parse numbers
const safeParseInt = (value, defaultValue = null) => {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
};

const safeParseFloat = (value, defaultValue = 0) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
};

// Add inventory item
export const addInventoryItem = async (item) => {
    try {
        // Upload image if provided
        let imageUrl = null;
        if (item.image) {
            imageUrl = await uploadImageToDrive(item.image);
        }

        // Get all existing IDs to ensure uniqueness
        const existingItems = await getInventory();
        const existingIds = existingItems.map(item => item.id);

        // Generate a store-specific ID if one doesn't exist
        const id = item.id || generateItemId(existingIds);

        // Create inventory item with image URL and ID
        const inventoryItem = {
            ...item,
            id,
            imageUrl,
            createdAt: item.createdAt || new Date().toISOString()
        };

        // Add item to Google Sheet
        const rowValues = [
            inventoryItem.id || '',             // Add ID field as first column
            inventoryItem.name || '',
            inventoryItem.category || '',
            (inventoryItem.quantity || 0).toString(),
            (inventoryItem.price || 0).toString(),
            (inventoryItem.costPrice || 0).toString(),
            inventoryItem.sku || '',
            // Store empty string if threshold is undefined/null/empty
            (inventoryItem.lowStockThreshold !== undefined &&
                inventoryItem.lowStockThreshold !== null &&
                inventoryItem.lowStockThreshold !== '')
                ? inventoryItem.lowStockThreshold.toString()
                : '',
            inventoryItem.imageUrl || '',
            inventoryItem.createdAt,
        ];

        await addRowToSheet(INVENTORY_SHEET_RANGE, rowValues);

        return inventoryItem;
    } catch (error) {
        console.error('Error adding inventory item:', error);
        throw error;
    }
};

// Get all inventory items
export const getInventory = async () => {
    try {
        const rows = await getRowsFromSheet(INVENTORY_SHEET_RANGE);

        if (!rows || rows.length === 0) {
            return [];
        }

        // Skip header row and map to objects
        // Use the actual ID from the sheet instead of the array index
        const items = rows.slice(1).map((row) => {
            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];

            return {
                id: safeRow[0] || '',           // Use the ID from the sheet
                name: safeRow[1] || '',
                category: safeRow[2] || '',
                quantity: safeParseInt(safeRow[3], 0),
                price: safeParseFloat(safeRow[4], 0),
                costPrice: safeParseFloat(safeRow[5], 0),
                sku: safeRow[6] || '',
                // Don't set a default value for lowStockThreshold
                lowStockThreshold: safeParseInt(safeRow[7], null),
                imageUrl: safeRow[8] || '',
                createdAt: safeRow[9] || new Date().toISOString(),
            };
        });

        return items;
    } catch (error) {
        console.error('Error getting inventory items:', error);
        throw error;
    }
};

// Find item row index by ID
export const findItemRowIndexById = async (itemId) => {
    try {
        const rows = await getRowsFromSheet(INVENTORY_SHEET_RANGE);

        if (!rows || rows.length <= 1) {
            throw new Error('Item not found');
        }

        // Skip header row and find the row with matching ID
        const rowIndex = rows.findIndex((row, index) => {
            // Skip header row
            if (index === 0) return false;

            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];

            return safeRow[0] === itemId;
        });

        if (rowIndex === -1) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        return rowIndex;
    } catch (error) {
        console.error('Error finding item row index:', error);
        throw error;
    }
};

// Update inventory item
export const updateInventoryItem = async (itemId, updatedItem) => {
    try {
        // Find the row index of the item by ID
        const rowIndex = await findItemRowIndexById(itemId);

        // Handle image update if needed
        let imageUrl = updatedItem.imageUrl;

        // If new image is provided, upload it and delete old one
        if (updatedItem.image) {
            try {
                // Upload new image
                imageUrl = await uploadImageToDrive(updatedItem.image);

                // Delete old image if exists
                if (updatedItem.imageUrl) {
                    await deleteFileFromDrive(updatedItem.imageUrl).catch(err => {
                        console.warn('Failed to delete old image:', err);
                    });
                }
            } catch (imageError) {
                console.error('Error handling image update:', imageError);
                // Continue with update even if image handling fails
            }
        }

        // Ensure we keep the original ID
        const id = updatedItem.id || itemId;

        // Prepare updated row
        const rowValues = [
            id,                             // Keep original ID
            updatedItem.name || '',
            updatedItem.category || '',
            (updatedItem.quantity || 0).toString(),
            (updatedItem.price || 0).toString(),
            (updatedItem.costPrice || 0).toString(),
            updatedItem.sku || '',
            // Preserve empty threshold value if user intends it to be empty
            (updatedItem.lowStockThreshold !== undefined &&
                updatedItem.lowStockThreshold !== null &&
                updatedItem.lowStockThreshold !== '')
                ? updatedItem.lowStockThreshold.toString()
                : '',
            imageUrl || '',
            updatedItem.createdAt || new Date().toISOString(),
        ];

        // Update in sheet (rowIndex is 0-based, but sheet rows are 1-based)
        const updateRange = `Inventory!A${rowIndex + 1}:K${rowIndex + 1}`;
        await updateRowInSheet(updateRange, rowValues);

        return {
            ...updatedItem,
            imageUrl
        };
    } catch (error) {
        console.error('Error updating inventory item:', error);
        throw error;
    }
};

// Delete inventory item
export const deleteInventoryItem = async (itemId) => {
    try {
        // Find the item first to get its data
        const inventory = await getInventory();
        const item = inventory.find(i => i.id === itemId);

        if (!item) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        // Find the row index of the item by ID
        const rowIndex = await findItemRowIndexById(itemId);

        // Delete image if it exists
        if (item.imageUrl) {
            await deleteFileFromDrive(item.imageUrl).catch(err => {
                console.warn('Failed to delete image:', err);
            });
        }

        // Delete the row from the sheet (rowIndex is 0-based, but sheet rows are 1-based)
        await deleteRowFromSheet('Inventory', rowIndex + 1);

        return true;
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        throw error;
    }
};

// Record a sale
// Record a sale with optional custom price
export const recordSale = async (item, quantity, customPrice = null) => {
    try {
        // Find the item in inventory
        const inventoryItems = await getInventory();
        const inventoryItem = inventoryItems.find(i => i.id === item.id);
        if (!inventoryItem) {
            throw new Error('Item not found in inventory');
        }
        if (inventoryItem.quantity < quantity) {
            throw new Error('Not enough items in stock');
        }

        // Calculate sale details
        const standardPrice = inventoryItem.price; // Store the original inventory price
        const actualPrice = customPrice !== null ? customPrice : inventoryItem.price; // Use custom price if provided
        const totalPrice = actualPrice * quantity;
        const costPrice = inventoryItem.costPrice || 0;
        const profit = (actualPrice - costPrice) * quantity;

        // Add sale record to sales sheet with enhanced data structure
        const saleRow = [
            new Date().toISOString(), // timestamp
            inventoryItem.name || '', // itemName
            inventoryItem.sku || '', // sku
            quantity.toString(), // quantity
            standardPrice.toString(), // standardPrice (original inventory price)
            actualPrice.toString(), // actualPrice (price actually used for sale)
            totalPrice.toString(), // totalPrice
            costPrice.toString(), // costPrice
            profit.toString(), // profit
            inventoryItem.id || '', // itemId
            inventoryItem.category || '', // category
            (customPrice !== null).toString(), // isPriceModified (boolean flag)
            customPrice !== null ? 'CUSTOM' : 'STANDARD' // priceType
        ];

        await addRowToSheet(SALES_SHEET_RANGE, saleRow);

        // Update inventory quantity
        const updatedItem = {
            ...inventoryItem,
            quantity: Math.max(0, inventoryItem.quantity - quantity)
        };

        await updateInventoryItem(inventoryItem.id, updatedItem);

        return {
            id: new Date().getTime().toString(),
            timestamp: new Date().toISOString(),
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            sku: inventoryItem.sku || '',
            category: inventoryItem.category || '',
            quantity,
            standardPrice, // Original inventory price
            actualPrice, // Price actually used
            unitPrice: actualPrice, // For backward compatibility
            totalPrice,
            costPrice,
            profit,
            isPriceModified: customPrice !== null && customPrice !== inventoryItem.price,
            priceType: customPrice !== null && customPrice !== inventoryItem.price ? 'CUSTOM' : 'STANDARD',

            // Calculate variance details
            priceVariance: actualPrice - standardPrice,
            priceVariancePercent: standardPrice > 0 ? ((actualPrice - standardPrice) / standardPrice) * 100 : 0,
            isDiscounted: actualPrice < standardPrice,
            isPremium: actualPrice > standardPrice
        };
    } catch (error) {
        throw error;
    }
};

// Get all sales
export const getSales = async () => {
    try {
        const rows = await getRowsFromSheet(SALES_SHEET_RANGE);

        if (!rows || rows.length === 0) {
            return [];
        }

        // Skip header row and map to objects
        const sales = rows.slice(1).map((row, index) => {
            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];

            // Extract all fields based on the recordSale structure
            const timestamp = safeRow[0] || '';
            const itemName = safeRow[1] || '';
            const sku = safeRow[2] || '';
            const quantity = safeParseInt(safeRow[3], 0);
            const standardPrice = safeParseFloat(safeRow[4], 0);
            const actualPrice = safeParseFloat(safeRow[5], 0);
            const totalPrice = safeParseFloat(safeRow[6], 0);
            const costPrice = safeParseFloat(safeRow[7], 0);
            const profit = safeParseFloat(safeRow[8], 0);
            const itemId = safeRow[9] || '';
            const category = safeRow[10] || '';
            const isPriceModified = safeRow[11] === 'true';
            const priceType = safeRow[12] || 'STANDARD';

            // Calculate variance details
            const priceVariance = actualPrice - standardPrice;
            const priceVariancePercent = standardPrice > 0 ? ((actualPrice - standardPrice) / standardPrice) * 100 : 0;

            return {
                id: index.toString(),
                timestamp,
                itemName,
                name: itemName, // Alias for compatibility
                sku,
                quantity,

                // Price fields - providing multiple aliases for compatibility
                standardPrice,
                basePrice: standardPrice, // Alias
                regularPrice: standardPrice, // Alias

                actualPrice,
                unitPrice: actualPrice, // Alias for backward compatibility
                sellingPrice: actualPrice, // Alias
                price: actualPrice, // Alias

                totalPrice,
                costPrice,
                profit,

                // Item details
                itemId,
                category,

                // Price modification tracking
                isPriceModified,
                priceType,

                // Calculated variance fields
                priceVariance,
                priceVariancePercent,
                isDiscounted: actualPrice < standardPrice,
                isPremium: actualPrice > standardPrice,

                // Date field alias for compatibility
                date: timestamp
            };
        });

        return sales;
    } catch (error) {
        throw error;
    }
};

// Additional functions for inventory service to support webhook integration

// Get inventory item by ID
export const getInventoryItemById = async (itemId) => {
    try {
        const inventory = await getInventory();
        const item = inventory.find(i => i.id === itemId);

        if (!item) {
            throw new Error(`Item with ID ${itemId} not found`);
        }

        return item;
    } catch (error) {
        console.error('Error getting inventory item by ID:', error);
        throw error;
    }
};

// Update inventory after order processing
export const updateInventoryAfterOrder = async (orderItems) => {
    try {
        const results = [];
        let allSuccess = true;

        for (const orderItem of orderItems) {
            try {
                // Get current inventory item
                const inventoryItem = await getInventoryItemById(orderItem.productId);

                if (!inventoryItem) {
                    console.error(`Item ${orderItem.productId} not found in inventory`);
                    allSuccess = false;
                    results.push({
                        productId: orderItem.productId,
                        success: false,
                        error: 'Item not found'
                    });
                    continue;
                }

                // Check if we have enough stock
                if (inventoryItem.quantity < orderItem.quantity) {
                    console.error(`Insufficient stock for ${orderItem.productId}. Available: ${inventoryItem.quantity}, Requested: ${orderItem.quantity}`);
                    allSuccess = false;
                    results.push({
                        productId: orderItem.productId,
                        success: false,
                        error: 'Insufficient stock'
                    });
                    continue;
                }

                // Update inventory quantity
                const updatedItem = {
                    ...inventoryItem,
                    quantity: inventoryItem.quantity - orderItem.quantity
                };

                await updateInventoryItem(inventoryItem.id, updatedItem);

                results.push({
                    productId: orderItem.productId,
                    success: true,
                    previousQuantity: inventoryItem.quantity,
                    newQuantity: updatedItem.quantity,
                    quantityReduced: orderItem.quantity
                });

                // Check if item is now below low stock threshold
                if (updatedItem.lowStockThreshold &&
                    updatedItem.quantity <= updatedItem.lowStockThreshold) {
                    console.warn(`Item ${updatedItem.name} is now below low stock threshold`);
                    // You can trigger low stock alert here if needed
                }

            } catch (error) {
                console.error(`Error updating inventory for item ${orderItem.productId}:`, error);
                allSuccess = false;
                results.push({
                    productId: orderItem.productId,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: allSuccess,
            results,
            updatedCount: results.filter(r => r.success).length,
            totalCount: orderItems.length
        };

    } catch (error) {
        console.error('Error updating inventory after order:', error);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
};

// Restore inventory after order cancellation
export const restoreInventoryAfterCancellation = async (orderItems) => {
    try {
        const results = [];
        let allSuccess = true;

        for (const orderItem of orderItems) {
            try {
                // Get current inventory item
                const inventoryItem = await getInventoryItemById(orderItem.productId);

                if (!inventoryItem) {
                    console.error(`Item ${orderItem.productId} not found in inventory`);
                    allSuccess = false;
                    results.push({
                        productId: orderItem.productId,
                        success: false,
                        error: 'Item not found'
                    });
                    continue;
                }

                // Restore inventory quantity
                const updatedItem = {
                    ...inventoryItem,
                    quantity: inventoryItem.quantity + orderItem.quantity
                };

                await updateInventoryItem(inventoryItem.id, updatedItem);

                results.push({
                    productId: orderItem.productId,
                    success: true,
                    previousQuantity: inventoryItem.quantity,
                    newQuantity: updatedItem.quantity,
                    quantityRestored: orderItem.quantity
                });

            } catch (error) {
                console.error(`Error restoring inventory for item ${orderItem.productId}:`, error);
                allSuccess = false;
                results.push({
                    productId: orderItem.productId,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: allSuccess,
            results,
            restoredCount: results.filter(r => r.success).length,
            totalCount: orderItems.length
        };

    } catch (error) {
        console.error('Error restoring inventory after cancellation:', error);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
};

// Get low stock items
export const getLowStockItems = async () => {
    try {
        const inventory = await getInventory();

        const lowStockItems = inventory.filter(item => {
            // Only consider items that have a low stock threshold set
            if (!item.lowStockThreshold || item.lowStockThreshold === null) {
                return false;
            }

            return item.quantity <= item.lowStockThreshold;
        });

        return lowStockItems;
    } catch (error) {
        console.error('Error getting low stock items:', error);
        throw error;
    }
};

// Bulk update inventory quantities
export const bulkUpdateInventory = async (updates) => {
    try {
        const results = [];
        let allSuccess = true;

        for (const update of updates) {
            try {
                const { itemId, quantity, operation = 'set' } = update;

                // Get current inventory item
                const inventoryItem = await getInventoryItemById(itemId);

                if (!inventoryItem) {
                    allSuccess = false;
                    results.push({
                        itemId,
                        success: false,
                        error: 'Item not found'
                    });
                    continue;
                }

                let newQuantity;
                switch (operation) {
                    case 'add':
                        newQuantity = inventoryItem.quantity + quantity;
                        break;
                    case 'subtract':
                        newQuantity = Math.max(0, inventoryItem.quantity - quantity);
                        break;
                    case 'set':
                    default:
                        newQuantity = quantity;
                        break;
                }

                // Update inventory
                const updatedItem = {
                    ...inventoryItem,
                    quantity: newQuantity
                };

                await updateInventoryItem(itemId, updatedItem);

                results.push({
                    itemId,
                    success: true,
                    previousQuantity: inventoryItem.quantity,
                    newQuantity,
                    operation
                });

            } catch (error) {
                console.error(`Error updating inventory for item ${update.itemId}:`, error);
                allSuccess = false;
                results.push({
                    itemId: update.itemId,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            success: allSuccess,
            results,
            updatedCount: results.filter(r => r.success).length,
            totalCount: updates.length
        };

    } catch (error) {
        console.error('Error in bulk inventory update:', error);
        return {
            success: false,
            error: error.message,
            results: []
        };
    }
};

// Get inventory statistics
export const getInventoryStats = async () => {
    try {
        const inventory = await getInventory();
        const sales = await getSales();

        const totalItems = inventory.length;
        const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
        const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const totalCostValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);

        const lowStockItems = await getLowStockItems();
        const outOfStockItems = inventory.filter(item => item.quantity === 0);

        // Recent sales (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentSales = sales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= thirtyDaysAgo;
        });

        const totalSalesValue = recentSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
        const totalProfit = recentSales.reduce((sum, sale) => sum + sale.profit, 0);

        // Top selling items
        const itemSales = {};
        recentSales.forEach(sale => {
            if (!itemSales[sale.itemId]) {
                itemSales[sale.itemId] = {
                    itemName: sale.itemName,
                    totalQuantity: 0,
                    totalValue: 0
                };
            }
            itemSales[sale.itemId].totalQuantity += sale.quantity;
            itemSales[sale.itemId].totalValue += sale.totalPrice;
        });

        const topSellingItems = Object.values(itemSales)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 5);

        return {
            inventory: {
                totalItems,
                totalQuantity,
                totalValue,
                totalCostValue,
                potentialProfit: totalValue - totalCostValue
            },
            alerts: {
                lowStockCount: lowStockItems.length,
                outOfStockCount: outOfStockItems.length,
                lowStockItems: lowStockItems.slice(0, 5), // Top 5 low stock items
                outOfStockItems: outOfStockItems.slice(0, 5) // Top 5 out of stock items
            },
            sales: {
                recentSalesCount: recentSales.length,
                totalSalesValue,
                totalProfit,
                averageOrderValue: recentSales.length > 0 ? totalSalesValue / recentSales.length : 0
            },
            topSellingItems,
            generatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error getting inventory stats:', error);
        throw error;
    }
};

// Sheet configuration for orders
const ORDERS_SHEET_RANGE = 'Orders!A:Z';
const ORDER_ITEMS_SHEET_RANGE = 'OrderItems!A:Z';

// Get all orders
export const getOrders = async () => {
    try {
        const rows = await getRowsFromSheet(ORDERS_SHEET_RANGE);

        if (!rows || rows.length === 0) {
            return [];
        }

        // Skip header row and map to objects
        const orders = rows.slice(1).map((row) => {
            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];

            return {
                orderId: safeRow[0] || '',
                userId: safeRow[1] || '',
                orderDate: safeRow[2] || '',
                status: safeRow[3] || '',
                totalAmount: safeParseFloat(safeRow[4], 0),
                shippingFee: safeParseFloat(safeRow[5], 0),
                paymentMethod: safeRow[6] || '',
                currency: safeRow[7] || '',
                isAuthenticated: safeRow[8] === 'TRUE' || safeRow[8] === true,
                isGuestCheckout: safeRow[9] === 'TRUE' || safeRow[9] === true,
                customerFirstName: safeRow[10] || '',
                customerLastName: safeRow[11] || '',
                customerEmail: safeRow[12] || '',
                customerPhone: safeRow[13] || '',
                shippingAddress: safeRow[14] || '',
                city: safeRow[15] || '',
                state: safeRow[16] || '',
                lga: safeRow[17] || '',
                town: safeRow[18] || '',
                zip: safeRow[19] || '',
                additionalInfo: safeRow[20] || '',
                createdAt: safeRow[21] || new Date().toISOString(),
                updatedAt: safeRow[22] || new Date().toISOString(),
            };
        });

        return orders;
    } catch (error) {
        console.error('Error getting orders:', error);
        throw error;
    }
};

// Get all order items
export const getOrderItems = async () => {
    try {
        const rows = await getRowsFromSheet(ORDER_ITEMS_SHEET_RANGE);

        if (!rows || rows.length === 0) {
            return [];
        }

        // Skip header row and map to objects
        const orderItems = rows.slice(1).map((row) => {
            // Ensure row is an array
            const safeRow = Array.isArray(row) ? row : [];

            return {
                orderId: safeRow[0] || '',
                productId: safeRow[1] || '',
                productName: safeRow[2] || '',
                quantity: safeParseInt(safeRow[3], 0),
                price: safeParseFloat(safeRow[4], 0),
                imageUrl: safeRow[5] || '',
            };
        });

        return orderItems;
    } catch (error) {
        console.error('Error getting order items:', error);
        throw error;
    }
};

// Get orders with their items (combined data)
export const getOrdersWithItems = async () => {
    try {
        const [orders, orderItems] = await Promise.all([
            getOrders(),
            getOrderItems()
        ]);

        // Group order items by orderId
        const itemsByOrderId = orderItems.reduce((acc, item) => {
            if (!acc[item.orderId]) {
                acc[item.orderId] = [];
            }
            acc[item.orderId].push(item);
            return acc;
        }, {});

        // Combine orders with their items
        const ordersWithItems = orders.map(order => ({
            ...order,
            items: itemsByOrderId[order.orderId] || []
        }));

        return ordersWithItems;
    } catch (error) {
        console.error('Error getting orders with items:', error);
        throw error;
    }
};

// Get order by ID
export const getOrderById = async (orderId) => {
    try {
        const orders = await getOrdersWithItems();
        const order = orders.find(o => o.orderId === orderId);

        if (!order) {
            throw new Error(`Order with ID ${orderId} not found`);
        }

        return order;
    } catch (error) {
        console.error('Error getting order by ID:', error);
        throw error;
    }
};

// Get orders by status
export const getOrdersByStatus = async (status) => {
    try {
        const orders = await getOrdersWithItems();
        return orders.filter(order => order.status.toLowerCase() === status.toLowerCase());
    } catch (error) {
        console.error('Error getting orders by status:', error);
        throw error;
    }
};

// Get orders by user ID
export const getOrdersByUserId = async (userId) => {
    try {
        const orders = await getOrdersWithItems();
        return orders.filter(order => order.userId === userId);
    } catch (error) {
        console.error('Error getting orders by user ID:', error);
        throw error;
    }
};

// Get orders by date range
export const getOrdersByDateRange = async (startDate, endDate) => {
    try {
        const orders = await getOrdersWithItems();
        const start = new Date(startDate);
        const end = new Date(endDate);

        return orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate >= start && orderDate <= end;
        });
    } catch (error) {
        console.error('Error getting orders by date range:', error);
        throw error;
    }
};

// Get recent orders (last N days)
export const getRecentOrders = async (days = 30) => {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return await getOrdersByDateRange(startDate.toISOString(), endDate.toISOString());
    } catch (error) {
        console.error('Error getting recent orders:', error);
        throw error;
    }
};

// Get order statistics
export const getOrderStats = async () => {
    try {
        const orders = await getOrdersWithItems();

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalShippingFees = orders.reduce((sum, order) => sum + order.shippingFee, 0);

        // Orders by status
        const ordersByStatus = orders.reduce((acc, order) => {
            const status = order.status.toLowerCase();
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        // Recent orders (last 30 days)
        const recentOrders = await getRecentOrders(30);
        const recentRevenue = recentOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        // Average order value
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const recentAverageOrderValue = recentOrders.length > 0 ? recentRevenue / recentOrders.length : 0;

        // Payment methods breakdown
        const paymentMethods = orders.reduce((acc, order) => {
            const method = order.paymentMethod || 'Unknown';
            acc[method] = (acc[method] || 0) + 1;
            return acc;
        }, {});

        // Top selling products from order items
        const allOrderItems = orders.flatMap(order => order.items);
        const productSales = allOrderItems.reduce((acc, item) => {
            if (!acc[item.productId]) {
                acc[item.productId] = {
                    productId: item.productId,
                    productName: item.productName,
                    totalQuantity: 0,
                    totalRevenue: 0,
                    orderCount: 0
                };
            }
            acc[item.productId].totalQuantity += item.quantity;
            acc[item.productId].totalRevenue += item.price * item.quantity;
            acc[item.productId].orderCount += 1;
            return acc;
        }, {});

        const topSellingProducts = Object.values(productSales)
            .sort((a, b) => b.totalQuantity - a.totalQuantity)
            .slice(0, 10);

        return {
            overview: {
                totalOrders,
                totalRevenue,
                totalShippingFees,
                averageOrderValue,
                totalItemsSold: allOrderItems.reduce((sum, item) => sum + item.quantity, 0)
            },
            recent: {
                ordersCount: recentOrders.length,
                revenue: recentRevenue,
                averageOrderValue: recentAverageOrderValue
            },
            ordersByStatus,
            paymentMethods,
            topSellingProducts,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting order stats:', error);
        throw error;
    }
};

// Helper function to find the row number for a specific orderId

// utils/inventoryService.js - Add these functions to your existing service

/**
 * Update order status in Google Sheets
 * @param {string} orderId - The order ID to update
 * @param {string} newStatus - The new status (pending, processing, shipped, delivered, cancelled)
 * @param {string} trackingNumber - Optional tracking number for shipped orders
 * @returns {Promise<Object>} - Result of the update operation
 */
export const updateOrderStatusInSheet = async (orderId, newStatus, trackingNumber = null) => {
    try {
        const requestBody = {
            orderId,
            status: newStatus.toLowerCase()
        };

        // Add tracking number if provided
        if (trackingNumber) {
            requestBody.trackingNumber = trackingNumber;
        }

        const response = await fetch('/api/orders/update-status', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        if (!result.success) {
            throw new Error(result.error || 'Update failed');
        }

        return result;

    } catch (error) {
        console.error('Error updating order status:', error);
        throw new Error(`Failed to update order status: ${error.message}`);
    }
};

/**
 * Get current order status from Google Sheets
 * @param {string} orderId - The order ID to check
 * @returns {Promise<Object>} - Current order status information
 */
export const getOrderStatus = async (orderId) => {
    try {
        const response = await fetch(`/api/orders/update-status?orderId=${encodeURIComponent(orderId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }

        return result;

    } catch (error) {
        console.error('Error fetching order status:', error);
        throw new Error(`Failed to fetch order status: ${error.message}`);
    }
};

/**
 * Batch update multiple order statuses
 * @param {Array} orderUpdates - Array of {orderId, status, trackingNumber} objects
 * @returns {Promise<Array>} - Array of update results
 */
export const batchUpdateOrderStatuses = async (orderUpdates) => {
    try {
        const updatePromises = orderUpdates.map(update =>
            updateOrderStatusInSheet(update.orderId, update.status, update.trackingNumber)
        );

        const results = await Promise.allSettled(updatePromises);

        const successfulUpdates = [];
        const failedUpdates = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfulUpdates.push({
                    orderId: orderUpdates[index].orderId,
                    result: result.value
                });
            } else {
                failedUpdates.push({
                    orderId: orderUpdates[index].orderId,
                    error: result.reason.message
                });
            }
        });

        return {
            successful: successfulUpdates,
            failed: failedUpdates,
            totalProcessed: orderUpdates.length,
            successCount: successfulUpdates.length,
            failureCount: failedUpdates.length
        };

    } catch (error) {
        console.error('Error in batch update:', error);
        throw new Error(`Batch update failed: ${error.message}`);
    }
};

/**
 * Send order status update notification to customer (optional)
 * This function can be extended to send emails or SMS notifications
 * @param {string} orderId - The order ID
 * @param {string} newStatus - The new status
 * @param {Object} customerInfo - Customer contact information
 * @param {string} trackingNumber - Optional tracking number
 * @returns {Promise<Object>} - Notification result
 */
export const notifyCustomerStatusUpdate = async (orderId, newStatus, customerInfo, trackingNumber = null) => {
    try {
        // This is a placeholder for your notification logic
        // You can integrate with your email service, SMS service, etc.

        const notificationData = {
            orderId,
            newStatus,
            customerEmail: customerInfo.email,
            customerName: customerInfo.name,
            trackingNumber,
            timestamp: new Date().toISOString()
        };

        // Example: Send email notification (implement based on your email service)
        // const emailResult = await sendStatusUpdateEmail(notificationData);

        console.log('Customer notification data prepared:', notificationData);

        return {
            success: true,
            message: 'Customer notification prepared',
            data: notificationData
        };

    } catch (error) {
        console.error('Error preparing customer notification:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Validate order status transition
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - Proposed new status
 * @returns {Object} - Validation result
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
    const validTransitions = {
        'pending': ['processing', 'cancelled'],
        'processing': ['shipped', 'cancelled'],
        'shipped': ['delivered', 'cancelled'],
        'delivered': [], // Final state - no transitions allowed
        'cancelled': [] // Final state - no transitions allowed
    };

    const current = currentStatus?.toLowerCase() || 'pending';
    const proposed = newStatus?.toLowerCase();

    if (!proposed) {
        return {
            valid: false,
            error: 'New status is required'
        };
    }

    const allowedTransitions = validTransitions[current] || [];

    if (current === proposed) {
        return {
            valid: true,
            warning: 'Status is already set to this value'
        };
    }

    if (!allowedTransitions.includes(proposed)) {
        return {
            valid: false,
            error: `Cannot transition from ${current} to ${proposed}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
        };
    }

    return {
        valid: true,
        message: `Status can be updated from ${current} to ${proposed}`
    };
};

/**
 * Get order status history (if you implement status history tracking)
 * @param {string} orderId - The order ID
 * @returns {Promise<Array>} - Array of status changes
 */
export const getOrderStatusHistory = async (orderId) => {
    try {
        // This would require a separate sheet or additional columns to track status history
        // For now, this is a placeholder that returns current status

        const currentStatus = await getOrderStatus(orderId);

        return [{
            orderId,
            status: currentStatus.status,
            timestamp: new Date().toISOString(),
            note: 'Current status'
        }];

    } catch (error) {
        console.error('Error fetching order status history:', error);
        throw new Error(`Failed to fetch status history: ${error.message}`);
    }
};

/**
 * Helper function to format status for display
 * @param {string} status - The status to format
 * @returns {Object} - Formatted status with color and label
 */
export const formatOrderStatus = (status) => {
    const statusConfig = {
        'pending': {
            label: 'Pending',
            color: 'yellow',
            bgColor: 'bg-yellow-100',
            textColor: 'text-yellow-800',
            borderColor: 'border-yellow-200'
        },
        'processing': {
            label: 'Processing',
            color: 'blue',
            bgColor: 'bg-blue-100',
            textColor: 'text-blue-800',
            borderColor: 'border-blue-200'
        },
        'shipped': {
            label: 'Shipped',
            color: 'purple',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-800',
            borderColor: 'border-purple-200'
        },
        'delivered': {
            label: 'Delivered',
            color: 'green',
            bgColor: 'bg-green-100',
            textColor: 'text-green-800',
            borderColor: 'border-green-200'
        },
        'cancelled': {
            label: 'Cancelled',
            color: 'red',
            bgColor: 'bg-red-100',
            textColor: 'text-red-800',
            borderColor: 'border-red-200'
        }
    };

    const normalizedStatus = status?.toLowerCase() || 'pending';
    return statusConfig[normalizedStatus] || statusConfig['pending'];
};