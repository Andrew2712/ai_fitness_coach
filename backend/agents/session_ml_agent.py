import joblib
import os

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report


def train_session_model(df, model_dir):

    FEATURES = [
        "avg_hr",
        "total_steps",
        "calories",
        "duration"
    ]

    X = df[FEATURES]
    y = df["fatigue"]

    Xtr, Xte, ytr, yte = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=8,
        class_weight="balanced"
    )

    model.fit(Xtr, ytr)

    preds = model.predict(Xte)

    print(classification_report(yte, preds))

    path = f"{model_dir}/session_fatigue.pkl"

    joblib.dump(model, path)

    print("✅ Session model saved:", path)

    return model