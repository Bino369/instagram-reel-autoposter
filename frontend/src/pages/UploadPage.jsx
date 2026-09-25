import React, { useState, useRef } from 'react';
import { UploadCloud, Film, Image as ImageIcon, X, Hash, CheckCircle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { videoApi } from '../services/api';

const POPULAR_HASHTAGS = [
  '#reels', '#viral', '#explorepage', '#trending', '#instadaily',
  '#creator', '#reelsinstagram', '#fyp', '#viralvideos', '#contentcreator'
];

export default function UploadPage({ onUploadComplete, currentQueueLength = 0 }) {
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [captions, setCaptions] = useState({});
  const [covers, setCovers] = useState({});
  const [coverPreviews, setCoverPreviews] = useState({});
  const [videoPreviews, setVideoPreviews] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [successCount, setSuccessCount] = useState(0);

  const fileInputRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files) => {
    const validVideoFiles = files.filter(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|m4v)$/i));
    if (validVideoFiles.length === 0) {
      setError('Please select valid MP4 or MOV video files.');
      return;
    }
    setError('');

    // Generate previews
    const newPreviews = { ...videoPreviews };
    validVideoFiles.forEach((file, idx) => {
      const id = `${Date.now()}_${idx}`;
      newPreviews[file.name] = URL.createObjectURL(file);
    });
    setVideoPreviews(newPreviews);

    setSelectedVideos(prev => [...prev, ...validVideoFiles]);
  };

  const removeVideo = (indexToRemove) => {
    const file = selectedVideos[indexToRemove];
    if (videoPreviews[file.name]) {
      URL.revokeObjectURL(videoPreviews[file.name]);
    }
    setSelectedVideos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCoverSelect = (videoIndex, file) => {
    if (!file) return;
    setCovers(prev => ({ ...prev, [videoIndex]: file }));
    setCoverPreviews(prev => ({ ...prev, [videoIndex]: URL.createObjectURL(file) }));
  };

  const removeCover = (videoIndex) => {
    setCovers(prev => {
      const updated = { ...prev };
      delete updated[videoIndex];
      return updated;
    });
    setCoverPreviews(prev => {
      const updated = { ...prev };
      if (updated[videoIndex]) URL.revokeObjectURL(updated[videoIndex]);
      delete updated[videoIndex];
      return updated;
    });
  };

  const appendHashtag = (videoIndex, tag) => {
    const currentCaption = captions[videoIndex] || '';
    if (currentCaption.includes(tag)) return;
    const newCaption = currentCaption ? `${currentCaption.trim()} ${tag}` : tag;
    if (newCaption.length <= 2200) {
      setCaptions(prev => ({ ...prev, [videoIndex]: newCaption }));
    }
  };

  const handleUploadAll = async () => {
    if (selectedVideos.length === 0) return;
    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Upload each video with its caption and optional cover
      let uploaded = 0;
      for (let i = 0; i < selectedVideos.length; i++) {
        const videoFile = selectedVideos[i];
        const formData = new FormData();
        formData.append('files', videoFile);
        formData.append('caption', captions[i] || '');
        if (covers[i]) {
          formData.append('cover_file', covers[i]);
        }

        await videoApi.upload(formData);
        uploaded++;
        setUploadProgress(Math.round((uploaded / selectedVideos.length) * 100));
      }

      setSuccessCount(uploaded);
      setSelectedVideos([]);
      setCaptions({});
      setCovers({});
      setTimeout(() => {
        onUploadComplete();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload one or more videos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Upload New Reels</h1>
        <p className="text-sm text-slate-400 mt-1">
          Add video files to your queue. They will be auto-numbered and scheduled for posting every 6 hours.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successCount > 0 && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>Successfully added {successCount} reel(s) to the queue! Redirecting...</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
        className="group relative border-2 border-dashed border-slate-700 hover:border-pink-500/80 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 bg-slate-900/40 hover:bg-slate-900/80"
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="video/mp4,video/quicktime,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="w-16 h-16 rounded-2xl bg-slate-800 group-hover:scale-105 group-hover:bg-pink-500/10 text-slate-400 group-hover:text-pink-400 mx-auto flex items-center justify-center transition-all shadow-md">
          <UploadCloud size={32} />
        </div>
        <h2 className="text-lg font-semibold text-white mt-4">
          Drop your Reel videos here, or <span className="text-pink-400 underline underline-offset-4">browse files</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Supports MP4, MOV. You can select multiple files at once (e.g. 1.mp4, 2.mp4, 3.mp4).
        </p>
      </div>

      {/* Selected Videos List */}
      {selectedVideos.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-pink-400" />
              <span>Videos Ready to Queue ({selectedVideos.length})</span>
            </h2>
            <button
              onClick={() => setSelectedVideos([])}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            {selectedVideos.map((video, index) => {
              const assignedNumber = currentQueueLength + index + 1;
              const captionText = captions[index] || '';
              const charsLeft = 2200 - captionText.length;

              return (
                <div
                  key={`${video.name}-${index}`}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg instagram-gradient text-white text-xs font-bold flex items-center justify-center shadow-md">
                        #{assignedNumber}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md">{video.name}</p>
                        <p className="text-xs text-slate-400">{(video.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeVideo(index)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Remove file"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Video Player Preview */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Video Preview
                      </label>
                      <div className="relative rounded-xl overflow-hidden bg-black/60 aspect-[9/16] max-h-56 flex items-center justify-center border border-slate-800">
                        {videoPreviews[video.name] ? (
                          <video
                            src={videoPreviews[video.name]}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film size={28} className="text-slate-600" />
                        )}
                      </div>
                    </div>

                    {/* Caption Editor */}
                    <div className="space-y-3 lg:col-span-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Reel Caption
                        </label>
                        <span className={`text-xs font-mono ${charsLeft < 100 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {captionText.length} / 2200
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={captionText}
                        maxLength={2200}
                        onChange={(e) => setCaptions(prev => ({ ...prev, [index]: e.target.value }))}
                        placeholder="Write your reel caption, hooks, or notes..."
                        className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 resize-none"
                      />

                      {/* Hashtag suggestions */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Sparkles size={12} className="text-pink-400" />
                          <span>Suggested Hashtags (click to add):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {POPULAR_HASHTAGS.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => appendHashtag(index, tag)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 hover:bg-pink-600/30 hover:text-pink-300 text-slate-300 border border-slate-700/60 transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Optional Cover Image */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                        Reel Cover / Thumbnail <span className="text-slate-500 lowercase">(optional)</span>
                      </label>

                      {coverPreviews[index] ? (
                        <div className="relative rounded-xl overflow-hidden bg-black/60 aspect-[9/16] max-h-56 border border-slate-800 group">
                          <img
                            src={coverPreviews[index]}
                            alt="Cover thumbnail"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeCover(index)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                            title="Remove cover image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center aspect-[9/16] max-h-56 rounded-xl border border-dashed border-slate-700 hover:border-pink-500/60 bg-slate-900/60 p-4 text-center cursor-pointer transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleCoverSelect(index, e.target.files?.[0])}
                          />
                          <ImageIcon size={24} className="text-slate-500 mb-2" />
                          <span className="text-xs text-slate-300 font-medium">Upload Cover</span>
                          <span className="text-[10px] text-slate-500 mt-1">Leave empty to auto-pick video frame</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upload Action */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Ready to add {selectedVideos.length} reel{selectedVideos.length > 1 ? 's' : ''} to queue?
              </p>
              <p className="text-xs text-slate-400">
                Videos will start auto-posting according to the 6-hour scheduler.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {uploading && (
                <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="instagram-gradient h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={uploading}
                className="w-full sm:w-auto px-6 py-3 rounded-xl instagram-gradient hover:opacity-95 text-white font-semibold text-sm shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Uploading ({uploadProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <span>Add to Queue</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
