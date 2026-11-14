# Clubhouse Arcade updates

This repository holds the update files for Clubhouse Arcade, a set of 3D golf-simulator games.

- `index.html` — the current games
- `version.json` — the version number and checksum the program checks

The Clubhouse Arcade program looks here when it starts. If `version.json` shows a newer version than the one installed, it downloads `index.html`, checks it against the checksum and offers a restart.
