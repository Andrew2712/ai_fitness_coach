import pandas as pd


def get_session_fatigue(uid):

    try:
        df = pd.read_csv("data/session_data.csv")

        user = df[df["Id"] == int(uid)]

        if user.empty:
            return 0.5   # neutral

        # Use last 5 sessions
        return user["session_intensity"].tail(5).mean()

    except:
        return 0.5


def fuse_fatigue(daily_fatigue, session_fatigue):

    # Weighted fusion
    return round(
        0.6 * daily_fatigue + 0.4 * session_fatigue,
        2
    )