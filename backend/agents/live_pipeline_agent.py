"""
Live Pipeline Agent — feeds real Fitbit + Strava data into the ML pipeline
to generate personalized fatigue, readiness, recovery plan and goal.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def build_live_features(fitbit_data: dict, strava_data: dict, user_id: str) -> dict:
    """
    Convert Fitbit + Strava live data into ML feature vector.
    Returns a dict matching models/features.json
    """
    # ── Raw fields from Fitbit ──────────────────────────────────────────────
    total_steps          = fitbit_data.get("TotalSteps", 0) or 0
    calories             = fitbit_data.get("Calories", 0) or 0
    total_minutes_asleep = fitbit_data.get("TotalMinutesAsleep", 0) or 0
    total_time_in_bed    = fitbit_data.get("TotalTimeInBed", 0) or 0
    avg_hr               = fitbit_data.get("AvgHeartRate", 72) or 72
    hrv                  = fitbit_data.get("HRV", None)

    # ── Raw fields from Strava ──────────────────────────────────────────────
    week  = strava_data.get("week", {}) if strava_data else {}
    month = strava_data.get("month", {}) if strava_data else {}

    distance_7d_m  = (week.get("distance_km", 0) or 0) * 1000
    time_7d_min    = week.get("time_min", 0) or 0
    elevation_7d   = week.get("elevation_m", 0) or 0
    avg_pace       = week.get("avg_pace_min_km", 6) or 6
    activities_7d  = week.get("count", 0) or 0

    # ── Derived features ────────────────────────────────────────────────────
    training_load    = total_steps * avg_hr
    sleep_efficiency = (total_minutes_asleep / total_time_in_bed) if total_time_in_bed > 0 else 0.85

    # Session intensity from Strava: normalize pace + elevation
    if activities_7d > 0:
        pace_score      = max(0, (8 - avg_pace) / 8)       # faster = higher intensity
        elevation_score = min(elevation_7d / 500, 1.0)      # cap at 500m
        session_intensity = round((pace_score + elevation_score) / 2, 3)
    else:
        session_intensity = 0.3  # neutral if no activities

    # Weekly rolling estimates (using 7-day Strava data as proxy)
    weekly_load  = training_load * 0.85   # slight decay for weekly average
    weekly_sleep = total_minutes_asleep   # today's sleep as proxy

    # Step consistency — use strava activities as proxy for variability
    step_consistency = total_steps * 0.15 if activities_7d > 0 else total_steps * 0.25

    # HRV features
    hrv_val  = hrv if hrv is not None else 2.0
    hrv_7d   = hrv_val  # single day — use same value

    # 7-day rolling features from Strava month data
    steps_7d    = total_steps
    sleep_7d    = total_minutes_asleep
    cal_7d      = calories
    intensity_7d = session_intensity

    # Fatigue trend — derive from month vs week ratio
    month_distance = month.get("distance_km", 0) or 0
    week_distance  = week.get("distance_km", 0) or 0
    if month_distance > 0:
        weekly_ratio  = week_distance / (month_distance / 4)
        fatigue_trend = round(min(max(weekly_ratio - 1.0, -1.0), 1.0), 3)
    else:
        fatigue_trend = 0.0

    return {
        "TotalSteps":         total_steps,
        "Calories":           calories,
        "TotalMinutesAsleep": total_minutes_asleep,
        "TotalTimeInBed":     total_time_in_bed,
        "AvgHeartRate":       avg_hr,
        "TrainingLoad":       training_load,
        "SleepEfficiency":    sleep_efficiency,
        "WeeklyLoad":         weekly_load,
        "WeeklySleep":        weekly_sleep,
        "StepConsistency":    step_consistency,
        "HRV":                hrv_val,
        "HRV_7d":             hrv_7d,
        "session_intensity":  session_intensity,
        "7d_steps":           steps_7d,
        "7d_sleep":           sleep_7d,
        "7d_cal":             cal_7d,
        "7d_intensity":       intensity_7d,
        "fatigue_trend":      fatigue_trend,
    }


def run_live_pipeline(user_id: str) -> dict:
    """
    Full pipeline: load Fitbit + Strava data → build features →
    run ML model → generate readiness, recovery plan, goal.
    """
    from agents.fitbit_agent import load_tokens as fitbit_load, fetch_today as fitbit_fetch
    from agents.strava_agent import load_tokens as strava_load, fetch_stats as strava_fetch
    from agents.inference_agent import predict_fatigue
    from agents.fusion_agent import get_session_fatigue, fuse_fatigue
    from agents.health_agent import compute_health
    from agents.analysis_agent import calculate_recovery_index, calculate_progress_score

    result = {
        "source": "live",
        "fitbit": False,
        "strava": False,
        "features": {},
        "fatigue": None,
        "health": None,
        "progress": None,
        "recovery_index": None,
        "risk": "UNKNOWN",
        "burnout": "Insufficient live data",
    }

    # ── Fetch live data ─────────────────────────────────────────────────────
    fitbit_data, strava_data = {}, {}

    fitbit_tokens = fitbit_load(user_id)
    if fitbit_tokens:
        try:
            fitbit_data = fitbit_fetch(user_id)
            result["fitbit"] = True
        except Exception as e:
            print(f"Fitbit fetch error: {e}")

    strava_tokens = strava_load(user_id)
    if strava_tokens:
        try:
            strava_data = strava_fetch(user_id)
            result["strava"] = True
        except Exception as e:
            print(f"Strava fetch error: {e}")

    if not fitbit_data and not strava_data:
        result["burnout"] = "⚠️ Connect Fitbit or Strava to get live analysis"
        return result

    # ── Build feature vector ────────────────────────────────────────────────
    features = build_live_features(fitbit_data, strava_data, user_id)
    result["features"] = features

    # ── Run ML model ────────────────────────────────────────────────────────
    try:
        daily_fatigue   = predict_fatigue(features)
        session_fatigue = features["session_intensity"]
        fatigue_score   = fuse_fatigue(daily_fatigue, session_fatigue)
        fatigue_level   = 0 if fatigue_score < 0.7 else 1 if fatigue_score < 1.4 else 2
        result["fatigue"] = fatigue_level
    except Exception as e:
        print(f"ML prediction error: {e}")
        fatigue_level = 1  # default medium

    # ── Build profile for decision agents ──────────────────────────────────
    profile = {
        "avg_steps":     features["TotalSteps"],
        "avg_sleep":     features["TotalMinutesAsleep"],
        "avg_hr":        features["AvgHeartRate"],
        "avg_cal":       features["Calories"],
        "avg_hrv":       features["HRV"],
        "recovery_rate": 0,
    }

    trends = {
        "step_trend":  features["fatigue_trend"] * 100,
        "sleep_trend": 0,
        "hr_trend":    0,
    }

    # ── Compute health score ────────────────────────────────────────────────
    recovery_index = calculate_recovery_index(profile, trends)
    progress       = calculate_progress_score(profile, trends, fatigue_level)
    health         = compute_health(fatigue_level, recovery_index, progress)

    result["health"]         = health
    result["progress"]       = progress
    result["recovery_index"] = recovery_index

    # ── Risk assessment ─────────────────────────────────────────────────────
    if fatigue_level == 2:
        result["risk"]    = "HIGH"
        result["burnout"] = "🔴 HIGH BURNOUT RISK — reduce training load"
    elif fatigue_level == 1:
        result["risk"]    = "MEDIUM"
        result["burnout"] = "🟡 MODERATE LOAD — monitor recovery closely"
    else:
        result["risk"]    = "LOW"
        result["burnout"] = "✅ LOW BURNOUT RISK — maintain current approach"

    # ── Add profile/trends to result ────────────────────────────────────────
    result["profile"] = profile
    result["trends"]  = trends

    return result
