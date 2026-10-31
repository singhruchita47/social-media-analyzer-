import html
import re
from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd
from models import CommentItem, PipelineMetrics, SentimentBreakdown

BOT_SPAM_REGEX = re.compile(
    r"(check my bio|free crypto|gain \d+k? followers|instant_followers|message whatsapp|"
    r"work(?:ing)? from home.*?\$\d+|dm @[a-z0-9_.]+ to gain|telegram @[a-z0-9_]+)",
    re.IGNORECASE,
)


def _normalize_text(text: Any) -> str:
    if text is None or (isinstance(text, float) and np.isnan(text)):
        return ""
    s = html.unescape(str(text)).strip()
    # Remove URLs
    s = re.sub(r"https?://\S+|www\.\S+", "", s)
    # Collapse excessive whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _is_emoji_only_or_symbol_spam(row: pd.Series) -> bool:
    text = str(row.get("cleaned_text", "") or "").strip()
    author = str(row.get("author", "") or "").lower()
    if not text:
        return True
    # Filter known synthetic emoji-spam bot handles or long emoji-flood strings (e.g. "🔥🔥🔥💯💯🙌🙌✨")
    if any(b in author for b in ("emoji_spammer", "emoji_bot", "hype_only_bot")):
        return True
    # Check if text has letters/numbers in English or Hindi/Devanagari
    alpha_num = re.sub(r"[^a-zA-Z0-9\u0900-\u097F]", "", text)
    if len(alpha_num) >= 2:
        return False
    # For pure emoji comments from real users, keep short genuine reactions/link requests (1-3 emojis like 🔗, 🙌, 🔥),
    # and only filter excessive emoji floods (>= 5 chars of pure emojis)
    return len(text) > 6


def _is_bot_or_repetitive(text: str) -> bool:
    if not text:
        return False
    if BOT_SPAM_REGEX.search(text):
        return True
    # Check if a phrase of >= 15 chars repeats verbatim
    lowered = text.lower().strip()
    words = lowered.split()
    if len(words) >= 6:
        half = len(words) // 2
        if words[:half] == words[half : 2 * half]:
            return True
    # Check extreme character repetition e.g. "aaaaaaaaaa"
    if re.search(r"(.)\1{7,}", lowered):
        return True
    return False


