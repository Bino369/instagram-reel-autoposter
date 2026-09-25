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

def get_interval_hours(db) -> int:
    setting = db.query(Setting).filter(Setting.key == "interval_hours").first()
    if setting and setting.value:
        try:
            return max(1, int(setting.value))
        except ValueError:
            pass
    return 6

def start_scheduler():
    db = SessionLocal()
    try:
        hours = get_interval_hours(db)
        if not scheduler.running:
            scheduler.add_job(
                auto_post_next_job,
                "interval",
                hours=hours,
                id=JOB_ID,
                replace_existing=True,
                next_run_time=datetime.now() + timedelta(seconds=10) # Start first check 10 seconds after server launch
            )
            scheduler.start()
            logger.info(f"Scheduler started with interval of {hours} hours.")
    finally:
        db.close()

def update_scheduler_interval(hours: int):
    if hours < 1:
        hours = 1
    if scheduler.running:
        if scheduler.get_job(JOB_ID):
            scheduler.reschedule_job(JOB_ID, trigger="interval", hours=hours)
            logger.info(f"Rescheduled job to run every {hours} hours.")
        else:
            scheduler.add_job(
                auto_post_next_job,
                "interval",
                hours=hours,
                id=JOB_ID,
                replace_existing=True
            )

def get_next_run_time():
    if scheduler.running:
        job = scheduler.get_job(JOB_ID)
        if job and job.next_run_time:
            return job.next_run_time
    return None
