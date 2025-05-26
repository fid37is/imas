    // utils/emailService.js - Enhanced for Inventory App
import nodemailer from 'nodemailer';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
const logoUrl = `${baseUrl}/logo-2.png`;

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
    console.log('Creating email transporter with config:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER ? 'configured' : 'missing',
        pass: process.env.SMTP_PASS ? 'configured' : 'missing'
    });

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Missing required email environment variables: SMTP_HOST, SMTP_USER, SMTP_PASS');
    }

    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: parseInt(process.env.SMTP_PORT, 10) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
    });
};

// Test transporter configuration
export const testEmailConnection = async () => {
    try {
        const transporter = createTransporter();
        console.log('Testing email connection...');

        const result = await transporter.verify();
        console.log('Email connection test result:', result);
        return { success: true, result };
    } catch (error) {
        console.error('Email connection test failed:', error);
        return { success: false, error: error.message };
    }
};

// Generate order confirmation email HTML
const generateOrderConfirmationHTML = (orderDetails) => {
    const {
        orderId,
        items,
        shippingDetails,
        paymentMethod,
        total,
        shippingFee,
        orderDate
    } = orderDetails;

    const subtotal = total - shippingFee;
    const formattedDate = new Date(orderDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const paymentMethodDisplay = {
        'pay_on_delivery': 'Pay on Delivery',
        'pay_at_pickup': 'Pay at Pickup',
        'bank_transfer': 'Bank Transfer',
        'card': 'Card Payment'
    };

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ToolUp Store</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8f9fa;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #FFBE00 0%, #001D47 40%, #0B61DE 100%);
                color: white;
                padding: 30px 20px;
                display: flex;
                align-items: center;
                gap: 20px;
                text-align: center;
            }
            .header .logo {
                margin-bottom: 0;
                flex-shrink: 0;
            }
            .header .logo img {
                max-height: 80px;
                max-width: 200px;
                height: auto;
                width: auto;
                display: block;
            }
            .header-text h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 300;
            }
            .header-text p {
                margin: 5px 0 0;
                font-size: 16px;
            }
            .content {
                padding: 30px 20px;
            }
            .order-info {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 25px;
            }
            .order-info h2 {
                margin-top: 0;
                color: #495057;
                font-size: 20px;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                padding-bottom: 5px;
            }
            .info-label {
                font-weight: 600;
                color: #6c757d;
            }
            .info-value {
                color: #495057;
            }
            .items-section {
                margin-bottom: 25px;
            }
            .items-section h3 {
                color: #495057;
                border-bottom: 2px solid #e9ecef;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            .item {
                display: flex;
                align-items: center;
                padding: 15px 0;
                border-bottom: 1px solid #e9ecef;
            }
            .item:last-child {
                border-bottom: none;
            }
            .item-image {
                width: 60px;
                height: 60px;
                background-color: #f8f9fa;
                border-radius: 8px;
                margin-right: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #6c757d;
            }
            .item-details {
                flex: 1;
            }
            .item-name {
                font-weight: 600;
                color: #495057;
                margin-bottom: 5px;
            }
            .item-price {
                color: #6c757d;
                font-size: 14px;
            }
            .item-quantity {
                color: #495057;
                font-weight: 500;
                margin-left: 15px;
            }
            .summary-section {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 25px;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            .summary-row.total {
                border-top: 2px solid #dee2e6;
                padding-top: 15px;
                margin-top: 15px;
                font-weight: 700;
                font-size: 18px;
                color: #495057;
            }
            .shipping-section {
                background-color: #e3f2fd;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 25px;
            }
            .shipping-section h3 {
                margin-top: 0;
                color: #1565c0;
            }
            .address {
                color: #424242;
                line-height: 1.5;
            }
            .footer {
                background-color: #495057;
                color: white;
                padding: 20px;
                text-align: center;
            }
            .footer p {
                margin: 5px 0;
                font-size: 14px;
            }
            .success-badge {
                background-color: #d4edda;
                color: #155724;
                padding: 10px 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                text-align: center;
                font-weight: 500;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                    <img src="${logoUrl}" alt="ToolUp Store Logo" style="max-width:150px;display:block;margin:0 auto;">
                </div>
                <div class="header-text">
                    <h1>Order Confirmation</h1>
                    <p>Thank you for your purchase!</p>
                </div>
            </div>
            
            <div class="content">
                <div class="success-badge">
                    ✅ Your order has been successfully placed!
                </div>
                
                <div class="order-info">
                    <h2>Order Details</h2>
                    <div class="info-row">
                        <span class="info-label">Order ID:</span>
                        <span class="info-value">${orderId}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Order Date:</span>
                        <span class="info-value">${formattedDate}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Payment Method:</span>
                        <span class="info-value">${paymentMethodDisplay[paymentMethod] || paymentMethod}</span>
                    </div>
                </div>

                <div class="items-section">
                    <h3>Order Items</h3>
                    ${items.map(item => `
                        <div class="item">
                            <div class="item-image">
                                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">` : 'No Image'}
                            </div>
                            <div class="item-details">
                                <div class="item-name">${item.name}</div>
                                <div class="item-price">₦${item.price.toLocaleString()}</div>
                            </div>
                            <div class="item-quantity">Qty: ${item.quantity}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="summary-section">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>₦${subtotal.toLocaleString()}</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping Fee:</span>
                        <span>${shippingFee === 0 ? 'Free' : `₦${shippingFee.toLocaleString()}`}</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total:</span>
                        <span>₦${total.toLocaleString()}</span>
                    </div>
                </div>

                ${paymentMethod !== 'pay_at_pickup' ? `
                <div class="shipping-section">
                    <h3>Shipping Address</h3>
                    <div class="address">
                        <strong>${shippingDetails.fullName}</strong><br>
                        ${shippingDetails.address}<br>
                        ${shippingDetails.city ? `${shippingDetails.city}, ` : ''}${shippingDetails.lga}<br>
                        ${shippingDetails.state}<br>
                        Phone: ${shippingDetails.phone}<br>
                        Email: ${shippingDetails.email}
                        ${shippingDetails.additionalInfo ? `<br><br><em>Additional Info: ${shippingDetails.additionalInfo}</em>` : ''}
                    </div>
                </div>
                ` : `
                <div class="shipping-section">
                    <h3>Pickup Information</h3>
                    <div class="address">
                        <strong>${shippingDetails.fullName}</strong><br>
                        Phone: ${shippingDetails.phone}<br>
                        Email: ${shippingDetails.email}<br><br>
                        <em>Please visit our store to collect your order. We'll contact you when it's ready for pickup.</em>
                    </div>
                </div>
                `}

                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
                    <h4 style="margin-top: 0; color: #856404;">What's Next?</h4>
                    <ul style="color: #856404; margin-bottom: 0;">
                        <li>You'll receive updates about your order status via email</li>
                        <li>Our team will process your order within 24 hours</li>
                        ${paymentMethod === 'bank_transfer' ? '<li>Please complete your bank transfer as instructed</li>' : ''}
                        ${paymentMethod === 'pay_at_pickup' ? '<li>We\'ll notify you when your order is ready for pickup</li>' : '<li>Your order will be shipped to the provided address</li>'}
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>ToolUp Store</strong></p>
                <p>Thank you for choosing us!</p>
                <p>For any questions, contact us at support@toolupstore.com</p>
            </div>
        </div>
    </body>
    </html>
`;
};

// Generate order status update email HTML
const generateOrderStatusHTML = (orderDetails, newStatus) => {
    const statusConfig = {
        'processing': {
            title: 'Order Being Processed',
            message: 'Your order is currently being prepared',
            icon: '⚙️',
            color: '#ffc107',
            description: 'Our team is carefully preparing your items for shipment.'
        },
        'shipped': {
            title: 'Order Shipped',
            message: 'Your order is on its way',
            icon: '🚚',
            color: '#17a2b8',
            description: 'Your order has been shipped and is on its way to you!'
        },
        'delivered': {
            title: 'Order Delivered',
            message: 'Your order has been delivered',
            icon: '✅',
            color: '#28a745',
            description: 'Your order has been successfully delivered. We hope you enjoy your purchase!'
        },
        'cancelled': {
            title: 'Order Cancelled',
            message: 'Your order has been cancelled',
            icon: '❌',
            color: '#dc3545',
            description: 'Your order has been cancelled. If you have any questions, please contact our support team.'
        },
        'ready_for_pickup': {
            title: 'Ready for Pickup',
            message: 'Your order is ready for collection',
            icon: '📦',
            color: '#6f42c1',
            description: 'Your order is ready for pickup at our store. Please bring a valid ID.'
        }
    };

    const status = statusConfig[newStatus] || {
        title: 'Order Status Update',
        message: `Order status updated to: ${newStatus}`,
        icon: '📋',
        color: '#6c757d',
        description: 'Your order status has been updated.'
    };

    const formattedDate = new Date(orderDetails.orderDate || new Date()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Update - ToolUp Store</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f8f9fa;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                background: linear-gradient(135deg, #FFBE00 0%, #001D47 40%, #0B61DE 100%);
                color: white;
                padding: 30px 20px;
                text-align: center;
            }
            .header .logo img {
                max-height: 60px;
                margin-bottom: 15px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 300;
            }
            .content {
                padding: 30px 20px;
            }
            .status-badge {
                background-color: ${status.color};
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 25px;
            }
            .status-icon {
                font-size: 48px;
                margin-bottom: 10px;
                display: block;
            }
            .status-title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 5px;
            }
            .status-message {
                font-size: 16px;
                margin-bottom: 10px;
            }
            .status-description {
                font-size: 14px;
                opacity: 0.9;
            }
            .order-summary {
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 25px;
            }
            .order-summary h3 {
                margin-top: 0;
                color: #495057;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 5px;
            }
            .summary-label {
                font-weight: 600;
                color: #6c757d;
            }
            .summary-value {
                color: #495057;
            }
            .tracking-info {
                background-color: #e3f2fd;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 25px;
            }
            .tracking-info h3 {
                margin-top: 0;
                color: #1565c0;
            }
            .footer {
                background-color: #495057;
                color: white;
                padding: 20px;
                text-align: center;
            }
            .footer p {
                margin: 5px 0;
                font-size: 14px;
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="${logoUrl}" alt="ToolUp Store Logo" style="max-width:150px;">
                <h1>Order Status Update</h1>
            </div>
            
            <div class="content">
                <div class="status-badge" style="background-color: ${status.color};">
                    <span class="status-icon">${status.icon}</span>
                    <div class="status-title">${status.title}</div>
                    <div class="status-message">${status.message}</div>
                    <div class="status-description">${status.description}
                    </div>
                </div>
                
                <div class="order-summary">
                    <h3>Order Summary</h3>
                    <div class="summary-row">
                        <span class="summary-label">Order ID:</span>
                        <span class="summary-value">${orderDetails.orderId}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Order Date:</span>
                        <span class="summary-value">${formattedDate}</span>
                    </div>
                    ${orderDetails.total ? `
                    <div class="summary-row">
                        <span class="summary-label">Total Amount:</span>
                        <span class="summary-value">₦${orderDetails.total.toLocaleString()}</span>
                    </div>
                    ` : ''}
                </div>

                ${newStatus === 'shipped' && orderDetails.trackingNumber ? `
                <div class="tracking-info">
                    <h3>📦 Tracking Information</h3>
                    <p><strong>Tracking Number:</strong> ${orderDetails.trackingNumber}</p>
                    <p>You can track your package using the tracking number provided above.</p>
                    <a href="#" class="button">Track Your Package</a>
                </div>
                ` : ''}

                ${newStatus === 'ready_for_pickup' ? `
                <div class="tracking-info">
                    <h3>🏪 Pickup Instructions</h3>
                    <p><strong>Store Address:</strong> Your Store Address Here</p>
                    <p><strong>Store Hours:</strong> Monday - Saturday: 9:00 AM - 6:00 PM</p>
                    <p><strong>What to Bring:</strong> Valid ID and this email confirmation</p>
                    <p>Please call us at [Your Phone Number] if you have any questions about pickup.</p>
                </div>
                ` : ''}

                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">
                    <p style="margin: 0; color: #6c757d;">
                        Questions about your order? 
                        <a href="mailto:support@toolupstore.com" style="color: #007bff;">Contact our support team</a>
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>ToolUp Store</strong></p>
                <p>Thank you for choosing us!</p>
                <p>For any questions, contact us at support@toolupstore.com</p>
            </div>
        </div>
    </body>
    </html>
`;
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async (orderDetails) => {
    try {
        console.log('Preparing order confirmation email for:', orderDetails.shippingDetails.email);

        const transporter = createTransporter();
        const htmlContent = generateOrderConfirmationHTML(orderDetails);

        const mailOptions = {
            from: `"ToolUp Store" <${process.env.SMTP_USER}>`,
            to: orderDetails.shippingDetails.email,
            subject: `Order Confirmation - ${orderDetails.orderId}`,
            html: htmlContent,
            attachments: []
        };

        console.log('Sending order confirmation email...');
        const result = await transporter.sendMail(mailOptions);
        
        console.log('Order confirmation email sent successfully:', result.messageId);
        return { 
            success: true, 
            messageId: result.messageId,
            recipient: orderDetails.shippingDetails.email 
        };

    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        return { 
            success: false, 
            error: error.message,
            recipient: orderDetails.shippingDetails?.email 
        };
    }
};

// Send order status update email
export const sendOrderStatusEmail = async (orderDetails, newStatus) => {
    try {
        console.log(`Preparing order status email for: ${orderDetails.customerEmail}, Status: ${newStatus}`);

        const transporter = createTransporter();
        const htmlContent = generateOrderStatusHTML(orderDetails, newStatus);

        const statusTitles = {
            'processing': 'Order Processing',
            'shipped': 'Order Shipped',
            'delivered': 'Order Delivered',
            'cancelled': 'Order Cancelled',
            'ready_for_pickup': 'Order Ready for Pickup'
        };

        const subjectTitle = statusTitles[newStatus] || 'Order Status Update';

        const mailOptions = {
            from: `"ToolUp Store" <${process.env.SMTP_USER}>`,
            to: orderDetails.customerEmail,
            subject: `${subjectTitle} - ${orderDetails.orderId}`,
            html: htmlContent,
            attachments: []
        };

        console.log('Sending order status email...');
        const result = await transporter.sendMail(mailOptions);
        
        console.log('Order status email sent successfully:', result.messageId);
        return { 
            success: true, 
            messageId: result.messageId,
            recipient: orderDetails.customerEmail,
            status: newStatus
        };

    } catch (error) {
        console.error('Error sending order status email:', error);
        return { 
            success: false, 
            error: error.message,
            recipient: orderDetails.customerEmail,
            status: newStatus
        };
    }
};

// Send low stock alert email
export const sendLowStockAlert = async (items, recipientEmail = process.env.ADMIN_EMAIL) => {
    try {
        if (!recipientEmail) {
            console.warn('No admin email configured for low stock alerts');
            return { success: false, error: 'No recipient email configured' };
        }

        console.log('Preparing low stock alert email for:', recipientEmail);

        const transporter = createTransporter();
        
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Low Stock Alert - ToolUp Store</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
                .item { background-color: white; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545; }
                .item-name { font-weight: bold; color: #495057; }
                .item-details { color: #6c757d; font-size: 14px; margin-top: 5px; }
                .footer { background-color: #495057; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Low Stock Alert</h1>
                    <p>The following items are running low on stock</p>
                </div>
                <div class="content">
                    ${items.map(item => `
                        <div class="item">
                            <div class="item-name">${item.name}</div>
                            <div class="item-details">
                                Current Stock: ${item.quantity} units<br>
                                Threshold: ${item.lowStockThreshold} units<br>
                                SKU: ${item.sku || 'N/A'}<br>
                                Category: ${item.category || 'N/A'}
                            </div>
                        </div>
                    `).join('')}
                    <div style="margin-top: 20px; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
                        <strong>Action Required:</strong> Please restock these items to avoid stockouts.
                    </div>
                </div>
                <div class="footer">
                    <p>ToolUp Store Inventory Management System</p>
                    <p>Generated on ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const mailOptions = {
            from: `"ToolUp Store System" <${process.env.SMTP_USER}>`,
            to: recipientEmail,
            subject: `🚨 Low Stock Alert - ${items.length} items need restocking`,
            html: htmlContent
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Low stock alert email sent successfully:', result.messageId);
        
        return { 
            success: true, 
            messageId: result.messageId,
            itemCount: items.length 
        };

    } catch (error) {
        console.error('Error sending low stock alert email:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
};

// Send bulk notification email
export const sendBulkNotificationEmail = async (recipients, subject, htmlContent) => {
    try {
        const transporter = createTransporter();
        const results = [];

        for (const recipient of recipients) {
            try {
                const mailOptions = {
                    from: `"ToolUp Store" <${process.env.SMTP_USER}>`,
                    to: recipient,
                    subject: subject,
                    html: htmlContent
                };

                const result = await transporter.sendMail(mailOptions);
                results.push({ 
                    recipient, 
                    success: true, 
                    messageId: result.messageId 
                });

                // Add small delay between emails to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`Failed to send email to ${recipient}:`, error);
                results.push({ 
                    recipient, 
                    success: false, 
                    error: error.message 
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`Bulk email completed: ${successCount}/${recipients.length} sent successfully`);

        return {
            success: successCount > 0,
            results,
            successCount,
            totalCount: recipients.length
        };

    } catch (error) {
        console.error('Error in bulk email sending:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
};