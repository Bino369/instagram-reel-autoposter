import { Film, UploadCloud, Clock, FileText, LogOut, CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';
import InstagramIcon from './InstagramIcon';
import { formatScheduleInterval } from '../utils/formatters';

export default function Navbar({ activeTab, setActiveTab, onLogout, igStatus, scheduleInfo, pendingCount }) {
  const getStatusBadge = () => {
    switch (igStatus?.status) {
      case 'Connected':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Connected
          </span>
        );
      case '2FA required':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert size={12} />
            2FA Required
          </span>
        );
      case 'Needs re-login':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={12} />
            Re-login Needed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            Not Connected
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl instagram-gradient flex items-center justify-center shadow-lg shadow-pink-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">InstaReel</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30">Auto-Poster</span>
            </div>
            <p className="text-[11px] text-slate-400">Scheduled 6-Hour Reel Publisher</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'queue'
                ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Film size={16} />
            Queue
            {pendingCount > 0 && (
              <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'queue' ? 'bg-pink-800 text-pink-100' : 'bg-pink-500/20 text-pink-400'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UploadCloud size={16} />
            Upload Reels
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <InstagramIcon size={16} />
            Account & Timing
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'logs'
                ? 'bg-pink-600 text-white shadow-sm shadow-pink-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText size={16} />
            Logs
          </button>
        </nav>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="hidden sm:block cursor-pointer" onClick={() => setActiveTab('settings')}>
            {getStatusBadge()}
          </div>

          {/* Schedule Info */}
          {scheduleInfo && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
              <Clock size={12} className="text-pink-400" />
              <span>Interval: <strong>{formatScheduleInterval(scheduleInfo)}</strong></span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Log Out"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/90 py-2 px-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
            activeTab === 'queue' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <Film size={18} />
          <span>Queue ({pendingCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
            activeTab === 'upload' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <UploadCloud size={18} />
          <span>Upload</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
            activeTab === 'settings' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <InstagramIcon size={18} />
          <span>Account</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium ${
            activeTab === 'logs' ? 'text-pink-400' : 'text-slate-400'
          }`}
        >
          <FileText size={18} />
          <span>Logs</span>
        </button>
      </div>
    </header>
  );
}
