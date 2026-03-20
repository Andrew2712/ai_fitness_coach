"""
Live Pipeline Agent — feeds real Fitbit OR Strava data into the ML pipeline.
Priority: user's chosen source → Fitbit → Strava → fallback
"""
import pandas as pd
import numpy as np

def build_features_from_fitbit(fitbit_data: dict) -> dict:
    total_steps          = fitbit_data.get("TotalSteps", 0) or 0
    calories             = fitbit_data.get("Calories", 0) or 0
    total_minutes_asleep = fitbit_data.get("TotalMinutesAsleep", 0) or 0
    total_time_in_bed    = fitbit_data.get("TotalTimeInBed", 0) or 0
    avg_hr               = fitbit_data.get("AvgHeartRate", 72) or 72
    hrv                  = fitbit_data.get("HRV", None)

    training_load    = total_steps * avg_hr
    sleep_efficiency = (total_minutes_asleep / total_time_in_bed) if total_time_in_bed > 0 else 0.85
    hrv_val          = hrv if hrv is not None else 2.0

    return {
        "TotalSteps":         total_steps,
        "Calories":           calories,
        "TotalMinutesAsleep": total_minutes_asleep,
        "TotalTimeInBed":     total_time_in_bed,
        "AvgHeartRate":       avg_hr,
        "TrainingLoad":       training_load,
        "SleepEfficiency":    sleep_efficiency,
        "WeeklyLoad":         training_load * 0.85,
        "WeeklySleep":        total_minutes_asleep,
        "StepConsistency":    total_steps * 0.2,
        "HRV":                hrv_val,
        "HRV_7d":             hrv_val,
        "session_intensity":  0.3,
        "7d_steps":           total_steps,
        "7d_sleep":           total_minutes_asleep,
        "7d_cal":             calories,
        "7d_intensity":       0.3,
        "fatigue_trend":      0.0,
        "_source":            "fitbit",
    }


def build_features_from_strava(strava_data: dict) -> dict:
    week  = strava_data.get("week", {}) or {}
    month = strava_data.get("month", {}) or {}

    activities_7d  = week.get("count", 0) or 0
    avg_pace       = week.get("avg_pace_min_km", 6) or 6
    elevation_7d   = week.get("elevation_m", 0) or 0
    distance_7d    = week.get("distance_km", 0) or 0
    time_7d_min    = week.get("time_min", 0) or 0
    avg_hr         = week.get("avg_hr", 72) or 72
    calories       = week.get("calories", 0) or 0

    # Estimate steps from distance (avg ~1300 steps/km)
    estimated_steps = int(distance_7d * 1300 / max(activities_7d, 1))

    # Session intensity from pace + elevation
    if activities_7d > 0:
        pace_score        = max(0, (8 - avg_pace) / 8)
        elevation_score   = min(elevation_7d / 500, 1.0)
        session_intensity = round((pace_score + elevation_score) / 2, 3)
    else:
        session_intensity = 0.0

    training_load = estimated_steps * avg_hr

    # Fatigue trend from month vs week ratio
    month_distance = month.get("distance_km", 0) or 0
    if month_distance > 0:
        weekly_ratio  = distance_7d / (month_distance / 4)
        fatigue_trend = round(min(max(weekly_ratio - 1.0, -1.0), 1.0), 3)
    else:
        fatigue_trend = 0.0

    # Estimate sleep (Strava doesn't have sleep — use neutral value)
    estimated_sleep    = 420  # 7 hours neutral
    estimated_in_bed   = 480  # 8 hours neutral
    sleep_efficiency   = estimated_sleep / estimated_in_bed

    return {
        "TotalSteps":         estimated_steps,
        "Calories":           calories,
        "TotalMinutesAsleep": estimated_sleep,
        "TotalTimeInBed":     estimated_in_bed,
        "AvgHeartRate":       avg_hr,
        "TrainingLoad":       training_load,
        "SleepEfficiency":    sleep_efficiency,
        "WeeklyLoad":         training_load * 0.85,
        "WeeklySleep":        estimated_sleep,
        "StepConsistency":    estimated_steps * 0.15,
        "HRV":                2.0,
        "HRV_7d":             2.0,
        "session_intensity":  session_intensity,
        "7d_steps":           estimated_steps,
        "7d_sleep":           estimated_sleep,
        "7d_cal":             calories,
        "7d_intensity":       session_intensity,
        "fatigue_trend":      fatigue_trend,
        "_source":            "strava",
    }


