import React, { useState } from 'react';
import {
  X,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertCircle,
  ImagePlus,
  Sliders,
  CheckCheck,
  Wand2,
  RefreshCw
} from 'lucide-react';
import { videoApi } from '../services/api';

export default function BatchQueueModal({ pendingVideos = [], onClose, onSuccess }) {
  const [updateCover, setUpdateCover] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const [updateCaptions, setUpdateCaptions] = useState(false);
  const [seriesPrefix, setSeriesPrefix] = useState('Part ');
  const [seriesStartNum, setSeriesStartNum] = useState(1);
  const [seriesSuffix, setSeriesSuffix] = useState('');

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleCoverSelect = (file) => {
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setUpdateCover(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!updateCover && !updateCaptions) {
      setError('Please select at least one action (Cover Page or Captions).');
      return;
    }
    if (updateCover && !coverFile) {
      setError('Please select a cover image file to apply.');
      return;
    }

    setSaving(true);
    setError('');
    setProgress(0);

    try {
      let count = 0;
      for (let i = 0; i < pendingVideos.length; i++) {
        const video = pendingVideos[i];
        const formData = new FormData();

        if (updateCaptions) {
          const num = seriesStartNum + i;
          const suf = seriesSuffix ? ` ${seriesSuffix.trim()}` : '';
          const newCaption = `${seriesPrefix}${num}${suf}`;
          formData.append('caption', newCaption);
        }

        if (updateCover && coverFile) {
          formData.append('cover_file', coverFile);
        }

        await videoApi.update(video.id, formData);
        count++;
        setProgress(Math.round((count / pendingVideos.length) * 100));
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update some pending reels.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg instagram-gradient flex items-center justify-center text-white shadow-md">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Batch Edit Pending Reels
              </h2>
              <p className="text-xs text-slate-400">
                Update {pendingVideos.length} pending reel{pendingVideos.length > 1 ? 's' : ''} at once.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Cover Page Option */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-white">
                <input
                  type="checkbox"
                  checked={updateCover}
                  onChange={(e) => setUpdateCover(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-pink-600 focus:ring-pink-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <ImageIcon size={16} className="text-pink-400" />
                  <span>Apply Cover Page to All {pendingVideos.length} Reels</span>
                </span>
              </label>
              {coverFile && (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <Check size={12} /> Ready
                </span>
              )}
            </div>

            {updateCover && (
              <div className="pt-2">
                {coverPreview ? (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <div className="relative w-14 h-20 rounded-lg overflow-hidden bg-black/80 flex-shrink-0 border border-slate-700">
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {coverFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(coverFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <label className="text-xs text-pink-400 hover:text-pink-300 font-semibold cursor-pointer underline underline-offset-2 inline-block">
                        Choose different image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCoverSelect(e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 hover:border-pink-500/70 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer transition-colors text-center group">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCoverSelect(e.target.files?.[0])}
                    />
                    <div className="w-9 h-9 rounded-xl bg-pink-500/10 group-hover:bg-pink-500/20 text-pink-400 flex items-center justify-center mb-2">
                      <ImagePlus size={18} />
                    </div>
                    <span className="text-xs font-semibold text-white">
                      Select Cover Page Image
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      Will overwrite cover thumbnails for all {pendingVideos.length} pending reels
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* 2. Sequential Captions Option */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-white">
                <input
                  type="checkbox"
                  checked={updateCaptions}
                  onChange={(e) => setUpdateCaptions(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-pink-600 focus:ring-pink-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <Wand2 size={16} className="text-pink-400" />
                  <span>Update Captions to "Part 1, 2, 3..."</span>
                </span>
              </label>
              <span className="text-[11px] font-mono text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-full">
                {seriesPrefix}{seriesStartNum}...
              </span>
            </div>

            {updateCaptions && (
              <div className="pt-2 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Prefix
                    </span>
                    <input
                      type="text"
                      value={seriesPrefix}
                      onChange={(e) => setSeriesPrefix(e.target.value)}
                      placeholder="e.g. Part "
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <div className="col-span-1 space-y-1">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Start #
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={seriesStartNum}
                      onChange={(e) =>
                        setSeriesStartNum(parseInt(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Optional Hashtags / Suffix
                  </span>
                  <input
                    type="text"
                    value={seriesSuffix}
                    onChange={(e) => setSeriesSuffix(e.target.value)}
                    placeholder="e.g. #reels #viral"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300">
                  <span className="text-slate-400 font-medium">Preview sequence: </span>
                  <span className="text-pink-300 font-mono">
                    {seriesPrefix}{seriesStartNum}
                    {seriesSuffix ? ` ${seriesSuffix.trim()}` : ''}, {seriesPrefix}
                    {seriesStartNum + 1}
                    {seriesSuffix ? ` ${seriesSuffix.trim()}` : ''}...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button & Progress */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!updateCover && !updateCaptions)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl instagram-gradient hover:opacity-95 text-white text-xs font-semibold shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Applying ({progress}%)...</span>
                </>
              ) : (
                <>
                  <CheckCheck size={15} />
                  <span>Apply to {pendingVideos.length} Reels</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
