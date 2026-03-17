import schedule
import time

from backend.controller import (
    run_session,
    run_daily,
    run_coach
)


print("🤖 AI Fitness System Started...")


# Every 2 hours → detect sessions
schedule.every(2).hours.do(run_session)

# Every night → daily analysis
schedule.every().day.at("23:45").do(run_daily)

# Every morning → coaching
schedule.every().day.at("07:00").do(run_coach)


while True:
    schedule.run_pending()
    time.sleep(60)