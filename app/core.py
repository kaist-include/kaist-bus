import os

server = None


def init_server():
    from flask import Flask

    import sys
    import os

    app = Flask(__name__, static_url_path='/static')

    # Load configuration
    from .configs import common as config_common
    from .configs import local as config_local
    app.config.from_object(config_common)
    app.config.from_object(config_local)
    if app.config.get('DEBUG'):
        app.secret_key = app.config.get('SECRET_KEY')
    else:
        app.secret_key = os.urandom(24)

    from firebase import firebase

    global server

    class ServerObject(object):
        pass

    server = ServerObject()
    server.app = app
    server.controllers = app.config.get('ATTACHING_CONTROLLERS', [])
    server.debug = app.config.get('DEBUG')
    server.select_limit = app.config.get('SELECT_LIMIT')
    server.firebase_app = firebase.FirebaseApplication(
        'https://proven-entropy-106213.firebaseio.com/', None)
    return server
