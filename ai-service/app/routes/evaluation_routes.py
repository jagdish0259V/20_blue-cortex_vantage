from fastapi import APIRouter
from app.schemas.request_schema import EvaluationRequest
from app.services.evaluation_service import evaluate_submission

router = APIRouter()

@router.post("/evaluate")
async def evaluate(request: EvaluationRequest):
    result = evaluate_submission(request)
    return result