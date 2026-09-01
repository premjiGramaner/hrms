"""
Entity extractor — spaCy-based person name extraction.

spaCy en_core_web_sm correctly extracts full multi-word names without
subword fragmentation (no "Sri" instead of "Srirama Chandramurthy Mullapudi").

Priority:
    1. Employee ID  (EMP + digits) — deterministic regex
    2. Email        — deterministic regex
    3. spaCy NER    — extracts PERSON entities as full spans
    4. Keyword-anchored regex — fallback if spaCy misses
    5. Any word sequence that survives stop-word filtering
"""

import logging
import re

from app.schemas.chatbot import EntityResult

logger = logging.getLogger(__name__)

# ── Static patterns ───────────────────────────────────────────────────────────

_EMP_ID_RE = re.compile(r"\bEMP\d+\b", re.IGNORECASE)
# Also match plain numeric employee IDs like "911099" (6+ digits, standalone)
_NUM_ID_RE = re.compile(r"\b(\d{5,})\b")
_EMAIL_RE  = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# Words that are never person names
_STOP: frozenset[str] = frozenset({
    # Question / grammar words
    "what", "who", "when", "where", "which", "show", "give", "tell",
    "find", "get", "is", "are", "the", "his", "her", "their", "my",
    "your", "our", "how", "many", "much", "does", "did", "has", "have",
    "left", "right", "and", "or", "of", "for", "about", "with", "a", "an",
    "this", "that", "he", "she", "they", "we", "i", "me", "us",
    "can", "you", "please", "could", "would", "will", "do", "be",
    "check", "see", "view", "look",
    # HR field names
    "leave", "leaves", "days", "balance", "remaining", "profile",
    "email", "mail",
    "phone", "mobile", "mobil", "moble", "number", "tel", "cell",
    "contact", "telephone", "whatsapp", "no",
    "department", "dept", "designation", "manager", "status",
    "location", "joining", "date", "team", "unit", "employee", "staff",
    "person", "user", "account", "details", "detail", "detailes",
    "info", "information", "summary", "record", "history",
    "sick", "annual", "casual", "pto", "vacation", "medical",
    "work", "working", "office", "salary", "address",
    "join", "time", "off", "employment", "active", "inactive",
    "in", "at", "on", "to", "from",
})

# Keyword-anchored regex fallback
_KEYWORD_RE = re.compile(
    r"(?:\b(?:does|of|for|about|show|find|get|is|belonging\s+to|assigned\s+to)\s+)"
    r"([A-Za-z][A-Za-z]{1,}(?:\s+[A-Za-z][A-Za-z]{1,}){0,3})",
    re.IGNORECASE,
)

# Possessive "sakthi's" → captures "sakthi"
_POSSESSIVE_RE = re.compile(
    r"\b([A-Za-z][A-Za-z]{2,}(?:\s+[A-Za-z][A-Za-z]{1,}){0,2})'s\b",
    re.IGNORECASE,
)

# Fallback word sequence
_WORD_RE = re.compile(r"\b([A-Za-z][A-Za-z]{2,}(?:\s+[A-Za-z][A-Za-z]{1,}){0,3})\b")


class EntityExtractor:

    def __init__(self) -> None:
        self._nlp = None
        self._spacy_loaded = False
        self._spacy_available = True

    def _load_spacy(self) -> None:
        if self._spacy_loaded:
            return
        try:
            import spacy  # type: ignore[import-untyped]
            self._nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy NER ready: en_core_web_sm")
        except Exception as exc:
            logger.warning("spaCy unavailable, using regex fallback: %s", exc)
            self._spacy_available = False
        self._spacy_loaded = True

    # ── Public ────────────────────────────────────────────────────────────────

    def extract(self, text: str) -> EntityResult:
        try:
            return self._extract(text)
        except Exception as exc:
            logger.exception("Entity extraction failed: %s", exc)
            return EntityResult()

    # ── Internal ──────────────────────────────────────────────────────────────

    def _extract(self, text: str) -> EntityResult:
        result = EntityResult()

        # 1. EMP-prefixed Employee ID (e.g. EMP1001)
        m = _EMP_ID_RE.search(text)
        if m:
            result.employee_id = m.group(0).upper()
            return result

        # 2. Plain numeric employee ID (e.g. 911099 — 5+ digits standalone)
        m = _NUM_ID_RE.search(text)
        if m:
            result.employee_id = m.group(1)
            return result

        # 3. Email
        m = _EMAIL_RE.search(text)
        if m:
            result.email = m.group(0).lower()
            return result

        # 4. Name
        name = self._extract_name(text)
        if name:
            result.employee_name = name
        return result

    def _extract_name(self, text: str) -> str | None:
        # spaCy NER first
        self._load_spacy()
        if self._spacy_available and self._nlp is not None:
            name = self._spacy_extract(text)
            if name:
                return name

        # Regex fallback
        return self._regex_extract(text)

    def _spacy_extract(self, text: str) -> str | None:
        """
        Extract person name using spaCy.
        Returns the full entity span from the original text — no subword issues.
        """
        try:
            doc = self._nlp(text)
            for ent in doc.ents:
                if ent.label_ == "PERSON":
                    name = self._clean(ent.text)
                    if self._valid(name):
                        return name.title()
        except Exception as exc:
            logger.debug("spaCy NER error: %s", exc)
        return None

    def _regex_extract(self, text: str) -> str | None:
        # Stage 0: possessive "sakthi's leave"
        for m in _POSSESSIVE_RE.finditer(text):
            candidate = self._clean(m.group(1))
            if self._valid(candidate):
                return candidate.title()

        # Stage A: keyword-anchored
        for m in _KEYWORD_RE.finditer(text):
            candidate = self._clean(m.group(1))
            if self._valid(candidate):
                return candidate.title()

        # Stage B: any word sequence
        for m in _WORD_RE.finditer(text):
            candidate = self._clean(m.group(1))
            if self._valid(candidate):
                return candidate.title()

        return None

    @staticmethod
    def _clean(s: str) -> str:
        """Strip leading/trailing stop words."""
        words = s.split()
        while words and words[-1].lower() in _STOP:
            words.pop()
        while words and words[0].lower() in _STOP:
            words.pop(0)
        return " ".join(words)

    @staticmethod
    def _valid(candidate: str) -> bool:
        if not candidate:
            return False
        words = candidate.lower().split()
        if not words:
            return False
        if all(w in _STOP for w in words):
            return False
        if len(words) == 1 and (words[0] in _STOP or len(words[0]) < 3):
            return False
        return True


# Module-level singleton
_extractor_instance: EntityExtractor | None = None


def get_entity_extractor() -> EntityExtractor:
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = EntityExtractor()
        _test = _extractor_instance.extract("show Srirama Chandramurthy Mullapudi profile")
        logger.info("Entity extractor ready (spaCy) — self-test: %r", _test.employee_name)
    return _extractor_instance


def reset_entity_extractor() -> None:
    global _extractor_instance
    _extractor_instance = None
