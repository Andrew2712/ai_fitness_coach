from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controller_logic import get_user_features, get_trends, get_fatigue_score, get_dashboard, get_recovery_plan, get_ai_goal

app = FastAPI()

# Allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/user/{user_id}/dashboard")
def user_dashboard(user_id: str, feedback: str = None):
    return {
        "profile": get_user_features(user_id),
        "trends": get_trends(user_id),
        "fatigue": get_fatigue_score(user_id),
        "dashboard": get_dashboard(user_id),
        "recovery_plan": get_recovery_plan(user_id),
        "ai_goal": get_ai_goal(user_id, feedback),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)