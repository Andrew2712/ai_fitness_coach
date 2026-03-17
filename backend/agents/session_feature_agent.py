import pandas as pd


def build_session_features(df, sessions):

    print("⚙️ Building session features...")

    rows = []

    # Safe user id (prevents KeyError)
    if "Id" in df.columns:
        user_id = df["Id"].iloc[0]
    else:
        user_id = None
        print("⚠️ Warning: No 'Id' column found in dataframe")

    for start, end in sessions:

        # Filter session chunk
        chunk = df[
            (df["time"] >= start) &
            (df["time"] <= end)
        ]

        # Skip very small sessions
        if len(chunk) < 5:
            continue

        # Core metrics
        avg_hr = chunk["hr"].mean()
        max_hr = chunk["hr"].max()
        steps = chunk["steps"].sum()
        calories = chunk["calories"].sum()
        duration = len(chunk) * 5 / 60    # minutes
        hrv = chunk["hr"].std()

        # -------------------------
        # Session Intensity (NEW)
        # -------------------------
        # Normalized score (0–1+)
        intensity = (
            (avg_hr / 190) +
            (duration / 60)
        ) / 2

        # Build row
        row = {
            "Id": user_id,
            "start": start,
            "end": end,

            "avg_hr": round(avg_hr, 2),
            "max_hr": round(max_hr, 2),

            "steps": int(steps),

            "calories": round(calories, 2),

            "duration": round(duration, 2),

            "hr_variability": round(hrv, 2),

            # ✅ Added field
            "session_intensity": round(intensity, 3)
        }

        rows.append(row)

    session_df = pd.DataFrame(rows)

    print("✅ Session features created:")
    print(session_df.columns)

    return session_df