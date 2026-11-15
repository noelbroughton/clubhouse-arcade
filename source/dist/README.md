# Clubhouse Arcade

Eleven 3D golf-simulator games in one page, with a small relay that feeds it shots from your launch monitor.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole arcade: menus, all eleven games, leaderboards |
| `arcade-relay.js` | Serves the arcade and passes launch-monitor shots to it. Needs Node.js, nothing else to install |

Keep both files in the same folder, for example `C:\ClubhouseArcade`.

## Start it

1. Open a Command Prompt in that folder and run `node arcade-relay.js`.
2. Open `http://localhost:8080` in Chrome or Edge on the simulator PC.
3. Click **Full screen**, pick a game, add your players and click **Tee off**.

The pill in the bottom-right corner of a game shows the connection: red is demo mode, yellow means the relay is running, green means the launch monitor is connected.

## Connect the launch monitor

The relay speaks GSPro Open Connect, so anything that can send shots to GSPro can send them here. It listens on two ports.

- **Through Rela:** set Rela's simulator to GSPro, then in Settings change the GSPro address to `127.0.0.1` and the port to `9210`.
- **NeoTrack directly:** set NeoTrack's IPC mode to TCP CLIENT pointing at `127.0.0.1` port `921`. GSPro uses the same port, so close GSPro first.

To check the wiring without swinging, open `http://localhost:8080/test?speed=95&vla=22&hla=-2&spin=7000` in another tab while a game is waiting for a shot.

## The games

Every game shows yardages: range lines across the ground and a distance tag on each target.

**Carnival**
- **Barrel Blast**: hit TNT barrels for chain reactions; crates you send flying add points.
- **Mole Patrol**: land on a mole. 100, 200 or 300 by row; golden moles count double.
- **Ferris Frenzy**: hit gondolas on the turning wheel, pop balloons, find the hub.
- **Dunk Derby**: splash a pool to drive your cart down the track. First through the arch wins.

**Mini Golf** (three courses, six holes each)
- **Pirate Cove**, **Windmill Meadows** and **Neon Nights**.
- Putt or chip: only ball speed and direction count. Use the Aim arrows on screen, or the left and right keys, to line up bank shots.
- The Aim bar shows the distance to the hole and a ball speed to try.
- If your launch monitor misses soft putts, raise **Mini golf power** in Settings.

**Clubhouse**
- **Bullseye**: floating target that moves each round. 10 to 100 by ring.
- **Closest to the Pin**: island greens, lowest total distance wins. Water costs 100 ft.
- **Capture the Flag**: night rooftops. Stop on a roof to take its flag; land closer to steal it. Each flag keeps its yardage, and a captured flag also shows the owner's distance from the flag.
- **Skyline Drive**: long drive down a city avenue, with neon hoops worth 25 yd.

## Good to know

- Up to six players. **Junior** adds ball speed for that player; the slider on the player screen sets how much.
- Leaderboards show **This session** and **All time**. All-time scores are stored in the browser on that PC.
- **What's new** on the menu lists the changes in each version. **Suggestions** shows a QR code and a button for the online suggestion form.
- Keys: `Esc` pause, `F` full screen, `T` show or hide the mouse test pad, `Space` random test shot, left and right arrows aim in mini golf.
- **Graphics** in Settings: High adds glow, reflections and smoother edges; choose Low if the picture stutters.
- Run with plain Node.js, the page loads its 3D engine from the internet. `ClubhouseArcade.exe` has it built in and works offline.
- Options: `--http 8090 --ports 921,9210 --quiet --update <url>`. The .exe also takes `--window` to keep a window open.

## Automatic updates (optional)

Host two files in one public folder: `index.html` (the .exe flavour, from `exe/update/`) and `version.json`. Put that folder's address in the program (built in, or in a file named `update-url.txt` beside the .exe). On start the program downloads a newer `index.html`, checks its SHA-256 against `version.json`, and offers a restart button on the menu.
