from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from controller import run_coach_for_user
import json, os

# ── HRV cache (computed once, reused across all requests) ──
_hrv_cache = None
def get_hrv_df():
    global _hrv_cache
    if _hrv_cache is None:
        from agents.daily_feature_agent import compute_daily_hrv
        _hrv_cache = compute_daily_hrv()
    return _hrv_cache

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FeedbackRequest(BaseModel):
    user_id: str
    rating: int
    goal: str
    comment: str = ""


def _get_fatigue(user_data, FEATURES):
    from agents.inference_agent import predict_fatigue
    from agents.fusion_agent import get_session_fatigue, fuse_fatigue
    latest          = user_data[FEATURES].iloc[-1].to_dict()
    daily_fatigue   = predict_fatigue(latest)
    session_fatigue = get_session_fatigue(str(user_data["Id"].iloc[0]))
    fatigue_score   = fuse_fatigue(daily_fatigue, session_fatigue)
    if fatigue_score < 0.7:   return 0
    elif fatigue_score < 1.4: return 1
    else:                     return 2


# ✅ Helper: safely apply engineer_features only if HRV missing
def safe_engineer(user_data):
    from agents.daily_feature_agent import engineer_features
    if "HRV" not in user_data.columns:
        return engineer_features(user_data, hrv_df=get_hrv_df())
    return user_data


@app.get("/")
def home():
    return {"message": "AI Fitness Coach API"}


