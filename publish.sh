#!/usr/bin/env bash
set -euo pipefail

git add .;
git commit -m "New update";
git push origin main;

TARGET="pypi"
[[ "${1:-}" == "--test" ]] && TARGET="testpypi"
./check.sh
python3 -m twine upload --repository "$TARGET" dist/*
