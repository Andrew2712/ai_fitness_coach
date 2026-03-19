import os, requests
from datetime import datetime

REDIRECT_URI = "https://aifitnesscoach-production-373b.up.railway.app/strava/callback"
SCOPE = "read,activity:read_all,profile:read_all"

def get_auth_url(state=None):
    client_id = os.getenv("STRAVA_CLIENT_ID")
    url = (
        f"https://www.strava.com/oauth/authorize"
        f"?client_id={client_id}"
        f"&response_type=code"
        f"&redirect_uri={REDIRECT_URI}"
        f"&approval_prompt=force"
        f"&scope={SCOPE}"
    )
    if state:
        url += f"&state={state}"
    return url

def exchange_code(code: str) -> dict:
    client_id     = os.getenv("STRAVA_CLIENT_ID")
    client_secret = os.getenv("STRAVA_CLIENT_SECRET")
    r = requests.post("https://www.strava.com/oauth/token", data={
        "client_id":     client_id,
        "client_secret": client_secret,
        "code":          code,
        "grant_type":    "authorization_code",
    })
    return r.json()

def save_tokens(tokens: dict, user_id: str):
    try:
        from database import SessionLocal, User as DBUser
        db = SessionLocal()
        user = db.query(DBUser).filter(DBUser.id == int(user_id)).first()
        if user:
            user.strava_access_token  = tokens.get("access_token")
            user.strava_refresh_token = tokens.get("refresh_token")
            user.strava_athlete_id    = str(tokens.get("athlete", {}).get("id", ""))
            db.commit()
        db.close()
    except Exception as e:
        print(f"Error saving Strava tokens: {e}")

def load_tokens(user_id: str) -> dict:
    try:
        from database import SessionLocal, User as DBUser
        db = SessionLocal()
        user = db.query(DBUser).filter(DBUser.id == int(user_id)).first()
        db.close()
        if user and user.strava_access_token:
            return {
                "access_token":  user.strava_access_token,
                "refresh_token": user.strava_refresh_token,
                "athlete_id":    user.strava_athlete_id,
            }
        return {}
    except Exception as e:
        print(f"Error loading Strava tokens: {e}")
        return {}

def disconnect(user_id: str):
    try:
        from database import SessionLocal, User as DBUser
        db = SessionLocal()
        user = db.query(DBUser).filter(DBUser.id == int(user_id)).first()
        if user:
            user.strava_access_token  = None
            user.strava_refresh_token = None
            user.strava_athlete_id    = None
            db.commit()
        db.close()
    except Exception as e:
        print(f"Error disconnecting Strava: {e}")

def fetch_stats(user_id: str) -> dict:
    tokens = load_tokens(user_id)
    if not tokens:
        raise Exception("Strava not connected")

    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Athlete profile
    athlete = requests.get("https://www.strava.com/api/v3/athlete", headers=headers).json()

    # Last 30 days activities
    after_30 = int(datetime.now().timestamp()) - 30 * 86400
    after_7  = int(datetime.now().timestamp()) - 7 * 86400

    acts_30 = requests.get(
        f"https://www.strava.com/api/v3/athlete/activities?after={after_30}&per_page=50",
        headers=headers
    ).json()
    acts_30 = acts_30 if isinstance(acts_30, list) else []
    acts_7  = [a for a in acts_30 if a.get("start_date_local", "") >= datetime.fromtimestamp(after_7).strftime("%Y-%m-%d")]

    # Athlete stats
    athlete_id = tokens.get("athlete_id") or str(athlete.get("id", ""))
    stats = requests.get(
        f"https://www.strava.com/api/v3/athletes/{athlete_id}/stats",
        headers=headers
    ).json()

    # Per activity type breakdown
    def summarize(acts):
        runs  = [a for a in acts if a.get("type") == "Run"]
        rides = [a for a in acts if a.get("type") == "Ride"]
        walks = [a for a in acts if a.get("type") in ["Walk","Hike"]]
        hr_acts = [a for a in acts if a.get("average_heartrate")]
        return {
            "count":       len(acts),
            "runs":        len(runs),
            "rides":       len(rides),
            "walks":       len(walks),
            "distance_km": round(sum(a.get("distance",0) for a in acts) / 1000, 2),
            "time_min":    round(sum(a.get("moving_time",0) for a in acts) / 60, 1),
            "calories":    sum(a.get("calories",0) for a in acts),
            "elevation_m": round(sum(a.get("total_elevation_gain",0) for a in acts), 1),
            "avg_hr":      round(sum(a["average_heartrate"] for a in hr_acts) / len(hr_acts), 1) if hr_acts else None,
            "max_hr":      max((a.get("max_heartrate",0) for a in hr_acts), default=None),
            "avg_speed_kmh": round(sum(a.get("average_speed",0) for a in runs) / len(runs) * 3.6, 2) if runs else None,
            "avg_pace_min_km": round(1 / (sum(a.get("average_speed",0) for a in runs) / len(runs) / 1000 * 60), 2) if runs and sum(a.get("average_speed",0) for a in runs) > 0 else None,
        }

    w7  = summarize(acts_7)
    w30 = summarize(acts_30)

    # Recent activities list
    recent = []
    for a in sorted(acts_30, key=lambda x: x.get("start_date",""), reverse=True)[:5]:
        recent.append({
            "name":        a.get("name", "Activity"),
            "type":        a.get("type", ""),
            "date":        a.get("start_date_local", "")[:10],
            "distance_km": round(a.get("distance", 0) / 1000, 2),
            "time_min":    round(a.get("moving_time", 0) / 60, 1),
            "avg_hr":      a.get("average_heartrate"),
            "elevation_m": a.get("total_elevation_gain", 0),
            "kudos":       a.get("kudos_count", 0),
        })

    return {
        "athlete":       f"{athlete.get('firstname','')} {athlete.get('lastname','')}".strip(),
        "city":          athlete.get("city", ""),
        "country":       athlete.get("country", ""),
        "followers":     athlete.get("follower_count", 0),
        "following":     athlete.get("friend_count", 0),
        "week":          w7,
        "month":         w30,
        "ytd_runs":      stats.get("ytd_run_totals", {}).get("count", 0),
        "ytd_km":        round(stats.get("ytd_run_totals", {}).get("distance", 0) / 1000, 1),
        "ytd_time_h":    round(stats.get("ytd_run_totals", {}).get("moving_time", 0) / 3600, 1),
        "ytd_elevation": round(stats.get("ytd_run_totals", {}).get("elevation_gain", 0), 0),
        "all_runs":      stats.get("all_run_totals", {}).get("count", 0),
        "all_km":        round(stats.get("all_run_totals", {}).get("distance", 0) / 1000, 1),
        "recent":        recent,
    }
