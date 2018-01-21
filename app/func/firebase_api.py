import json
from datetime import datetime

from flask import session

from ..core import server

firebase_app = server.firebase_app

KEY_BUS_UPDATED_DATETIME_CHECKED_DATETIME = 'firebase/campuses/1/bus_updated_datetime/checked_datetime'
KEY_BUS_UPDATED_DATETIME = 'firebase/campuses/1/bus_updated_datetime'
KEY_BUS_RESULT = 'firebase/campuses/1/buses'


def _get_result():
    checked_datetime = session.get(KEY_BUS_UPDATED_DATETIME_CHECKED_DATETIME,
                                   None)
    if checked_datetime:
        if (datetime.now() - checked_datetime).days < 1:
            result = session.get(KEY_BUS_RESULT, None)
            if result:
                return json.loads(result)

    bus_updated_datetime = firebase_app.get(
        '/development/campuses/1/bus_updated_datetime', None)
    if session.get(KEY_BUS_UPDATED_DATETIME, None) == bus_updated_datetime:
        result = session.get(KEY_BUS_RESULT, None)
        if result:
            return json.loads(result)

    result = firebase_app.get('/development/campuses/1/buses', None)
    session[KEY_BUS_RESULT] = json.dumps(result)
    session[KEY_BUS_UPDATED_DATETIME] = bus_updated_datetime
    session[KEY_BUS_UPDATED_DATETIME_CHECKED_DATETIME] = datetime.now()
    return result


def get_updated_datetime():
    return session.get(KEY_BUS_UPDATED_DATETIME, '')[:10]


def bus_list_api():
    _buses = _get_result()
    buses = []
    for bus_id, bus in enumerate(_buses):
        if not bus:
            continue
        if bus_id == 7:
            continue
        buses.append(_handle_bus(bus, bus_id))
    return buses


def _handle_bus(bus, bus_id):
    bus['id'] = bus_id

    stations, station_object = [], bus.get('stations', {})
    if type(station_object) == dict:
        for station_id in station_object.keys():
            station = station_object[station_id]
            station['id'] = int(station_id)
            stations.append(station)
    elif type(station_object) == list:
        for station_id, station in enumerate(station_object):
            if not station:
                continue
            station['id'] = station_id
            stations.append(station)

    bus['stations'] = stations
    return bus


def bus_detail_api(bus_id):
    result = _get_result()
    bus = result[bus_id]
    return _handle_bus(bus, bus_id)
