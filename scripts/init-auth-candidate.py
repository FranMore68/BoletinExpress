"""Prepare an isolated local pgx/v5 trial; never read or overwrite primary secrets."""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

workspace = Path(__file__).resolve().parents[1]
target = workspace / '.secrets' / 'auth-candidate'
if target.exists():
    raise SystemExit('La configuración candidata ya existe; se conserva.')
target.mkdir(mode=0o700, parents=True)
secret = secrets.token_urlsafe(48)

def encoded(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).decode().rstrip('=')

def jwt(role):
    now = int(time.time())
    message = encoded({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encoded({
        'iss': 'supabase', 'ref': 'boletinexpress-candidate', 'role': role,
        'iat': now, 'exp': now + 86400 * 30,
    })
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), message.encode(), hashlib.sha256).digest()).decode().rstrip('=')
    return message + '.' + signature

def private_file(name, content):
    path = target / name
    with open(path, 'x', opener=lambda p, flags: os.open(p, flags, 0o600)) as output:
        output.write(content)
    return path

anon = jwt('anon')
proof_secret = secrets.token_hex(32)
env_path = private_file('supabase.env',
    f'APP_URL=http://127.0.0.1:3010\nPOSTGRES_PASSWORD={secrets.token_hex(24)}\n'
    f'JWT_SECRET={secret}\nANON_KEY={anon}\nSERVICE_ROLE_KEY={jwt("service_role")}\n')
private_file('app.env',
    f'APP_URL=http://127.0.0.1:3010\nSUPABASE_URL=http://127.0.0.1:54331\n'
    f'SUPABASE_ANON_KEY={anon}\nAUTH_PROOF_SECRET={proof_secret}\n')
# Resolve the existing recipe with candidate-only credentials; no original secrets.
resolved = subprocess.run(['docker', 'compose', '--env-file', str(env_path), '-f',
    str(workspace / 'infra/supabase/compose.yaml'), 'config', '--format', 'json'],
    capture_output=True, text=True, check=True)
config = json.loads(resolved.stdout)
config['name'] = 'boletinexpress-auth-candidate'
config['networks']['default']['name'] = 'boletinexpress-auth-candidate'
for key, volume in config['volumes'].items():
    volume['name'] = 'boletinexpress-auth-candidate-' + key
config['services']['auth']['image'] = 'boletinexpress-auth:pgx5-candidate'
config['services']['gateway']['ports'][0]['published'] = '54331'
config['services']['mail']['ports'][0]['published'] = '54334'
web = json.loads(subprocess.run(['docker', 'compose', '-f', str(workspace / 'compose.yaml'),
    'config', '--format', 'json'], capture_output=True, text=True, check=True).stdout)['services']['web']
web['ports'][0]['published'] = '3010'
web['environment'] = {
    'APP_URL': 'http://127.0.0.1:3010', 'SUPABASE_URL': 'http://gateway:8000',
    'SUPABASE_ANON_KEY': anon, 'AUTH_PROOF_SECRET': proof_secret,
    'LOCAL_MAILBOX_URL': 'http://127.0.0.1:54334',
}
# Share no volumes, network, signing keys or database with the primary stack.
web['networks'] = {'default': None}
config['services']['web'] = web
private_file('compose.json', json.dumps(config, indent=2))
print('Candidato preparado: proyecto, claves, red y volúmenes exclusivos; puertos 3010/54331/54334.')
