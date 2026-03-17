def analyze_trends(df):

    recent = df.tail(10)

    return {
      "fatigue_trend": recent["TotalSteps"].diff().mean(),
      "sleep_trend": recent["TotalMinutesAsleep"].mean(),
      "hr_trend": recent["AvgHeartRate"].diff().mean()
    }
