
# Plan: Fix Gmail Email Sending Errors

## Problem Summary
Two issues are preventing emails from being sent:
1. Gmail API is disabled in Google Cloud Console (causes "Erro ao enviar")
2. Frontend code references wrong database column name

---

## Part 1: Enable Gmail API (User Action Required)

This is the PRIMARY fix. The email sending fails because the Gmail API is not enabled.

**Steps for you to complete:**

1. Go to: https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=23104272196
2. Click "ENABLE" to activate the Gmail API
3. Wait 2-3 minutes for propagation

---

## Part 2: Code Fixes

### File 1: `src/components/Dashboard/EmailComposer.tsx`

Fix references to use the correct database column name (`email` instead of `provider_email`):

**Change 1 - Line 36:**
```typescript
// Before
setFromEmail(emailAccount.provider_email);

// After  
setFromEmail(emailAccount.email);
```

**Change 2 - Line 167:**
```typescript
// Before
<span className="text-sm">Enviando como: <strong>{emailAccount?.provider_email}</strong></span>

// After
<span className="text-sm">Enviando como: <strong>{emailAccount?.email}</strong></span>
```

### File 2: `src/hooks/useGmail.tsx`

Add better error handling for the OAuth callback to distinguish between API errors and connection issues:

**Improvement - processOAuthCallback function:**
- Add more detailed logging
- Show clearer error messages if the Gmail API is not enabled

---

## Technical Details

### Database Schema Verification
The `user_email_accounts` table has these columns:
- `email` (correct column)
- `provider`
- `access_token`
- `refresh_token`
- `expires_at`
- `status`

There is NO `provider_email` column - this was causing undefined values.

### Current Connection Status
Your Gmail account is connected:
- Email: sandergamesbr@gmail.com
- Status: active
- Token expires: 2026-02-07 05:23:14

The connection works fine - the issue is only when trying to SEND emails (Gmail API disabled).

---

## Summary

| Issue | Type | Fix |
|-------|------|-----|
| Gmail API disabled | Config | Enable in Google Cloud Console |
| Wrong column name | Code | Change `provider_email` to `email` |

After these fixes, email sending should work correctly.
