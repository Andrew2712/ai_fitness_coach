# agents/decision_agent.py

import pandas as pd


# ==========================
# GOAL ENGINE (AGENTIC)
# ==========================

def generate_ai_goal(profile, trends, fatigue, memory=None, uid=None):

    # ==========================
    # 1️⃣ MEMORY & FEEDBACK LAYER
    # ==========================

    if memory and uid in memory:

        user_mem = memory.get(uid, {})
        goals    = user_mem.get("goals", [])
        progress = user_mem.get("progress", [])

        # A. Repeated low adherence → simplify
        if len(goals) >= 2:
            bad_weeks = sum(1 for g in goals[-2:] if g.get("feedback") == "not_followed")
            if bad_weeks >= 2:
                return {
                    "goal":     "Easy Reset Plan",
                    "focus":    "Simplify routine",
                    "reason":   "Repeated low adherence",
                    "duration": "2 weeks"
                }

        # B. Consistent progress decline → rebuild
        if len(progress) >= 3:
            if progress[-1] < progress[-2] < progress[-3]:
                return {
                    "goal":     "System Reset",
                    "focus":    "Rebuild habits",
                    "reason":   "Consistent decline",
                    "duration": "3 weeks"
                }

    # ==========================
    # 2️⃣ HEALTH METRICS
    # ==========================

    avg_steps  = profile.get("avg_steps",    0)
    avg_sleep  = profile.get("avg_sleep",    0)
    hr         = profile.get("avg_hr",       0)
    recovery   = profile.get("recovery_rate",0)

    # ✅ NEW — pull HRV for smarter decisions
    avg_hrv    = profile.get("avg_hrv",      2.0)

    step_trend  = trends.get("step_trend",  0)
    sleep_trend = trends.get("sleep_trend", 0)
    hr_trend    = trends.get("hr_trend",    0)

    # ==========================
    # 3️⃣ DECISION LOGIC
    # ==========================

    # ── HIGH FATIGUE ───────────────────────────────────────
    if fatigue == 2:

        # Worst case: HRV critically low + sleep declining
        if avg_hrv < 1.5 and sleep_trend < 0:
            return {
                "goal":     "Full Rest Week",
                "focus":    "Complete recovery — zero training",
                "reason":   "Critical HRV + declining sleep",
                "duration": "1 week"
            }

        # HRV low + HR rising = body under serious stress
        elif avg_hrv < 1.8 and hr_trend > 0:
            return {
                "goal":     "Active Recovery",
                "focus":    "Light movement only — no intensity",
                "reason":   "High fatigue + elevated HR trend",
                "duration": "1–2 weeks"
            }

        # Sleep is the bottleneck
        elif avg_sleep < 380 or sleep_trend < 0:
            return {
                "goal":     "Deep Recovery Phase",
                "focus":    "Restore sleep & energy first",
                "reason":   "High fatigue + poor sleep",
                "duration": "4–6 weeks"
            }

        # General high fatigue — reduce load
        else:
            return {
                "goal":     "Deload Week",
                "focus":    "Reduce load, maintain consistency",
                "reason":   "High fatigue detected",
                "duration": "1 week"
            }

    # ── SEVERE IMBALANCE ───────────────────────────────────
    if (
        avg_sleep < 250 or
        (sleep_trend < -15 and hr_trend > 5) or
        recovery < -5
    ):
        return {
            "goal":     "Recovery Reset",
            "focus":    "Fix sleep & stress",
            "reason":   "Severe health imbalance",
            "duration": "6 weeks"
        }

    # ── MEDIUM FATIGUE ─────────────────────────────────────
    if fatigue == 1:

        # Sleep declining even at medium fatigue — fix it now
        if sleep_trend < 0 and avg_sleep < 360:
            return {
                "goal":     "Sleep Priority Week",
                "focus":    "Fix sleep before adding training load",
                "reason":   "Medium fatigue + declining sleep",
                "duration": "1 week"
            }

        # Momentum building — capitalise on it
        elif step_trend > 0 and sleep_trend >= 0:
            return {
                "goal":     "Build on Momentum",
                "focus":    f"Increase steps by 10% from your {int(avg_steps):,} avg",
                "reason":   "Medium fatigue but positive trends",
                "duration": "2 weeks"
            }

        # HRV recovering — medium load is fine
        elif avg_hrv >= 2.0:
            return {
                "goal":     "Rebuild Consistency",
                "focus":    "Steady daily activity",
                "reason":   "Medium fatigue, HRV stable",
                "duration": "2–3 weeks"
            }

        else:
            return {
                "goal":     "Active Recovery",
                "focus":    "Reduce load",
                "reason":   "Medium fatigue",
                "duration": "3–4 weeks"
            }

    # ── LOW ACTIVITY ───────────────────────────────────────
    if avg_steps < 5000:
        return {
            "goal":     "Build Activity Habit",
            "focus":    "Increase daily movement",
            "reason":   "Low activity level",
            "duration": "8 weeks"
        }

    # ── HIGH HR STRESS ─────────────────────────────────────
    if hr > 85 and hr_trend > 3:
        return {
            "goal":     "Improve Cardio Base",
            "focus":    "Lower resting HR",
            "reason":   "Elevated HR trend",
            "duration": "6 weeks"
        }

    # ── LOW FATIGUE — PEAK CONDITION ───────────────────────
    if fatigue == 0:

        # Everything green + HRV strong = push harder
        if avg_steps > 8000 and avg_sleep > 400 and avg_hrv >= 2.5 and recovery > 0:
            return {
                "goal":     "Fat Loss & Conditioning",
                "focus":    "Optimise body composition",
                "reason":   "Strong metrics across the board",
                "duration": "10 weeks"
            }

        # Rapid improvement happening — accelerate
        if step_trend > 800:
            return {
                "goal":     "Performance Boost",
                "focus":    "Increase endurance",
                "reason":   "Fast improvement detected",
                "duration": "8 weeks"
            }

        # HRV strong but steps plateau — activate
        if avg_hrv >= 2.2 and step_trend <= 0:
            return {
                "goal":     "Activate & Strengthen",
                "focus":    "Break the plateau — add 15% steps",
                "reason":   "Low fatigue, HRV good, steps flat",
                "duration": "4 weeks"
            }

    # ── DEFAULT ────────────────────────────────────────────
    return {
        "goal":     "Balanced Lifestyle",
        "focus":    "Maintain habits",
        "reason":   "Stable pattern",
        "duration": "4 weeks"
    }


