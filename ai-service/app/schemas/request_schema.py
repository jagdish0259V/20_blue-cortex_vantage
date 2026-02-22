from pydantic import BaseModel, Field 
from typing import List

class EvaluationRequest(BaseModel):
    student_id: str = Field(..., description="Unique identifier for the student")   
    assignment_id: str = Field(..., description="Unique identifier for the assignment")
    answer: str = Field(..., description="The student's answer to the assignment")
    rubric: List[str] = Field(..., description="List of rubric criteria for evaluation")
    type: str = Field(..., description="Type of evaluation (e.g., 'peer', 'self', 'instructor')")

    marks : float = Field(..., description="Marks the student based on the perform on the paper and give the score in the scale between 0 to 100")
    feedback: str = Field(..., description="Feedback for the student based on the evaluation according to the marks and the thing that the student did wrong and right in the paper")