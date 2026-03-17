# agents/data_agent.py

import os
import pandas as pd

FINAL_DATA_PATH = "/workspaces/ai_fitness_coach/data/final_fitness_data.csv"

# =========================
# LOAD DATA
# =========================

def load_data(activity_file, sleep_file, hr_file):

    print("📥 Loading datasets...")

    activity = pd.read_csv(activity_file)
    sleep = pd.read_csv(sleep_file)
    hr = pd.read_csv(hr_file)

    print("✅ Data loaded")

    return activity, sleep, hr


# =========================
# PREPROCESS
# =========================

def preprocess_data(activity, sleep, hr):

    print("🧹 Preprocessing data...")

    # Convert to datetime
    activity["ActivityDate"] = pd.to_datetime(activity["ActivityDate"])
    sleep["SleepDay"] = pd.to_datetime(sleep["SleepDay"])
    hr["Time"] = pd.to_datetime(hr["Time"])

    # Extract date
    activity["Date"] = activity["ActivityDate"].dt.date
    sleep["Date"] = sleep["SleepDay"].dt.date
    hr["Date"] = hr["Time"].dt.date

    # Daily average HR
    daily_hr = (
        hr.groupby(["Id", "Date"])["Value"]
        .mean()
        .reset_index()
        .rename(columns={"Value": "AvgHeartRate"})
    )

    # Merge
    merged = activity.merge(sleep, on=["Id", "Date"])
    merged = merged.merge(daily_hr, on=["Id", "Date"])

    # Select columns
    df = merged[
        [
            "Id",
            "Date",
            "TotalSteps",
            "Calories",
            "TotalMinutesAsleep",
            "TotalTimeInBed",
            "AvgHeartRate"
        ]
    ].copy()

    print("✅ Preprocessing done")

    return df


# =========================
# LOAD FINAL DATASET
# (Skips rebuild if balanced CSV exists)
# =========================

def load_final_dataset():
    if os.path.exists(FINAL_DATA_PATH):
        print(f"📂 Loading existing balanced dataset from {FINAL_DATA_PATH}")
        df = pd.read_csv(FINAL_DATA_PATH)
        print("📊 Fatigue Distribution:")
        print(df['fatigue'].value_counts().sort_index())
        print(f"✅ Loaded {len(df)} rows")
        return df
    else:
        print("⚠️ No final dataset found at expected path!")
        print(f"   Expected: {FINAL_DATA_PATH}")
        raise FileNotFoundError(f"Place your balanced CSV at: {FINAL_DATA_PATH}")