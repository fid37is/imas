// utils/googleSheetsService.js
import {
    getSheetData,
    appendSheetData,
    updateSheetData,
    deleteSheetRow,
} from "../pages/api/lib/googleSheetsService";

// Get all inventory data from Google Sheets
export const fetchInventory = async () => {
    try {
        const rows = await getSheetData("Inventory!A2:J");

        // Map rows to objects
        const inventory = rows.map((row, index) => {
            return {
                id: row[0] || `sheet-${index}`,
                name: row[1] || "",
                sku: row[2] || "",
                category: row[3] || "",
                price: parseFloat(row[4]) || 0,
                costPrice: parseFloat(row[5]) || 0,
                quantity: parseInt(row[6]) || 0,
                lowStockThreshold: parseInt(row[7]) || 5,
                imageUrl: row[8] || "",
                lastUpdated: row[9] || new Date().toISOString()
            };
        });

        return inventory;
    } catch (error) {
        console.error("Error fetching inventory from Google Sheets:", error);
        throw error;
    }
};

// Add a new item to Google Sheets
export const addItemToSheet = async (item) => {
    try {
        // Prepare data for Google Sheets
        const newRow = [
            item.id,
            item.name,
            item.sku,
            item.category,
            item.price,
            item.costPrice,
            item.quantity,
            item.lowStockThreshold,
            item.imageUrl,
            new Date().toISOString()
        ];

        // Add to Google Sheets
        await appendSheetData("Inventory!A:J", [newRow]);

        return item;
    } catch (error) {
        console.error("Error adding item to Google Sheets:", error);
        throw error;
    }
};

// Update an item in Google Sheets
export const updateItemInSheet = async (updatedItem, rowIndex) => {
    try {
        // Update in Google Sheets
        await updateSheetData(`Inventory!A${rowIndex}:J${rowIndex}`, [[
            updatedItem.id,
            updatedItem.name,
            updatedItem.sku,
            updatedItem.category,
            updatedItem.price,
            updatedItem.costPrice,
            updatedItem.quantity,
            updatedItem.lowStockThreshold,
            updatedItem.imageUrl,
            new Date().toISOString()
        ]]);

        return updatedItem;
    } catch (error) {
        console.error("Error updating item in Google Sheets:", error);
        throw error;
    }
};

// Delete an item from Google Sheets
export const deleteItemFromSheet = async (rowIndex) => {
    try {
        // Delete row in Google Sheets (assumes sheet ID 0 for the first sheet)
        await deleteSheetRow(0, rowIndex);
        return true;
    } catch (error) {
        console.error("Error deleting item from Google Sheets:", error);
        throw error;
    }
};

// Find the row index of an item by its ID
export const findItemRowIndex = async (itemId) => {
    try {
        const ids = await getSheetData("Inventory!A:A");

        let rowIndex = -1;
        for (let i = 0; i < ids.length; i++) {
            if (ids[i][0] === itemId) {
                rowIndex = i + 1; // +1 because sheets is 1-indexed
                break;
            }
        }

        return rowIndex;
    } catch (error) {
        console.error("Error finding item row index:", error);
        throw error;
    }
};

// Record a sale in Google Sheets
export const recordSaleInSheet = async (saleData) => {
    try {
        // Add sale record to Sales sheet
        await appendSheetData("Sales!A:G", [[
            saleData.id,
            saleData.itemId,
            saleData.itemName,
            saleData.quantity,
            saleData.saleAmount,
            saleData.profit,
            saleData.date
        ]]);

        return saleData;
    } catch (error) {
        console.error("Error recording sale in Google Sheets:", error);
        throw error;
    }
};

// Get sales data from Google Sheets
export const fetchSales = async () => {
    try {
        const rows = await getSheetData("Sales!A2:G");

        // Map rows to objects
        const sales = rows.map((row) => {
            return {
                id: row[0],
                itemId: row[1],
                itemName: row[2],
                quantity: parseInt(row[3]),
                saleAmount: parseFloat(row[4]),
                profit: parseFloat(row[5]),
                date: row[6]
            };
        });

        return sales;
    } catch (error) {
        console.error("Error fetching sales from Google Sheets:", error);
        throw error;
    }
};

