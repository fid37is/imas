// app/api/webhooks/order-notifications/route.js
import crypto from 'crypto';
import { broadcastToSSEClients } from '../../../../lib/sse-manager';

// Get webhook secret from environment variables
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-secure-webhook-secret';

// Verify webhook signature
function verifySignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
    );
}

export async function POST(request) {
    try {
        // Get the raw body
        const body = await request.text();
        const signature = request.headers.get('x-webhook-signature');

        console.log('=== WEBHOOK RECEIVED ===');
        console.log('Body length:', body.length);
        console.log('Signature:', signature);
        console.log('Body preview:', body.substring(0, 200));

        // Verify signature if present
        if (signature && WEBHOOK_SECRET) {
            if (!verifySignature(body, signature, WEBHOOK_SECRET)) {
                console.error('Invalid webhook signature');
                return NextResponse.json(
                    { error: 'Invalid signature' },
                    { status: 401 }
                );
            }
            console.log('✅ Signature verified');
        } else if (WEBHOOK_SECRET) {
            console.warn('⚠️ Webhook secret configured but no signature provided');
        }

        // Parse the JSON payload
        let payload;
        try {
            payload = JSON.parse(body);
        } catch (error) {
            console.error('Invalid JSON payload:', error);
            return NextResponse.json(
                { error: 'Invalid JSON payload' },
                { status: 400 }
            );
        }

        // Process the notification
        const { event, data, timestamp } = payload;

        console.log('Processing event:', event);
        console.log('Order data:', data);

        // Format the notification for the inventory app
        const notification = {
            type: 'NEW_ORDER',
            event,
            timestamp: timestamp || new Date().toISOString(),
            orderId: data.orderId,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            total: data.total,
            status: data.status || 'pending',
            items: data.items || [],
            shippingAddress: data.shippingAddress,
            paymentMethod: data.paymentMethod,
            orderData: data
        };

        // Broadcast to all SSE connections
        const activeConnections = broadcastToSSEClients(notification);

        // Here you could also:
        // 1. Store the notification in a database
        // 2. Send email notifications
        // 3. Update inventory counts
        // 4. Trigger other business logic

        console.log('✅ Webhook processed successfully');
        console.log(`📡 Broadcasted to ${activeConnections} connections`);

        return NextResponse.json({
            success: true,
            message: 'Webhook processed successfully',
            activeConnections,
            orderId: data.orderId
        });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { 
                error: 'Internal server error',
                message: error.message 
            },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Signature',
        },
    });
}