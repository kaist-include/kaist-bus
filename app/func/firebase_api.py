import json
from datetime import datetime

from flask import session

KEY_BUS_UPDATED_DATETIME = 'firebase/campuses/1/bus_updated_datetime'


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
    bus_ids = sorted([int(key) for key in bus_objects.keys()])
    for bus_id in bus_ids:
        bus = bus_objects[str(bus_id)]
        if not bus:
            continue
        if bus_id == 7:
            continue
        buses.append(_handle_bus(bus, bus_id))
    return buses


def _handle_bus(bus, bus_id):
    bus['id'] = bus_id
    stations, station_object = [], bus.get('stations', {})
    stations_ids = sorted([int(key) for key in station_object.keys()])
    for station_id in stations_ids:
        station = station_object[str(station_id)]
        station['id'] = station_id
        stations.append(station)
    bus['stations'] = stations
    return bus


def bus_detail_api(bus_id):
    result = _get_result()
    bus = result.get(str(bus_id), None)
    if bus:
        return _handle_bus(bus, bus_id)
