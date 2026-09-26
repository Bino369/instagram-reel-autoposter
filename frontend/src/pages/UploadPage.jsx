import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Film,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Copy,
  RotateCcw,
  Wand2,
  ImagePlus,
  CheckCheck,
  Sliders,
  Hash
} from 'lucide-react';
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

  // Batch series & cover controls
  const [globalCover, setGlobalCover] = useState(null);
  const [globalCoverPreview, setGlobalCoverPreview] = useState(null);
  const [applyCoverToAll, setApplyCoverToAll] = useState(true);
  const [seriesPrefix, setSeriesPrefix] = useState('Part ');
  const [seriesStartNum, setSeriesStartNum] = useState(1);
  const [seriesSuffix, setSeriesSuffix] = useState('');

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
    const validVideoFiles = files.filter(
      (f) => f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|m4v)$/i)
    );
    if (validVideoFiles.length === 0) {
      setError('Please select valid MP4 or MOV video files.');
      return;
    }
    setError('');

    // Generate previews for videos
    const newVideoPreviews = { ...videoPreviews };
    validVideoFiles.forEach((file) => {
      newVideoPreviews[file.name] = URL.createObjectURL(file);
    });
    setVideoPreviews(newVideoPreviews);

    const prevCount = selectedVideos.length;
    const combined = [...selectedVideos, ...validVideoFiles];
    setSelectedVideos(combined);

    // Initialize captions with "Part 1, 2, 3..." automatically
    setCaptions((prev) => {
      const updated = { ...prev };
      validVideoFiles.forEach((_, idx) => {
        const globalIdx = prevCount + idx;
        if (!updated[globalIdx]) {
          const num = seriesStartNum + globalIdx;
          const suf = seriesSuffix ? ` ${seriesSuffix.trim()}` : '';
          updated[globalIdx] = `${seriesPrefix}${num}${suf}`;
        }
      });
      return updated;
    });

    // If a global cover is active and applyCoverToAll is true, apply to newly added videos too
    if (globalCover && globalCoverPreview && applyCoverToAll) {
      setCovers((prev) => {
        const updated = { ...prev };
        validVideoFiles.forEach((_, idx) => {
          const globalIdx = prevCount + idx;
          if (!updated[globalIdx]) {
            updated[globalIdx] = globalCover;
          }
        });
        return updated;
      });

      setCoverPreviews((prev) => {
        const updated = { ...prev };
        validVideoFiles.forEach((_, idx) => {
          const globalIdx = prevCount + idx;
          if (!updated[globalIdx]) {
            updated[globalIdx] = globalCoverPreview;
          }
        });
        return updated;
      });
    }
  };

  // Apply a cover file to all selected videos
  const applyCoverToAllVideos = (file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setGlobalCover(file);
    setGlobalCoverPreview(previewUrl);

    const newCovers = {};
    const newPreviews = {};
    selectedVideos.forEach((_, idx) => {
      newCovers[idx] = file;
      newPreviews[idx] = previewUrl;
    });
    setCovers(newCovers);
    setCoverPreviews(newPreviews);
  };

  // Clear cover from all videos
  const clearCoverFromAll = () => {
    if (globalCoverPreview) {
      URL.revokeObjectURL(globalCoverPreview);
    }
    setGlobalCover(null);
    setGlobalCoverPreview(null);
    setCovers({});
    setCoverPreviews({});
  };

  // Handle single card cover selection
  const handleCoverSelect = (videoIndex, file) => {
    if (!file) return;
    if (applyCoverToAll) {
      applyCoverToAllVideos(file);
    } else {
      setCovers((prev) => ({ ...prev, [videoIndex]: file }));
      setCoverPreviews((prev) => ({
        ...prev,
        [videoIndex]: URL.createObjectURL(file),
      }));
    }
  };

  // Remove cover from a single card
  const removeCover = (videoIndex) => {
    setCovers((prev) => {
      const updated = { ...prev };
      delete updated[videoIndex];
      return updated;
    });
    setCoverPreviews((prev) => {
      const updated = { ...prev };
      if (updated[videoIndex] && updated[videoIndex] !== globalCoverPreview) {
        URL.revokeObjectURL(updated[videoIndex]);
      }
      delete updated[videoIndex];
      return updated;
    });
  };

  // Apply sequential captions (Part 1, 2, 3...) to all
  const applySeriesCaptions = (
    prefix = seriesPrefix,
    start = seriesStartNum,
    suffix = seriesSuffix
  ) => {
    const updated = {};
    selectedVideos.forEach((_, idx) => {
      const num = start + idx;
      const suf = suffix.trim() ? ` ${suffix.trim()}` : '';
      updated[idx] = `${prefix}${num}${suf}`;
    });
    setCaptions(updated);
  };

  // Append a hashtag to all captions
  const appendHashtagToAll = (tag) => {
    setCaptions((prev) => {
      const updated = { ...prev };
      selectedVideos.forEach((_, idx) => {
        const cur = updated[idx] || '';
        if (!cur.includes(tag) && cur.length + tag.length + 1 <= 2200) {
          updated[idx] = cur ? `${cur.trim()} ${tag}` : tag;
        }
      });
      return updated;
    });
  };

  // Append hashtag to a single video caption
  const appendHashtag = (videoIndex, tag) => {
    const currentCaption = captions[videoIndex] || '';
    if (currentCaption.includes(tag)) return;
    const newCaption = currentCaption ? `${currentCaption.trim()} ${tag}` : tag;
    if (newCaption.length <= 2200) {
      setCaptions((prev) => ({ ...prev, [videoIndex]: newCaption }));
    }
  };

  // Remove a video from the list and re-index
  const removeVideo = (indexToRemove) => {
    const file = selectedVideos[indexToRemove];
    if (videoPreviews[file.name]) {
      URL.revokeObjectURL(videoPreviews[file.name]);
    }
    const newVideos = selectedVideos.filter((_, idx) => idx !== indexToRemove);

    const newCaptions = {};
    const newCovers = {};
    const newCoverPreviews = {};
    let newIdx = 0;
    for (let i = 0; i < selectedVideos.length; i++) {
      if (i === indexToRemove) continue;
      if (covers[i]) newCovers[newIdx] = covers[i];
      if (coverPreviews[i]) newCoverPreviews[newIdx] = coverPreviews[i];
      newCaptions[newIdx] = captions[i] || `${seriesPrefix}${seriesStartNum + newIdx}`;
      newIdx++;
    }

    setSelectedVideos(newVideos);
    setCaptions(newCaptions);
    setCovers(newCovers);
    setCoverPreviews(newCoverPreviews);
  };

  // Clear all videos and clean up memory
  const clearAllVideos = () => {
    Object.values(videoPreviews).forEach((url) => URL.revokeObjectURL(url));
    Object.values(coverPreviews).forEach((url) => {
      if (url !== globalCoverPreview) URL.revokeObjectURL(url);
    });
    if (globalCoverPreview) URL.revokeObjectURL(globalCoverPreview);

    setSelectedVideos([]);
    setCaptions({});
    setCovers({});
    setCoverPreviews({});
    setVideoPreviews({});
    setGlobalCover(null);
    setGlobalCoverPreview(null);
  };

  // Upload all queued videos
  const handleUploadAll = async () => {
    if (selectedVideos.length === 0) return;
    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      let uploaded = 0;
      for (let i = 0; i < selectedVideos.length; i++) {
        const videoFile = selectedVideos[i];
        const formData = new FormData();
        formData.append('files', videoFile);
        formData.append('caption', captions[i] || `Part ${i + 1}`);
        if (covers[i]) {
          formData.append('cover_file', covers[i]);
        }

        await videoApi.upload(formData);
        uploaded++;
        setUploadProgress(Math.round((uploaded / selectedVideos.length) * 100));
      }

      setSuccessCount(uploaded);
      clearAllVideos();
      setTimeout(() => {
        onUploadComplete();
      }, 1200);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Failed to upload one or more videos. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Upload New Reels
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Add video files to your queue. They will be auto-numbered (Part 1, 2, 3...)
          and scheduled for automated posting.
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
          <span>
            Successfully added {successCount} reel(s) to the queue! Redirecting...
          </span>
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
          Drop your Reel videos here, or{' '}
          <span className="text-pink-400 underline underline-offset-4">
            browse files
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Supports MP4, MOV. Select multiple files (e.g. 1.mp4, 2.mp4, 3.mp4).
        </p>
      </div>

      {/* Selected Videos Section */}
      {selectedVideos.length > 0 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-pink-400" />
              <span>Videos Ready to Queue ({selectedVideos.length})</span>
            </h2>
            <button
              onClick={clearAllVideos}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* BATCH SERIES & COVER CUSTOMIZER PANEL */}
          <div className="glass-panel p-6 rounded-2xl border border-pink-500/30 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-pink-950/20 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg instagram-gradient flex items-center justify-center text-white shadow-md">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Batch Series & Cover Setup
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold">
                      {selectedVideos.length} reel{selectedVideos.length > 1 ? 's' : ''}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Apply a single cover thumbnail to all reels and auto-format captions as Part 1, 2, 3...
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT: Cover Page (Apply to All) */}
              <div className="rounded-xl p-4 bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-pink-400" />
                      <span>Cover Page (Apply to All)</span>
                    </label>
                    {globalCover && (
                      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCheck size={12} />
                        Active for all {selectedVideos.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Upload an image once to set it as the cover thumbnail across all reels.
                  </p>

                  {globalCoverPreview ? (
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                      <div className="relative w-16 h-24 rounded-lg overflow-hidden bg-black/80 flex-shrink-0 border border-slate-700 shadow-md">
                        <img
                          src={globalCoverPreview}
                          alt="Shared cover"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-white truncate">
                          {globalCover.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {(globalCover.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <label className="text-xs text-pink-400 hover:text-pink-300 font-semibold cursor-pointer underline underline-offset-2">
                            Change Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0])
                                  applyCoverToAllVideos(e.target.files[0]);
                              }}
                            />
                          </label>
                          <span className="text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={clearCoverFromAll}
                            className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                          >
                            Remove from All
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 hover:border-pink-500/70 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer transition-colors text-center group">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0])
                            applyCoverToAllVideos(e.target.files[0]);
                        }}
                      />
                      <div className="w-10 h-10 rounded-xl bg-pink-500/10 group-hover:bg-pink-500/20 text-pink-400 flex items-center justify-center mb-2 transition-colors">
                        <ImagePlus size={20} />
                      </div>
                      <span className="text-xs font-semibold text-white">
                        Upload Cover for All Reels
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        JPEG, PNG or WEBP (Applies to all {selectedVideos.length} reels)
                      </span>
                    </label>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={applyCoverToAll}
                      onChange={(e) => setApplyCoverToAll(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-pink-600 focus:ring-pink-500 h-4 w-4"
                    />
                    <span>Auto-apply cover to newly added reels</span>
                  </label>
                </div>
              </div>

              {/* RIGHT: Sequential Captions (Part 1, 2, 3...) */}
              <div className="rounded-xl p-4 bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Wand2 size={14} className="text-pink-400" />
                      <span>Sequential Captions</span>
                    </label>
                    <span className="text-[11px] font-mono text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
                      {seriesPrefix}
                      {seriesStartNum}, {seriesPrefix}
                      {seriesStartNum + 1}...
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Captions are auto-filled as Part 1, Part 2, etc. Customize prefix or starting index below.
                  </p>

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

                  <div className="mt-2.5 space-y-1">
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
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      applySeriesCaptions(seriesPrefix, seriesStartNum, seriesSuffix)
                    }
                    className="flex-1 px-3 py-2 rounded-xl bg-pink-600/30 hover:bg-pink-600/50 text-pink-200 border border-pink-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={13} className="text-pink-300" />
                    <span>Apply "{seriesPrefix}1, 2, 3..." to All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSeriesPrefix('Part ');
                      setSeriesStartNum(1);
                      setSeriesSuffix('');
                      applySeriesCaptions('Part ', 1, '');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                    title="Reset to default Part 1, 2, 3..."
                  >
                    <RotateCcw size={13} />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Hashtag Suggestions Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Hash size={12} className="text-pink-400" />
                <span>Add tag to all captions:</span>
              </span>
              {POPULAR_HASHTAGS.slice(0, 6).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => appendHashtagToAll(tag)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/90 hover:bg-pink-600/30 hover:text-pink-300 text-slate-300 border border-slate-700/60 transition-colors"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* INDIVIDUAL VIDEO CARDS */}
          <div className="space-y-4">
            {selectedVideos.map((video, index) => {
              const assignedNumber = currentQueueLength + index + 1;
              const captionText = captions[index] || '';
              const charsLeft = 2200 - captionText.length;
              const hasSharedCover =
                covers[index] &&
                globalCover &&
                covers[index] === globalCover;

              return (
                <div
                  key={`${video.name}-${index}`}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg instagram-gradient text-white text-xs font-bold flex items-center justify-center shadow-md">
                        #{assignedNumber}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md">
                          {video.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {(video.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
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
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                            Reel Caption
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setCaptions((prev) => ({
                                ...prev,
                                [index]: `Part ${index + 1}`,
                              }))
                            }
                            className="text-[10px] text-pink-400 hover:text-pink-300 underline font-medium"
                            title="Reset this caption to Part {index + 1}"
                          >
                            Set Part {index + 1}
                          </button>
                        </div>
                        <span
                          className={`text-xs font-mono ${
                            charsLeft < 100 ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {captionText.length} / 2200
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={captionText}
                        maxLength={2200}
                        onChange={(e) =>
                          setCaptions((prev) => ({
                            ...prev,
                            [index]: e.target.value,
                          }))
                        }
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

                    {/* Reel Cover Thumbnail */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                          Reel Cover / Thumbnail
                        </label>
                        {hasSharedCover && (
                          <span className="text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20 font-medium">
                            Shared Cover
                          </span>
                        )}
                      </div>

                      {coverPreviews[index] ? (
                        <div className="space-y-2">
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

                          {/* 1-Click: Apply this cover to all */}
                          <button
                            type="button"
                            onClick={() => applyCoverToAllVideos(covers[index])}
                            className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-pink-600/20 hover:text-pink-300 text-slate-300 border border-slate-700 hover:border-pink-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                            title="Apply this cover image to all other reels in the list"
                          >
                            <Copy size={12} />
                            <span>Apply this cover to all reels</span>
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center aspect-[9/16] max-h-56 rounded-xl border border-dashed border-slate-700 hover:border-pink-500/60 bg-slate-900/60 p-4 text-center cursor-pointer transition-colors group">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleCoverSelect(index, e.target.files?.[0])
                            }
                          />
                          <ImageIcon
                            size={24}
                            className="text-slate-500 group-hover:text-pink-400 mb-2 transition-colors"
                          />
                          <span className="text-xs text-slate-300 font-medium">
                            Upload Cover
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1">
                            {applyCoverToAll
                              ? 'Will apply to all reels'
                              : 'Leave empty for video frame'}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upload Action Sticky Footer */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-2xl bg-slate-900/90 backdrop-blur-md">
            <div>
              <p className="text-sm font-semibold text-white">
                Ready to add {selectedVideos.length} reel
                {selectedVideos.length > 1 ? 's' : ''} to queue?
              </p>
              <p className="text-xs text-slate-400">
                Videos will auto-post according to the automated schedule.
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
