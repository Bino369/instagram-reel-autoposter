import os
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from instagrapi import Client
from instagrapi.exceptions import (
    BadPassword,
    TwoFactorRequired,
    PleaseWaitFewMinutes,
    LoginRequired,
)
from models import Video, Log, Setting
from crypto import decrypt_val, encrypt_val
from config import VIDEOS_DIR, COVERS_DIR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ig_poster")

def get_setting_val(db: Session, key: str, encrypted: bool = False) -> str:
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting or not setting.value:
        return ""
    if encrypted:
        return decrypt_val(setting.value)
    return setting.value

def set_setting_val(db: Session, key: str, value: str, encrypted: bool = False):
    setting = db.query(Setting).filter(Setting.key == key).first()
    stored_val = encrypt_val(value) if encrypted else value
    if setting:
        setting.value = stored_val
    else:
        setting = Setting(key=key, value=stored_val)
        db.add(setting)
    db.commit()

def get_ig_client(db: Session) -> tuple[Client, str]:
    """
    Creates and authenticates instagrapi Client using saved credentials & session.
    Returns (cl, username).
    """
    username = get_setting_val(db, "ig_username")
    password = get_setting_val(db, "ig_password", encrypted=True)

    if not username or not password:
        set_setting_val(db, "ig_status", "Not configured")
        raise ValueError("Instagram username and password are not configured in settings.")

    cl = Client()
    # Apply custom user-agent or settings if saved
    session_json = get_setting_val(db, "ig_session", encrypted=True)
    if session_json:
        try:
            settings_dict = json.loads(session_json)
            cl.set_settings(settings_dict)
            logger.info("Loaded existing Instagram session settings.")
        except Exception as e:
            logger.warning(f"Failed to load session settings: {e}")

    try:
        logged_in = cl.login(username, password)
        if logged_in:
            # Save updated session settings
            updated_settings = cl.get_settings()
            set_setting_val(db, "ig_session", json.dumps(updated_settings), encrypted=True)
            set_setting_val(db, "ig_status", "Connected")
            set_setting_val(db, "ig_last_error", "")
            return cl, username
        else:
            set_setting_val(db, "ig_status", "Needs re-login")
            raise Exception("Login returned False without exception")

    except TwoFactorRequired as e:
        msg = f"2FA required for user {username}: {str(e)}"
        set_setting_val(db, "ig_status", "2FA required")
        set_setting_val(db, "ig_last_error", msg)
        raise Exception(msg)
    except BadPassword:
        msg = f"Invalid password for user {username}"
        set_setting_val(db, "ig_status", "Needs re-login")
        set_setting_val(db, "ig_last_error", msg)
        raise Exception(msg)
    except PleaseWaitFewMinutes as e:
        msg = "Instagram rate-limit reached. Please wait a few minutes."
        set_setting_val(db, "ig_last_error", msg)
        raise Exception(msg)
    except Exception as e:
        err_msg = str(e)
        set_setting_val(db, "ig_status", "Needs re-login" if "login" in err_msg.lower() else "Error")
        set_setting_val(db, "ig_last_error", err_msg)
        raise Exception(f"Instagram authentication failed: {err_msg}")

def post_video_by_id(db: Session, video_id: int) -> Video:
    """
    Posts a specific video reel to Instagram.
    Updates DB status, timestamps, and creates Log entry.
    """
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise ValueError(f"Video ID {video_id} not found.")

    video.status = "Posting"
    db.commit()

    video_path = os.path.join(VIDEOS_DIR, video.filename)
    if not os.path.exists(video_path):
        video.status = "Failed"
        db.commit()
        err_msg = f"Video file not found on disk: {video.filename}"
        log_entry = Log(video_id=video.id, status="Failed", message=err_msg)
        db.add(log_entry)
        db.commit()
        raise FileNotFoundError(err_msg)

    cover_path = None
    if video.cover_filename:
        possible_cover = os.path.join(COVERS_DIR, video.cover_filename)
        if os.path.exists(possible_cover):
            cover_path = possible_cover

    try:
        # Check if in Demo/Dry-Run mode (if IG user set to 'demo' or simulated mode)
        ig_username = get_setting_val(db, "ig_username")
        if ig_username == "demo_account":
            logger.info("Demo account detected. Simulating reel post.")
            video.status = "Posted"
            video.posted_at = datetime.utcnow()
            db.commit()
            log_entry = Log(
                video_id=video.id,
                status="Success",
                message=f"[DEMO MODE] Reel '{video.filename}' posted successfully!"
            )
            db.add(log_entry)
            db.commit()
            return video

        cl, username = get_ig_client(db)

        # Upload Reel to Instagram using instagrapi
        logger.info(f"Uploading reel {video.filename} to IG account @{username}...")
        media = cl.clip_upload(
            path=video_path,
            caption=video.caption or "",
            thumbnail=cover_path
        )

        video.status = "Posted"
        video.posted_at = datetime.utcnow()
        db.commit()

        log_msg = f"Successfully posted Reel to @{username} (Media ID: {media.pk})"
        log_entry = Log(video_id=video.id, status="Success", message=log_msg)
        db.add(log_entry)
        db.commit()

        return video

    except Exception as e:
        error_detail = str(e)
        logger.error(f"Failed to post video #{video.id}: {error_detail}")
        video.status = "Failed"
        db.commit()

        log_entry = Log(
            video_id=video.id,
            status="Failed",
            message=f"Post failed: {error_detail}"
        )
        db.add(log_entry)
        db.commit()
        raise Exception(error_detail)
