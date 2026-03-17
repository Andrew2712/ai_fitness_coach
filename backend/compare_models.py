"""
compare_models.py
=================
Run this in your Codespace:
    python compare_models.py

Compares 8 models on your balanced fatigue dataset and automatically
deploys the best one to replace your current Random Forest.
"""

import os
import json
import pickle
import warnings
import pandas as pd
import numpy as np
warnings.filterwarnings("ignore")

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, AdaBoostClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, classification_report,
    confusion_matrix, f1_score, precision_score, recall_score
)
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from lightgbm import LGBMClassifier
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

# ─── CONFIG ───────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH    = os.path.join(BASE_DIR, "data",   "final_fitness_data.csv")
MODEL_DIR    = os.path.join(BASE_DIR, "models")
FEATURE_PATH = os.path.join(MODEL_DIR, "features.json")
RESULTS_PATH = os.path.join(BASE_DIR, "data",   "model_comparison_results.json")

FEATURES = [
    "TotalSteps", "Calories", "TotalMinutesAsleep", "TotalTimeInBed",
    "AvgHeartRate", "TrainingLoad", "SleepEfficiency",
    "WeeklyLoad", "WeeklySleep", "StepConsistency",
    "HRV", "HRV_7d", "session_intensity",
    "7d_steps", "7d_sleep", "7d_cal", "7d_intensity", "fatigue_trend"
]
TARGET = "fatigue"

# ─── LOAD DATA ────────────────────────────────────────────────────────────────
print("\n📥 Loading dataset...")
df = pd.read_csv(DATA_PATH)

# Keep only feature columns that exist
available = [f for f in FEATURES if f in df.columns]
print(f"✅ Features used: {len(available)}")
print(f"✅ Dataset shape: {df.shape}")
print(f"📊 Fatigue distribution:\n{df[TARGET].value_counts().sort_index()}\n")

X = df[available].fillna(0)
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# ─── DEFINE MODELS ────────────────────────────────────────────────────────────
models = {
    "Random Forest (current)": RandomForestClassifier(
        n_estimators=200, max_depth=None, random_state=42, n_jobs=-1
    ),
    "Gradient Boosting": GradientBoostingClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=4, random_state=42
    ),
    "AdaBoost": AdaBoostClassifier(
        n_estimators=200, learning_rate=0.5, random_state=42
    ),
    "Logistic Regression": Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    LogisticRegression(max_iter=1000, random_state=42, C=1.0))
    ]),
    "SVM (RBF)": Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    SVC(kernel="rbf", C=1.0, probability=True, random_state=42))
    ]),
    "KNN": Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    KNeighborsClassifier(n_neighbors=7))
    ]),
    "Decision Tree": DecisionTreeClassifier(
        max_depth=8, random_state=42
    ),
    "Neural Network (MLP)": Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    MLPClassifier(
            hidden_layer_sizes=(128, 64, 32),
            activation="relu", max_iter=500,
            random_state=42, early_stopping=True
        ))
    ]),
}

if HAS_XGB:
    models["XGBoost"] = XGBClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=4,
        use_label_encoder=False, eval_metric="mlogloss", random_state=42
    )

if HAS_LGB:
    models["LightGBM"] = LGBMClassifier(
        n_estimators=200, learning_rate=0.1, max_depth=4,
        random_state=42, verbose=-1
    )

# ─── TRAIN & EVALUATE ─────────────────────────────────────────────────────────
print("=" * 65)
print(f"{'Model':<30} {'CV Acc':>8} {'Test Acc':>9} {'F1':>8} {'Prec':>7} {'Rec':>7}")
print("=" * 65)

results = []

for name, model in models.items():
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="accuracy", n_jobs=-1)

    # Train on full train set
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    acc   = accuracy_score(y_test, y_pred)
    f1    = f1_score(y_test, y_pred, average="weighted")
    prec  = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec   = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    cv_mean = cv_scores.mean()
    cv_std  = cv_scores.std()

    marker = " ◀ current" if name == "Random Forest (current)" else ""
    print(f"{name:<30} {cv_mean:.4f}±{cv_std:.3f}  {acc:.4f}   {f1:.4f}  {prec:.4f}  {rec:.4f}{marker}")

    results.append({
        "model":        name,
        "cv_accuracy":  round(cv_mean * 100, 2),
        "cv_std":       round(cv_std  * 100, 2),
        "test_accuracy":round(acc  * 100, 2),
        "f1_score":     round(f1   * 100, 2),
        "precision":    round(prec * 100, 2),
        "recall":       round(rec  * 100, 2),
        "trained_model":model,
    })

