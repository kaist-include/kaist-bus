"""Regression fixtures captured from the official KO pages on 2026-10-08 KST."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('scrape', ROOT / 'scripts/kaist_scrape.py')
scrape = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scrape)
FIXTURES = Path(__file__).parent / 'fixtures'


def tables(name):
    parser = scrape.TableExtractor()
    parser.feed((FIXTURES / f'{name}.html').read_text())
    return parser.tables


def fixture_fetch(url):
    page = next(p for p in scrape.PAGES if p['url'] == url)
    return (FIXTURES / f"{page['id']}.html").read_text()


class ScraperTests(unittest.TestCase):
    def test_missing_tr_and_td_are_recovered(self):
        rows = tables('campus-loop')[0]['rows']
        self.assertEqual([r[0] for r in rows[2:]], [str(i) for i in range(1, 26)])
        self.assertEqual(rows[8][1:10], ['10:20', '10:30', '10:30', '10:40', '10:40',
                                       '10:44', '11:00', '11:00', '11:15'])
        self.assertEqual(rows[24][7:15], ['0:00', '0:00', '0:10', '-', '-', '0:15', '0:15', '0:25'])

    def test_rowspan_preserves_weekend_stop_columns(self):
        rows = tables('campus-loop')[1]['rows']
        self.assertEqual(len(rows), 14)
        for row in rows[1:]:
            self.assertEqual(len(row), 10)
            self.assertIn('요청', row[7])
        self.assertEqual(rows[2][8], '10:20')

    def test_early_only_one_run_and_no_regular_times(self):
        stops = scrape.parse_early_wolpyeong(tables('wolpyeong'))
        self.assertEqual([s['times']['weekday'] for s in stops],
                         [[t] for t in ['08:10', '08:15', '08:25', '08:32', '08:35', '08:36', '08:37', '08:38']])
        self.assertTrue(all(s['times']['weekend'] == [] for s in stops))

    def test_missing_duplicate_or_wrong_table_rejected(self):
        ts = tables('wolpyeong')
        for candidate in ([ts[0]], ts + [ts[1]]):
            with self.assertRaises(ValueError):
                scrape.parse_early_wolpyeong(candidate)
        changed = copy.deepcopy(ts)
        changed[1]['rows'][1][1:9] = reversed(changed[1]['rows'][1][1:9])
        with self.assertRaises(ValueError):
            scrape.parse_early_wolpyeong(changed)

    def test_partial_rows_and_invalid_times_rejected(self):
        for value in ('', '08:99', '99:15', '08:15 09:15'):
            ts = tables('wolpyeong')
            ts[1]['rows'][2][2] = value
            with self.assertRaises(ValueError):
                scrape.parse_early_wolpyeong(ts)
        ts = tables('campus-loop')
        del ts[0]['rows'][8]
        with self.assertRaises(ValueError):
            scrape.parse_campus_loop(ts)

    def test_normal_wolpyeong_matrix_unchanged(self):
        stops = scrape.parse_wolpyeong(tables('wolpyeong'))
        self.assertEqual(len(stops), 14)
        self.assertTrue(all(len(s['times']['weekday']) == 11 for s in stops))
        self.assertEqual(stops[0]['times']['weekday'],
                         ['09:05', '10:05', '11:05', '13:05', '14:05', '15:05',
                          '16:05', '17:05', '18:05', '20:05', '22:05'])
        self.assertEqual([s['times']['weekday'][8] for s in stops],
                         ['18:05', '18:06', '18:08', '18:09', '18:15', '18:20', '18:25',
                          '18:30', '18:40', '18:41', '18:43', '18:44', '18:45', '18:46'])

    def test_campus_pairs_and_arrival_departure(self):
        stops, meta = scrape.parse_campus_loop(tables('campus-loop'))
        pairs = meta['campusPairs']['weekday']
        expected_counts = {'main->munji': 25, 'main->hwaam': 21, 'munji->main': 25,
                           'munji->hwaam': 25, 'hwaam->main': 15, 'hwaam->munji': 28}
        self.assertEqual({k: len(v) for k, v in pairs.items()}, expected_counts)
        for pair, present, absent in [('main->munji', '11:00', '12:30'),
                                      ('munji->main', '14:40', '14:45'),
                                      ('munji->hwaam', '11:20', '11:25'),
                                      ('hwaam->main', '14:30', '14:35'),
                                      ('hwaam->munji', '11:30', '11:35')]:
            self.assertIn(present, pairs[pair])
            self.assertNotIn(absent, pairs[pair])
        self.assertEqual(pairs['main->munji'][-3:], ['00:00', '01:30', '03:00'])
        by_name = {s['name']: s for s in stops}
        self.assertIn('13:00', by_name['본교 출발']['times']['weekday'])
        self.assertNotIn('12:30', by_name['본교 출발']['times']['weekday'])
        self.assertIn('12:30', by_name['본교 도착']['times']['weekday'])
        self.assertEqual(len(by_name['문지캠퍼스 (3)']['times']['weekend']), 13)
        self.assertEqual(by_name['화암기숙사 (2)']['times']['weekend'], [])
        self.assertNotIn('11:30', meta['campusPairs']['weekend']['main->hwaam'])
        self.assertIn('11:30', meta['campusPairs']['weekend']['main->munji'])
        self.assertEqual(meta['campusExpress']['weekday']['hwaam->main'], ['07:50', '08:20', '08:50'])

    def test_olev_all_departures_and_offsets(self):
        stops = scrape.parse_olev(tables('olev'))
        self.assertEqual(len(stops), 11)
        expected = ['08:40', '08:55', '09:15', '09:35', '09:55', '10:10', '10:25', '10:45',
                    '11:05', '11:25', '11:45', '12:40', '12:55', '13:15', '13:35', '13:55',
                    '14:10', '14:25', '14:45', '15:05', '15:25', '15:40', '15:55', '16:15', '16:35', '16:55']
        self.assertEqual(sorted(stops[0]['times']['weekday']), expected)
        self.assertEqual(stops[-1]['times']['weekday'][-1], '17:06')

    def test_full_generation_is_reproducible(self):
        with patch.object(scrape, 'fetch_html', side_effect=fixture_fetch):
            first = scrape.build_routes()
            self.assertEqual(first, scrape.build_routes())
        self.assertEqual([r['id'] for r in first[0]], ['wolpyeong', 'wolpyeong-early', 'campus-loop', 'olev'])
        for route in first[0]:
            for day in ('weekday', 'weekend'):
                ids = [s['id'] for s in route['stops'] if s['times'][day]]
                self.assertEqual(len(ids), len(set(ids)))

    def test_failure_is_nonzero_and_preserves_both_outputs(self):
        with tempfile.TemporaryDirectory() as folder:
            routes, presets = Path(folder) / 'routes.json', Path(folder) / 'presets.json'
            routes.write_bytes(b'original routes')
            presets.write_bytes(b'original presets')
            for error in (OSError('network unavailable'), ValueError('invalid table')):
                with patch.object(scrape, 'ROUTES_OUT', routes), patch.object(scrape, 'DEST_OUT', presets), \
                     patch.object(scrape, 'build_routes', side_effect=error):
                    self.assertEqual(scrape.main(), 1)
                self.assertEqual(routes.read_bytes(), b'original routes')
                self.assertEqual(presets.read_bytes(), b'original presets')


if __name__ == '__main__':
    unittest.main()
