from datetime import datetime
from datetime import date

from flask import Flask, render_template, redirect, url_for, abort
from flask import Blueprint

from ...func import firebase_api

blueprint = Blueprint('bus', __name__, url_prefix='/buses')


def is_weekday():
    return date.today().weekday() < 5


@blueprint.route("")
def list_api():
    return render_template(
        "bus/list_api.html", buses=firebase_api.bus_list_api())


@blueprint.route("/<int:bus_id>")
def detail_api(bus_id):
    bus = firebase_api.bus_detail_api(bus_id)
    if bus is None:
        abort(404)

    return render_template(
        "bus/detail_api.html", buses=firebase_api.bus_list_api(), bus=bus)
