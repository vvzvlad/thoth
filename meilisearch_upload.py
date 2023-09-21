import os
import requests
import argparse

def send_file_to_meilisearch(file_path, url, auth_token):
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }

    with open(file_path, 'rb') as f:
        data = f.read()

    response = requests.post(url, headers=headers, data=data)
    if response.status_code == 200:
        print(f"Successfully sent {file_path} to Meilisearch")
    else:
        print(f"Failed to send {file_path} to Meilisearch. Status code: {response.status_code}")

def main(args):
    for root, _, files in os.walk(args.directory):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                send_file_to_meilisearch(file_path, args.url, args.token)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Send JSON files to Meilisearch')
    parser.add_argument('--directory', required=True, help='Directory to search for JSON files')
    parser.add_argument('--url', required=True, help='Meilisearch server URL')
    parser.add_argument('--token', required=True, help='Meilisearch Authorization Token')

    args = parser.parse_args()
    main(args)
