import datetime as dt
from zoneinfo import ZoneInfo


def resolve_company_zone(company) -> ZoneInfo:
    """Invalid / city names (e.g. 'gujranwala') -> Asia/Karachi fallback (Pakistan default)."""
    name = (company.timezone or "").strip()
    if not name:
        return ZoneInfo("Asia/Karachi")
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo("Asia/Karachi")


def stored_timezone_is_valid(company) -> bool:
    name = (company.timezone or "").strip()
    if not name:
        return False
    try:
        ZoneInfo(name)
        return True
    except Exception:
        return False


def company_local_now(company, now_utc: dt.datetime) -> dt.datetime:
    return now_utc.astimezone(resolve_company_zone(company))


def company_local_date(company, now_utc: dt.datetime) -> dt.date:
    return company_local_now(company, now_utc).date()


def in_work_window(company, now_utc: dt.datetime) -> bool:
    """True if current local time is between work_start and work_end (same-day or overnight)."""
    local = company_local_now(company, now_utc)
    t = local.time()
    start = company.work_start_time
    end = company.work_end_time
    if start <= end:
        return start <= t <= end
    # Overnight shift e.g. 22:00–06:00
    return t >= start or t <= end
