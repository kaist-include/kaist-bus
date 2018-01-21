from datetime import datetime
from datetime import date

from flask import Flask, render_template, redirect, url_for, abort
from flask import Blueprint
from flask import request

from ...func import firebase_api
from ...func.weekday import get_weekday, put_weekday

blueprint = Blueprint('bus', __name__, url_prefix='/buses')


@blueprint.route("")
def list_api():
    return render_template(
        "bus/list_api.html",
        buses=firebase_api.bus_list_api(),
        weekday=get_weekday())


@blueprint.route("/<int:bus_id>")
def detail_api(bus_id):
    bus = firebase_api.bus_detail_api(bus_id)
    if bus is None:
        abort(404)

    return render_template(
        "bus/detail_api.html",
        buses=firebase_api.bus_list_api(),
        bus=bus,
        weekday=get_weekday())


@blueprint.route("/weekday")
def weekday_api():
    data = request.args

    weekday = data.get('weekday', None, type=int)
    if weekday is not None:
        put_weekday(weekday)

    next_url = data.get('next_url', None)
    return redirect(next_url)
