#!/usr/bin/env python3
"""Read-only Linux observations for phase 10; never substitutes for the workload test."""
import argparse
import datetime
import json
import os
import pathlib
import platform
import shutil
import subprocess
import time


def cpu_counters():
    values = [int(x) for x in pathlib.Path('/proc/stat').read_text().splitlines()[0].split()[1:9]]
    return sum(values), values[3] + values[4]


def memory():
    values = {}
    for line in pathlib.Path('/proc/meminfo').read_text().splitlines():
        name, value, *_ = line.split()
        if name in ('MemTotal:', 'MemAvailable:'):
            values[name[:-1]] = int(value) * 1024
    return values


def containers(project):
    if not project:
        return None
    try:
        ids = subprocess.check_output(
            ['docker', 'ps', '--all', '--quiet', '--filter', f'label=com.docker.compose.project={project}'],
            text=True, stderr=subprocess.DEVNULL, timeout=10,
        ).split()
        if not ids:
            return []
        # Select only state fields: never inspect environments, labels or credentials.
        template = '{{json .Name}} {{.RestartCount}} {{.State.OOMKilled}}'
        lines = subprocess.check_output(
            ['docker', 'inspect', '--format', template, *ids], text=True,
            stderr=subprocess.DEVNULL, timeout=10,
        ).splitlines()
        return [dict(zip(('name', 'restarts', 'oomKilled'), json.loads('[' + line.replace(' ', ',', 2) + ']'))) for line in lines]
    except (OSError, subprocess.SubprocessError, ValueError):
        return None


def observe(args):
    if platform.system() != 'Linux' or not pathlib.Path('/proc/meminfo').exists():
        raise SystemExit('Esta medición requiere Linux y debe ejecutarse en el VPS.')
    started = time.monotonic()
    initial_containers = containers(args.project)
    first = previous = cpu_counters()
    samples = []
    while True:
        now = cpu_counters()
        total, idle = now[0] - previous[0], now[1] - previous[1]
        samples.append({
            'at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'elapsedSeconds': round(time.monotonic() - started, 3),
            'cpuPercent': round(100 * (1 - idle / total), 3) if total > 0 else None,
            'availableMemoryBytes': memory()['MemAvailable'],
            'freeDiskBytes': shutil.disk_usage(args.disk).free,
        })
        previous = now
        remaining = args.duration - (time.monotonic() - started)
        if remaining <= 0:
            break
        time.sleep(min(args.interval, remaining))
    total, idle = previous[0] - first[0], previous[1] - first[1]
    mean_cpu = 100 * (1 - idle / total) if total else None
    final_containers = containers(args.project)
    container_checks = None
    if initial_containers and final_containers:
        before = {x['name']: x for x in initial_containers}
        container_checks = len(before) == len(final_containers) and all(
            x['name'] in before and not x['oomKilled']
            and x['restarts'] == before[x['name']]['restarts'] for x in final_containers
        )
    measured = {
        'memoryAtLeast1GiB': min(s['availableMemoryBytes'] for s in samples) >= 1024 ** 3,
        'diskAtLeast15GiB': min(s['freeDiskBytes'] for s in samples) >= 15 * 1024 ** 3,
        'meanCpuBelow80Percent': mean_cpu is not None and mean_cpu < 80,
        'noOomOrRestartsObserved': container_checks,
        'observedAtLeast600Seconds': time.monotonic() - started >= 600,
    }
    return {
        'scope': 'Read-only host observation; does not generate application load.',
        'phase10Passed': None,
        'remainingValidation': 'Two fictitious users, one heavy job, HTTPS journey and comparison with Control-Contracts-ATC baseline.',
        'architecture': platform.machine(), 'logicalCpus': os.cpu_count(),
        'totalMemoryBytes': memory()['MemTotal'], 'diskPath': str(pathlib.Path(args.disk).resolve()),
        'durationSeconds': round(time.monotonic() - started, 3),
        'meanCpuPercent': round(mean_cpu, 3) if mean_cpu is not None else None,
        'checks': measured, 'containersBefore': initial_containers,
        'containersAfter': final_containers, 'samples': samples,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--duration', type=int, default=60)
    parser.add_argument('--interval', type=int, default=5)
    parser.add_argument('--disk', default='/var/lib/docker')
    parser.add_argument('--project', help='Exact Compose project of BoletinExpress; no other project is altered.')
    args = parser.parse_args()
    if not 1 <= args.duration <= 3600 or not 1 <= args.interval <= 60:
        parser.error('Duración 1..3600 e intervalo 1..60 segundos.')
    print(json.dumps(observe(args), indent=2))
