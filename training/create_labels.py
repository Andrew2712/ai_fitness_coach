import pandas as pd

df = pd.read_csv("data/final_fitness_data.csv")


def assign_goal(row):

    # Fat Loss
    if row["TotalSteps"] > 8000 and row["TotalMinutesAsleep"] > 420:
        return "fat_loss"

    # Recovery
    elif row["AvgHeartRate"] > 90 and row["TotalMinutesAsleep"] < 360:
        return "recovery"

    # Muscle / Performance
    elif row["TotalSteps"] > 12000 and row["Calories"] > 2200:
        return "muscle"

    # Basic Fitness
    else:
        return "basic"


df["Goal"] = df.apply(assign_goal, axis=1)

df.to_csv("fitness_ml_data.csv", index=False)

print("✅ ML dataset created!")
