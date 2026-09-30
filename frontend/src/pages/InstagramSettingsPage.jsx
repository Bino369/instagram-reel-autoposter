import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Save,
  RefreshCw,
  Info,
  Sliders,
  Sparkles,
  Key,
  Cookie,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
  Check,
  Copy
} from 'lucide-react';
import InstagramIcon from '../components/InstagramIcon';
import { settingsApi } from '../services/api';
import { formatScheduleInterval, formatScheduleIntervalFull } from '../utils/formatters';

export default function InstagramSettingsPage({ onSettingsUpdated }) {
  const [activeTab, setActiveTab] = useState('sessionid'); // 'sessionid' or 'password'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [showGuide, setShowGuide] = useState(true);
  const [statusInfo, setStatusInfo] = useState(null);
  const [intervalHours, setIntervalHours] = useState(6);
  const [intervalMinutes, setIntervalMinutes] = useState(0);
  const [nextRunTime, setNextRunTime] = useState(null);

  const [savingIg, setSavingIg] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [igData, scheduleData] = await Promise.all([
        settingsApi.getInstagram(),
        settingsApi.getSchedule()
      ]);
      setUsername(igData.username || '');
      setStatusInfo(igData);

      // Default to sessionid tab unless user has active password login
      if (igData.login_type === 'password' && igData.status === 'Connected') {
        setActiveTab('password');
      } else {
        setActiveTab('sessionid');
      }

      const h = scheduleData.interval_hours ?? Math.floor((scheduleData.total_minutes || 360) / 60);
      const m = scheduleData.interval_minutes ?? ((scheduleData.total_minutes || 360) % 60);
      setIntervalHours(h);
      setIntervalMinutes(m);
      setNextRunTime(scheduleData.next_run_time);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveSessionId = async (e) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      setMessage({ type: 'error', text: 'Please enter your Instagram sessionid cookie value.' });
      return;
    }
    setSavingIg(true);
    setMessage({ type: '', text: '' });

    try {
      const updated = await settingsApi.saveInstagram({ sessionid: sessionId.trim() });
      setStatusInfo(updated);
      setUsername(updated.username || '');
      setSessionId(''); // Do not keep raw sessionid in input
      if (updated.status === 'Connected') {
        setMessage({
          type: 'success',
          text: `Instagram account connected successfully as @${updated.username}! Session cookie verified.`
        });
      } else {
        setMessage({
          type: 'warning',
          text: `Connection status: ${updated.status}. ${updated.last_error || ''}`
        });
      }
      onSettingsUpdated();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.detail || err.message || 'Failed to authenticate with Session ID.'
      });
    } finally {
      setSavingIg(false);
    }
  };

  const handleSavePasswordLogin = async (e) => {
    e.preventDefault();
    setSavingIg(true);
    setMessage({ type: '', text: '' });

    try {
      const updated = await settingsApi.saveInstagram({
        username: username.trim(),
        password: password || undefined
      });
      setStatusInfo(updated);
      setPassword(''); // Never keep password in input after submit
      if (updated.status === 'Connected') {
        setMessage({ type: 'success', text: 'Instagram account connected & verified successfully!' });
      } else if (updated.status === '2FA required') {
        setMessage({
          type: 'error',
          text: '2FA Challenge Required by Instagram. Tip: Switch to the Session ID tab above to bypass 2FA easily.'
        });
      } else {
        setMessage({ type: 'warning', text: `Connection status: ${updated.status}. ${updated.last_error || ''}` });
      }
      onSettingsUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to verify Instagram credentials.' });
    } finally {
      setSavingIg(false);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    const h = parseInt(intervalHours) || 0;
    const m = parseInt(intervalMinutes) || 0;
    const totalMinutes = h * 60 + m;

    if (totalMinutes < 1) {
      setMessage({ type: 'error', text: 'Interval must be at least 1 minute.' });
      return;
    }

    setSavingSchedule(true);
    try {
      const updated = await settingsApi.saveSchedule({
        interval_hours: h,
        interval_minutes: m,
        total_minutes: totalMinutes,
      });
      setIntervalHours(updated.interval_hours);
      setIntervalMinutes(updated.interval_minutes);
      setNextRunTime(updated.next_run_time);
      setMessage({
        type: 'success',
        text: `Posting schedule updated to ${formatScheduleIntervalFull(updated)}.`,
      });
      onSettingsUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update schedule interval.' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const setDemoMode = async () => {
    setActiveTab('password');
    setUsername('demo_account');
    setPassword('demo_pass_123');
  };

  const getStatusDisplay = () => {
    if (!statusInfo) return null;

    if (statusInfo.status === 'Connected') {
      return (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Instagram Connected</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {statusInfo.login_type === 'sessionid' ? 'Session ID Cookie' : 'Password Login'}
              </span>
            </div>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              Logged in as <strong>@{statusInfo.username}</strong>. Session is active and encrypted at rest.
            </p>
          </div>
        </div>
      );
    }

    if (statusInfo.status === '2FA required') {
      return (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Two-Factor Authentication Required</p>
            <p className="text-xs text-rose-300/90 mt-1">
              Instagram security checkpoint requested approval for @{statusInfo.username}.
            </p>
            <p className="text-xs text-amber-300 mt-1">
              👉 <strong>Recommended fix:</strong> Use the <strong>Session ID</strong> tab below to connect directly with your browser session and bypass 2FA!
            </p>
            {statusInfo.last_error && (
              <p className="text-[11px] font-mono mt-1.5 p-2 rounded bg-black/40 text-rose-200">
                {statusInfo.last_error}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (statusInfo.status === 'Needs re-login' || statusInfo.status === 'Error') {
      const isVersionError =
        statusInfo.last_error &&
        (statusInfo.last_error.toLowerCase().includes('out of date') ||
          statusInfo.last_error.toLowerCase().includes('upgrade your app'));

      return (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {isVersionError ? 'Instagram Mobile Login Blocked' : 'Re-authentication Required'}
            </p>
            <p className="text-xs text-amber-300/90 mt-1">
              {isVersionError
                ? "Instagram blocks mobile app password logins with 'Your version of Instagram is out of date'. Use the Session ID tab below to connect via web cookie—it bypasses this restriction 100%!"
                : 'The existing session expired or credentials need verification.'}
            </p>
            {statusInfo.last_error && (
              <p className="text-[11px] font-mono mt-1.5 p-2 rounded bg-black/40 text-amber-200 break-all">
                {statusInfo.last_error}
              </p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 text-slate-400 mt-0.5" />
        <div>
          <p className="font-semibold text-sm text-slate-200">Account Not Configured</p>
          <p className="text-xs mt-0.5">
            Connect your Instagram account below using your <strong>Session ID cookie</strong> (recommended) or username and password to enable automated reel publishing.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Instagram Account & Schedule</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your Instagram authentication, session status, and automated background posting schedule.
        </p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : message.type === 'warning'
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="flex-1">{message.text}</span>
        </div>
      )}

      {/* Connection Status Banner */}
      {getStatusDisplay()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Instagram Account Credentials Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl instagram-gradient flex items-center justify-center shadow-md">
                <InstagramIcon size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Instagram Login</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={setDemoMode}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 transition-colors flex items-center gap-1"
              title="Fill demo credentials for testing UI without live IG account"
            >
              <Sparkles size={11} />
              <span>Demo Mode</span>
            </button>
          </div>

          {/* Login Method Tabs */}
          <div className="flex p-1 rounded-xl bg-slate-900/90 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('sessionid')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'sessionid'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cookie size={14} />
              <span>Session ID</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-medium">
                Recommended
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'password'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key size={14} />
              <span>Username & Password</span>
            </button>
          </div>

          {activeTab === 'sessionid' ? (
            /* SESSION ID FORM */
            <form onSubmit={handleSaveSessionId} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Instagram sessionid Cookie
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  >
                    <HelpCircle size={13} />
                    <span>{showGuide ? 'Hide instructions' : 'How to get it?'}</span>
                    {showGuide ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Cookie size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="e.g. 68912345678%3AUy794..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-pink-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400 flex-shrink-0" />
                  <span>Bypasses mobile app version checks & 2FA blocks. Stored encrypted at rest.</span>
                </p>
              </div>

              {/* Step-by-Step Guide Card */}
              {showGuide && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2.5">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span className="flex items-center gap-1.5 text-pink-400">
                      <HelpCircle size={14} /> How to get your Session ID (30 sec)
                    </span>
                    <a
                      href="https://www.instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-pink-400 hover:underline flex items-center gap-1"
                    >
                      <span>instagram.com</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                    <li>
                      Open <strong className="text-slate-200">instagram.com</strong> in your browser (Chrome, Edge, Firefox, Brave) and make sure you are logged in.
                    </li>
                    <li>
                      Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono">F12</kbd> (or right-click anywhere and click <strong className="text-slate-200">Inspect</strong>).
                    </li>
                    <li>
                      Click the <strong className="text-slate-200">Application</strong> tab at the top (in Firefox, it is named <strong className="text-slate-200">Storage</strong>).
                    </li>
                    <li>
                      In the left sidebar, expand <strong className="text-slate-200">Cookies</strong> and select <strong className="text-slate-200">https://www.instagram.com</strong>.
                    </li>
                    <li>
                      Find the cookie named <code className="text-pink-400 bg-pink-500/10 px-1 py-0.5 rounded font-mono">sessionid</code>. Double-click its <strong className="text-slate-200">Value</strong>, copy it, and paste it above!
                    </li>
                  </ol>
                </div>
              )}

              <button
                type="submit"
                disabled={savingIg || !sessionId.trim()}
                className="w-full py-2.5 px-4 rounded-xl instagram-gradient hover:opacity-95 text-white font-semibold text-sm shadow-md shadow-pink-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {savingIg ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Verifying Session with Instagram...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Connect with Session ID</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* USERNAME & PASSWORD FORM */
            <form onSubmit={handleSavePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Instagram Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. your_creator_handle"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Instagram Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={statusInfo?.is_configured ? '•••••••• (Stored Encrypted)' : 'Enter password'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  <span>Encrypted at rest using AES-256 Fernet. Never exposed to browser.</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Note:</strong> Instagram frequently blocks automated mobile password logins with &quot;Version out of date&quot;. If you encounter this, switch to the <strong>Session ID</strong> tab above to connect immediately.
                </span>
              </div>

              <button
                type="submit"
                disabled={savingIg || !username.trim()}
                className="w-full py-2.5 px-4 rounded-xl instagram-gradient hover:opacity-95 text-white font-semibold text-sm shadow-md shadow-pink-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {savingIg ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Verifying with Instagram...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Save & Test Password Login</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Scheduler Interval Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Posting Schedule</h2>
              <p className="text-xs text-slate-400">Set the automated interval between reel posts (hours and minutes).</p>
            </div>
          </div>

          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Posting Interval
              </label>

              {/* Hours and Minutes inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 mb-1 block">Hours</span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock size={15} />
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="72"
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 mb-1 block">Minutes</span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Clock size={15} />
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={intervalHours > 0 ? 59 : 1440}
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="mt-3 space-y-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '15m', h: 0, m: 15 },
                    { label: '30m', h: 0, m: 30 },
                    { label: '45m', h: 0, m: 45 },
                    { label: '1h', h: 1, m: 0 },
                    { label: '2h', h: 2, m: 0 },
                    { label: '4h', h: 4, m: 0 },
                    { label: '6h', h: 6, m: 0 },
                    { label: '12h', h: 12, m: 0 },
                    { label: '24h', h: 24, m: 0 },
                  ].map((preset) => {
                    const isActive =
                      Number(intervalHours) === preset.h &&
                      Number(intervalMinutes) === preset.m;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setIntervalHours(preset.h);
                          setIntervalMinutes(preset.m);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          isActive
                            ? 'bg-pink-600 text-white border-pink-500 font-semibold shadow-sm'
                            : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Effective Interval live preview */}
              <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Effective Interval:</span>
                <span className="font-semibold text-pink-400">
                  {formatScheduleIntervalFull({
                    interval_hours: Number(intervalHours) || 0,
                    interval_minutes: Number(intervalMinutes) || 0,
                    total_minutes:
                      (Number(intervalHours) || 0) * 60 +
                      (Number(intervalMinutes) || 0),
                  })}
                  {' '}
                  <span className="text-[11px] text-slate-400 font-normal">
                    ({(Number(intervalHours) || 0) * 60 + (Number(intervalMinutes) || 0)} min)
                  </span>
                </span>
              </div>
            </div>

            {nextRunTime && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span className="text-slate-400">Next Scheduled Run:</span>
                <span className="font-mono text-pink-400 font-semibold">
                  {new Date(nextRunTime).toLocaleString()}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                savingSchedule ||
                (Number(intervalHours) || 0) * 60 +
                  (Number(intervalMinutes) || 0) <
                  1
              }
              className="w-full py-2.5 px-4 rounded-xl instagram-gradient hover:opacity-95 text-white font-semibold text-sm shadow-md shadow-pink-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {savingSchedule ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Updating Scheduler...</span>
                </>
              ) : (
                <>
                  <Clock size={15} />
                  <span>Update Schedule Interval</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-[12px] text-slate-400 space-y-1">
            <p><strong>How Auto-Posting Works:</strong></p>
            <p>1. Background worker wakes up every {formatScheduleInterval({ interval_hours: Number(intervalHours) || 0, interval_minutes: Number(intervalMinutes) || 0 })}.</p>
            <p>2. Selects the next reel marked <em>Pending</em> with lowest queue number.</p>
            <p>3. Uploads reel to Instagram with your caption and custom cover.</p>
            <p>4. Marks as <em>Posted</em> and records execution log.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
