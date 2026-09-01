"""
Intent classifier — two-stage pipeline (no HuggingFace required):

Stage 1 — Keyword rules  (pure Python regex, ~0ms, ~95% coverage)
    Fast deterministic rules for all common HRMS query patterns.
    Returns confidence 0.99 when matched.

Stage 2 — scikit-learn TF-IDF + LogisticRegression  (~5ms)
    Trained on data/intent_dataset.json.
    Replaces the HuggingFace zero-shot transformer entirely.
    Falls back to UNKNOWN if confidence < threshold.

To retrain:
    python train_intent.py
    (set SKLEARN_MODEL_PATH=models/intent_sklearn.pkl in .env)
"""

import logging
import re
from functools import lru_cache

from app.core.config import get_settings
from app.nlp.model_config import INTENT_LABELS, Intent
from app.schemas.chatbot import IntentResult

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Keyword rules
# ─────────────────────────────────────────────────────────────────────────────

_MY     = r"\b(my|i am|what am i|who am i|show me my|tell me my|give me my)\b"
_MY_EXT = r"\b(my|i am|am i|do i|did i|what am i|who am i|where am i|show me my|tell me my|give me my|i joined|i started)\b"

_KEYWORD_RULES: list[tuple[re.Pattern, str]] = [

    # ── MY_STATUS — before MY_LEAVE_BALANCE (prevents "employment" → "pl" match) ──
    (re.compile(_MY + r".{0,20}(employment status|current status)", re.I), Intent.MY_STATUS),
    (re.compile(r"\bam i\b.{0,20}\b(active|inactive|employed|working|terminated|still)\b", re.I), Intent.MY_STATUS),

    # ── MY_LEAVE_BALANCE ──────────────────────────────────────────────────────
    (re.compile(
        r"\b(my (leave|leaves|annual|sick|casual|pto|vacation|time off|days off|leave balance)|"
        r"(how many|how much).{0,20}(leave|leaves|days|vacation|sick|pto).{0,20}\b(i|me|my)\b|"
        r"\b(do i have|have i|i have).{0,30}(leave|leaves|days|vacation|sick))",
        re.I,
    ), Intent.MY_LEAVE_BALANCE),

    # ── MY field intents ──────────────────────────────────────────────────────
    (re.compile(_MY + r".{0,20}\b(phone|mobile|mobil|moble|cell|contact number|contact no|number|tel|whatsapp)\b", re.I), Intent.MY_PHONE),
    (re.compile(_MY + r".{0,20}(email|mail|e-mail)", re.I), Intent.MY_EMAIL),
    (re.compile(
        r"(?:" + _MY_EXT + r".{0,20}(department|dept|team|unit|division|sub.?unit)"
        r"|(?:department|dept|team|unit|division).{0,20}\bam i\b)",
        re.I,
    ), Intent.MY_DEPARTMENT),
    (re.compile(_MY + r".{0,20}(designation|job title|position|role|title|post)", re.I), Intent.MY_DESIGNATION),
    (re.compile(_MY + r".{0,20}(manager|supervisor|boss|reporting|reports to|report to)", re.I), Intent.MY_MANAGER),
    (re.compile(_MY_EXT + r".{0,20}(join|joining|start|started|hired|date of joining)", re.I), Intent.MY_JOINING_DATE),
    (re.compile(_MY + r".{0,20}(location|office|city|branch|where.{0,10}work|where.{0,10}based)", re.I), Intent.MY_LOCATION),
    (re.compile(r"\bwhere\b.{0,10}\b(do i|am i|i work|i sit|i based)\b", re.I), Intent.MY_LOCATION),

    # MY_PROFILE — broad catch-all (must come after specific MY intents)
    (re.compile(
        r"\b(my (profile|info|information|details|record|data)|show my|who am i|about me)\b",
        re.I,
    ), Intent.MY_PROFILE),

    # ── EMPLOYEE_LEAVE_BALANCE ────────────────────────────────────────────────
    (re.compile(
        r"\b(leave|leaves|annual|sick|casual|pl|al|cl|pto|vacation|days off|remaining leave|leave balance|leave remaining|days remaining).{0,40}"
        r"\b(have|left|remaining|balance|available|entitled|entitle)\b",
        re.I,
    ), Intent.EMPLOYEE_LEAVE_BALANCE),
    (re.compile(r"\b(how many|how much).{0,20}(leave|leaves|days|vacation|time off)", re.I), Intent.EMPLOYEE_LEAVE_BALANCE),
    (re.compile(
        r"\b(leave|leaves|sick leave|annual leave|casual leave|sick|vacation)\b.{0,30}"
        r"\b(details|detail|detailes|detials|info|information|summary|status|record|history)\b",
        re.I,
    ), Intent.EMPLOYEE_LEAVE_BALANCE),
    (re.compile(
        r"\b(details|detail|detailes|detials|info|information|summary|record|history)\b.{0,30}"
        r"\b(leave|leaves|sick|annual|casual|vacation)\b",
        re.I,
    ), Intent.EMPLOYEE_LEAVE_BALANCE),
    (re.compile(
        r"\b(give me|show me|get me|tell me|fetch)\b.{0,30}"
        r"\b(leave|leaves|sick|annual|casual|vacation|pto)\b",
        re.I,
    ), Intent.EMPLOYEE_LEAVE_BALANCE),

    # ── EMPLOYEE_EMAIL ────────────────────────────────────────────────────────
    (re.compile(r"\b(email|e-mail|mail address|contact email).{0,30}(of|for|address)\b", re.I), Intent.EMPLOYEE_EMAIL),
    (re.compile(r"\b(what is|get|find|show|give).{0,20}(email|e-mail)\b", re.I), Intent.EMPLOYEE_EMAIL),

    # ── EMPLOYEE_PHONE ────────────────────────────────────────────────────────
    (re.compile(r"\b(phone|mobile|mobil|moble|cel\b|cell|telephone|contact number|contact no|number|tel|whatsapp)\b", re.I), Intent.EMPLOYEE_PHONE),

    # ── EMPLOYEE_DEPARTMENT ───────────────────────────────────────────────────
    (re.compile(r"\b(department|dept|team|unit|sub.?unit|division|which team|which dept)\b", re.I), Intent.EMPLOYEE_DEPARTMENT),

    # ── EMPLOYEE_DESIGNATION ──────────────────────────────────────────────────
    (re.compile(r"\b(designation|job title|position|role|title|what (does|do).{0,10}(work|do))\b", re.I), Intent.EMPLOYEE_DESIGNATION),

    # ── EMPLOYEE_MANAGER ──────────────────────────────────────────────────────
    (re.compile(r"\b(manager|supervisor|boss|reporting manager|line manager|reports to|who (manages|supervises))\b", re.I), Intent.EMPLOYEE_MANAGER),

    # ── EMPLOYEE_JOINING_DATE ─────────────────────────────────────────────────
    (re.compile(r"\b(join|joining|start date|hired|date of joining|when did.{0,10}(join|start|hire))\b", re.I), Intent.EMPLOYEE_JOINING_DATE),

    # ── EMPLOYEE_STATUS ───────────────────────────────────────────────────────
    (re.compile(r"\b(status|active|inactive|employed|terminated|working|still (work|employ))\b", re.I), Intent.EMPLOYEE_STATUS),

    # ── EMPLOYEE_LOCATION ─────────────────────────────────────────────────────
    (re.compile(r"\b(location|office|where (does|do|is).{0,15}(work|based|located|sit)|city|branch|site)\b", re.I), Intent.EMPLOYEE_LOCATION),

    # ── EMPLOYEE_PROFILE — generic catch-all (must be last) ──────────────────
    (re.compile(
        r"\b(profile|info|information|details|about|tell me about|show me|find|lookup|look up|who is)\b",
        re.I,
    ), Intent.EMPLOYEE_PROFILE),
]


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — scikit-learn classifier
# ─────────────────────────────────────────────────────────────────────────────

