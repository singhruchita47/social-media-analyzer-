import json
import os
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

PlatformType = Literal["youtube", "instagram", "flipkart", "social_media", "ecommerce", "myntra"]
SentimentLabel = Literal["Positive", "Negative", "Neutral", "Mixed", "Question"]


class AnalyzeRequest(BaseModel):
    platform: PlatformType = Field(
        ..., description="Target social media platform: 'youtube' or 'instagram'"
    )
    post_url: str = Field(
        ..., description="Full post/video URL or platform post/video ID"
    )
    post_title: Optional[str] = Field(
        default=None, description="Optional custom label/title for the analyzed post"
    )
    custom_comments: Optional[List[str]] = Field(
        default=None,
        description="Optional list of raw comment strings to analyze alongside or instead of API fetch",
    )
    max_comments: int = Field(
        default=2000, ge=10, le=25000, description="Maximum number of comments to fetch via full pagination (supports up to 25,000 comments)"
    )
    force_sandbox: bool = Field(
        default=False, description="If true, forces simulated sandbox comments instead of live fetch"
    )


class CommentItem(BaseModel):
    comment_id: str
    author: str
    platform: PlatformType
    raw_text: str
    cleaned_text: str
    likes: int = 0
    published_at: str
    sentiment: SentimentLabel
    sentiment_score: float = Field(..., description="Normalized score from -1.0 to +1.0")
    confidence: float = Field(..., description="Model confidence from 0.0 to 1.0")
    pain_point: Optional[str] = None
    keywords: List[str] = Field(default_factory=list)
    is_critical: bool = False
    is_sarcastic: bool = False
    intent: str = "General"  # "Question", "Sarcastic Complaint", "Appreciation", "Direct Complaint", "Mixed Feedback", "General"
    question_category: Optional[str] = None  # "Pricing & Buying", "Usage & Compatibility", "Link Request", "Delivery & Shipping", "General Question"


class KeywordMetric(BaseModel):
    word: str
    count: int
    percentage: float
    dominant_sentiment: SentimentLabel
    category: str = "General"


class PainPointItem(BaseModel):
    category: str
    severity: Literal["High", "Medium", "Low"]
    mentions: int
    sample_quote: str
    recommendation: str


class PipelineMetrics(BaseModel):
    raw_fetched_count: int
    cleaned_valid_count: int
    duplicates_removed: int
    emoji_spam_removed: int
    bot_repetitive_removed: int
    missing_dropped: int
    mean_sentiment_score: float
    sentiment_std_dev: float
    rating_variance: float
    confidence_average: float
    p25_score: float
    median_score: float
    p75_score: float


class SentimentBreakdown(BaseModel):
    positive_count: int
    negative_count: int
    neutral_count: int
    mixed_count: int
    question_count: int = 0
    positive_pct: float
    negative_pct: float
    neutral_pct: float
    mixed_pct: float
    question_pct: float = 0.0
    question_pct: float = 0.0
    # Primary overview percentages
    primary_positive_pct: float
    primary_negative_pct: float
    primary_neutral_pct: float
    primary_question_pct: float = 0.0


class AnalysisResult(BaseModel):
    id: str
    platform: PlatformType
    post_id: str
    post_url: str
    post_title: str
    author_handle: str
    analyzed_at: str
    total_comments: int
    engagement_likes: int
    video_views: int = 0
    post_reach: int = 0
    author_followers: int = 0
    source_mode: str = "Live API"
    ai_engine_used: str
    executive_summary: str
    actionable_insights: List[str]
    sentiment_breakdown: SentimentBreakdown
    pipeline_metrics: PipelineMetrics
    top_keywords: List[KeywordMetric]
    pain_points: List[PainPointItem]
    critical_feedback: List[CommentItem]
    comments: List[CommentItem]
    top_questions: List[Dict[str, Any]] = Field(default_factory=list)


class HistorySummaryItem(BaseModel):
    id: str
    platform: PlatformType
    post_id: str
    post_url: str
    post_title: str
    author_handle: str
    analyzed_at: str
    total_comments: int
    engagement_likes: int
    video_views: int = 0
    post_reach: int = 0
    author_followers: int = 0
    source_mode: str = "Live API"
    ai_engine_used: str
    executive_summary: str
    sentiment_breakdown: SentimentBreakdown
    pipeline_metrics: PipelineMetrics
    top_keywords: List[KeywordMetric]
    pain_points: List[PainPointItem]
    top_questions: List[Dict[str, Any]] = Field(default_factory=list)


class TrendPoint(BaseModel):
    date: str
    label: str
    youtube_comments: int
    instagram_comments: int
    youtube_positive_pct: float
    instagram_positive_pct: float
    youtube_engagement: int
    instagram_engagement: int
    overall_sentiment_score: float


class PlatformComparisonMetric(BaseModel):
    platform: PlatformType
    total_posts: int
    total_comments: int
    total_likes: int
    followers: int = 0
    reach: int = 0
    impressions: int = 0
    engagement_rate: float = 0.0
    growth_pct: float = 0.0
    positive_pct: float
    negative_pct: float
    neutral_pct: float
    mixed_pct: float
    question_pct: float = 0.0
    avg_confidence: float
    rating_variance: float
    top_pain_point: str


