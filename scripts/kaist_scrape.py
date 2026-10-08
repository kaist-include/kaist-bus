import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

PAGES = [
    {
        'id': 'wolpyeong',
        'name': '월평-본교-시내 순환셔틀',
        'nameEn': 'Wolpyeong-Main Campus-City Circular Shuttle',
        'url': 'https://www.kaist.ac.kr/kr/html/kaist/01140201.html',
        'urlEn': 'https://www.kaist.ac.kr/en/html/kaist/01200101.html',
        'table_hint': '운영시간표'
    },
    {
        'id': 'campus-loop',
        'name': '본교-문지-화암 왕복셔틀',
        'nameEn': 'Main-Munji-Hwaam Round Trip Shuttle',
        'url': 'https://www.kaist.ac.kr/kr/html/kaist/01140202.html',
        'urlEn': 'https://www.kaist.ac.kr/en/html/kaist/01200102.html',
        'table_hint': '셔틀운행 시간표'
    },
    {
        'id': 'olev',
        'name': 'OLEV 교내셔틀',
        'nameEn': 'OLEV Campus Shuttle',
        'url': 'https://www.kaist.ac.kr/kr/html/kaist/01140203.html',
        'urlEn': 'https://www.kaist.ac.kr/en/html/kaist/01200103.html',
        'table_hint': '운행시간표'
    },
    {
        'id': 'commute',
        'name': '통근버스',
        'nameEn': 'Commuter Bus',
        'url': 'https://www.kaist.ac.kr/kr/html/kaist/01140204.html',
        'urlEn': 'https://www.kaist.ac.kr/en/html/kaist/01200104.html',
        'table_hint': '운영구간'
    },
]

OLEV_STOPS = [
    ("학생식당(카이마루)", 0),
    ("스포츠컴플렉스", 1),
    ("창의학습관", 3),
    ("의과학연구센터", 4),
    ("클리닉", 5),
    ("NNFC", 6),
    ("정문", 7),
    ("신소재공학동", 8),
    ("KISTI", 9),
    ("희망·다솔관", 10),
    ("외국인교수아파트", 11),
]

OLEV_STOPS_EN = [
    "Student Cafeteria (KaiMaru)",
    "Sports Complex",
    "Creative Learning Building",
    "Biomedical Research Center",
    "Clinic",
    "NNFC",
    "Main Gate",
    "Materials Science and Engineering Building",
    "KISTI",
    "W4 Dormitory",
    "International Faculty Apartment",
]

WOLPYEONG_STOP_NAMES = [
    "본교 출발 교수회관 (N6)",
    "본교 출발 강당 (E15)",
    "본교 출발 본관당 (W8)",
    "본교 출발 오리연못",
    "시내구간 로데오 거리",
    "시내구간 충대앞",
    "시내구간 월평역 1번출구",
    "시내구간 갤러리아",
    "시내구간 월평역 3번출구",
    "시내구간 궁동",
    "본교 도착 오리연못",
    "본교 도착 본관 (E14)",
    "본교 도착 강당 (E15)",
    "본교 도착 교수회관 (N6)",
]

EARLY_WOLPYEONG_STOP_NAMES = [
    "정부청사",
    "월평역 3번출구",
    "유성온천역",
    "유성구청 앞",
    "오리연못",
    "본관",
    "강당",
    "영빈관",
]

ROOT = Path(__file__).resolve().parents[1]
ROUTES_OUT = ROOT / 'src/data/routes.json'
DEST_OUT = ROOT / 'src/data/routePresets.json'
STOP_EN_OVERRIDE_OUT = ROOT / 'src/data/stop_name_overrides_en.json'
TIME_RE = re.compile(r'\b\d{1,2}:\d{2}\b')


