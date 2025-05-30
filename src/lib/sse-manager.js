// lib/sse-manager.js
// Store active SSE connections globally (use Redis in production)
if (!global.sseConnections) {
    global.sseConnections = new Map();
}

// Function to broadcast to all SSE connections
export function broadcastToSSEClients(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encodedMessage = new TextEncoder().encode(message);
    
    let activeConnections = 0;
    
    global.sseConnections.forEach((controller, connectionId) => {
        try {
            controller.enqueue(encodedMessage);
            activeConnections++;
        } catch (error) {
            console.error(`Failed to send to connection ${connectionId}:`, error);
            global.sseConnections.delete(connectionId);
        }
    });
    
    console.log(`Broadcasted to ${activeConnections} SSE connections`);
    return activeConnections;
}

// Function to add a new SSE connection
export function addSSEConnection(connectionId, controller) {
    global.sseConnections.set(connectionId, controller);
}

// Function to remove an SSE connection
export function removeSSEConnection(connectionId) {
    global.sseConnections.delete(connectionId);
}

// Function to get connection count
export function getActiveConnectionCount() {
    return global.sseConnections.size;
}