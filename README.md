# 2FA API Endpoints

This folder contains Vercel serverless functions for handling 2FA via Bulk SMS Ghana.

## Endpoints

### 1. Send 2FA Code
**POST** `/api/send-2fa-code`

Sends a 6-digit verification code to the user's phone number.

**Request Body:**
```json
{
  "phoneNumber": "+233241234567",
  "userId": "firebase_user_id"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "expiresIn": 300
}
```

### 2. Verify 2FA Code
**POST** `/api/verify-2fa-code`

Verifies the code entered by the user.

**Request Body:**
```json
{
  "code": "123456",
  "userId": "firebase_user_id"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Code verified successfully",
  "phoneNumber": "+233241234567"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Incorrect code. 2 attempts remaining.",
  "remainingAttempts": 2
}
```

## Environment Variables

Set these in Vercel:

- `BULK_SMS_API_KEY` - Your Bulk SMS Ghana API key
- `BULK_SMS_SENDER_ID` - Your sender ID

## Deployment

```bash
vercel --prod
```

After deployment, update the `API_BASE_URL` in your frontend code to point to your Vercel domain.
