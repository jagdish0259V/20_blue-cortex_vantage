from app.core.config import (
    SIMILARITY_WEIGHT,
    COVERAGE_WEIGHT,
    CONCEPT_WEIGHT,
    MODEL_WEIGHT,
    CONFIDENCE_THRESHOLD
)

def calculate_confidence(similarity, coverage, concept_score, model_certainty):
    confidence = (
        SIMILARITY_WEIGHT * similarity +
        COVERAGE_WEIGHT * coverage +
        CONCEPT_WEIGHT * concept_score +
        MODEL_WEIGHT * (model_certainty * 100)
    )

    status = "Eligible for Approval" if confidence >= CONFIDENCE_THRESHOLD else "Manual Review Required"

    return round(confidence, 2), status