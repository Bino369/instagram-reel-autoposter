from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    username: str

class VideoResponse(BaseModel):
    id: int
    queue_number: int
    filename: str
    caption: Optional[str] = ""
    cover_filename: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    posted_at: Optional[datetime] = None
    created_at: datetime
    video_url: str
    cover_url: Optional[str] = None

    class Config:
        from_attributes = True

class VideoEditRequest(BaseModel):
    caption: Optional[str] = None
    queue_number: Optional[int] = None

class VideoReorderItem(BaseModel):
    id: int
    queue_number: int

class VideoReorderRequest(BaseModel):
    items: List[VideoReorderItem]

class LogResponse(BaseModel):
    id: int
    video_id: Optional[int] = None
    status: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True

class InstagramSettingsRequest(BaseModel):
    username: str
    password: Optional[str] = None # Optional if updating only username or status check

class InstagramSettingsResponse(BaseModel):
    username: str
    is_configured: bool
    status: str # Connected, Needs re-login, 2FA required, Not configured
    last_error: Optional[str] = None

class ScheduleSettingsRequest(BaseModel):
    interval_hours: Optional[int] = Field(0, ge=0, description="Hours component of interval")
    interval_minutes: Optional[int] = Field(0, ge=0, description="Minutes component of interval")
    total_minutes: Optional[int] = Field(None, ge=1, description="Optional total minutes interval")

class ScheduleSettingsResponse(BaseModel):
    interval_hours: int
    interval_minutes: int
    total_minutes: int
    next_run_time: Optional[datetime] = None
    is_active: bool
