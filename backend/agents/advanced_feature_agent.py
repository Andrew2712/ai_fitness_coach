# agents/advanced_feature_agent.py

import pandas as pd


def add_rolling_features(df):

    df = df.sort_values(["Id", "Date"])


    # =====================
    # SAFE SESSION INTENSITY
    # =====================

    if "session_intensity" not in df.columns:
        df["session_intensity"] = 0


    # =====================
    # ROLLING FEATURES
    # =====================

    df["7d_steps"] = (
        df.groupby("Id")["TotalSteps"]
        .rolling(7, min_periods=3)
        .mean()
        .reset_index(0, drop=True)
    )

    df["7d_sleep"] = (
        df.groupby("Id")["TotalMinutesAsleep"]
        .rolling(7, min_periods=3)
        .mean()
        .reset_index(0, drop=True)
    )

    df["7d_cal"] = (
        df.groupby("Id")["Calories"]
        .rolling(7, min_periods=3)
        .mean()
        .reset_index(0, drop=True)
    )

    df["7d_intensity"] = (
        df.groupby("Id")["session_intensity"]
        .rolling(7, min_periods=3)
        .mean()
        .reset_index(0, drop=True)
    )


    # =====================
    # FATIGUE TREND
    # =====================

    df["fatigue_trend"] = (
        df["7d_intensity"] -
        df["7d_sleep"] / 500
    )


    # =====================
    # CLEAN
    # =====================

    df = df.fillna(0)

    return df