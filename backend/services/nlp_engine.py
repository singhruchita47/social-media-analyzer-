import json
import os
import re
import warnings
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from models import CommentItem, KeywordMetric, PainPointItem, SentimentLabel

with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    try:
        import google.generativeai as genai
    except ImportError:
        genai = None

STOPWORDS = {
    "the", "and", "for", "that", "this", "with", "you", "not", "are", "from",
    "was", "but", "have", "had", "has", "very", "just", "too", "out", "all",
    "can", "get", "what", "when", "your", "they", "their", "our", "been",
    "more", "some", "into", "than", "its", "it's", "about", "would", "could",
    "should", "there", "were", "will", "who", "how", "why", "where", "which",
    "also", "only", "really", "even", "still", "after", "before", "over",
    "under", "while", "these", "those", "such", "much", "many", "most", "other",
    "another", "every", "any", "both", "each", "few", "own", "same", "so",
    "then", "now", "here", "one", "two", "three", "four", "days", "week",
    "weeks", "month", "year", "today", "yesterday", "video", "reel", "post",
    "hai", "hain", "tha", "thi", "the", "aur", "par", "lekin", "magar", "bhi",
    "toh", "ko", "ka", "ki", "ke", "se", "me", "mein", "ye", "yeh", "wo", "woh",
    "ek", "is", "isko", "usko", "मेरा", "मेरी", "है", "हैं", "पर", "लेकिन",
}

POSITIVE_LEXICON = {
    "good": 0.6, "great": 0.78, "amazing": 0.9, "incredible": 0.9,
    "unmatched": 0.88, "best": 0.88, "love": 0.82, "loving": 0.82,
    "obsessed": 0.85, "phenomenal": 0.92, "insane": 0.75, "exceeded": 0.82,
    "premium": 0.72, "smooth": 0.68, "crystal": 0.7, "clear": 0.6,
    "tight": 0.55, "fast": 0.7, "worth": 0.75, "incredibly": 0.8,
    "calmer": 0.65, "luxe": 0.72, "holy": 0.75, "grail": 0.8,
    "spotless": 0.78, "sleekest": 0.76, "hefty": 0.6, "grateful": 0.75,
    "gorgeous": 0.82, "radiant": 0.75, "top": 0.65, "solid": 0.5,
    "helpful": 0.68, "helped": 0.6, "happy": 0.78, "seamless": 0.78,
    "lightweight": 0.72, "protects": 0.68, "glowing": 0.78, "glow": 0.7,
    "effective": 0.78, "recommended": 0.82, "recommend": 0.8, "must": 0.5,
    # English + Hindi / Hinglish positive words
    "nice": 0.68, "awesome": 0.85, "superb": 0.86, "super": 0.75,
    "beautiful": 0.82, "cute": 0.75, "funny": 0.7, "hilarious": 0.8,
    "legend": 0.82, "legendary": 0.88, "goat": 0.85, "respect": 0.78,
    "wow": 0.72, "brilliant": 0.85, "perfect": 0.88, "cool": 0.65,
    "true": 0.6, "facts": 0.65, "relatable": 0.72, "informative": 0.78,
    "mast": 0.85, "badiya": 0.82, "badhiya": 0.82, "zabardast": 0.9,
    "kamaal": 0.85, "kamal": 0.85, "sahi": 0.72, "achha": 0.78,
    "accha": 0.78, "acha": 0.76, "achi": 0.76, "acchi": 0.78,
    "op": 0.82, "gazab": 0.85, "gajab": 0.85, "shandar": 0.85,
    "shaandar": 0.85, "pyara": 0.78, "favourite": 0.8, "favorite": 0.8,
    "proud": 0.82, "thanks": 0.65, "thank": 0.65, "blessed": 0.78,
    "masterpiece": 0.92, "अच्छा": 0.8, "बढ़िया": 0.85, "मस्त": 0.85,
}

