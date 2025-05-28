import crypto from 'crypto';
import { broadcastToRoom } from '../../../../lib/websocket-server';

// FIXED: Proper webhook config
const WEBHOOK_CONFIG = {
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your-webhook-secret'
};

const WEBSOCKET_CONFIG = {
    EVENTS: {
        NEW_ORDER: 'new_order',
        ORDER_STATUS_UPDATE: 'order_status_update'
    },
    ROOMS: {
        INVENTORY_ADMIN: 'inventory_admin'
    }
};

// FIXED: Verify webhook signature with proper error handling
const verifySignature = (payload, signature, secret) => {
    try {
        if (!signature || !signature.startsWith('sha256=')) {
            console.error('Invalid signature format');
            return false;
        }

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload, 'utf8')
            .digest('hex');
        
        const providedSignature = signature.replace('sha256=', '');
        
        // FIXED: Ensure both buffers are the same length
        if (expectedSignature.length !== providedSignature.length) {
            console.error('Signature length mismatch');
            return false;
        }
        
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
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
        paymentStatus: 'pending',
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

// Handle new order webhook
async function handleNewOrder(orderData) {
    try {
        console.log('=== HANDLING NEW ORDER ===');
        console.log('Order data received:', orderData);

        // Transform the order data to match inventory app format
        const transformedOrder = transformOrderData(orderData);
        console.log('Transformed order:', transformedOrder);

        // FIXED: Use the actual WebSocket server implementation
        const wsPayload = {
            type: WEBSOCKET_CONFIG.EVENTS.NEW_ORDER,
            data: transformedOrder,
            timestamp: new Date().toISOString()
        };

        console.log('Broadcasting to inventory admin clients:', wsPayload);

        // FIXED: Broadcast to inventory admin room using the imported function
        const broadcastSuccess = broadcastToRoom(WEBSOCKET_CONFIG.ROOMS.INVENTORY_ADMIN, wsPayload);
        
        if (!broadcastSuccess) {
            console.warn('Failed to broadcast to WebSocket clients (server may not be initialized)');
        }

        console.log('✅ New order processed successfully:', transformedOrder.orderId);

        return { success: true };

    } catch (error) {
        console.error('❌ Error handling new order:', error);
        throw error;
    }
}

// APP ROUTER: Export POST function
export async function POST(request) {
    console.log('=== WEBHOOK RECEIVED ===');
    
    try {
        // FIXED: Get raw body text first for signature verification
        const bodyText = await request.text();
        const body = JSON.parse(bodyText);
        
        console.log('Request body:', body);
        
        // Get headers
        const headers = request.headers;
        const signature = headers.get('x-webhook-signature') || headers.get('x-signature');
        
        console.log('Headers:', Object.fromEntries(headers.entries()));
        console.log('Signature:', signature);

        if (!signature) {
            console.error('Missing webhook signature');
            return Response.json(
                { error: 'Missing webhook signature' }, 
                { status: 401 }
            );
        }

        // FIXED: Verify signature using raw body text
        if (!verifySignature(bodyText, signature, WEBHOOK_CONFIG.WEBHOOK_SECRET)) {
            console.error('Invalid webhook signature');
            return Response.json(
                { error: 'Invalid webhook signature' }, 
                { status: 401 }
            );
        }

        const { event, data, timestamp } = body;

        // Validate webhook payload
        if (!event || !data) {
            console.error('Invalid webhook payload - missing event or data');
            return Response.json(
                { error: 'Invalid webhook payload' }, 
                { status: 400 }
            );
        }

        // Check if webhook is not too old (prevent replay attacks)
        if (timestamp) {
            const webhookAge = Date.now() - new Date(timestamp).getTime();
            if (webhookAge > 300000) { // 5 minutes
                console.error('Webhook too old:', webhookAge);
                return Response.json(
                    { error: 'Webhook too old' }, 
                    { status: 400 }
                );
            }
        }

        console.log(`Processing webhook event: ${event}`);

        switch (event) {
            case 'new_order':
                await handleNewOrder(data);
                break;
            
            default:
                console.log(`Unknown webhook event: ${event}`);
                return Response.json(
                    { error: 'Unknown event type' }, 
                    { status: 400 }
                );
        }

        console.log('Webhook processed successfully');
        return Response.json({
            success: true,
            message: 'Webhook processed successfully',
            event,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return Response.json({
            success: false,
            error: 'Internal server error',
            message: error.message
        }, { status: 500 });
    }
}

// Optional: Export other HTTP methods if needed
export async function GET() {
    return Response.json({ message: 'Webhook endpoint is healthy' });
}