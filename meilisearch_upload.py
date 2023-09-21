import os
import requests
import argparse

def send_file_to_meilisearch(file_path, url, auth_token):
    headers = {
        'Authorization': f'Bearer {auth_token}',
        'Content-Type': 'application/json'
    }

    status_messages = {
        200: "✅ Ok: Data sent successfully",
        201: "✅ Created: Resource has been created",
        202: "✅ Accepted: Task added to queue",
        204: "✅ No Content: Resource deleted or no content returned",
        205: "✅ Reset Content: All resources have been deleted",
        400: "❌ Bad Request: The request was unacceptable",
        401: "❌ Unauthorized: No valid API key provided",
        403: "❌ Forbidden: API key lacks permissions",
        404: "❌ Not Found: The requested resource doesn't exist"
    }

    with open(file_path, 'rb') as f:
        data = f.read()

    response = requests.post(url, headers=headers, data=data)
    status_code = response.status_code
    message = status_messages.get(status_code, f"❌ Unknown Status Code: {status_code}")

    print(f"{file_path} - {message}")


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
