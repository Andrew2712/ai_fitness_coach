# controller_logic.py

import pandas as pd
import numpy as np

# Load user data
df = pd.read_csv("../data/final_fitness_data.csv")

def get_user_features(user_id):
    user_data = df[df["user_id"] == int(user_id)]
    if user_data.empty:
        return {}
    avg_steps = user_data["steps"].mean()
    max_steps = user_data["steps"].max()
    avg_sleep = user_data["sleep_minutes"].mean()
    sleep_std = user_data["sleep_minutes"].std()
    avg_hr = user_data["heart_rate"].mean()
    avg_cal = user_data["calories"].mean()
    recovery_rate = avg_sleep / avg_hr
    return {
        "avg_steps": round(avg_steps, 0),
        "max_steps": int(max_steps),
        "avg_sleep": round(avg_sleep, 0),
        "sleep_std": round(sleep_std, 2),
        "avg_hr": round(avg_hr, 1),
        "avg_cal": int(avg_cal),
        "recovery_rate": round(recovery_rate, 2),
    }

# Define the other functions: get_trends, get_fatigue_score, get_dashboard, get_recovery_plan, get_ai_goal