# Railway Deployment Guide

## Quick Deploy to Railway

### 1. Install Railway CLI (Optional but Recommended)
```bash
npm install -g @railway/cli
railway login
```

### 2. Deploy via Railway Dashboard (Easiest)

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account
5. Select the `catan` repository
6. Railway will auto-detect it's a Node.js project
7. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
8. Click **"Deploy"**

### 3. Get Your Railway URL

After deployment, Railway will give you a URL like:
- `https://hexlands-server-production.up.railway.app`

### 4. Update Frontend

Update the client to use Railway URL:

```bash
cd client
echo "VITE_API_URL=https://YOUR-RAILWAY-URL" > .env.production
npm run build
cd ..
firebase deploy --only hosting
```

### 5. Set Environment Variables (if needed)

In Railway dashboard:
- Go to your service
- Click **"Variables"** tab
- Add `PORT=3001` (Railway sets this automatically, but you can override)

## Why Railway?

✅ **Better Free Tier**: Supports WebSockets reliably  
✅ **Always-On**: No cold starts (on free tier)  
✅ **Easy Deployment**: GitHub integration  
✅ **Better for Real-Time Apps**: Socket.IO works perfectly  

## Railway vs Render

| Feature | Railway Free | Render Free |
|---------|--------------|-------------|
| WebSocket Support | ✅ Excellent | ❌ Limited |
| Cold Starts | ✅ None | ❌ 30s wake-up |
| Always-On | ✅ Yes | ❌ Sleeps after 15min |
| Best For | Real-time apps | Static sites |