class IntentClassifier:

    def __init__(self) -> None:
        self._model = None
        self._loaded = False

    def _load(self) -> None:
        if self._loaded:
            return
        settings = get_settings()
        model_path = getattr(settings, "sklearn_model_path", "")

        if model_path:
            try:
                import joblib  # type: ignore[import-untyped]
                self._model = joblib.load(model_path)
                logger.info("scikit-learn intent model loaded from %s", model_path)
            except Exception as exc:
                logger.warning("sklearn model load failed: %s — using keyword-only mode", exc)
        else:
            logger.info("No SKLEARN_MODEL_PATH set — keyword rules only")

        self._loaded = True

    # ── Public API ────────────────────────────────────────────────────────────

    def predict(self, text: str) -> IntentResult:
        # Stage 1: keyword rules — instant, no model
        keyword_result = self._keyword_match(text)
        if keyword_result:
            logger.debug("Keyword match: %r → %s", text, keyword_result)
            return IntentResult(intent=keyword_result, confidence=0.99)

        # Stage 2: scikit-learn
        self._load()
        settings = get_settings()

        if self._model is not None:
            try:
                intent  = self._model.predict([text])[0]
                conf    = float(self._model.predict_proba([text])[0].max())
                logger.debug("sklearn: %r → %s (%.2f)", text, intent, conf)

                if conf < settings.intent_confidence_threshold:
                    return IntentResult(intent=Intent.UNKNOWN, confidence=conf)
                return IntentResult(intent=intent, confidence=round(conf, 4))
            except Exception as exc:
                logger.exception("sklearn prediction failed: %s", exc)

        return IntentResult(intent=Intent.UNKNOWN, confidence=0.0)

    @staticmethod
    def _keyword_match(text: str) -> str | None:
        for pattern, intent in _KEYWORD_RULES:
            if pattern.search(text):
                return intent
        return None


@lru_cache(maxsize=1)
def get_intent_classifier() -> IntentClassifier:
    return IntentClassifier()
