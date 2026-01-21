"""JWT authentication service for stateless session management."""

import jwt
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production-please")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7


def create_jwt_token(user_info: dict, tokens: dict) -> str:
    """
    Create a JWT token containing user info and OAuth tokens.
    
    Args:
        user_info: User information from Google OAuth
        tokens: OAuth token data (access_token, refresh_token, etc.)
    
    Returns:
        Encoded JWT token string
    """
    payload = {
        "user": user_info,
        "tokens": tokens,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRATION_DAYS),
        "iat": datetime.utcnow(),
    }
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: Encoded JWT token string
    
    Returns:
        Decoded payload containing user and tokens
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_user_from_token(token: Optional[str]) -> Optional[dict]:
    """
    Extract user info from JWT token.
    
    Args:
        token: JWT token string or None
    
    Returns:
        User info dict or None if token is invalid
    """
    if not token:
        return None
    
    try:
        payload = decode_jwt_token(token)
        return payload.get("user")
    except HTTPException:
        return None


def get_tokens_from_jwt(token: Optional[str]) -> Optional[dict]:
    """
    Extract OAuth tokens from JWT token.
    
    Args:
        token: JWT token string or None
    
    Returns:
        OAuth tokens dict or None if token is invalid
    """
    if not token:
        return None
    
    try:
        payload = decode_jwt_token(token)
        return payload.get("tokens")
    except HTTPException:
        return None