print("=" * 65)

# ─── PER-CLASS REPORT FOR EACH MODEL ──────────────────────────────────────────
print("\n📋 Per-class F1 scores (fatigue 0=Low, 1=Medium, 2=High):\n")
for r in results:
    model = r["trained_model"]
    y_pred = model.predict(X_test)
    report = classification_report(y_test, y_pred, target_names=["Low","Medium","High"], output_dict=True)
    f0 = report["Low"]["f1-score"]
    f1 = report["Medium"]["f1-score"]
    f2 = report["High"]["f1-score"]
    print(f"  {r['model']:<30}  Low:{f0:.2f}  Med:{f1:.2f}  High:{f2:.2f}")

# ─── FIND BEST MODEL ──────────────────────────────────────────────────────────
# Sort by test accuracy first, then f1
sorted_results = sorted(results, key=lambda x: (x["test_accuracy"], x["f1_score"]), reverse=True)
best = sorted_results[0]

print(f"\n🏆 BEST MODEL: {best['model']}")
print(f"   Test Accuracy : {best['test_accuracy']}%")
print(f"   CV Accuracy   : {best['cv_accuracy']}% ± {best['cv_std']}%")
print(f"   F1 Score      : {best['f1_score']}%")
print(f"   Precision     : {best['precision']}%")
print(f"   Recall        : {best['recall']}%")

# ─── CONFUSION MATRIX FOR BEST MODEL ─────────────────────────────────────────
print(f"\n📊 Confusion Matrix — {best['model']}:")
y_pred_best = best["trained_model"].predict(X_test)
cm = confusion_matrix(y_test, y_pred_best)
print("        Pred Low  Pred Med  Pred High")
labels = ["Low    ", "Medium ", "High   "]
for i, row in enumerate(cm):
    print(f"  Act {labels[i]}", "  ".join(f"{v:6}" for v in row))

# ─── DEPLOY BEST MODEL ────────────────────────────────────────────────────────
print(f"\n🚀 Deploying best model...")

os.makedirs(MODEL_DIR, exist_ok=True)

# Retrain best model on FULL dataset for maximum performance
best_model_instance = best["trained_model"]
best_model_instance.fit(X, y)

# Save with version number
existing = [f for f in os.listdir(MODEL_DIR) if f.startswith("v") and "fatigue" in f]
version  = len(existing) + 1
model_path = os.path.join(MODEL_DIR, f"v{version}_fatigue.pkl")
best_path  = os.path.join(MODEL_DIR, "best_fatigue.pkl")

with open(model_path, "wb") as f:
    pickle.dump(best_model_instance, f)

with open(best_path, "wb") as f:
    pickle.dump(best_model_instance, f)

# Save features
with open(FEATURE_PATH, "w") as f:
    json.dump(available, f)

print(f"✅ Saved: {model_path}")
print(f"✅ Deployed: {best_path}")
print(f"✅ Features saved: {FEATURE_PATH}")

# ─── SAVE RESULTS JSON ────────────────────────────────────────────────────────
save_results = []
for r in sorted_results:
    save_results.append({k: v for k, v in r.items() if k != "trained_model"})

with open(RESULTS_PATH, "w") as f:
    json.dump({
        "best_model": best["model"],
        "best_accuracy": best["test_accuracy"],
        "best_f1": best["f1_score"],
        "all_results": save_results
    }, f, indent=2)

print(f"\n📄 Full results saved to: {RESULTS_PATH}")

# ─── FINAL SUMMARY TABLE ──────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("FINAL RANKING")
print("=" * 65)
for i, r in enumerate(sorted_results):
    medal = ["🥇","🥈","🥉"][i] if i < 3 else f"  {i+1}."
    tag = " ◀ DEPLOYED" if r["model"] == best["model"] else ""
    print(f"{medal} {r['model']:<30} {r['test_accuracy']:>6.2f}%  F1:{r['f1_score']:>6.2f}%{tag}")

print("=" * 65)
print("\n✅ COMPARISON COMPLETE\n")