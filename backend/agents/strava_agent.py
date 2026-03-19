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

def refresh_tokens(refresh_token: str) -> dict:
    client_id     = os.getenv("STRAVA_CLIENT_ID")
    client_secret = os.getenv("STRAVA_CLIENT_SECRET")
    r = requests.post("https://www.strava.com/oauth/token", data={
        "client_id":     client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type":    "refresh_token",
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

def fetch_today(user_id: str) -> dict:
    tokens = load_tokens(user_id)
    if not tokens:
        raise Exception("Strava not connected")

    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # Get athlete profile
    athlete = requests.get("https://www.strava.com/api/v3/athlete", headers=headers).json()

    # Get recent activities (last 7 days)
    after = int(datetime.now().timestamp()) - 7 * 86400
    acts = requests.get(
        f"https://www.strava.com/api/v3/athlete/activities?after={after}&per_page=10",
        headers=headers
    ).json()

    # Get stats
    athlete_id = tokens.get("athlete_id") or athlete.get("id")
    stats = requests.get(
        f"https://www.strava.com/api/v3/athletes/{athlete_id}/stats",
        headers=headers
    ).json()

    total_distance = sum(a.get("distance", 0) for a in acts) if isinstance(acts, list) else 0
    total_time     = sum(a.get("moving_time", 0) for a in acts) if isinstance(acts, list) else 0
    total_calories = sum(a.get("calories", 0) for a in acts) if isinstance(acts, list) else 0
    avg_hr         = None
    hr_acts        = [a for a in acts if isinstance(acts, list) and a.get("average_heartrate")]
    if hr_acts:
        avg_hr = round(sum(a["average_heartrate"] for a in hr_acts) / len(hr_acts), 1)

    return {
        "athlete":        f"{athlete.get('firstname', '')} {athlete.get('lastname', '')}".strip(),
        "activities_7d":  len(acts) if isinstance(acts, list) else 0,
        "distance_7d_km": round(total_distance / 1000, 2),
        "time_7d_min":    round(total_time / 60, 1),
        "calories_7d":    total_calories,
        "avg_hr":         avg_hr,
        "ytd_runs":       stats.get("ytd_run_totals", {}).get("count", 0),
        "ytd_km":         round(stats.get("ytd_run_totals", {}).get("distance", 0) / 1000, 1),
    }
