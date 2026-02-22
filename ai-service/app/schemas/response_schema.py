from pydantic import BaseModel

class EvaluationResponse(BaseModel):
    similarity: float
    coverage: float
    concept_score: float
    confidence: float
    status: str
    feedback: str
    bias_check: str