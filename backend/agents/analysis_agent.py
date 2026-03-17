# agents/analysis_agent.py

import pandas as pd
import numpy as np


# ==========================
# RECOVERY RATE
# ==========================

def improved_recovery_rate(data):

    hr = data["AvgHeartRate"].rolling(3).mean()

    if len(hr) < 14:
        return 5.0

    recent = hr.tail(7).mean()
    previous = hr.iloc[-14:-7].mean()

    if pd.isna(recent) or pd.isna(previous):
        return 5.0

    change = ((recent - previous) / previous) * 100

    return round(change, 2)


# ==========================
# PROFILE
# ==========================

def build_profile(data):

    return {
        "avg_steps":    int(data["TotalSteps"].mean()),
        "max_steps":    int(data["TotalSteps"].max()),
        "avg_sleep":    int(data["TotalMinutesAsleep"].mean()),
        "sleep_std":    round(data["TotalMinutesAsleep"].std(), 2),
        "avg_hr":       int(data["AvgHeartRate"].mean()),
        "avg_cal":      int(data["Calories"].mean()),
        "recovery_rate":improved_recovery_rate(data),

        # ✅ Added for smarter goal + recovery personalisation
        "avg_hrv":      round(data["HRV"].mean(), 2) if "HRV" in data.columns else 2.0,
    }


# ==========================
# TRENDS
# ==========================

def analyze_trends(data):

    recent = data.tail(7)

    return {
        "step_trend": round(recent["TotalSteps"].diff().mean(), 2),
        "sleep_trend": round(recent["TotalMinutesAsleep"].diff().mean(), 2),
        "hr_trend": round(recent["AvgHeartRate"].diff().mean(), 2)
    }

# ==========================
# NEW: PROGRESS SCORE
# ==========================

def calculate_progress_score(profile, trends, fatigue):

    score = 50

    if profile["avg_steps"] > 8000:
        score += 10

    if profile["avg_sleep"] > 400:
        score += 10

    if profile["recovery_rate"] > 0:
        score += 10

    if fatigue == 2:
        score -= 15
    elif fatigue == 1:
        score -= 7

    if trends["hr_trend"] > 2:
        score -= 5

    return max(0, min(score, 100))


# ==========================
# NEW: RISK PREDICTION
# ==========================

def predict_risk(profile, fatigue, recovery_index):

    risk = "LOW"

    if fatigue == 2 and recovery_index <= 2:
        risk = "HIGH"

    elif fatigue == 1 and recovery_index <= 3:
        risk = "MEDIUM"

    return risk


# ==========================
# NEW: BURNOUT ALERT
# ==========================

def burnout_alert(profile, trends, fatigue):

    if (
        fatigue == 2 and
        profile["avg_sleep"] < 360 and
        trends["hr_trend"] > 2
    ):
        return "⚠️ HIGH BURNOUT RISK"

    if fatigue == 2:
        return "⚠️ MODERATE BURNOUT RISK"

    return "✅ LOW BURNOUT RISK"


# ==========================
# NEW: WEEKLY FORECAST
# ==========================

def weekly_forecast(trends, fatigue):

    if fatigue == 2:
        return "Next week: Focus on recovery and light activity."

    if trends["step_trend"] > 500:
        return "Next week: Performance likely to improve."

    if trends["sleep_trend"] < -10:
        return "Next week: Risk of fatigue if sleep declines."

    return "Next week: Stable performance expected."


# ==========================
# RECOVERY INDEX
# ==========================

def calculate_recovery_index(profile, trends):

    score = 0

    if profile["avg_sleep"] > 420:
        score += 2
    elif profile["avg_sleep"] > 300:
        score += 1

    if profile["recovery_rate"] > 0:
        score += 2
    elif profile["recovery_rate"] > -3:
        score += 1

    if trends["hr_trend"] <= 0:
        score += 1

    return min(score, 5)


# ==========================
# RECOVERY PLAN
# ==========================

def generate_recovery_plan(fatigue, recovery_index, profile={}):

    # ── Pull user's own baseline ──────────────────────────
    avg_steps  = int(profile.get("avg_steps", 7500))
    avg_sleep  = int(profile.get("avg_sleep", 420))    # minutes
    avg_hrv    = round(profile.get("avg_hrv",  2.0), 1)
    avg_cal    = int(profile.get("avg_cal",    2000))

    # ── Personalised targets based on their own numbers ───
    sleep_hrs       = max(480, int(avg_sleep * 1.15)) // 60   # 15% above their avg
    step_rest       = int(avg_steps * 0.30)                   # 30% of avg on rest days
    step_light      = int(avg_steps * 0.55)                   # 55% on light days
    step_moderate   = int(avg_steps * 0.75)                   # 75% on moderate days
    step_return     = int(avg_steps * 0.90)                   # 90% on return day
    cal_target      = int(avg_cal * 0.90)                     # slight deficit on rest

    # ── Plan length (your original logic kept) ────────────
    days = 3 + (5 - recovery_index)

    if fatigue == 2:
        days += 3
    elif fatigue == 1:
        days += 1

    days = min(days, 10)

    # ── Build personalised plan ───────────────────────────
    plan = []

    for i in range(1, days + 1):

        # First 2 days — full rest
        if i <= 2:
            if fatigue == 2:
                plan.append(
                    f"Day {i}: Full Rest — max {step_rest:,} steps, "
                    f"sleep {sleep_hrs}h+, hydrate 3L"
                )
            else:
                plan.append(
                    f"Day {i}: Rest + Sleep — max {step_light:,} steps, "
                    f"sleep {sleep_hrs}h+"
                )

        # Middle days — light to moderate activity
        elif i < days - 1:
            if i <= days // 2:
                plan.append(
                    f"Day {i}: Light Activity — {step_light:,} steps, "
                    f"20–30 min walk, sleep {sleep_hrs}h"
                )
            else:
                plan.append(
                    f"Day {i}: Moderate Activity — {step_moderate:,} steps, "
                    f"30–45 min, HRV check (target >{avg_hrv})"
                )

        # Second to last day — test readiness
        elif i == days - 1:
            plan.append(
                f"Day {i}: Readiness Check — {step_moderate:,} steps, "
                f"check HRV + energy before final day"
            )

        # Last day — return to training
        else:
            plan.append(
                f"Day {i}: Return to Training — target {step_return:,} steps, "
                f"moderate intensity only"
            )

    return plan