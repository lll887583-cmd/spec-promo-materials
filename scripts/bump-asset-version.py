#!/usr/bin/env python3
"""Update cache-busting query versions for local assets and the boot loader."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ASSET_RE = re.compile(r'((?:href|src)="assets/[^"]+?)(?:\?v=[^"]+)?(")')
BOOT_VERSION_RE = re.compile(r"(const ASSET_VERSION = ')[^']+(';)")


def update_index(index_path: Path, version: str) -> bool:
    text = index_path.read_text()
    updated = ASSET_RE.sub(lambda match: f'{match.group(1)}?v={version}{match.group(2)}', text)
    if updated != text:
        index_path.write_text(updated)
        return True
    return False


def update_boot(boot_path: Path, version: str) -> bool:
    if not boot_path.exists():
        return False
    text = boot_path.read_text()
    updated = BOOT_VERSION_RE.sub(lambda match: f'{match.group(1)}{version}{match.group(2)}', text, count=1)
    if updated != text:
        boot_path.write_text(updated)
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version', help='Version string, for example 20260518-maint2')
    parser.add_argument('--index', default='index.html', help='Path to index.html')
    parser.add_argument('--boot', default='assets/boot.js', help='Path to assets/boot.js')
    args = parser.parse_args()

    index_changed = update_index(Path(args.index), args.version)
    boot_changed = update_boot(Path(args.boot), args.version)
    if not index_changed and not boot_changed:
        print('No local asset references or boot version found.')
        return 1
    print(f'Updated asset versions to {args.version}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