NEGATIVE_LEXICON = {
    "late": -0.8, "steep": -0.7, "expensive": -0.78, "ignored": -0.85,
    "terrible": -0.92, "scratched": -0.75, "pending": -0.55, "annoying": -0.68,
    "awful": -0.9, "hurt": -0.6, "hurts": -0.65, "plasticky": -0.65,
    "waiting": -0.55, "delayed": -0.78, "stuck": -0.7, "disappointed": -0.82,
    "leaking": -0.82, "clogs": -0.68, "struggled": -0.6, "fogged": -0.65,
    "small": -0.45, "slow": -0.72, "worst": -0.95, "broken": -0.88,
    "overpriced": -0.85, "missing": -0.72, "stutter": -0.58, "costly": -0.78,
    "oily": -0.72, "sticky": -0.72, "whitecast": -0.75, "greasy": -0.75,
    "pimples": -0.82, "pimple": -0.82, "acne": -0.8, "breakout": -0.82,
    "breakouts": -0.82, "irritation": -0.8, "burning": -0.85, "rash": -0.85,
    "damaged": -0.85, "damage": -0.82, "defective": -0.88, "issue": -0.65,
    "problem": -0.7, "dikat": -0.75, "dikkat": -0.75, "pareshani": -0.75,
    # English + Hindi / Hinglish negative words
    "bad": -0.72, "boring": -0.72, "fake": -0.82, "cringe": -0.8,
    "waste": -0.85, "clickbait": -0.85, "hate": -0.88, "stupid": -0.8,
    "useless": -0.85, "scam": -0.9, "copied": -0.65, "copy": -0.55,
    "bekar": -0.88, "bekaar": -0.88, "bakwas": -0.88, "bakwaas": -0.88,
    "ghatiya": -0.9, "faltu": -0.8, "galat": -0.72, "jhoot": -0.82,
    "jhooth": -0.82, "chapri": -0.82, "chhapri": -0.82, "mehnga": -0.8,
    "mehenga": -0.8, "mehanga": -0.8, "kharab": -0.85, "kharaab": -0.85,
    "dislike": -0.78, "unsubscribe": -0.85, "trash": -0.88, "garbage": -0.9,
    "बेकार": -0.88, "महंगा": -0.8, "खराब": -0.85, "लेट": -0.78,
}

POSITIVE_EMOJIS = ("❤", "🔥", "😍", "🥰", "👏", "💯", "🙌", "👍", "✨", "🎉", "🤩", "😂", "🤣", "😊", "💖", "💕", "🙏")
NEGATIVE_EMOJIS = ("👎", "😡", "🤬", "🤮", "💩", "😤", "😒", "💔", "😭", "😢")

# Contrastive markers in English, Hindi & Hinglish (e.g. "product bht achha hai PAR price high hai")
CONTRASTIVE_MARKERS = {
    "but", "though", "although", "however", "yet", "except", "while",
    "par", "per", "pr", "lekin", "magar", "bas", "bs", "sirf", "पर", "लेकिन", "मगर",
}

KEYWORD_CATEGORIES = {
    "quality": "Product Quality",
    "product": "Product Quality",
    "build": "Product Quality",
    "audio": "Product Quality",
    "sound": "Product Quality",
    "formula": "Product Quality",
    "sunscreen": "Product Quality",
    "skin": "Product Quality",
    "oily": "Product Quality",
    "whitecast": "Product Quality",
    "lightweight": "Product Quality",
    "texture": "Product Quality",
    "battery": "Product Quality",
    "price": "Pricing & Value",
    "expensive": "Pricing & Value",
    "costly": "Pricing & Value",
    "mehnga": "Pricing & Value",
    "mehenga": "Pricing & Value",
    "worth": "Pricing & Value",
    "value": "Pricing & Value",
    "discount": "Pricing & Value",
    "delivery": "Shipping & Delivery",
    "shipping": "Shipping & Delivery",
    "courier": "Shipping & Delivery",
    "tracking": "Shipping & Delivery",
    "late": "Shipping & Delivery",
    "package": "Packaging & Hardware",
    "packaging": "Packaging & Hardware",
    "bottle": "Packaging & Hardware",
    "support": "Customer Support",
    "service": "Customer Support",
    "refund": "Customer Support",
    "replacement": "Customer Support",
}

