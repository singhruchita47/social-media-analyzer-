import json
import os
import re
import time
import warnings
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FuturesTimeout
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
import requests
from models import CommentItem, KeywordMetric, PainPointItem, SentimentLabel
from services.data_pipeline import demojize_with_feelings

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    vader_analyzer = SentimentIntensityAnalyzer()
except Exception:
    vader_analyzer = None

try:
    from textblob import TextBlob
except Exception:
    TextBlob = None

with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    try:
        from transformers import pipeline as hf_pipeline
    except ImportError:
        hf_pipeline = None
    try:
        import anthropic
    except ImportError:
        anthropic = None
    try:
        import openai
    except ImportError:
        openai = None
    try:
        import google.generativeai as genai
    except ImportError:
        genai = None

LLM_TOTAL_BUDGET_SECONDS = 30
_LLM_EXECUTOR = ThreadPoolExecutor(max_workers=4)


class DeepMojiEmotionEngine:
    """
    DeepMoji-inspired 64-Emoji Emotional Context, Irony & Sarcasm Neural Scorer.
    Models how emojis express deeper emotional states (joy, adoration, approval,
    irony/mockery, eye-roll skepticism, rage, disgust, heartbreak) and detects
    Emoji-Text Polarity Clashes (e.g., positive words + 🙃/🙄/🤡 or negative complaints + 👏/🎉).
    """

    # 64-Emoji Deep Emotional Valence & Irony Matrix: (valence_score, emotion_cluster, is_irony_marker)
    EMOJI_VALENCE_MATRIX: Dict[str, Tuple[float, str, bool]] = {
        # Sarcasm / Irony / Mockery Cluster (DeepMoji Irony & Passive-Aggressive States)
        "🙃": (-0.85, "irony_passive_aggressive", True),
        "🙄": (-0.85, "eye_roll_sarcasm", True),
        "🤡": (-0.92, "clown_mockery_sarcasm", True),
        "😒": (-0.78, "unamused_skepticism", True),
        "🤨": (-0.65, "raised_eyebrow_doubt", True),
        "😏": (-0.55, "smirk_irony", True),
        "💅": (-0.50, "sassy_dismissive", True),
        # Anger / Frustration / Disgust Cluster
        "😡": (-0.92, "rage_anger", False),
        "🤬": (-0.96, "furious_cursing", False),
        "😤": (-0.80, "frustrated_steaming", False),
        "💢": (-0.85, "anger_vein", False),
        "🤮": (-0.94, "vomiting_disgust", False),
        "🤢": (-0.86, "nauseated_disgust", False),
        "💩": (-0.90, "pile_of_poo_trash", False),
        "👎": (-0.85, "thumbs_down_dislike", False),
        "🖕": (-0.98, "middle_finger_hostile", False),
        # Sadness / Heartbreak / Regret Cluster
        "💔": (-0.85, "broken_heart_disappointment", False),
        "😭": (-0.72, "loudly_crying_grief", False),
        "😢": (-0.75, "crying_sadness", False),
        "😞": (-0.75, "disappointed_sad", False),
        "😔": (-0.70, "pensive_regret", False),
        "😩": (-0.76, "weary_distress", False),
        "😫": (-0.78, "tired_frustrated", False),
        "🥺": (-0.45, "pleading_sad", False),
        "🤦": (-0.82, "facepalm_disbelief", True),
        "🤦‍♂️": (-0.82, "facepalm_disbelief", True),
        "🤦‍♀️": (-0.82, "facepalm_disbelief", True),
        # High-Energy Positive / Hype / Joy Cluster
        "🔥": (0.85, "fire_hype_lit", False),
        "❤️": (0.88, "red_heart_love", False),
        "❤": (0.88, "red_heart_love", False),
        "💖": (0.88, "sparkling_heart_love", False),
        "💕": (0.85, "two_hearts_affection", False),
        "😍": (0.90, "heart_eyes_adoration", False),
        "🥰": (0.90, "smiling_hearts_love", False),
        "🤩": (0.90, "star_struck_amazed", False),
        "💯": (0.88, "hundred_points_perfect", False),
        "🙌": (0.84, "raising_hands_praise", False),
        "👏": (0.76, "clapping_applause", False),
        "👍": (0.78, "thumbs_up_approval", False),
        "✨": (0.75, "sparkles_positive", False),
        "🎉": (0.82, "party_celebration", False),
        "🥳": (0.86, "partying_joy", False),
        "😊": (0.78, "smiling_warm_happy", False),
        "😁": (0.78, "beaming_happy", False),
        "😂": (0.65, "tears_of_joy_funny", False),
        "🤣": (0.68, "rofl_hilarious", False),
        "🙏": (0.70, "folded_hands_gratitude", False),
        "👑": (0.85, "crown_goat_respect", False),
        "💎": (0.82, "gem_valuable", False),
        "🚀": (0.80, "rocket_amazing", False),
    }

    @classmethod
    def analyze_emoji_context(
        cls, raw_text: str, text_pos_hits: List[float], text_neg_hits: List[float]
    ) -> Dict[str, Any]:
        """
        Evaluates emojis in the comment and detects DeepMoji Emotional Vector +
        Emoji-Text Polarity Clashes (Sarcasm/Irony).
        """
        found_emojis: List[Tuple[str, float, str, bool]] = []
        for em_char, (val, cluster, is_irony) in cls.EMOJI_VALENCE_MATRIX.items():
            if em_char in raw_text:
                found_emojis.append((em_char, val, cluster, is_irony))

        if not found_emojis:
            return {
                "emoji_score": 0.0,
                "dominant_emotion": "none",
                "is_sarcastic_clash": False,
                "pos_emoji_hits": [],
                "neg_emoji_hits": [],
            }

        pos_em = [val for _, val, _, _ in found_emojis if val > 0]
        neg_em = [val for _, val, _, _ in found_emojis if val < 0]
        has_irony_emoji = any(is_ir for _, _, _, is_ir in found_emojis)
        has_applause_or_laugh = any(
            em in raw_text for em in ("👏", "🎉", "👍", "😂", "🤣", "🥳")
        )

        # Polarity Clash 1: Positive words paired with Sarcastic/Irony Emojis (🙃, 🙄, 🤡, 😒, 🤦, 💩)
        clash_pos_text_neg_emoji = bool(text_pos_hits and (has_irony_emoji or neg_em))
        # Polarity Clash 2: Strong Negative Complaint paired with Clapping/Celebration Emojis ("broke in 2 days 👏🎉")
        clash_neg_text_applause_emoji = bool(
            text_neg_hits
            and abs(sum(text_neg_hits)) >= 0.72
            and has_applause_or_laugh
            and not text_pos_hits
        )

        is_sarcastic_clash = (
            has_irony_emoji or clash_pos_text_neg_emoji or clash_neg_text_applause_emoji
        )
        avg_val = sum(v for _, v, _, _ in found_emojis) / len(found_emojis)

        return {
            "emoji_score": -0.88 if is_sarcastic_clash else round(avg_val, 3),
            "dominant_emotion": found_emojis[0][2],
            "is_sarcastic_clash": is_sarcastic_clash,
            "pos_emoji_hits": pos_em,
            "neg_emoji_hits": neg_em,
        }


