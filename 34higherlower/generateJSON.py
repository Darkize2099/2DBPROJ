import json
import requests
import re


def getCount(name):
    print(name) # Debug character name before retrieving from API
    API_ENDPOINT = "https://api.rule34.xxx/index.php?page=dapi&s=tag&q=index&name="
    try:
        response = requests.get(API_ENDPOINT + name, timeout=10)
        if response.status_code != 200:
            print(f"Failed to retrieve data. Status code: {response.status_code}")
            return
    except requests.exceptions.Timeout:
        print("Failed to recieve API response before timeout")
        return
    count = re.search(r'count="(.*?)"', response.text)
    if not count:
        return
    print(count.group(1)) #Debug count before returning value
    return int(count.group(1))


def generateJSON(characters, name):
    new = []
    for character in characters['characters']:
        if "'" in character['name']:
            character['name'] = character['name'].replace("'", "%26%23039%3B")
        if "+" in character['name']:
            character['name'] = character['name'].replace("+", "%2B")
        if "Å«" in character['name']:
            character['name'] = character['name'].replace("Å«", "%C5%AB")
        if "Ã¶" in character['name']:
            character['name'] = character['name'].replace("Ã¶", "%26ouml%3B")

        series = character['series']
        count = getCount(character['name'])
        if not count:
            continue

        entry = {
            'name': character['name'],
            'series': series,
            'count': count
        }
        new.append(entry)
    
    if name == ("eastern_media_characters.json"):
        with open('eastern_media_count.json', 'w') as file:
            json.dump({'characters': new}, file, indent=4)

    elif name == ("western_media_characters.json"):
        with open('western_media_count.json', 'w') as file:
            json.dump({'characters': new}, file, indent=4)

    elif name == ("gaming_characters.json"):
        with open('gaming_count.json', 'w') as file:
            json.dump({'characters': new}, file, indent=4)

    return


def generateAll():
    name = "gaming_characters.json"
    with open(name, 'r') as file:
        gaming = json.load(file)
        generateJSON(gaming, name)

    name = "eastern_media_characters.json"
    with open(name, 'r') as file:
        eastern = json.load(file)
        generateJSON(eastern, name)

    name = "western_media_characters.json"
    with open(name, 'r') as file:
        western = json.load(file)
        generateJSON(western, name)

    return


generateAll()