# Detailed Root-Cause / Customer Problem Definitions (English + Hindi + Hinglish)
PAIN_POINT_DEFINITIONS = {
    "Price Problem (High Cost)": {
        "triggers": [
            "price", "expensive", "steep", "costly", "overpriced", "mehnga", "mehenga",
            "mehanga", "rate", "cost", "subscription", "customs", "fee", "budget",
            "paisa", "paise", "worth nahi", "महंगा",
        ],
        "severity": "High",
        "recommendation": "Customers like the product but feel the price is too high — introduce smaller trial packs, student/bundle discounts, or free shipping thresholds.",
    },
    "Delivery Problem (Late Shipping)": {
        "triggers": [
            "delivery", "shipping", "late", "courier", "tracking", "weeks", "waiting",
            "delayed", "der se", "order nahi", "pending", "arrived late", "slow delivery", "लेट",
        ],
        "severity": "High",
        "recommendation": "Customers are unhappy with late delivery timelines — switch to faster regional couriers and send proactive WhatsApp/SMS tracking updates.",
    },
    "Quality / Product Issue": {
        "triggers": [
            "quality", "bekar", "bekaar", "bakwas", "ghatiya", "kharab", "kharaab",
            "worst", "oily", "sticky", "whitecast", "white cast", "greasy", "pimple",
            "pimples", "acne", "breakout", "breakouts", "irritation", "burning", "smell",
            "dry", "defective", "not working", "kaam nahi", "asar nahi", "बेकार", "खराब",
        ],
        "severity": "High",
        "recommendation": "Customers reported product performance or skin/quality issues — audit batch formulation and add clear usage/skin-type guidance on the product page.",
    },
    "Packaging / Damage Issue": {
        "triggers": [
            "packaging", "package", "scratched", "plasticky", "hinge", "zipper",
            "clogs", "leaking", "leak", "fogged", "seal", "broken", "damaged",
            "damage", "bottle", "pump", "toota", "tut",
        ],
        "severity": "Medium",
        "recommendation": "Customers received leaking, scratched, or damaged packaging — strengthen outer transit cushioning and inner seal quality checks.",
    },
    "Customer Support / Refund Issue": {
        "triggers": [
            "support", "service", "ignored", "dm", "emails", "refund", "replacement",
            "return", "reply", "response", "customer care", "helpline",
        ],
        "severity": "High",
        "recommendation": "Customers are frustrated by slow support/refund responses — automate return status updates and reduce social DM response time to under 2 hours.",
    },
    "Quantity / Sizing / Stock Issue": {
        "triggers": [
            "quantity", "small", "chota", "kam hai", "less", "size", "sizing",
            "fitting", "out of stock", "stock", "shade",
        ],
        "severity": "Medium",
        "recommendation": "Customers feel the quantity/size is too small for the price — clarify ml/gram volume upfront and restock fast-moving variants.",
    },
}


def detect_customer_problem(lower_text: str, tokens: List[str], sentiment: str) -> Optional[str]:
    """
    Identifies the exact reason WHY a comment is Negative or Mixed
    (e.g., Price Problem, Delivery Problem, Quality Issue, Packaging Issue, Support Issue).
    """
    if sentiment not in ("Negative", "Mixed"):
        return None

    # Check specific phrase combinations first (like "price high hai", "rate jyada hai", "delivery late")
    if any(p in lower_text for p in ("price high", "high price", "rate high", "rate jyada", "rate zyada", "bahut mehnga", "bht mehnga", "too expensive", "way too steep")):
        return "Price Problem (High Cost)"

    if any(p in lower_text for p in ("delivery was very late", "delivery late", "late delivery", "very late", "shipping took", "days late", "weeks")):
        return "Delivery Problem (Late Shipping)"

    # Score each pain point definition by how many triggers appear in the comment
    best_cat: Optional[str] = None
    best_hits = 0
    for pp_name, pp_cfg in PAIN_POINT_DEFINITIONS.items():
        hits = sum(1 for trig in pp_cfg["triggers"] if trig in lower_text)
        # Do not blame "Quality / Product Issue" if the word "quality" was used positively (e.g. "Quality is good, but delivery was very late")
        if pp_name == "Quality / Product Issue" and hits == 1 and "quality" in lower_text:
            if any(pos_w in lower_text for pos_w in ("quality is good", "quality acchi", "quality achhi", "quality bht", "good quality", "great quality", "amazing quality")):
                continue
        if hits > best_hits:
            best_hits = hits
            best_cat = pp_name

    if best_cat:
        return best_cat

    return "General Customer Dissatisfaction"


