"""Authentication routes for Google OAuth."""

import os
import json
import secrets
from typing import Optional
from fastapi import APIRouter, HTTPException, Response, Request, Cookie
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.config import settings
from app.services.google_auth import google_auth_service
from app.services.jwt_auth import create_jwt_token, decode_jwt_token, get_user_from_token, get_tokens_from_jwt

# Frontend URL for redirects - defaults to localhost for development
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

router = APIRouter()


class UserInfo(BaseModel):
    """User info response."""
    id: str
    email: str
    name: str
    picture: Optional[str] = None


class AuthStatus(BaseModel):
    """Auth status response."""
    authenticated: bool
    user: Optional[UserInfo] = None
    picker_api_key: Optional[str] = None
    client_id: Optional[str] = None


def _get_session_from_jwt(jwt_token: Optional[str]) -> Optional[dict]:
    """Get session data from JWT token."""
    if not jwt_token:
        return None
    
    try:
        payload = decode_jwt_token(jwt_token)
        return {
            "tokens": payload.get("tokens"),
            "user": payload.get("user"),
        }
    except HTTPException:
        return None


@router.get("/login")
async def login():
    """Start Google OAuth flow."""
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    state = secrets.token_urlsafe(16)
    authorization_url, _ = google_auth_service.get_authorization_url(state=state)
    
    return RedirectResponse(url=authorization_url)


@router.get("/callback")
async def callback(code: str, state: Optional[str] = None, error: Optional[str] = None):
    """Handle Google OAuth callback."""
    if error:
        # Redirect to frontend with error
        return RedirectResponse(url=f"{FRONTEND_URL}/?auth_error={error}")
    
    try:
        # Exchange code for tokens
        token_data = google_auth_service.exchange_code(code)
        
        # Get user info
        credentials = google_auth_service.get_credentials(token_data)
        user_info = google_auth_service.get_user_info(credentials)
        
        # Create JWT token
        jwt_token = create_jwt_token(user_info, token_data)
        
        # Redirect to frontend with JWT cookie
        response = RedirectResponse(url=f"{FRONTEND_URL}/")
        # Use secure cookies in production (HTTPS)
        is_production = not FRONTEND_URL.startswith("http://localhost")
        response.set_cookie(
            key="session_token",
            value=jwt_token,
            httponly=True,
            secure=is_production,
            samesite="none" if is_production else "lax",
            max_age=60 * 60 * 24 * 7,  # 7 days
        )
        
        return response
        
    except Exception as e:
        print(f"OAuth callback error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}/?auth_error=callback_failed")


@router.get("/me", response_model=AuthStatus)
async def get_current_user(session_token: Optional[str] = Cookie(default=None)):
    """Get current authenticated user."""
    session = _get_session_from_jwt(session_token)
    
    if not session:
        return AuthStatus(
            authenticated=False,
            picker_api_key=settings.google_picker_api_key,
            client_id=settings.google_client_id,
        )
    
    return AuthStatus(
        authenticated=True,
        user=UserInfo(**session["user"]),
        picker_api_key=settings.google_picker_api_key,
        client_id=settings.google_client_id,
    )


@router.post("/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    """Log out and clear session."""
    # Just delete the cookie - JWT is stateless
    response.delete_cookie(key="session_token")
    return {"success": True}


@router.get("/tokens")
async def get_tokens(session_token: Optional[str] = Cookie(default=None)):
    """Get current tokens (for Drive API calls)."""
    session = _get_session_from_jwt(session_token)
    
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return session["tokens"]


def get_credentials_from_session(session_token: Optional[str]):
    """Helper to get Google credentials from JWT token."""
    session = _get_session_from_jwt(session_token)
    if not session:
        return None
    
    token_data = session["tokens"]
    credentials = google_auth_service.get_credentials(token_data)
    
    # Refresh if expired
    if credentials.expired:
        credentials = google_auth_service.refresh_credentials(credentials)
        # Note: With JWT, we can't update the token in-place
        # The user will need to re-authenticate after 7 days
    
    return credentials
