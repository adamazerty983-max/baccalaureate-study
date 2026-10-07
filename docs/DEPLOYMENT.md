# Deployment Instructions for Web Push Notifications

## Quick Start - Deploy to Render.com (Free)

### Step 1: Prepare Repository

1. Ensure all code is committed:
   ```bash
   git add .
   git commit -m "feat: add Web Push background notifications with VAPID"
   git push origin main
   ```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub account
3. Grant access to your repository

### Step 3: Create Web Service

1. Click **"New +"** â†’ **"Web Service"**
2. Select your repository: `baccalaureate-study`
3. Configure:
   - **Name**: `mybac-tracker-push` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Step 4: Add Environment Variables

In the Render dashboard, go to **Environment** tab and add:

```
VAPID_PUBLIC_KEY=BMAij0w99HbEo-BkSF-bk-L1le-9K-zeQVmPxcBLQWKZqojlX1eTfjapzz0lYzUe_yBphjxRfSe0vPX66ysuPuY
VAPID_PRIVATE_KEY=<your-private-key>
VAPID_SUBJECT=mailto:mybac-tracker@example.com
NODE_ENV=production
PORT=3000
```

**âš ï¸ SECURITY NOTE**: Generate NEW VAPID keys for production:
```bash
node scripts/generate-vapid-keys.js
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for initial build
3. Note your service URL: `https://mybac-tracker-push.onrender.com`

### Step 6: Update Client Configuration

**Option A: For development/testing**

Update your local `.env`:
```bash
# Add to .env
VITE_API_BASE_URL=https://mybac-tracker-push.onrender.com
```

**Option B: For production build**

Create `.env.production`:
```bash
VITE_VAPID_PUBLIC_KEY=BMAij0w99HbEo-BkSF-bk-L1le-9K-zeQVmPxcBLQWKZqojlX1eTfjapzz0lYzUe_yBphjxRfSe0vPX66ysuPuY
VITE_API_BASE_URL=https://mybac-tracker-push.onrender.com
```

Rebuild:
```bash
npm run build
```

### Step 7: Test the Deployment

1. Open your app: `https://your-github-pages-url` or `http://localhost:3000`
2. Go to **Settings** â†’ **Notifications**
3. Scroll to **"Notifications en arriÃ¨re-plan"** section
4. Click **"Activer les notifications"**
5. Allow browser permission when prompted
6. Click **"Tester"** button
7. You should receive a test notification!

### Step 8: Test Scheduled Notification

Create a task with a due date 2 minutes from now:
1. Go to **Tasks** tab
2. Add task: "Test Push" with due date in 2 minutes
3. Close the browser completely
4. Wait 2 minutes
5. You should receive the notification even with browser closed!

---

## Alternative: Deploy to Railway.app

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login and Initialize

```bash
railway login
railway init
```

### Step 3: Set Environment Variables

```bash
railway variables set VAPID_PUBLIC_KEY=BMAij0w99HbEo-BkSF-bk-L1le-9K-zeQVmPxcBLQWKZqojlX1eTfjapzz0lYzUe_yBphjxRfSe0vPX66ysuPuY
railway variables set VAPID_PRIVATE_KEY=<your-private-key>
railway variables set VAPID_SUBJECT=mailto:mybac-tracker@example.com
railway variables set NODE_ENV=production
```

### Step 4: Deploy

```bash
railway up
```

### Step 5: Get URL

```bash
railway domain
```

---

## Alternative: Deploy to Fly.io

### Step 1: Install Fly CLI

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Mac/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login and Create App

```bash
fly auth login
fly launch --name mybac-tracker-push
```

### Step 3: Set Secrets

```bash
fly secrets set VAPID_PUBLIC_KEY=BMAij0w99HbEo-BkSF-bk-L1le-9K-zeQVmPxcBLQWKZqojlX1eTfjapzz0lYzUe_yBphjxRfSe0vPX66ysuPuY
fly secrets set VAPID_PRIVATE_KEY=<your-private-key>
fly secrets set VAPID_SUBJECT=mailto:mybac-tracker@example.com
```

### Step 4: Deploy

```bash
fly deploy
```

---

## Verification Checklist

After deployment, verify:

- [ ] Backend is running: Visit `https://your-backend-url.com/api/health` (should return "OK")
- [ ] Service stats accessible: `https://your-backend-url.com/api/push/stats`
- [ ] HTTPS is enabled (required for Web Push)
- [ ] Environment variables are set correctly
- [ ] Browser can subscribe to push notifications
- [ ] Test notification received
- [ ] Scheduled notification received (close browser and wait)

---

## Troubleshooting

### "Push service not configured" error
- Check environment variables are set on server
- Restart the service after adding variables
- Verify VAPID keys are correct format

### Can't subscribe to push
- Ensure backend URL is HTTPS (not HTTP)
- Check browser supports Push API
- Verify VAPID public key matches between client and server
- Clear browser cache and try again

### Notifications not received
- Check subscription exists: `curl https://your-backend-url.com/api/push/stats`
- Verify notification time is in future
- Check browser has notification permission
- Test with immediate notification first

### Render free tier sleeps after 15 min inactivity
- First request after sleep takes ~30 seconds
- Scheduled notifications may be delayed if server is sleeping
- Upgrade to paid tier for 24/7 uptime
- Or use cron-job.org to ping `/api/health` every 10 minutes

---

## Production Recommendations

### 1. Generate New VAPID Keys
```bash
node scripts/generate-vapid-keys.js
```
Never use the default keys in production!

### 2. Set Real Email in VAPID_SUBJECT
```
VAPID_SUBJECT=mailto:your-actual-email@domain.com
```

### 3. Add Database Persistence
Replace in-memory Map with PostgreSQL/MongoDB to persist subscriptions across restarts.

### 4. Implement Rate Limiting
Add express-rate-limit to prevent notification spam.

### 5. Add Monitoring
- Set up health check endpoint monitoring
- Track notification delivery rates
- Log errors to Sentry or similar

### 6. Keep Server Awake (Render Free Tier)
Set up a cron job to ping your health endpoint every 10 minutes:
- Use [cron-job.org](https://cron-job.org)
- Or [UptimeRobot](https://uptimerobot.com)
- Target: `https://your-backend-url.com/api/health`

---

## Cost Estimate

| Platform | Free Tier | Limits | Upgrade Cost |
|----------|-----------|--------|--------------|
| Render.com | âœ… Yes | 750 hrs/month, sleeps after 15min | $7/month |
| Railway.app | âœ… $5 credit | 500 hrs/month | $5/month |
| Fly.io | âœ… Yes | 3 shared-cpu VMs | $1.94/month |
| Heroku | âŒ No | N/A | $7/month |

**Recommended**: Start with Render.com free tier, then upgrade if needed.

---

## Next Steps After Deployment

1. **Test thoroughly** on all target browsers (Chrome, Firefox, Safari, Edge)
2. **Monitor logs** for first 24 hours to catch issues
3. **Document your backend URL** for team members
4. **Set up backup strategy** for subscription data
5. **Plan for scaling** if user base grows beyond free tier

---

## Support

- **Backend not starting?** Check server logs in Render/Railway dashboard
- **Notifications not working?** Review [WEB_PUSH_GUIDE.md](./WEB_PUSH_GUIDE.md)
- **Need help?** Check browser console for client-side errors