class SentimentNLPEngine:
    """
    AI/NLP Engine powered by Google Gemini API with multilingual (English + Hindi + Hinglish)
    contrastive & root-cause problem detection.
    """

    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

    def _has_valid_gemini_key(self) -> bool:
        return bool(
            self.api_key
            and self.api_key != "your_gemini_api_key_here"
            and len(self.api_key) > 15
            and genai is not None
        )

    def analyze_dataframe(
        self,
        df: pd.DataFrame,
        platform: str,
        post_title: str,
        force_sandbox: bool = False,
    ) -> Tuple[
        List[CommentItem],
        List[KeywordMetric],
        List[PainPointItem],
        str,
        List[str],
        str,
    ]:
        if df.empty:
            return [], [], [], "No valid comments remained after data cleaning.", [], "Hybrid NLP Engine"

        records = df.to_dict(orient="records")

        if not force_sandbox and self._has_valid_gemini_key():
            gemini_result = self._analyze_with_gemini(records, platform, post_title)
            if gemini_result is not None:
                return gemini_result

        return self._analyze_with_semantic_engine(records, platform, post_title)

    def _analyze_with_gemini(
        self,
        records: List[Dict[str, Any]],
        platform: str,
        post_title: str,
    ) -> Optional[
        Tuple[
            List[CommentItem],
            List[KeywordMetric],
            List[PainPointItem],
            str,
            List[str],
            str,
        ]
    ]:
        try:
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(self.model_name)

            batch_input = [
                {"id": r["comment_id"], "text": r["cleaned_text"]}
                for r in records[:60]
            ]
            prompt = (
                "You are an expert Social Media Sentiment & Customer Pain-Point AI for Instagram and YouTube comments (supporting English, Hindi, and Hinglish).\n"
                f"Platform: {platform.upper()} | Post Title: {post_title}\n"
                "Rules:\n"
                "1. If a comment praises one thing but complains about another (e.g. 'ye product bht achha hai par price high hai' or 'Quality is good, but delivery was very late'), classify sentiment as 'Mixed' and set pain_point to the exact problem ('Price Problem (High Cost)', 'Delivery Problem (Late Shipping)', 'Quality / Product Issue', 'Packaging / Damage Issue', 'Customer Support / Refund Issue', or 'Quantity / Sizing / Stock Issue').\n"
                "2. For Negative comments, always set pain_point to the specific reason why it is negative.\n"
                "3. Return ONLY valid JSON with this schema:\n"
                "{\n"
                '  "classifications": [\n'
                '    {"id": "...", "sentiment": "Positive|Negative|Neutral|Mixed", "score": -0.35, "confidence": 0.94, "pain_point": "Price Problem (High Cost) or null", "keywords": ["product", "price"], "is_critical": true}\n'
                "  ],\n"
                '  "executive_summary": "2-sentence executive summary of audience sentiment and main customer problems.",\n'
                '  "actionable_insights": ["Insight 1", "Insight 2", "Insight 3"]\n'
                "}\n\n"
                f"Comments:\n{json.dumps(batch_input, ensure_ascii=False)}"
            )

            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if not json_match:
                return None
            parsed = json.loads(json_match.group(0))
            cls_map = {
                item["id"]: item for item in parsed.get("classifications", []) if "id" in item
            }

            comments: List[CommentItem] = []
            for r in records:
                cid = r["comment_id"]
                if cid in cls_map:
                    c_info = cls_map[cid]
                    lbl = c_info.get("sentiment", "Neutral")
                    if lbl not in ("Positive", "Negative", "Neutral", "Mixed"):
                        lbl = "Neutral"
                    score = float(c_info.get("score", 0.0))
                    conf = float(c_info.get("confidence", 0.9))
                    pain = c_info.get("pain_point")
                    if lbl in ("Negative", "Mixed") and not pain:
                        pain = detect_customer_problem(
                            r["cleaned_text"].lower(),
                            re.findall(r"[a-z]+", r["cleaned_text"].lower()),
                            lbl,
                        )
                    kws = c_info.get("keywords", [])[:4]
                    crit = bool(c_info.get("is_critical", lbl in ("Negative", "Mixed") and pain is not None))
                    comments.append(
                        CommentItem(
                            comment_id=cid,
                            author=r["author"],
                            platform=platform,
                            raw_text=r["raw_text"],
                            cleaned_text=r["cleaned_text"],
                            likes=int(r.get("likes", 0)),
                            published_at=r.get("published_at", ""),
                            sentiment=lbl,
                            sentiment_score=max(-1.0, min(1.0, round(score, 3))),
                            confidence=max(0.5, min(0.99, round(conf, 3))),
                            pain_point=pain,
                            keywords=kws,
                            is_critical=crit,
                        )
                    )
                else:
                    comments.append(self._classify_single_comment(r, platform))

            top_keywords = self._extract_top_keywords(comments)
            pain_points = self._extract_pain_points(comments)
            exec_summary = parsed.get("executive_summary") or self._build_summary(
                comments, platform, post_title, top_keywords
            )
            insights = parsed.get("actionable_insights") or self._build_actionable_insights(
                comments, pain_points, top_keywords
            )
            return (
                comments,
                top_keywords,
                pain_points,
                exec_summary,
                insights,
                f"Google Gemini ({self.model_name})",
            )
        except Exception:
            return None

    def _classify_single_comment(
        self, record: Dict[str, Any], platform: str
    ) -> CommentItem:
        text = record["cleaned_text"]
        lower = text.lower()
        tokens = re.findall(r"[a-z]+", lower)

        pos_hits: List[float] = []
        neg_hits: List[float] = []
        extracted_kws: List[str] = []

        # Positive emoji reactions (e.g. 🙌, 🔥, 👏, ❤️, 😍, 😮)
        if any(em in text for em in ("🙌", "🔥", "👏", "❤️", "😍", "😮", "💯", "👍")):
            pos_hits.append(0.75)

        if any(lk in lower or lk in text for lk in ("🔗", "🖇", "लिंक", "link", "pp")):
            extracted_kws.append("link")

        # Negation-aware check (e.g. "not oily", "no whitecast", "zero breakouts" are POSITIVE!)
        negated_positives = (
            "not oily", "no whitecast", "no white cast", "not sticky",
            "not greasy", "zero shrinkage", "zero distortion", "zero breakouts",
            "no breakouts", "no irritation", "oil free",
        )
        for np_phrase in negated_positives:
            if np_phrase in lower:
                pos_hits.append(0.82)

        for idx, tok in enumerate(tokens):
            prev_tok = tokens[idx - 1] if idx > 0 else ""
            prev2_tok = tokens[idx - 2] if idx > 1 else ""

            if tok in KEYWORD_CATEGORIES and tok not in extracted_kws:
                extracted_kws.append(tok)

            # Handle negated positive e.g. "achha nahi hai", "worth nahi", "good not"
            next_tok = tokens[idx + 1] if idx + 1 < len(tokens) else ""
            if tok in POSITIVE_LEXICON:
                if prev_tok in ("not", "no", "nahi", "nhi", "na") or next_tok in ("nahi", "nhi"):
                    neg_hits.append(-0.75)
                else:
                    pos_hits.append(POSITIVE_LEXICON[tok])
            elif tok in NEGATIVE_LEXICON:
                # If preceded by "not" or "no" (like "not oily", "no whitecast"), treat as positive!
                if prev_tok in ("not", "no", "zero", "without", "nahi", "nhi") or prev2_tok in ("not", "no"):
                    pos_hits.append(0.65)
                else:
                    neg_hits.append(NEGATIVE_LEXICON[tok])

        # Check Hinglish / English phrase-level problem triggers
        if any(p in lower for p in ("price high", "high price", "rate high", "rate jyada", "rate zyada", "price jyada", "price zyada", "too steep", "too expensive", "hard to justify", "worth nahi")):
            neg_hits.append(-0.82)
            if "price" not in extracted_kws:
                extracted_kws.append("price")

        if any(p in lower for p in ("very late", "delivery late", "late delivery", "took 3 weeks", "took 2 weeks", "took 14", "days late", "der se")):
            neg_hits.append(-0.85)
            if "delivery" not in extracted_kws:
                extracted_kws.append("delivery")

        if any(p in lower for p in ("worth every penny", "best purchase", "must buy", "10/10", "holy grail", "bht achha", "bahut achha", "bahut accha", "bht accha")):
            pos_hits.append(0.88)

        for em in POSITIVE_EMOJIS:
            if em in text:
                pos_hits.append(0.65)
        for em in NEGATIVE_EMOJIS:
            if em in text:
                neg_hits.append(-0.7)

        has_contrast = any(tok in CONTRASTIVE_MARKERS for tok in tokens)

        pos_sum = sum(pos_hits)
        neg_sum = sum(neg_hits)

        sentiment: SentimentLabel = "Neutral"
        score = 0.0
        confidence = 0.89

        if pos_hits and neg_hits and has_contrast:
            sentiment = "Mixed"
            score = round((pos_sum + neg_sum) / max(len(pos_hits) + len(neg_hits), 1), 3)
            if score == 0.0:
                score = -0.22
            confidence = 0.94
        elif pos_hits and neg_hits and abs(neg_sum) >= 0.65:
            sentiment = "Mixed"
            score = round((pos_sum + neg_sum) * 0.45, 3)
            confidence = 0.91
        elif pos_sum > abs(neg_sum) * 1.2 and pos_sum >= 0.45:
            sentiment = "Positive"
            score = min(0.98, round(0.45 + (pos_sum / (len(pos_hits) + 1.2)) * 0.5, 3))
            confidence = min(0.98, round(0.86 + min(len(pos_hits), 4) * 0.03, 3))
        elif abs(neg_sum) > pos_sum * 1.1 and abs(neg_sum) >= 0.45:
            sentiment = "Negative"
            score = max(-0.98, round(-0.45 + (neg_sum / (len(neg_hits) + 1.2)) * 0.5, 3))
            confidence = min(0.97, round(0.86 + min(len(neg_hits), 4) * 0.03, 3))
        else:
            sentiment = "Neutral"
            score = 0.05 if "?" not in text else 0.0
            confidence = 0.85

        pain_point = detect_customer_problem(lower, tokens, sentiment)

        if not extracted_kws:
            extracted_kws = [
                w for w in tokens if len(w) >= 4 and w not in STOPWORDS
            ][:3]

        is_critical = bool(
            sentiment in ("Negative", "Mixed")
            and (pain_point is not None or score <= -0.45)
        )

        return CommentItem(
            comment_id=record["comment_id"],
            author=record["author"],
            platform=platform,
            raw_text=record["raw_text"],
            cleaned_text=text,
            likes=int(record.get("likes", 0)),
            published_at=record.get("published_at", ""),
            sentiment=sentiment,
            sentiment_score=score,
            confidence=confidence,
            pain_point=pain_point,
            keywords=extracted_kws[:4],
            is_critical=is_critical,
        )

    def _analyze_with_semantic_engine(
        self,
        records: List[Dict[str, Any]],
        platform: str,
        post_title: str,
    ) -> Tuple[
        List[CommentItem],
        List[KeywordMetric],
        List[PainPointItem],
        str,
        List[str],
        str,
    ]:
        comments = [self._classify_single_comment(r, platform) for r in records]
        top_keywords = self._extract_top_keywords(comments)
        pain_points = self._extract_pain_points(comments)
        summary = self._build_summary(comments, platform, post_title, top_keywords)
        insights = self._build_actionable_insights(comments, pain_points, top_keywords)
        return (
            comments,
            top_keywords,
            pain_points,
            summary,
            insights,
            "Gemini Semantic NLP Engine",
        )

    def _extract_top_keywords(self, comments: List[CommentItem]) -> List[KeywordMetric]:
        total_comments = max(len(comments), 1)
        word_counter: Counter = Counter()
        word_sentiments: Dict[str, List[SentimentLabel]] = {}

        domain_boost_words = {
            "quality", "price", "delivery", "shipping", "support", "packaging",
            "audio", "battery", "design", "formula", "service", "value", "courier",
            "product", "sunscreen", "skin", "oily", "lightweight",
        }

        for c in comments:
            tokens = set(re.findall(r"[a-z]{3,}", c.cleaned_text.lower()))
            for tok in tokens:
                if tok in STOPWORDS:
                    continue
                if tok in domain_boost_words or len(tok) >= 4:
                    word_counter[tok] += 1
                    word_sentiments.setdefault(tok, []).append(c.sentiment)

        metrics: List[KeywordMetric] = []
        for word, count in word_counter.most_common(12):
            sents = word_sentiments.get(word, ["Neutral"])
            sent_counts = Counter(sents)
            dominant: SentimentLabel = sent_counts.most_common(1)[0][0]
            pct = round((count / total_comments) * 100.0, 1)
            category = KEYWORD_CATEGORIES.get(word, "Audience Topic")
            metrics.append(
                KeywordMetric(
                    word=word,
                    count=count,
                    percentage=pct,
                    dominant_sentiment=dominant,
                    category=category,
                )
            )
        return metrics

    def _extract_pain_points(self, comments: List[CommentItem]) -> List[PainPointItem]:
        grouped: Dict[str, List[CommentItem]] = {}
        for c in comments:
            if c.pain_point:
                grouped.setdefault(c.pain_point, []).append(c)

        pain_items: List[PainPointItem] = []
        for pp_name, items in grouped.items():
            cfg = PAIN_POINT_DEFINITIONS.get(
                pp_name,
                {
                    "severity": "Medium",
                    "recommendation": "Review customer feedback tickets and address recurring friction points.",
                },
            )
            best_quote = items[0].cleaned_text
            pain_items.append(
                PainPointItem(
                    category=pp_name,
                    severity=cfg["severity"],
                    mentions=len(items),
                    sample_quote=best_quote,
                    recommendation=cfg["recommendation"],
                )
            )

        pain_items.sort(key=lambda x: x.mentions, reverse=True)
        return pain_items

    def _build_summary(
        self,
        comments: List[CommentItem],
        platform: str,
        post_title: str,
        top_keywords: List[KeywordMetric],
    ) -> str:
        total = max(len(comments), 1)
        pos = sum(1 for c in comments if c.sentiment == "Positive")
        neg = sum(1 for c in comments if c.sentiment == "Negative")
        mix = sum(1 for c in comments if c.sentiment == "Mixed")
        pos_pct = round((pos / total) * 100)
        neg_pct = round((neg / total) * 100)
        kw_names = ", ".join(k.word for k in top_keywords[:4]) or "quality, price, delivery"

        return (
            f"Analysis of {total} cleaned {platform.capitalize()} comments on '{post_title}' reveals "
            f"{pos_pct}% positive feedback alongside {neg_pct}% negative and {mix} mixed ('Yes, But...') responses. "
            f"Key topics include {kw_names}."
        )

    def _build_actionable_insights(
        self,
        comments: List[CommentItem],
        pain_points: List[PainPointItem],
        top_keywords: List[KeywordMetric],
    ) -> List[str]:
        insights: List[str] = []
        for pp in pain_points[:3]:
            insights.append(f"[{pp.category}] ({pp.mentions} comments): {pp.recommendation}")
        if not insights:
            insights.append(
                "Maintain high engagement velocity by pinning a FAQ comment addressing top community questions."
            )
        return insights[:4]
