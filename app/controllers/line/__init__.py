from datetime import datetime
from datetime import date

from flask import Flask, redirect, url_for, abort
from flask import Blueprint

blueprint = Blueprint('line', __name__, url_prefix='/line')


@blueprint.route("")
def list_api():
    return redirect(url_for('bus.list_api'))


@blueprint.route("/<int:line_id>")
def detail_api(line_id):
    return redirect(url_for('bus.list_api'))
