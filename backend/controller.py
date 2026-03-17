# controller.py
import os
import sys
import json
import pandas as pd
import os
import shutil

# ==========================
# CONFIG
# ==========================

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")

ACTIVITY = os.path.join(DATA_DIR, "dailyActivity_merged.csv")
SLEEP = os.path.join(DATA_DIR, "sleepDay_merged.csv")
HR = os.path.join(DATA_DIR, "heartrate_seconds_merged.csv")

DATA_PATH = os.path.join(DATA_DIR, "final_fitness_data.csv")
FEATURE_PATH = os.path.join(MODEL_DIR, "features.json")


# ==========================
# AGENT IMPORTS
# ==========================

# Data
from backend.agents.data_agent import (
    load_data,
    preprocess_data
)
from backend.agents.daily_feature_agent import engineer_features

from backend.agents.health_agent import compute_health

# Session
from backend.agents.session_agent import detect_sessions
from backend.agents.session_feature_agent import build_session_features
from backend.agents.session_label_agent import label_session_fatigue
from backend.agents.session_ml_agent import train_session_model

from backend.agents.logger import log

from backend.agents.fusion_agent import (
    get_session_fatigue,
    fuse_fatigue
)

# Labels
from backend.agents.label_agent import label_fatigue

# ML
from backend.agents.ml_agent import train_model

# Inference
from backend.agents.inference_agent import predict_fatigue

# Analysis
from backend.agents.analysis_agent import (
    build_profile,
    analyze_trends,
    calculate_recovery_index,
    calculate_progress_score,
    predict_risk,
    burnout_alert,
    weekly_forecast,
    generate_recovery_plan
)

# Decision
from backend.agents.decision_agent import (
    generate_ai_goal,
    generate_ai_goal_plan,
    explain_goal
)

# Memory
from backend.agents.memory_agent import (
    load_memory,
    save_memory,
    init_user,
    update_session,
    evaluate_agent,
    analyze_feedback,
    collect_feedback
)


# ==========================
# SESSION PIPELINE
# ==========================

def run_session():

    print("\n🚀 STARTING SESSION PIPELINE\n")

    raw_path = "data/raw_stream.csv"

    if not os.path.exists(raw_path):
        print("❌ raw_stream.csv not found")
        return

    # Load raw wearable stream
    df = pd.read_csv(raw_path)
    uid = input("Enter User ID for this session: ")
    df["Id"] = int(uid)

    # Detect workout sessions
    sessions = detect_sessions(df)

    if len(sessions) == 0:
        print("⚠️ No sessions detected")
        return

    # Build features
    session_df = build_session_features(df, sessions)

    out_path = os.path.join(DATA_DIR, "session_data.csv")
    session_df.to_csv(out_path, index=False)

    print(f"✅ Session data saved to {out_path}")


# ==========================
# SESSION TRAINING PIPELINE
# ==========================

def run_session_training():

    print("\n🚀 STARTING SESSION TRAINING PIPELINE\n")

    df = pd.read_csv("data/session_data.csv")

    from agents.session_label_agent import label_session_fatigue
    from agents.session_ml_agent import train_session_model

    # Label sessions
    df = label_session_fatigue(df)

    df.to_csv("data/session_labeled.csv", index=False)

    print("✅ Session labeled data saved")

    # Train model
    train_session_model(df, MODEL_DIR)

    print("\n✅ SESSION TRAINING COMPLETE\n")

    
# ==========================
# TRAINING PIPELINE
# ==========================

# ==========================
# TRAINING PIPELINE
# ==========================

