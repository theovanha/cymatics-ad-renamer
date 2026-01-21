# Quick Reference - Multi-User Deployment

## 📚 Documentation Files

1. **DEPLOYMENT_GUIDE.md** - Complete step-by-step deployment instructions
2. **MULTI_USER_SETUP.md** - Technical summary of all changes made
3. **netlify.toml** - Frontend deployment configuration
4. **render.yaml** - Backend deployment configuration

## 🚀 Quick Deploy Checklist

### Phase 1: Google Cloud (15 min)
- [ ] Create/select Google Cloud project
- [ ] Enable Drive, Sheets, Picker APIs
- [ ] Create OAuth 2.0 credentials
- [ ] Create API key
- [ ] Save Client ID, Client Secret, API Key

### Phase 2: Backend - Render (10 min)
- [ ] Push code to GitHub
- [ ] Create Render Web Service
- [ ] Configure build/start commands
- [ ] Set environment variables (see list below)
- [ ] Deploy and note backend URL

### Phase 3: Frontend - Netlify (5 min)
- [ ] Create Netlify site from GitHub
- [ ] Configure build settings (base: `frontend`)
- [ ] Set `VITE_API_URL` environment variable
- [ ] Deploy and note frontend URL

### Phase 4: Update URLs (5 min)
- [ ] Update Render env vars with Netlify URL
- [ ] Update Google Cloud OAuth with deployed URLs
- [ ] Test end-to-end

## 🔑 Required Environment Variables

### Backend (Render)
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_PICKER_API_KEY=xxx
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/auth/callback
FRONTEND_URL=https://your-app.netlify.app
JWT_SECRET=<generate-random-string>
GOOGLE_SHEETS_ID=1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc
COPY_DOC_FOLDER_ID=172SxFyhZqQHIvq0aRGAF_ykP5DntkzFB
ALLOWED_ORIGINS=https://your-app.netlify.app
```

### Frontend (Netlify)
```bash
VITE_API_URL=https://your-backend.onrender.com/api
```

## 🧪 Local Testing

Backend and frontend are currently running locally with JWT authentication:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173

Test the new JWT authentication by:
1. Sign in with Google
2. Check browser cookies (should see `session_token` instead of `session_id`)
3. Verify all features work

## 📦 What Changed

### Key Technical Changes
1. **Authentication**: In-memory sessions → JWT tokens
2. **Cookies**: `session_id` → `session_token`
3. **CORS**: Environment-based configuration
4. **Dependencies**: Added `pyjwt==2.8.0`

### Files Modified
- `backend/requirements.txt`
- `backend/app/services/jwt_auth.py` (NEW)
- `backend/app/config.py`
- `backend/app/main.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/pipeline.py`
- `backend/app/routers/export.py`

### Files Created
- `netlify.toml`
- `render.yaml`
- `DEPLOYMENT_GUIDE.md`
- `MULTI_USER_SETUP.md`
- `QUICK_REFERENCE.md` (this file)

## 🎯 User Experience After Deployment

**For Team Members:**
1. Visit URL
2. Click "Sign in with Google"
3. Grant permissions (one-time)
4. Use the app immediately ✨

**No installation, no setup, no configuration required!**

## 💡 Key Benefits

- ✅ Zero setup for end users
- ✅ Centralized credential management
- ✅ Shared Google Sheet (all users write to same sheet)
- ✅ Shared templates folder
- ✅ Free hosting option available
- ✅ Auto-deploy from GitHub
- ✅ Production-ready authentication
- ✅ Proper CORS and security

## 🔗 Important Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Render Dashboard](https://dashboard.render.com/)
- [Netlify Dashboard](https://app.netlify.com/)
- [Shared Google Sheet](https://docs.google.com/spreadsheets/d/1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc/edit)
- [Templates Folder](https://drive.google.com/drive/folders/172SxFyhZqQHIvq0aRGAF_ykP5DntkzFB)

## 📞 Need Help?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Check `MULTI_USER_SETUP.md` for technical details
3. Check browser console for frontend errors
4. Check Render logs for backend errors
5. Verify all environment variables are set correctly

---

**Ready to deploy? Follow DEPLOYMENT_GUIDE.md step by step!** 🚀
