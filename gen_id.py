import json
import hashlib
import os
import base64
import sys
from datetime import datetime
import pytz

def convert_to_unix_time(timestamp):
    try:
        dt = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S.%f%z")
        dt = dt.astimezone(pytz.UTC)
        unix_time = int(dt.timestamp())
        return unix_time
    except Exception as e:
        print(f"Could not convert timestamp: {e}")
        return None

def generate_hash(data, timestamp):
    m = hashlib.sha256()
    m.update(data.encode('utf-8'))
    m.update(timestamp.encode('utf-8'))
    hash_value = m.digest()
    return base64.b64encode(hash_value).decode('utf-8').replace('+', '-').replace('/', '_').strip('=')

def process_file(file_path):

    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print(f"Skipping {file_path}. Invalid or empty JSON.")
        return

    if 'id' not in data:
        data['id'] = generate_hash(data['page_text'], data['timestamp'])[:10]

    print(f"Processing {file_path}. Assigned ID: {data['id']}, {data['timestamp']}")

    timestamp = data.get('timestamp', '')
    data['timestamp'] = convert_to_unix_time(timestamp)

    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4, sort_keys=True)

def process_directory(directory):
    total_files = 0
    processed_files = 0

    # Count total JSON files
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.json'):
                total_files += 1

    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.json'):
                process_file(os.path.join(root, file))
                processed_files += 1
                percentage_done = (processed_files / total_files) * 100
                print(f"Processed: {processed_files}/{total_files} ({percentage_done:.2f}%)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <directory_path>")
        sys.exit(1)

    directory_path = sys.argv[1]
    process_directory(directory_path)
