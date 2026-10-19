#!/usr/bin/env python3
"""Reproduce Coolify's .env order with fictitious values; never start containers."""
import json
import pathlib
import subprocess
import tempfile

with tempfile.TemporaryDirectory(prefix='boletinexpress-env-order-') as directory:
    path = pathlib.Path(directory)
    env_file = path / '.env'
    compose_file = path / 'compose.yaml'
    compose_file.write_text('''services:
  storage:
    image: example.invalid/not-run
    env_file: [.env]
    environment:
      SERVICE_KEY: "${SERVICE_ROLE_KEY}"
  gateway:
    image: example.invalid/not-run
    env_file: [.env]
    environment:
      SERVICE_KEY: disabled
      SERVICE_ROLE_KEY: "${SERVICE_ROLE_KEY:?}"
  web:
    image: example.invalid/not-run
    env_file: [.env]
    environment:
      SERVICE_KEY: disabled
      SERVICE_ROLE_KEY: disabled
''')
    command = ['docker', 'compose', '-p', 'boletinexpress-alias-check',
               '--env-file', str(env_file), '-f', str(compose_file),
               'config', '--format', 'json']
    env_file.write_text('SERVICE_KEY=${SERVICE_ROLE_KEY}\nSERVICE_ROLE_KEY=fictitious-role-only\n')
    result = subprocess.run(command, text=True, capture_output=True)
    assert result.returncode == 0, result.stderr
    services = json.loads(result.stdout)['services']
    assert services['storage']['environment']['SERVICE_KEY'] == 'fictitious-role-only'
    assert services['gateway']['environment']['SERVICE_ROLE_KEY'] == 'fictitious-role-only'
    assert services['web']['environment']['SERVICE_KEY'] == 'disabled'
    assert services['web']['environment']['SERVICE_ROLE_KEY'] == 'disabled'
    env_file.write_text('SERVICE_KEY=${SERVICE_ROLE_KEY}\nSERVICE_ROLE_KEY=\n')
    result = subprocess.run(command, text=True, capture_output=True)
    assert result.returncode != 0 and 'SERVICE_ROLE_KEY' in result.stderr
    print(json.dumps({'passed': True, 'fictitiousDataOnly': True,
                      'sameEnvOrderAsCoolify': True,
                      'storageExplicitAssignmentCorrect': True,
                      'otherServiceAliasDisabled': True,
                      'missingRoleKeyRejectedBeforeStartup': True,
                      'containersStarted': 0}))
