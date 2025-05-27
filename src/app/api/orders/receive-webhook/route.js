// Inventory App: /pages/api/orders/receive-webhook.js
// Receives order notifications from store front app

import crypto from 'crypto';
import { WEBHOOK_CONFIG, WEBSOCKET_CONFIG } from '../../../lib/websocket-config';
import { broadcastToRoom } from '../../../lib/websocket-server';

// Verify webhook signature
const verifySignature = (payload, signature, secret) => {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
    );
};

// Transform order data for inventory app format
const transformOrderData = (storeOrderData) => {
    return {
        id: storeOrderData.orderId,
        orderId: storeOrderData.orderId,
        userId: storeOrderData.userId,
        customerName: `${storeOrderData.customer.firstName} ${storeOrderData.customer.lastName}`,
        customerEmail: storeOrderData.customer.email,
        customerPhone: storeOrderData.customer.phoneNumber,
        shippingAddress: `${storeOrderData.customer.address}, ${storeOrderData.customer.city}, ${storeOrderData.customer.state}`,
        orderDate: storeOrderData.createdAt || new Date().toISOString(),
        status: storeOrderData.status || 'pending',
        paymentMethod: storeOrderData.paymentMethod,
        paymentStatus: 'pending', // Default status
        total: storeOrderData.totalAmount,
        shippingFee: storeOrderData.shippingFee || 0,
        currency: storeOrderData.currency || 'NGN',
        items: storeOrderData.items.map(item => ({
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl || '',
            sku: item.sku || ''
        })),
        notes: storeOrderData.customer.additionalInfo || '',
        trackingNumber: '',
        isAuthenticated: storeOrderData.isAuthenticated || false,
        isGuestCheckout: storeOrderData.isGuestCheckout || false,
        createdAt: storeOrderData.createdAt || new Date().toISOString(),
        updatedAt: storeOrderData.createdAt || new Date().toISOString()
    };
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verify webhook signature
        const signature = req.headers['x-webhook-signature'];
        const rawBody = JSON.stringify(req.body);

        if (!signature) {
            return res.status(401).json({ error: 'Missing webhook signature' });
        }

        if (!verifySignature(rawBody, signature, WEBHOOK_CONFIG.WEBHOOK_SECRET)) {
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        const { event, data, timestamp } = req.body;

        // Validate webhook payload
        if (!event || !data) {
            return res.status(400).json({ error: 'Invalid webhook payload' });
        }

        // Check if webhook is not too old (prevent replay attacks)
        const webhookAge = Date.now() - new Date(timestamp).getTime();
        if (webhookAge > 300000) { // 5 minutes
            return res.status(400).json({ error: 'Webhook too old' });
        }

        console.log(`Received webhook event: ${event}`, data);

        switch (event) {
            case 'new_order':
                await handleNewOrder(data);
                break;
            
            default:
                console.log(`Unknown webhook event: ${event}`);
                return res.status(400).json({ error: 'Unknown event type' });
        }

        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            event,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}

// Handle new order webhook
async function handleNewOrder(orderData) {
    try {
        // Transform the order data to match inventory app format
        const transformedOrder = transformOrderData(orderData);

        console.log('Processing new order:', transformedOrder.orderId);

        // Broadcast new order to all connected inventory admin clients
        const wsPayload = {
            type: WEBSOCKET_CONFIG.EVENTS.NEW_ORDER,
            data: transformedOrder,
            timestamp: new Date().toISOString()
        };

        // Broadcast to inventory admin room
        broadcastToRoom(WEBSOCKET_CONFIG.ROOMS.INVENTORY_ADMIN, wsPayload);

        console.log('New order broadcasted to inventory admin clients');

        // Optional: You can also save to database here if needed
        // await saveOrderToDatabase(transformedOrder);

        return { success: true };

    } catch (error) {
        console.error('Error handling new order:', error);
        throw error;
    }
}