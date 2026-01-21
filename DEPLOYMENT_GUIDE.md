# Deployment Guide - Multi-User Setup

This guide will help you deploy the Cymatics Ad Renamer application for multi-user access with zero setup required for end users.

## 🎯 Overview

After deployment, team members will:
1. Visit the deployed URL
2. Sign in with their Google account
3. Start using the app immediately

All users will share the same Google Sheet and template folder.

## 📋 Prerequisites

- GitHub account (to deploy from repository)
- Google Cloud Console account
- Netlify account (free)
- Render account (free tier available)

---

## Part 1: Google Cloud Setup

### 1.1 Create/Configure Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it something like "Cymatics Ad Renamer"

### 1.2 Enable Required APIs

Navigate to **APIs & Services > Library** and enable:
- Google Drive API
- Google Sheets API
- Google Picker API

Direct links:
- [Enable Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Enable Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

### 1.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client ID**
3. If prompted, configure OAuth consent screen:
   - User Type: **External**
   - App name: **Cymatics Ad Renamer**
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add these scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `.../auth/drive`
     - `.../auth/spreadsheets`
   - Test users: Add your email (during development)

4. Back to **Create OAuth Client ID**:
   - Application type: **Web application**
   - Name: **Cymatics Ad Renamer Web**
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     https://your-app.netlify.app
     ```
     (Update `your-app` after Netlify deployment)
   
   - Authorized redirect URIs:
     ```
     http://localhost:8000/api/auth/callback
     https://your-backend.onrender.com/api/auth/callback
     ```
     (Update `your-backend` after Render deployment)

5. **Save the Client ID and Client Secret** - you'll need them later

### 1.4 Create API Key (for Drive Picker)

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Restrict the key:
   - Application restrictions: **HTTP referrers**
   - Website restrictions:
     ```
     http://localhost:5173/*
     https://your-app.netlify.app/*
     ```
   - API restrictions: **Restrict key**
     - Select: **Google Picker API**
4. **Save the API Key** - you'll need it later

---

## Part 2: Deploy Backend to Render

### 2.1 Push Code to GitHub

If you haven't already:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2.2 Create Render Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New > Web Service**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `cymatics-ad-renamer-backend` (or your choice)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     cd backend && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: **Free** (or upgrade for better performance)

### 2.3 Configure Environment Variables

In the Render dashboard, go to **Environment** tab and add:

| Key | Value | Notes |
|-----|-------|-------|
| `GOOGLE_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `your-client-secret` | From Google Cloud Console |
| `GOOGLE_PICKER_API_KEY` | `your-api-key` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://your-backend.onrender.com/api/auth/callback` | Use your actual Render URL |
| `FRONTEND_URL` | `https://your-app.netlify.app` | Will update after Netlify deployment |
| `JWT_SECRET` | Generate secure random string | See command below |
| `GOOGLE_SHEETS_ID` | `1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc` | Shared sheet for all users |
| `COPY_DOC_FOLDER_ID` | `172SxFyhZqQHIvq0aRGAF_ykP5DntkzFB` | Shared templates folder |
| `ALLOWED_ORIGINS` | `https://your-app.netlify.app` | Will update after Netlify deployment |

**Generate JWT_SECRET**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2.4 Deploy Backend

1. Click **Create Web Service**
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://your-backend.onrender.com`

---

## Part 3: Deploy Frontend to Netlify

### 3.1 Create Netlify Site

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **Add new site > Import an existing project**
3. Connect to GitHub and select your repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
   - **Branch**: `main`

### 3.2 Configure Environment Variables

In Netlify dashboard, go to **Site settings > Environment variables** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` |

(Use your actual Render backend URL from Part 2.4)

### 3.3 Deploy Frontend

1. Click **Deploy site**
2. Wait for deployment (2-3 minutes)
3. Note your frontend URL: `https://your-app.netlify.app`
4. Optionally, configure a custom domain in **Domain settings**

---

## Part 4: Final Configuration

### 4.1 Update Backend Environment Variables

Go back to **Render dashboard** and update:
- `FRONTEND_URL`: `https://your-app.netlify.app`
- `ALLOWED_ORIGINS`: `https://your-app.netlify.app`

Trigger a redeploy if needed.

### 4.2 Update Google Cloud OAuth Settings

Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Edit your OAuth 2.0 Client ID
2. Update **Authorized JavaScript origins**:
   - Add: `https://your-app.netlify.app`
3. Update **Authorized redirect URIs**:
   - Add: `https://your-backend.onrender.com/api/auth/callback`
4. Update **API Key** restrictions:
   - Add: `https://your-app.netlify.app/*`
5. Save changes

### 4.3 Publish OAuth Consent Screen (Optional)

If you want users outside your organization to use the app:

1. Go to **APIs & Services > OAuth consent screen**
2. Click **Publish App**
3. Note: Google may require verification for sensitive scopes

For internal use only, keep it in "Testing" mode and add users to test list.

---

## Part 5: Test the Deployment

1. Visit your Netlify URL: `https://your-app.netlify.app`
2. Click "Sign in with Google"
3. Grant permissions
4. Test uploading assets and using features
5. Verify Google Sheet integration works

---

## 🎉 Share with Team

Send the Netlify URL to your team members:

> "Hey team! Our ad renamer is now live at https://your-app.netlify.app
> 
> Just click 'Sign in with Google' and start using it - no setup needed!"

---

## 🔧 Maintenance

### Updating the Application

When you push changes to GitHub:
- **Backend**: Render auto-deploys from `main` branch
- **Frontend**: Netlify auto-deploys from `main` branch

### Monitoring

- **Render Logs**: Dashboard > Logs tab
- **Netlify Logs**: Dashboard > Deploys > Click deployment > Logs
- **Render Free Tier**: Service spins down after 15 min inactivity
  - First request after spin-down takes 30-60s to wake up

### Upgrading from Free Tier

If the free tier limitations become an issue:

**Render**:
- Upgrade to **Starter** plan ($7/month)
- Benefits: Always on, no spin-down, better performance

**Alternative: Railway**:
- $5/month for hobby plan
- Deploy both frontend and backend
- More generous free tier limits

---

## 📝 Environment Variables Reference

### Backend (.env)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_PICKER_API_KEY=your-picker-api-key
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/auth/callback

# Frontend URL
FRONTEND_URL=https://your-app.netlify.app

# Security
JWT_SECRET=long-random-secure-string

# CORS
ALLOWED_ORIGINS=https://your-app.netlify.app

# Shared Resources
GOOGLE_SHEETS_ID=1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc
COPY_DOC_FOLDER_ID=172SxFyhZqQHIvq0aRGAF_ykP5DntkzFB
```

### Frontend (.env.production)

```bash
# Backend API
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## 🐛 Troubleshooting

### OAuth Errors

**"redirect_uri_mismatch"**
- Ensure redirect URI in Google Cloud Console exactly matches backend URL
- Check for trailing slashes

**"origin_mismatch"**
- Ensure JavaScript origins in Google Cloud Console match frontend URL
- Check API key restrictions

### CORS Errors

- Verify `ALLOWED_ORIGINS` includes frontend URL
- Check browser console for specific error
- Ensure both URLs use HTTPS (not mixed HTTP/HTTPS)

### "Session expired" Errors

- JWT tokens expire after 7 days
- Users need to sign in again
- Consider implementing token refresh if needed

### Backend Slow to Respond

- Render free tier spins down after inactivity
- First request takes 30-60s to wake up
- Upgrade to paid plan for always-on service

---

## 🔐 Security Notes

- Never commit `.env` files to Git
- Rotate JWT_SECRET periodically
- Keep Google OAuth credentials secure
- Monitor Google Cloud Console for unusual activity
- Consider restricting OAuth to specific email domain for internal tools

---

## 📞 Support

For issues or questions:
1. Check Render/Netlify logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Ensure Google Cloud APIs are enabled
5. Test locally first with same environment variables

---

**Deployment Complete! 🚀**

Your team can now use the app at your deployed URL with zero setup required!
