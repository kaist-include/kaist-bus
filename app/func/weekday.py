from datetime import datetime, timedelta

from flask import session

KEY_WEEKDAY = 'weekday'
KEY_WEEKDAY_FORCED_DATETIME = 'weekday_forced_datetime'


def _get_weekday_from_session():
    # 강제로 설정한 weekday는 1시간을 유지합니다.
    forced_datetime = session.get(KEY_WEEKDAY_FORCED_DATETIME, None)
    if forced_datetime and (datetime.now() - forced_datetime) // timedelta(minutes=1) < 60:
        return session.get(KEY_WEEKDAY, None)
    return None


def get_weekday():
    now = datetime.now()
    weekday = _get_weekday_from_session()
    if weekday is not None:
        return weekday

    weekday = now.weekday()
    if now.hour < 4:  # 4시전이면 전날 것을 적용합니다.
        return (weekday + 6) % 7
    else:
        return weekday


def put_weekday(weekday):
    session[KEY_WEEKDAY_FORCED_DATETIME] = datetime.now()
    session[KEY_WEEKDAY] = weekday
