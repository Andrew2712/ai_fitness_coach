# agents/ml_agent.py

import os
import json
import joblib
import shutil

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report

from .registry_agent import register_model, get_best_model


# ==========================
# TRAIN MODEL
# ==========================

def train_model(df, model_dir):

    print("🤖 Training model...")


    # --------------------------
    # CHECK LABEL
    # --------------------------

    if "fatigue" not in df.columns:
        raise ValueError("❌ Fatigue label missing. Run label_agent first.")


    # --------------------------
    # FEATURES
    # --------------------------

    FEATURES = [
        "TotalSteps",
        "Calories",
        "TotalMinutesAsleep",
        "AvgHeartRate",
        "TrainingLoad",
        "SleepEfficiency",
        "WeeklyLoad",
        "WeeklySleep",
        "StepConsistency"
    ]


    X = df[FEATURES]
    y = df["fatigue"]


    # --------------------------
    # SPLIT
    # --------------------------

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )


    # --------------------------
    # MODEL
    # --------------------------

    model = RandomForestClassifier(
        n_estimators=250,
        max_depth=12,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )


    # --------------------------
    # TRAIN
    # --------------------------

    model.fit(X_train, y_train)
    
    # --------------------------
    # EVALUATE
    # --------------------------

    preds = model.predict(X_test)

    report = classification_report(
        y_test,
        preds,
        output_dict=True,
        zero_division=0
    )

    accuracy = round(report["accuracy"], 4)

    print("Accuracy:", accuracy)


    # --------------------------
    # VERSIONING
    # --------------------------

    os.makedirs(model_dir, exist_ok=True)

    versions = [
        f for f in os.listdir(model_dir)
        if f.startswith("v") and f.endswith("_fatigue.pkl")
    ]

    version = f"v{len(versions) + 1}"

    model_path = f"{model_dir}/{version}_fatigue.pkl"

    joblib.dump(model, model_path)

    print("Saved:", model_path)


    # --------------------------
    # SAVE FEATURES
    # --------------------------

    with open(f"{model_dir}/features.json", "w") as f:
        json.dump(FEATURES, f, indent=4)

    print("📌 Features saved")


    # --------------------------
    # REGISTER
    # --------------------------

    register_model(version, accuracy, model_path)

    print("📌 Model registered")


    # --------------------------
    # FORCE BEST MODEL
    # --------------------------

    BEST_MODEL = f"{model_dir}/best_fatigue.pkl"


    # If best file doesn't exist → create it
    if not os.path.exists(BEST_MODEL):

        shutil.copy(model_path, BEST_MODEL)

        print("⭐ Bootstrapped first best model")

        return model


    best = get_best_model()


    if best is None:

        shutil.copy(model_path, BEST_MODEL)

        print("⭐ First model set as best")


    elif accuracy >= best["accuracy"]:

        shutil.copy(model_path, BEST_MODEL)

        print("⭐ New best model deployed")


    else:

        print("ℹ️ Existing model is better")


    return model