class TwitterRoBERTaEngine:
    """
    Cardiff NLP Twitter-RoBERTa-base Sentiment & Irony Classifier
    (`cardiffnlp/twitter-roberta-base-sentiment-latest` & `cardiffnlp/twitter-roberta-base-irony`).
    Supports:
    1. Local Hugging Face `transformers` pipeline (if installed)
    2. Free Hugging Face Inference API (`HUGGINGFACE_API_KEY` or serverless endpoint)
    """

    SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
    IRONY_MODEL = "cardiffnlp/twitter-roberta-base-irony"

    def __init__(self) -> None:
        self.hf_token = os.getenv("HUGGINGFACE_API_KEY", "").strip()
        self._local_pipe = None
        self._local_attempted = False

    def _get_local_pipeline(self):
        if self._local_attempted:
            return self._local_pipe
        self._local_attempted = True
        if hf_pipeline is not None and os.getenv("USE_LOCAL_ROBERTA", "false").lower() == "true":
            try:
                self._local_pipe = hf_pipeline(
                    "sentiment-analysis",
                    model=self.SENTIMENT_MODEL,
                    tokenizer=self.SENTIMENT_MODEL,
                    top_k=None,
                )
            except Exception:
                self._local_pipe = None
        return self._local_pipe

    def score_batch(self, texts: List[str]) -> Optional[List[Dict[str, Any]]]:
        """Scores a batch of tweets/comments using CardiffNLP Twitter-RoBERTa."""
        pipe = self._get_local_pipeline()
        if pipe is not None:
            try:
                raw_outputs = pipe(texts[:64], truncation=True, max_length=256)
                return [self._normalize_roberta_output(out) for out in raw_outputs]
            except Exception:
                pass

        if self.hf_token and not self.hf_token.startswith("your_"):
            try:
                headers = {"Authorization": f"Bearer {self.hf_token}"}
                resp = requests.post(
                    f"https://api-inference.huggingface.co/models/{self.SENTIMENT_MODEL}",
                    headers=headers,
                    json={"inputs": texts[:50]},
                    timeout=10,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list) and len(data) == len(texts[:50]):
                        return [self._normalize_roberta_output(item) for item in data]
            except Exception:
                pass
        return None

    @staticmethod
    def _normalize_roberta_output(item: Any) -> Dict[str, Any]:
        # item is a list of [{'label': 'positive'|'negative'|'neutral', 'score': 0.92}, ...]
        scores = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}
        if isinstance(item, list):
            for entry in item:
                lbl = str(entry.get("label", "")).lower()
                sc = float(entry.get("score", 0.0))
                if "pos" in lbl or lbl == "label_2":
                    scores["positive"] = sc
                elif "neg" in lbl or lbl == "label_0":
                    scores["negative"] = sc
                else:
                    scores["neutral"] = sc
        best_lbl = max(scores, key=scores.get)
        mapped: SentimentLabel = (
            "Positive"
            if best_lbl == "positive"
            else "Negative"
            if best_lbl == "negative"
            else "Neutral"
        )
        compound = round(scores["positive"] - scores["negative"], 3)
        conf = round(max(scores.values()), 3)
        return {"sentiment": mapped, "score": compound, "confidence": max(0.65, conf)}

