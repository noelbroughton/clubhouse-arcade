#!/bin/bash
# Builds dist-app/Clubhouse-Setup-<version>.exe
#   1. Clubhouse Arcade, the standalone program (../build.sh, ../exe/make.sh)
#   2. Windows app folder (electron-builder --dir)
#   3. installer         (NSIS, run directly so no Wine is needed)
# The arcade keeps its own version and update channel; this only copies ClubhouseArcade.exe in.
set -e; cd "$(dirname "$0")"
VERSION=$(node -p "require('./package.json').version")
mkdir -p ../artifact && ../build.sh && ../exe/make.sh >/dev/null
rm -rf dist-app && npx electron-builder --win --x64 >/dev/null
rm -f dist-app/win-unpacked/resources/app-update.yml
NSIS=$(ls -d ~/.cache/electron-builder/nsis-*/nsis-*/ | head -1)
NSISDIR="$NSIS" "$NSIS/linux/makensis" -V2 -DVERSION="$VERSION" installer.nsi
ls -la dist-app/Clubhouse-Setup-$VERSION.exe
