from typing import Dict
import os

class Settings:
    ANOMALY_Z_SCORE_THRESHOLD: float = float(os.getenv("ANOMALY_Z_SCORE_THRESHOLD", "3.0"))
    ROLLING_WINDOW_MINUTES: int = int(os.getenv("ROLLING_WINDOW_MINUTES", "10"))
    MISSING_DATA_THRESHOLD_MINUTES: float = float(os.getenv("MISSING_DATA_THRESHOLD_MINUTES", "5.0"))
    
    # Source reliability ranking (higher is more reliable)
    SOURCE_RELIABILITY_RANKING: Dict[str, int] = {
        "exchange-A": 3,
        "exchange-B": 2,
        "internal-log": 1
    }

settings = Settings()
