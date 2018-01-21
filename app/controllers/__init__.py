from datetime import datetime
from datetime import date

from flask import Flask, render_template, redirect, url_for, abort
from flask import Blueprint

blueprint = Blueprint('__init__', __name__, url_prefix='/')


def is_weekday():
    return date.today().weekday() < 5


def get_tab(tab_id):
    tab = {}
    if tab_id == 1:
        tab['name'] = '문지>본원'

        if is_weekday():
            times = []
            times.append("07:30")
            times.append("08:00")
            times.append("08:30")
            times.append("09:00")
            times.append("09:40")
            times.append("10:10")
            times.append("10:40")
            times.append("11:10")
            times.append("12:10")
            times.append("13:40")
            times.append("14:40")
            times.append("15:40")
            times.append("16:40")
            times.append("17:10")
            times.append("17:40")
            times.append("18:10")
            times.append("18:40")
            times.append("19:10")
            times.append("19:40")
            times.append("20:40")
            times.append("21:10")
            times.append("21:40")
            times.append("22:40")
            times.append("23:40")
            times.append("00:40")
            times.append("01:40")
            times.append("02:40")
            tab['times'] = times
            tab['time_description'] = '평일 시간표입니다'
        else:
            times = []
            times.append("08:10")
            times.append("09:40")
            times.append("11:10")
            times.append("12:40")
            times.append("14:10")
            times.append("15:40")
            times.append("17:10")
            times.append("18:40")
            times.append("20:10")
            times.append("21:40")
            times.append("23:10")
            times.append("24:40")
            times.append("02:10")
            tab['times'] = times
            tab['time_description'] = '주말/공휴일 시간표입니다'

    elif tab_id == 2:
        tab['name'] = '본원>문지'

        if is_weekday():
            times = []
            times.append("07:50")
            times.append("08:20")
            times.append("08:50")
            times.append("09:20")
            times.append("10:00")
            times.append("10:30")
            times.append("11:00")
            times.append("11:30")
            times.append("13:00")
            times.append("14:00")
            times.append("15:00")
            times.append("16:00")
            times.append("17:00")
            times.append("17:30")
            times.append("18:00")
            times.append("18:30")
            times.append("19:00")
            times.append("19:30")
            times.append("20:00")
            times.append("21:00")
            times.append("22:00")
            times.append("23:00")
            times.append("00:00")
            times.append("01:00")
            times.append("02:00")
            times.append("03:00")
            tab['times'] = times
            tab['time_description'] = '평일 시간표입니다'
        else:
            times = []
            times.append("08:30")
            times.append("10:00")
            times.append("11:30")
            times.append("13:00")
            times.append("14:30")
            times.append("16:00")
            times.append("17:30")
            times.append("19:00")
            times.append("20:30")
            times.append("22:00")
            times.append("23:30")
            times.append("01:00")
            times.append("02:30")
            tab['times'] = times
            tab['time_description'] = '주말/공휴일 시간표입니다'

    elif tab_id == 3:
        tab['name'] = '문지>화암'

        if is_weekday():
            times = []
            times.append("07:10")
            times.append("07:40")
            times.append("08:10")
            times.append("08:40")
            times.append("09:20")
            times.append("09:50")
            times.append("10:20")
            times.append("10:50")
            times.append("11:20")
            times.append("11:50")
            times.append("13:20")
            times.append("14:20")
            times.append("15:20")
            times.append("16:20")
            times.append("16:50")
            times.append("17:20")
            times.append("17:50")
            times.append("18:20")
            times.append("18:50")
            times.append("19:20")
            times.append("19:50")
            times.append("20:20")
            times.append("21:20")
            times.append("21:50")
            times.append("22:20")
            times.append("23:20")
            times.append("00:20")
            times.append("01:20")
            times.append("02:20")
            times.append("03:20")
            tab['times'] = times
            tab['time_description'] = '평일 시간표입니다'
        else:
            times = []
            times.append("07:50")
            times.append("09:20")
            times.append("10:50")
            times.append("12:20")
            times.append("13:50")
            times.append("15:20")
            times.append("16:50")
            times.append("18:20")
            times.append("19:50")
            times.append("21:20")
            times.append("22:50")
            times.append("24:20")
            times.append("01:50")
            tab['times'] = times
            tab['time_description'] = '주말/공휴일 시간표입니다'

    elif tab_id == 4:

        tab['name'] = '화암>문지'
        if is_weekday():

            times = []
            times.append("07:20")
            times.append("07:50")
            times.append("08:20")
            times.append("08:50")
            times.append("09:30")
            times.append("10:00")
            times.append("10:30")
            times.append("11:00")
            times.append("12:00")
            times.append("13:30")
            times.append("14:30")
            times.append("15:30")
            times.append("16:30")
            times.append("17:00")
            times.append("17:30")
            times.append("18:00")
            times.append("18:30")
            times.append("19:00")
            times.append("19:30")
            times.append("20:00")
            times.append("20:30")
            times.append("21:30")
            times.append("22:00")
            times.append("22:30")
            times.append("23:30")
            times.append("00:30")
            times.append("01:30")
            times.append("02:30")
            times.append("03:30")
            tab['times'] = times
            tab['time_description'] = '평일 시간표입니다'
        else:
            times = []
            times.append("08:00")
            times.append("09:30")
            times.append("11:00")
            times.append("12:30")
            times.append("14:00")
            times.append("15:30")
            times.append("17:00")
            times.append("18:30")
            times.append("20:00")
            times.append("21:30")
            times.append("23:00")
            times.append("24:30")
            times.append("02:00")
            tab['times'] = times
            tab['time_description'] = '주말/공휴일 시간표입니다'

    elif tab_id == 5:
        tab['name'] = '본원>월평'

        if is_weekday():
            times = []
            times.append("09:00")
            times.append("10:00")
            times.append("11:00")
            times.append("13:00")
            times.append("14:00")
            times.append("15:00")
            times.append("16:00")
            times.append("17:00")
            tab['times'] = times
            tab['time_description'] = '평일에만 운영합니다'
        else:
            tab['time_description'] = '주말/공휴일에는 운영하지 않습니다'

        offsets = []
        offsets.append(("본관", 2))
        offsets.append(("오리연못", 4))
        offsets.append(("충대앞", 10))
        offsets.append(("월평역(1번출구)", 15))
        offsets.append(("갤러리아", 25))
        offsets.append(("정부청사시외버스", 32))
        tab['offsets'] = offsets

    elif tab_id == 6:
        tab['name'] = '월평>본원'  #(밑에 장소별로 +시간 써두기)

        if is_weekday():
            times = []
            times.append("09:40")
            times.append("10:40")
            times.append("11:40")
            times.append("13:40")
            times.append("14:40")
            times.append("15:40")
            times.append("16:40")
            times.append("17:40")
            tab['times'] = times
            tab['time_description'] = '평일에만 운영합니다'
        else:
            tab['time_description'] = '주말/공휴일에는 운영하지 않습니다'

        offsets = []
        offsets.append(("오리연못", 3))
        offsets.append(("본관", 4))
        tab['offsets'] = offsets

    elif tab_id == 7:
        tab['name'] = '카이마루 출발'

        if is_weekday():
            times = []
            times.append("08:30")
            times.append("08:45")
            times.append("09:00")
            times.append("09:15")
            times.append("09:30")
            times.append("09:45")
            times.append("10:00")
            times.append("10:15")
            times.append("10:30")
            times.append("10:45")
            times.append("11:00")
            times.append("11:15")
            times.append("11:30")
            times.append("11:45")
            times.append("13:00")
            times.append("13:15")
            times.append("13:30")
            times.append("13:45")
            times.append("14:00")
            times.append("14:15")
            times.append("14:30")
            times.append("14:45")
            times.append("15:00")
            times.append("15:15")
            times.append("15:30")
            times.append("15:45")
            times.append("16:00")
            times.append("16:15")
            times.append("16:30")
            times.append("16:45")
            times.append("17:00")
            tab['times'] = times
            tab['time_description'] = '평일에만 운영합니다'
        else:
            tab['time_description'] = '주말/공휴일에는 운영하지 않습니다'

    elif tab_id == 8:
        tab['name'] = '중리>본원'

        if is_weekday():
            times = []
            times.append("07:35")
            tab['time_description'] = '평일에만 운영합니다'
            tab['times'] = times
        else:
            tab['time_description'] = '주말/공휴일에는 운영하지 않습니다'

    elif tab_id == 9:
        tab['name'] = '대동>본원'

        if is_weekday():
            tab['time_description'] = '평일에만 운영합니다'
            times = []
            times.append("07:40")
            tab['times'] = times
        else:
            tab['time_description'] = '주말/공휴일에는 운영하지 않습니다'
    elif tab_id == 10:
        tab['name'] = '본원>중리'

        if is_weekday():
            tab['time_description'] = '평일에만 운영합니다'
            times = []
            times.append("18:10")
            tab['times'] = times
        else:
            tab['time_description'] = '주말/공휴일에는 운영하지 않습니다'
    elif tab_id == 11:
        tab['name'] = '본원>대동'

        if is_weekday():
            tab['time_description'] = '평일에만 운영합니다'
            times = []
            times.append("18:10")
            tab['times'] = times
        else:
            tab['time_description'] = '주말/공휴일에는 운영하지 않습니다'

    tab['id'] = tab_id
    return tab