def run_training():

    print("\n🚀 STARTING TRAINING PIPELINE\n")

    final_path = os.path.join(DATA_DIR, "final_fitness_data.csv")

    # ✅ Load balanced dataset directly if it exists
    if os.path.exists(final_path):
        print("📂 Found existing balanced dataset, skipping rebuild...")
        df = pd.read_csv(final_path)
        print("📊 Fatigue Distribution:")
        print(df['fatigue'].value_counts().sort_index())
        print(f"✅ Loaded {len(df)} rows")

    else:
        # Fallback: build from raw files
        print("⚠️ No final dataset found, building from raw data...")
        activity, sleep, hr = load_data(ACTIVITY, SLEEP, HR)
        df = preprocess_data(activity, sleep, hr)
        df = engineer_features(df)
        df = label_fatigue(df)
        df.to_csv(final_path, index=False)
        print(f"✅ Labeled dataset saved to {final_path}")

    # Train
    train_model(df, MODEL_DIR)

    models = [f for f in os.listdir(MODEL_DIR) if f.endswith(".pkl") and "fatigue" in f]
    models.sort()

    latest_model = os.path.join(MODEL_DIR, models[-1])
    best_model = os.path.join(MODEL_DIR, "best_fatigue.pkl")

    shutil.copy(latest_model, best_model)

    print("⭐ Best model deployed:", best_model)

    print("\n✅ TRAINING COMPLETE\n")


def auto_retrain():

    df = pd.read_csv(DATA_PATH)

    if len(df) % 100 == 0:
        print("♻️ Auto retraining triggered...")
        run_training()




# ==========================
# COACH PIPELINE
# ==========================

def run_coach():

    BEST_MODEL = os.path.join(MODEL_DIR, "best_fatigue.pkl")
    
    if not os.path.exists(BEST_MODEL):
        print("⚠️ No trained model found. Training now...")
        run_training()

    print("\n🤖 STARTING AI COACH\n")

    # Load data
    df = pd.read_csv(DATA_PATH, parse_dates=["Date"])

    # Load features
    with open(FEATURE_PATH) as f:
        FEATURES = json.load(f)

    # Show users
    users = df["Id"].unique()

    print("Available Users:")
    print(users)

    # Input
    try:
        uid = str(int(input("\nEnter User ID: ")))
    except:
        print("❌ Invalid ID")
        return

    user_data = df[df["Id"] == int(uid)]

    if user_data.empty:
        print("❌ No data found")
        return
    

    session_path = "data/session_data.csv"

    if os.path.exists(session_path):
        session_df = pd.read_csv(session_path)
        
        print("Session columns:", session_df.columns)

    # ❗ No user id exists in session data
        if "Id" not in session_df.columns:
            print("⚠️ No user ID in session data. Skipping session report.")
            latest_session = None
        else:
            user_sessions = session_df[session_df["Id"] == int(uid)]

            if not user_sessions.empty:
                latest_session = user_sessions.iloc[-1]
            else:
                latest_session = None

    else:
        latest_session = None

    # ==========================
    # POST WORKOUT REPORT
    # ==========================

    if latest_session is not None:
        show_session_report(latest_session)

    # ==========================
    # MEMORY
    # ==========================

    memory = load_memory()
    memory = init_user(memory, uid)


    # ==========================
    # FEATURES
    # ==========================

    if "HRV" not in user_data.columns:
        user_data = engineer_features(user_data)


    # ==========================
    # ANALYSIS
    # ==========================

    profile = build_profile(user_data)
    trends = analyze_trends(user_data)

    latest = user_data[FEATURES].iloc[-1].to_dict()

    # ==========================
# FATIGUE FUSION
# ==========================

# Daily ML fatigue
    daily_fatigue = predict_fatigue(latest)

# Session-based fatigue
    session_fatigue = get_session_fatigue(uid)

# Final fused fatigue
    fatigue_score = fuse_fatigue(
        daily_fatigue,
        session_fatigue
    )