class TableExtractor(HTMLParser):
    """Expand table spans, including the official page's omitted tr/td tags.

    An absent tr before a table cell starts an implied row; a new cell closes
    the previous cell. These two HTML recovery rules preserve run 7 and 00:00.
    Only actual headings identify tables; captions/notes cannot select a table.
    """
    def __init__(self):
        super().__init__()
        self.tables = []
        self._table = None
        self._row = None
        self._cell = None
        self._heading_parts = None
        self._heading = ''

    def _end_cell(self):
        if self._cell is not None:
            self._cell['text'] = ' '.join(' '.join(self._cell['text']).split())
            self._row.append(self._cell)
            self._cell = None

    def _end_row(self):
        self._end_cell()
        if self._row is not None:
            if self._row:
                self._table.append(self._row)
            self._row = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('h3', 'h4', 'h5'):
            self._heading_parts = []
        elif tag == 'table':
            if self._table is not None:
                raise ValueError('Nested timetable is unsupported')
            self._table = []
        elif tag == 'tr' and self._table is not None:
            self._end_row()
            self._row = []
        elif tag in ('td', 'th') and self._table is not None:
            if self._row is None:
                self._row = []
            self._end_cell()
            rs, cs = int(attrs.get('rowspan', 1)), int(attrs.get('colspan', 1))
            if not (1 <= rs <= 100 and 1 <= cs <= 30):
                raise ValueError('Unexpected table span')
            self._cell = {'text': [], 'rowspan': rs, 'colspan': cs}

    def handle_data(self, data):
        if self._cell is not None:
            self._cell['text'].append(data)
        elif self._heading_parts is not None:
            self._heading_parts.append(data)

    def handle_endtag(self, tag):
        if tag in ('h3', 'h4', 'h5') and self._heading_parts is not None:
            self._heading = ' '.join(' '.join(self._heading_parts).split())
            self._heading_parts = None
        elif tag in ('td', 'th'):
            self._end_cell()
        elif tag in ('tr', 'thead', 'tbody', 'tfoot') and self._table is not None:
            self._end_row()
        elif tag == 'table' and self._table is not None:
            self._end_row()
            rows, occupied = [], {}
            for ri, row in enumerate(self._table):
                col = 0
                for cell in row:
                    while (ri, col) in occupied:
                        col += 1
                    for dr in range(cell['rowspan']):
                        for dc in range(cell['colspan']):
                            pos = ri + dr, col + dc
                            if pos in occupied:
                                raise ValueError('Overlapping table spans')
                            occupied[pos] = cell['text']
                    col += cell['colspan']
                width = max(c for r, c in occupied if r == ri) + 1
                rows.append([occupied.get((ri, c), '') for c in range(width)])
            self.tables.append({'heading': self._heading, 'rows': rows})
            self._table = None


def fetch_html(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (KAIST BUS scraper)'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8')


def normalize_time(value):
    if not TIME_RE.fullmatch(value):
        raise ValueError(f'Invalid time: {value!r}')
    hour, minute = map(int, value.split(':'))
    if not (0 <= hour < 28 and 0 <= minute < 60):
        raise ValueError(f'Invalid time: {value!r}')
    return f'{hour:02d}:{minute:02d}'


def service_minutes(value):
    hour, minute = map(int, normalize_time(value).split(':'))
    return (hour + (24 if hour < 4 else 0)) * 60 + minute


def unique_service_times(times):
    return sorted(set(t for t in times if t), key=service_minutes)


def cell_times(cell):
    if not cell or cell == '-':
        return []
    values = TIME_RE.findall(cell)
    # Only known timetable annotations may accompany times.
    remainder = TIME_RE.sub('', cell).replace('직행', '').replace('*', '').strip()
    if not values or remainder:
        raise ValueError(f'Unexpected timetable cell: {cell!r}')
    return [normalize_time(t) for t in values]


def first_time(cell):
    values = cell_times(cell)
    return values[0] if values else ''


def select_table(tables, heading):
    compact = lambda s: re.sub(r'\s+', '', s)
    matches = [t for t in tables if compact(t['heading']) == compact(heading)]
    if len(matches) != 1:
        raise ValueError(f'Expected one table: {heading}')
    return matches[0]['rows']


