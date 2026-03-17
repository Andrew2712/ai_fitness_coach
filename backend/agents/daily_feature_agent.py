# agents/daily_feature_agent.py
from agents.advanced_feature_agent import add_rolling_features
import pandas as pd
import numpy as np

HR_PATH = "../data/heartrate_seconds_merged.csv"

def compute_daily_hrv(hr_path=HR_PATH):
    """Calculate RMSSD HRV per user per day from raw HR seconds data."""
    print("📊 Computing HRV from heartrate_seconds...")
    try:
        hr = pd.read_csv(hr_path, parse_dates=["Time"])
        hr["Date"] = hr["Time"].dt.date
        hr["Id"]   = hr["Id"].astype(int)

        def rmssd(group):
            vals = group["Value"].values
            if len(vals) < 2:
                return np.nan
            diffs = np.diff(vals.astype(float))
            return float(np.sqrt(np.mean(diffs ** 2)))

        hrv = (
            hr.groupby(["Id", "Date"])[["Value"]]
            .apply(rmssd, include_groups=False)
            .reset_index()
        )
        hrv.columns    = ["Id", "Date", "HRV"]
        hrv["Date"]    = pd.to_datetime(hrv["Date"])
        hrv["Id"]      = hrv["Id"].astype(int)
        print(f"✅ HRV computed for {len(hrv)} user-days")
        return hrv

    except Exception as e:
        print(f"⚠️  HRV computation failed: {e}")
        return None


def engineer_features(df, add_hrv=True, hrv_df=None):
    print("⚙️ Engineering features...")
    df = df.copy()

    # =====================
    # BASIC FEATURES
    # =====================
    df["TrainingLoad"]   = df["TotalSteps"] * df["AvgHeartRate"]
    df["SleepEfficiency"] = (
        df["TotalMinutesAsleep"] /
        df["TotalTimeInBed"].replace(0, pd.NA)
    )

    # Sort for rolling
    df = df.sort_values(["Id", "Date"])

    # =====================
    # WEEKLY FEATURES
    # =====================
    df["WeeklyLoad"] = (
        df.groupby("Id")["TrainingLoad"]
        .rolling(7, min_periods=3)
        .mean()
        .reset_index(0, drop=True)
    )
    df["WeeklySleep"] = (
        df.groupby("Id")["TotalMinutesAsleep"]
        .rolling(7, min_periods=3)
        .mean()
        .reset_index(0, drop=True)
    )
    df["StepConsistency"] = (
        df.groupby("Id")["TotalSteps"]
        .rolling(7, min_periods=3)
        .std()
        .reset_index(0, drop=True)
    )

    # =====================
    # HRV FEATURE
    # =====================
    if add_hrv:
        if hrv_df is None: hrv_df = compute_daily_hrv()
        if hrv_df is not None:
            df["Date"] = pd.to_datetime(df["Date"])
            df = df.merge(hrv_df, on=["Id", "Date"], how="left")
            # 7-day rolling average HRV
            df["HRV_7d"] = (
                df.groupby("Id")["HRV"]
                .rolling(7, min_periods=1)
                .mean()
                .reset_index(0, drop=True)
            )
            print("✅ HRV columns added: HRV, HRV_7d")
        else:
            df["HRV"]    = np.nan
            df["HRV_7d"] = np.nan

    # =====================
    # ADVANCED FEATURES
    # =====================
    df = add_rolling_features(df)

    # =====================
    # CLEANUP
    # =====================
    df = df.bfill().ffill()
    print("✅ Feature engineering done")
    return df
