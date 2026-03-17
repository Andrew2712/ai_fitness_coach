def build_profile(df):

    return {
      "avg_steps": df["TotalSteps"].mean(),
      "max_steps": df["TotalSteps"].max(),
      "sleep_std": df["TotalMinutesAsleep"].std(),
      "hr_avg": df["AvgHeartRate"].mean(),
      "recovery_rate": df["AvgHeartRate"].diff().mean()
    }
