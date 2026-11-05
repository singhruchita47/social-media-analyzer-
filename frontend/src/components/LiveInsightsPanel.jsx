import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Youtube,
  Instagram,
  ShoppingBag,
  ThumbsUp,
  CheckCircle2,
  Sparkles,
  Filter,
  Search,
  Plus,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
  MessageSquare,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

const STATUS_CONFIG = {
  Positive: {
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60',
    bar: 'from-emerald-400 to-emerald-600',
    emoji: '😊',
    shortLabel: 'Positive',
  },
  Negative: {
    pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60',
    bar: 'from-rose-400 to-rose-600',
    emoji: '😠',
    shortLabel: 'Negative',
  },
  Mixed: {
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60',
    bar: 'from-amber-400 to-amber-600',
    emoji: '🤔',
    shortLabel: 'Mixed (Yes, But…)',
  },
  Neutral: {
    pill: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
    bar: 'from-slate-400 to-slate-500',
    emoji: '😐',
    shortLabel: 'Neutral',
  },
  Question: {
    pill: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60',
    bar: 'from-indigo-400 to-indigo-600',
    emoji: '❓',
    shortLabel: 'Question / Inquiry',
  },
};

const AVATAR_GRADIENTS = [
  'from-[#F47A38] to-[#F469A9]',
  'from-[#8BA3F8] to-[#473BF0]',
  'from-[#63E69A] to-[#28C76F]',
  'from-[#EA9267] to-[#F47A38]',
  'from-[#2CC5F6] to-[#8BA3F8]',
  'from-[#E052E6] to-[#F469A9]',
];