@app.get("/users")
def list_users():
    import pandas as pd
    from controller import DATA_PATH
    try:
        df  = pd.read_csv(DATA_PATH)
        ids = sorted(df["Id"].unique().tolist())
        return {"users": ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/coach/{user_id}")
def coach(user_id: int):
    import pandas as pd
    from controller import DATA_PATH, FEATURE_PATH
    from agents.analysis_agent import (
        build_profile, analyze_trends,
        calculate_recovery_index, calculate_progress_score
    )
    from agents.health_agent import compute_health

    result = run_coach_for_user(user_id)

    try:
        df = pd.read_csv(DATA_PATH, parse_dates=["Date"])
        with open(FEATURE_PATH) as f:
            FEATURES = json.load(f)
        user_data = df[df["Id"] == user_id]
        if not user_data.empty:
            user_data = safe_engineer(user_data)   # ✅ fixed
            profile   = build_profile(user_data)
            trends    = analyze_trends(user_data)
            fatigue   = _get_fatigue(user_data, FEATURES)
            recovery  = calculate_recovery_index(profile, trends)
            progress  = calculate_progress_score(profile, trends, fatigue)
            health    = compute_health(fatigue, recovery, progress)
            result["profile"]        = profile
            result["trends"]         = trends
            result["health"]         = health
            result["recovery_index"] = recovery
    except Exception as e:
        result["profile"]        = {}
        result["trends"]         = {}
        result["health"]         = None
        result["recovery_index"] = None

    return result


@app.get("/timeseries/{user_id}")
def timeseries(user_id: int):
    import pandas as pd
    from controller import DATA_PATH

    df = pd.read_csv(DATA_PATH, parse_dates=["Date"])
    user_data = df[df["Id"] == user_id].copy()
    if user_data.empty:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = safe_engineer(user_data)   # ✅ fixed
    user_data = user_data.sort_values("Date")

    def col(name):
        if name in user_data.columns:
            return user_data[name].fillna(0).round(2).tolist()
        return []

    return {
        "dates":    user_data["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "steps":    col("TotalSteps"),
        "calories": col("Calories"),
        "sleep":    col("TotalMinutesAsleep"),
        "hr":       col("AvgHeartRate"),
        "hrv":      col("HRV"),
        "hrv_7d":   col("HRV_7d"),
        "fatigue":  col("fatigue"),
        "load":     col("TrainingLoad"),
    }


@app.get("/recovery/{user_id}")
def recovery_plan(user_id: int):
    import pandas as pd
    from controller import DATA_PATH, FEATURE_PATH
    from agents.analysis_agent import (
        build_profile, analyze_trends,
        calculate_recovery_index, generate_recovery_plan
    )

    df = pd.read_csv(DATA_PATH, parse_dates=["Date"])
    with open(FEATURE_PATH) as f:
        FEATURES = json.load(f)
    user_data = df[df["Id"] == user_id]
    if user_data.empty:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = safe_engineer(user_data)   # ✅ fixed
    profile   = build_profile(user_data)
    trends    = analyze_trends(user_data)
    fatigue   = _get_fatigue(user_data, FEATURES)
    recovery  = calculate_recovery_index(profile, trends)
    plan = generate_recovery_plan(fatigue, recovery, profile=profile)

    # ✅ Dynamic coach note based on actual fatigue
    fatigue_notes = {
        0: "Your fatigue is low — maintain consistency and gradually build intensity.",
        1: "Moderate fatigue detected. Balance training with rest and prioritise sleep quality.",
        2: "High fatigue detected. Avoid high-intensity sessions until day 7. Rest, hydrate and listen to your body."
    }

    return {
        "plan":           plan,
        "fatigue":        fatigue,
        "recovery_index": recovery,
        "note":           fatigue_notes.get(fatigue, "Stay hydrated and listen to your body.")  # ✅ dynamic
    }


@app.get("/goal/{user_id}")
def ai_goal(user_id: int):
    import pandas as pd
    from controller import DATA_PATH, FEATURE_PATH
    from agents.analysis_agent import build_profile, analyze_trends
    from agents.decision_agent import generate_ai_goal, generate_ai_goal_plan
    from agents.memory_agent import load_memory, init_user

    df = pd.read_csv(DATA_PATH, parse_dates=["Date"])
    with open(FEATURE_PATH) as f:
        FEATURES = json.load(f)

    user_data = df[df["Id"] == user_id]
    if user_data.empty:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = safe_engineer(user_data)
    profile   = build_profile(user_data)
    trends    = analyze_trends(user_data)
    fatigue   = _get_fatigue(user_data, FEATURES)
    memory    = load_memory()
    memory    = init_user(memory, str(user_id))

    goal_data = generate_ai_goal(profile, trends, fatigue, memory, str(user_id))
    plan      = generate_ai_goal_plan(goal_data)

    # ✅ Richer explanation pills — now includes HRV + sleep trend + step trend
    explanation = []

    if profile.get("avg_steps"):
        explanation.append(f"Avg steps: {int(profile['avg_steps']):,}")

    if profile.get("avg_sleep"):
        mins  = int(profile["avg_sleep"])
        explanation.append(f"Avg sleep: {mins // 60}h {mins % 60}m")

    if profile.get("avg_hr"):
        explanation.append(f"Avg HR: {round(profile['avg_hr'])} bpm")

    # ✅ NEW — HRV pill
    if profile.get("avg_hrv"):
        hrv_val = round(profile["avg_hrv"], 1)
        hrv_status = "good" if hrv_val >= 2.0 else "low"
        explanation.append(f"HRV: {hrv_val} RMSSD ({hrv_status})")

    # ✅ NEW — Sleep trend pill
    sleep_trend = trends.get("sleep_trend", 0)
    if sleep_trend is not None:
        direction = "declining" if sleep_trend < 0 else "improving" if sleep_trend > 0 else "stable"
        explanation.append(f"Sleep trend: {direction}")

    # ✅ NEW — Step trend pill
    step_trend = trends.get("step_trend", 0)
    if step_trend is not None:
        s_dir = "improving" if step_trend > 0 else "declining" if step_trend < 0 else "stable"
        explanation.append(f"Step trend: {s_dir}")

    # Fatigue pill
    fatigue_label = "HIGH" if fatigue == 2 else "MEDIUM" if fatigue == 1 else "LOW"
    explanation.append(f"Fatigue: {fatigue_label}")

    # Recovery rate pill
    if profile.get("recovery_rate") is not None:
        explanation.append(f"Recovery rate: {profile['recovery_rate']}")

    # ✅ NEW — Goal reason pill (from decision_agent)
    if goal_data.get("reason"):
        explanation.append(f"Reason: {goal_data['reason']}")

    # ✅ NEW — Duration pill
    if goal_data.get("duration"):
        explanation.append(f"Duration: {goal_data['duration']}")

    return {
        "goal":        goal_data.get("goal",     "Balanced Lifestyle"),
        "focus":       goal_data.get("focus",    "Maintain habits"),
        "duration":    goal_data.get("duration", "4 weeks"),
        "reason":      goal_data.get("reason",   "Stable pattern"),
        "plan":        plan,
        "explanation": explanation,
    }

@app.get("/debug")
def debug():
    import os
    return {
        "DATA_DIR":  os.environ.get("DATA_DIR", "NOT SET"),
        "MODEL_DIR": os.environ.get("MODEL_DIR", "NOT SET"),
        "cwd":       os.getcwd(),
        "files":     os.listdir("/app") if os.path.exists("/app") else "no /app",
        "app_files": os.listdir(os.getcwd()),
    }

@app.post("/feedback")
def submit_feedback(body: FeedbackRequest):
    from agents.memory_agent import load_memory, save_memory, init_user
    rating_map = {1: "Yes", 2: "Partially", 3: "No"}
    try:
        memory = load_memory()
        memory = init_user(memory, body.user_id)
        memory[body.user_id]["goals"].append({
            "goal":     body.goal,
            "feedback": rating_map.get(body.rating, "Unknown"),
            "comment":  body.comment,
        })
        save_memory(memory)
        return {"status": "ok", "message": "Feedback saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

    
@app.get("/debug")
def debug():
    import os
    return {
        "data_dir": os.environ.get("DATA_DIR", "NOT SET"),
        "app_contents": os.listdir("/app"),
        "data_contents": os.listdir("/app/data") if os.path.exists("/app/data") else "NOT FOUND",
    }
