import json
import re
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
import os
import sys

ROUTES_OUT = Path('src/data/routes.json')
DEST_OUT = Path('src/data/routePresets.json')
STOP_EN_OVERRIDE_OUT = Path('src/data/stop_name_overrides_en.json')

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

TIME_RE = re.compile(r'\b\d{1,2}:\d{2}\b')

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



class TableExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self._in_table = False
        self._in_row = False
        self._in_cell = False
        self._cell_text = []
        self._cell_colspan = 1
        self._row = []
        self._table = []
        self._text_buffer = []
        self._current_heading = ""

    def handle_starttag(self, tag, attrs):
        if tag in ("h3", "h4", "h5"):
            self._text_buffer = []
        if tag == "table":
            self._in_table = True
            self._table = []
        if tag == "tr" and self._in_table:
            self._in_row = True
            self._row = []
        if tag in ("td", "th") and self._in_row:
            self._in_cell = True
            self._cell_text = []
            attr_map = dict(attrs)
            try:
                self._cell_colspan = int(attr_map.get("colspan", 1))
            except ValueError:
                self._cell_colspan = 1

    def handle_endtag(self, tag):
        if tag in ("h3", "h4", "h5"):
            self._current_heading = " ".join(self._text_buffer).strip()
            self._text_buffer = []
        if tag in ("td", "th") and self._in_cell:
            text = " ".join(self._cell_text).strip()
            self._row.append(text)
            for _ in range(max(self._cell_colspan - 1, 0)):
                self._row.append("")
            self._in_cell = False
            self._cell_text = []
            self._cell_colspan = 1
        if tag == "tr" and self._in_row:
            if self._row:
                self._table.append(self._row)
            self._row = []
            self._in_row = False
        if tag == "table" and self._in_table:
            self.tables.append({
                "heading": self._current_heading,
                "rows": self._table
            })
            self._table = []
            self._in_table = False

    def handle_data(self, data):
        text = data.strip()
        if not text:
            return
        if self._in_cell:
            self._cell_text.append(text)
        else:
            self._text_buffer.append(text)


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        text = data.strip()
        if text:
            self.parts.append(text)

    def get_text(self):
        return "\n".join(self.parts)


