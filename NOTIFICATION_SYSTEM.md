# Unified Notification System

## Overview
The notification system now supports both **foreground** and **background** notifications in a unified way.

### What Changed
1. **Foreground Notifications**: Display in-app notifications when the app is open
2. **Background Notifications**: Show push notifications when the app is closed or minimized
3. **Unified Function**: Both are sent simultaneously using `sendUnifiedNotification()`

## System Flow

```
Admin Action
    ↓
notifyAdminsOfSubmission() / notifyAdminsOfWithdrawal() / notifyUserOfAction()
    ↓
sendUnifiedNotification()
    ├─→ Firestore (notifications collection) → Foreground display
    └─→ /api/send-notification → FCM → Background/Push notification
```

## Environment Variables Required

```
FIREBASE_MESSAGING_API_KEY=AIzaSyCm830gKeBqM9HMF942FsmhOn_zzTbEsXk
NEXT_PUBLIC_FIREBASE_PROJECT_ID=skl-app-e6f9d
```

## How It Works

### 1. FCM Token Registration
When a user opens the app:
- `useFcmToken()` hook requests notification permission
- Service worker is registered at `/firebase-messaging-sw.js`
- FCM token is obtained from Firebase
- Token is automatically saved to Firestore in the `users` collection under `fcmToken` field

### 2. Sending Notifications

#### Admin Notifies About Submission
```typescript
notifyAdminsOfSubmission(
  userId,
  userName,
  platform,
  description,
  amount
)
```

This function:
1. Queries all admin users from Firestore
2. Calls `sendUnifiedNotification()` for each admin
3. Notification sent to both Firestore and FCM

#### Admin Takes Action on User
```typescript
notifyUserOfAction(
  userId,
  "task_approved", // or "task_rejected", "withdrawal_approved", "withdrawal_rejected"
  "Task Approved",
  "Your submission has been approved!"
)
```

### 3. Notification Delivery

#### Foreground (App Open)
- Notification saved to Firestore `notifications` collection
- Displayed in the app's notification panel
- User sees real-time notification while using the app

#### Background (App Closed)
- FCM receives the push notification
- Service worker displays notification on device
- User can click the notification to open the app

### 4. Handling Notification Clicks
When user clicks a background notification:
- Service worker's `notificationclick` handler is triggered
- App opens to `/dashboard` page
- Notification is closed

## API Endpoint

### `/api/send-notification`
Sends push notification via FCM Legacy API

**Request Body:**
```json
{
  "userId": "user123",
  "title": "New Task Submission",
  "body": "User submitted a new task",
  "type": "user_submission",
  "amount": 100,
  "data": {
    "userName": "John Doe",
    "platform": "Instagram"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

## Notification Types

### Supported Types:
- `user_submission` - User submits work for admin review
- `withdrawal_request` - User requests fund withdrawal
- `task_approved` - Admin approves user's submission
- `task_rejected` - Admin rejects user's submission
- `withdrawal_approved` - Admin approves withdrawal
- `withdrawal_rejected` - Admin rejects withdrawal

## Database Schema

### Users Collection
```typescript
{
  uid: string,
  email: string,
  fcmToken: string,        // Push notification token
  fcmTokenUpdatedAt: Date, // When token was last updated
  // ... other fields
}
```

### Notifications Collection
```typescript
{
  userId: string,
  type: string,
  title: string,
  message: string,
  amount?: number,
  data?: object,
  read: boolean,
  createdAt: Timestamp,
}
```

## Testing the System

1. **Open the app** - You'll see a permission request for notifications
2. **Grant permission** - App registers service worker and gets FCM token
3. **Trigger an action** - Admin submits work or creates withdrawal request
4. **Check notifications**:
   - Foreground: Check in-app notification panel
   - Background: Close the app and check device notifications
5. **Click notification** - Should open app to dashboard

## Troubleshooting

### Token Not Saving
- Check browser console for "[v0]" debug messages
- Verify user is logged in when permission is requested
- Check Firestore rules allow writing to users collection

### Push Notifications Not Arriving
- Verify `FIREBASE_MESSAGING_API_KEY` is set correctly
- Check FCM token exists in user document
- Check browser's notification settings
- Try sending from admin panel and monitor network requests

### Service Worker Issues
- Clear browser cache
- Unregister old service workers in DevTools
- Reload the page
- Check `/public/firebase-messaging-sw.js` is accessible

## Files Modified

- `/lib/notification-service.ts` - Added `sendUnifiedNotification()`
- `/hooks/useFcmToken.ts` - Now saves FCM token to Firestore
- `/app/api/send-notification/route.ts` - FCM API endpoint
- `/public/firebase-messaging-sw.js` - Added notification click handler
