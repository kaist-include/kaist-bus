from datetime import datetime

f = open('data.csv')
for _ in range(2):
    f.readline()

data_dict = {}
bus_id, bus_name, station_id, station_is_default, station_name, station_direction_name = None, None, None, None, None, None
for line in f:
    line = line.strip()
    cols = line.split(',')
    assert len(cols) == 37

    if cols[0]:
        bus_id = cols[0]
    if cols[1]:
        bus_name = cols[1]
    if cols[2]:
        station_id = cols[2]
    if cols[3]:
        station_is_default = cols[3]
    if cols[4]:
        station_name = cols[4]
    if cols[5]:
        station_direction_name = cols[5]
    time_weekday_flags = cols[6]
    time_weekday_flags = ''.join(
        ['0' for i in range(7 - len(time_weekday_flags))]) + time_weekday_flags
    times = [col for col in cols[7:] if col]

    bus_dict = data_dict.get(bus_id, {})
    bus_dict['name'] = bus_name
    stations_dict = bus_dict.get('stations', {})
    station_dict = stations_dict.get(station_id, {})
    station_dict['is_default'] = station_is_default
    station_dict['name'] = station_name
    station_dict['direction_name'] = station_direction_name
    times_dict = station_dict.get('times', {})
    for weekday in range(7):
        flag = time_weekday_flags[weekday]
        if flag != '1':
            continue
        times_dict[weekday] = times
    station_dict['times'] = times_dict
    stations_dict[station_id] = station_dict
    bus_dict['stations'] = stations_dict
    data_dict[bus_id] = bus_dict
f.close()

data_dict = {
    'campuses': {
        1: {
            'buses': data_dict,
            'bus_updated_datetime': str(datetime.now())
        }
    }
}

import json
f = open('data.json', 'w')
f.write(json.dumps(data_dict))
f.close()
