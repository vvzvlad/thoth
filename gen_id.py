import json
import hashlib
import os
import base64
import sys

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

    if 'id' in data:
        return

    timestamp = data.get('timestamp', '')
    data_str = json.dumps(data, sort_keys=True)

    new_id = generate_hash(data_str, timestamp)[:10]
    data['id'] = new_id

    print(f"Processing {file_path}. Assigned ID: {new_id}")

    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

def process_directory(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.json'):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <directory_path>")
        sys.exit(1)

    directory_path = sys.argv[1]
    process_directory(directory_path)