def numbered_rows(rows, expected_runs, width, time_columns):
    data = [r for r in rows if r and r[0].isdigit()]
    if [int(r[0]) for r in data] != list(range(1, expected_runs + 1)):
        raise ValueError(f'Expected consecutive runs 1..{expected_runs}')
    for row in data:
        if len(row) != width:
            raise ValueError(f'Unexpected width in run {row[0]}: {len(row)} != {width}')
        for col in time_columns:
            cell_times(row[col])
    return data


def require_header(actual, expected):
    compact = lambda seq: [re.sub(r'\s+', '', s) for s in seq]
    if compact(actual) != compact(expected):
        raise ValueError(f'Unexpected stop columns: {actual!r}')


def stop(stop_id, name, route_name, weekday=(), weekend=(), default=False):
    return {'id': stop_id, 'name': name, 'direction': route_name, 'default': default,
            'times': {'weekday': unique_service_times(weekday), 'weekend': unique_service_times(weekend)}}


def parse_wolpyeong(tables, early=False):
    heading = '얼리월평 운행 시간표' if early else '월평셔틀 운행 시간표'
    rows = select_table(tables, heading)
    names = EARLY_WOLPYEONG_STOP_NAMES if early else WOLPYEONG_STOP_NAMES
    headers = names if early else [re.sub(r'^(본교 출발|본교 도착|시내구간) ', '', n) for n in names]
    if len(rows) < 3:
        raise ValueError(f'Empty table: {heading}')
    require_header(rows[1][1:1 + len(names)], headers)
    runs = numbered_rows(rows[2:], 1 if early else 11, len(names) + 2, range(1, len(names) + 1))
    for row in runs:
        values = [cell_times(c) for c in row[1:len(names) + 1]]
        if any(len(v) != 1 for v in values):
            raise ValueError('Expected one time per shuttle stop')
        minutes = [service_minutes(v[0]) for v in values]
        if minutes != sorted(minutes):
            raise ValueError('Shuttle times are out of stop order')
    route_name = '월평-유성온천역-본교 (얼리월평 셔틀)' if early else PAGES[0]['name']
    return [stop(f'stop-{i+1}', name, route_name,
                 [first_time(r[i+1]) for r in runs], default=i == 0) for i, name in enumerate(names)]


def parse_early_wolpyeong(tables):
    return parse_wolpyeong(tables, early=True)


def parse_olev(tables):
    rows = select_table(tables, '운행시간표')
    require_header(rows[1], ['시간', '배차간격', '시간', '배차간격'])
    times = []
    for row in rows[2:]:
        if len(row) != 4:
            raise ValueError('Unexpected OLEV columns')
        for col in (0, 2):
            if row[col] in ('수업시간', '점심시간'):
                continue
            values = cell_times(row[col])
            if len(values) != 1:
                raise ValueError('Missing OLEV departure')
            times.extend(values)
    if len(times) != 26 or len(set(times)) != 26:
        raise ValueError('Expected 26 distinct OLEV departures')
    result = []
    for i, (name, offset) in enumerate(OLEV_STOPS):
        values = []
        for t in times:
            total = service_minutes(t) + offset
            values.append(f'{total // 60:02d}:{total % 60:02d}')
        entry = stop(f'stop-{i+1}', name, 'OLEV 교내셔틀', values, default=i == 0)
        # Preserve the official morning/afternoon row order in existing data.
        entry['times']['weekday'] = values
        entry.update(nameEn=OLEV_STOPS_EN[i], directionEn='OLEV Campus Shuttle')
        result.append({key: entry[key] for key in
                       ('id', 'name', 'nameEn', 'direction', 'default', 'times', 'directionEn')})
    return result


