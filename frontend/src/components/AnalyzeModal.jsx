import React, { useState, useEffect } from 'react';
import {
  X,
  Youtube,
  Instagram,
  ShoppingBag,
  Sparkles,
  Loader2,
  CheckCircle2,
  Bot,
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
  const [maxComments, setMaxComments] = useState(10000);
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
    if (
      lower.includes('instagram.com') ||
      lower.includes('instagr.am') ||
      lower.includes('threads.net') ||
      lower.includes('twitter.com') ||
      lower.includes('x.com')
    ) {
      setPlatform('instagram');
    } else if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      setPlatform('youtube');
    } else if (
      lower.includes('flipkart.com') ||
      lower.includes('dl.flipkart.com') ||
      lower.includes('amazon.') ||
      lower.includes('myntra.')
    ) {
      setPlatform('flipkart');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postUrl.trim()) {
      setErrorMsg('Please paste a valid YouTube, Social Media, or E-Commerce link.');
      return;
    }
    setErrorMsg('');

    try {
      await onSubmitAnalysis({
        platform,
        post_url: postUrl.trim(),
        max_comments: Number(maxComments) || 10000,
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
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              Analyze Media or E-Commerce Link
            </h2>
            <p className="text-xs text-slate-400">
              Paste YouTube, Social Media, or E-Commerce product links
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platform Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              Choose Platform Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlatform('youtube')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                  platform === 'youtube'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Youtube className="w-4 h-4 text-white" />
                YouTube
              </button>

              <button
                type="button"
                onClick={() => setPlatform('instagram')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                  platform === 'instagram'
                    ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                    : darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Instagram className="w-4 h-4" />
                Social Media
              </button>

              <button
                type="button"
                onClick={() => setPlatform('flipkart')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                  platform === 'flipkart'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                E-Commerce
              </button>
            </div>
          </div>

          {/* Automated Headless Scraper Status Banner */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 text-slate-600 dark:text-slate-300 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <span>
              {platform === 'youtube'
                ? '⚡ Live YouTube Data API v3 token pagination enabled'
                : '🤖 Automated Headless Scraper: Extracts comments directly without needing API keys!'}
            </span>
          </div>

          {/* Post URL */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              Paste {platform === 'youtube' ? 'YouTube' : platform === 'instagram' ? 'Social Media (Instagram/Reels)' : 'E-Commerce (Flipkart/Store)'} Link *
            </label>
            <input
              type="text"
              value={postUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={
                platform === 'youtube'
                  ? 'https://www.youtube.com/watch?v=... or /shorts/...'
                  : platform === 'instagram'
                  ? 'https://www.instagram.com/p/... or /reel/... (No API Key Required)'
                  : 'https://www.flipkart.com/.../p/itm... or product link'
              }
              autoFocus
              className={`w-full px-4 py-3 rounded-xl text-sm border outline-none transition ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500'
              }`}
            />
          </div>

          {/* Comment Volume / Limit Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-500">
                {platform === 'flipkart' ? 'Reviews Fetch Limit' : 'Comments Fetch Limit'}
              </label>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {maxComments >= 10000
                  ? '🔥 10,000 (Pure / All Comments)'
                  : `${maxComments.toLocaleString()} Comments`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-2">
              {[
                { label: '500', val: 500, desc: 'Fast' },
                { label: '2,000', val: 2000, desc: 'Deep' },
                { label: '5,000', val: 5000, desc: 'Heavy' },
                { label: '10,000', val: 10000, desc: 'Mega All' },
              ].map((btn) => (
                <button
                  key={btn.val}
                  type="button"
                  onClick={() => setMaxComments(btn.val)}
                  className={`py-2 px-1 rounded-xl border text-center transition ${
                    maxComments === btn.val
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600 font-bold shadow-sm'
                      : darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold">{btn.label}</div>
                  <div className="text-[10px] opacity-75">{btn.desc}</div>
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-400">
              {platform === 'flipkart'
                ? `Automated scraper & pagination will fetch verified customer reviews up to ${maxComments.toLocaleString()} reviews.`
                : `Automated engine will fetch and analyze up to ${maxComments.toLocaleString()} comments (100% of all comments if fewer).`}
            </p>
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
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${
                platform === 'youtube'
                  ? 'bg-red-600 hover:bg-red-700'
                  : platform === 'instagram'
                  ? 'bg-pink-600 hover:bg-pink-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {platform === 'flipkart' ? 'Scraping & Analyzing Reviews...' : 'Scraping & Analyzing Comments...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {platform === 'flipkart' ? 'Run E-Commerce Review Analysis' : platform === 'instagram' ? 'Run Social Media Analysis' : 'Run YouTube Analysis'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
