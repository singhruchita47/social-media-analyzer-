import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Youtube,
  Instagram,
  ShoppingBag,
  Sparkles,
  Loader2,
  CheckCircle2,
  UploadCloud,
  FileSpreadsheet,
  Link as LinkIcon,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function AnalyzeModal({
  isOpen,
  onClose,
  onSubmitAnalysis,
  isAnalyzing,
  defaultPlatform = 'youtube',
  darkMode,
}) {
  const [activeMode, setActiveMode] = useState('url'); // 'url' or 'csv'
  const [platform, setPlatform] = useState(defaultPlatform);
  const [postUrl, setPostUrl] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [maxComments, setMaxComments] = useState(10000);
  const [errorMsg, setErrorMsg] = useState('');

  // CSV / Custom comments state
  const [pastedCommentsText, setPastedCommentsText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvCommentsCount, setCsvCommentsCount] = useState(0);
  const [parsedComments, setParsedComments] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPlatform(defaultPlatform);
      setErrorMsg('');
      setActiveMode('url');
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
      lower.includes('x.com') ||
      lower.includes('reddit.com') ||
      lower.includes('linkedin.com') ||
      lower.includes('facebook.com')
    ) {
      setPlatform('instagram');
    } else if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      setPlatform('youtube');
    } else if (
      lower.includes('flipkart.com') ||
      lower.includes('dl.flipkart.com') ||
      lower.includes('amazon.') ||
      lower.includes('myntra.') ||
      lower.includes('meesho.') ||
      lower.includes('nykaa.') ||
      lower.includes('ajio.') ||
      lower.includes('tatacliq.') ||
      lower.includes('shopify.')
    ) {
      setPlatform('flipkart');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (!text || typeof text !== 'string') return;

      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        setErrorMsg('Uploaded file is empty.');
        return;
      }

      // Check if it's CSV
      let extracted = [];
      const firstLine = lines[0].toLowerCase();
      if (firstLine.includes(',') || firstLine.includes('\t') || firstLine.includes(';')) {
        const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
        const headers = lines[0].split(delimiter).map((h) => h.replace(/["']/g, '').trim().toLowerCase());
        
        // Find comment column
        let colIdx = headers.findIndex((h) =>
          ['comment', 'comments', 'review', 'reviews', 'text', 'body', 'feedback', 'content'].includes(h)
        );
        if (colIdx === -1) colIdx = 0; // Default to first column

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(delimiter);
          if (row[colIdx]) {
            const clean = row[colIdx].replace(/^["']|["']$/g, '').trim();
            if (clean.length > 2) extracted.push(clean);
          }
        }
      } else {
        // Plain text lines
        extracted = lines.filter((l) => l.length > 2);
      }

      setParsedComments(extracted);
      setCsvCommentsCount(extracted.length);
      setErrorMsg('');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (activeMode === 'url') {
      if (!postUrl.trim()) {
        setErrorMsg('Please paste a valid YouTube, Social Media, or E-Commerce link.');
        return;
      }

      try {
        await onSubmitAnalysis({
          platform,
          post_url: postUrl.trim(),
          post_title: postTitle.trim() || undefined,
          max_comments: Number(maxComments) || 10000,
        });
        setPostUrl('');
        setPostTitle('');
      } catch (err) {
        setErrorMsg(err.message || 'Failed to analyze post.');
      }
    } else {
      // CSV or Pasted Comments Mode
      let finalComments = [...parsedComments];
      if (pastedCommentsText.trim()) {
        const textLines = pastedCommentsText
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 2);
        finalComments = [...finalComments, ...textLines];
      }

      if (finalComments.length === 0) {
        setErrorMsg('Please upload a CSV file or paste at least 1 comment to analyze.');
        return;
      }

      const generatedUrl = `https://custom-comments-import.local/${platform}/${Date.now()}`;
      const defaultTitle =
        platform === 'flipkart'
          ? 'Custom E-Commerce Product Verified Reviews'
          : platform === 'youtube'
          ? 'Custom YouTube Audience Comments Analysis'
          : 'Custom Social Media Community Feedback Analysis';

      try {
        await onSubmitAnalysis({
          platform,
          post_url: generatedUrl,
          post_title: postTitle.trim() || defaultTitle,
          custom_comments: finalComments.slice(0, Number(maxComments) || 10000),
          max_comments: Number(maxComments) || 10000,
        });
        setParsedComments([]);
        setPastedCommentsText('');
        setCsvFileName('');
        setCsvCommentsCount(0);
      } catch (err) {
        setErrorMsg(err.message || 'Failed to analyze custom comments.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isAnalyzing}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Universal Social & E-Commerce Analysis</h2>
            <p className="text-xs text-slate-400">
              Analyze ANY platform without API keys — via live URL or CSV/text paste!
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 mb-4 border border-slate-200/50 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeMode === 'url'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Paste Live Link (Any Platform)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('csv')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
              activeMode === 'csv'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Upload CSV / Paste Comments</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Platform Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">
              Target Workspace Category
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

          {/* MODE 1: URL INPUT */}
          {activeMode === 'url' ? (
            <>
              {/* Automated Scraper Banner */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span>
                  <strong>Universal Scraper Active:</strong> Works on Amazon, Myntra, Flipkart, Meesho, Nykaa, Ajio, Reddit, Instagram, YouTube & any custom store!
                </span>
              </div>

              {/* Post URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Paste Product or Post Link *
                </label>
                <input
                  type="text"
                  value={postUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://www.amazon.in/... or myntra, flipkart, meesho, nykaa, reddit, etc."
                  autoFocus
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Optional Custom Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Custom Title / Label <span className="font-normal opacity-70">(Optional, auto-detected if empty)</span>
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Sangria Lehenga, iPhone 16 Pro Max, Nike Shoes"
                  className={`w-full px-4 py-2 rounded-xl text-xs border outline-none transition ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500'
                  }`}
                />
              </div>
            </>
          ) : (
            /* MODE 2: CSV / PASTED COMMENTS INPUT */
            <div className="space-y-3">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Upload Comments CSV / TXT File <span className="font-normal opacity-70">(From any tool or export)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${
                    csvFileName
                      ? 'border-emerald-500/70 bg-emerald-500/5'
                      : darkMode
                      ? 'border-slate-800 hover:border-indigo-500 bg-slate-950/60'
                      : 'border-slate-300 hover:border-indigo-500 bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.tsv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    {csvFileName ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {csvFileName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ✓ {csvCommentsCount.toLocaleString()} reviews/comments ready for AI scoring
                        </span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-6 h-6 text-slate-400" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Click to select .CSV or .TXT file
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Supports CSV with 'comment', 'review', or 'text' column
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Paste Raw Comments Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Or Paste Raw Comments Here <span className="font-normal opacity-70">(One comment per line)</span>
                </label>
                <textarea
                  rows={4}
                  value={pastedCommentsText}
                  onChange={(e) => setPastedCommentsText(e.target.value)}
                  placeholder={`Lehenga quality is good very good quality work on blouse...\nPrice is high but fabric is pure georgette...\nDelivery took 4 days in Bangalore.`}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs border outline-none font-sans transition resize-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Optional Custom Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Product / Post Name
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g. Nykaa Foxtale Sunscreen, Amazon Soundbar, Reddit Thread"
                  className={`w-full px-4 py-2 rounded-xl text-xs border outline-none transition ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Volume Limit */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-500">
                {platform === 'flipkart' ? 'Reviews Limit' : 'Comments Limit'}
              </label>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {maxComments >= 10000 ? '🔥 10,000 (Pure All)' : `${maxComments.toLocaleString()} Comments`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
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
                  className={`py-1.5 px-1 rounded-xl border text-center transition ${
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
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
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
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-sm transition disabled:opacity-50 ${
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
                  <span>Processing AI NLP Pipeline...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {activeMode === 'csv'
                      ? 'Run Sentiment on Uploaded Comments'
                      : platform === 'flipkart'
                      ? 'Run Universal E-Commerce Review Analysis'
                      : platform === 'instagram'
                      ? 'Run Social Media Analysis'
                      : 'Run YouTube Analysis'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
