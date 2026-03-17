import os
import json


REGISTRY_FILE = "models/registry.json"


def register_model(version, accuracy, path):

    record = {
        "version": version,
        "accuracy": accuracy,
        "path": path
    }

    # Load existing registry
    if os.path.exists(REGISTRY_FILE):
        with open(REGISTRY_FILE, "r") as f:
            registry = json.load(f)
    else:
        registry = []

    # Add new record
    registry.append(record)

    # Save registry
    os.makedirs("models", exist_ok=True)

    with open(REGISTRY_FILE, "w") as f:
        json.dump(registry, f, indent=4)

    print("📌 Model registered")


def get_best_model():

    if not os.path.exists(REGISTRY_FILE):
        return None

    with open(REGISTRY_FILE, "r") as f:
        registry = json.load(f)

    # Highest accuracy wins
    best = max(registry, key=lambda x: x["accuracy"])

    return best
