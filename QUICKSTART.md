# Quick Start: Deploy to Railway in 10 Minutes

## 1. Create Railway Account
Go to https://railway.app and sign up (free, no credit card needed for trial)

## 2. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

## 3. Get Google OAuth Credentials

### A. Go to Google Cloud Console
https://console.cloud.google.com/apis/credentials

### B. Create Project (if needed)
Click "Create Project" → Name it "VANHA Auto Namer" → Create

### C. Enable APIs
- Search for "Google Drive API" → Enable
- Search for "Google Sheets API" → Enable
- Search for "Google Picker API" → Enable

### D. Create OAuth Client
1. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. If asked, configure consent screen:
   - User Type: **Internal** (if G Suite) or **External**
   - App name: "VANHA Creative Auto-Namer"
   - Support email: your email
   - Scopes: Add `userinfo.email`, `userinfo.profile`, `drive`, `spreadsheets`
   - Test users: Add your email
   - Save
3. Back to Credentials → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: "VANHA Auto Namer"
   - Authorized redirect URIs: `http://localhost:8000/api/auth/callback` (we'll update this later)
   - Click **Create**
   - **Copy your Client ID and Client Secret** (save them somewhere)

### E. Create API Key (for Picker)
1. **Credentials** → **Create Credentials** → **API Key**
2. **Copy your API Key**
3. Click **Restrict Key** → API restrictions → Select:
   - Google Drive API
   - Google Picker API
4. Save

## 4. Deploy Backend

```bash
cd backend

# Initialize Railway project
railway init

# Deploy
railway up

# Get your backend URL
railway domain
```

**Copy your backend URL** (e.g., `cymatics-backend-production.up.railway.app`)

## 5. Set Backend Environment Variables

```bash
# Still in backend folder
railway variables set GOOGLE_CLIENT_ID="paste-your-client-id-here"
railway variables set GOOGLE_CLIENT_SECRET="paste-your-client-secret-here"
railway variables set GOOGLE_PICKER_API_KEY="paste-your-api-key-here"
railway variables set GOOGLE_SHEETS_ID="1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc"
railway variables set COPY_DOC_TEMPLATES_FOLDER_ID="172SxFyhZqQHIvq0aRGAF_ykP5DntkzFB"
railway variables set SESSION_SECRET="$(openssl rand -hex 32)"
railway variables set GOOGLE_REDIRECT_URI="https://your-backend-url.up.railway.app/api/auth/callback"
```

**Replace `your-backend-url` with your actual Railway backend URL from step 4!**

## 6. Update Google OAuth Redirect URI

1. Go back to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-backend-url.up.railway.app/api/auth/callback
   ```
   (Use your actual Railway backend URL!)
4. Click **Save**

## 7. Deploy Frontend

```bash
cd ../frontend

# Initialize Railway service
railway init

# Deploy
railway up

# Set the API URL (use your backend URL from step 4)
railway variables set VITE_API_URL="https://your-backend-url.up.railway.app/api"

# Get your frontend URL
railway domain
```

**Copy your frontend URL** (e.g., `cymatics-frontend-production.up.railway.app`)

## 8. Update Backend with Frontend URL

```bash
cd ../backend

# Set frontend URL for CORS
railway variables set FRONTEND_URL="https://your-frontend-url.up.railway.app"

# Redeploy to apply the change
railway up
```

## 9. Test It!

1. Visit your frontend URL
2. Click "Sign in with Google"
3. Grant permissions
4. Try analyzing a folder!

---

## ✅ Done! Your app is live!

**Share this URL with your client:**
`https://your-frontend-url.up.railway.app`

They just need to:
1. Visit the URL
2. Sign in with their Google account
3. Use the app!

---

## Troubleshooting

### "Sign in" button doesn't work
- Check Railway backend logs: `cd backend && railway logs`
- Verify all environment variables are set correctly
- Make sure OAuth redirect URI in Google Cloud matches exactly

### "Access blocked: This app's request is invalid"
- Your `GOOGLE_REDIRECT_URI` doesn't match what's in Google Cloud Console
- Update it to match exactly: `https://your-exact-railway-url.up.railway.app/api/auth/callback`

### CORS errors
- Make sure `FRONTEND_URL` is set in backend environment variables
- Should match your actual frontend Railway URL

---

## Cost

**~$5-8/month** on Railway's Hobby plan
- Instant response (no cold starts)
- Always running
- Professional experience

---

## Need Help?

- Railway Docs: https://docs.railway.app
- Google OAuth Setup: https://developers.google.com/identity/protocols/oauth2
