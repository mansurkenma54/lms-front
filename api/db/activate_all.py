import urllib.request
import json

db_url = 'postgresql://neondb_owner:npg_Qo6AdzOxh7kq@ep-mute-scene-a4am8pn0-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
api_url = 'https://ep-mute-scene-a4am8pn0-pooler.us-east-1.aws.neon.tech/sql'

stmt = "UPDATE users SET status = 'active';"

print(f"Executing statement...")
req = urllib.request.Request(api_url, method='POST')
req.add_header('Neon-Connection-String', db_url)
req.add_header('Content-Type', 'application/json')
data = json.dumps({'query': stmt}).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=data) as response:
        print(response.read().decode('utf-8'))
except Exception as e:
    pass
