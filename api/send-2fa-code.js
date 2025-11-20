/**
 * Vercel Serverless Function: Send 2FA Code via Bulk SMS
 *
 * Environment Variables Required:
 * - BULK_SMS_API_KEY: Your Bulk SMS API key
 * - BULK_SMS_SENDER_ID: Your sender ID
 */

// In-memory store for verification codes (use Redis in production)
const verificationStore = new Map();

// Generate 6-digit code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { phoneNumber, userId } = req.body;

        // Validate input
        if (!phoneNumber || !userId) {
            return res.status(400).json({ error: 'Phone number and user ID are required' });
        }

        // Validate phone number format (should start with country code)
        const phoneRegex = /^\+?\d{10,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Check environment variables
        const apiKey = process.env.BULK_SMS_API_KEY;
        const senderId = process.env.BULK_SMS_SENDER_ID;

        if (!apiKey || !senderId) {
            console.error('Missing environment variables');
            return res.status(500).json({ error: 'SMS service not configured' });
        }

        // Generate verification code
        const code = generateCode();
        const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes expiry

        // Store code with user ID
        verificationStore.set(userId, {
            code,
            phoneNumber,
            expiresAt,
            attempts: 0
        });

        // Clean up expired codes (simple cleanup)
        for (const [key, value] of verificationStore.entries()) {
            if (value.expiresAt < Date.now()) {
                verificationStore.delete(key);
            }
        }

        // Prepare SMS message
        const message = `Your gigsplan verification code is: ${code}. Valid for 5 minutes. Do not share this code.`;

        // Format phone number (remove + if present)
        const formattedPhone = phoneNumber.replace('+', '');

        // Send SMS via Bulk SMS Ghana API
        const smsUrl = `https://clientlogin.bulksmsgh.com/smsapi?key=${encodeURIComponent(apiKey)}&to=${encodeURIComponent(formattedPhone)}&msg=${encodeURIComponent(message)}&sender_id=${encodeURIComponent(senderId)}`;

        const smsResponse = await fetch(smsUrl);
        const smsResult = await smsResponse.text();

        console.log('SMS API Response:', smsResult);

        // Check if SMS was sent successfully
        // Bulk SMS Ghana typically returns success codes like "1701" or "OK"
        if (smsResult.includes('1701') || smsResult.includes('OK') || smsResponse.ok) {
            return res.status(200).json({
                success: true,
                message: 'Verification code sent successfully',
                expiresIn: 300 // 5 minutes in seconds
            });
        } else {
            console.error('SMS sending failed:', smsResult);
            return res.status(500).json({
                error: 'Failed to send SMS',
                details: smsResult
            });
        }

    } catch (error) {
        console.error('Error sending 2FA code:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
