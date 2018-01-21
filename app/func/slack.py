import requests

from flask import request, url_for

from ..core import server

URL_JOONYOUNG = 'https://hooks.slack.com/services/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'


class Field():
    title = ''
    value = ''
    short = False

    def __init__(self, title='', value='', short=False):
        self.title = title
        self.value = value
        self.short = short

    def __json__(self):
        return {'title': self.title, 'value': self.value, 'short': self.short}


# https://api.slack.com/docs/messages/builder
class Attachment():

    title = ''
    title_link = None
    text = ''
    color = '#303A4B'
    fields = []

    def __init__(self, title, title_link='', fields=[], text='', color=None):
        self.title = title
        self.title_link = title_link
        self.fields = fields
        self.text = text
        if color:
            self.color = color

    def __json__(self):
        # {
        #     "fallback":
        #     "Required plain-text summary of the attachment.",
        #     "pretext":
        #     "",
        #     "author_name":
        #     "Bobby Tables",
        #     "author_link":
        #     "http://flickr.com/bobby/",
        #     "author_icon":
        #     "http://flickr.com/icons/bobby.jpg",
        #     "image_url":
        #     "http://my-website.com/path/to/image.jpg",
        #     "thumb_url":
        #     "http://example.com/path/to/thumb.png",
        #     "footer":
        #     "Slack API",
        #     "footer_icon":
        #     "https://platform.slack-edge.com/img/default_application_icon.png",
        #     "ts":
        #     123456789
        # }
        return {
            'title': self.title,
            'title_link': self.title_link,
            'color': self.color,
            'text': self.text,
            'fields': [f.__json__() for f in self.fields]
        }


def _send_slack_message(url, text, attachments=[]):
    """
        성공여부를 리턴합니다
    """
    if not url:
        return False

    if not text:
        return False

    if server.app.config.get('DEBUG'):
        url = URL_JOONYOUNG

    r = requests.post(
        url,
        json={
            "text": text,
            "attachments": [a.__json__() for a in attachments]
        })
    return (r.text == 'ok')


def post_feedback(description):
    return _send_slack_message(
        URL_JOONYOUNG,
        '[KAIST BUS] {description}'.format(description=description))
