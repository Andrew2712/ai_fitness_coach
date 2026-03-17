import os

from backend.agents.data_agent import load_data, preprocess_data
from backend.agents.daily_feature_agent import engineer_features
from backend.agents.label_agent import label_fatigue
from backend.agents.ml_agent import train_model


# =====================
# CONFIG
# =====================

DATA_DIR = "data"
MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

ACTIVITY_FILE = os.path.join(DATA_DIR, "dailyActivity_merged.csv")
SLEEP_FILE = os.path.join(DATA_DIR, "sleepDay_merged.csv")
HR_FILE = os.path.join(DATA_DIR, "heartrate_seconds_merged.csv")


# =====================
# MAIN PIPELINE
# =====================

def main():

    print("\n🚀 Starting AI Fitness Training Pipeline...\n")

    # 1️⃣ Load data
    activity, sleep, hr = load_data(
        ACTIVITY_FILE,
        SLEEP_FILE,
        HR_FILE
    )

    # 2️⃣ Preprocess
    df = preprocess_data(activity, sleep, hr)

    # 3️⃣ Feature engineering
    df = engineer_features(df)

    # 4️⃣ Labeling
    df = label_fatigue(df)

    # 5️⃣ Train model
    train_model(df, MODEL_DIR)


    print("\n✅ Pipeline Completed Successfully!")


# =====================
# RUN
# =====================

if __name__ == "__main__":
    main()
