import app.core as core

server = core.init_server()
app = server.app
controllers = server.controllers

controller_name_maxlen = max(map(lambda s: len(s), controllers))
for controller_name in controllers:
    # load controller
    controller_module = __import__(
        'app.controllers.{}'.format(controller_name), globals(), locals(), '*')

    # load blueprint
    blueprint = controller_module.blueprint
    app.register_blueprint(blueprint)

if __name__ == '__main__':
    app.run(
        '0.0.0.0',
        port=app.config.get('PORT'),
        debug=app.config.get('DEBUG', False),
        use_reloader=True,
        threaded=True)
