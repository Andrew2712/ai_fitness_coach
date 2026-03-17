# agents/session_agent.py

import pandas as pd


def detect_sessions(df):
    """
    Detect workout sessions based on heart rate.
    A session starts when HR > 110
    A session ends when HR < 90
    """

    sessions = []

    active = False
    start = None

    # Ensure correct column names
    if "HeartRate" in df.columns:
        hr_col = "HeartRate"
    elif "hr" in df.columns:
        hr_col = "hr"
    else:
        raise ValueError("No heart rate column found (hr / HeartRate)")

    if "Time" in df.columns:
        time_col = "Time"
    elif "time" in df.columns:
        time_col = "time"
    elif "Date" in df.columns:
        time_col = "Date"
    else:
        raise ValueError("No time column found (time / Time / Date)")

    for i in range(len(df)):

        hr = df.iloc[i][hr_col]
        time = df.iloc[i][time_col]

        # Start session
        if hr > 110 and not active:
            start = time
            active = True

        # End session
        elif hr < 90 and active:
            end = time
            sessions.append((start, end))
            active = False

    # Handle session that never ended
    if active and start is not None:
        end = df.iloc[-1][time_col]
        sessions.append((start, end))

    return sessions