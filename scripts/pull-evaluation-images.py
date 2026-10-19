#!/usr/bin/env python3
"""Download only the BoletinExpress release, using temporary registry credentials."""
import argparse
import getpass
import json
import pathlib
import platform
import re
import subprocess
import tempfile
import urllib.request
import urllib.error


def manifest(path):
    expected = {
        **{name: f'ghcr.io/franmore68/boletinexpress-{name.lower()}'
           for name in ('WEB', 'WORKER', 'POSTGRES', 'AUTH', 'STORAGE', 'GATEWAY', 'TEMPLATES')},
        'REST': 'postgrest/postgrest',
        'MAIL': 'axllent/mailpit',
    }
    images = {}
    for line in pathlib.Path(path).read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        match = re.fullmatch(r'BE_IMAGE_([A-Z]+)=(\S+)', line)
        if not match or match[1] not in expected or match[1] in images:
            raise SystemExit('Manifiesto no válido; no se ha iniciado sesión ni descargado nada.')
        name, image = match.groups()
        if not re.fullmatch(re.escape(expected[name]) + r'@sha256:[0-9a-f]{64}', image):
            raise SystemExit('Imagen fuera de BoletinExpress o sin digest válido; operación detenida.')
        images[name] = image
    if images.keys() != expected.keys():
        raise SystemExit('Faltan imágenes de la entrega; operación detenida.')
    return images


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', help='images.env.example descargado de la entrega verificada')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    images = manifest(args.manifest)
    if args.check_only:
        print(json.dumps({'manifestValid': True, 'images': len(images), 'credentialsUsed': False}))
        return
    if platform.system() != 'Linux' or platform.machine() != 'x86_64':
        raise SystemExit('Ejecutar únicamente en el VPS Linux x86_64 de BoletinExpress.')
    token = getpass.getpass('Token GitHub read:packages (oculto; uso temporal): ')
    if not re.fullmatch(r'ghp_[A-Za-z0-9]+', token):
        raise SystemExit('Se necesita un token clásico; no se ha enviado nada.')
    packages = []
    for image in images.values():
        if not image.startswith('ghcr.io/franmore68/'):
            continue
        name = image.split('/')[2].split('@')[0]
        request = urllib.request.Request(
            'https://api.github.com/users/FranMore68/packages/container/' + name,
            headers={'Authorization': 'Bearer ' + token,
                     'Accept': 'application/vnd.github+json',
                     'User-Agent': 'BoletinExpress-evaluation'})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                package = json.load(response)
        except (urllib.error.URLError, ValueError):
            raise SystemExit('No se pudo verificar la privacidad del paquete; descarga detenida.') from None
        repository = package.get('repository') or {}
        if (package.get('visibility') != 'private'
                or repository.get('full_name') != 'FranMore68/BoletinExpress'
                or repository.get('private') is not True):
            raise SystemExit('Paquete sin privacidad o asociación esperadas; descarga detenida.')
        packages.append({'name': name, 'visibility': 'private',
                         'repository': 'FranMore68/BoletinExpress'})
    print('PRIVATE_PACKAGES ' + json.dumps(packages), flush=True)
    with tempfile.TemporaryDirectory(prefix='boletinexpress-registry-') as config:
        # No lee ni modifica $HOME/.docker/config.json o credenciales de otros proyectos.
        docker = ['docker', '--config', config]
        login = subprocess.run(docker + ['login', 'ghcr.io', '-u', 'FranMore68', '--password-stdin'],
                               input=token, text=True, capture_output=True)
        token = None
        if login.returncode:
            raise SystemExit('GitHub ha rechazado el acceso; no se muestran detalles privados.')
        for name, image in images.items():
            print(f'Descargando imagen de BoletinExpress: {name}', flush=True)
            subprocess.run(docker + ['pull', '--platform', 'linux/amd64', image], check=True)
            arch = subprocess.check_output(docker + ['image', 'inspect', '--format', '{{.Architecture}}', image], text=True).strip()
            if arch != 'amd64':
                raise SystemExit('Arquitectura inesperada; no iniciar el recurso.')
    print('Nueve imágenes preparadas. Credenciales temporales retiradas; configuración Docker global intacta.')


if __name__ == '__main__':
    main()
