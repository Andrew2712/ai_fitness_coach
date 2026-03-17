import pandas as pd


def label_session_fatigue(df):

    df = df.copy()

    df["fatigue"] = 0

    # Rule-based labeling
    df.loc[
        (df["avg_hr"] > 135) &
        (df["duration"] > 25),
        "fatigue"
    ] = 2

    df.loc[
        (df["avg_hr"] > 115) &
        (df["duration"] > 15),
        "fatigue"
    ] = 1

    return df