# ==========================
# GOAL PLAN
# ==========================

def generate_ai_goal_plan(ai_goal):

    goal = ai_goal.get("goal", "")

    plans = {
        "Full Rest Week": [
            "Complete rest — no workouts at all today",
            "Sleep 8.5+ hours every night this week",
            "Light 10-min walk only if you feel up to it",
            "Drink 3L water daily, avoid caffeine after 2pm",
            "Breathing exercises or meditation each evening",
        ],
        "Active Recovery": [
            "20-30 min light walk each day — no intensity",
            "Sleep 8+ hours — go to bed 30 min earlier",
            "Gentle stretching or yoga 15 min daily",
            "Avoid screens 1 hour before bed",
            "Check HRV each morning — rest if still low",
        ],
        "Deep Recovery Phase": [
            "Sleep 8+ hours — fixed bedtime every night",
            "No new training load this week",
            "Light walks only — 15-20 min daily",
            "Track sleep efficiency in the dashboard",
            "Reassess fatigue after 4 days of good sleep",
        ],
        "Deload Week": [
            "Reduce workout intensity to 50% of normal",
            "Keep steps at 60% of your weekly average",
            "Sleep 7.5-8 hours minimum every night",
            "One full rest day mid-week mandatory",
            "Return to full training only when HRV recovers",
        ],
        "Sleep Priority Week": [
            "Set a fixed bedtime — same time every night",
            "Target 7.5-8 hours sleep minimum",
            "No new training load until sleep score improves",
            "Light walks only — 15-20 min daily",
            "Track sleep efficiency in the dashboard daily",
        ],
        "Build on Momentum": [
            "Increase daily steps by 10% from your current average",
            "Add one extra active session this week",
            "Maintain your current sleep schedule",
            "Track your streak — consistency is the goal",
            "Rate your energy each morning — adjust if needed",
        ],
        "Rebuild Consistency": [
            "Hit your step target 5 out of 7 days this week",
            "Keep workouts moderate — no all-out sessions",
            "Sleep 7+ hours minimum each night",
            "Check your fatigue trend daily in the dashboard",
            "Increase load only if HRV stays above 2.0",
        ],
        "Build Activity Habit": [
            "Start with 7,000 steps/day — build to 10,000",
            "Morning walks — 20 min before breakfast",
            "3x light cardio sessions this week",
            "Stretch for 10 min after each session",
            "Weekly step challenge — beat last week",
        ],
        "Improve Cardio Base": [
            "3x jog sessions this week — easy pace",
            "One interval session — 20 min",
            "Zone-2 cardio 2x — conversational pace",
            "One long walk — 45-60 min",
            "Check resting HR each morning — track progress",
        ],
        "Fat Loss & Conditioning": [
            "10,000 steps every day this week",
            "Track calories — moderate deficit only",
            "Strength training 3x this week",
            "High protein meals — aim for 1.6g/kg bodyweight",
            "No sugary drinks — water and black coffee only",
        ],
        "Performance Boost": [
            "One HIIT session this week — 20-30 min",
            "Tempo run — 80% effort for 25 min",
            "Strength session — compound lifts",
            "Mobility work — 15 min daily",
            "Sleep 8 hours — performance is built in recovery",
        ],
        "Activate & Strengthen": [
            "Add 15% to your current step count this week",
            "Try a new activity or route to stay motivated",
            "Two strength sessions this week",
            "Sleep same bedtime all 7 days",
            "Review your progress at the end of the week",
        ],
        "Easy Reset Plan": [
            "Just 10 min of movement daily — anything counts",
            "No pressure — consistency over intensity",
            "Set a daily phone reminder for your walk",
            "Sleep at the same time every night",
            "Give feedback at the end of each day",
        ],
        "System Reset": [
            "Full rest for 2 days — let your body recover",
            "Rebuild with light walks — 20 min daily",
            "Fix sleep first — 7.5h minimum",
            "Track one metric daily: steps or sleep",
            "Check in with your coach note each morning",
        ],
        "Recovery Reset": [
            "Sleep 8+ hours — non-negotiable this week",
            "Reduce all stress — light walks only",
            "Hydrate 3L daily",
            "Breathing exercises 10 min morning + evening",
            "No high-intensity training until HRV recovers",
        ],
        "Balanced Lifestyle": [
            "Walk daily — hit your step target",
            "Eat balanced meals — don't skip breakfast",
            "Sleep well — 7-8 hours every night",
            "Stretch for 10 min morning or evening",
            "Review your dashboard progress every Sunday",
        ],
    }

    # fallback if goal not in plans
    return plans.get(goal, [
        "Stay consistent with daily movement",
        "Prioritise sleep quality this week",
        "Stay hydrated throughout the day",
        "Listen to your body and rest when needed",
        "Check your dashboard progress daily",
    ])