def parse_campus_loop(tables):
    weekday = select_table(tables, '문지셔틀 운행 시간표 (주중)')
    weekend = select_table(tables, '문지셔틀 운행 시간표 (연중 : 토요일, 일요일, 공휴일)')
    require_header(weekday[0], ['No', '문지 출발', '화암', '화암', '문지', '문지', '로덴 하우스 앞',
                               '본교', '본교', '교수 아파트 앞', '문지', '문지', '화암', '화암', '문지 도착', '배차 간격', '비고'])
    require_header(weekday[1], ['No', '문지 출발', '도착', '출발', '도착', '출발', '로덴 하우스 앞',
                               '도착', '출발', '교수 아파트 앞', '도착', '출발', '도착', '출발', '문지 도착', '배차 간격', '비고'])
    require_header(weekend[0], ['No', '문지캠퍼스', '화암기숙사', '문지캠퍼스', '로덴하우스', '본교',
                               '교수 아파트', '화암기숙사', '문지캠퍼스', '배차 간격'])
    wr = numbered_rows(weekday[2:], 25, 17, range(1, 15))
    er = numbered_rows(weekend[1:], 13, 10, (1, 2, 3, 4, 5, 6, 8))
    if any('요청' not in r[7] or '11:30' not in r[7] for r in er):
        raise ValueError('Changed weekend Hwaam on-request service policy')
    for row in wr:
        if not all(first_time(row[c]) for c in (5, 6, 7, 8, 9)):
            raise ValueError(f'Missing required campus time in run {row[0]}')
        normal = [service_minutes(first_time(c)) for c in row[1:15] if first_time(c)]
        if normal != sorted(normal):
            raise ValueError(f'Campus times out of order in run {row[0]}')
    for row in er:
        if any(not first_time(row[c]) for c in (1, 2, 3, 4, 5, 6, 8)):
            raise ValueError('Missing weekend campus time')
    name = PAGES[1]['name']
    # Keep existing IDs for bookmarks, but read arrival/departure by header position.
    columns = [(2, 1, '문지 출발'), (3, 2, '화암 도착'), (5, 4, '문지 도착'),
               (6, 5, '문지 출발 (2)'), (7, 6, '로덴 하우스 앞 도착'),
               (8, 8, '본교 출발'), (9, 7, '본교 도착'), (10, 9, '교수 아파트 앞 출발'),
               (11, 10, '문지 도착 (2)'), (12, 11, '문지 출발 (3)'),
               (13, 12, '화암 도착 (2)'), (14, 13, '화암 출발 (2)'), (15, 14, '문지 도착 (3)')]
    stops = [stop(f'stop-{sid}', label, name, [first_time(r[col]) for r in wr], default=sid == 2)
             for sid, col, label in columns]
    labels = ['문지캠퍼스', '화암기숙사', '문지캠퍼스 (2)', '로덴하우스', '본교',
              '교수 아파트', '화암기숙사 (2)', '문지캠퍼스 (3)']
    stops.extend(stop(f'stop-{col}', label, name,
                      weekend=[] if col == 7 else [first_time(r[col]) for r in er], default=col == 1)
                 for col, label in enumerate(labels, 1))
    pairs = {
        'main->munji': [first_time(r[8]) for r in wr],
        'main->hwaam': [first_time(r[8]) for r in wr if first_time(r[12])],
        'munji->main': [first_time(r[5]) for r in wr],
        'munji->hwaam': [first_time(r[1]) for r in wr if first_time(r[2])] +
                        [first_time(r[11]) for r in wr if first_time(r[12])],
        'hwaam->main': [t for r in wr for t in cell_times(r[3]) if first_time(r[7])],
        'hwaam->munji': [first_time(r[3]) for r in wr] + [first_time(r[13]) for r in wr],
    }
    weekend_pairs = {key: [first_time(r[col]) for r in er
                          if key != 'main->hwaam' or first_time(r[5]) != '11:30']
                     for key, col in [('main->munji', 5), ('main->hwaam', 5), ('munji->main', 3),
                                      ('munji->hwaam', 1), ('hwaam->main', 2), ('hwaam->munji', 2)]}
    express = unique_service_times(t for r in wr if '직행' in r[3] for t in cell_times(r[3])[1:])
    return stops, {
        'campusPairs': {'weekday': {k: unique_service_times(v) for k, v in pairs.items()},
                        'weekend': {k: unique_service_times(v) for k, v in weekend_pairs.items()}},
        'campusExpress': {'weekday': {'hwaam->main': express}, 'weekend': {'hwaam->main': []}},
        'holidayMorningSuspension': True,
        'note': '• 설날·추석 당일은 오전 운행 없이 문지 출발 13:50 회차부터 운행합니다.\n'
                '• 평일 23~25회차는 본교→화암→문지 순서이며, 교수아파트 대신 도룡동고속시외버스정류소에 정차합니다.\n'
                '• 방학 중 저녁 직행버스는 운행하지 않습니다. 차량 운행 종료 시 환승이 필요할 수 있습니다.',
        'noteEn': '• On Seollal and Chuseok, service starts with the 13:50 departure from Munji.\n'
                  '• Weekday runs 23–25 travel Main→Hwaam→Munji and stop at Doryong Express/Intercity Bus Stop instead of Faculty Apartment.\n'
                  '• Evening express buses do not run during vacations. Transfers may be required when a vehicle ends its service.'
    }


