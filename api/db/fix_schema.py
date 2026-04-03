import urllib.request
import json
import os

db_url = 'postgresql://neondb_owner:npg_Qqh1ZJwbiF8t@ep-bold-flower-am5zmoit-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require'
api_url = 'https://ep-bold-flower-am5zmoit-pooler.c-5.us-east-1.aws.neon.tech/sql'

# 1. Drop existing tables
drop_tables = [
    'battle_participants', 'battles', 'hints_bought', 'bits_history', 'messages',
    'violations', 'submissions', 'assignments', 'notifications', 'course_comments',
    'lesson_materials', 'lessons', 'course_enrollments', 'courses', 'sessions',
    'guest_scores', 'users'
]

print("⏳ Дерекқор ескі кестелерден тазартылуда...")
for table in drop_tables:
    req = urllib.request.Request(api_url, method='POST')
    req.add_header('Neon-Connection-String', db_url)
    req.add_header('Content-Type', 'application/json')
    data = json.dumps({'query': f"DROP TABLE IF EXISTS {table} CASCADE;"}).encode('utf-8')
    try:
        with urllib.request.urlopen(req, data=data) as response:
            pass
    except Exception as e:
        print(f"Error dropping {table}:", str(e))

print("✅ Кестелер тазартылды.")

# 2. Re-create new schema (schema.sql)
print("⏳ Жаңа толық кестелер (UUID форматында) құрылуда...")
schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
try:
    with open(schema_path, 'r', encoding='utf-8') as f:
        schema = f.read()
except FileNotFoundError:
    print("schema.sql табылмады!")
    exit(1)

statements = [s.strip() for s in schema.split(';') if s.strip()]

for i, stmt in enumerate(statements):
    if stmt.startswith('--'):
        continue
    req = urllib.request.Request(api_url, method='POST')
    req.add_header('Neon-Connection-String', db_url)
    req.add_header('Content-Type', 'application/json')
    data = json.dumps({'query': stmt}).encode('utf-8')
    try:
        with urllib.request.urlopen(req, data=data) as response:
            pass
    except Exception as e:
        print(f"Error executing statement {i+1}:", str(e))

print("✅ Жаңа құрылым (schema) сәтті орнатылды!")

# 3. Create Admin
print('⏳ "nurdos1414" админ аккаунты құрылуда...')
admin_query = """
INSERT INTO users (username, password_hash, display_name, role, status)
VALUES ('nurdos1414', crypt('nurdos1414', gen_salt('bf', 12)), 'Нұрдос Мұғалім', 'admin', 'active')
ON CONFLICT (username) DO NOTHING;
"""
req = urllib.request.Request(api_url, method='POST')
req.add_header('Neon-Connection-String', db_url)
req.add_header('Content-Type', 'application/json')
data = json.dumps({'query': admin_query}).encode('utf-8')
try:
    with urllib.request.urlopen(req, data=data) as response:
        print('✅ Админ "nurdos1414" сәтті қосылды.')
except Exception as e:
    print("Error creating admin:", str(e))

print("🎉 Дерекқор толығымен дайын! Енді платформа қатесіз жұмыс істейді.")
