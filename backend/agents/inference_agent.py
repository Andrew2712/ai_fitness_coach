import joblib
import pandas as pd
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "models", "best_fatigue.pkl")
FEATURE_PATH = os.path.join(BASE_DIR, "models", "features.json")


def load_best_model():

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Best model not found. Train the model first.")

    model = joblib.load(MODEL_PATH)

    with open(FEATURE_PATH) as f:
        features = json.load(f)

    return model, features


def predict_fatigue(latest_row):

    model, features = load_best_model()

    X = pd.DataFrame([latest_row], columns=features)

    pred = model.predict(X)[0]

    return int(pred)
