import datetime

LOG_FILE = "logs/system.log"

def log(msg):

    t = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    with open(LOG_FILE, "a") as f:
        f.write(f"[{t}] {msg}\n")