class DataProcessingPipeline:
    """
    Pandas & NumPy Data Processing Pipeline:
    1. Cleans and normalizes raw social media comments using Pandas DataFrames.
    2. Filters missing values, exact/near duplicates, emoji-only spam, and repetitive bot comments.
    3. Computes statistical distributions, confidence averages, and rating variances with NumPy.
    """

    def clean_comments(
        self, raw_comments: List[Dict[str, Any]], platform: str
    ) -> Tuple[pd.DataFrame, Dict[str, int]]:
        raw_count = len(raw_comments)
        if raw_count == 0:
            empty_df = pd.DataFrame(
                columns=[
                    "comment_id",
                    "author",
                    "platform",
                    "raw_text",
                    "cleaned_text",
                    "likes",
                    "published_at",
                ]
            )
            return empty_df, {
                "raw_fetched_count": 0,
                "cleaned_valid_count": 0,
                "missing_dropped": 0,
                "duplicates_removed": 0,
                "emoji_spam_removed": 0,
                "bot_repetitive_removed": 0,
            }

        df = pd.DataFrame(raw_comments)
        for col, default in [
            ("comment_id", "unknown"),
            ("author", "@anonymous"),
            ("raw_text", ""),
            ("likes", 0),
            ("published_at", ""),
        ]:
            if col not in df.columns:
                df[col] = default

        df["platform"] = platform
        df["likes"] = pd.to_numeric(df["likes"], errors="coerce").fillna(0).astype(int)

        # Step 1: Normalize text & drop missing/empty comments
        df["cleaned_text"] = df["raw_text"].apply(_normalize_text)
        missing_mask = df["cleaned_text"].isna() | (df["cleaned_text"].str.len() == 0)
        missing_dropped = int(missing_mask.sum())
        df = df[~missing_mask].copy()

        # Step 2: Filter emoji-only or symbol-only spam
        emoji_mask = df.apply(_is_emoji_only_or_symbol_spam, axis=1)
        emoji_spam_removed = int(emoji_mask.sum())
        df = df[~emoji_mask].copy()

        # Step 3: Filter repetitive bot / promo spam
        bot_mask = df["cleaned_text"].apply(_is_bot_or_repetitive)
        bot_repetitive_removed = int(bot_mask.sum())
        df = df[~bot_mask].copy()

        # Step 4: Deduplicate exact duplicate comments from the same author
        df["_dedup_key"] = (
            df["cleaned_text"]
            .str.lower()
            .str.replace(r"\s+", " ", regex=True)
            .str.strip()
        )
        before_dedup = len(df)
        df = df.drop_duplicates(subset=["author", "_dedup_key"], keep="first").copy()
        duplicates_removed = int(before_dedup - len(df))
        df.drop(columns=["_dedup_key"], inplace=True)

        df.reset_index(drop=True, inplace=True)

        cleaning_stats = {
            "raw_fetched_count": int(raw_count),
            "cleaned_valid_count": int(len(df)),
            "missing_dropped": missing_dropped,
            "duplicates_removed": duplicates_removed,
            "emoji_spam_removed": emoji_spam_removed,
            "bot_repetitive_removed": bot_repetitive_removed,
        }
        return df, cleaning_stats

    def compute_statistics(
        self,
        comments: List[CommentItem],
        cleaning_stats: Dict[str, int],
    ) -> Tuple[SentimentBreakdown, PipelineMetrics]:
        total = len(comments)
        if total == 0:
            empty_breakdown = SentimentBreakdown(
                positive_count=0,
                negative_count=0,
                neutral_count=0,
                mixed_count=0,
                positive_pct=0.0,
                negative_pct=0.0,
                neutral_pct=0.0,
                mixed_pct=0.0,
                primary_positive_pct=0.0,
                primary_negative_pct=0.0,
                primary_neutral_pct=0.0,
            )
            empty_metrics = PipelineMetrics(
                raw_fetched_count=cleaning_stats.get("raw_fetched_count", 0),
                cleaned_valid_count=0,
                duplicates_removed=cleaning_stats.get("duplicates_removed", 0),
                emoji_spam_removed=cleaning_stats.get("emoji_spam_removed", 0),
                bot_repetitive_removed=cleaning_stats.get("bot_repetitive_removed", 0),
                missing_dropped=cleaning_stats.get("missing_dropped", 0),
                mean_sentiment_score=0.0,
                sentiment_std_dev=0.0,
                rating_variance=0.0,
                confidence_average=0.0,
                p25_score=0.0,
                median_score=0.0,
                p75_score=0.0,
            )
            return empty_breakdown, empty_metrics

        # Convert scores & confidences to NumPy arrays for vectorized statistical analysis
        scores_arr = np.array([c.sentiment_score for c in comments], dtype=np.float64)
        conf_arr = np.array([c.confidence for c in comments], dtype=np.float64)
        labels = [c.sentiment for c in comments]

        pos_count = int(sum(1 for lbl in labels if lbl == "Positive"))
        neg_count = int(sum(1 for lbl in labels if lbl == "Negative"))
        neu_count = int(sum(1 for lbl in labels if lbl == "Neutral"))
        mix_count = int(sum(1 for lbl in labels if lbl == "Mixed"))

        pos_pct = float(np.round((pos_count / total) * 100.0, 1))
        neg_pct = float(np.round((neg_count / total) * 100.0, 1))
        neu_pct = float(np.round((neu_count / total) * 100.0, 1))
        mix_pct = float(np.round((mix_count / total) * 100.0, 1))

        # 3-way primary breakdown (Positive / Negative / Neutral+Mixed) for executive cards
        primary_pos = pos_pct
        primary_neg = neg_pct
        primary_neu = float(np.round(100.0 - (primary_pos + primary_neg), 1))

        # Map [-1.0, +1.0] sentiment scores onto a [1.0, 5.0] star-rating scale to compute rating variance
        star_equivalent = 3.0 + (scores_arr * 2.0)
        mean_score = float(np.round(np.mean(scores_arr), 3))
        std_dev = float(np.round(np.std(scores_arr), 3))
        rating_var = float(np.round(np.var(star_equivalent), 3))
        conf_avg = float(np.round(np.mean(conf_arr), 3))
        p25, median, p75 = np.percentile(scores_arr, [25, 50, 75])

        breakdown = SentimentBreakdown(
            positive_count=pos_count,
            negative_count=neg_count,
            neutral_count=neu_count,
            mixed_count=mix_count,
            positive_pct=pos_pct,
            negative_pct=neg_pct,
            neutral_pct=neu_pct,
            mixed_pct=mix_pct,
            primary_positive_pct=primary_pos,
            primary_negative_pct=primary_neg,
            primary_neutral_pct=max(0.0, primary_neu),
        )

        metrics = PipelineMetrics(
            raw_fetched_count=cleaning_stats.get("raw_fetched_count", total),
            cleaned_valid_count=total,
            duplicates_removed=cleaning_stats.get("duplicates_removed", 0),
            emoji_spam_removed=cleaning_stats.get("emoji_spam_removed", 0),
            bot_repetitive_removed=cleaning_stats.get("bot_repetitive_removed", 0),
            missing_dropped=cleaning_stats.get("missing_dropped", 0),
            mean_sentiment_score=mean_score,
            sentiment_std_dev=std_dev,
            rating_variance=rating_var,
            confidence_average=conf_avg,
            p25_score=float(np.round(p25, 3)),
            median_score=float(np.round(median, 3)),
            p75_score=float(np.round(p75, 3)),
        )
        return breakdown, metrics
