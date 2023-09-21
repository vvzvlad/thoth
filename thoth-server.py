#!/usr/bin/env -S python3 -u

#
#############################################################################
# A server saving pages to disk and sending them to Meilisearch.
# /usr/local/opt/python/bin/python3.9 -m pip install --
#############################################################################
#


from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import json
from datetime import datetime
import os
import hashlib
import requests
import base64

MEILI_SERVER_URL = os.environ.get('MEILI_SERVER_URL')
MEILI_AUTH_TOKEN = os.environ.get('MEILI_AUTH_TOKEN')


def generate_hash(data, timestamp):
    m = hashlib.sha256()
    m.update(data.encode('utf-8'))
    m.update(timestamp.encode('utf-8'))
    hash_value = m.digest()
    return base64.b64encode(hash_value).decode('utf-8').replace('+', '-').replace('/', '_').strip('=')[:10]


def send_to_meilisearch_server(json_data, url, auth_token):
    headers = { 'Authorization': f'Bearer {auth_token}', 'Content-Type': 'application/json' }
    try:
        response = requests.post(url, headers=headers, data=json_data, timeout=10)
        if response.status_code == 200:
            print(f"Data sent successfully to {url}")
        else:
            print(f"Failed to send data to {url}. Status code: {response.status_code}")
    except Exception as e:
        print(f"An error occurred while sending data to {url}: {e}")


def parse_and_write_file(json_data):
    try:
        data = json.loads(json_data)
    except:
        print("Failed to parse JSON")
        return {"error": True, "message": "Invalid JSON"}

    try:
        timestamp = datetime.fromisoformat(data['timestamp'])
    except:
        print("Failed to parse timestamp")
        return {"error": True, "message": "Invalid timestamp, must be ISO8601: YYYY-MM-DDTHH:MM:SS.mmmmmm"}

    try:
        site = data['url'].split('/')[2]
        filename_hash = hashlib.md5(data['url'].encode('utf-8')).hexdigest()
        filename = f"{timestamp.hour}_{timestamp.minute}_{timestamp.second}_{site}_{filename_hash}.json"
        path = f"/data/raw_data/{timestamp.year}/{timestamp.month}/{timestamp.day}/"
    except Exception as e:
        print("Internal Server Error")
        return {"error": True, "message": f"Internal Server Error: {e}"}

    if 'id' not in data:
        print(f"Generate id: {data['id']}")
        timestamp_str = data.get('timestamp', '')
        data_str = json.dumps(data, sort_keys=True)
        new_id = generate_hash(data_str, timestamp_str)
        data['id'] = new_id

    send_to_meilisearch_server(json_data, MEILI_SERVER_URL, MEILI_AUTH_TOKEN)

    if not os.path.exists(path):
        try:
            os.makedirs(path)
        except:
            print("Failed to create directory")
            return {"error": True, "message": f"Not create directory: {path}"}

    if not os.path.exists(f"{path}{filename}"):
        try:
            with open(f"{path}{filename}", 'wb') as file:
                data_len = file.write(json_data)
        except Exception as e:
            print(f"Failed to write file: {e}")
            return {"error": True, "message": f"Not write file: {path}{filename}"}
        print(f"Data saved: page name: {data['page_name']}, url: {data['url']}, filename: {filename}, {data_len/1000} kbytes, time: {data['timestamp']}")
        return {"error": False, "message": "Data saved"}
    else:
        print(f"File already exists: {data['page_name']}, url: {data['url']}, filename: {filename}, time: {data['timestamp']}")
        return {"error": True, "message": f"File already exists: {path}{filename}"}


class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps({'error': True, 'message': "Use POST method"}).encode())
        return

    def do_POST(self):
        content_len = int(self.headers.get('content-length'))
        post_body = self.rfile.read(content_len)
        ret = parse_and_write_file(post_body)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps({'error': ret["error"], 'message': ret["message"]}).encode())
        return


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8000), RequestHandler)
    print('Starting server at http://localhost:8000')
    print(f"Meilisearch instance: {MEILI_SERVER_URL}, token: {MEILI_AUTH_TOKEN}")
    server.serve_forever()