def build_routes():
    overrides = json.loads(STOP_EN_OVERRIDE_OUT.read_text(encoding='utf-8-sig'))
    routes, presets = [], []
    for page in PAGES:
        if page['id'] == 'commute':
            continue
        parser = TableExtractor()
        parser.feed(fetch_html(page['url']))
        parser.close()
        extra = {}
        if page['id'] == 'wolpyeong':
            stops = parse_wolpyeong(parser.tables)
        elif page['id'] == 'campus-loop':
            stops, extra = parse_campus_loop(parser.tables)
        else:
            stops = parse_olev(parser.tables)
            extra = {'note': '중간 정류장 시각은 출발 시각에 예상 소요시간을 더한 값입니다.',
                     'noteEn': 'Intermediate stop times are estimates based on departure times.'}
        route = {'id': page['id'], 'name': page['name'], 'nameEn': page['nameEn'],
                 'group': 'official', 'sourceUrl': page['url'], 'stops': stops, **extra}
        if page['id'] == 'wolpyeong':
            route['note'] = ('• 시내 도로 사정에 따라 각 정류장 도착 예정 시간보다 늦을 수 있습니다. (정류장 위치 첨부파일 참조)\n'
                             '• 8회차(17:05출발) 차량은 학기 중 미니버스 2대, 방학기간에는 대형버스 1대로 운행됩니다.\n'
                             '• 9회차(18:05출발) 차량은 퇴근시간 도로혼잡으로 예정도착시간과 많은 차이가 있을 수 있습니다.')
        routes.append(route)
        if page['id'] == 'wolpyeong':
            routes.append({'id': 'wolpyeong-early', 'name': '월평-유성온천역-본교 (얼리월평 셔틀)',
                           'nameEn': 'Wolpyeong-Yuseong Spa-Main Campus (Early Shuttle)',
                           'group': 'official', 'sourceUrl': page['url'],
                           'stops': parse_early_wolpyeong(parser.tables)})
    for route in routes:
        for entry in route['stops']:
            en = overrides.get(route['id'], {}).get(entry['name'])
            if en:
                entry['nameEn'] = en
        presets.append({key: route[key] for key in ('id', 'name', 'nameEn')})
        presets[-1]['stops'] = [{'routeId': route['id'], 'stopId': route['stops'][0]['id']}]
    return routes, presets


def main():
    try:
        routes, presets = build_routes()
        outputs = [(ROUTES_OUT, {'routes': routes}), (DEST_OUT, {'routePresets': presets})]
        # Validate/serialize everything before touching either published file.
        staged = []
        for path, data in outputs:
            payload = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8-sig')
            temp = path.with_suffix(path.suffix + '.tmp')
            staged.append((path, temp))
            temp.write_bytes(payload)
        for path, temp in staged:
            os.replace(temp, path)
    except Exception as exc:
        print(f'[ERROR] Timetable update failed: {exc}', file=sys.stderr)
        return 1
    finally:
        for _, temp in locals().get('staged', []):
            temp.unlink(missing_ok=True)
    print(f'routes: {len(routes)}; routePresets: {len(presets)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
