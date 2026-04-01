import urllib.request
import json

db_url = 'postgresql://neondb_owner:npg_Qo6AdzOxh7kq@ep-mute-scene-a4am8pn0-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
api_url = 'https://ep-mute-scene-a4am8pn0-pooler.us-east-1.aws.neon.tech/sql'

# Read seed.sql
with open('seed.sql', 'r', encoding='utf-8') as f:
    schema = f.read()

statements = [s.strip() for s in schema.split(';') if s.strip()]

for i, stmt in enumerate(statements):
    print(f"Executing statement {i+1}/{len(statements)}...")
    req = urllib.request.Request(api_url, method='POST')
    req.add_header('Neon-Connection-String', db_url)
    req.add_header('Content-Type', 'application/json')
    data = json.dumps({'query': stmt}).encode('utf-8')
    try:
        with urllib.request.urlopen(req, data=data) as response:
            pass # ignore output to keep console clean
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error:", str(e))
print("Done seeding!")
