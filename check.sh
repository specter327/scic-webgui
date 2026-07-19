#!/usr/bin/env bash
set -euo pipefail
python3 -m pip install -e '.[test,build]' --break-system-packages;
pytest
rm -rf build dist src/*.egg-info
python3 -m build
python3 -m twine check dist/*
