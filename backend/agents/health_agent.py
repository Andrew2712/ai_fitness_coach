def compute_health(fatigue, recovery, progress):
    """
    fatigue: 0 (low), 1 (medium), 2 (high)
    recovery: float, typically 0-3
    progress: int, 0-100
    """
    fatigue_penalty = fatigue * 25        # 0, 25, or 50
    recovery_bonus  = min(recovery, 3) * 10  # cap at 30
    progress_bonus  = progress * 0.3     # 0-30

    score = 70 - fatigue_penalty + recovery_bonus + progress_bonus
    return round(min(max(score, 0), 100), 1)