def fetch_html(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (KAIST BUS scraper)'
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8', errors='ignore')


def extract_text(html):
    parser = TextExtractor()
    parser.feed(html)
    return parser.get_text()


def normalize_time(value):
    match = re.match(r'^(\d{1,2}):(\d{2})$', value)
    if not match:
        return value
    hour = int(match.group(1))
    minute = int(match.group(2))
    return f"{hour:02d}:{minute:02d}"


def add_minutes(time_str, offset):
    match = re.match(r'^(\d{1,2}):(\d{2})$', time_str)
    if not match:
        return time_str
    hour = int(match.group(1))
    minute = int(match.group(2))
    total = hour * 60 + minute + offset
    total = total % 1440
    return f"{total // 60:02d}:{total % 60:02d}"


def extract_time_cells(cells):
    times = []
    for cell in cells:
        match = TIME_RE.findall(cell)
        if match:
            times.append(normalize_time(match[0]))
        else:
            times.append("")
    return times


def dedupe(seq):
    seen = set()
    ordered = []
    for item in seq:
        if item and item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def table_to_stops(table, route_name, skip_tokens=None):
    if not table['rows']:
        return []

    header = None
    header_index = 0
    for idx, row in enumerate(table['rows']):
        if any('No' in cell for cell in row) or any('번호' in cell for cell in row):
            header = row
            header_index = idx
            break
    if header is None:
        header = table['rows'][0]
        header_index = 0

    header_cells = [cell.replace('\n', ' ').strip() for cell in header]

    # remove index/meta columns
    def is_skip(cell):
        tokens = skip_tokens or ['No', '번호', '비고', '회차', '차수', '출발시간', '출발시각']
        return any(token in cell for token in tokens)

    # detect grouped headers
    group_tokens = ['출발', '구간', '도착']
    def row_has_group_tokens(row):
        return any(any(token in cell for token in group_tokens) for cell in row if cell)

    def row_has_times(row):
        return any(TIME_RE.search(cell) for cell in row)

    is_grouped = row_has_group_tokens(header_cells)
    if not is_grouped:
        # handle multi-row headers with colspans (group row + name row)
        if any(cell == "" for cell in header_cells) and header_index + 1 < len(table['rows']):
            candidate = [cell.replace('\n', ' ').strip() for cell in table['rows'][header_index + 1]]
            if candidate and not row_has_times(candidate):
                is_grouped = True

    stop_columns = []
    if is_grouped:
        header_has_group_tokens = row_has_group_tokens(header_cells)
        # find the next header-like row that has stop names (skip group-only rows)
        name_row = None
        for idx in range(header_index + 1, len(table['rows'])):
            candidate = table['rows'][idx]
            candidate_cells = [cell.replace('\n', ' ').strip() for cell in candidate]
            non_empty = [cell for cell in candidate_cells if cell]
            if not non_empty:
                continue
            if header_has_group_tokens and any(any(token in cell for token in group_tokens) for cell in non_empty):
                continue
            if any(TIME_RE.search(cell) for cell in non_empty):
                continue
            name_row = candidate
            break
        if name_row is None:
            name_row = table['rows'][header_index + 1] if header_index + 1 < len(table['rows']) else []

        next_row = name_row
        # Align name_row length with header length (handle leading index column)
        if len(next_row) < len(header_cells):
            if header_cells and is_skip(header_cells[0]) and len(next_row) == len(header_cells) - 1:
                next_row = [""] + list(next_row)
            else:
                next_row = list(next_row) + [""] * (len(header_cells) - len(next_row))
        group_per_col = []
        current_group = ""
        for cell in header_cells:
            if cell and not is_skip(cell):
                current_group = cell
            group_per_col.append(current_group)
        def merge_group_and_name(group, name):
            group = group.strip()
            name = name.strip()
            if name.endswith("시간"):
                name = name[:-2].strip()
            if not group:
                return name
            if not name:
                return group
            if name in ("출발", "도착", "구간") and name in group:
                return group
            if group.endswith(name):
                return group
            if group == name:
                return group
            return f"{group} {name}".strip()

        for idx, stop_cell in enumerate(next_row):
            stop_cell = stop_cell.replace('\n', ' ').strip()
            if not stop_cell or is_skip(stop_cell):
                continue
            group = group_per_col[idx] if idx < len(group_per_col) else ""
            name = merge_group_and_name(group, stop_cell)
            if name and not is_skip(name):
                stop_columns.append((idx, name))
    else:
        for idx, cell in enumerate(header_cells):
            if not cell or is_skip(cell):
                continue
            stop_columns.append((idx, cell))

    if not stop_columns:
        return []

    # Ensure unique stop names to avoid merging different columns
    unique_names = []
    counts = {}
    for _, name in stop_columns:
        if name in counts:
            counts[name] += 1
            unique_names.append(f"{name} ({counts[name]})")
        else:
            counts[name] = 1
            unique_names.append(name)
    stop_columns = [(col, unique_names[idx]) for idx, (col, _) in enumerate(stop_columns)]

    stop_times = {name: [] for _, name in stop_columns}

    for row in table['rows']:
        if row == header:
            continue
        if is_grouped and name_row and row == name_row:
            continue
        # skip empty rows
        if not any(TIME_RE.search(cell) for cell in row):
            continue
        time_cells = extract_time_cells(row)
        if len(time_cells) < len(header_cells):
            time_cells = list(time_cells) + [""] * (len(header_cells) - len(time_cells))

        for col_idx, name in stop_columns:
            if col_idx < len(time_cells):
                stop_times[name].append(time_cells[col_idx])

    stops = []
    for idx, (_, name) in enumerate(stop_columns):
        ordered = dedupe(stop_times[name])
        stops.append({
            'id': f'stop-{idx+1}',
            'name': name,
            'direction': route_name,
            'default': idx == 0,
            'times': {
                'weekday': ordered,
                'weekend': []
            }
        })
    return stops


def parse_commute_from_tables(tables, route_name):
    for table in tables:
        if not any(TIME_RE.search(cell) for row in table['rows'] for cell in row):
            continue
        stops = []
        for row in table['rows']:
            row_text = " ".join(row)
            times = TIME_RE.findall(row_text)
            if not times:
                continue
            time_val = normalize_time(times[0])
            # prefer first non-time cell as name
            name = ""
            for cell in row:
                if not TIME_RE.search(cell):
                    cell = cell.strip()
                    if cell:
                        name = cell
                        break
            if not name:
                name = re.sub(r'\d{1,2}:\d{2}', '', row_text).strip()
            if not name:
                name = f"{route_name} {len(stops)+1}"
            stops.append({
                'id': f'stop-{len(stops)+1}',
                'name': name,
                'direction': route_name,
                'default': len(stops) == 0,
                'times': {
                    'weekday': [time_val],
                    'weekend': []
                }
            })
        if stops:
            return stops
    return []




def parse_olev(times):
    stops = []
    for idx, (name, offset) in enumerate(OLEV_STOPS):
        stop_times = [add_minutes(t, offset) for t in times]
        stops.append({
            'id': f'stop-{idx+1}',
            'name': name,
            'nameEn': OLEV_STOPS_EN[idx] if idx < len(OLEV_STOPS_EN) else "",
            'direction': 'OLEV 교내셔틀',
            'default': idx == 0,
            'times': {
                'weekday': dedupe(stop_times),
                'weekend': []
            }
        })
    return stops


def extract_times_from_tables(tables, hint):
    for table in tables:
        if hint and hint in table['heading']:
            times = []
            for row in table['rows']:
                times.extend([normalize_time(t) for t in TIME_RE.findall(" ".join(row))])
            return dedupe(times)
    # fallback: first table with times
    for table in tables:
        if any(TIME_RE.search(cell) for row in table['rows'] for cell in row):
            times = []
            for row in table['rows']:
                times.extend([normalize_time(t) for t in TIME_RE.findall(" ".join(row))])
            return dedupe(times)
    return []


def extract_times_from_text(html_text):
    # crude text extraction for fallback
    text = re.sub(r'<[^>]+>', ' ', html_text)
    times = [normalize_time(t) for t in TIME_RE.findall(text)]
    return dedupe(times)


def load_existing_data():
    routes = []
    route_presets = []
    if ROUTES_OUT.exists():
        routes = json.loads(ROUTES_OUT.read_text(encoding='utf-8-sig')).get('routes', [])
    if DEST_OUT.exists():
        route_presets = json.loads(DEST_OUT.read_text(encoding='utf-8-sig')).get('routePresets', [])
    route_map = {route.get('id'): route for route in routes if route.get('id')}
    dest_map = {dest.get('id'): dest for dest in route_presets if dest.get('id')}
    return route_map, dest_map


def parse_rows_with_times(text, start_marker, end_marker=None):
    if start_marker and start_marker in text:
        segment = text.split(start_marker, 1)[1]
    else:
        segment = text
    if end_marker and end_marker in segment:
        segment = segment.split(end_marker, 1)[0]

    lines = [line.strip() for line in segment.splitlines() if line.strip()]
    rows = []
    i = 0
    while i < len(lines):
        if re.match(r'^\d+\s', lines[i]):
            row = lines[i]
            j = i + 1
            while j < len(lines) and not re.match(r'^\d+\s', lines[j]):
                if "운행" in lines[j] or "연락처" in lines[j]:
                    break
                row += " " + lines[j]
                j += 1
            rows.append(row)
            i = j
        else:
            i += 1
    return rows


def build_stops_from_rows(rows, stop_names, route_name):
    stop_times = {name: [] for name in stop_names}
    for row in rows:
        times = [normalize_time(t) for t in TIME_RE.findall(row)]
        if not times:
            continue
        # first value is usually the run number
        if re.match(r'^\d+$', row.split()[0]):
            if len(times) >= len(stop_names) + 1:
                times = times[1:]
        for idx, name in enumerate(stop_names):
            if idx < len(times):
                stop_times[name].append(times[idx])

    stops = []
    for idx, name in enumerate(stop_names):
        stops.append({
            'id': f'stop-{idx+1}',
            'name': name,
            'direction': route_name,
            'default': idx == 0,
            'times': {
                'weekday': dedupe(stop_times[name]),
                'weekend': []
            }
        })
    return stops


def extract_stop_names_from_table(table, skip_tokens=None):
    if not table.get('rows'):
        return []
    header = table['rows'][0]
    for row in table['rows']:
        row_text = ' '.join(row)
        if 'No' in row_text or '번호' in row_text:
            header = row
            break
    names = []
    for cell in header:
        text = cell.replace('\n', ' ').strip()
        if not text:
            continue
        tokens = skip_tokens or ['No', '번호', '비고', '회차', '차수', '배차', '간격']
        if any(token in text for token in tokens):
            continue
        names.append(text)
    return names


def apply_english_names(route, en_names):
    if not en_names:
        return
    for idx, stop in enumerate(route.get('stops', [])):
        if idx < len(en_names) and en_names[idx]:
            stop['nameEn'] = en_names[idx]


def apply_english_stops_by_index(route, en_stops):
    if not en_stops:
        return
    for idx, stop in enumerate(route.get('stops', [])):
        if idx >= len(en_stops):
            break
        en_name = en_stops[idx].get('name', '').strip()
        bad_tokens = {'arr.', 'dep.', 'arr', 'dep', 'no', 'remarks'}
        if en_name and en_name.lower() not in bad_tokens and len(en_name) >= 3:
            stop['nameEn'] = en_name
        en_direction = en_stops[idx].get('direction', '').strip()
        if en_direction:
            stop['directionEn'] = en_direction


def build_english_stops(page, tables_en):
    if not tables_en:
        return []

    if page['id'] == 'olev':
        return [{'name': name, 'direction': page.get('nameEn', '')} for name in OLEV_STOPS_EN]
    # For non-OLEV routes, EN page table structure changes frequently and
    # produces unstable stop-name alignment. Keep stop-level EN names manual
    # via stop_name_overrides_en.json for reliability.
    return []


def load_stop_name_overrides_en():
    if not STOP_EN_OVERRIDE_OUT.exists():
        return {}
    try:
        data = json.loads(STOP_EN_OVERRIDE_OUT.read_text(encoding='utf-8-sig'))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def apply_stop_name_overrides_en(route, overrides):
    if not overrides:
        return
    route_overrides = overrides.get(route.get('id'), {})
    if not isinstance(route_overrides, dict):
        return
    for stop in route.get('stops', []):
        en_name = route_overrides.get(stop.get('name'))
        if en_name:
            stop['nameEn'] = en_name


def parse_rows_by_tokens(text, start_marker, end_marker, stop_count):
    if start_marker and start_marker in text:
        segment = text.split(start_marker, 1)[1]
    else:
        segment = text
    if end_marker and end_marker in segment:
        segment = segment.split(end_marker, 1)[0]

    tokens = re.findall(r'\d{1,2}:\d{2}|\b\d+\b', segment)
    rows = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token.isdigit() and i + 1 < len(tokens) and ":" in tokens[i + 1]:
            i += 1
            row_times = []
            while i < len(tokens) and len(row_times) < stop_count:
                if ":" in tokens[i]:
                    row_times.append(normalize_time(tokens[i]))
                i += 1
            if len(row_times) == stop_count:
                rows.append(row_times)
        else:
            i += 1
    return rows


def build_stops_from_time_matrix(rows, stop_names, route_name):
    if not rows:
        return []
    stop_times = {name: [] for name in stop_names}
    for row in rows:
        for idx, name in enumerate(stop_names):
            if idx < len(row):
                stop_times[name].append(row[idx])
    stops = []
    for idx, name in enumerate(stop_names):
        stops.append({
            'id': f'stop-{idx+1}',
            'name': name,
            'direction': route_name,
            'default': idx == 0,
            'times': {
                'weekday': dedupe(stop_times[name]),
                'weekend': []
            }
        })
    return stops


def has_any_times(stops):
    for stop in stops:
        if stop.get('times', {}).get('weekday'):
            return True
    return False


def score_stops(stops):
    return sum(len(stop.get('times', {}).get('weekday', [])) for stop in stops)


def build_stops_from_time_chunks(times, stop_names, route_name):
    if not times:
        return []
    chunk = len(stop_names)
    if chunk == 0:
        return []
    stop_times = {name: [] for name in stop_names}
    for i in range(0, len(times) - (len(times) % chunk), chunk):
        group = times[i:i + chunk]
        for idx, name in enumerate(stop_names):
            stop_times[name].append(group[idx])
    stops = []
    for idx, name in enumerate(stop_names):
        stops.append({
            'id': f'stop-{idx+1}',
            'name': name,
            'direction': route_name,
            'default': idx == 0,
            'times': {
                'weekday': dedupe(stop_times[name]),
                'weekend': []
            }
        })
    return stops


def merge_stops_by_day(base_list, incoming, day):
    if not incoming:
        return base_list
    by_name = {stop['name']: stop for stop in base_list}
    for stop in incoming:
        name = stop['name']
        if name not in by_name:
            by_name[name] = {
                'id': stop['id'],
                'name': name,
                'direction': stop['direction'],
                'default': stop.get('default', False),
                'times': {
                    'weekday': [],
                    'weekend': []
                }
            }
            base_list.append(by_name[name])
        by_name[name]['times'][day] = stop.get('times', {}).get('weekday', [])
    return base_list


def detect_day_from_table(table):
    heading = table.get('heading', '')
    row_text = ' '.join(' '.join(row) for row in table.get('rows', []))
    haystack = f"{heading} {row_text}"
    weekend_tokens = ['주말', '토', '일', '휴일', '토요일', '일요일']
    return 'weekend' if any(token in haystack for token in weekend_tokens) else 'weekday'

WOLPYEONG_STOP_NAMES = [
    "본교 출발 교수회관 (N6)",
    "본교 출발 강당 (E10)",
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


def pick_tables(tables, hint):
    if hint:
        matched = [t for t in tables if hint in t['heading']]
        if matched:
            return matched
    return tables


def sort_service_times(times):
    def key_fn(t):
        m = re.match(r'^(\d{1,2}):(\d{2})$', t)
        if not m:
            return 10**9
        h = int(m.group(1))
        mm = int(m.group(2))
        total = h * 60 + mm
        if h < 4:
            total += 1440
        return total
    return sorted(times, key=key_fn)


def unique_service_times(times):
    seen = set()
    ordered = []
    for t in sort_service_times(times):
        if t and t not in seen:
            seen.add(t)
            ordered.append(t)
    return ordered


def _find_second_munji_departure_data_column(rows):
    """주중 표에서 '문지→본교 직통' 시간이 있는 열의 **데이터 행 기준** 인덱스 반환.
    표에서 07:30이 두 번 나옴: 화암 출발(첫 번째), 문지 도착(두 번째). 문지 도착 열(7:30, 8:00, 8:30, 9:00…)
    만 문지→본교 직통이므로, 첫 데이터 행에서 07:30이 들어 있는 열 중 **두 번째** 열을 쓴다."""
    if len(rows) < 3:
        return None
    first_data = list(rows[2])
    cols_with_0730 = []
    for i, cell in enumerate(first_data):
        if not cell:
            continue
        times = TIME_RE.findall(cell)
        if not times:
            continue
        t = normalize_time(times[0])
        if t == "07:30":
            cols_with_0730.append(i)
    # 두 번째 07:30 열 = 문지 도착(문지→본교 직통)
    return cols_with_0730[1] if len(cols_with_0730) >= 2 else (cols_with_0730[0] if cols_with_0730 else None)


def parse_campus_loop_weekday_pairs(table):
    if not table or not table.get('rows'):
        return {}, {}

    all_rows = table.get('rows', [])
    munji_to_main_col = _find_second_munji_departure_data_column(all_rows)

    pairs = {
        'main->munji': [],
        'main->hwaam': [],
        'munji->main': [],
        'munji->hwaam': [],
        'hwaam->main': [],
        'hwaam->munji': [],
    }
    express = {
        'hwaam->main': []
    }

    rows = all_rows[2:]
    for raw in rows:
        row = (list(raw) + [""] * 17)[:17]
        # 회차 번호가 없어도(15회차 이후 열 구조) 두 번째 문지 출발 후보가 있으면 처리
        is_data_row = row[0].strip().isdigit()
        has_munji_main_candidate = (
            (munji_to_main_col is not None and munji_to_main_col < len(row) and TIME_RE.search(row[munji_to_main_col] or ""))
            or (len(row) >= 2 and TIME_RE.search(row[1] or ""))
        )
        if not is_data_row and not has_munji_main_candidate:
            continue

        c1 = [normalize_time(t) for t in TIME_RE.findall(row[1] or "")]
        c2 = [normalize_time(t) for t in TIME_RE.findall(row[2] or "")]
        c4 = [normalize_time(t) for t in TIME_RE.findall(row[4] or "")]
        c5 = [normalize_time(t) for t in TIME_RE.findall(row[5] or "")]
        c7 = [normalize_time(t) for t in TIME_RE.findall(row[7] or "")]
        c8 = [normalize_time(t) for t in TIME_RE.findall(row[8] or "")]
        c10 = [normalize_time(t) for t in TIME_RE.findall(row[10] or "")]
        c11 = [normalize_time(t) for t in TIME_RE.findall(row[11] or "")]
        c12 = [normalize_time(t) for t in TIME_RE.findall(row[12] or "")]
        c14 = [normalize_time(t) for t in TIME_RE.findall(row[14] or "")]

        # 본교 출발 기준
        if c7:
            main_dep = c7[0]
            if c8 and row[8].strip() != "-":
                main_dep = c8[0]
            # 23회차 등 본교 출발 칸이 '-' 인 경우: 교수아파트 도착 시각에서 역산
            elif row[8].strip() == "-" and c10 and c7[0] in ("00:10", "0:10"):
                main_dep = add_minutes(c10[0], -15)
            pairs['main->munji'].append(main_dep)
            if c12:
                pairs['main->hwaam'].append(main_dep)

        # 문지 -> 본교(주중): 첫 번째 '문지 출발' 열은 문지→화암→문지→본교(경유)이므로 제외.
        # 두 번째 '문지 출발' 열만 문지→본교 직통이므로 그 열만 사용.
        munji_dep_to_main = ""
        if munji_to_main_col is not None and munji_to_main_col < len(row):
            cell_times = [normalize_time(t) for t in TIME_RE.findall(row[munji_to_main_col] or "")]
            if cell_times:
                munji_dep_to_main = cell_times[0]
        # 15회차 이후 등 열 구조가 다른 행: 첫 몇 열이 비어 있고 두 번째 문지 출발이 열 5에 있음(17:40, 18:10…)
        for fallback_col in (5, 1, 2):
            if not munji_dep_to_main and len(row) > fallback_col:
                cell_times = [normalize_time(t) for t in TIME_RE.findall(row[fallback_col] or "")]
                if cell_times:
                    munji_dep_to_main = cell_times[0]
                    break
        if munji_dep_to_main:
            pairs['munji->main'].append(munji_dep_to_main)
        elif munji_to_main_col is None and c7:
            # 헤더에서 두 번째 문지 출발 열을 못 찾은 경우 기존 로직(c5/c4) 폴백
            fallback = c5[0] if c5 else (c4[0] if c4 else "")
            if fallback:
                pairs['munji->main'].append(fallback)

        # 문지 -> 화암: 문지(1) 출발 + 문지(2/3) 출발
        if c1 and c2:
            pairs['munji->hwaam'].append(c1[0])
        munji_dep_to_hwaam = ""
        if c11:
            munji_dep_to_hwaam = c11[0]
        elif c10 and c12 and (row[8] or "").strip() != "-" and (row[10] or "").strip() != "-":
            # 일부 행은 문지 출발(3) 칸이 생략되어 문지 도착(2) 칸 시간(c10)을 그대로 사용
            munji_dep_to_hwaam = c10[0]
        if munji_dep_to_hwaam and c12:
            pairs['munji->hwaam'].append(munji_dep_to_hwaam)

        # 화암 -> 본교 / 문지
        if c2 and c7:
            base = c2[0]
            pairs['hwaam->main'].append(base)
            # "7:40 7:50 직행" 형태는 7:40 일반 + 7:50 직행 의미
            pairs['hwaam->munji'].append(base)
            if '직행' in (row[2] or "") and len(c2) >= 2:
                pairs['hwaam->main'].append(c2[1])
                express['hwaam->main'].append(c2[1])

        if c12 and c14:
            pairs['hwaam->munji'].append(c12[0])
        elif c10 and c12 and (row[8] or "").strip() == "-" and (row[10] or "").strip() != "-":
            # 23회차처럼 문지 도착 칸이 병합/누락된 행 보정
            pairs['hwaam->munji'].append(c10[0])

    normalized_pairs = {k: unique_service_times(v) for k, v in pairs.items()}
    normalized_express = {k: unique_service_times(v) for k, v in express.items()}
    return normalized_pairs, normalized_express


def parse_campus_loop_weekend_pairs(table):
    if not table or not table.get('rows'):
        return {}, {}

    pairs = {
        'main->munji': [],
        'main->hwaam': [],
        'munji->main': [],
        'munji->hwaam': [],
        'hwaam->main': [],
        'hwaam->munji': [],
    }
    express = {
        'hwaam->main': []
    }

    rows = table.get('rows', [])[1:]
    for raw in rows:
        row = (list(raw) + [""] * 10)[:10]
        if not row[0].strip().isdigit():
            continue

        c1 = [normalize_time(t) for t in TIME_RE.findall(row[1] or "")]  # 문지캠퍼스
        c2 = [normalize_time(t) for t in TIME_RE.findall(row[2] or "")]  # 화암기숙사
        c3 = [normalize_time(t) for t in TIME_RE.findall(row[3] or "")]  # 문지캠퍼스(2)
        c5 = [normalize_time(t) for t in TIME_RE.findall(row[5] or "")]  # 본교
        c7 = [normalize_time(t) for t in TIME_RE.findall(row[7] or "")]  # 화암기숙사(2) / 문지(3)
        c8 = [normalize_time(t) for t in TIME_RE.findall(row[8] or "")]  # 문지캠퍼스(3)

        # 문지 -> 화암
        if c1 and c2:
            pairs['munji->hwaam'].append(c1[0])

        # 화암 -> 본교 / 문지
        if c2 and c5:
            pairs['hwaam->main'].append(c2[0])
            pairs['hwaam->munji'].append(c2[0])
        if c7 and c8:
            pairs['hwaam->munji'].append(c7[0])

        # 문지 -> 본교 (주말): 첫 문지 출발(c1)은 화암 경유 후 재문지 도착까지 포함되므로 제외
        # 실제로 문지에서 본교로 바로 가는 체감 경로는 문지(2) 출발(c3) 기준만 사용
        if c3 and c5:
            pairs['munji->main'].append(c3[0])

        # 본교 -> 문지 / 화암(주말 요청 경유, 11:30 제외)
        munji_arr = c8[0] if c8 else (c7[0] if c7 else "")
        if c5 and munji_arr:
            main_depart = c5[0]
            pairs['main->munji'].append(main_depart)
            if main_depart != "11:30":
                pairs['main->hwaam'].append(main_depart)

    normalized_pairs = {k: unique_service_times(v) for k, v in pairs.items()}
    normalized_express = {k: unique_service_times(v) for k, v in express.items()}
    return normalized_pairs, normalized_express


def build_routes():
    routes = []
    route_presets = []
    existing_routes, existing_route_presets = load_existing_data()
    stop_name_overrides_en = load_stop_name_overrides_en()

    for page in PAGES:
        try:
            html = fetch_html(page['url'])
        except Exception as exc:
            if page['id'] == 'commute':
                continue
            existing = existing_routes.get(page['id'])
            if existing:
                routes.append(existing)
                dest = existing_route_presets.get(page['id'])
                if dest:
                    route_presets.append(dest)
                if page['id'] == 'wolpyeong':
                    early_existing = existing_routes.get('wolpyeong-early')
                    if early_existing:
                        routes.append(early_existing)
                        early_dest = existing_route_presets.get('wolpyeong-early')
                        if early_dest:
                            route_presets.append(early_dest)
                print(f"[WARN] {page['id']} fetch failed: {exc}. Using existing data.")
                continue
            raise RuntimeError(f"Failed to fetch {page['id']} and no existing data.") from exc
        html_en = ""
        tables_en = []
        try:
            if page.get('urlEn'):
                html_en = fetch_html(page['urlEn'])
                parser_en = TableExtractor()
                parser_en.feed(html_en)
                tables_en = parser_en.tables
        except Exception as exc:
            print(f"[WARN] {page['id']} EN fetch failed: {exc}. Falling back to KO names.")
        parser = TableExtractor()
        parser.feed(html)
        tables = parser.tables
        text = extract_text(html)
        debug_enabled = os.environ.get("KAIST_SCRAPE_DEBUG") == "1"

        stops = []
        campus_weekday_pairs = {}
        campus_weekday_express = {}
        if page['id'] == 'olev':
            base_times = extract_times_from_tables(tables, page.get('table_hint'))
            stops = parse_olev(base_times)
        elif page['id'] == 'wolpyeong':
            rows = parse_rows_with_times(text, "운영시간표", "시내 도로 사정")
            stops = build_stops_from_rows(rows, WOLPYEONG_STOP_NAMES, page['name'])
            if not has_any_times(stops):
                segment_times = extract_times_from_text(text)
                stops = build_stops_from_time_chunks(segment_times, WOLPYEONG_STOP_NAMES, page['name'])
            if not has_any_times(stops):
                target_tables = pick_tables(tables, page.get('table_hint'))
                for table in target_tables:
                    stops = table_to_stops(table, page['name'])
                    if stops:
                        break
        elif page['id'] == 'campus-loop':
            target_tables = pick_tables(tables, page.get('table_hint'))
            merged = []
            best_score = -1
            campus_weekday_pairs = {}
            campus_weekday_express = {}
            campus_weekend_pairs = {}
            campus_weekend_express = {}
            weekday_tables = [t for t in target_tables if detect_day_from_table(t) == 'weekday']
            weekend_tables = [t for t in target_tables if detect_day_from_table(t) == 'weekend']
            if weekday_tables:
                campus_weekday_pairs, campus_weekday_express = parse_campus_loop_weekday_pairs(weekday_tables[0])
            if weekend_tables:
                campus_weekend_pairs, campus_weekend_express = parse_campus_loop_weekend_pairs(weekend_tables[0])
            for table in target_tables:
                day = detect_day_from_table(table)
                candidates = []
                candidates.append(table_to_stops(table, page['name']))
                candidates.append(table_to_stops(
                    table,
                    page['name'],
                    skip_tokens=['No', '번호', '비고', '배차', '간격', '회차', '차수']
                ))
                best_candidate = []
                best_candidate_score = -1
                for candidate in candidates:
                    score = score_stops(candidate)
                    if score > best_candidate_score:
                        best_candidate_score = score
                        best_candidate = candidate
                if best_candidate:
                    merged = merge_stops_by_day(merged, best_candidate, day)
                    best_score = max(best_score, best_candidate_score)
            stops = merged
            if stops:
                for stop in stops:
                    stop['name'] = re.sub(r'\s+', ' ', stop['name']).strip()
                    stop['name'] = re.sub(r'(출발|도착)\\s+\\1', r'\\1', stop['name'])
                filtered = [
                    stop for stop in stops
                    if stop.get('times', {}).get('weekday') or stop.get('times', {}).get('weekend')
                ]
                if filtered:
                    stops = filtered
        elif page['id'] == 'commute':
            # 통근버스는 현재 노선에서 제외
            continue
        else:
            target_tables = pick_tables(tables, page.get('table_hint'))
            for table in target_tables:
                stops = table_to_stops(table, page['name'])
                if stops:
                    break

        # fallback: no table parse
        if not stops:
            base_times = extract_times_from_tables(tables, page.get('table_hint'))
            if not base_times:
                base_times = extract_times_from_text(html)
            stops = [{
                'id': 'origin',
                'name': '출발 기준',
                'direction': page['name'],
                'default': True,
                'times': {
                    'weekday': base_times,
                    'weekend': []
                }
            }]

        route = {
            'id': page['id'],
            'name': page['name'],
            'nameEn': page.get('nameEn', ''),
            'group': 'official',
            'sourceUrl': page['url'],
            'stops': stops
        }

        if page['id'] == 'campus-loop':
            route['campusPairs'] = {
                'weekday': campus_weekday_pairs,
                'weekend': campus_weekend_pairs
            }
            route['campusExpress'] = {
                'weekday': campus_weekday_express,
                'weekend': campus_weekend_express
            }
            # 문지→본교: 첫 번째 '문지 출발' 열(문지→화암→문지 경유) 제외, 두 번째 열만 직통
            route['campusPairExcludeTimes'] = {
                'munji->main': [
                    '07:10', '08:10', '08:40', '09:20', '09:50', '10:20', '10:50', '11:50',
                    '13:20', '14:25', '15:20', '16:20', '16:50'
                ]
            }

        if tables_en:
            en_stops = build_english_stops(page, tables_en)
            if en_stops:
                apply_english_stops_by_index(route, en_stops)

        apply_stop_name_overrides_en(route, stop_name_overrides_en)

        if page['id'] == 'wolpyeong':
            route['note'] = (
                "• 시내 도로 사정에 따라 각 정류장 도착 예정 시간보다 늦을 수 있습니다. (정류장 위치 첨부파일 참조)\n"
                "• 8회차(17:05출발) 차량은 학기 중 미니버스 2대, 방학기간에는 대형버스 1대로 운행됩니다.\n"
                "• 9회차(18:05출발) 차량은 퇴근시간 도로혼잡으로 예정도착시간과 많은 차이가 있을 수 있습니다."
            )

        routes.append(route)

        route_presets.append({
            'id': page['id'],
            'name': page['name'],
            'nameEn': page.get('nameEn', ''),
            'stops': [{
                'routeId': page['id'],
                'stopId': stops[0]['id'] if stops else 'origin'
            }]
        })

        if page['id'] == 'wolpyeong':
            # Try to find early-wolpyeong shuttle table
            early_rows = parse_rows_with_times(text, "월평-유성온천역-본교 운행", "비상시 연락처")
            early_stops = build_stops_from_rows(
                early_rows,
                EARLY_WOLPYEONG_STOP_NAMES,
                "월평-유성온천역-본교 (얼리월평 셔틀)"
            )
            if not has_any_times(early_stops):
                segment_times = extract_times_from_text(text)
                early_stops = build_stops_from_time_chunks(
                    segment_times,
                    EARLY_WOLPYEONG_STOP_NAMES,
                    "월평-유성온천역-본교 (얼리월평 셔틀)"
                )
            if not has_any_times(early_stops):
                # fallback to table parse if text parse failed
                for table in tables:
                    heading = table.get('heading', '')
                    row_text = ' '.join(' '.join(row) for row in table.get('rows', []))
                    if '얼리월평' in heading or '얼리월평' in row_text or '유성온천역' in row_text:
                        early_stops = table_to_stops(table, "월평-유성온천역-본교 (얼리월평 셔틀)")
                        break

            if early_stops and has_any_times(early_stops):
                routes.append({
                    'id': 'wolpyeong-early',
                    'name': '월평-유성온천역-본교 (얼리월평 셔틀)',
                    'nameEn': 'Wolpyeong-Yuseong Spa-Main Campus (Early Shuttle)',
                    'group': 'official',
                    'sourceUrl': page['url'],
                    'stops': early_stops
                })
                apply_stop_name_overrides_en(routes[-1], stop_name_overrides_en)
                route_presets.append({
                    'id': 'wolpyeong-early',
                    'name': '월평-유성온천역-본교 (얼리월평 셔틀)',
                    'nameEn': 'Wolpyeong-Yuseong Spa-Main Campus (Early Shuttle)',
                    'stops': [{
                        'routeId': 'wolpyeong-early',
                        'stopId': early_stops[0]['id']
                    }]
                })

    return routes, route_presets


def main():
    try:
        routes, route_presets = build_routes()
    except Exception as exc:
        print(f"[WARN] Update failed: {exc}. Keeping existing data.")
        return 0

    if not routes:
        print("[WARN] No routes built. Keeping existing data.")
        return 0

    ROUTES_OUT.write_text(
        json.dumps({'routes': routes}, ensure_ascii=False, indent=2),
        encoding='utf-8-sig'
    )
    DEST_OUT.write_text(
        json.dumps({'routePresets': route_presets}, ensure_ascii=False, indent=2),
        encoding='utf-8-sig'
    )

    print(f"routes: {len(routes)}")
    print(f"routePresets: {len(route_presets)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())