class ReachOverviewMetrics(BaseModel):
    total_followers: int = 132540
    followers_growth_pct: float = 8.4
    total_engagement: int = 48920
    engagement_growth_pct: float = 12.2
    total_reach: int = 1840000
    reach_growth_pct: float = 10.5
    total_impressions: int = 3210000
    impressions_growth_pct: float = 6.8


class AggregatedStatsResponse(BaseModel):
    total_posts_analyzed: int
    total_comments_analyzed: int
    total_engagement_likes: int
    reach_overview: ReachOverviewMetrics = Field(default_factory=ReachOverviewMetrics)
    sentiment_breakdown: SentimentBreakdown
    numpy_global_stats: Dict[str, float]
    pandas_cleaning_totals: Dict[str, int]
    platform_comparison: Dict[str, PlatformComparisonMetric]
    engagement_trends: List[TrendPoint]
    top_keywords: List[KeywordMetric]
    pain_points: List[PainPointItem]
    critical_feedback: List[CommentItem]
    recent_comments: List[CommentItem]


class DatabaseManager:
    """SQLite + Optional MongoDB (MONGO_URI) persistence layer for saving and querying social sentiment analyses."""

    def __init__(self, db_path: Optional[str] = None):
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        if db_path is None:
            env_path = os.getenv("DATABASE_PATH", "").strip()
            if env_path and os.path.isabs(env_path):
                db_path = env_path
            else:
                db_path = os.path.join(backend_dir, "sentiment_hub.db")
        self.db_path = db_path
        self.mongo_uri = os.getenv("MONGO_URI", "").strip()
        self.mongo_collection = None
        if self.mongo_uri and not self.mongo_uri.startswith("your_"):
            try:
                from pymongo import MongoClient
                client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=2500)
                db_name = os.getenv("MONGO_DB_NAME", "social_sentiment_hub")
                self.mongo_collection = client[db_name]["analyses"]
            except Exception:
                self.mongo_collection = None
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY,
                    platform TEXT NOT NULL,
                    post_id TEXT NOT NULL,
                    post_url TEXT NOT NULL,
                    post_title TEXT NOT NULL,
                    author_handle TEXT NOT NULL,
                    analyzed_at TEXT NOT NULL,
                    total_comments INTEGER NOT NULL,
                    engagement_likes INTEGER NOT NULL,
                    ai_engine_used TEXT NOT NULL,
                    payload_json TEXT NOT NULL
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_platform ON analyses(platform)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_analyzed_at ON analyses(analyzed_at DESC)"
            )
            conn.commit()

    def save_analysis(self, result: AnalysisResult) -> None:
        payload_json = result.model_dump_json()
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO analyses (
                    id, platform, post_id, post_url, post_title, author_handle,
                    analyzed_at, total_comments, engagement_likes, ai_engine_used, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    result.id,
                    result.platform,
                    result.post_id,
                    result.post_url,
                    result.post_title,
                    result.author_handle,
                    result.analyzed_at,
                    result.total_comments,
                    result.engagement_likes,
                    result.ai_engine_used,
                    payload_json,
                ),
            )
            conn.commit()
        if self.mongo_collection is not None:
            try:
                doc = result.model_dump()
                doc["_id"] = result.id
                self.mongo_collection.replace_one({"_id": result.id}, doc, upsert=True)
            except Exception:
                pass

    def get_all_analyses(
        self, platform: Optional[str] = None, limit: int = 50
    ) -> List[AnalysisResult]:
        query = "SELECT payload_json FROM analyses"
        params: List[Any] = []
        if platform and platform in ("youtube", "instagram"):
            query += " WHERE platform = ?"
            params.append(platform)
        query += " ORDER BY analyzed_at DESC LIMIT ?"
        params.append(limit)

        results: List[AnalysisResult] = []
        with self._get_conn() as conn:
            rows = conn.execute(query, params).fetchall()
            for row in rows:
                data = json.loads(row["payload_json"])
                results.append(AnalysisResult(**data))
        return results

    def get_analysis_by_id(self, analysis_id: str) -> Optional[AnalysisResult]:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT payload_json FROM analyses WHERE id = ?", (analysis_id,)
            ).fetchone()
            if not row:
                return None
            return AnalysisResult(**json.loads(row["payload_json"]))

    def get_analysis_by_url_or_post_id(
        self, post_id: str, post_url: str
    ) -> Optional[AnalysisResult]:
        """Returns cached analysis if the exact post or product was already analyzed."""
        with self._get_conn() as conn:
            row = conn.execute(
                """
                SELECT payload_json FROM analyses
                WHERE post_id = ? OR post_url = ?
                ORDER BY analyzed_at DESC LIMIT 1
                """,
                (post_id, post_url),
            ).fetchone()
            if not row:
                return None
            try:
                data = json.loads(row["payload_json"])
                return AnalysisResult(**data)
            except Exception:
                return None

    def delete_analysis(self, analysis_id: str) -> bool:
        with self._get_conn() as conn:
            cursor = conn.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
            conn.commit()
            return cursor.rowcount > 0

    def count_analyses(self) -> int:
        with self._get_conn() as conn:
            row = conn.execute("SELECT COUNT(*) AS cnt FROM analyses").fetchone()
            return int(row["cnt"]) if row else 0

    def clear_all(self) -> None:
        with self._get_conn() as conn:
            conn.execute("DELETE FROM analyses")
            conn.commit()
