#!/usr/bin/env python3
"""Update cache-busting query versions for local assets in index.html."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

ASSET_RE = re.compile(r'((?:href|src)="assets/[^"]+?)(?:\?v=[^"]+)?(")')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('version', help='Version string, for example 20260518-maint2')
    parser.add_argument('--index', default='index.html', help='Path to index.html')
    args = parser.parse_args()

    index_path = Path(args.index)
    text = index_path.read_text()
    updated = ASSET_RE.sub(lambda match: f'{match.group(1)}?v={args.version}{match.group(2)}', text)
    if updated == text:
      print('No local asset references found.')
      return 1
    index_path.write_text(updated)
    print(f'Updated local asset versions in {index_path} to {args.version}.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
