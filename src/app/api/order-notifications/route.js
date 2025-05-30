/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/order-notifications/route.js
import { NextRequest, NextResponse } from 'next/server';
import { addSSEConnection, removeSSEConnection } from '../../../lib/sse-manager';

export async function GET(request) {
    // Create a readable stream for SSE
    const stream = new ReadableStream({
        start(controller) {
            const connectionId = Date.now().toString();
            
            // Send initial connection message
            const initialMessage = `data: ${JSON.stringify({ 
                type: 'connected', 
                message: 'Connected to order notifications',
                connectionId 
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(initialMessage));
            
            // Store connection
            addSSEConnection(connectionId, controller);
            
            // Send heartbeat every 30 seconds
            const heartbeat = setInterval(() => {
                try {
                    const heartbeatMessage = `data: ${JSON.stringify({ 
                        type: 'heartbeat', 
                        timestamp: Date.now() 
                    })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(heartbeatMessage));
                } catch (error) {
                    console.error('Heartbeat error:', error);
                    clearInterval(heartbeat);
                    removeSSEConnection(connectionId);
                }
            }, 30000);
            
            // Clean up on close
            request.signal.addEventListener('abort', () => {
                clearInterval(heartbeat);
                removeSSEConnection(connectionId);
                console.log(`SSE connection ${connectionId} closed`);
                try {
                    controller.close();
                } catch (error) {
                    // Connection already closed
                }
            });
        }
    });
    
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        },
    });
}