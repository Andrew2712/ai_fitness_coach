# agents/label_agent.py

import pandas as pd
import os

def label_fatigue(df):

    fatigue_labels = []

    for _, row in df.iterrows():

        steps = row["TotalSteps"]
        sleep = row["TotalMinutesAsleep"]
        hr = row["AvgHeartRate"]

        score = 0


        # -------------------------
        # SLEEP
        # -------------------------

        if sleep < 280:
            score += 3
        elif sleep < 330:
            score += 2
        elif sleep < 380:
            score += 1


        # -------------------------
        # HEART RATE
        # -------------------------

        if hr > 95:
            score += 3
        elif hr > 85:
            score += 2
        elif hr > 75:
            score += 1


        # -------------------------
        # ACTIVITY LOAD
        # -------------------------

        if steps > 14000:
            score += 3
        elif steps > 10000:
            score += 2
        elif steps > 7000:
            score += 1


        # -------------------------
        # LABEL
        # -------------------------

        if score >= 5:
            fatigue = 2   # HIGH
        elif score >= 2:
            fatigue = 1   # MED
        else:
            fatigue = 0   # LOW


        fatigue_labels.append(fatigue)


    df["fatigue"] = fatigue_labels


    print("\n📊 Fatigue Distribution:")
    print(df["fatigue"].value_counts())


    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    data_path = os.path.join(BASE_DIR, "data", "final_fitness_data.csv")
    df.to_csv(data_path, index=False)
    print("✅ Dataset saved")

    return df