# Convert score → level
    if fatigue_score < 0.7:
        fatigue = 0
    elif fatigue_score < 1.4:
        fatigue = 1
    else:
        fatigue = 2



    recovery = calculate_recovery_index(profile, trends)
    progress = calculate_progress_score(profile, trends, fatigue)

    risk = predict_risk(profile, fatigue, recovery)
    burnout = burnout_alert(profile, trends, fatigue)
    forecast = weekly_forecast(trends, fatigue)


    # ==========================
    # MEMORY UPDATE
    # ==========================

    memory = update_session(
        memory,
        uid,
        fatigue,
        progress
    )

    save_memory(memory)


    # ==========================
    # DASHBOARD
    # ==========================

    levels = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}

    print("\n=== PROFILE ===")
    for k, v in profile.items():
        print(f"{k}: {v}")

    print("\n=== TRENDS ===")
    for k, v in trends.items():
        print(f"{k}: {v}")

    print("\n=== FATIGUE ===")
    print(levels[fatigue])

    print("\n=== FATIGUE ENGINE ===")
    print("Daily Fatigue  :", round(daily_fatigue,2))
    print("Session Fatigue:", round(session_fatigue,2))
    print("Final Score    :", fatigue_score)

    health = compute_health(
    fatigue,
    recovery,
    progress
    )

    print("\n=== DASHBOARD ===")

    print("Progress :", progress)
    print("Risk     :", risk)
    print("Burnout  :", burnout)
    print("Forecast :", forecast)
    print("Insight  :", evaluate_agent(memory, uid))
    print("Feedback :", analyze_feedback(memory, uid))


    # ==========================
    # MENU
    # ==========================

    while True:

        print("\n====================")
        print("1 → Recovery Plan")
        print("2 → AI Goal System")
        print("3 → Exit")
        print("====================")

        ch = input("Choose: ")


        # Recovery
        if ch == "1":

            print("\n🧘 RECOVERY PLAN\n")

            for d in generate_recovery_plan(
                fatigue,
                recovery
            ):
                print("•", d)


        # Goal System
        elif ch == "2":

            goal = generate_ai_goal(
                profile,
                trends,
                fatigue,
                memory,
                uid
            )

            feedback = collect_feedback()

            memory[uid]["goals"].append({
                "goal": goal["goal"],
                "progress": progress,
                "feedback": feedback
            })

            save_memory(memory)

            plan = generate_ai_goal_plan(goal)


            print("\n🤖 AI GOAL\n")

            print("Goal :", goal["goal"])
            print("Focus:", goal["focus"])

            print("\nPLAN")

            for p in plan:
                print("•", p)


            explain_goal(
                profile,
                trends,
                levels[fatigue],
                profile["recovery_rate"],
                goal
            )


        # Exit
        elif ch == "3":

            print("\n👋 Bye!")
            break


        else:
            print("❌ Invalid option")

def coach(user_id):

    BEST_MODEL = os.path.join(MODEL_DIR, "best_fatigue.pkl")

    if not os.path.exists(BEST_MODEL):
        run_training()

    # Load data
    df = pd.read_csv(DATA_PATH, parse_dates=["Date"])

    with open(FEATURE_PATH) as f:
        FEATURES = json.load(f)

    user_data = df[df["Id"] == int(user_id)]

    if user_data.empty:
        return {
            "progress": 0,
            "risk": "UNKNOWN",
            "burnout": "UNKNOWN",
            "forecast": "No data",
            "insight": "User not found"
        }

    # ✅ Only engineer features if HRV not already present
    if "HRV" not in user_data.columns:
        user_data = engineer_features(user_data)

    # Analysis
    profile = build_profile(user_data)
    trends = analyze_trends(user_data)

    latest = user_data[FEATURES].iloc[-1].to_dict()

    # Daily fatigue
    daily_fatigue = predict_fatigue(latest)

    # Session fatigue
    session_fatigue = get_session_fatigue(user_id)

    fatigue_score = fuse_fatigue(daily_fatigue, session_fatigue)

    if fatigue_score < 0.7:
        fatigue = 0
    elif fatigue_score < 1.4:
        fatigue = 1
    else:
        fatigue = 2

    recovery = calculate_recovery_index(profile, trends)

    progress = calculate_progress_score(profile, trends, fatigue)

    risk = predict_risk(profile, fatigue, recovery)

    burnout = burnout_alert(profile, trends, fatigue)

    forecast = weekly_forecast(trends, fatigue)

    memory = load_memory()
    memory = init_user(memory, str(user_id))

    insight = evaluate_agent(memory, str(user_id))

    return {
        "progress": progress,
        "risk": risk,
        "burnout": burnout,
        "forecast": forecast,
        "insight": insight
    }