# ==========================
# GOAL EXPLANATION
# ==========================

def explain_goal(profile, trends, fatigue_text, recovery, goal_data):

    reasons = []

    avg_steps = profile.get("avg_steps", 0)
    avg_sleep = profile.get("avg_sleep", 0)
    avg_hrv   = profile.get("avg_hrv",   2.0)
    hr_trend  = trends.get("hr_trend",   0)

    if avg_steps >= 7000:
        reasons.append(f"Good activity ({int(avg_steps):,} steps avg)")
    else:
        reasons.append(f"Low steps ({int(avg_steps):,} avg)")

    if avg_sleep >= 420:
        reasons.append(f"Healthy sleep ({avg_sleep//60}h avg)")
    else:
        reasons.append(f"Poor sleep ({avg_sleep//60}h avg)")

    if avg_hrv >= 2.0:
        reasons.append(f"HRV stable ({avg_hrv:.1f} RMSSD)")
    else:
        reasons.append(f"HRV low ({avg_hrv:.1f} RMSSD)")

    if hr_trend < 0:
        reasons.append("HR improving")
    else:
        reasons.append("HR under stress")

    reasons.append(f"Fatigue: {fatigue_text.lower()}")
    reasons.append(f"Recovery rate: {recovery}")

    print("\n🤖 AI GOAL EXPLANATION\n")
    print(f"Goal: {goal_data['goal']}\n")
    for r in reasons:
        print("•", r)
    print("\nMatches your health pattern.\n")