def get_tabs(line_id):
    tabs = []
    if line_id == 1:
        tabs.append(get_tab(1))
        tabs.append(get_tab(2))
        tabs.append(get_tab(3))
        tabs.append(get_tab(4))
    elif line_id == 2:
        tabs.append(get_tab(5))
        tabs.append(get_tab(6))
    elif line_id == 3:
        tabs.append(get_tab(7))
    elif line_id == 4:
        tabs.append(get_tab(8))
        tabs.append(get_tab(9))
        tabs.append(get_tab(10))
        tabs.append(get_tab(11))
    else:
        return None
    return tabs


def get_line(line_id):
    line = {}
    if line_id == 1:
        line['name'] = '문지-화암-본원'
        line[
            'reference_url'] = 'http://m.kaist.ac.kr/_prog/_board/?mode=V&no=226&code=shuttle&site_dvs_cd=kr&menu_dvs_cd=010701&skey=&sval=&site_dvs=mobile&GotoPage='
        line['update_date'] = '2016-06-19'
    elif line_id == 2:
        line['name'] = '월평-시내-본원'
        line[
            'reference_url'] = 'http://m.kaist.ac.kr/_prog/_board/?mode=V&no=228&code=shuttle&site_dvs_cd=kr&menu_dvs_cd=010701&skey=&sval=&site_dvs=mobile&GotoPage='
        line['update_date'] = '2016-06-19'
    elif line_id == 3:
        line['name'] = 'OLEV'
        line[
            'reference_url'] = 'http://m.kaist.ac.kr/_prog/_board/?mode=V&no=230&code=shuttle&site_dvs_cd=kr&menu_dvs_cd=010701&skey=&sval=&site_dvs=mobile&GotoPage='
        line['update_date'] = '2016-06-19'
    elif line_id == 4:
        line['name'] = '통근버스'
        line[
            'reference_url'] = 'http://m.kaist.ac.kr/_prog/_board/?mode=V&no=229&code=shuttle&site_dvs_cd=kr&menu_dvs_cd=010701&skey=&sval=&site_dvs=mobile&GotoPage='
        line['update_date'] = '2016-06-19'
    else:
        return None
    line['id'] = line_id
    return line


@blueprint.route("")
def main():
    return redirect(url_for('__init__.line_list'))


@blueprint.route("1")
def line_list():
    lines = [get_line(line_id) for line_id in range(1, 5)]
    return render_template("line_list.html", lines=lines)


@blueprint.route("line/<int:line_id>")
def line_detail(line_id):
    line = get_line(line_id)
    if line is None:
        abort(400)
    line['tabs'] = get_tabs(line_id)
    return render_template("line_detail.html", line=line)
