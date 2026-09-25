import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import QueueDashboard from './pages/QueueDashboard';
import UploadPage from './pages/UploadPage';
import InstagramSettingsPage from './pages/InstagramSettingsPage';
import LogsPage from './pages/LogsPage';
import { videoApi, settingsApi, authApi } from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem('ig_poster_token'))
  );
  const [activeTab, setActiveTab] = useState('queue');
  const [videos, setVideos] = useState([]);
  const [igStatus, setIgStatus] = useState(null);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [videoList, igData, schedData] = await Promise.all([
        videoApi.list(),
        settingsApi.getInstagram(),
        settingsApi.getSchedule(),
      ]);
      setVideos(videoList);
      setIgStatus(igData);
      setScheduleInfo(schedData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      // Auto-refresh queue and status every 20 seconds
      const interval = setInterval(fetchAllData, 20000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchAllData]);

  useEffect(() => {
    const handleLogoutEvent = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth-logout', handleLogoutEvent);
    return () => window.removeEventListener('auth-logout', handleLogoutEvent);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    fetchAllData();
  };

  const handleLogout = () => {
    localStorage.removeItem('ig_poster_token');
    localStorage.removeItem('ig_poster_user');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const pendingCount = videos.filter((v) => v.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        igStatus={igStatus}
        scheduleInfo={scheduleInfo}
        pendingCount={pendingCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading && videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
            <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin"></div>
            <p className="text-sm text-slate-400">Loading your Reel Studio...</p>
          </div>
        ) : (
          <>
            {activeTab === 'queue' && (
              <QueueDashboard
                videos={videos}
                onRefresh={fetchAllData}
                onOpenUpload={() => setActiveTab('upload')}
                scheduleInfo={scheduleInfo}
              />
            )}

            {activeTab === 'upload' && (
              <UploadPage
                onUploadComplete={() => {
                  fetchAllData();
                  setActiveTab('queue');
                }}
                currentQueueLength={videos.length}
              />
            )}

            {activeTab === 'settings' && (
              <InstagramSettingsPage onSettingsUpdated={fetchAllData} />
            )}

            {activeTab === 'logs' && <LogsPage />}
          </>
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>InstaReel Studio • Automated Background Publisher • Powered by FastAPI & Instagrapi</p>
      </footer>
    </div>
  );
}
