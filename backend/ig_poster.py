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

def get_ig_client(db: Session, force_login: bool = False) -> tuple[Client, str]:
    """
    Creates and authenticates instagrapi Client using saved credentials or session.
    Supports both Session ID login (bypasses mobile version blocks and 2FA)
    and traditional Username/Password login.
    Returns (cl, username).
    """
    username = get_setting_val(db, "ig_username")
    password = get_setting_val(db, "ig_password", encrypted=True)
    sessionid = get_setting_val(db, "ig_sessionid", encrypted=True)
    login_type = get_setting_val(db, "ig_login_type") or ("sessionid" if sessionid else "password")

    if not (sessionid or (username and password)):
        set_setting_val(db, "ig_status", "Not configured")
        raise ValueError("Instagram credentials or Session ID are not configured in settings.")

    cl = Client()
    cl.request_timeout = 25

    # Check for cached valid session settings
    session_json = get_setting_val(db, "ig_session", encrypted=True)
    if session_json and not force_login:
        try:
            settings_dict = json.loads(session_json)
            cl.set_settings(settings_dict)
            try:
                # Lightweight check to ensure session is alive
                uid = cl.user_id
                if uid:
                    logger.info(f"Reusing active Instagram session for user {username or uid}.")
                    return cl, username or cl.username or "instagram_user"
            except Exception as check_err:
                logger.warning(f"Cached session validation failed ({check_err}). Re-authenticating...")
        except Exception as e:
            logger.warning(f"Failed to load cached session settings: {e}")

    # Authenticate via Session ID
    if login_type == "sessionid" or (sessionid and (not username or not password)):
        clean_sid = sessionid.strip().strip('"').strip("'")
        try:
            logger.info("Authenticating Instagram client via Session ID...")
            cl.login_by_sessionid(clean_sid)
            resolved_username = cl.username or username or "instagram_user"
            set_setting_val(db, "ig_username", resolved_username)
            set_setting_val(db, "ig_login_type", "sessionid")
            set_setting_val(db, "ig_session", json.dumps(cl.get_settings()), encrypted=True)
            set_setting_val(db, "ig_status", "Connected")
            set_setting_val(db, "ig_last_error", "")
            return cl, resolved_username
        except Exception as e:
            err_msg = str(e)
            if "Invalid sessionid" in err_msg:
                err_msg = "Invalid Session ID. Make sure to copy the full cookie value starting with your numeric User ID (e.g. 68912345678%3A...)."
            logger.error(f"Session ID login failed: {err_msg}")
            set_setting_val(db, "ig_status", "Needs re-login")
            set_setting_val(db, "ig_last_error", err_msg)
            raise Exception(f"Instagram authentication failed: {err_msg}")

    # Authenticate via Username & Password
    try:
        logger.info(f"Authenticating Instagram client for user @{username}...")
        logged_in = cl.login(username, password)
        if logged_in:
            updated_settings = cl.get_settings()
            set_setting_val(db, "ig_session", json.dumps(updated_settings), encrypted=True)
            set_setting_val(db, "ig_login_type", "password")
            set_setting_val(db, "ig_status", "Connected")
            set_setting_val(db, "ig_last_error", "")
            return cl, username
        else:
            set_setting_val(db, "ig_status", "Needs re-login")
            raise Exception("Login returned False without exception")

    except TwoFactorRequired as e:
        msg = f"2FA required for user @{username}: {str(e)}. Tip: Switch to 'Session ID' tab to bypass 2FA easily."
        set_setting_val(db, "ig_status", "2FA required")
        set_setting_val(db, "ig_last_error", msg)
        raise Exception(msg)
    except BadPassword:
        msg = f"Invalid password for user @{username}"
        set_setting_val(db, "ig_status", "Needs re-login")
        set_setting_val(db, "ig_last_error", msg)
        raise Exception(msg)
    except PleaseWaitFewMinutes:
        msg = "Instagram rate-limit reached. Please wait a few minutes or connect via Session ID."
        set_setting_val(db, "ig_last_error", msg)
        raise Exception(msg)
    except Exception as e:
        err_msg = str(e)
        if "out of date" in err_msg.lower() or "upgrade your app" in err_msg.lower():
            err_msg = "Instagram blocked password login ('Version out of date'). Please switch to the 'Session ID' tab to connect without restrictions."
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
