/* eslint-disable import/no-anonymous-default-export */
// Inventory App - /lib/order-sync.js
import { google } from 'googleapis';

let jwtClient = null;

const createJwtClient = () => {
    if (process.env.GOOGLE_CREDENTIALS_B64) {
        const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf-8');
        const credentials = JSON.parse(decoded);
        return new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/spreadsheets']
        );
    } else {
        return new google.auth.JWT(
            process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
            null,
            (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets']
        );
    }
};

const authorizeJwtClient = async () => {
    if (!jwtClient) jwtClient = createJwtClient();
    return new Promise((resolve, reject) => {
        jwtClient.authorize((err) => {
            if (err) {
                console.error('JWT Authorization failed:', err);
                reject(err);
            } else {
                resolve(jwtClient);
            }
        });
    });
};

const getSheets = () => google.sheets({ version: 'v4', auth: jwtClient });

// Fetch all orders from Google Sheets
export const fetchOrdersFromSheets = async () => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            throw new Error('GOOGLE_SHEET_ID environment variable is not set');
        }

        // Fetch orders
        const ordersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Orders!A:Z',
        });

        const ordersData = ordersResponse.data.values || [];
        if (ordersData.length === 0) {
            return [];
        }

        const [ordersHeaders, ...ordersRows] = ordersData;

        // Fetch order items
        const itemsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'OrderItems!A:Z',
        });

        const itemsData = itemsResponse.data.values || [];
        const [itemsHeaders, ...itemsRows] = itemsData.length > 0 ? itemsData : [[], []];

        // Process orders
        const orders = ordersRows.map(row => {
            const order = {};
            ordersHeaders.forEach((header, index) => {
                const value = row[index] || '';
                const lowerHeader = header.toLowerCase();

                switch (lowerHeader) {
                    case 'orderid':
                        order.orderId = value;
                        break;
                    case 'userid':
                    case 'user_id':
                        order.userId = value;
                        break;
                    case 'orderdate':
                    case 'date':
                        order.orderDate = value;
                        break;
                    case 'status':
                        order.status = value || 'pending';
                        break;
                    case 'totalamount':
                    case 'total':
                        order.total = parseFloat(value) || 0;
                        break;
                    case 'shippingfee':
                    case 'shipping':
                        order.shippingFee = parseFloat(value) || 0;
                        break;
                    case 'paymentmethod':
                        order.paymentMethod = value;
                        break;
                    case 'currency':
                        order.currency = value || 'NGN';
                        break;
                    case 'isauthenticated':
                        order.isAuthenticated = value === 'true';
                        break;
                    case 'isguestcheckout':
                        order.isGuestCheckout = value === 'true';
                        break;
                    case 'customerfirstname':
                    case 'firstname':
                        order.customerFirstName = value;
                        break;
                    case 'customerlastname':
                    case 'lastname':
                        order.customerLastName = value;
                        break;
                    case 'customeremail':
                    case 'email':
                        order.customerEmail = value;
                        break;
                    case 'customerphone':
                    case 'phone':
                        order.customerPhone = value;
                        break;
                    case 'shippingaddress':
                    case 'address':
                        order.shippingAddress = value;
                        break;
                    case 'city':
                        order.city = value;
                        break;
                    case 'state':
                        order.state = value;
                        break;
                    case 'lga':
                        order.lga = value;
                        break;
                    case 'town':
                        order.town = value;
                        break;
                    case 'zip':
                        order.zip = value;
                        break;
                    case 'additionalinfo':
                        order.additionalInfo = value;
                        break;
                    case 'createdat':
                        order.createdAt = value;
                        break;
                    case 'updatedat':
                        order.updatedAt = value;
                        break;
                    case 'trackingnumber':
                        order.trackingNumber = value;
                        break;
                    case 'notes':
                        order.notes = value;
                        break;
                    default:
                        // Handle any additional columns
                        order[header] = value;
                        break;
                }
            });

            // Generate display name
            order.customerName = `${order.customerFirstName || ''} ${order.customerLastName || ''}`.trim();
            
            // Set payment status (you might want to add this column to your sheet)
            order.paymentStatus = order.paymentMethod === 'pay_on_pickup' ? 'pending' : 'paid';

            return order;
        });

        // Process order items and group by orderId
        const orderItemsMap = {};
        if (itemsHeaders && itemsRows.length > 0) {
            itemsRows.forEach(row => {
                const item = {};
                itemsHeaders.forEach((header, index) => {
                    const value = row[index] || '';
                    const lowerHeader = header.toLowerCase();

                    switch (lowerHeader) {
                        case 'orderid':
                            item.orderId = value;
                            break;
                        case 'productid':
                            item.productId = value;
                            break;
                        case 'productname':
                        case 'name':
                            item.name = value;
                            break;
                        case 'quantity':
                        case 'qty':
                            item.quantity = parseInt(value) || 1;
                            break;
                        case 'price':
                            item.price = parseFloat(value) || 0;
                            break;
                        case 'imageurl':
                            item.imageUrl = value;
                            break;
                        default:
                            item[header] = value;
                            break;
                    }
                });

                if (item.orderId) {
                    if (!orderItemsMap[item.orderId]) {
                        orderItemsMap[item.orderId] = [];
                    }
                    orderItemsMap[item.orderId].push(item);
                }
            });
        }

        // Attach items to orders
        orders.forEach(order => {
            order.items = orderItemsMap[order.orderId] || [];
        });

        return orders.sort((a, b) => new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate));

    } catch (error) {
        console.error('Error fetching orders from sheets:', error);
        throw error;
    }
};

