import os
import shutil
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import engine, Base, get_db
from models import Video, Log, Setting
from schemas import (
    LoginRequest, TokenResponse, VideoResponse, VideoEditRequest,
    VideoReorderRequest, LogResponse, InstagramSettingsRequest,
    InstagramSettingsResponse, ScheduleSettingsRequest, ScheduleSettingsResponse
)
from auth import authenticate_user, verify_token
from crypto import encrypt_val, decrypt_val
from ig_poster import post_video_by_id, get_ig_client, get_setting_val, set_setting_val
from scheduler import start_scheduler, update_scheduler_interval, get_next_run_time, get_interval_hours
from config import UPLOADS_DIR, VIDEOS_DIR, COVERS_DIR

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Instagram Reel Auto-Poster API", version="1.0.0")

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static files directory
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

@app.on_event("startup")
def on_startup():
    start_scheduler()

def format_video_response(video: Video, interval_hours: int, pending_start_index: int = 0) -> VideoResponse:
    video_url = f"/uploads/videos/{video.filename}"
    cover_url = f"/uploads/covers/{video.cover_filename}" if video.cover_filename else None
    
    # Calculate estimated scheduled_at if pending
    scheduled = video.scheduled_at
    if video.status == "Pending" and not scheduled:
        next_run = get_next_run_time() or (datetime.now() + timedelta(minutes=5))
        scheduled = next_run + timedelta(hours=interval_hours * pending_start_index)

    return VideoResponse(
        id=video.id,
        queue_number=video.queue_number,
        filename=video.filename,
        caption=video.caption or "",
        cover_filename=video.cover_filename,
        status=video.status,
        scheduled_at=scheduled,
        posted_at=video.posted_at,
        created_at=video.created_at,
        video_url=video_url,
        cover_url=cover_url
    )

# --- AUTH ROUTES ---

@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    token = authenticate_user(payload.username, payload.password)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    return TokenResponse(token=token, username=payload.username)

@app.get("/api/auth/me")
def get_me(username: str = Depends(verify_token)):
    return {"username": username, "authenticated": True}


# --- VIDEO ROUTES ---

@app.get("/api/videos", response_model=List[VideoResponse])
def list_videos(db: Session = Depends(get_db), current_user: str = Depends(verify_token)):
    videos = db.query(Video).order_by(Video.queue_number.asc()).all()
    interval = get_interval_hours(db)
    
    result = []
    pending_idx = 0
    for v in videos:
        res = format_video_response(v, interval, pending_idx)
        if v.status == "Pending":
            pending_idx += 1
        result.append(res)
    return result

@app.post("/api/videos", response_model=List[VideoResponse])
async def upload_videos(
    files: List[UploadFile] = File(...),
    cover_file: Optional[UploadFile] = File(None),
    caption: Optional[str] = Form(""),
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_token)
):
    if not files:
        raise HTTPException(status_code=400, detail="No video files uploaded")

    # Get max current queue_number
    max_queue = db.query(func.max(Video.queue_number)).scalar() or 0

    # Save cover image if provided
    cover_filename = None
    if cover_file and cover_file.filename:
        ext = os.path.splitext(cover_file.filename)[1].lower() or ".jpg"
        cover_filename = f"cover_{uuid.uuid4().hex[:8]}{ext}"
        cover_path = os.path.join(COVERS_DIR, cover_filename)
        with open(cover_path, "wb") as buffer:
            shutil.copyfileobj(cover_file.file, buffer)

    created_videos = []
    interval = get_interval_hours(db)

    for idx, file in enumerate(files):
        if not file.filename:
            continue
        max_queue += 1
        ext = os.path.splitext(file.filename)[1].lower() or ".mp4"
        safe_filename = f"{max_queue}_{uuid.uuid4().hex[:6]}{ext}"
        video_path = os.path.join(VIDEOS_DIR, safe_filename)

        with open(video_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        video = Video(
            queue_number=max_queue,
            filename=safe_filename,
            caption=caption or "",
            cover_filename=cover_filename,
            status="Pending",
            created_at=datetime.utcnow()
        )
        db.add(video)
        db.commit()
        db.refresh(video)

        created_videos.append(format_video_response(video, interval, idx))

    return created_videos

@app.patch("/api/videos/{video_id}", response_model=VideoResponse)
async def update_video(
    video_id: int,
    caption: Optional[str] = Form(None),
    queue_number: Optional[int] = Form(None),
    cover_file: Optional[UploadFile] = File(None),
    remove_cover: Optional[bool] = Form(False),
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_token)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if caption is not None:
        video.caption = caption

    if queue_number is not None:
        video.queue_number = queue_number

    if remove_cover:
        if video.cover_filename:
            other_using = (
                db.query(Video)
                .filter(Video.id != video.id, Video.cover_filename == video.cover_filename)
                .first()
            )
            if not other_using:
                old_path = os.path.join(COVERS_DIR, video.cover_filename)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception:
                        pass
            video.cover_filename = None

    if cover_file and cover_file.filename:
        ext = os.path.splitext(cover_file.filename)[1].lower() or ".jpg"
        new_cover_filename = f"cover_{uuid.uuid4().hex[:8]}{ext}"
        cover_path = os.path.join(COVERS_DIR, new_cover_filename)
        with open(cover_path, "wb") as buffer:
            shutil.copyfileobj(cover_file.file, buffer)
        video.cover_filename = new_cover_filename

    db.commit()
    db.refresh(video)
    interval = get_interval_hours(db)
    return format_video_response(video, interval, 0)

@app.post("/api/videos/reorder")
def reorder_videos(
    payload: VideoReorderRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_token)
):
    for item in payload.items:
        video = db.query(Video).filter(Video.id == item.id).first()
        if video:
            video.queue_number = item.queue_number
    db.commit()
    return {"message": "Queue reordered successfully"}

