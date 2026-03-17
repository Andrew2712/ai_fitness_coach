import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib


# Load labeled data
df = pd.read_csv("data/fitness_ml_data.csv")

# Features
X = df[
    [
        "TotalSteps",
        "Calories",
        "TotalMinutesAsleep",
        "TotalTimeInBed",
        "AvgHeartRate"
    ]
]

# Target
y = df["Goal"]

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Model
model = RandomForestClassifier(
    n_estimators=150,
    max_depth=8,
    random_state=42
)

# Train
model.fit(X_train, y_train)

# Test
pred = model.predict(X_test)

acc = accuracy_score(y_test, pred)

print("✅ Accuracy:", round(acc * 100, 2), "%")

# Save model
joblib.dump(model, "fitness_model.pkl")

print("✅ Model saved!")