function getInitials(author = '') {
  const clean = author.replace(/^@/, '').trim();
  if (!clean) return 'U';
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Inspects a comment (English, Hindi, or Hinglish) to determine:
 * 1. Exact Problem Category (Price, Delivery, Quality, Packaging, Support, Quantity)
 * 2. Why it is negative / where the customer faces a problem
 * 3. Split clauses if it is a contrastive ("Yes, But...") comment like:
 *    "Ye product bht achha hai par price high hai" or "Quality is good, but delivery was very late."
 */
function analyzeCommentRootCause(comment) {
  const raw = comment.cleaned_text || '';
  const lower = raw.toLowerCase();
  let sentiment = comment.sentiment || 'Neutral';

  // Detect contrastive split in English or Hinglish ("but", "par", "lekin", "magar", "though", "however")
  const contrastRegex = /\b(but|though|although|however|yet|par|per|lekin|magar|पर|लेकिन)\b/i;
  let likedClause = null;
  let problemClause = null;
  const contrastMatch = raw.match(contrastRegex);
  if (contrastMatch && contrastMatch.index !== undefined) {
    const splitIdx = contrastMatch.index;
    const markerWord = contrastMatch[0];
    const before = raw.slice(0, splitIdx).replace(/[,.;]+$/, '').trim();
    const after = raw.slice(splitIdx + markerWord.length).replace(/^[,.;\s]+/, '').trim();
    if (before.length >= 4 && after.length >= 4) {
      likedClause = before;
      problemClause = after;
    }
  }

  // Determine exact problem category from pain_point or text triggers
  const hasPriceProblem =
    (comment.pain_point || '').toLowerCase().includes('price') ||
    (comment.pain_point || '').toLowerCase().includes('pricing') ||
    /\b(price|expensive|costly|steep|overpriced|mehnga|mehenga|mehanga|rate high|price high|cost|worth nahi|महंगा)\b/i.test(
      lower
    );

  const hasDeliveryProblem =
    (comment.pain_point || '').toLowerCase().includes('delivery') ||
    (comment.pain_point || '').toLowerCase().includes('shipping') ||
    /\b(delivery|shipping|late|delayed|courier|tracking|weeks|waiting|der se|pending|arrived late|लेट)\b/i.test(
      lower
    );

  const hasPackagingProblem =
    (comment.pain_point || '').toLowerCase().includes('packaging') ||
    /\b(packaging|package|leak|leaking|broken|scratched|damaged|damage|seal|pump|bottle|toota|plasticky)\b/i.test(
      lower
    );

  const hasSupportProblem =
    (comment.pain_point || '').toLowerCase().includes('support') ||
    /\b(support|service|ignored|refund|replacement|return|reply nahi|customer care|dm)\b/i.test(
      lower
    );

  const hasQuantityProblem =
    (comment.pain_point || '').toLowerCase().includes('quantity') ||
    /\b(quantity|small|chota|kam hai|size|fitting|out of stock|shade)\b/i.test(
      lower
    );

  // Negation-safe check for quality problems (do not trigger on "not oily" or "no whitecast" or "quality is good")
  const hasNegatedPositive =
    /\b(not oily|no whitecast|no white cast|not sticky|zero breakouts|no breakouts|quality is good|good quality|great quality|amazing quality|bht achha|bahut achha)\b/i.test(
      lower
    );

  const hasQualityProblem =
    (comment.pain_point || '').toLowerCase().includes('quality') ||
    /\b(bekar|bekaar|bakwas|ghatiya|kharab|worst|bad|waste|useless|fake|defective|not working|kaam nahi|irritation|pimple|pimples|acne|breakout|बेकार|खराब)\b/i.test(
      lower
    ) ||
    (!hasNegatedPositive && /\b(oily|sticky|whitecast|greasy|dry|rough)\b/i.test(lower));

  // 1. Dedicated Question & Inquiry Handling (Strictly only when sentiment is Question or intent is Question)
  const isQuestionComment =
    sentiment === 'Question' ||
    comment.intent === 'Question' ||
    (Boolean(comment.question_category) &&
      sentiment === 'Neutral' &&
      (/[?]/i.test(raw) ||
        /\b(kya|kaise|kab|kitna|kitne|kitni|kahan|kaha|kidhar|konsa|kaunsa|konsi|kaunsi|kis|kisko|how|what|where|when|why|which|link please|send link)\b/i.test(
          lower
        )));

  if (isQuestionComment) {
    const qCat = comment.question_category || 'Customer Question / Inquiry';
    return {
      sentiment: 'Question',
      problemKey: 'none',
      badge: `❓ ${qCat}`,
      badgeClass:
        'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      reason: `Customer Inquiry: ${qCat}`,
      likedClause: null,
      problemClause: null,
    };
  }

  // 2. Strict Sarcastic Complaint Badge
  if (comment.is_sarcastic || comment.intent === 'Sarcastic Complaint') {
    return {
      sentiment: 'Negative',
      problemKey: hasPriceProblem ? 'price' : hasDeliveryProblem ? 'delivery' : hasQualityProblem ? 'quality' : 'other_issue',
      badge: '🎭 Sarcastic Complaint',
      badgeClass:
        'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      reason: comment.pain_point || 'Sarcastic irony / disguised customer complaint',
      likedClause,
      problemClause,
    };
  }

  // If comment has a clear problem + contrastive clause, ensure it's treated as Mixed/Negative
  if (
    sentiment === 'Neutral' &&
    (hasPriceProblem || hasDeliveryProblem || hasPackagingProblem || hasSupportProblem || hasQualityProblem)
  ) {
    sentiment = likedClause ? 'Mixed' : 'Negative';
  }

  if (sentiment === 'Negative' || sentiment === 'Mixed') {
    if (hasPriceProblem) {
      return {
        sentiment,
        problemKey: 'price',
        badge: '💰 High Price Issue',
        badgeClass:
          'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        reason: likedClause
          ? 'Liked the product, but the price is too high'
          : 'Customer feels the product price is too expensive',
        likedClause,
        problemClause,
      };
    }
    if (hasDeliveryProblem) {
      return {
        sentiment,
        problemKey: 'delivery',
        badge: '🚚 Late Delivery Issue',
        badgeClass:
          'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
        reason: likedClause
          ? 'Product is good, but delivery was very late'
          : 'Slow shipping or delayed delivery timeline',
        likedClause,
        problemClause,
      };
    }
    if (hasPackagingProblem) {
      return {
        sentiment,
        problemKey: 'packaging',
        badge: '📦 Packaging Issue',
        badgeClass:
          'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
        reason: 'Leaking bottle, broken seal, or damaged package received',
        likedClause,
        problemClause,
      };
    }
    if (hasSupportProblem) {
      return {
        sentiment,
        problemKey: 'support',
        badge: '🎧 Support / Refund Issue',
        badgeClass:
          'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
        reason: 'Slow customer support response or refund/replacement delay',
        likedClause,
        problemClause,
      };
    }
    if (hasQuantityProblem) {
      return {
        sentiment,
        problemKey: 'quantity',
        badge: '📏 Quantity / Size Issue',
        badgeClass:
          'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
        reason: 'Quantity is too small for the price or size/stock issue',
        likedClause,
        problemClause,
      };
    }
    if (hasQualityProblem) {
      return {
        sentiment,
        problemKey: 'quality',
        badge: '⚠️ Quality / Result Issue',
        badgeClass:
          'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        reason: 'Not satisfied with product quality, texture, or results',
        likedClause,
        problemClause,
      };
    }

    return {
      sentiment,
      problemKey: 'other_issue',
      badge: '⚠️ Customer Issue',
      badgeClass:
        'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      reason: comment.pain_point || 'Customer reported a negative experience',
      likedClause,
      problemClause,
    };
  }

  if (sentiment === 'Positive') {
    const isCompliment = /\b(pretty|beautiful|cute|sundar|pyari|pyaari|queen|slay|gorgeous|love|best|amazing|awesome|superb|sweet|natural|naturally|mast|badiya)\b/i.test(lower);
    return {
      sentiment,
      problemKey: 'none',
      badge: isCompliment ? '💖 Appreciation' : '✅ Positive Feedback',
      badgeClass:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
      reason: isCompliment
        ? 'Customer shared genuine appreciation, admiration, or praise'
        : 'Customer is happy with the product quality and results',
      likedClause: null,
      problemClause: null,
    };
  }

  // Neutral
  const isLinkRequest =
    raw.includes('🔗') ||
    raw.includes('🖇') ||
    raw.includes('लिंक') ||
    /^(link|pp|price|link please|send link)$/i.test(lower.trim());
  const isPromo = /\b(coupon|discount|sale|code|bio)\b/i.test(lower);
  const isHumorous = /\b(😂|🤣|lol|lmao|meme|funny)\b/i.test(raw);
  const isQuestion = lower.includes('?');
  return {
    sentiment,
    problemKey: 'none',
    badge: isLinkRequest
      ? '🔗 Product Link Request'
      : isPromo
      ? '🏷️ Promo / Coupon'
      : isHumorous
      ? '😄 Humorous Reaction'
      : isQuestion
      ? '❓ Customer Question'
      : '💬 General Comment',
    badgeClass:
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    reason: isLinkRequest
      ? 'Customer is asking for the product buying link'
      : isPromo
      ? 'Promotional / discount code comment'
      : isHumorous
      ? 'Audience shared a humorous or lighthearted remark'
      : isQuestion
      ? 'General question / query from viewer'
      : 'General neutral audience remark or observation',
    likedClause: null,
    problemClause: null,
  };
}

export default function LiveInsightsPanel({
  stats,
  darkMode,
  searchQuery,
  setSearchQuery,
  sentimentFilter,
  setSentimentFilter,
  onOpenAnalyzeModal,
  onExportPDF,
}) {
  const [problemFilter, setProblemFilter] = useState('all'); // 'all' | 'any_problem' | 'price' | 'delivery' | 'quality' | 'packaging' | 'support'
  const [sortBy, setSortBy] = useState('problems_first'); // 'problems_first' | 'likes' | 'confidence' | 'positive'
  const [layoutMode, setLayoutMode] = useState('table'); // 'table' | 'cards'
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [sentimentFilter, problemFilter, searchQuery, sortBy]);

  const allComments = stats?.recent_comments || [];

  // Enrich every comment with Root-Cause & Problem breakdown
  const enrichedComments = useMemo(() => {
    return allComments.map((c) => {
      const rc = analyzeCommentRootCause(c);
      return {
        ...c,
        effectiveSentiment: rc.sentiment,
        rootCause: rc,
      };
    });
  }, [allComments]);

  // Count per sentiment and per problem category
  const counts = useMemo(() => {
    const res = {
      all: enrichedComments.length,
      Positive: 0,
      Negative: 0,
      Mixed: 0,
      Neutral: 0,
      Question: 0,
      any_problem: 0,
      price: 0,
      delivery: 0,
      quality: 0,
      packaging_support: 0,
    };
    enrichedComments.forEach((c) => {
      res[c.effectiveSentiment] = (res[c.effectiveSentiment] || 0) + 1;
      const pk = c.rootCause.problemKey;
      if (pk !== 'none') {
        res.any_problem += 1;
        if (pk === 'price') res.price += 1;
        else if (pk === 'delivery') res.delivery += 1;
        else if (pk === 'quality') res.quality += 1;
        else res.packaging_support += 1;
      }
    });
    return res;
  }, [enrichedComments]);

  // Extract comments where customers reported a problem (Negative or Mixed)
  const problemComments = useMemo(() => {
    return enrichedComments.filter((c) => c.rootCause.problemKey !== 'none');
  }, [enrichedComments]);

  const filteredComments = useMemo(() => {
    const filtered = enrichedComments.filter((c) => {
      if (sentimentFilter && sentimentFilter !== 'all') {
        if (c.effectiveSentiment !== sentimentFilter) return false;
      }
      if (problemFilter !== 'all') {
        if (problemFilter === 'any_problem') {
          if (c.rootCause.problemKey === 'none') return false;
        } else if (problemFilter === 'packaging_support') {
          if (
            !['packaging', 'support', 'quantity', 'other_issue'].includes(
              c.rootCause.problemKey
            )
          )
            return false;
        } else if (c.rootCause.problemKey !== problemFilter) {
          return false;
        }
      }
      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const inText = (c.cleaned_text || '').toLowerCase().includes(q);
        const inAuthor = (c.author || '').toLowerCase().includes(q);
        const inKw = (c.keywords || []).some((k) => k.toLowerCase().includes(q));
        const inReason = (c.rootCause.badge || '').toLowerCase().includes(q) ||
          (c.rootCause.reason || '').toLowerCase().includes(q);
        if (!inText && !inAuthor && !inKw && !inReason) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'problems_first') {
        const aProb = a.rootCause.problemKey !== 'none' ? 0 : 1;
        const bProb = b.rootCause.problemKey !== 'none' ? 0 : 1;
        if (aProb !== bProb) return aProb - bProb;
        return (b.likes || 0) - (a.likes || 0);
      }
      if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
      if (sortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
      if (sortBy === 'positive') return (b.sentiment_score || 0) - (a.sentiment_score || 0);
      return 0;
    });
  }, [enrichedComments, sentimentFilter, problemFilter, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredComments.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedComments = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredComments.slice(start, start + pageSize);
  }, [filteredComments, safeCurrentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* SECTION 1: CUSTOMER PROBLEM BREAKDOWN CARDS                          */}
      {/* ==================================================================== */}
      <div
        className={`rounded-3xl p-6 border ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200/70 shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3
                className={`font-bold text-base ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Customer Problem Breakdown (Negative & Mixed Reasons)
              </h3>
              <p className="text-xs text-slate-400">
                Click any problem card below to filter the comments list by Price, Delivery, Quality, or Packaging issues
              </p>
            </div>
          </div>

          {problemFilter !== 'all' && (
            <button
              onClick={() => setProblemFilter('all')}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-900 text-white dark:bg-orange-500 shadow-sm self-start"
            >
              Showing Filtered Problems × (Show All)
            </button>
          )}
        </div>

        {/* 4 Problem Category Filter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              key: 'price',
              title: '💰 High Price Issue',
              count: counts.price,
              desc: 'Customer liked the product, but found the price too high',
              headerBg: 'bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100/70 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-300',
              activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20',
              badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50',
            },
            {
              key: 'delivery',
              title: '🚚 Late Delivery Issue',
              count: counts.delivery,
              desc: 'Delayed shipping, slow courier, or late delivery',
              headerBg: 'bg-rose-50/70 dark:bg-rose-950/40 border-b border-rose-100/70 dark:border-rose-900/30 text-rose-800 dark:text-rose-300',
              activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
              badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50',
            },
            {
              key: 'quality',
              title: '⚠️ Quality / Result Issue',
              count: counts.quality,
              desc: 'Not happy with product quality, texture, or results',
              headerBg: 'bg-amber-50/70 dark:bg-amber-950/40 border-b border-amber-100/70 dark:border-amber-900/30 text-amber-800 dark:text-amber-300',
              activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
              badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50',
            },
            {
              key: 'packaging_support',
              title: '📦 Packaging & Support',
              count: counts.packaging_support,
              desc: 'Leaking/damaged packaging or slow support response',
              headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-100/70 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300',
              activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
              badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50',
            },
          ].map((card) => {
            const isSelected = problemFilter === card.key;
            return (
              <div
                key={card.key}
                onClick={() =>
                  setProblemFilter(isSelected ? 'all' : card.key)
                }
                className={`rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
                  isSelected
                    ? card.activeBorder
                    : darkMode
                    ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200/70 shadow-sm hover:shadow-md'
                }`}
              >
                <div
                  className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold ${card.headerBg}`}
                >
                  <span>{card.title}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span
                      className={`text-3xl font-extrabold tracking-tight ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {card.count}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${card.badgeBg}`}
                    >
                      {card.count === 1 ? '1 comment' : `${card.count} comments`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2 (BOTTOM): CLEAN, SPACIOUS COMMENTS SENTIMENT & PROBLEM LIST */}
      {/* ==================================================================== */}
      <div
        id="comments-list-section"
        className={`rounded-3xl border overflow-hidden ${
          darkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200/70 shadow-sm'
        }`}
      >
        {/* Top Toolbar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3
                  className={`font-extrabold text-lg tracking-tight ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Comments Sentiment & Problem Analysis List
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600">
                  {filteredComments.length} of {enrichedComments.length} comments
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Clearly shows each comment&apos;s sentiment and the exact customer issue (Price, Delivery, Quality, Packaging, or Support)
              </p>
            </div>

            {/* Search + Sort + View Mode + Analyze CTA */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery || ''}
                  onChange={(e) =>
                    setSearchQuery && setSearchQuery(e.target.value)
                  }
                  placeholder="Search price, delivery, quality..."
                  className={`pl-9 pr-3.5 py-2 rounded-full text-xs font-medium border outline-none w-56 transition ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500'
                      : 'bg-[#F6F7FB] border-slate-200/80 text-slate-700 focus:bg-white focus:border-orange-400'
                  }`}
                />
              </div>

              <div
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-300'
                    : 'bg-[#F6F7FB] border-slate-200/80 text-slate-700'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer"
                >
                  <option value="problems_first">
                    Sort: Customer Problems First 🚨
                  </option>
                  <option value="likes">Sort: Most Liked 👍</option>
                  <option value="confidence">Sort: AI Confidence 🎯</option>
                  <option value="positive">Sort: Most Positive 😊</option>
                </select>
              </div>

              <div
                className={`flex items-center p-1 rounded-full border ${
                  darkMode
                    ? 'bg-slate-950 border-slate-800'
                    : 'bg-[#F6F7FB] border-slate-200/80'
                }`}
              >
                <button
                  onClick={() => setLayoutMode('table')}
                  title="Clean Table View"
                  className={`p-1.5 rounded-full transition ${
                    layoutMode === 'table'
                      ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('cards')}
                  title="Cards View"
                  className={`p-1.5 rounded-full transition ${
                    layoutMode === 'cards'
                      ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {onExportPDF && (
                <button
                  onClick={onExportPDF}
                  title="Download Publication-Grade PDF Report with Graphs, Ratios & Comments"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm hover:from-orange-600 hover:to-amber-600 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export PDF Report</span>
                </button>
              )}

              {onOpenAnalyzeModal && (
                <button
                  onClick={onOpenAnalyzeModal}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition ${
                    darkMode
                      ? 'bg-white text-slate-900 hover:bg-slate-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Analyze New Post
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills Row: Sentiment + Quick Problem Reason Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </span>
            {[
              { id: 'all', label: 'All Comments', emoji: '📋', cnt: counts.all },
              {
                id: 'problems_only',
                label: 'All Problems (Neg + Mixed)',
                emoji: '🚨',
                cnt: counts.any_problem,
                isProblemBtn: true,
                problemVal: 'any_problem',
              },
              {
                id: 'Positive',
                label: 'Positive',
                emoji: '😊',
                cnt: counts.Positive,
              },
              {
                id: 'Negative',
                label: 'Negative',
                emoji: '😠',
                cnt: counts.Negative,
              },
              {
                id: 'Mixed',
                label: 'Mixed ("Yes, But…")',
                emoji: '🤔',
                cnt: counts.Mixed,
              },
              {
                id: 'Question',
                label: 'Questions / Queries',
                emoji: '❓',
                cnt: counts.Question || 0,
              },
              {
                id: 'Neutral',
                label: 'Neutral',
                emoji: '😐',
                cnt: counts.Neutral,
              },
              {
                id: 'prob_price',
                label: 'Price High',
                emoji: '💰',
                cnt: counts.price,
                isProblemBtn: true,
                problemVal: 'price',
              },
              {
                id: 'prob_delivery',
                label: 'Delivery Late',
                emoji: '🚚',
                cnt: counts.delivery,
                isProblemBtn: true,
                problemVal: 'delivery',
              },
              {
                id: 'prob_quality',
                label: 'Quality Issue',
                emoji: '⚠️',
                cnt: counts.quality,
                isProblemBtn: true,
                problemVal: 'quality',
              },
              {
                id: 'prob_pack',
                label: 'Packaging / Support',
                emoji: '📦',
                cnt: counts.packaging_support,
                isProblemBtn: true,
                problemVal: 'packaging_support',
              },
            ].map((tab) => {
              const isActive = tab.isProblemBtn
                ? problemFilter === tab.problemVal
                : sentimentFilter === tab.id && problemFilter === 'all';
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.isProblemBtn) {
                      setSentimentFilter('all');
                      setProblemFilter(
                        problemFilter === tab.problemVal ? 'all' : tab.problemVal
                      );
                    } else {
                      setProblemFilter('all');
                      setSentimentFilter(tab.id);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-orange-500 dark:border-orange-500 shadow-sm'
                      : darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-[#F6F7FB] border-slate-200/80 text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.cnt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty State */}
        {filteredComments.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h4
              className={`text-sm font-bold ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}
            >
              {enrichedComments.length === 0
                ? '0 Comments Analyzed Yet'
                : 'No comments match this filter'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {enrichedComments.length === 0
                ? 'Click "+ Analyze New Post" to paste a YouTube link or test custom comments.'
                : 'Click "All Comments" above to reset filters.'}
            </p>
          </div>
        ) : layoutMode === 'cards' ? (
          /* Cards Grid View */
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[680px] overflow-y-auto bg-[#F8F9FC]/60 dark:bg-slate-950/40">
            {paginatedComments.map((c, index) => {
              const cfg =
                STATUS_CONFIG[c.effectiveSentiment] || STATUS_CONFIG.Neutral;
              const rc = c.rootCause;
              const avatarGrad =
                AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
              return (
                <div
                  key={`${c.comment_id}-${index}`}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition hover:shadow-md ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-white border-slate-200/70 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-tr ${avatarGrad} text-white font-bold text-xs flex items-center justify-center shrink-0`}
                        >
                          {getInitials(c.author)}
                        </div>
                        <div>
                          <span
                            className={`text-xs font-extrabold ${
                              darkMode ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {c.author}
                          </span>
                          <p className="text-[10px] text-slate-400 capitalize">
                            #{String(index + 1).padStart(2, '0')} • {c.platform}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${cfg.pill}`}
                      >
                        {cfg.emoji} {cfg.shortLabel}
                      </span>
                    </div>

                    <p
                      className={`text-sm font-medium leading-relaxed my-2 ${
                        darkMode ? 'text-slate-100' : 'text-slate-800'
                      }`}
                    >
                      "{c.cleaned_text}"
                    </p>

                    {rc.likedClause && rc.problemClause && (
                      <div className="flex flex-wrap gap-1.5 my-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          👍 Liked: "{rc.likedClause}"
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                          🚨 Problem: "{rc.problemClause}"
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <span
                        className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${rc.badgeClass}`}
                      >
                        {rc.badge}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {rc.reason}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      <ThumbsUp className="w-3 h-3 text-orange-500" />
                      {c.likes}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Clean, Ultra-Readable Table View */
          <div className="overflow-x-auto max-h-[680px]">
            <table className="w-full text-left border-collapse">
              <thead
                className={`sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider ${
                  darkMode
                    ? 'bg-slate-950 text-slate-400 border-b border-slate-800'
                    : 'bg-[#F8F9FC] text-slate-500 border-b border-slate-200/80'
                }`}
              >
                <tr>
                  <th className="py-4 pl-6 pr-2 w-14">#</th>
                  <th className="py-4 px-4 w-48">Author</th>
                  <th className="py-4 px-5 min-w-[340px]">
                    Customer Comment & Breakdown
                  </th>
                  <th className="py-4 px-4 w-44">Sentiment</th>
                  <th className="py-4 px-5 w-72">
                    Why Negative / Customer Problem
                  </th>
                  <th className="py-4 pl-4 pr-6 w-32 text-right">
                    AI Conf. & Likes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                {paginatedComments.map((c, index) => {
                  const cfg =
                    STATUS_CONFIG[c.effectiveSentiment] || STATUS_CONFIG.Neutral;
                  const rc = c.rootCause;
                  const avatarGrad =
                    AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length];
                  const confPct = Math.round((c.confidence || 0.9) * 100);
                  const isProblemRow = rc.problemKey !== 'none';
                  const globalIdx = (safeCurrentPage - 1) * pageSize + index + 1;

                  return (
                    <tr
                      key={`${c.comment_id}-${index}`}
                      className={`transition ${
                        isProblemRow
                          ? darkMode
                            ? 'bg-rose-950/15 hover:bg-rose-950/30'
                            : 'bg-rose-50/25 hover:bg-orange-50/50'
                          : darkMode
                          ? 'hover:bg-slate-800/40'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Serial # */}
                      <td className="py-4 pl-6 pr-2 whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono text-[11px] font-bold ${
                            darkMode
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {globalIdx}
                        </span>
                      </td>

                      {/* 2. Author */}
                      <td className="py-4 px-4 whitespace-nowrap align-top">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarGrad} text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-sm`}
                          >
                            {getInitials(c.author)}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-extrabold truncate max-w-[130px] ${
                                darkMode ? 'text-slate-100' : 'text-slate-900'
                              }`}
                              title={c.author}
                            >
                              {c.author}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              {c.platform === 'youtube' ? (
                                <Youtube className="w-3 h-3 text-red-500" />
                              ) : c.platform === 'flipkart' ? (
                                <ShoppingBag className="w-3 h-3 text-[#2874F0]" />
                              ) : (
                                <Instagram className="w-3 h-3 text-pink-500" />
                              )}
                              <span className="capitalize">{c.platform}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Comment Text + Split Contrastive Highlight + Keywords */}
                      <td className="py-4 px-5 align-top max-w-xl">
                        <p
                          className={`text-[13px] font-medium leading-relaxed ${
                            darkMode ? 'text-slate-100' : 'text-slate-800'
                          }`}
                        >
                          {c.cleaned_text}
                        </p>

                        {/* Contrastive Split Pills for "Yes, But..." comments */}
                        {rc.likedClause && rc.problemClause && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                              👍 Liked: "{rc.likedClause}"
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                              🚨 Problem: "{rc.problemClause}"
                            </span>
                          </div>
                        )}

                        {c.keywords && c.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {c.keywords.map((kw) => (
                              <button
                                key={kw}
                                onClick={() =>
                                  setSearchQuery && setSearchQuery(kw)
                                }
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition ${
                                  darkMode
                                    ? 'bg-slate-800 border-slate-700 text-orange-400'
                                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600'
                                }`}
                              >
                                #{kw}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* 4. Sentiment Badge */}
                      <td className="py-4 px-4 whitespace-nowrap align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border ${cfg.pill}`}
                        >
                          <span>{cfg.emoji}</span>
                          <span>{cfg.shortLabel}</span>
                        </span>
                      </td>

                      {/* 5. Why Negative / Exact Customer Problem Column */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${rc.badgeClass}`}
                          >
                            {rc.badge}
                          </span>
                          <p
                            className={`text-[11px] leading-snug ${
                              isProblemRow
                                ? 'font-semibold text-rose-700 dark:text-rose-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {rc.reason}
                          </p>
                        </div>
                      </td>

                      {/* 6. Confidence & Likes */}
                      <td className="py-4 pl-4 pr-6 whitespace-nowrap align-top text-right">
                        <div className="inline-flex flex-col items-end gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <ThumbsUp className="w-3 h-3 text-orange-500" />
                            {c.likes}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            {confPct}% AI Conf.
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* High-Volume Pagination Controls Bar (Smoothly handles up to 10,000+ comments) */}
        {filteredComments.length > 0 && (
          <div
            className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
              darkMode
                ? 'bg-slate-900 border-slate-800'
                : 'bg-slate-50/80 border-slate-100'
            }`}
          >
            <div className="text-xs font-semibold text-slate-500">
              Showing{' '}
              <strong className={darkMode ? 'text-white' : 'text-slate-900'}>
                {((safeCurrentPage - 1) * pageSize + 1).toLocaleString()}
              </strong>{' '}
              to{' '}
              <strong className={darkMode ? 'text-white' : 'text-slate-900'}>
                {Math.min(
                  safeCurrentPage * pageSize,
                  filteredComments.length
                ).toLocaleString()}
              </strong>{' '}
              of{' '}
              <strong className="text-orange-500">
                {filteredComments.length.toLocaleString()}
              </strong>{' '}
              analyzed comments
            </div>

            <div className="flex items-center gap-3">
              {/* Page size selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value={500}>500</option>
                </select>
              </div>

              {/* Page navigation buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage <= 1}
                  title="First Page"
                  className="p-1.5 rounded-lg border text-xs font-bold transition disabled:opacity-25 disabled:cursor-not-allowed hover:bg-orange-500 hover:text-white"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  title="Previous Page"
                  className="p-1.5 rounded-lg border text-xs font-bold transition disabled:opacity-25 disabled:cursor-not-allowed hover:bg-orange-500 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 rounded-lg text-xs font-mono font-extrabold bg-orange-500/10 text-orange-600 border border-orange-500/20">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  title="Next Page"
                  className="p-1.5 rounded-lg border text-xs font-bold transition disabled:opacity-25 disabled:cursor-not-allowed hover:bg-orange-500 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage >= totalPages}
                  title="Last Page"
                  className="p-1.5 rounded-lg border text-xs font-bold transition disabled:opacity-25 disabled:cursor-not-allowed hover:bg-orange-500 hover:text-white"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