// Update order status in Google Sheets
export const updateOrderStatusInSheets = async (orderId, newStatus, trackingNumber = '') => {
    try {
        await authorizeJwtClient();
        const sheets = getSheets();
        const sheetId = process.env.GOOGLE_SHEET_ID;

        if (!sheetId) {
            throw new Error('GOOGLE_SHEET_ID environment variable is not set');
        }

        // First, find the order row
        const ordersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Orders!A:Z',
        });

        const ordersData = ordersResponse.data.values || [];
        if (ordersData.length === 0) {
            throw new Error('No orders found in sheet');
        }

        const [headers, ...rows] = ordersData;
        const orderRowIndex = rows.findIndex(row => row[0] === orderId); // Assuming orderId is in column A

        if (orderRowIndex === -1) {
            throw new Error(`Order ${orderId} not found`);
        }

        // Find the status and tracking number column indices
        const statusColumnIndex = headers.findIndex(header => 
            header.toLowerCase() === 'status'
        );
        const trackingColumnIndex = headers.findIndex(header => 
            header.toLowerCase() === 'trackingnumber'
        );
        const updatedAtColumnIndex = headers.findIndex(header => 
            header.toLowerCase() === 'updatedat'
        );

        const actualRowIndex = orderRowIndex + 2; // +2 because: +1 for 0-based to 1-based, +1 for header row

        // Update status
        if (statusColumnIndex !== -1) {
            const statusCell = `${String.fromCharCode(65 + statusColumnIndex)}${actualRowIndex}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: statusCell,
                valueInputOption: 'RAW',
                resource: {
                    values: [[newStatus]]
                }
            });
        }

        // Update tracking number if provided
        if (trackingNumber && trackingColumnIndex !== -1) {
            const trackingCell = `${String.fromCharCode(65 + trackingColumnIndex)}${actualRowIndex}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: trackingCell,
                valueInputOption: 'RAW',
                resource: {
                    values: [[trackingNumber]]
                }
            });
        }

        // Update timestamp
        if (updatedAtColumnIndex !== -1) {
            const updatedAtCell = `${String.fromCharCode(65 + updatedAtColumnIndex)}${actualRowIndex}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: updatedAtCell,
                valueInputOption: 'RAW',
                resource: {
                    values: [[new Date().toISOString()]]
                }
            });
        }

        return {
            success: true,
            orderId,
            newStatus,
            trackingNumber,
            updatedAt: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error updating order status in sheets:', error);
        throw error;
    }
};

// Sync order data between different sources
export const syncOrderData = async (orderId = null) => {
    try {
        const orders = await fetchOrdersFromSheets();
        
        if (orderId) {
            return orders.find(order => order.orderId === orderId);
        }
        
        return orders;
    } catch (error) {
        console.error('Error syncing order data:', error);
        throw error;
    }
};

// Get order statistics
export const getOrderStatistics = async () => {
    try {
        const orders = await fetchOrdersFromSheets();
        
        const today = new Date().toDateString();
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();

        const stats = orders.reduce((acc, order) => {
            const orderDate = new Date(order.orderDate || order.createdAt);
            
            // Count by status
            acc.byStatus[order.status] = (acc.byStatus[order.status] || 0) + 1;
            
            // Today's orders
            if (orderDate.toDateString() === today) {
                acc.today.count += 1;
                acc.today.revenue += order.total;
            }
            
            // This month's orders
            if (orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear) {
                acc.thisMonth.count += 1;
                acc.thisMonth.revenue += order.total;
            }
            
            // Total revenue (excluding cancelled orders)
            if (order.status !== 'cancelled') {
                acc.totalRevenue += order.total;
            }
            
            acc.totalOrders += 1;
            
            return acc;
        }, {
            totalOrders: 0,
            totalRevenue: 0,
            byStatus: {},
            today: { count: 0, revenue: 0 },
            thisMonth: { count: 0, revenue: 0 }
        });

        return stats;
    } catch (error) {
        console.error('Error getting order statistics:', error);
        throw error;
    }
};

// Export functions for external use
export default {
    fetchOrdersFromSheets,
    updateOrderStatusInSheets,
    syncOrderData,
    getOrderStatistics
};