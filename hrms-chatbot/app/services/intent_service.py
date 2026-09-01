"""
Intent service — thin wrapper around the NLP intent classifier.

Keeps the FastAPI route layer free of NLP imports.
"""

import logging

from app.nlp.intent_classifier import get_intent_classifier
from app.schemas.chatbot import IntentResult

logger = logging.getLogger(__name__)


async def classify_intent(text: str) -> IntentResult:
    """
    Run intent classification on *text*.

    This is an async wrapper even though the underlying model call is
    synchronous — it keeps the service interface consistent and allows
    easy replacement with an async model in the future.
    """
    classifier = get_intent_classifier()
    result = classifier.predict(text)
    logger.debug("Intent classified: text=%r → %s (%.2f)", text, result.intent, result.confidence)
    return result
