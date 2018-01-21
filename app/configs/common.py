LOGGING_FILE_DIR = 'logs/'
LOGGING_LOGGER_NAME = "bus-web.log"
LOGGING_FORMAT = '[%(levelname)1.1s %(asctime)s P%(thread)d T%(process)d %(module)s:%(lineno)d] %(message)s'
LOGGING_FILE_MAX_BYTES = 1024 * 1024 * 1

SQLALCHEMY_POOL_RECYCLE = 540  # mariadb wait_timeout = 600
SQLALCHEMY_TRACK_MODIFICATIONS = True

ATTACHING_CONTROLLERS = [
    'bus',
    'feedback',
    'line',
    '__init__',
]
