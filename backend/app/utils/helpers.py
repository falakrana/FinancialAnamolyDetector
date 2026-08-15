import uuid
from datetime import datetime, timezone

def generate_id(prefix: str = "") -> str:
    """Generate a unique string ID with an optional prefix."""
    suffix = str(uuid.uuid4())[:8]
    return f"{prefix}-{suffix}" if prefix else suffix

def parse_iso_datetime(dt_str: str) -> datetime:
    """Parse an ISO-8601 string to a timezone-aware UTC datetime."""
    # Handle 'Z' suffix by replacing with '+00:00'
    if dt_str.endswith('Z'):
        dt_str = dt_str[:-1] + '+00:00'
    dt = datetime.fromisoformat(dt_str)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt

def format_iso_datetime(dt: datetime) -> str:
    """Format a datetime to an ISO-8601 string with 'Z' suffix for UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")
