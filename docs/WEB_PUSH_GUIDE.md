# Web Push Notifications Implementation Guide

## Overview

This project now includes **true background Web Push notifications** that work even when the browser/app is fully closed. This goes beyond standard browser notifications and enables device-level push messaging.

## Architecture

### Components

1. **Backend Server** (`server.js` + `server/pushService.js`)
   - Stores push subscriptions from clients
   - Schedules notifications at specific times
   - Sends Web Push messages using VAPID authentication
   - Handles subscription lifecycle (renewal, expiry, unsubscribe)

2. **Client Service** (`src/services/webPushService.ts`)
   - Manages PushManager subscription
   - Sends subscription to backend
   - Provides API for scheduling/canceling notifications

3. **Settings UI** (`src/components/shared/WebPushSettings.tsx`)
   - Owns subscribe / unsubscribe / test-notification
   - Calls `webPushService` directly

4. **Service Worker** (`public/sw.js`)
   - Handles `push` events from the backend
   - Displays notifications even when app is closed
   - Manages notification clicks

5. **UI Component** (`src/components/shared/WebPushSettings.tsx`)
   - Displays subscription status
   - Allows users to enable/disable Web Push
   - Shows scheduled notification count

## How It Works

### Subscription Flow

```
1. User enables Web Push in Settings
   â†“
2. Browser requests notification permission
   â†“
3. Client subscribes via PushManager.subscribe()
   â†“
4. Subscription sent to backend (POST /api/push/subscribe)
   â†“
5. Backend stores subscription with user ID
```

### Notification Scheduling Flow

```
1. User creates a task with due date/time
   â†“
2. scheduleWebPushForTask() called
   â†“
3. Backend schedules notification (POST /api/push/schedule)
   â†“
4. Backend setTimeout() waits until scheduled time
   â†“
5. Backend sends Web Push via webpush.sendNotification()
   â†“
6. Service Worker receives 'push' event
   â†“
7. Service Worker displays notification (even if app closed)
```

### Notification Types Supported

- **Tasks**: Due date/time reminders
- **Time Blocks**: 5 minutes before block starts
- **Focus Sessions**: When session ends
- **Quizzes/Exams**: Lead time before exam
- **Homework**: Submission deadline reminders
- **Habits**: Daily habit streak reminder
- **Spaced Repetition**: Lesson review due dates

## API Endpoints

### POST `/api/push/subscribe`
Subscribe a user to push notifications.

**Request:**
```json
{
  "userId": "user@example.com",
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription saved"
}
```

### POST `/api/push/unsubscribe`
Unsubscribe a user from push notifications.

**Request:**
```json
{
  "userId": "user@example.com"
}
```

### POST `/api/push/schedule`
Schedule a push notification for a future time.

**Request:**
```json
{
  "notificationId": "task_123_2024-01-15_18:00_webpush",
  "userId": "user@example.com",
  "payload": {
    "title": "Task Reminder: Study Math",
    "body": "Subject: Mathematics â€¢ Due: 2024-01-15 at 18:00",
    "icon": "/original_icon_512.png",
    "data": {
      "tab": "tasks",
      "itemId": "123"
    },
    "requireInteraction": true
  },
  "scheduledTime": 1705341600000
}
```

### DELETE `/api/push/schedule/:notificationId`
Cancel a scheduled notification.

### GET `/api/push/schedule/:userId`
Get all scheduled notifications for a user.

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "task_123_...",
      "scheduledTime": "2024-01-15T18:00:00.000Z",
      "payload": { ... }
    }
  ]
}
```

### GET `/api/push/stats`
Get push service statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalSubscriptions": 15,
    "scheduledNotifications": 42,
    "uptime": 3600
  }
}
```

## VAPID Keys

VAPID (Voluntary Application Server Identification) keys authenticate your backend server with push services.

### Generate Keys

Already generated and added to `.env`:

```bash
VAPID_PUBLIC_KEY=BMAij0w99HbEo-BkSF-bk-L1le-9K-zeQVmPxcBLQWKZqojlX1eTfjapzz0lYzUe_yBphjxRfSe0vPX66ysuPuY
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:mybac-tracker@example.com
VITE_VAPID_PUBLIC_KEY=BMAij0w99HbEo-BkSF-bk-L1le-9K-zeQVmPxcBLQWKZqojlX1eTfjapzz0lYzUe_yBphjxRfSe0vPX66ysuPuY
```

**âš ï¸ IMPORTANT**: Keep `VAPID_PRIVATE_KEY` secret! Never commit it to public repositories.

### Generate New Keys (Optional)

```bash
node scripts/generate-vapid-keys.js
```

## Hosting Requirements

### âŒ Does NOT Work On:
- **GitHub Pages** (static hosting, no backend)
- **Netlify/Vercel** (static sites without serverless functions)
- **Local file:// protocol**

### âœ… Works On:
- **Render.com** (free tier) - â­ Recommended
- **Railway.app** (free tier with credit)
- **Fly.io** (free tier)
- **Heroku** (paid)
- **DigitalOcean App Platform**
- **AWS EC2 / Lightsail**
- **Azure App Service**
- **Google Cloud Run**
- **Vercel/Netlify** (with serverless functions for scheduling)

## Deployment Guide

### Option 1: Render.com (Recommended - Free Tier)

