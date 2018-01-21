from datetime import datetime

# from flask import session

# KEY_WEEKDAY = 'weekday'
# KEY_WEEKDAY_FORCED_DATETIME = 'weekday_forced_datetime'


def get_weekday():
    now = datetime.now()
    if now.hour < 4: # 4시전이면 전날 것을 적용합니다.
        return (now.weekday() + 6) % 7
    else:
        return now.weekday()

    # forced_datetime = session.get(KEY_WEEKDAY_FORCED_DATETIME, None)
    # if not forced_datetime or (datetime.now() - forced_datetime).hours > 0:
    #     session[KEY_WEEKDAY_FORCED_DATETIME] = None
    #     return datetime.now().weekday
    # return session.get(KEY_WEEKDAY, 0)
