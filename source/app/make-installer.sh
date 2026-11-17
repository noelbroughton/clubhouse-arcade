#!/bin/bash
# Builds dist-app/Clubhouse-Setup-<version>.exe
#   1. the arcade page   (../build.sh)
#   2. offline arcade    (prepare-arcade.py)
#   3. Windows app folder (electron-builder --dir)
#   4. installer         (NSIS, run directly so no Wine is needed)
set -e; cd "$(dirname "$0")"
VERSION=$(node -p "require('./package.json').version")
mkdir -p ../artifact && ../build.sh
python3 prepare-arcade.py
rm -rf dist-app && npx electron-builder --win --x64 >/dev/null
rm -f dist-app/win-unpacked/resources/app-update.yml
NSIS=$(ls -d ~/.cache/electron-builder/nsis-*/nsis-*/ | head -1)
NSISDIR="$NSIS" "$NSIS/linux/makensis" -V2 -DVERSION="$VERSION" installer.nsi
ls -la dist-app/Clubhouse-Setup-$VERSION.exe
