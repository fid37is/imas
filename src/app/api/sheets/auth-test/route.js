import { NextResponse } from 'next/server';
import { google } from 'googleapis';

// Simple authentication test endpoint
export async function GET() {
    try {
        let auth;
        let authSource = '';

        // Try base64 first
        if (process.env.GOOGLE_CREDENTIALS_B64) {
            try {
                authSource = 'base64';
                const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf-8');
                const credentials = JSON.parse(decoded);

                auth = new google.auth.JWT(
                    credentials.client_email,
                    null,
                    credentials.private_key,
                    ['https://www.googleapis.com/auth/spreadsheets']
                );
            } catch (e) {
                console.error('Error with base64 credentials:', e);
                throw new Error(`Base64 credentials error: ${e.message}`);
            }
        }
        // Fall back to individual variables
        else {
            try {
                authSource = 'individual vars';
                const client_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
                const private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

                if (!client_email || !private_key) {
                    throw new Error(`Missing credentials: email=${!!client_email}, key=${!!private_key}`);
                }

                auth = new google.auth.JWT(
                    client_email,
                    null,
                    private_key,
                    ['https://www.googleapis.com/auth/spreadsheets']
                );
            } catch (e) {
                console.error('Error with individual credentials:', e);
                throw new Error(`Individual credentials error: ${e.message}`);
            }
        }

        // Test the auth by authorizing
        await new Promise((resolve, reject) => {
            auth.authorize((err, tokens) => {
                if (err) {
                    console.error('Auth test failed:', err);
                    reject(err);
                } else {
                    resolve(tokens);
                }
            });
        });

        // If we made it here, auth worked
        return NextResponse.json({
            success: true,
            message: `Authentication successful using ${authSource}`,
            email: authSource === 'base64' ?
                'From base64 (redacted for security)' :
                process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        }, { status: 200 });

    } catch (error) {
        console.error('Auth test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}