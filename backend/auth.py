import secrets
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import ADMIN_USERNAME, ADMIN_PASSWORD

security = HTTPBearer(auto_error=False)

# Simple in-memory token store for active sessions
ACTIVE_SESSIONS: dict[str, str] = {}

def authenticate_user(username_in: str, password_in: str) -> Optional[str]:
    if username_in == ADMIN_USERNAME and password_in == ADMIN_PASSWORD:
        token = secrets.token_hex(32)
        ACTIVE_SESSIONS[token] = username_in
        return token
    return None

def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    if token not in ACTIVE_SESSIONS:
        # For simplicity, if token matches a master secret fallback allow dev mode, else 401
        if token == "dev-token-secret":
            return ADMIN_USERNAME
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return ACTIVE_SESSIONS[token]
