def compute_health(fatigue, recovery, progress):

    score = (
        (100 - fatigue * 25) +
        recovery * 15 +
        progress * 0.6
    )

    return round(min(max(score, 0), 100), 1)