// Get all orders data from Google Sheets
export const fetchOrders = async () => {
    try {
        const rows = await getSheetData("Orders!A2:W");

        // Map rows to objects
        const orders = rows.map((row, index) => {
            return {
                orderId: row[0] || `order-${index}`,
                userId: row[1] || "",
                orderDate: row[2] || "",
                status: row[3] || "",
                totalAmount: parseFloat(row[4]) || 0,
                shippingFee: parseFloat(row[5]) || 0,
                paymentMethod: row[6] || "",
                currency: row[7] || "",
                isAuthenticated: row[8] === "TRUE" || row[8] === true,
                isGuestCheckout: row[9] === "TRUE" || row[9] === true,
                customerFirstName: row[10] || "",
                customerLastName: row[11] || "",
                customerEmail: row[12] || "",
                customerPhone: row[13] || "",
                shippingAddress: row[14] || "",
                city: row[15] || "",
                state: row[16] || "",
                lga: row[17] || "",
                town: row[18] || "",
                zip: row[19] || "",
                additionalInfo: row[20] || "",
                createdAt: row[21] || new Date().toISOString(),
                updatedAt: row[22] || new Date().toISOString()
            };
        });

        return orders;
    } catch (error) {
        console.error("Error fetching orders from Google Sheets:", error);
        throw error;
    }
};

// Get all order items data from Google Sheets
export const fetchOrderItems = async () => {
    try {
        const rows = await getSheetData("OrderItems!A2:F");

        // Map rows to objects
        const orderItems = rows.map((row) => {
            return {
                orderId: row[0] || "",
                productId: row[1] || "",
                productName: row[2] || "",
                quantity: parseInt(row[3]) || 0,
                price: parseFloat(row[4]) || 0,
                imageUrl: row[5] || ""
            };
        });

        return orderItems;
    } catch (error) {
        console.error("Error fetching order items from Google Sheets:", error);
        throw error;
    }
};

