import React, { useState, useEffect } from 'react';
import {
  X,
  Youtube,
  Instagram,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function AnalyzeModal({
  isOpen,
  onClose,
  onSubmitAnalysis,
  isAnalyzing,
  defaultPlatform = 'youtube',
  darkMode,
}) {
  const [platform, setPlatform] = useState(defaultPlatform);
  const [postUrl, setPostUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPlatform(defaultPlatform);
      setErrorMsg('');
    }
  }, [isOpen, defaultPlatform]);

  if (!isOpen) return null;

  const handleUrlChange = (val) => {
    setPostUrl(val);
    const lower = val.toLowerCase();
    if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
      setPlatform('instagram');
    } else if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      setPlatform('youtube');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postUrl.trim()) {
      setErrorMsg('Please paste a valid YouTube or Instagram link.');
      return;
    }
    setErrorMsg('');

    try {
      await onSubmitAnalysis({
        platform,
        post_url: postUrl.trim(),
        max_comments: 120,
      });
      setPostUrl('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze post.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl relative ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isAnalyzing}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">
              Analyze YouTube or Instagram Link
            </h2>
            <p className="text-xs text-slate-400">
              Select platform and paste your video, Short, Post, or Reel link
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platform Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              Choose Platform
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlatform('youtube')}
                className={`py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                  platform === 'youtube'
                    ? 'bg-red-500 text-white border-red-500 shadow-sm'
                    : darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400'
                    : 'bg-[#F6F7FB] border-slate-200 text-slate-600'
                }`}
              >
                <Youtube className="w-4 h-4" />
                YouTube
              </button>

              <button
                type="button"
                onClick={() => setPlatform('instagram')}
                className={`py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition ${
                  platform === 'instagram'
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white border-pink-500 shadow-sm'
                    : darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400'
                    : 'bg-[#F6F7FB] border-slate-200 text-slate-600'
                }`}
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </button>
            </div>
          </div>

          {/* Post URL */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              Paste {platform === 'youtube' ? 'YouTube' : 'Instagram'} Link *
            </label>
            <input
              type="text"
              value={postUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={
                platform === 'youtube'
                  ? 'https://www.youtube.com/watch?v=... or /shorts/...'
                  : 'https://www.instagram.com/p/... or /reel/...'
              }
              autoFocus
              className={`w-full px-4 py-3 rounded-xl text-sm border outline-none transition ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-orange-500'
                  : 'bg-[#F6F7FB] border-slate-200 text-slate-900 focus:bg-white focus:border-orange-500'
              }`}
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isAnalyzing}
              className="px-4 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md transition disabled:opacity-50 ${
                platform === 'youtube'
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/25 hover:opacity-95'
                  : 'bg-gradient-to-r from-[#F469A9] to-[#F47A38] shadow-pink-500/25 hover:opacity-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Comments...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Run Reach & Comment Analysis
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
