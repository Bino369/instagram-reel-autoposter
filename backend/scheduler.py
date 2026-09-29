import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Video, Setting, Log
from ig_poster import post_video_by_id

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")

scheduler = BackgroundScheduler()
JOB_ID = "ig_autopost_job"

def auto_post_next_job():
    logger.info("Scheduler triggered auto_post_next_job()")
    db = SessionLocal()
    try:
        # Check if auto-posting is enabled
        enabled_setting = db.query(Setting).filter(Setting.key == "schedule_enabled").first()
        if enabled_setting and enabled_setting.value == "false":
            logger.info("Schedule auto-posting is disabled.")
            return

        # Find next pending video
        next_video = db.query(Video).filter(Video.status == "Pending").order_by(Video.queue_number.asc()).first()
        if not next_video:
            logger.info("No Pending videos found in queue.")
            return

        logger.info(f"Posting video ID {next_video.id} (Queue #{next_video.queue_number})...")
        post_video_by_id(db, next_video.id)

    except Exception as e:
        logger.error(f"Error during scheduled posting job: {e}")
    finally:
        db.close()

from config import DEFAULT_POST_INTERVAL_MINUTES

def get_interval_minutes(db) -> int:
    setting_min = db.query(Setting).filter(Setting.key == "interval_minutes").first()
    if setting_min and setting_min.value:
        try:
            return max(1, int(setting_min.value))
        except ValueError:
            pass

    setting_hr = db.query(Setting).filter(Setting.key == "interval_hours").first()
    if setting_hr and setting_hr.value:
        try:
            return max(1, int(setting_hr.value) * 60)
        except ValueError:
            pass

    return DEFAULT_POST_INTERVAL_MINUTES

def get_interval_breakdown(db) -> tuple[int, int, int]:
    total_minutes = get_interval_minutes(db)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return hours, minutes, total_minutes

def get_interval_hours(db) -> int:
    total_minutes = get_interval_minutes(db)
    return max(1, total_minutes // 60) if total_minutes >= 60 else 1

def start_scheduler():
    db = SessionLocal()
    try:
        total_mins = get_interval_minutes(db)
        if not scheduler.running:
            scheduler.add_job(
                auto_post_next_job,
                "interval",
                minutes=total_mins,
                id=JOB_ID,
                replace_existing=True,
                next_run_time=datetime.now() + timedelta(seconds=10) # Start first check 10 seconds after server launch
            )
            scheduler.start()
            logger.info(f"Scheduler started with interval of {total_mins} minutes.")
    finally:
        db.close()

def update_scheduler_interval(minutes: int):
    if minutes < 1:
        minutes = 1
    if scheduler.running:
        if scheduler.get_job(JOB_ID):
            scheduler.reschedule_job(JOB_ID, trigger="interval", minutes=minutes)
            logger.info(f"Rescheduled job to run every {minutes} minutes.")
        else:
            scheduler.add_job(
                auto_post_next_job,
                "interval",
                minutes=minutes,
                id=JOB_ID,
                replace_existing=True
            )

def get_next_run_time():
    if scheduler.running:
        job = scheduler.get_job(JOB_ID)
        if job and job.next_run_time:
            return job.next_run_time
    return None