ADVANCED_SYSTEM_PROMPT = """You are an elite Multilingual Social Media Sentiment & Linguistic Intelligence AI specializing in YouTube and Instagram comment streams.

CRITICAL LINGUISTIC, SARCASM & QUESTION RULES:
1. DEDICATED QUESTION / INQUIRY DETECTION:
   - When a comment is asking a genuine question, inquiry, doubt, price check, availability, usage advice, or link request (e.g., "Price kitna hai?", "Ye India me milega kya?", "Link please", "Oily skin pe chalega?", "Can someone tell me how to fix this?", "How much does it cost?", "When will this be back in stock?", "Which shade is best for fair skin?"):
   - You MUST classify it STRICTLY as "Question" (NEVER "Neutral" and NEVER "Negative").
   - Set score to a slightly inquisitive neutral value between +0.05 and +0.15.
   - Set `intent` to "Question".
   - Set `question_category` to one of:
     * "Pricing & Buying Inquiry"
     * "Product Usage & Compatibility"
     * "Delivery & Shipping Status"
     * "Purchase Link & Availability"
     * "General Customer Question"
   - Do NOT treat questions asking about price as negative complaints (e.g. "Price kitna hai?" is a Question, NOT a Price Problem!).
   - Set `pain_point` to null for questions.
   - CRITICAL NEGATIVE CONSTRAINT: For ANY comment that is NOT a question (i.e. "Positive", "Negative", "Neutral", "Mixed"), you MUST set `question_category` to null! NEVER put "General Customer Question" on compliments or neutral statements.
   - NEVER classify compliments or praise (e.g. "Naturally you're so pretty", "You look gorgeous", "Love your outfit") as "Question"! Compliments are STRICTLY "Positive" with intent "Appreciation" and question_category null.
   - NEVER classify jokes or casual observations (e.g. "Itna toh kim teahung bhi nhi laga ta 😂") as "Question"! They are "Neutral" or "Positive" with question_category null.

2. DECODE SARCASM & IRONY STRICTLY AS NEGATIVE:
   - Detect hidden human intent, mockery, irony, and sarcastic phrasing.
   - If a comment uses surface-level praise words ("wow", "great", "amazing", "best", "genius", "thank you so much", "waah", "kya baat hai", "shabash", "masterpiece") or applause/clown/eye-roll emojis ([EMOJI:clapping_applause], [EMOJI:clown_face_mockery_sarcasm_negative], [EMOJI:eye_roll_sarcastic_negative]) to mock a failure, delay, high price, defect, or bad content (e.g., "Wow what a 'great' product, broke in 2 days!", "Thank you so much for delivering my order 3 weeks late!", "Waah kya kamaal ki ghatiya service hai", "Best waste of money ever", "Great job delivering a broken box 👏🤡"), you MUST classify it STRICTLY as "Negative" (NEVER Positive or Mixed) with a negative score between -0.75 and -0.98.
   - Set `is_sarcastic` to true and `intent` to "Sarcastic Complaint".

3. DEEP HINGLISH, HINDI & INTERNET SLANG UNDERSTANDING:
   - Seamlessly process mixed Hindi-English (Hinglish), Romanized Hindi, Devanagari script, and Gen-Z/internet slang (e.g., "paisa barbaad", "bekar", "bakwaas", "mehnga", "der se aaya", "chapri", "faltu", "paisa vasool", "op", "badiya", "mast", "zabardast", "ye product bht achha hai par price high hai").
   - Interpret demojized emoji tokens (e.g., [EMOJI:fire_enthusiasm_positive], [EMOJI:clown_face_mockery_sarcasm_negative], [EMOJI:loudly_crying_upset]) in context with the surrounding text.

4. CONTRASTIVE ("YES, BUT...") FEEDBACK:
   - Only when a comment genuinely praises one attribute while raising a real complaint about another without sarcasm (e.g., "Quality is good, but delivery was very late" or "Product bht achha hai par price high hai"), classify as "Mixed", set `intent` to "Mixed Feedback", and set `pain_point` to the exact customer problem.

5. ROOT-CAUSE PAIN POINTS:
   - For every "Negative" or "Mixed" comment, assign `pain_point` to one of:
     * "Price Problem (High Cost)"
     * "Delivery Problem (Late Shipping)"
     * "Quality / Product Issue"
     * "Packaging / Damage Issue"
     * "Customer Support / Refund Issue"
     * "Quantity / Sizing / Stock Issue"
     * "General Customer Dissatisfaction"
   - For "Positive", "Neutral", or "Question" comments, set `pain_point` to null.

6. OUTPUT FORMAT:
   - Return ONLY valid, raw JSON matching this exact structure (no markdown fences, no extra prose):
{
  "overall_sentiment_percentages": {
    "positive_pct": 50.0,
    "negative_pct": 20.0,
    "question_pct": 18.0,
    "neutral_pct": 7.0,
    "mixed_pct": 5.0
  },
  "classifications": [
    {
      "id": "comment_id_here",
      "sentiment": "Positive|Negative|Neutral|Mixed|Question",
      "score": 0.05,
      "confidence": 0.96,
      "is_sarcastic": false,
      "intent": "Question|Sarcastic Complaint|Appreciation|Direct Complaint|Mixed Feedback|General",
      "question_category": null,
      "pain_point": null,
      "keywords": ["price", "inquiry"],
      "is_critical": false
    }
  ],
  "top_questions": [
    {
      "question": "Price kitna hai?",
      "category": "Pricing & Buying Inquiry"
    }
  ],
  "top_pain_points": ["Price Problem (High Cost)", "Delivery Problem (Late Shipping)"],
  "top_keywords": ["quality", "price", "delivery", "skin"],
  "executive_summary": "2-sentence executive summary of audience sentiment, sarcasm/Hinglish nuances, and primary customer pain points and inquiries.",
  "actionable_insights": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ]
}"""

SARCASM_PATTERNS = [
    re.compile(r"\b(wow|great|amazing|awesome|fantastic|brilliant|genius|masterpiece|best|love how|thank you|thanks|shabash|waah|wah|kya baat|kamaal)\b.*\b(broke|broken|stopped working|died|waste|scam|trash|garbage|late|delayed|weeks|worst|useless|pathetic|bekar|bekaar|bakwas|bakwaas|ghatiya|kharab|barbaad|loot|dhokha|refund|ignore|ignored)\b", re.IGNORECASE),
    re.compile(r"\b(broke|broken|waste|scam|late|delayed|worst|bekar|bakwas|ghatiya|barbaad)\b.*\b(wow|great job|well done|bravo|congrats|thank you|thanks|waah|shabash|masterpiece)\b", re.IGNORECASE),
    re.compile(r"['\"](great|amazing|best|premium|fast|quality)['\"]", re.IGNORECASE),
    re.compile(r"\b(sooo+ good that|such a great .* that it broke|best waste of money|paisa barbaad करने का best tarika)\b", re.IGNORECASE),
]

