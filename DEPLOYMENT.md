# Railway Deployment Guide

This guide will help you deploy the VANHA Creative Auto-Namer to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Google Cloud Console project with OAuth credentials
3. Git installed locally

## Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

## Step 2: Create Railway Project

```bash
# In the project root
railway init
```

This creates a new Railway project. You'll deploy backend and frontend separately as two services.

## Step 3: Set Up Google Cloud OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable these APIs:
   - Google Drive API
   - Google Sheets API
   - Google Picker API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   ```
   https://your-backend-name.up.railway.app/api/auth/callback
   ```
   (You'll update this after deploying)
7. Copy your **Client ID** and **Client Secret**
8. Create an **API Key** (for Google Picker)

## Step 4: Deploy Backend

```bash
cd backend

# Create a new Railway service
railway up

# Set environment variables (update with your values)
railway variables set GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
railway variables set GOOGLE_CLIENT_SECRET="your-client-secret"
railway variables set GOOGLE_PICKER_API_KEY="your-picker-api-key"
railway variables set GOOGLE_SHEETS_ID="1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc"
railway variables set COPY_DOC_TEMPLATES_FOLDER_ID="172SxFyhZqQHIvq0aRGAF_ykP5DntkzFB"
railway variables set SESSION_SECRET="$(openssl rand -hex 32)"

# Get your backend URL
railway domain
```

Copy your backend URL (e.g., `https://cymatics-backend.up.railway.app`)

## Step 5: Update Google OAuth Redirect URI

1. Go back to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Update **Authorized redirect URIs** with your actual Railway backend URL:
   ```
   https://your-backend-name.up.railway.app/api/auth/callback
   ```
4. Save

## Step 6: Update Backend Environment Variables

```bash
cd backend

# Set the redirect URI with your actual backend URL
railway variables set GOOGLE_REDIRECT_URI="https://your-backend-name.up.railway.app/api/auth/callback"
```

## Step 7: Deploy Frontend

```bash
cd ../frontend

# Create a new Railway service
railway up

# Set environment variables
railway variables set VITE_API_URL="https://your-backend-name.up.railway.app/api"

# Get your frontend URL
railway domain
```

## Step 8: Update Backend with Frontend URL

```bash
cd ../backend

# Set frontend URL for CORS
railway variables set FRONTEND_URL="https://your-frontend-name.up.railway.app"

# Redeploy to apply changes
railway up
```

## Step 9: Test Your Deployment

1. Visit your frontend URL: `https://your-frontend-name.up.railway.app`
2. Click "Sign in with Google"
3. Test the full workflow

## Environment Variables Summary

### Backend Variables:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_PICKER_API_KEY=your-picker-api-key
GOOGLE_SHEETS_ID=1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc
COPY_DOC_TEMPLATES_FOLDER_ID=172SxFyhZqQHIvq0aRGAF_ykP5DntkzFB
GOOGLE_REDIRECT_URI=https://your-backend-name.up.railway.app/api/auth/callback
SESSION_SECRET=random-32-character-string
FRONTEND_URL=https://your-frontend-name.up.railway.app
```

### Frontend Variables:
```
VITE_API_URL=https://your-backend-name.up.railway.app/api
```

## Alternative: Deploy via Railway Dashboard (No CLI)

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your GitHub account and select the repository
4. Railway will detect backend and frontend automatically
5. Add environment variables in the dashboard for each service
6. Deploy!

## Troubleshooting

### "Google hasn't verified this app"
- Add yourself as a test user in Google Cloud Console
- Or publish your OAuth app for verification

### CORS errors
- Make sure `FRONTEND_URL` is set correctly in backend
- Check browser console for the actual error

### OAuth redirect mismatch
- Verify redirect URI in Google Cloud matches your Railway backend URL exactly
- Make sure it ends with `/api/auth/callback`

### Backend health check fails
- Check Railway logs: `railway logs`
- Verify all environment variables are set
- Backend should respond at `/api/config`

## Cost Estimate

**Expected monthly cost: $5-8**
- $5 minimum (includes $5 credit)
- ~$0.02/hour for backend + frontend
- ~$3-5 in actual usage for light use

## Updating the App

```bash
# Make your changes locally
git add .
git commit -m "Your changes"
git push

# Railway auto-deploys on push
# Or manually trigger:
cd backend
railway up

cd ../frontend
railway up
```

## Custom Domain (Optional)

1. Go to Railway Dashboard → Your service → Settings
2. Add custom domain
3. Update your DNS records as instructed
4. Update Google OAuth redirect URIs with your custom domain

---

**Need help?** Check Railway docs: https://docs.railway.app