// Get orders with their items (combined data)
export const fetchOrdersWithItems = async () => {
    try {
        const [orders, orderItems] = await Promise.all([
            fetchOrders(),
            fetchOrderItems()
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
        console.error("Error fetching orders with items from Google Sheets:", error);
        throw error;
    }
};

// Add a new order to Google Sheets
export const addOrderToSheet = async (order) => {
    try {
        // Prepare data for Google Sheets Orders sheet
        const newOrderRow = [
            order.orderId,
            order.userId,
            order.orderDate,
            order.status,
            order.totalAmount,
            order.shippingFee,
            order.paymentMethod,
            order.currency,
            order.isAuthenticated,
            order.isGuestCheckout,
            order.customerFirstName,
            order.customerLastName,
            order.customerEmail,
            order.customerPhone,
            order.shippingAddress,
            order.city,
            order.state,
            order.lga,
            order.town,
            order.zip,
            order.additionalInfo,
            order.createdAt || new Date().toISOString(),
            order.updatedAt || new Date().toISOString()
        ];

        // Add to Google Sheets Orders sheet
        await appendSheetData("Orders!A:W", [newOrderRow]);

        return order;
    } catch (error) {
        console.error("Error adding order to Google Sheets:", error);
        throw error;
    }
};

// Add order items to Google Sheets
export const addOrderItemsToSheet = async (orderItems) => {
    try {
        // Prepare data for Google Sheets OrderItems sheet
        const newOrderItemRows = orderItems.map(item => [
            item.orderId,
            item.productId,
            item.productName,
            item.quantity,
            item.price,
            item.imageUrl
        ]);

        // Add to Google Sheets OrderItems sheet
        await appendSheetData("OrderItems!A:F", newOrderItemRows);

        return orderItems;
    } catch (error) {
        console.error("Error adding order items to Google Sheets:", error);
        throw error;
    }
};

// Add complete order with items to Google Sheets
export const addCompleteOrderToSheet = async (orderData) => {
    try {
        const { order, items } = orderData;

        // Add order first
        await addOrderToSheet(order);

        // Then add order items if they exist
        if (items && items.length > 0) {
            await addOrderItemsToSheet(items);
        }

        return { order, items };
    } catch (error) {
        console.error("Error adding complete order to Google Sheets:", error);
        throw error;
    }
};

// Update order status in Google Sheets
export const updateOrderStatusInSheet = async (orderId, newStatus) => {
    try {
        // Find the row index of the order
        const rowIndex = await findOrderRowIndex(orderId);
        
        if (rowIndex === -1) {
            throw new Error(`Order with ID ${orderId} not found`);
        }

        // Get current order data
        const orders = await fetchOrders();
        const currentOrder = orders.find(o => o.orderId === orderId);
        
        if (!currentOrder) {
            throw new Error(`Order with ID ${orderId} not found`);
        }

        // Update the order with new status and updatedAt
        const updatedOrder = {
            ...currentOrder,
            status: newStatus,
            updatedAt: new Date().toISOString()
        };

        // Prepare updated row data
        const updatedRow = [
            updatedOrder.orderId,
            updatedOrder.userId,
            updatedOrder.orderDate,
            updatedOrder.status,
            updatedOrder.totalAmount,
            updatedOrder.shippingFee,
            updatedOrder.paymentMethod,
            updatedOrder.currency,
            updatedOrder.isAuthenticated,
            updatedOrder.isGuestCheckout,
            updatedOrder.customerFirstName,
            updatedOrder.customerLastName,
            updatedOrder.customerEmail,
            updatedOrder.customerPhone,
            updatedOrder.shippingAddress,
            updatedOrder.city,
            updatedOrder.state,
            updatedOrder.lga,
            updatedOrder.town,
            updatedOrder.zip,
            updatedOrder.additionalInfo,
            updatedOrder.createdAt,
            updatedOrder.updatedAt
        ];

        // Update in Google Sheets
        await updateSheetData(`Orders!A${rowIndex}:W${rowIndex}`, [updatedRow]);

        return updatedOrder;
    } catch (error) {
        console.error("Error updating order status in Google Sheets:", error);
        throw error;
    }
};

// Find the row index of an order by its ID
export const findOrderRowIndex = async (orderId) => {
    try {
        const ids = await getSheetData("Orders!A:A");

        let rowIndex = -1;
        for (let i = 0; i < ids.length; i++) {
            if (ids[i][0] === orderId) {
                rowIndex = i + 1; // +1 because sheets is 1-indexed
                break;
            }
        }

        return rowIndex;
    } catch (error) {
        console.error("Error finding order row index:", error);
        throw error;
    }
};

// Get orders by status from Google Sheets
export const fetchOrdersByStatus = async (status) => {
    try {
        const orders = await fetchOrdersWithItems();
        return orders.filter(order => order.status.toLowerCase() === status.toLowerCase());
    } catch (error) {
        console.error("Error fetching orders by status from Google Sheets:", error);
        throw error;
    }
};

// Get orders by user ID from Google Sheets
export const fetchOrdersByUserId = async (userId) => {
    try {
        const orders = await fetchOrdersWithItems();
        return orders.filter(order => order.userId === userId);
    } catch (error) {
        console.error("Error fetching orders by user ID from Google Sheets:", error);
        throw error;
    }
};

// Get recent orders from Google Sheets
export const fetchRecentOrders = async (days = 30) => {
    try {
        const orders = await fetchOrdersWithItems();
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - days);
        
        return orders.filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate >= daysAgo;
        });
    } catch (error) {
        console.error("Error fetching recent orders from Google Sheets:", error);
        throw error;
    }
};