def run_live_pipeline(user_id: str, preferred_source: str = "auto") -> dict:
    """
    preferred_source: "fitbit" | "strava" | "auto"
    auto = use whichever is connected, prefer fitbit if both
    """
    from agents.fitbit_agent import load_tokens as fitbit_load, fetch_today as fitbit_fetch
    from agents.strava_agent import load_tokens as strava_load, fetch_stats as strava_fetch
    from agents.inference_agent import predict_fatigue
    from agents.fusion_agent import fuse_fatigue
    from agents.health_agent import compute_health
    from agents.analysis_agent import calculate_recovery_index, calculate_progress_score

    result = {
        "source":        "none",
        "fitbit_available": False,
        "strava_available": False,
        "features":      {},
        "fatigue":       None,
        "health":        None,
        "progress":      None,
        "recovery_index": None,
        "risk":          "UNKNOWN",
        "burnout":       "Connect Fitbit or Strava for live analysis",
        "profile":       {},
        "trends":        {},
    }

    # ── Check what's available ──────────────────────────────────────────────
    fitbit_tokens = fitbit_load(user_id)
    strava_tokens = strava_load(user_id)
    result["fitbit_available"] = bool(fitbit_tokens)
    result["strava_available"] = bool(strava_tokens)

    # ── Load data based on preferred source ─────────────────────────────────
    features = None

    if preferred_source == "fitbit" and fitbit_tokens:
        try:
            fitbit_data = fitbit_fetch(user_id)
            features    = build_features_from_fitbit(fitbit_data)
            result["source"] = "fitbit"
        except Exception as e:
            print(f"Fitbit error: {e}")

    elif preferred_source == "strava" and strava_tokens:
        try:
            strava_data = strava_fetch(user_id)
            features    = build_features_from_strava(strava_data)
            result["source"] = "strava"
        except Exception as e:
            print(f"Strava error: {e}")

    elif preferred_source == "auto":
        # Try Fitbit first, then Strava
        if fitbit_tokens:
            try:
                fitbit_data = fitbit_fetch(user_id)
                features    = build_features_from_fitbit(fitbit_data)
                result["source"] = "fitbit"
            except Exception as e:
                print(f"Fitbit error: {e}")

        if features is None and strava_tokens:
            try:
                strava_data = strava_fetch(user_id)
                features    = build_features_from_strava(strava_data)
                result["source"] = "strava"
            except Exception as e:
                print(f"Strava error: {e}")

    if features is None:
        return result

    result["features"] = {k: v for k, v in features.items() if not k.startswith("_")}

    # ── Run ML model ────────────────────────────────────────────────────────
    try:
        clean_features  = {k: v for k, v in features.items() if not k.startswith("_")}
        daily_fatigue   = predict_fatigue(clean_features)
        session_fatigue = features["session_intensity"]
        fatigue_score   = fuse_fatigue(daily_fatigue, session_fatigue)
        fatigue_level   = 0 if fatigue_score < 0.7 else 1 if fatigue_score < 1.4 else 2
        result["fatigue"] = fatigue_level
    except Exception as e:
        print(f"ML error: {e}")
        fatigue_level = 1

    # ── Build profile ───────────────────────────────────────────────────────
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

    recovery_index = calculate_recovery_index(profile, trends)
    progress       = calculate_progress_score(profile, trends, fatigue_level)
    health         = compute_health(fatigue_level, recovery_index, progress)

    result["health"]         = health
    result["progress"]       = progress
    result["recovery_index"] = recovery_index
    result["profile"]        = profile
    result["trends"]         = trends

    if fatigue_level == 2:
        result["risk"]    = "HIGH"
        result["burnout"] = "🔴 HIGH BURNOUT RISK — reduce training load"
    elif fatigue_level == 1:
        result["risk"]    = "MEDIUM"
        result["burnout"] = "🟡 MODERATE LOAD — monitor recovery closely"
    else:
        result["risk"]    = "LOW"
        result["burnout"] = "✅ LOW BURNOUT RISK — maintain current approach"

    return result
