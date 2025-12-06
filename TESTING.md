# 🧪 Judge's Testing Guide

**⚠️ IMPORTANT: PLEASE READ THIS FIRST ⚠️**

To fully experience the features of **TaxLens**, including Gmail integration for automated tax receipt scanning, you **MUST** use the provided test account.

Using your personal Gmail account may not work as the Google Cloud App is currently in "Testing" mode and requires manually added test users.

### ⚠️ Disclaimer: MVP Status & Google Verification

**This is an MVP application built for a hackathon.** 

The application has **not yet been verified by Google** for sensitive permissions, specifically **read-only access to your Gmail messages**. As a result:
1.  **Google requires manual whitelisting** of every email address that attempts to sign in.
2.  **Only the provided test account below has been whitelisted.**
3.  If you try to use your own email, you will likely encounter an `access_denied` error.

---

## 🔑 Test Account Credentials

Please use these credentials to sign in via Google:

| Service | Email | Password |
|---------|-------|----------|
| **Google / Gmail** | `taxlens666@gmail.com` | `taxlens@123` |

---

## 🚀 How to Test

1.  **Launch the Application**: Open the TaxLens web app in your browser.
2.  **Sign In**: Click the "Sign in with Google" button.
3.  **Enter Credentials**: 
    *   Use the email: `taxlens666@gmail.com`
    *   Use the password: `taxlens@123`
4.  **Grant Permissions**: If prompted, allow TaxLens to access the Gmail account to enable the automated receipt scanning features.
    *   *Note: Since the app is unverified by Google, you may see a "Google hasn't verified this app" warning. Click "Advanced" -> "Go to TaxLens (unsafe)" to proceed.*

## 📧 Testing Email Sync

The test account is pre-populated with sample receipts in its inbox.
1.  Navigate to the **Dashboard**.
2.  Click the **"Sync Gmail"** button (or check the Action Center).
3.  Watch as TaxLens scans the inbox, identifies receipt emails, and automatically creates categorized transactions!

---

**Thank you for testing TaxLens!**

