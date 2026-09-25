import React, { useState } from 'react';
import { X, Image as ImageIcon, Sparkles, Check, Trash2, Film, AlertCircle } from 'lucide-react';
import { videoApi } from '../services/api';

const POPULAR_HASHTAGS = [
  '#reels', '#viral', '#explorepage', '#trending', '#instadaily',
  '#creator', '#reelsinstagram', '#fyp', '#viralvideos', '#contentcreator'
];

export default function VideoEditModal({ video, onClose, onSaveSuccess }) {
  const [caption, setCaption] = useState(video.caption || '');
  const [queueNumber, setQueueNumber] = useState(video.queue_number);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(video.cover_url || null);
  const [removeCover, setRemoveCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCoverSelect = (file) => {
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setRemoveCover(false);
  };

  const handleRemoveExistingCover = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
  };

  const appendHashtag = (tag) => {
    if (caption.includes(tag)) return;
    const newCaption = caption ? `${caption.trim()} ${tag}` : tag;
    if (newCaption.length <= 2200) {
      setCaption(newCaption);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('queue_number', queueNumber);
      if (coverFile) {
        formData.append('cover_file', coverFile);
      }
      if (removeCover) {
        formData.append('remove_cover', 'true');
      }

      const updated = await videoApi.update(video.id, formData);
      onSaveSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update video.');
    } finally {
      setSaving(false);
    }
  };

  const charsLeft = 2200 - caption.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg instagram-gradient text-white text-xs font-bold flex items-center justify-center">
              #{video.queue_number}
            </span>
            <h2 className="text-lg font-bold text-white">Edit Reel Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Video Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Video Preview
              </label>
              <div className="rounded-xl overflow-hidden bg-black aspect-[9/16] border border-slate-800">
                <video src={video.video_url} controls className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Caption & Queue Order */}
            <div className="md:col-span-2 space-y-4">
              {/* Queue Number */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Queue Position
                </label>
                <input
                  type="number"
                  min="1"
                  value={queueNumber}
                  onChange={(e) => setQueueNumber(parseInt(e.target.value) || 1)}
                  className="w-32 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-pink-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Lower numbers post earlier.</p>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Caption
                  </label>
                  <span className={`text-xs font-mono ${charsLeft < 100 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {caption.length} / 2200
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={2200}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add your caption, hashtags..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-pink-500 resize-none"
                />

                {/* Hashtag suggestions */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Sparkles size={11} className="text-pink-400" />
                    <span>Suggested Hashtags:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {POPULAR_HASHTAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => appendHashtag(tag)}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 hover:bg-pink-600/30 hover:text-pink-300 text-slate-300 border border-slate-700/60 transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cover Image Editor */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                  Custom Cover Image
                </label>
                {coverPreview ? (
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-28 rounded-lg overflow-hidden border border-slate-700 bg-black flex-shrink-0">
                      <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer inline-block border border-slate-700 transition-colors">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCoverSelect(e.target.files?.[0])}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveExistingCover}
                        className="text-xs text-rose-400 hover:text-rose-300 block transition-colors"
                      >
                        Remove Cover (Use video frame)
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-slate-700 hover:border-pink-500/60 bg-slate-900/60 cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCoverSelect(e.target.files?.[0])}
                    />
                    <ImageIcon size={18} className="text-slate-400" />
                    <span className="text-xs text-slate-300">Choose custom cover thumbnail</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl instagram-gradient hover:opacity-95 text-white font-semibold text-sm shadow-md shadow-pink-500/20 flex items-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
