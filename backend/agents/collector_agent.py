# agents/collector_agent.py

import csv
import time
import random
from datetime import datetime

FILE = "data/raw_stream.csv"


def collect_data(user_id):

    with open(FILE, "a", newline="") as f:

        writer = csv.writer(f)

        while True:

            writer.writerow([
                user_id,
                datetime.now().isoformat(),
                random.randint(65,160),   # HR
                random.randint(0,30),     # steps
                round(random.random()*3,2) # calories
            ])

            print("📡 Data captured")

            time.sleep(5)