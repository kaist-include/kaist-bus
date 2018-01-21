import json
from datetime import datetime

from flask import session

# from ..core import server
#
# firebase_app = server.firebase_app
#
# KEY_BUS_UPDATED_DATETIME_CHECKED_DATETIME = 'firebase/campuses/1/bus_updated_datetime/checked_datetime'
KEY_BUS_UPDATED_DATETIME = 'firebase/campuses/1/bus_updated_datetime'

# KEY_BUS_RESULT = 'firebase/campuses/1/buses'


def _get_result():
    f = open('app/asset/db/data.json')
    result = json.loads(f.read()).get('campuses', []).get('1')
    bus_objects = result.get('buses', {})
    bus_updated_datetime = result.get('bus_updated_datetime', None)
    session[KEY_BUS_UPDATED_DATETIME] = bus_updated_datetime
    return bus_objects


def get_updated_datetime():
    return session.get(KEY_BUS_UPDATED_DATETIME, '')[:10]


def bus_list_api():
    bus_objects = _get_result()
    buses = []
    for bus_id in sorted(bus_objects.keys()):
        bus = bus_objects[bus_id]
        if not bus:
            continue
        if bus_id == 7:
            continue
        buses.append(_handle_bus(bus, bus_id))
    return buses


def _handle_bus(bus, bus_id):
    bus['id'] = int(bus_id)

    stations, station_object = [], bus.get('stations', {})
    print(type(station_object))
    for station_id in station_object.keys():
        station = station_object[station_id]
        station['id'] = int(station_id)
        stations.append(station)

    bus['stations'] = stations
    return bus


def bus_detail_api(bus_id):
    result = _get_result()
    bus = result.get(str(bus_id), None)
    if bus:
        return _handle_bus(bus, bus_id)
