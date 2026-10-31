const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Clean zero-state initial stats before any YouTube or Instagram link is analyzed.
 */
export const FALLBACK_STATS = {
  total_posts_analyzed: 0,
  total_comments_analyzed: 0,
  total_engagement_likes: 0,
  reach_overview: {
    total_followers: 0,
    followers_growth_pct: 0.0,
    total_engagement: 0,
    engagement_growth_pct: 0.0,
    total_reach: 0,
    reach_growth_pct: 0.0,
    total_impressions: 0,
    impressions_growth_pct: 0.0,
  },
  sentiment_breakdown: {
    positive_count: 0,
    negative_count: 0,
    neutral_count: 0,
    mixed_count: 0,
    positive_pct: 0.0,
    negative_pct: 0.0,
    neutral_pct: 0.0,
    mixed_pct: 0.0,
    primary_positive_pct: 0.0,
    primary_negative_pct: 0.0,
    primary_neutral_pct: 0.0,
  },
  numpy_global_stats: {
    mean_sentiment_score: 0.0,
    sentiment_std_dev: 0.0,
    rating_variance: 0.0,
    confidence_average: 0.0,
    p25_score: 0.0,
    median_score: 0.0,
    p75_score: 0.0,
  },
  pandas_cleaning_totals: {
    raw_fetched_count: 0,
    cleaned_valid_count: 0,
    duplicates_removed: 0,
    emoji_spam_removed: 0,
    bot_repetitive_removed: 0,
    missing_dropped: 0,
  },
  platform_comparison: {
    youtube: {
      platform: 'youtube',
      total_posts: 0,
      total_comments: 0,
      total_likes: 0,
      followers: 0,
      reach: 0,
      impressions: 0,
      engagement_rate: 0.0,
      growth_pct: 0.0,
      positive_pct: 0.0,
      negative_pct: 0.0,
      neutral_pct: 0.0,
      mixed_pct: 0.0,
      avg_confidence: 0.0,
      rating_variance: 0.0,
      top_pain_point: 'None',
    },
    instagram: {
      platform: 'instagram',
      total_posts: 0,
      total_comments: 0,
      total_likes: 0,
      followers: 0,
      reach: 0,
      impressions: 0,
      engagement_rate: 0.0,
      growth_pct: 0.0,
      positive_pct: 0.0,
      negative_pct: 0.0,
      neutral_pct: 0.0,
      mixed_pct: 0.0,
      avg_confidence: 0.0,
      rating_variance: 0.0,
      top_pain_point: 'None',
    },
  },
  engagement_trends: [],
  top_keywords: [],
  pain_points: [],
  critical_feedback: [],
  recent_comments: [],
};

export async function fetchStats(platform = null) {
  const query = platform && platform !== 'all' ? `?platform=${encodeURIComponent(platform)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/stats${query}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch stats (${response.status})`);
  }
  return response.json();
}

export async function fetchHistory(platform = null) {
  const query = platform && platform !== 'all' ? `?platform=${encodeURIComponent(platform)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/history${query}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch history (${response.status})`);
  }
  return response.json();
}

export async function fetchAnalysisById(analysisId) {
  const response = await fetch(`${API_BASE_URL}/api/history/${encodeURIComponent(analysisId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch analysis details (${response.status})`);
  }
  return response.json();
}

export async function analyzeSocialPost(payload) {
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `Analysis request failed (${response.status})`);
  }
  return response.json();
}

export async function deleteAnalysisById(analysisId) {
  const response = await fetch(`${API_BASE_URL}/api/history/${encodeURIComponent(analysisId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete analysis (${response.status})`);
  }
  return response.json();
}

export async function resetDemoDataset() {
  const response = await fetch(`${API_BASE_URL}/api/reset-demo`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to clear data (${response.status})`);
  }
  return response.json();
}

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error('Backend unreachable');
  }
  return response.json();
}
