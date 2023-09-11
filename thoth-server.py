#!/usr/bin/env -S python3 -u

#
#############################################################################
# A server saving pages to disk
# /usr/local/opt/python/bin/python3.9 -m pip install --
#############################################################################
#

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import json
from datetime import datetime
import os
import os.path
import hashlib



def parse_and_write_file(json_data):
    try:
      data = json.loads(json_data)
    except:
      print("Failed to parse JSON")
      return {"error":True,"message":"Invalid JSON"}

    try:
      timestamp = datetime.fromisoformat(data['timestamp'])
    except:
      print("Failed to parse timestamp")
      return {"error":True,"message":"Invalid timestamp, must be ISO8601: YYYY-MM-DDTHH:MM:SS.mmmmmm"}

    try:
      site = data['url'].split('/')[2]
      filename_hash = hashlib.md5(data['url'].encode('utf-8')).hexdigest()

      filename = "{hour}_{minute}_{second}_{site}_{filename_hash}.json".format(site=site, timestamp=data['timestamp'], filename_hash=filename_hash, hour=timestamp.hour, minute=timestamp.minute, second=timestamp.second)
      path = "/data/{year}/{month}/{day}/".format(year=timestamp.year, month=timestamp.month, day=timestamp.day)
    except Exception as e:
      print("Internal Server Error")
      return {"error":True,"message":"Internal Server Error: {}".format(e.message)}

    if not os.path.exists(path):
      try:
        os.makedirs(path)
      except :
        print("Failed to create directory")
        return {"error":True,"message":"Not create directory: {path}".format(path=path)}

    if not os.path.exists(path+filename):
      try:
        with open(path+filename, 'wb') as file:
            data_len = file.write(json_data)
            #data_len = file.write(json.dumps(data, indent=4, sort_keys=True).encode('utf-8'))
      except Exception as e:
        print("Failed to write file: {}".format(e))
        return {"error":True,"message":"Not write file: {path}{filename}".format(path=path, filename=filename)}
      print("Data saved: page name: \"{name}\", url: {url}, filename: {filename}, {len} kbytes, time: {timestamp} ".format(len=data_len/1000, url=data['url'], name=data['page_name'], timestamp=data['timestamp'], filename=filename))
      return {"error":False,"message":"Data saved"}
    else:
      print("File already exists: \"{name}\", url: {url}, filename: {filename}, time: {timestamp} ".format(url=data['url'], name=data['page_name'], timestamp=data['timestamp'], filename=filename))
      return {"error":True,"message":"File already exists: {path}{filename}".format(path=path, filename=filename)}




class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps({
            'error': True,
            'message': "Use POST method",
        }).encode())
        return

    def do_POST(self):
        content_len = int(self.headers.get('content-length'))
        post_body = self.rfile.read(content_len)
        ret = parse_and_write_file(post_body)

        parsed_path = urlparse(self.path)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(json.dumps({
            'error': ret["error"],
            'message': ret["message"],
        }).encode())
        return

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8000), RequestHandler)
    print('Starting server at http://localhost:8000')
    server.serve_forever()
