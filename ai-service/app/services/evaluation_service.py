from app.models.embedding_model import get_embedding
from app.utils.similarity import cosine_similarity
from app.models.confidence_engine import calculate_confidence
from app.services.bias_detection_service import check_bias
from app.utils.preprocessing import clean_text

def evaluate_submission(data):

    student_answer = clean_text(data.answer)
    rubric_points = data.rubric

    student_embedding = get_embedding(student_answer)
    rubric_text = " ".join(rubric_points)
    rubric_embedding = get_embedding(rubric_text)

    similarity = cosine_similarity(student_embedding, rubric_embedding) * 100

    # Concept Coverage
    covered = 0
    for concept in rubric_points:
        concept_embedding = get_embedding(concept)
        sim = cosine_similarity(student_embedding, concept_embedding)
        if sim > 0.6:
            covered += 1

    coverage_score = (covered / len(rubric_points)) * 100 if rubric_points else 0

    # Dummy concept tagging score (can upgrade to classifier later)
    concept_score = coverage_score

    model_certainty = 0.85  # can replace with Gemini self-confidence

    confidence, status = calculate_confidence(
        similarity,
        coverage_score,
        concept_score,
        model_certainty
    )

    feedback = "Good explanation but improve clarity in missing concepts."
    bias_status = check_bias(feedback)

    return {
        "similarity": round(similarity, 2),
        "coverage": round(coverage_score, 2),
        "concept_score": round(concept_score, 2),
        "confidence": confidence,
        "status": status,
        "feedback": feedback,
        "bias_check": bias_status
    }