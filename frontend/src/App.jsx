import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import MetricsCards from './components/MetricsCards.jsx';
import SentimentDonutChart from './components/SentimentDonutChart.jsx';
import EngagementTrendsChart from './components/EngagementTrendsChart.jsx';
import TopKeywordsWidget from './components/TopKeywordsWidget.jsx';
import LiveInsightsPanel from './components/LiveInsightsPanel.jsx';
import PlatformAnalyticsView from './components/PlatformAnalyticsView.jsx';
import HistoryView from './components/HistoryView.jsx';
import AnalyzeModal from './components/AnalyzeModal.jsx';
import ExtensionModal from './components/ExtensionModal.jsx';
import {
  FALLBACK_STATS,
  fetchStats,
  fetchHistory,
  fetchAnalysisById,
  analyzeSocialPost,
  deleteAnalysisById,
  resetDemoDataset,
  checkBackendHealth,
} from './services/api.js';
import { exportAnalysisPDF } from './services/pdfExporter.js';
import {
  CheckCircle2,
  Download,
  Share2,
  ArrowLeft,
  MessageSquareHeart,
  Youtube,
  Instagram,
  ShoppingBag,
  Eye,
  FileText,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('sociafy_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return true; // Default to Dark Mode
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Strictly 'youtube' or 'instagram' — never mixed together!
  const [selectedPlatform, setSelectedPlatform] = useState('youtube');
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  const [stats, setStats] = useState(FALLBACK_STATS);
  const [activeSingleAnalysis, setActiveSingleAnalysis] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [isAnalyzeModalOpen, setIsAnalyzeModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const rootEl = document.documentElement;
    if (darkMode) {
      rootEl.classList.add('dark');
      localStorage.setItem('sociafy_theme', 'dark');
    } else {
      rootEl.classList.remove('dark');
      localStorage.setItem('sociafy_theme', 'light');
    }
  }, [darkMode]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const loadDashboardData = useCallback(async (platformFilter) => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetchStats(platformFilter),
        fetchHistory(platformFilter),
      ]);
      setStats(statsRes);
      setHistoryItems(historyRes);
      setBackendHealthy(true);
    } catch {
      setBackendHealthy(false);
    }
  }, []);

  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
    loadDashboardData(selectedPlatform);
  }, [selectedPlatform, loadDashboardData]);

  // Auto-analyze URL triggered from Chrome Extension with selected sentiment filter (Supports Hash & Query)
  useEffect(() => {
    const hashString = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : '';
    const hashParams = new URLSearchParams(hashString);
    const searchParams = new URLSearchParams(window.location.search);

    const autoUrl = hashParams.get('url') || searchParams.get('url');
    const targetSentiment = hashParams.get('sentiment') || searchParams.get('sentiment') || 'all';
    const targetPlatform = hashParams.get('platform') || searchParams.get('platform') || 'flipkart';

    if (autoUrl) {
      const runAutoAnalysis = async () => {
        setIsAnalyzing(true);
        try {
          const result = await analyzeSocialPost({
            platform: targetPlatform,
            post_url: autoUrl,
            max_comments: 1000,
          });
          setSelectedPlatform(result.platform);
          setActiveSingleAnalysis(result);
          await loadDashboardData(result.platform);
          setActiveTab('insights');
          if (targetSentiment && targetSentiment !== 'all') {
            setSentimentFilter(targetSentiment);
          }
          setTimeout(() => {
            const el = document.getElementById('comments-list-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 350);
          showToast(
            `Live ${result.platform.toUpperCase()} Analysis Ready: "${result.post_title}" — showing ${targetSentiment} comments!`
          );
        } catch (e) {
          console.error('Auto analysis error:', e);
          showToast('Could not auto-analyze link from extension: ' + (e.message || ''));
        } finally {
          setIsAnalyzing(false);
        }
      };
      runAutoAnalysis();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loadDashboardData]);

  const handlePlatformChange = (newPlatform) => {
    setSelectedPlatform(newPlatform);
    if (activeSingleAnalysis && activeSingleAnalysis.platform !== newPlatform) {
      setActiveSingleAnalysis(null);
    }
  };

  const handleAnalyzeSubmit = async (payload) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSocialPost(payload);
      setSelectedPlatform(result.platform);
      setActiveSingleAnalysis(result);
      await loadDashboardData(result.platform);
      setIsAnalyzeModalOpen(false);
      // Stay on Dashboard first so the user sees the Real Reach, Views, Subscribers & Likes of their Short/Post, or they can click Comments Analysis!
      showToast(
        `Live ${result.platform.toUpperCase()} Analysis Ready: "${result.post_title}" — ${(result.video_views || 0).toLocaleString()} real views & ${result.total_comments} comments analyzed!`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectPostById = async (analysisId) => {
    try {
      const fullPost = await fetchAnalysisById(analysisId);
      setActiveSingleAnalysis(fullPost);
      setActiveTab('insights');
    } catch {
      setActiveTab('insights');
    }
  };

  const handleDeleteAnalysis = async (id) => {
    try {
      await deleteAnalysisById(id);
      if (activeSingleAnalysis && activeSingleAnalysis.id === id) {
        setActiveSingleAnalysis(null);
      }
      await loadDashboardData(selectedPlatform);
      showToast('Removed analysis record from SQLite storage.');
    } catch (err) {
      showToast(err.message || 'Could not delete record.');
    }
  };

  const handleResetDemo = async () => {
    try {
      await resetDemoDataset();
      setActiveSingleAnalysis(null);
      setSearchQuery('');
      setSentimentFilter('all');
      await loadDashboardData(selectedPlatform);
      showToast('Reset database to benchmark dataset.');
    } catch {
      setStats(FALLBACK_STATS);
      showToast('Restored default benchmark dataset.');
    }
  };

  const handleExportCSV = () => {
    const currentView = activeViewStats;
    const comments =
      currentView?.recent_comments || currentView?.critical_feedback || [];
    const headers = [
      'Comment_ID',
      'Platform',
      'Author',
      'Cleaned_Comment',
      'Sentiment',
      'Confidence',
      'Pain_Point',
      'Likes',
    ];
    const rows = comments.map((c) => [
      c.comment_id,
      c.platform,
      c.author,
      `"${(c.cleaned_text || '').replace(/"/g, '""')}"`,
      c.sentiment,
      c.confidence,
      `"${c.pain_point || ''}"`,
      c.likes,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${selectedPlatform}_sentiment_analysis.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${selectedPlatform.toUpperCase()} comments to CSV`);
  };

  const handleExportPDF = () => {
    try {
      exportAnalysisPDF({
        stats: activeViewStats,
        activeSingleAnalysis,
        selectedPlatform,
      });
      showToast(`Generating ${selectedPlatform.toUpperCase()} PDF Report with graphs & comments...`);
    } catch {
      showToast('Unable to launch PDF print preview.');
    }
  };

  const handleKeywordSelect = (kw) => {
    setSearchQuery(kw);
    if (activeTab === 'dashboard' && kw) {
      setActiveTab('insights');
    }
  };

  const handleSentimentSelect = (sentimentLabel) => {
    if (sentimentLabel === 'all') {
      setSentimentFilter('all');
    } else {
      setSentimentFilter((prev) =>
        prev === sentimentLabel ? 'all' : sentimentLabel
      );
    }
    if (activeTab === 'dashboard') {
      setActiveTab('insights');
    }
  };

  // Build active stats for both Dashboard (Real Reach/Views) & Comments Analysis
  const activeViewStats =
    activeSingleAnalysis && activeSingleAnalysis.platform === selectedPlatform
      ? {
          ...stats,
          total_posts_analyzed: 1,
          total_comments_analyzed: activeSingleAnalysis.total_comments,
          total_engagement_likes: activeSingleAnalysis.engagement_likes,
          reach_overview: {
            total_followers: activeSingleAnalysis.author_followers || 0,
            followers_growth_pct: 0.0,
            total_engagement:
              (activeSingleAnalysis.engagement_likes || 0) +
              (activeSingleAnalysis.total_comments || 0),
            engagement_growth_pct: 0.0,
            total_reach: activeSingleAnalysis.post_reach || 0,
            reach_growth_pct: 0.0,
            total_impressions: activeSingleAnalysis.video_views || 0,
            impressions_growth_pct: 0.0,
          },
          sentiment_breakdown: activeSingleAnalysis.sentiment_breakdown,
          numpy_global_stats: {
            mean_sentiment_score:
              activeSingleAnalysis.pipeline_metrics.mean_sentiment_score,
            sentiment_std_dev:
              activeSingleAnalysis.pipeline_metrics.sentiment_std_dev,
            rating_variance:
              activeSingleAnalysis.pipeline_metrics.rating_variance,
            confidence_average:
              activeSingleAnalysis.pipeline_metrics.confidence_average,
          },
          top_keywords: activeSingleAnalysis.top_keywords,
          pain_points: activeSingleAnalysis.pain_points,
          critical_feedback: activeSingleAnalysis.critical_feedback,
          recent_comments: activeSingleAnalysis.comments,
        }
      : stats;

  const isYT = selectedPlatform === 'youtube';
  const isIG = selectedPlatform === 'instagram';
  const isFK = selectedPlatform === 'flipkart';
  const getDynamicBrand = (post) => {
    if (!post) return 'Flipkart';
    const text = `${post.post_url || ''} ${post.author_handle || ''} ${post.source_mode || ''}`.toLowerCase();
    if (text.includes('myntra') || text.includes('sangria')) return 'Myntra';
    if (text.includes('amazon')) return 'Amazon';
    if (text.includes('meesho')) return 'Meesho';
    if (text.includes('nykaa')) return 'Nykaa';
    if (text.includes('ajio')) return 'Ajio';
    if (text.includes('reddit')) return 'Reddit';
    if (text.includes('shopify')) return 'Shopify';
    if (text.includes('csv') || text.includes('custom')) return 'Custom Import';
    return 'Flipkart';
  };
  const ecomPlatformName = getDynamicBrand(activeSingleAnalysis);
  const isMyntra = ecomPlatformName === 'Myntra';

  return (
    <div
      className={`min-h-screen flex transition-colors duration-200 ${
        darkMode
          ? 'bg-slate-950 text-slate-100'
          : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* Left SaaS Sidebar Navigation (Collapsible!) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPlatform={selectedPlatform}
        setSelectedPlatform={handlePlatformChange}
        darkMode={darkMode}
        backendHealthy={backendHealthy}
        totalPosts={historyItems.length}
        onResetDemo={handleResetDemo}
        onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
        isOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          searchQuery={searchQuery}
          setSearchQuery={(val) => {
            setSearchQuery(val);
            if (val && activeTab === 'dashboard') {
              setActiveTab('insights');
            }
          }}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={handlePlatformChange}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
          onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="mx-8 mt-4 px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {toastMessage}
            </span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Scrollable Workspace */}
        <main className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">
          {/* Quick Top Navigation Pills when Sidebar is Hidden */}
          {!sidebarOpen && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/70 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'dashboard', label: '📊 Reach & Dashboard' },
                  { id: 'insights', label: '💬 Comments Analysis (AI)' },
                  { id: 'platforms', label: '📈 Post Reach Breakdown' },
                  { id: 'history', label: `🕒 Analyzed History (${historyItems.length})` },
                ].map((nav) => (
                  <button
                    key={nav.id}
                    onClick={() => setActiveTab(nav.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition ${
                      activeTab === nav.id
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-sm'
                        : darkMode
                        ? 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {nav.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleResetDemo}
                className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition"
              >
                Reset Data to 0
              </button>
            </div>
          )}

          {/* Active Focused Post Spotlight Banner (Shown on Dashboard & Comments Analysis when a specific Short/Post is analyzed!) */}
          {activeSingleAnalysis &&
            activeSingleAnalysis.platform === selectedPlatform && (
              <div
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-slate-200/80 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-white ${
                        isYT ? 'bg-red-500' : isIG ? 'bg-[#F469A9]' : isMyntra ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'bg-[#2874F0]'
                      }`}
                    >
                      Live Analyzed {isYT ? 'YouTube Short / Video' : isIG ? 'Social Media Post' : `${ecomPlatformName} Product`}
                    </span>
                    <span className={`text-xs font-bold ${isYT ? 'text-red-600' : isIG ? 'text-pink-600' : isMyntra ? 'text-pink-600' : 'text-[#2874F0]'}`}>
                      {activeSingleAnalysis.author_handle}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {(activeSingleAnalysis.video_views || 0).toLocaleString()} {isFK ? 'Ratings & Reviews' : 'Real Views'}
                    </span>
                  </div>
                  <h3
                    className={`text-sm font-extrabold mt-1 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {String(activeSingleAnalysis.post_title || '')
                      .replace(/<[^>]*>/g, '')
                      .replace(/(?:1-\d+ of (?:over )?[\d,]+ results|Sort by:.*$)/gi, '')
                      .replace(/\s+/g, ' ')
                      .trim() || 'Product Analysis'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {String(activeSingleAnalysis.executive_summary || '')
                      .replace(/<[^>]*>/g, '')
                      .replace(/(?:1-\d+ of (?:over )?[\d,]+ results|Sort by:.*$)/gi, '')
                      .replace(/\s+/g, ' ')
                      .trim()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportPDF}
                    title="Export Full Analysis PDF Report with Details & Comments"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download PDF Report</span>
                  </button>
                  {activeTab === 'dashboard' && (
                    <button
                      onClick={() => setActiveTab('insights')}
                      className={`px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm hover:opacity-95 ${
                        isYT
                          ? 'bg-gradient-to-r from-red-500 to-rose-600'
                          : isIG
                          ? 'bg-gradient-to-r from-[#F469A9] to-[#F47A38]'
                          : 'bg-gradient-to-r from-[#2874F0] to-[#1258ca]'
                      }`}
                    >
                      View {activeSingleAnalysis.total_comments} {isFK ? 'Reviews' : 'Comments'} Analysis →
                    </button>
                  )}
                  <button
                    onClick={() => setActiveSingleAnalysis(null)}
                    className="px-3.5 py-2 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 shadow-sm"
                  >
                    Show All {isYT ? 'YouTube' : isIG ? 'Social Media' : 'E-Commerce'} Items
                  </button>
                </div>
              </div>
            )}

          {/* ============================================================== */}
          {/* TAB 1: MAIN DASHBOARD (STRICTLY YOUTUBE OR INSTAGRAM REACH)    */}
          {/* ============================================================== */}
          {activeTab === 'dashboard' && (
            <>
              {/* Page Title Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                      isYT
                        ? 'bg-red-600'
                        : isIG
                        ? 'bg-pink-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    {isYT ? (
                      <Youtube className="w-5 h-5" />
                    ) : isIG ? (
                      <Instagram className="w-5 h-5" />
                    ) : (
                      <ShoppingBag className="w-5 h-5" />
                    )}
                  </span>
                  <div>
                    <h1
                      className={`text-2xl font-bold tracking-tight ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {isYT
                        ? 'YouTube Video & Shorts Reach Dashboard'
                        : isIG
                        ? 'Social Media Platform Reach & AI Sentiment Dashboard'
                        : 'E-Commerce Platform Customer Reviews & Ratings Dashboard'}
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isYT
                        ? 'Dedicated YouTube subscribers, real video/Shorts views, unique reach, and AI comment sentiment.'
                        : isIG
                        ? 'Universal automated analysis of social media reach, audience engagement, impressions, and AI comment sentiment (Zero API Required).'
                        : 'Universal automated scraping of verified customer reviews, 1-5★ star ratings, and AI sentiment (Amazon, Myntra, Flipkart, Meesho & More).'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setActiveTab('insights')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm transition ${
                      isYT
                        ? 'bg-red-600 hover:bg-red-700'
                        : isIG
                        ? 'bg-pink-600 hover:bg-pink-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5" />
                    {isYT ? 'YouTube' : isIG ? 'Social Media' : 'E-Commerce'} {isFK ? 'Reviews' : 'Comments'} Analysis (
                    {(activeViewStats?.total_comments_analyzed ?? 0).toLocaleString()}) →
                  </button>
                </div>
              </div>

              {/* Row 1: 4 Platform-Specific Real Reach, Views, Engagement & Subscribers Cards */}
              <MetricsCards
                stats={activeViewStats}
                selectedPlatform={selectedPlatform}
                isLiveSinglePost={Boolean(activeSingleAnalysis)}
                darkMode={darkMode}
                showReachRow={true}
                showSentimentRow={false}
              />

              {/* Row 2: 3-Column Sociafy Graphs Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-4">
                  <EngagementTrendsChart
                    stats={activeViewStats}
                    selectedPlatform={selectedPlatform}
                    historyItems={historyItems}
                    darkMode={darkMode}
                  />
                </div>
                <div className="lg:col-span-4">
                  <TopKeywordsWidget
                    keywords={activeViewStats?.top_keywords || []}
                    darkMode={darkMode}
                    selectedKeyword={searchQuery}
                    onSelectKeyword={handleKeywordSelect}
                  />
                </div>
                <div className="lg:col-span-4">
                  <SentimentDonutChart
                    stats={activeViewStats}
                    darkMode={darkMode}
                    onSelectSentiment={handleSentimentSelect}
                  />
                </div>
              </div>

              {/* Row 3: Analyzed Posts Real Reach Breakdown Table + Optimal Upload Time Heatmap */}
              <PlatformAnalyticsView
                stats={activeViewStats}
                selectedPlatform={selectedPlatform}
                historyItems={historyItems}
                onSelectPostForComments={handleSelectPostById}
                darkMode={darkMode}
                compact={true}
              />
            </>
          )}

          {/* ============================================================== */}
          {/* TAB 2: DEDICATED COMMENTS ANALYSIS VIEW (COMMENTS AT TOP!)     */}
          {/* ============================================================== */}
          {(activeTab === 'insights' || activeTab === 'sentiment') && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`p-2 rounded-full border transition ${
                      darkMode
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                    }`}
                    title="Back to Main Dashboard"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h1
                      className={`text-2xl font-extrabold tracking-tight ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {isYT ? 'YouTube' : isIG ? 'Social Media Platform' : 'E-Commerce Platform'} AI {isFK ? 'Reviews' : 'Comments'} Sentiment Analysis
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Deep NLP analysis of {(activeViewStats?.total_comments_analyzed ?? 0).toLocaleString()} {isYT ? 'YouTube' : isIG ? 'social media' : 'e-commerce'} {isFK ? 'verified reviews' : 'comments'} (Automated Headless Scraping • Star Ratings • Delivery/Quality Issues • AI Sentiment)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsAnalyzeModalOpen(true)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm transition ${
                      isYT
                        ? 'bg-red-600 hover:bg-red-700'
                        : isIG
                        ? 'bg-pink-600 hover:bg-pink-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    + Analyze New {isYT ? 'YouTube' : isIG ? 'Social Media' : 'E-Commerce'} URL
                  </button>
                </div>
              </div>

              {/* Row 1: 4 Colored-Header Comment Sentiment KPI Cards */}
              <MetricsCards
                stats={activeViewStats}
                selectedPlatform={selectedPlatform}
                isLiveSinglePost={Boolean(activeSingleAnalysis)}
                darkMode={darkMode}
                onSelectSentiment={(lbl) =>
                  setSentimentFilter((prev) => (prev === lbl ? 'all' : lbl))
                }
                showReachRow={false}
                showSentimentRow={true}
              />

              {/* Row 2: Sentiment Donut Graph + Top Recurring Keywords Graph */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5">
                  <SentimentDonutChart
                    stats={activeViewStats}
                    darkMode={darkMode}
                    onSelectSentiment={(lbl) =>
                      setSentimentFilter((prev) => (prev === lbl ? 'all' : lbl))
                    }
                  />
                </div>
                <div className="lg:col-span-7">
                  <TopKeywordsWidget
                    keywords={activeViewStats?.top_keywords || []}
                    darkMode={darkMode}
                    selectedKeyword={searchQuery}
                    onSelectKeyword={(kw) => setSearchQuery(kw)}
                  />
                </div>
              </div>

              {/* Row 3 (BOTTOM!): Full Comments Sentiment & Problem Analysis List */}
              <LiveInsightsPanel
                stats={activeViewStats}
                darkMode={darkMode}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sentimentFilter={sentimentFilter}
                setSentimentFilter={setSentimentFilter}
                onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
                onExportPDF={handleExportPDF}
              />
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: POST REACH BREAKDOWN                                    */}
          {/* ============================================================== */}
          {activeTab === 'platforms' && (
            <>
              <MetricsCards
                stats={activeViewStats}
                selectedPlatform={selectedPlatform}
                isLiveSinglePost={Boolean(activeSingleAnalysis)}
                darkMode={darkMode}
                showReachRow={true}
                showSentimentRow={false}
              />
              <PlatformAnalyticsView
                stats={activeViewStats}
                selectedPlatform={selectedPlatform}
                historyItems={historyItems}
                onSelectPostForComments={handleSelectPostById}
                darkMode={darkMode}
                compact={false}
              />
            </>
          )}

          {/* ============================================================== */}
          {/* TAB 4: POST HISTORY                                            */}
          {/* ============================================================== */}
          {activeTab === 'history' && (
            <HistoryView
              historyItems={historyItems}
              darkMode={darkMode}
              onDeleteAnalysis={handleDeleteAnalysis}
              onOpenAnalyzeModal={() => setIsAnalyzeModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Analyze New Post Modal */}
      <AnalyzeModal
        isOpen={isAnalyzeModalOpen}
        onClose={() => setIsAnalyzeModalOpen(false)}
        onSubmitAnalysis={handleAnalyzeSubmit}
        isAnalyzing={isAnalyzing}
        defaultPlatform={selectedPlatform}
        darkMode={darkMode}
      />

      {/* Browser Extension In-Page Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />
    </div>
  );
}
