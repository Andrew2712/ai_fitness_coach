import pandas as pd

print("🔄 Loading datasets...")

# Load
daily = pd.read_csv("data/dailyActivity_merged.csv")
sleep = pd.read_csv("data/sleepDay_merged.csv")
sessions = pd.read_csv("data/session_data.csv")

# -------------------------------
# STANDARDIZE DATES
# -------------------------------

# Daily activity date
daily["Date"] = pd.to_datetime(
    daily["ActivityDate"],
    format="mixed",
    errors="coerce"
).dt.date

# Sleep date (often includes time)
sleep["Date"] = pd.to_datetime(
    sleep["SleepDay"],
    format="mixed",
    errors="coerce"
).dt.date

# Session date from start time
sessions["Date"] = pd.to_datetime(
    sessions["start"],
    format="mixed",
    errors="coerce"
).dt.date


# Drop broken rows
daily = daily.dropna(subset=["Date"])
sleep = sleep.dropna(subset=["Date"])
sessions = sessions.dropna(subset=["Date"])

print("✅ Dates standardized")

# -------------------------------
# MERGE DAILY + SLEEP
# -------------------------------

df = pd.merge(
    daily,
    sleep,
    on=["Id", "Date"],
    how="left"
)

print("✅ Daily + Sleep merged:", df.shape)

# -------------------------------
# AGGREGATE SESSIONS PER DAY
# -------------------------------

session_daily = sessions.groupby(
    ["Id", "Date"]
).agg({
    "duration": "sum",
    "session_intensity": "mean",
    "calories": "sum"
}).reset_index()

print("✅ Sessions aggregated")

# -------------------------------
# MERGE SESSIONS
# -------------------------------

df = pd.merge(
    df,
    session_daily,
    on=["Id", "Date"],
    how="left"
)

print("✅ Sessions merged:", df.shape)

# -------------------------------
# CLEANUP
# -------------------------------

df.fillna(0, inplace=True)

# Remove duplicates
df = df.drop_duplicates(["Id", "Date"])

# -------------------------------
# SAVE
# -------------------------------

df.to_csv("data/master_fitness_dataset.csv", index=False)

print("\n🎉 MASTER DATASET CREATED")
print("Rows:", len(df))
print("Columns:", len(df.columns))