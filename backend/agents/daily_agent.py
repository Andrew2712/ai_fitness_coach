# agents/daily_agent.py

def build_daily_summary(sessions):

    return {
        "total_sessions": len(sessions),
        "total_load": sum(s["duration"] for s in sessions),
        "total_cal": sum(s["calories"] for s in sessions),
        "avg_intensity": sum(s["avg_hr"] for s in sessions)/len(sessions)
    }