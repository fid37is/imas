// Inventory App: /pages/api/orders/list.js
import OrderSync from '../../../lib/order-sync';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { status, limit, offset } = req.query;

        // Fetch all orders from Google Sheets
        let orders = await OrderSync.fetchAllOrders();

        // Filter by status if provided
        if (status && status !== 'all') {
            orders = orders.filter(order => order.status === status);
        }

        // Apply pagination if provided
        const totalOrders = orders.length;
        if (limit) {
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset) || 0;
            orders = orders.slice(offsetNum, offsetNum + limitNum);
        }

        res.status(200).json({
            success: true,
            data: {
                orders,
                total: totalOrders,
                count: orders.length
            }
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}