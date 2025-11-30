# HexLands Deployment Guide

## Architecture
- **Frontend**: Firebase Hosting (or any static hosting)
- **Backend**: Render (free tier with WebSocket support)

---

## 1. Deploy Backend to Render

### Option A: One-Click Deploy
1. Go to [render.com](https://render.com) and sign up
2. Click **"New" → "Blueprint"**
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and deploy!

### Option B: Manual Setup
1. Go to [render.com](https://render.com) → **"New" → "Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `hexlands-server`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Add environment variable:
   - `PORT` = `3001`
5. Click **"Create Web Service"**
6. Copy your backend URL (e.g., `https://hexlands-server.onrender.com`)

---

## 2. Deploy Frontend to Firebase Hosting

### Setup Firebase
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in the project root
cd /path/to/catan
firebase init hosting
```

When prompted:
- **Public directory**: `client/dist`
- **Single-page app**: Yes
- **GitHub auto-deploy**: Optional

### Configure & Build
```bash
# Create environment file for production
echo "VITE_API_URL=https://your-backend.onrender.com" > client/.env.production

# Build the frontend
cd client
npm run build
```

### Deploy
```bash
# From project root
firebase deploy --only hosting
```

Your app will be live at: `https://your-project.web.app`

---

## Environment Variables

### Client (Vite)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend WebSocket URL | `https://hexlands-server.onrender.com` |

### Server
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `production` |

---

## CORS Configuration

The server is configured to accept connections from any origin in production. 
If you need to restrict this, update `server/src/index.ts`:

```typescript
const io = new Server(server, {
  cors: {
    origin: ['https://your-app.web.app', 'http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});
```

---

## Troubleshooting

### Backend sleeping (Render free tier)
The free tier spins down after 15 minutes of inactivity. First connection may take 30 seconds. Consider upgrading to paid ($7/month) for always-on.

### WebSocket connection failed
1. Check browser console for errors
2. Verify `VITE_API_URL` is set correctly
3. Ensure backend is running (check Render dashboard)

### Build fails
```bash
# Test build locally first
cd server && npm run build
cd ../client && npm run build
```

