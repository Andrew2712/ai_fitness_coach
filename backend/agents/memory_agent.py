# agents/memory_agent.py

import json
import os


MEMORY_PATH = "Memory/memory.json"


# ==========================
# LOAD MEMORY
# ==========================

def load_memory():

    if not os.path.exists(MEMORY_PATH):
        return {}

    try:
        with open(MEMORY_PATH, "r") as f:
            return json.load(f)
    except:
        return {}


# ==========================
# SAVE MEMORY
# ==========================

def save_memory(memory):

    os.makedirs(os.path.dirname(MEMORY_PATH), exist_ok=True)

    with open(MEMORY_PATH, "w") as f:
        json.dump(memory, f, indent=4)


# ==========================
# INIT USER
# ==========================

def init_user(memory, uid):

    if uid not in memory:

        memory[uid] = {
            "sessions": 0,
            "goals": [],
            "progress": [],
            "last_fatigue": None
        }

    return memory


# ==========================
# UPDATE SESSION
# ==========================

def update_session(memory, uid, fatigue, progress):

    memory[uid]["sessions"] += 1
    memory[uid]["last_fatigue"] = fatigue
    memory[uid]["progress"].append(progress)

    return memory


# ==========================
# EVALUATE USER
# ==========================

def evaluate_agent(memory, uid):

    history = memory[uid]["progress"]

    if len(history) < 3:
        return "Not enough data yet."

    last = history[-1]
    prev = history[-3]

    if last > prev:
        return "User is improving. Strategy is working."

    elif last < prev:
        return "User is declining. Need adjustment."

    else:
        return "User is stable. Maintain approach."


# ==========================
# FEEDBACK ANALYSIS
# ==========================

def analyze_feedback(memory, uid):

    history = memory[uid]["goals"]

    if len(history) < 2:
        return "Not enough feedback yet."

    last = history[-1]
    prev = history[-2]

    if last["feedback"] == "followed" and last["progress"] > prev["progress"]:
        return "Plan is effective. Continue."

    if last["feedback"] == "not_followed":
        return "Low adherence. Simplify goals."

    if last["progress"] < prev["progress"]:
        return "Performance declined. Adjust strategy."

    return "Monitor and adapt."

# ==========================
# USER FEEDBACK
# ==========================

def collect_feedback():

    print("\n📝 FEEDBACK")
    print("Did you follow the plan this week?")
    print("1 → Yes")
    print("2 → Partially")
    print("3 → No")

    choice = input("Choose: ")

    if choice == "1":
        return "followed"
    elif choice == "2":
        return "partial"
    elif choice == "3":
        return "not_followed"
    else:
        return "unknown"