def run_coach_for_user(user_id):

    result = coach(user_id)

    return result

def show_session_report(session):

    print("\n🏋️ POST WORKOUT REPORT\n")

    duration = session["duration"]
    avg_hr = session["avg_hr"]
    max_hr = session["max_hr"]
    calories = session["calories"]

    # ✅ Compute intensity dynamically
    intensity = (avg_hr / max_hr) * (duration / 60)
    intensity = min(round(intensity, 2), 1.0)

    print("Duration  :", round(duration, 1), "min")
    print("Avg HR    :", round(avg_hr, 1))
    print("Max HR    :", round(max_hr, 1))
    print("Calories  :", round(calories, 1))
    print("Intensity :", intensity)

    if intensity > 0.8:
        print("⚠️ High strain workout")
    elif intensity > 0.5:
        print("✅ Moderate workout")
    else:
        print("🧘 Light workout")

    

# ==========================
# DAILY AUTO PIPELINE (For Scheduler)
# ==========================

def run_daily():

    print("\n🌅 RUNNING DAILY AI PIPELINE\n")

    # Ensure model exists
    if not os.path.exists("models/best_fatigue.pkl"):
        run_training()

    # Load data
    df = pd.read_csv(DATA_PATH, parse_dates=["Date"])

    users = df["Id"].unique()

    print("Users Found:", users)

    for uid in users:

        print(f"\n👤 Processing User {uid}")

        user_data = df[df["Id"] == uid]

        if user_data.empty:
            continue

        # Load features
        with open(FEATURE_PATH) as f:
            FEATURES = json.load(f)

        # Engineer features
        if "HRV" not in user_data.columns:
            user_data = engineer_features(user_data)

        # Analysis
        profile = build_profile(user_data)
        trends = analyze_trends(user_data)

        latest = user_data[FEATURES].iloc[-1].to_dict()

        fatigue = predict_fatigue(latest)

        # Load session data
        session_path = "data/session_data.csv"

        if os.path.exists(session_path):

            session_df = pd.read_csv(session_path)

            if "Id" in session_df.columns:

                user_sessions = session_df[session_df["Id"] == uid]

                if not user_sessions.empty:

                    last_session = user_sessions.iloc[-1]

                    # Boost fatigue using session
                    intensity = last_session.get(
                        "session_intensity",
                        (last_session["avg_hr"]/190 + last_session["duration"]/60)/2
                    )

                    if intensity > 0.8:
                        fatigue = min(fatigue + 1, 2)

        # Recovery & progress
        recovery = calculate_recovery_index(profile, trends)
        progress = calculate_progress_score(profile, trends, fatigue)

        # Memory
        memory = load_memory()
        memory = init_user(memory, str(uid))

        memory = update_session(
            memory,
            str(uid),
            fatigue,
            progress
        )

        save_memory(memory)

        print("Fatigue:", fatigue, "| Progress:", progress)

    print("\n✅ DAILY PIPELINE COMPLETE\n")

# ==========================
# ENTRY
# ==========================

def main():

    if len(sys.argv) < 2:

        print("""
Usage:

python controller.py train          → Train daily model
python controller.py coach          → Run AI Coach
python controller.py session        → Process workout sessions
python controller.py session_train  → Train session model
        """)
        return


    mode = sys.argv[1]


    if mode == "train":
        run_training()
    
    elif mode == "coach":
        run_coach()
    
    elif mode == "session":
        run_session()

    elif mode == "session_train":
        run_session_training()
    
    else:
        print("❌ Unknown mode")


if __name__ == "__main__":
    main()