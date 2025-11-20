/**
 * Vercel Serverless Function: Verify 2FA Code
 *
 * This endpoint verifies the code entered by the user
 */

// In-memory store (must match the one in send-2fa-code.js)
// In production, use Redis or a database
const verificationStore = new Map();

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
        const { code, userId } = req.body;

        // Validate input
        if (!code || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Code and user ID are required'
            });
        }

        // Validate code format (6 digits)
        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid code format'
            });
        }

        // Get stored verification data
        const storedData = verificationStore.get(userId);

        if (!storedData) {
            return res.status(400).json({
                success: false,
                error: 'No verification code found. Please request a new code.'
            });
        }

        // Check if code is expired
        if (Date.now() > storedData.expiresAt) {
            verificationStore.delete(userId);
            return res.status(400).json({
                success: false,
                error: 'Verification code has expired. Please request a new code.'
            });
        }

        // Check attempts (max 3 attempts)
        if (storedData.attempts >= 3) {
            verificationStore.delete(userId);
            return res.status(400).json({
                success: false,
                error: 'Too many failed attempts. Please request a new code.'
            });
        }

        // Verify code
        if (storedData.code === code) {
            // Code is correct - remove from store
            verificationStore.delete(userId);

            return res.status(200).json({
                success: true,
                message: 'Code verified successfully',
                phoneNumber: storedData.phoneNumber
            });
        } else {
            // Incorrect code - increment attempts
            storedData.attempts += 1;
            verificationStore.set(userId, storedData);

            const remainingAttempts = 3 - storedData.attempts;

            return res.status(400).json({
                success: false,
                error: `Incorrect code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
                remainingAttempts
            });
        }

    } catch (error) {
        console.error('Error verifying 2FA code:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}
