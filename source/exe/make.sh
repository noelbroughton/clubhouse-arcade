#!/bin/bash
# builds ClubhouseArcade.exe (+ a Linux twin for testing) and the zip
set -e; cd "$(dirname "$0")"; NODE=/opt/node22/bin/node; F=NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
python3 build.py; $NODE --check app.js; $NODE --experimental-sea-config sea-config.json | tail -1
for T in "node_modules/node-win-x64/bin/node.exe ClubhouseArcade.exe" "$NODE arcade-linux"; do set -- $T; cp $1 $2; chmod u+w $2; $NODE node_modules/postject/dist/cli.js $2 NODE_SEA_BLOB sea.blob --sentinel-fuse $F | tail -1; done
mkdir -p pkg; cp ClubhouseArcade.exe pkg/
python3 -c "
import zipfile;z=zipfile.ZipFile('ClubhouseArcade.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6)
z.write('pkg/ClubhouseArcade.exe','ClubhouseArcade/ClubhouseArcade.exe');z.write('pkg/READ-ME.txt','ClubhouseArcade/READ-ME.txt');z.close()"
ls -la ClubhouseArcade.zip
