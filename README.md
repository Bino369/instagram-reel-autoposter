# 🎬 InstaReel Auto-Poster Studio

> A personal full-stack dashboard tool to schedule, manage, and automatically post video reels (1.mp4, 2.mp4, 3.mp4...) to Instagram every 6 hours, powered by FastAPI, APScheduler, and React.

---

## ✨ Features

- **Automated 6-Hour Background Worker**: Embedded `APScheduler` background service inside FastAPI that wakes up every 6 hours (configurable from 1 to 72 hours), retrieves the next pending reel in sequence, and publishes it via `instagrapi`.
- **Drag-and-Drop Batch Uploads**: Drop multiple numbered reels (`1.mp4`, `2.mp4`...) to auto-assign sequence numbers and calculate scheduled posting timestamps.
- **Per-Video Caption & Hashtag Editor**: Live 2200 character counter with one-click popular hashtag suggestions.
- **Custom Cover Thumbnail**: Upload custom cover images or let Instagram select a representative video frame.
- **Interactive Queue Management**:
  - Live sequence numbering (`#1`, `#2`, `#3`...)
  - Drag-and-drop or one-click Up/Down priority reordering
  - Inline video playback preview lightbox
  - "Post Now" button to publish immediately outside the schedule with celebratory confetti
  - In-place modal to modify caption, cover, or queue position without re-uploading
- **Instagram Session Persistence & 2FA Alerting**:
  - Encrypted storage at rest for credentials and session cookies using AES-256 Fernet
  - Surfacing of Instagram 2FA checkpoints and password re-authentication challenges
- **Chronological Audit Trail**: Full logs page tracking every automated and manual posting attempt with timestamps and error diagnostics.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, FastAPI, APScheduler, instagrapi, SQLAlchemy, SQLite, Cryptography (Fernet)
- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Axios, Canvas Confetti

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt 
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend Setup (Development)

```bash
cd frontend
npm install
npm run dev
```

Visit the dashboard at [http://localhost:5173](http://localhost:5173) (or [http://localhost:8000](http://localhost:8000) when served via FastAPI).

Default login credentials:
- **Username**: `admin`
- **Password**: `admin123`

---

## ⚙️ Environment Configuration

Create a `.env` file in the `backend/` folder:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SECRET_KEY=your_secure_secret_key_here
DATABASE_URL=sqlite:///./data/reelposter.db
```

---

## 🔒 Security

- All Instagram credentials and session states are encrypted at rest using AES-256 Fernet.
- Sensitive files (`.env`, uploaded videos, and database files) are strictly excluded via `.gitignore`.
