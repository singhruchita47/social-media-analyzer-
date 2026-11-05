import React, { useState } from 'react';
import {
  X,
  Puzzle,
  CheckCircle,
  Copy,
  ExternalLink,
  Sparkles,
  EyeOff,
  MousePointerClick,
  ShoppingBag,
} from 'lucide-react';

export default function ExtensionModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const extensionPath = `C:\\Users\\91626\\OneDrive\\Desktop\\Social Media Hub\\extension`;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Sociafy In-Page Browser Extension
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Zero Link Mode
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct in-page side panel, auto-scroll to reviews & distraction removal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-300">
          {/* Key Value Proposition */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-400 mb-1">
                <MousePointerClick className="w-4 h-4 text-indigo-500" />
                1-Click Floating Button
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Appears automatically on Amazon, Flipkart, Myntra, etc. No need to copy-paste URLs.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-700 dark:text-emerald-400 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Instant Sentiment %
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Shows Positive, Negative & Neutral % plus Delivery, Price & Quality defect counts.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-700 dark:text-rose-400 mb-1">
                <EyeOff className="w-4 h-4 text-rose-500" />
                Distraction Blocker
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Hides recommended dresses, similar products & ad carousels. Only shows main product!
              </p>
            </div>
          </div>

          {/* Quick Setup Instructions */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Puzzle className="w-4 h-4 text-pink-500" />
              How to Install in Chrome / Edge (15 Seconds)
            </h3>
            <ol className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                <span>Open <strong>chrome://extensions</strong> or <strong>edge://extensions</strong> in your browser.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                <span>Turn on the <strong>Developer mode</strong> toggle (top-right corner).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-950 text-pink-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                <span>Click <strong>"Load unpacked"</strong> and select this folder:</span>
              </li>
            </ol>

            {/* Folder Path Box */}
            <div className="mt-3 flex items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <span className="truncate">{extensionPath}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-sans font-semibold text-slate-700 dark:text-slate-200 transition"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Path
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Supported E-Commerce Stores */}
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Auto-Supported Platforms:
            </div>
            <div className="flex flex-wrap gap-2">
              {['Amazon.in', 'Flipkart', 'Myntra', 'Meesho', 'Nykaa', 'Ajio'].map((site) => (
                <span
                  key={site}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3 h-3 text-pink-500" />
                  {site}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-95 shadow-md shadow-pink-500/20 transition"
          >
            Got it, Let's Try!
          </button>
        </div>
      </div>
    </div>
  );
}