1. **Create account** at [render.com](https://render.com)

2. **Create New Web Service**
   - Connect your GitHub repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: `Node`

3. **Set Environment Variables**
   ```
   VAPID_PUBLIC_KEY=BMAij0w99HbEo-BkSF-bk-L1le-9K-zeQVmPxcBLQWKZqojlX1eTfjapzz0lYzUe_yBphjxRfSe0vPX66ysuPuY
   VAPID_PRIVATE_KEY=<your-private-key>
   VAPID_SUBJECT=mailto:mybac-tracker@example.com
   NODE_ENV=production
   ```

4. **Deploy** - Render will automatically deploy

5. **Update Client** - Update `.env.production`:
   ```
   VITE_API_BASE_URL=https://your-app.onrender.com
   VITE_VAPID_PUBLIC_KEY=BMAij0w99HbEo-BkSF-bk-L1le-9K-zeQVmPxcBLQWKZqojlX1eTfjapzz0lYzUe_yBphjxRfSe0vPX66ysuPuY
   ```

### Option 2: Railway.app

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add environment variables: `railway variables set VAPID_PUBLIC_KEY=...`
5. Deploy: `railway up`

### Option 3: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly launch`
4. Set secrets: `fly secrets set VAPID_PRIVATE_KEY=...`
5. Deploy: `fly deploy`

## Usage in Code

> **Note:** scheduling is opt-in and user-driven. The app does *not* auto-push
> reminders for every task or Focus session. The user subscribes in
> **Settings ▸ Notifications**, and backend scheduling happens through
> `POST /api/push/schedule`. In-app reminders come from
> `src/services/notificationService.ts` and need no Web Push.

### Subscribe User

The subscribe flow lives entirely in `WebPushSettings.tsx`:

```typescript
// src/components/shared/WebPushSettings.tsx
await webPushService.init(userId);
const success = await webPushService.subscribe();
```

### Send a test notification

```typescript
// Backend
await sendPushNotification(userId, {
  title: 'Test',
  body: 'Web Push is working',
});
```

### Schedule a notification

```typescript
// Backend
scheduleNotification(notificationId, userId, payload, scheduledTime);

// Cancel it
cancelScheduledNotification(notificationId);
```

See [`../server.js`](../server.js) for the full `/api/push/*` surface.

## Browser Support

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome | âœ… | âœ… | Full support |
| Firefox | âœ… | âœ… | Full support |
| Edge | âœ… | âœ… | Full support |
| Safari | âœ… (16.4+) | âœ… (16.4+) | iOS 16.4+ required |
| Opera | âœ… | âœ… | Full support |

## Limitations

### Sound
- **Background push notifications cannot play custom sounds** (browser limitation)
- Native OS notification sound is used
- In-app chime sounds work only when app is open

### Scheduling
- Uses `setTimeout()` for scheduling (in-memory)
- Notifications are lost on server restart
- For production, use Redis/database with persistent queue

### Subscription Expiry
- Push subscriptions can expire (browser decides)
- Service handles 410 Gone responses and removes expired subscriptions
- Users may need to re-subscribe periodically

## Security Considerations

1. **VAPID Private Key**
   - Never commit to repository
   - Store in environment variables only
   - Rotate periodically

2. **User Authentication**
   - Current implementation uses email as userId
   - In production, use secure session tokens
   - Validate user owns subscription before sending

3. **Rate Limiting**
   - Add rate limiting to prevent notification spam
   - Limit scheduled notifications per user

4. **Input Validation**
   - All API inputs are validated
   - Subscription format verified before storage

## Testing

### Test Local Server

```bash
# Start server
npm start

# Server runs on http://localhost:3000
```

### Test Push Notification

1. Open app in browser
2. Go to Settings â†’ Notifications
3. Enable "Notifications en arriÃ¨re-plan"
4. Click "Tester" button
5. Check notification appears

### Test Scheduled Push

```bash
# Using curl
curl -X POST http://localhost:3000/api/push/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "notificationId": "test_123",
    "userId": "test@example.com",
    "payload": {
      "title": "Test Notification",
      "body": "This is a test",
      "icon": "/original_icon_512.png"
    },
    "scheduledTime": 1705341600000
  }'
```

## Troubleshooting

### Subscription Fails
- Check browser supports Push API
- Ensure HTTPS (required for push)
- Verify VAPID public key is correct
- Check browser console for errors

### Notifications Not Received
- Verify subscription exists: `GET /api/push/schedule/:userId`
- Check server logs for send errors
- Confirm notification time is in future
- Test browser notification permission

### Server Won't Start
- Verify all env variables set
- Check port 3000 is available
- Review server logs for errors
- Ensure web-push package installed

## Production Checklist

- [ ] Generate new VAPID keys (don't use default)
- [ ] Set secure VAPID_SUBJECT (valid email)
- [ ] Deploy backend to persistent server
- [ ] Set all environment variables
- [ ] Enable HTTPS on backend
- [ ] Add database for subscription persistence
- [ ] Implement user authentication
- [ ] Add rate limiting
- [ ] Set up monitoring/logging
- [ ] Test on all target browsers
- [ ] Document for team

## Future Enhancements

1. **Persistent Scheduling**
   - Replace setTimeout with Redis/Bull queue
   - Survive server restarts

2. **Database Integration**
   - Store subscriptions in PostgreSQL/MongoDB
   - Track notification history

3. **Advanced Scheduling**
   - Recurring notifications (daily habits)
   - Smart scheduling (optimal study time)

4. **Analytics**
   - Track notification open rates
   - Measure engagement

5. **Multi-Device**
   - Sync subscriptions across devices
   - Target specific devices

## Resources

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Service Worker Push Event](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/push_event)
- [PushManager API](https://developer.mozilla.org/en-US/docs/Web/API/PushManager)
- [web-push npm package](https://www.npmjs.com/package/web-push)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/rfc8292)

## Support

For issues or questions about Web Push implementation:
1. Check browser console for errors
2. Review server logs
3. Test with curl/Postman
4. Verify environment variables
5. Check [MDN Web Push docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
