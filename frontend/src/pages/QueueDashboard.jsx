import React, { useState } from 'react';
import {
  Film,
  Play,
  Send,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Plus,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { videoApi } from '../services/api';
import VideoEditModal from '../components/VideoEditModal';
import BatchQueueModal from '../components/BatchQueueModal';

export default function QueueDashboard({
  videos,
  onRefresh,
  onOpenUpload,
  scheduleInfo
}) {
  const [filter, setFilter] = useState('All');
  const [editingVideo, setEditingVideo] = useState(null);
  const [postingId, setPostingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [previewingVideoUrl, setPreviewingVideoUrl] = useState(null);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Filtered videos
  const filteredVideos = videos.filter((v) => {
    if (filter === 'All') return true;
    return v.status.toLowerCase() === filter.toLowerCase();
  });

  const pendingVideos = videos.filter((v) => v.status === 'Pending');
  const postedVideos = videos.filter((v) => v.status === 'Posted');
  const failedVideos = videos.filter((v) => v.status === 'Failed');

  const handlePostNow = async (video) => {
    if (!window.confirm(`Trigger immediate Instagram post for Reel #${video.queue_number}?`)) {
      return;
    }
    setActionError('');
    setActionSuccess('');
    setPostingId(video.id);

    try {
      await videoApi.postNow(video.id);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setActionSuccess(`Reel #${video.queue_number} posted successfully to Instagram!`);
      onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to post reel. Check Account Settings for 2FA or password issues.');
    } finally {
      setPostingId(null);
    }
  };

  const handleDelete = async (video) => {
    if (!window.confirm(`Delete Reel #${video.queue_number} (${video.filename})?`)) {
      return;
    }
    try {
      await videoApi.delete(video.id);
      onRefresh();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to delete video.');
    }
  };

  const handleMove = async (currentIndex, direction) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= pendingVideos.length) return;

    // Swap queue numbers
    const currentVid = pendingVideos[currentIndex];
    const targetVid = pendingVideos[targetIndex];

    const currentNum = currentVid.queue_number;
    const targetNum = targetVid.queue_number;

    try {
      await videoApi.reorder([
        { id: currentVid.id, queue_number: targetNum },
        { id: targetVid.id, queue_number: currentNum }
      ]);
      onRefresh();
    } catch (err) {
      setActionError('Failed to reorder queue.');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Posted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle size={12} />
            Posted
          </span>
        );
      case 'Posting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/20 animate-pulse">
            <RefreshCw size={12} className="animate-spin" />
            Posting...
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle size={12} />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock size={12} />
            Pending
          </span>
        );
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner / Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Queue Total</p>
            <p className="text-2xl font-bold text-white mt-1">{videos.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
            <Film size={20} />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-white mt-1">{pendingVideos.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Clock size={20} />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Posted</p>
            <p className="text-2xl font-bold text-white mt-1">{postedVideos.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Interval</p>
            <p className="text-xl font-bold text-white mt-1">
              Every {scheduleInfo?.interval_hours || 6}h
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
          {['All', 'Pending', 'Posted', 'Failed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                filter === tab
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={16} />
          </button>
          {pendingVideos.length > 0 && (
            <button
              onClick={() => setShowBatchModal(true)}
              className="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-pink-500/50 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Batch edit pending reels (Cover page, Sequential captions)"
            >
              <Sliders size={14} className="text-pink-400" />
              <span>Batch Edit ({pendingVideos.length})</span>
            </button>
          )}
          <button
            onClick={onOpenUpload}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl instagram-gradient hover:opacity-95 text-white font-semibold text-xs shadow-md shadow-pink-500/20 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Upload New Reels</span>
          </button>
        </div>
      </div>

      {/* Video Queue Table / Cards */}
      {filteredVideos.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-slate-800 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
            <Film size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No reels found in this view</h3>
            <p className="text-sm text-slate-400 mt-1">
              Upload video files to populate your automated posting queue.
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="px-5 py-2.5 rounded-xl instagram-gradient text-white text-xs font-semibold shadow-md shadow-pink-500/20"
          >
            Upload Reels Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.map((video) => {
            const isPending = video.status === 'Pending';
            const pendingIndex = pendingVideos.findIndex((v) => v.id === video.id);

            return (
              <div
                key={video.id}
                className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Left: Reorder controls (if pending) & Sequence Badge & Media preview */}
                <div className="flex items-center gap-3.5 w-full md:w-auto">
                  {isPending && (
                    <div className="flex flex-col gap-1 items-center mr-1">
                      <button
                        onClick={() => handleMove(pendingIndex, -1)}
                        disabled={pendingIndex === 0}
                        title="Move Up in Queue"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-colors"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMove(pendingIndex, 1)}
                        disabled={pendingIndex === pendingVideos.length - 1}
                        title="Move Down in Queue"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-colors"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  )}

                  {/* Sequence Badge */}
                  <div className="w-9 h-9 rounded-xl instagram-gradient text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                    #{video.queue_number}
                  </div>

                  {/* Video Thumbnail / Preview */}
                  <div
                    onClick={() => setPreviewingVideoUrl(video.video_url)}
                    className="relative w-16 h-22 sm:w-20 sm:h-28 rounded-xl overflow-hidden bg-black/80 border border-slate-800 flex-shrink-0 cursor-pointer group"
                    title="Click to preview video"
                  >
                    {video.cover_url ? (
                      <img
                        src={video.cover_url}
                        alt="Cover"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <video
                        src={video.video_url}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform pointer-events-none"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                      <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                        <Play size={12} className="fill-white translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Caption & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(video.status)}
                      <span className="text-xs text-slate-400 font-mono truncate">
                        {video.filename}
                      </span>
                    </div>

                    <p className="text-sm text-slate-200 line-clamp-2 pr-2 font-normal">
                      {video.caption || <span className="italic text-slate-500">No caption set</span>}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                      {isPending && video.scheduled_at && (
                        <span className="flex items-center gap-1 text-sky-400">
                          <Clock size={11} />
                          Scheduled: {formatDateTime(video.scheduled_at)}
                        </span>
                      )}
                      {video.posted_at && (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle size={11} />
                          Posted: {formatDateTime(video.posted_at)}
                        </span>
                      )}
                      {video.cover_url && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                          Custom Cover
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center justify-end gap-2 w-full md:w-auto border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                  {/* Post Now button */}
                  <button
                    onClick={() => handlePostNow(video)}
                    disabled={postingId === video.id || video.status === 'Posting'}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      video.status === 'Posted'
                        ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
                        : 'instagram-gradient hover:opacity-90 text-white shadow-sm shadow-pink-500/20'
                    } disabled:opacity-50`}
                    title="Publish immediately to Instagram"
                  >
                    {postingId === video.id ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>{video.status === 'Posted' ? 'Post Again' : 'Post Now'}</span>
                      </>
                    )}
                  </button>

                  {/* Edit details */}
                  <button
                    onClick={() => setEditingVideo(video)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                    title="Edit Caption / Cover / Order"
                  >
                    <Edit2 size={15} />
                  </button>

                  {/* Delete video */}
                  <button
                    onClick={() => handleDelete(video)}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-colors"
                    title="Delete Video"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Lightbox Player Modal */}
      {previewingVideoUrl && (
        <div
          onClick={() => setPreviewingVideoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl"
          >
            <video
              src={previewingVideoUrl}
              controls
              autoPlay
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            <button
              onClick={() => setPreviewingVideoUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <VideoEditModal
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
          onSaveSuccess={() => {
            setEditingVideo(null);
            onRefresh();
          }}
        />
      )}

      {/* Batch Edit Modal */}
      {showBatchModal && (
        <BatchQueueModal
          pendingVideos={pendingVideos}
          onClose={() => setShowBatchModal(false)}
          onSuccess={() => {
            setShowBatchModal(false);
            setActionSuccess(
              `Successfully updated ${pendingVideos.length} pending reel${
                pendingVideos.length > 1 ? 's' : ''
              }!`
            );
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