@app.delete("/api/videos/{video_id}")
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_token)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Remove files from disk
    v_path = os.path.join(VIDEOS_DIR, video.filename)
    if os.path.exists(v_path):
        try:
            os.remove(v_path)
        except Exception:
            pass

    if video.cover_filename:
        other_using = (
            db.query(Video)
            .filter(Video.id != video.id, Video.cover_filename == video.cover_filename)
            .first()
        )
        if not other_using:
            c_path = os.path.join(COVERS_DIR, video.cover_filename)
            if os.path.exists(c_path):
                try:
                    os.remove(c_path)
                except Exception:
                    pass

    db.delete(video)
    db.commit()
    return {"message": f"Video #{video_id} deleted successfully"}

@app.post("/api/videos/{video_id}/post-now", response_model=VideoResponse)
def post_now(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_token)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    try:
        updated_video = post_video_by_id(db, video_id)
        interval = get_interval_hours(db)
        return format_video_response(updated_video, interval, 0)
    except Exception as e:
        db.refresh(video)
        interval = get_interval_hours(db)
        raise HTTPException(status_code=400, detail=str(e))


# --- LOGS ROUTE ---

@app.get("/api/logs", response_model=List[LogResponse])
def get_logs(db: Session = Depends(get_db), current_user: str = Depends(verify_token)):
    logs = db.query(Log).order_by(Log.created_at.desc()).limit(100).all()
    return logs


# --- SETTINGS ROUTES ---

@app.get("/api/settings/instagram", response_model=InstagramSettingsResponse)
def get_instagram_settings(db: Session = Depends(get_db), current_user: str = Depends(verify_token)):
    username = get_setting_val(db, "ig_username")
    password = get_setting_val(db, "ig_password", encrypted=True)
    status_val = get_setting_val(db, "ig_status") or ("Connected" if (username and password) else "Not configured")
    last_error = get_setting_val(db, "ig_last_error")

    return InstagramSettingsResponse(
        username=username or "",
        is_configured=bool(username and password),
        status=status_val,
        last_error=last_error or None
    )

@app.post("/api/settings/instagram", response_model=InstagramSettingsResponse)
def save_instagram_settings(
    payload: InstagramSettingsRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_token)
):
    set_setting_val(db, "ig_username", payload.username)
    if payload.password:
        set_setting_val(db, "ig_password", payload.password, encrypted=True)

    # Test login connection if credentials present
    status_val = "Not configured"
    last_err = ""

    if payload.username and (payload.password or get_setting_val(db, "ig_password", encrypted=True)):
        if payload.username == "demo_account":
            status_val = "Connected"
            set_setting_val(db, "ig_status", "Connected")
            set_setting_val(db, "ig_last_error", "")
        else:
            try:
                cl, username = get_ig_client(db)
                status_val = "Connected"
            except Exception as e:
                last_err = str(e)
                status_val = get_setting_val(db, "ig_status") or "Needs re-login"

    return InstagramSettingsResponse(
        username=payload.username,
        is_configured=bool(payload.username),
        status=status_val,
        last_error=last_err or None
    )

@app.get("/api/settings/schedule", response_model=ScheduleSettingsResponse)
def get_schedule_settings(db: Session = Depends(get_db), current_user: str = Depends(verify_token)):
    hours = get_interval_hours(db)
    next_run = get_next_run_time()
    enabled = get_setting_val(db, "schedule_enabled") != "false"

    return ScheduleSettingsResponse(
        interval_hours=hours,
        next_run_time=next_run,
        is_active=enabled
    )

@app.post("/api/settings/schedule", response_model=ScheduleSettingsResponse)
def save_schedule_settings(
    payload: ScheduleSettingsRequest,
    db: Session = Depends(get_db),
    current_user: str = Depends(verify_token)
):
    set_setting_val(db, "interval_hours", str(payload.interval_hours))
    update_scheduler_interval(payload.interval_hours)

    next_run = get_next_run_time()
    return ScheduleSettingsResponse(
        interval_hours=payload.interval_hours,
        next_run_time=next_run,
        is_active=True
    )

# Mount frontend production build if available
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")

