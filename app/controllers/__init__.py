from datetime import datetime
from datetime import date

from flask import Flask, redirect, url_for, abort
from flask import Blueprint

blueprint = Blueprint('__init__', __name__, url_prefix='/')


@blueprint.route("")
def main_api():
    return redirect(url_for('bus.list_api'))


@blueprint.route("<int:campus_id>")
def _campus_api(campus_id):
    return redirect(url_for('bus.list_api'))