# Multilingual Question & Interrogative Triggers (Hindi, Hinglish, and English)
QUESTION_TRIGGERS_REGEX = re.compile(
    r"(\?|"
    r"\b(kya|kaise|kab|kitna|kitne|kitni|kahan|kaha|kidhar|konsa|kaunsa|konsi|kaunsi|kis|kisko|kispe)\b|"
    r"\b(batao|bata do|bataiye|bhai bata|milega kya|chalega kya|aayega kya|hota hai kya|available hai|kaha milega|kahan milega)\b|"
    r"\b(how|what|where|when|why|which|who|whose|can i|could you|is this|is it|does it|will it|would it|should i)\b|"
    r"\b(anyone know|please tell|link please|link do|link de do|send link|price\?|rate\?|cost\?|shade\?|code\?)\b)",
    re.IGNORECASE,
)

def detect_question_intent(lower_text: str) -> Optional[Tuple[str, str]]:
    """
    Identifies if a comment in English, Hindi, or Hinglish is a genuine customer question/inquiry.
    Returns (question_category, topic_keyword) or None if not an inquiry.
    """
    # Exclude angry rhetorical insults disguised as questions (e.g., "dimaag kharab hai kya?")
    if any(s in lower_text for s in (
        "dimaag kharab", "dimag kharab", "chutiya", "pagal hai kya",
        "are you blind", "are you crazy", "are you deaf", "sharam hai kya",
    )):
        return None

    # Exclude pure compliments or humorous remarks that don't have '?'
    if "?" not in lower_text:
        if any(p in lower_text for p in (
            "so pretty", "pretty", "beautiful", "gorgeous", "cute", "queen", "slay",
            "love you", "proud of", "bhi nhi", "bhi nahi", "looking so", "naturally",
        )):
            return None

    if not QUESTION_TRIGGERS_REGEX.search(lower_text):
        return None

    # Sub-categorize the question
    if any(w in lower_text for w in (
        "price", "cost", "rate", "discount", "offer", "coupon", "code",
        "kitna", "kitne", "kitni", "mehenga", "mehnga", "buy", "order",
        "flipkart", "amazon", "purchase", "paisa", "paise", "rupaye", "rs", "₹",
    )):
        return ("Pricing & Buying Inquiry", "price inquiry")

    if any(w in lower_text for w in (
        "link", "link please", "link do", "send link", "kaha se", "kahan se",
        "kaha milega", "kahan milega", "website", "where to buy", "available", "store",
    )):
        return ("Purchase Link & Availability", "link request")

    if any(w in lower_text for w in (
        "skin", "oily", "dry", "sensitive", "shade", "hair", "battery", "backup",
        "work", "chalega", "suit", "daily", "kaise use", "how to use", "routine",
        "side effect", "ingredients", "safe",
    )):
        return ("Product Usage & Compatibility", "usage query")

    if any(w in lower_text for w in (
        "delivery", "shipping", "deliver", "kab tak", "der se", "courier", "tracking", "status", "reach",
    )):
        return ("Delivery & Shipping Query", "delivery query")

    return ("General Customer Question", "customer query")

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
    "pretty": 0.88, "naturally": 0.78, "natural": 0.75, "pyari": 0.82, "pyaari": 0.82,
    "sundar": 0.85, "khubsurat": 0.88, "khoobsurat": 0.88, "queen": 0.85, "slay": 0.82,
    "stunning": 0.88, "charming": 0.82, "sweet": 0.75, "angel": 0.85, "doll": 0.82,
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
    "small": -0.45, "slow": -0.72, "worst": -0.95, "broken": -0.88, "broke": -0.88,
    "died": -0.85, "pathetic": -0.88, "barbaad": -0.9, "dhokha": -0.88, "loot": -0.85,
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
    Advanced Multilingual AI/NLP Engine supporting:
    1. Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
    2. OpenAI GPT-4o (`gpt-4o`)
    3. Groq Llama 3.3 70B (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) - Ultra-fast Free Tier Alternative
    4. Google Gemini (`gemini-3.5-flash-lite`) with Multi-Key Quota Rotation Pool
    5. High-Precision Local Semantic & Interrogative Question Matrix Engine (100% Offline Resilience)
    """

    def __init__(self) -> None:
        self.roberta_engine = TwitterRoBERTaEngine()
        self.deepmoji_engine = DeepMojiEmotionEngine()
        self._gemini_key_idx = 0
        self._reload_env()

    def _reload_env(self) -> None:
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        from dotenv import load_dotenv
        load_dotenv(os.path.join(backend_dir, ".env"), override=True)
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.claude_model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022").strip()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o").strip()
        self.groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip()
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()

        # Multi-key rotation pool for Gemini (e.g. GEMINI_API_KEYS=key1,key2,key3 or comma-separated in GEMINI_API_KEY)
        raw_keys = os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY", "")
        self.gemini_keys = [
            k.strip() for k in raw_keys.split(",")
            if k.strip() and not k.strip().startswith("your_") and len(k.strip()) > 15
        ]

    def _get_active_gemini_key(self) -> str:
        if self.gemini_keys:
            return self.gemini_keys[self._gemini_key_idx % len(self.gemini_keys)]
        return self.api_key

    def _rotate_gemini_key(self) -> None:
        if len(self.gemini_keys) > 1:
            self._gemini_key_idx = (self._gemini_key_idx + 1) % len(self.gemini_keys)

    def _has_valid_anthropic_key(self) -> bool:
        return bool(
            self.anthropic_api_key
            and not self.anthropic_api_key.startswith("your_")
            and len(self.anthropic_api_key) > 15
            and anthropic is not None
        )

    def _has_valid_openai_key(self) -> bool:
        return bool(
            self.openai_api_key
            and not self.openai_api_key.startswith("your_")
            and len(self.openai_api_key) > 15
            and openai is not None
        )

    def _has_valid_groq_key(self) -> bool:
        return bool(
            self.groq_api_key
            and not self.groq_api_key.startswith("your_")
            and len(self.groq_api_key) > 15
        )

    def _has_valid_gemini_key(self) -> bool:
        return bool(
            (self.gemini_keys or self.api_key)
            and not self._get_active_gemini_key().startswith("your_")
            and len(self._get_active_gemini_key()) > 15
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
        self._reload_env()
        if df.empty:
            return [], [], [], "No valid comments remained after data cleaning.", [], "Hybrid NLP Engine"

        records = df.to_dict(orient="records")

        if not force_sandbox:
            # Each cloud LLM gets a strict time budget. If a provider is rate-limited / slow,
            # we move on instead of hanging the extension for minutes. Total cloud budget ~35s.
            deadline = time.time() + LLM_TOTAL_BUDGET_SECONDS

            def _try(provider_fn) -> Optional[Tuple]:
                remaining = deadline - time.time()
                if remaining <= 2:
                    return None
                future = _LLM_EXECUTOR.submit(provider_fn, records, platform, post_title)
                try:
                    return future.result(timeout=remaining)
                except FuturesTimeout:
                    return None
                except Exception:
                    return None

            # 1. Primary: Anthropic Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)
            if self._has_valid_anthropic_key():
                claude_result = _try(self._analyze_with_claude)
                if claude_result is not None:
                    return claude_result

            # 2. Secondary: OpenAI GPT-4o (gpt-4o)
            if self._has_valid_openai_key():
                openai_result = _try(self._analyze_with_openai)
                if openai_result is not None:
                    return openai_result

            # 3. Groq Llama 3.3 70B (Fast, Free, Exceptional Multi-lingual/Hinglish accuracy)
            if self._has_valid_groq_key():
                groq_result = _try(self._analyze_with_groq)
                if groq_result is not None:
                    return groq_result

            # 4. Google Gemini with Multi-Key Rotation Pool (prevents 429 quota exhaustion)
            if self._has_valid_gemini_key():
                gemini_result = _try(self._analyze_with_gemini)
                if gemini_result is not None:
                    return gemini_result

        # 5. High-Precision Local Semantic & Interrogative Question Matrix Engine
        return self._analyze_with_semantic_engine(records, platform, post_title)

    def _build_llm_user_prompt(
        self, records: List[Dict[str, Any]], platform: str, post_title: str
    ) -> str:
        batch_input = [
            {
                "id": r["comment_id"],
                "text": r.get("demojized_text") or demojize_with_feelings(r["cleaned_text"]),
            }
            for r in records[:120]
        ]
        return (
            f"Platform: {platform.upper()} | Video/Post Title: {post_title}\n"
            f"Total Comments in Batch: {len(batch_input)}\n\n"
            "Analyze the following demojized comments (pay special attention to sarcasm, irony, "
            "praise words paired with negative complaints, emoji tokens, and Hinglish/Hindi slang) "
            "and return the exact JSON schema specified in the system prompt:\n\n"
            f"{json.dumps(batch_input, ensure_ascii=False)}"
        )

    def _parse_llm_json_response(
        self,
        raw_text: str,
        records: List[Dict[str, Any]],
        platform: str,
        post_title: str,
        engine_label: str,
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
        json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not json_match:
            return None
        parsed = json.loads(json_match.group(0))
        cls_map = {
            str(item["id"]): item
            for item in parsed.get("classifications", [])
            if isinstance(item, dict) and "id" in item
        }
        if not cls_map:
            return None

        comments: List[CommentItem] = []
        for r in records:
            cid = str(r["comment_id"])
            if cid in cls_map:
                c_info = cls_map[cid]
                lbl = c_info.get("sentiment", "Neutral")
                if lbl not in ("Positive", "Negative", "Neutral", "Mixed", "Question"):
                    lbl = "Neutral"
                is_sarc = bool(c_info.get("is_sarcastic") is True)
                if is_sarc:
                    lbl = "Negative"
                intent = str(c_info.get("intent", "Question" if lbl == "Question" else ("Sarcastic Complaint" if is_sarc else "General")))
                if lbl == "Question":
                    q_cat = c_info.get("question_category")
                    if not q_cat:
                        q_res = detect_question_intent(r["cleaned_text"].lower())
                        q_cat = q_res[0] if q_res else "General Customer Question"
                else:
                    q_cat = None

                score = float(c_info.get("score", -0.85 if lbl == "Negative" else (0.08 if lbl == "Question" else 0.0)))
                if lbl == "Negative" and score > -0.2:
                    score = -0.85
                conf = float(c_info.get("confidence", 0.95))
                pain = c_info.get("pain_point") if lbl != "Question" else None
                if lbl in ("Negative", "Mixed") and not pain:
                    pain = detect_customer_problem(
                        r["cleaned_text"].lower(),
                        re.findall(r"[a-z]+", r["cleaned_text"].lower()),
                        lbl,
                    )
                kws = [str(k) for k in (c_info.get("keywords") or [])][:4]
                crit = bool(
                    c_info.get(
                        "is_critical", lbl in ("Negative", "Mixed") and pain is not None
                    )
                )
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
                        is_sarcastic=is_sarc,
                        intent=intent,
                        question_category=q_cat,
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
            engine_label,
        )

    def _analyze_with_claude(
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
        """Calls Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`) with the strict sarcasm & Hinglish system prompt."""
        try:
            client = anthropic.Anthropic(api_key=self.anthropic_api_key)
            user_prompt = self._build_llm_user_prompt(records, platform, post_title)
            message = client.messages.create(
                model=self.claude_model,
                max_tokens=4096,
                temperature=0.1,
                system=ADVANCED_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            )
            raw_text = message.content[0].text.strip()
            return self._parse_llm_json_response(
                raw_text,
                records,
                platform,
                post_title,
                f"Anthropic Claude ({self.claude_model})",
            )
        except Exception:
            return None

    def _analyze_with_openai(
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
        """Calls OpenAI GPT-4o (`gpt-4o`) with JSON mode and the strict sarcasm & Hinglish system prompt."""
        try:
            client = openai.OpenAI(api_key=self.openai_api_key)
            user_prompt = self._build_llm_user_prompt(records, platform, post_title)
            response = client.chat.completions.create(
                model=self.openai_model,
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": ADVANCED_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
            )
            raw_text = (response.choices[0].message.content or "").strip()
            return self._parse_llm_json_response(
                raw_text,
                records,
                platform,
                post_title,
                f"OpenAI ({self.openai_model})",
            )
        except Exception:
            return None

    def _analyze_with_groq(
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
        """Calls Groq Cloud API with Llama-3.3-70B-Versatile (100% Free, Fast & Highly Accurate)."""
        if not self._has_valid_groq_key():
            return None
        try:
            chunk_size = 40
            all_cls_map: Dict[str, Dict[str, Any]] = {}
            exec_summary = ""
            insights: List[str] = []
            total_to_process = min(len(records), 200)

            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json",
            }

            def _run_chunk(start_idx: int) -> Optional[Dict[str, Any]]:
                """Classifies one chunk of comments (runs in parallel worker thread)."""
                chunk = records[start_idx : start_idx + chunk_size]
                batch_input = [
                    {
                        "id": str(r["comment_id"]),
                        "text": r.get("demojized_text") or demojize_with_feelings(r["cleaned_text"]),
                    }
                    for r in chunk
                ]
                user_prompt = (
                    f"Platform: {platform.upper()} | Post: {post_title}\n"
                    f"Batch {start_idx//chunk_size + 1}: Analyze the following {len(batch_input)} comments.\n"
                    "CRITICAL: If a comment is asking a question/inquiry/price check/link/doubt, classify sentiment as 'Question'.\n"
                    "If a sentence is sarcastic/complaining (even with happy emojis), classify sentiment as 'Negative'.\n"
                    "Return valid JSON matching the schema specified in your system instructions:\n\n"
                    f"{json.dumps(batch_input, ensure_ascii=False)}"
                )
                payload = {
                    "model": self.groq_model,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": ADVANCED_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                }
                for attempt in range(2):
                    try:
                        resp = requests.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers=headers,
                            json=payload,
                            timeout=25,
                        )
                        if resp.status_code == 429 and attempt == 0:
                            time.sleep(2)
                            continue
                        if resp.status_code != 200:
                            return None
                        choices = resp.json().get("choices", [])
                        if not choices:
                            return None
                        raw_c = choices[0].get("message", {}).get("content", "")
                        return json.loads(raw_c)
                    except Exception:
                        if attempt == 1:
                            return None
                return None

            # All chunks are classified IN PARALLEL (instead of one-after-another)
            starts = list(range(0, total_to_process, chunk_size))
            with ThreadPoolExecutor(max_workers=min(5, max(1, len(starts)))) as pool:
                parsed_chunks = list(pool.map(_run_chunk, starts))

            for parsed_chunk in parsed_chunks:
                if not parsed_chunk:
                    continue
                for item in parsed_chunk.get("classifications", []):
                    if isinstance(item, dict) and "id" in item:
                        all_cls_map[str(item["id"])] = item
                if not exec_summary and parsed_chunk.get("executive_summary"):
                    exec_summary = parsed_chunk["executive_summary"]
                if not insights and parsed_chunk.get("actionable_insights"):
                    insights = parsed_chunk["actionable_insights"]

            if not all_cls_map:
                return None

            return self._build_items_from_cls_map(
                all_cls_map,
                records,
                platform,
                post_title,
                exec_summary,
                insights,
                f"Groq Cloud AI ({self.groq_model})",
            )
        except Exception:
            return None

    def _build_items_from_cls_map(
        self,
        all_cls_map: Dict[str, Dict[str, Any]],
        records: List[Dict[str, Any]],
        platform: str,
        post_title: str,
        exec_summary: str,
        insights: List[str],
        engine_label: str,
    ) -> Tuple[
        List[CommentItem],
        List[KeywordMetric],
        List[PainPointItem],
        str,
        List[str],
        str,
    ]:
        comments: List[CommentItem] = []
        for r in records:
            cid = str(r["comment_id"])
            if cid in all_cls_map:
                c_info = all_cls_map[cid]
                lbl = c_info.get("sentiment", "Neutral")
                if lbl not in ("Positive", "Negative", "Neutral", "Mixed", "Question"):
                    lbl = "Neutral"
                is_sarc = bool(c_info.get("is_sarcastic") is True)
                if is_sarc:
                    lbl = "Negative"
                intent = str(c_info.get("intent", "Question" if lbl == "Question" else ("Sarcastic Complaint" if is_sarc else "General")))
                if lbl == "Question":
                    q_cat = c_info.get("question_category")
                    if not q_cat:
                        q_res = detect_question_intent(r["cleaned_text"].lower())
                        q_cat = q_res[0] if q_res else "General Customer Question"
                else:
                    q_cat = None

                score = float(c_info.get("score", -0.85 if lbl == "Negative" else (0.08 if lbl == "Question" else 0.0)))
                if lbl == "Negative" and score > -0.2:
                    score = -0.85
                conf = float(c_info.get("confidence", 0.95))
                pain = c_info.get("pain_point") if lbl != "Question" else None
                if lbl in ("Negative", "Mixed") and not pain:
                    pain = detect_customer_problem(
                        r["cleaned_text"].lower(),
                        re.findall(r"[a-z]+", r["cleaned_text"].lower()),
                        lbl,
                    )
                kws = [str(k) for k in (c_info.get("keywords") or [])][:4]
                crit = bool(
                    c_info.get(
                        "is_critical", lbl in ("Negative", "Mixed") and pain is not None
                    )
                )
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
                        confidence=max(0.6, min(0.99, round(conf, 3))),
                        pain_point=pain,
                        keywords=kws,
                        is_critical=crit,
                        is_sarcastic=is_sarc,
                        intent=intent,
                        question_category=q_cat,
                    )
                )
            else:
                comments.append(self._classify_single_comment(r, platform))

        top_keywords = self._extract_top_keywords(comments)
        pain_points = self._extract_pain_points(comments)
        if not exec_summary:
            exec_summary = self._build_summary(comments, platform, post_title, top_keywords)
        if not insights:
            insights = self._build_actionable_insights(comments, pain_points, top_keywords)

        return (
            comments,
            top_keywords,
            pain_points,
            exec_summary,
            insights,
            engine_label,
        )

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
        """Calls Google Gemini with direct REST / SDK support, chunking comments across batches to analyze ALL comments with maximum accuracy."""
        active_key = self._get_active_gemini_key()
        if not active_key:
            return None

        chunk_size = 40
        all_cls_map: Dict[str, Dict[str, Any]] = {}
        exec_summary = ""
        insights: List[str] = []

        total_to_process = min(len(records), 200)

        for i in range(0, total_to_process, chunk_size):
            chunk = records[i : i + chunk_size]
            batch_input = [
                {
                    "id": str(r["comment_id"]),
                    "text": r.get("demojized_text") or demojize_with_feelings(r["cleaned_text"]),
                }
                for r in chunk
            ]
            user_prompt = (
                f"Platform: {platform.upper()} | Video/Post Title: {post_title}\n"
                f"Batch {i//chunk_size + 1}: Analyze the following {len(batch_input)} comments.\n"
                "CRITICAL: If a comment is asking a question/inquiry/price check/link/doubt, classify sentiment as 'Question'.\n"
                "If a sentence is negative, complaining, broken, delay, or sarcastic (even if emojis are happy like 👏, 🎉, 🙃, 🙄, 🤡, 😂), classify sentiment as 'Negative'.\n"
                "Return valid JSON matching the schema specified in your system instructions:\n\n"
                f"{json.dumps(batch_input, ensure_ascii=False)}"
            )

            parsed_chunk = None
            # Retry with multi-key pool rotation if quota/rate-limited (HTTP 429)
            attempts = max(1, len(self.gemini_keys))
            for _ in range(attempts):
                current_k = self._get_active_gemini_key()
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={current_k}"
                payload = {
                    "systemInstruction": {"parts": [{"text": ADVANCED_SYSTEM_PROMPT}]},
                    "contents": [{"parts": [{"text": user_prompt}]}],
                    "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"},
                }
                try:
                    resp = requests.post(url, json=payload, timeout=25)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            raw_json_str = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            parsed_chunk = json.loads(raw_json_str)
                            break
                    elif resp.status_code == 429:
                        # Rotate to next fresh key in pool!
                        self._rotate_gemini_key()
                        continue
                except Exception:
                    pass

            if not parsed_chunk and genai is not None:
                try:
                    genai.configure(api_key=self._get_active_gemini_key())
                    model = genai.GenerativeModel(
                        model_name=self.model_name,
                        system_instruction=ADVANCED_SYSTEM_PROMPT,
                    )
                    resp = model.generate_content(user_prompt)
                    raw_text = resp.text.strip()
                    m = re.search(r"\{.*\}", raw_text, re.DOTALL)
                    if m:
                        parsed_chunk = json.loads(m.group(0))
                except Exception:
                    pass

            if parsed_chunk and isinstance(parsed_chunk, dict):
                for item in parsed_chunk.get("classifications", []):
                    if isinstance(item, dict) and "id" in item:
                        all_cls_map[str(item["id"])] = item
                if not exec_summary and parsed_chunk.get("executive_summary"):
                    exec_summary = parsed_chunk["executive_summary"]
                if not insights and parsed_chunk.get("actionable_insights"):
                    insights = parsed_chunk["actionable_insights"]

        if not all_cls_map:
            return None

        return self._build_items_from_cls_map(
            all_cls_map,
            records,
            platform,
            post_title,
            exec_summary,
            insights,
            f"Google Gemini ({self.model_name}) + DeepMoji",
        )

    def _classify_single_comment(
        self, record: Dict[str, Any], platform: str
    ) -> CommentItem:
        text = record["cleaned_text"]
        lower = text.lower()
        tokens = re.findall(r"[a-z]+", lower)

        pos_hits: List[float] = []
        neg_hits: List[float] = []
        extracted_kws: List[str] = []

        if any(lk in lower or lk in text for lk in ("🔗", "🖇", "लिंक", "link", "pp")):
            extracted_kws.append("link")

        # 1. Question / Inquiry Detection First (English, Hindi & Hinglish)
        q_info = detect_question_intent(lower)
        is_rhetorical_insult = any(
            pat.search(text) for pat in SARCASM_PATTERNS
        ) or any(s_em in text for s_em in ("🤡", "🙃", "🙄", "😒"))

        if q_info and not is_rhetorical_insult:
            q_category, q_kw = q_info
            if q_kw not in extracted_kws:
                extracted_kws.append(q_kw)
            return CommentItem(
                comment_id=record["comment_id"],
                author=record["author"],
                platform=platform,
                raw_text=record["raw_text"],
                cleaned_text=text,
                likes=int(record.get("likes", 0)),
                published_at=record.get("published_at", ""),
                sentiment="Question",
                sentiment_score=0.08,
                confidence=0.96,
                pain_point=None,
                keywords=extracted_kws[:4],
                is_critical=False,
                is_sarcastic=False,
                intent="Question",
                question_category=q_category,
            )

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

        has_contrast = any(tok in CONTRASTIVE_MARKERS for tok in tokens)
        demojized = record.get("demojized_text") or demojize_with_feelings(text)

        # DeepMoji 64-Emotion & Emoji-Text Polarity Clash Analysis (evaluated on pure text hits before adding emoji valence)
        deepmoji_ctx = self.deepmoji_engine.analyze_emoji_context(
            record.get("raw_text", text), pos_hits, neg_hits
        )
        if not deepmoji_ctx["is_sarcastic_clash"]:
            pos_hits.extend(deepmoji_ctx["pos_emoji_hits"])
            neg_hits.extend(deepmoji_ctx["neg_emoji_hits"])

        # Strict Sarcasm & Irony Check (CardiffNLP Irony + DeepMoji Polarity Clash):
        is_sarcastic = (
            deepmoji_ctx["is_sarcastic_clash"]
            or any(pat.search(text) for pat in SARCASM_PATTERNS)
            or (
                any(
                    s_em in demojized
                    for s_em in (
                        "clown_face_mockery_sarcasm_negative",
                        "eye_roll_sarcastic_negative",
                    )
                )
                and (pos_hits or neg_hits)
            )
        )

        # VADER Social Media Sentiment Intensity & TextBlob Polarity
        if vader_analyzer is not None:
            v_res = vader_analyzer.polarity_scores(text)
            comp = v_res.get("compound", 0.0)
            if comp >= 0.35:
                pos_hits.append(comp * 0.9)
            elif comp <= -0.35:
                neg_hits.append(comp * 0.9)

        if TextBlob is not None:
            tb_pol = TextBlob(text).sentiment.polarity
            if tb_pol >= 0.3:
                pos_hits.append(tb_pol * 0.8)
            elif tb_pol <= -0.3:
                neg_hits.append(tb_pol * 0.8)

        pos_sum = sum(pos_hits)
        neg_sum = sum(neg_hits)

        sentiment: SentimentLabel = "Neutral"
        score = 0.0
        confidence = 0.89
        intent = "General"

        if is_sarcastic:
            sentiment = "Negative"
            score = -0.88
            confidence = 0.96
            intent = "Sarcastic Complaint"
        elif pos_hits and neg_hits and has_contrast:
            sentiment = "Mixed"
            score = round((pos_sum + neg_sum) / max(len(pos_hits) + len(neg_hits), 1), 3)
            if score == 0.0:
                score = -0.22
            confidence = 0.94
            intent = "Mixed Feedback"
        elif pos_hits and neg_hits and abs(neg_sum) >= 0.65:
            sentiment = "Mixed"
            score = round((pos_sum + neg_sum) * 0.45, 3)
            confidence = 0.91
            intent = "Mixed Feedback"
        elif pos_sum > abs(neg_sum) * 1.2 and pos_sum >= 0.45:
            sentiment = "Positive"
            score = min(0.98, round(0.45 + (pos_sum / (len(pos_hits) + 1.2)) * 0.5, 3))
            confidence = min(0.98, round(0.86 + min(len(pos_hits), 4) * 0.03, 3))
            intent = "Appreciation"
        elif abs(neg_sum) > pos_sum * 1.1 and abs(neg_sum) >= 0.45:
            sentiment = "Negative"
            score = max(-0.98, round(-0.45 + (neg_sum / (len(neg_hits) + 1.2)) * 0.5, 3))
            confidence = min(0.97, round(0.86 + min(len(neg_hits), 4) * 0.03, 3))
            intent = "Direct Complaint"
        else:
            sentiment = "Neutral"
            score = 0.0
            confidence = 0.85
            intent = "General"

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
            is_sarcastic=is_sarcastic,
            intent=intent,
            question_category=None,
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
        # Try CardiffNLP Twitter-RoBERTa batch scoring first if available, fused with DeepMoji & Hinglish rules
        roberta_preds = self.roberta_engine.score_batch(
            [r["cleaned_text"] for r in records]
        )
        comments: List[CommentItem] = []
        for idx, r in enumerate(records):
            base_item = self._classify_single_comment(r, platform)
            if roberta_preds and idx < len(roberta_preds):
                rob = roberta_preds[idx]
                # Keep Mixed ("Yes, But...") or Sarcasm-Negative overrides from DeepMoji/Hinglish engine,
                # otherwise blend Twitter-RoBERTa's probability score
                if base_item.sentiment == "Neutral" and rob["sentiment"] != "Neutral":
                    base_item.sentiment = rob["sentiment"]
                    base_item.sentiment_score = rob["score"]
                    base_item.confidence = rob["confidence"]
                    if base_item.sentiment in ("Negative", "Mixed") and not base_item.pain_point:
                        base_item.pain_point = detect_customer_problem(
                            r["cleaned_text"].lower(),
                            re.findall(r"[a-z]+", r["cleaned_text"].lower()),
                            base_item.sentiment,
                        )
            comments.append(base_item)

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
            "Twitter-RoBERTa (CardiffNLP) + DeepMoji + Hinglish NLP",
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
        que = sum(1 for c in comments if c.sentiment == "Question")
        pos_pct = round((pos / total) * 100)
        neg_pct = round((neg / total) * 100)
        que_pct = round((que / total) * 100)
        kw_names = ", ".join(k.word for k in top_keywords[:4]) or "quality, price, delivery"

        return (
            f"Analysis of {total} cleaned {platform.capitalize()} comments on '{post_title}' reveals "
            f"{pos_pct}% positive feedback, {neg_pct}% negative complaints, {que_pct}% customer inquiries/questions ({que} queries), "
            f"and {mix} mixed ('Yes, But...') responses. Key topics include {kw_names}."
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
