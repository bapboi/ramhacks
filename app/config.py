import json


def load_config():
    with open("appsettings.json") as f:
        return json.load(f)


config = load_config()
