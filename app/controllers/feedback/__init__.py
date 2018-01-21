from datetime import datetime
from datetime import date

from flask import Flask, render_template, redirect, url_for, abort
from flask import Blueprint
from flask import request
from flask import flash

blueprint = Blueprint('feedback', __name__, url_prefix='/feedbacks')


@blueprint.route("", methods=["POST"])
def add_api():
    data = request.form
    description = data.get('description', None)
    if not description:
        description=  ''
    description = description.strip()
    if description:
        flash('성공적으로 피드백이 전송되었습니다.')
    else:
        flash('피드백 내용을 입력해 주세요.')

    next_url = request.args.get('next_url', None)
    return redirect(next_url)
