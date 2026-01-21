"""Application configuration and settings."""

import os
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings(BaseModel):
    """Application settings."""
    
    # Default values
    default_campaign: str = ""  # Will be computed based on current month
    default_start_number: int = 1
    default_date: str = ""  # Will be computed as today
    
    # Frame extraction settings
    frames_fps: int = 1  # Extract 1 frame per second
    extract_first_last: bool = True  # Also extract first and last frames
    
    # Temp directory for extracted frames
    temp_dir: Path = Path("/tmp/vanha_autonamer")
    
    # Perceptual hash threshold for matching
    hash_threshold: int = 25  # Hash distance threshold (typical pairs are 15-25)
    
    # OCR overlap threshold for grouping
    ocr_overlap_threshold: float = 0.5  # 50% text overlap
    
    # Google OAuth Settings
    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/callback")
    google_picker_api_key: str = os.getenv("GOOGLE_PICKER_API_KEY", "")
    
    # Session settings (deprecated - using JWT now)
    session_secret: str = os.getenv("SESSION_SECRET", "vanha-secret-change-me")
    
    # JWT settings
    jwt_secret: str = os.getenv("JWT_SECRET", "change-me-in-production-please")
    jwt_algorithm: str = "HS256"
    jwt_expiration_days: int = 7
    
    # CORS settings
    allowed_origins: list[str] = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",") if os.getenv("ALLOWED_ORIGINS") else ["http://localhost:5173", "http://localhost:3000"]
    
    # OAuth scopes (include openid as Google adds it automatically)
    google_scopes: list[str] = [
        "openid",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]
    
    # Google Sheets settings
    google_sheets_id: str = os.getenv("GOOGLE_SHEETS_ID", "1de9qW6gwfrGzM_gch1gUy_4l5XRd6CnE67YKji42sHc")
    
    # Copy Doc Templates folder
    copy_doc_folder_id: str = os.getenv("COPY_DOC_FOLDER_ID", "172SxFyhZqQHIvq0aRGAF_ykP5DntkzFB")
    
    # Backend base URL (for absolute thumbnail URLs in production)
    backend_base_url: str = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
    
    @staticmethod
    def get_default_campaign() -> str:
        """Get default campaign name based on current month."""
        month_tokens = [
            "JanAds", "FebAds", "MarAds", "AprAds", "MayAds", "JunAds",
            "JulAds", "AugAds", "SepAds", "OctAds", "NovAds", "DecAds"
        ]
        return month_tokens[datetime.now().month - 1]
    
    @staticmethod
    def get_default_date() -> str:
        """Get today's date in YYYY.MM.DD format."""
        return datetime.now().strftime("%Y.%m.%d")


# Global settings instance
settings = Settings()


# Angle options
ANGLE_OPTIONS = [
    "ProductFocus",
    "Offer",
    "Price",
    "SocialProof",
    "Education",
    "BehindTheScenes",
    "Founder",
    "Brand",
    "Newness",
]

# Client list (can be extended)
CLIENT_OPTIONS = [
    "ClientA",
    "ClientB", 
    "ClientC",
]

# Copy Doc Templates - Deprecated: Now using copy_doc_folder_id from settings
# Kept for backwards compatibility
COPY_DOC_TEMPLATES = {}
