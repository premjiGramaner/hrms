"""
Entity service — thin wrapper around the NLP entity extractor.
"""

import logging

from app.nlp.entity_extractor import get_entity_extractor
from app.schemas.chatbot import EntityResult

logger = logging.getLogger(__name__)


async def extract_entities(text: str) -> EntityResult:
    """Extract HRMS entities from a user message."""
    extractor = get_entity_extractor()
    result = extractor.extract(text)
    logger.debug("Entities extracted: text=%r → %s", text, result)
    return result
