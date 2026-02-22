from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import evaluation_routes

app = FastAPI(title="AI Assignment Evaluation Service")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://0.0.0.0:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evaluation_routes.router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AI Assignment Evaluation"}