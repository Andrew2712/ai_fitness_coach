import os, requests, json
from datetime import date

REDIRECT_URI = "https://aifitnesscoach-production-373b.up.railway.app/fitbit/callback"
SCOPE        = "activity sleep heartrate profile"

def get_auth_url(state=None):
    client_id = os.getenv("FITBIT_CLIENT_ID")
    url = (
        f"https://www.fitbit.com/oauth2/authorize"
        f"?response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={REDIRECT_URI}"
        f"&scope={SCOPE.replace(' ', '%20')}"
        f"&expires_in=604800"
    )
    if state:
        url += f"&state={state}"
    return url

def exchange_code(code: str) -> dict:
    client_id     = os.getenv("FITBIT_CLIENT_ID")
    client_secret = os.getenv("FITBIT_CLIENT_SECRET")
    r = requests.post(
        "https://api.fitbit.com/oauth2/token",
        data={
            "code":         code,
            "grant_type":   "authorization_code",
            "redirect_uri": REDIRECT_URI,
            "client_id":    client_id,
        },
        auth=(client_id, client_secret)
    )
    return r.json()

def save_tokens(tokens: dict, user_id: str):
    """Save tokens to PostgreSQL database."""
    try:
        from database import SessionLocal, DBUser
        db = SessionLocal()
        user = db.query(DBUser).filter(DBUser.id == int(user_id)).first()
        if user:
            user.fitbit_user_id      = tokens.get("user_id")
            user.fitbit_access_token  = tokens.get("access_token")
            user.fitbit_refresh_token = tokens.get("refresh_token")
            db.commit()
        db.close()
    except Exception as e:
        print(f"Error saving tokens to DB: {e}")

def load_tokens(user_id: str) -> dict:
    """Load tokens from PostgreSQL database."""
    try:
        from database import SessionLocal, DBUser
        db = SessionLocal()
        user = db.query(DBUser).filter(DBUser.id == int(user_id)).first()
        db.close()
        if user and user.fitbit_access_token:
            return {
                "access_token":  user.fitbit_access_token,
                "refresh_token": user.fitbit_refresh_token,
                "user_id":       user.fitbit_user_id,
            }
        return {}
    except Exception as e:
        print(f"Error loading tokens from DB: {e}")
        return {}

def refresh_tokens(user_id: str) -> dict:
    client_id     = os.getenv("FITBIT_CLIENT_ID")
    client_secret = os.getenv("FITBIT_CLIENT_SECRET")
    tokens = load_tokens(user_id)
    r = requests.post(
        "https://api.fitbit.com/oauth2/token",
        data={
            "grant_type":    "refresh_token",
            "refresh_token": tokens["refresh_token"],
        },
        auth=(client_id, client_secret)
    )
    new_tokens = r.json()
    save_tokens(new_tokens, user_id)
    return new_tokens

def fetch_today(user_id: str) -> dict:
    tokens = load_tokens(user_id)
    if not tokens:
        raise Exception(f"No tokens for user {user_id} — connect Fitbit first.")

    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    today   = date.today().strftime("%Y-%m-%d")

    def get(url):
        r = requests.get(url, headers=headers)
        if r.status_code == 401:
            new_tokens = refresh_tokens(user_id)
            headers["Authorization"] = f"Bearer {new_tokens['access_token']}"
            r = requests.get(url, headers=headers)
        return r.json()

    act = get(f"https://api.fitbit.com/1/user/-/activities/date/{today}.json")
    slp = get(f"https://api.fitbit.com/1.2/user/-/sleep/date/{today}.json")
    hr  = get(f"https://api.fitbit.com/1/user/-/activities/heart/date/{today}/1d/1min.json")

    try:
        hrv_data = get(f"https://api.fitbit.com/1/user/-/hrv/date/{today}.json")
        hrv_val  = hrv_data.get("hrv", [{}])[0].get("value", {}).get("dailyRmssd", None)
    except:
        hrv_val = None

    summary   = act.get("summary", {})
    sleep_sum = slp.get("summary", {})
    hr_data   = hr.get("activities-heart-intraday", {}).get("dataset", [])
    avg_hr    = round(sum(d["value"] for d in hr_data) / len(hr_data), 2) if hr_data else None

    return {
        "Id":                 user_id,
        "Date":               today,
        "TotalSteps":         summary.get("steps", 0),
        "Calories":           summary.get("caloriesOut", 0),
        "TotalMinutesAsleep": sleep_sum.get("totalMinutesAsleep", 0),
        "TotalTimeInBed":     sleep_sum.get("totalTimeInBed", 0),
        "AvgHeartRate":       avg_hr,
        "HRV":                hrv_val,
    }
