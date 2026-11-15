/* ============ Clubhouse games ============ */
const ftin = ft => { const i = Math.round(ft * 12); return Math.floor(i / 12) + "' " + (i % 12) + '"'; };
function marker(ctx, x, z, col, grp) { const g = new T.Group(); g.position.set(x, 0, z); (grp || ctx.root).add(g); M(gCone(10), mat(0xfff6e4), 0, .9, 0, .16, 1.8, .16, g).rotation.x = PI; M(gSph(), new T.MeshStandardMaterial({ color: C(col), roughness: .3, emissive: C(col), emissiveIntensity: .4 }), 0, 2.1, 0, .5, .5, .5, g); return g; }

/* ---- Bullseye ---- */
GAMES.push({
  id: 'bullseye', group: 'clubhouse', name: 'Bullseye', tag: 'Darts with a golf ball, on a floating target', unit: 'pts', spt: 2, rounds: [3, 5, 7],
  how: ['Land your ball on the floating target. It scores where it lands.', 'Rings score 10, 25, 50, 75 and 100 for the bull.', 'The target moves to a new distance every round.'],
  cam: { p: [0, 8.5, 13], l: [0, 0, -80] }, thumb: { p: [10, 16, -26], l: [0, 0, -80] },
  create(ctx) {
    envLake(ctx);
    const D = [55, 80, 105, 130, 155, 70, 120], R = [2.4, 6, 10.5, 16, 22], PT = [100, 75, 50, 25, 10], COL = ['#ffc93c', '#e8344e', '#2f7fe8', '#23283a', '#f4f0e0'];
    rangeArcs(ctx, [50, 75, 100, 125, 150, 175], { y: -.32, half: .5, maxW: 46 }); const tg = new T.Group(); ctx.root.add(tg);
    const face = ctex(1024, 1024, (g, w) => { const c = w / 2, k = c / 23.5; g.fillStyle = '#8a5a33'; g.fillRect(0, 0, w, w); for (let i = 4; i >= 0; i--) { g.fillStyle = COL[i]; g.beginPath(); g.arc(c, c, R[i] * k, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 5; g.stroke(); } g.font = '56px "Outfit",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 1; i < 5; i++) { g.fillStyle = i === 4 ? '#23283a' : '#fff'; const r = (R[i] + R[i - 1]) / 2 * k; g.fillText(PT[i], c, c + r); g.fillText(PT[i], c, c - r); } });
    const top = M(gDisc(), new T.MeshStandardMaterial({ map: face, roughness: .7 }), 0, .02, 0, 23.5, 1, 23.5, tg); top.castShadow = false; M(gCyl(48), mat(0x6b4526), 0, -.55, 0, 23.6, 1.1, 23.6, tg);
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; M(gCyl(10), mat(0xffc93c), Math.sin(a) * 23.6, .5, Math.cos(a) * 23.6, .28, 1.8, .28, tg); const b = M(gIco(1), glowMat(i % 2 ? 0xffe27a : 0xff8fa0), Math.sin(a) * 23.6, 1.6, Math.cos(a) * 23.6, .34, .34, .34, tg); b.castShadow = false; }
    const pins = new T.Group(); ctx.root.add(pins); let d = 55, k = 1, dl = null, pts = 0, msg = '', sub = '', curCol = '#fff';
    const setT = round => { d = D[round % D.length]; k = lerp(.8, 1.3, (d - 55) / 100); tg.position.set(0, 0, -d); tg.scale.set(k, 1, k); while (pins.children.length) pins.remove(pins.children[0]); if (dl) ctx.root.remove(dl); dl = tagLabel(Math.round(d * YD) + ' yd to the bull', 0, 9 * k + 4, -d - 22 * k, 2.2 + d * .045, { w: 760 }); ctx.root.add(dl); Cam.hl.set(0, 0, -d); Cam.max = Math.max(0, d - 70); };
    let lastRound = -1;
    return {
      beginTurn(pl, round) { curCol = PCOL[pl.c]; if (round !== lastRound) { lastRound = round; setT(round); } },
      beginShot() { pts = 0; msg = ''; sub = ''; },
      surface(x, z) { return hd(x, z, 0, 5) < 15 ? 'wood' : hd(x, z, 0, -d) < R[4] * k ? 'wood' : 'water'; },
      onLand(B) { const r = hd(B.p.x, B.p.z, 0, -d) / k; if (r > R[4]) return; const i = R.findIndex(v => r <= v); pts = PT[i]; msg = i === 0 ? 'BULLSEYE!' : i === 1 ? 'Great shot!' : i === 2 ? 'Nice!' : 'On target'; sub = '+' + pts + ' · ' + ftin(r * k * 3.28084) + ' from centre'; marker(ctx, B.p.x, B.p.z, curCol, pins); B.m.visible = false; const p = B.p.clone(); FX.ring(p, R[i] * k, i === 0 ? 0xffe27a : 0xffffff, .8, .25); FX.stars(p.setY(1), i < 2 ? 50 : 18); if (i === 0) { FX.confetti(p, 160, 1.2); Snd.cheer(); } else Snd.ding(4 - i); FX.text(p.setY(4), '+' + pts, i < 2 ? 'big' : ''); Cam.cutTo([B.p.x * .4, 30 * k, -d + 34 * k], [0, 0, -d - 2], 2.6); return 'stop'; },
      result() { return pts ? { pts, text: msg, sub, tone: pts >= 75 ? 'great' : 'good' } : { pts: 0, text: 'SPLASH', sub: 'In the lake', tone: 'miss' }; }
    };
  }
});

/* ---- Closest to the Pin ---- */
GAMES.push({
  id: 'ctp', group: 'clubhouse', name: 'Closest to the Pin', tag: 'Island greens. Lowest total distance wins', unit: 'ft', lower: true, spt: 1, rounds: [3, 6, 9], fmt: ftin,
  how: ['One shot each at every island green.', 'Your score is the distance from your ball to the pin.', 'Miss the green into the water and it costs you 100 feet. Lowest total wins.'],
  cam: { p: [0, 3.4, 9], l: [0, 2, -110] }, thumb: { p: [14, 12, -80], l: [-2, 0, -122] },
  create(ctx) {
    envLake(ctx);
    const H = [{ d: 95, r: 14, px: 3, pz: 2, ba: 2.4 }, { d: 128, r: 15, px: -5, pz: -3, ba: .6 }, { d: 150, r: 17, px: 4, pz: 5, ba: 3.6 }, { d: 110, r: 13, px: -2, pz: 4, ba: 1.5 }, { d: 165, r: 18, px: 6, pz: -4, ba: 5 }, { d: 80, r: 12, px: 0, pz: -4, ba: 2.2 }, { d: 140, r: 16, px: -6, pz: 1, ba: 4.2 }, { d: 120, r: 14, px: 4, pz: -5, ba: 1 }, { d: 175, r: 19, px: -3, pz: 6, ba: 5.6 }];
    rangeArcs(ctx, [50, 75, 100, 125, 150, 175, 200], { y: -.32, half: .5, maxW: 46 }); const g = new T.Group(); ctx.root.add(g); const gt = groundTex(0x5fd06a, 0x54c45e, 5), ft = groundTex(0x3f9f4a, 0x3a9645, 6, 1);
    const isl = M(gCyl(56), mat(0xcdb98a), 0, -.62, 0, 1, 1.2, 1, g), fr = M(gDisc(), new T.MeshStandardMaterial({ map: ft, roughness: 1 }), 0, .015, 0, 1, 1, 1, g), gr = M(gDisc(), new T.MeshStandardMaterial({ map: gt, roughness: .9 }), 0, .03, 0, 1, 1, 1, g), bk = M(gDisc(), mat(0xf2e3b4), 0, .045, 0, 1, 1, 1, g); fr.castShadow = gr.castShadow = bk.castShadow = false;
    const pin = flagPin(ctx, 0, 0, 0xe8344e, 4.2); const marks = new T.Group(); ctx.root.add(marks);
    let h = H[0], cx = 0, cz = 0, px = 0, pz = 0, bx = 0, bz = 0, br = 0, last = -1, dl = null, ace = false, curCol = '#fff', curName = '';
    const setH = round => { h = H[round % H.length]; cx = 0; cz = -h.d; px = cx + h.px; pz = cz + h.pz; br = h.r * .34; bx = cx + Math.cos(h.ba) * (h.r + 1); bz = cz + Math.sin(h.ba) * (h.r + 1); g.position.set(cx, 0, cz); isl.scale.set(h.r + 6.5, 1.2, h.r + 6.5); fr.scale.set(h.r + 4, 1, h.r + 4); gr.scale.set(h.r, 1, h.r); bk.position.set(bx - cx, .045, bz - cz); bk.scale.set(br, 1, br * .8); pin.g.position.set(px, 0, pz); while (marks.children.length) marks.remove(marks.children[0]); if (dl) ctx.root.remove(dl); dl = tagLabel('Hole ' + (round + 1) + ' · ' + Math.round(Math.hypot(px, pz) * YD) + ' yd to the pin', 0, 15 + h.d * .04, cz - h.r - 16, 2 + h.d * .05, { w: 900 }); ctx.root.add(dl); Cam.hl.set(0, 2, cz); Cam.max = Math.max(0, h.d - 70); };
    return {
      beginTurn(pl, round) { curCol = PCOL[pl.c]; curName = pl.name; if (round !== last) { last = round; setH(round); } },
      beginShot() { ace = false; },
      surface(x, z) { if (hd(x, z, 0, 5) < 15) return 'wood'; if (hd(x, z, bx, bz) < br * .92) return 'sand'; const d = hd(x, z, cx, cz); return d < h.r ? 'green' : d < h.r + 4 ? 'grass' : 'water'; },
      step(B) { if (!ace && B.p.y < .3 && hd(B.p.x, B.p.z, px, pz) < .42 && B.v.length() < 7) { ace = true; B.p.set(px, 0, pz); B.state = 'done'; B.m.visible = false; } },
      onLand() { Cam.cutTo([px + 8, 6, pz + 20], [px, .6, pz], 3.6); },
      result(B) {
        const p = new V3(px, 3, pz);
        if (ace) { FX.confetti(p, 260, 1.4); FX.stars(p, 80); Snd.cheer(); setTimeout(() => Snd.cheer(), 500); return { pts: 0, text: 'HOLE IN ONE!', sub: curName + ' holes it', tone: 'great', hold: 4 }; }
        if (B.wet) return { pts: 100, text: 'SPLASH', sub: '100 ft penalty', tone: 'miss' };
        const ft = hd(B.p.x, B.p.z, px, pz) * 3.28084; marker(ctx, B.p.x, B.p.z, curCol, marks); const tl = label(ftin(ft), { size: 1.5, color: '#fff', font: 'Outfit', weight: '800' }); tl.position.set(B.p.x, 3.6, B.p.z); marks.add(tl); tl.onBeforeRender = () => tl.quaternion.copy(E.cam.quaternion);
        if (ft < 12) { FX.stars(p, 40); Snd.ding(3); } else Snd.ding(0);
        return { pts: ft, text: ft < 3 ? 'KICK-IN!' : ft < 10 ? 'DARTS!' : ft < 25 ? 'Great shot' : B.sand ? 'In the bunker' : 'On the island', sub: ftin(ft) + ' from the pin', tone: ft < 10 ? 'great' : 'good', hold: 2.6 };
      }
    };
  }
});

/* ---- Capture the Flag ---- */
GAMES.push({
  id: 'flags', group: 'clubhouse', name: 'Capture the Flag', tag: 'Rooftop to rooftop across the city at night', unit: 'flags', spt: 2, rounds: [3, 5, 7],
  how: ['You tee off from a rooftop. Nine other rooftops each hold a flag, and each flag shows its yardage.', 'Stop your ball on a rooftop to capture its flag. Land closer to the flag than the owner to steal it.', 'Miss a roof and the ball drops to the street. Most flags at the end wins.'],
  cam: { p: [0, 5.2, 12], l: [0, -6, -95] }, camMax: 46, thumb: { p: [-22, 14, 6], l: [8, -8, -90] },
  create(ctx, match) {
    const R = [[-16, -40, -7, 24, 22], [17, -47, -11, 24, 22], [-35, -77, -3, 26, 24], [0, -85, -15, 28, 26], [35, -79, 4, 26, 24], [-20, -119, -8, 28, 26], [21, -123, 2, 28, 26], [-41, -153, 6, 30, 28], [6, -159, -4, 32, 30]].map(([x, z, y, w, d]) => ({ x, z, y, w, d, own: -1, dist: 99 }));
    envRoofs(ctx, R);
    for (const f of R) { f.f = flagPin(ctx, f.x, f.z, 0xf4f0e0, 8); f.f.g.position.y = f.y; f.f.fm.emissive = C(0xf4f0e0); f.f.fm.emissiveIntensity = .7; f.yd = Math.round(Math.hypot(f.x, f.z) * YD); ctx.root.add(tagLabel(f.yd + ' yd', f.x, f.y + 10.6, f.z, 2.3 + f.yd * .012)); f.tag = null; }
    const roofAt = (x, z) => R.find(f => Math.abs(x - f.x) < f.w / 2 && Math.abs(z - f.z) < f.d / 2);
    const own = (f, text, col) => { if (f.tag) ctx.root.remove(f.tag); f.tag = tagLabel(text, f.x, f.y + 10.6 + (2.3 + f.yd * .012) * 1.15, f.z, 2 + f.yd * .01, { bg: col, w: 640 }); ctx.root.add(f.tag); };
    let cur = 0;
    return {
      ground(x, z) { const f = roofAt(x, z); return f ? f.y : Math.abs(x) < 15 && z > -10 && z < 16 ? 0 : -90; },
      surface(x, z) { return roofAt(x, z) || (Math.abs(x) < 15 && z > -10 && z < 16) ? 'turf' : 'void'; },
      beginTurn(pl, round, pi) { cur = pi; },
      step(B) { if (B.p.y < -27) { B.lost = true; B.state = 'done'; B.m.visible = false; } },
      result(B) {
        const f = !B.lost && roofAt(B.p.x, B.p.z), pl = match.players[cur];
        if (!f) return { pts: 0, text: B.lost ? 'Off the roof' : 'No flag', sub: B.lost ? 'Down to the street' : 'Still on the tee deck', tone: 'miss' };
        const d = hd(B.p.x, B.p.z, f.x, f.z), ft = d * 3.28084;
        if (f.own >= 0 && d >= f.dist) return { pts: 0, text: f.own === cur ? 'Already yours' : 'Defended!', sub: match.players[f.own].name + ' holds it at ' + ftin(f.dist * 3.28084), tone: 'miss' };
        const stolen = f.own >= 0 && f.own !== cur, col = PCOL[pl.c]; f.own = cur; f.dist = d; f.f.fm.color.copy(C(col)); f.f.fm.emissive.copy(C(col)); f.edge.color.copy(C(col).multiplyScalar(E.hdr ? 3.4 : 1)); own(f, pl.name + ' · ' + ftin(ft), col);
        const p = new V3(f.x, f.y + 6, f.z); FX.confetti(p, stolen ? 150 : 90); FX.stars(p, 40); FX.ring(new V3(f.x, f.y, f.z), 16, col, .9, f.y + .3); stolen ? Snd.cheer() : Snd.coin(); Cam.cutTo([f.x * .7, f.y + 16, f.z + 34], [f.x, f.y + 3, f.z], 2.2);
        return { pts: 0, text: stolen ? 'STOLEN!' : 'CAPTURED!', sub: ftin(ft) + ' from the flag', tone: 'great', hold: 2.6 };
      },
      scores() { return match.players.map((p, i) => R.filter(f => f.own === i).length); }
    };
  }
});

/* ---- Skyline Drive ---- */
GAMES.push({
  id: 'skyline', group: 'clubhouse', name: 'Skyline Drive', tag: 'Long drive down a downtown avenue at dusk', unit: 'yd', spt: 3, rounds: [1, 2, 3],
  how: ['Hit it as far as you can down the avenue. Roll counts.', 'Clip a building and the ball drops back into the street, short.', 'Fly through a neon hoop for a 25 yard bonus.'],
  cam: { p: [0, 3.2, 9], l: [0, 14, -150] }, camMax: 330, thumb: { p: [-9, 5, 2], l: [6, 22, -160] },
  create(ctx) {
    envCity(ctx);
    for (let yd = 100; yd <= 350; yd += 50) { const z = -yd / YD, col = yd >= 300 ? 0xffc93c : yd >= 250 ? 0xff3d7a : 0x29e0ff; for (const s of [-1, 1]) M(gCyl(10), mat(0x3a3848, { metalness: .6 }), s * 22.4, 6.5, z, .3, 13, .3, ctx.root); M(gBox(), glowMat(col), 0, 13.2, z, 45, .35, .35, ctx.root).castShadow = false; M(gBox(), mat(0x14121c), 0, 15.6, z, 15, 4.2, .4, ctx.root).castShadow = false; const l = label(String(yd), { size: 3.6, color: hex(col), stroke: null, fog: false }); l.position.set(0, 15.6, z + .3); ctx.root.add(l); const ln = M(gBox(), glowMat(col, { transparent: true, opacity: .5 }), 0, .05, z, 40, .02, .5, ctx.root); ln.castShadow = false; }
    const hoops = [[-128, 26, -4, 0xff3d7a], [-172, 30, 5, 0x29e0ff], [-216, 24, -2, 0xffc93c]].map(([z, y, x, c]) => { const m = M(gTor(.05), glowMat(c), x, y, z, 7, 7, 7, ctx.root); m.castShadow = false; const gl = new T.Sprite(new T.SpriteMaterial({ map: glowTex(), color: c, blending: T.AdditiveBlending, depthWrite: false, opacity: .35 })); gl.position.set(x, y, z); gl.scale.setScalar(24); ctx.root.add(gl); const l = label('+25', { size: 2.2, color: '#fff', stroke: null, fog: false }); l.position.set(x, y + 9, z); ctx.root.add(l); return { x, y, z, c, m, hit: false }; });
    let bonus = 0, glass = 0, pz = 0, best = 0;
    return {
      surface() { return 'road'; },
      beginShot() { bonus = 0; glass = 0; pz = 0; hoops.forEach(h => { h.hit = false; h.m.scale.setScalar(7); }); },
      step(B) {
        for (const h of hoops) if (!h.hit && pz > h.z && B.p.z <= h.z) { if (Math.hypot(B.p.x - h.x, B.p.y - h.y) < 7) { h.hit = true; bonus += 25; const p = new V3(h.x, h.y, h.z); FX.stars(p, 60, [h.c, 0xffffff]); FX.ring(p, 12, h.c, .6, h.y); FX.text(p, '+25 yd', 'teal'); Snd.ding(2); Snd.coin(); h.m.scale.setScalar(9); } }
        pz = B.p.z;
        if (Math.abs(B.p.x) > 29.4 && B.p.y < 140 && B.p.z < 22) { const s = Math.sign(B.p.x); B.p.x = s * 29.4; B.v.x = -B.v.x * .45; B.v.z *= .55; B.v.y *= .6; glass++; FX.stars(B.p, 24, [0x8fe8ff, 0xffffff]); Snd.glass(); Cam.shake = .15; }
      },
      update(dt, t) { hoops.forEach((h, i) => { h.m.rotation.z = t * .4 + i; }); },
      result(B) { const yd = Math.max(0, Math.round(-B.p.z * YD)), pts = yd + bonus; best = Math.max(best, yd); if (yd >= 250) { FX.confetti(B.p.clone().setY(3), 120); Snd.cheer(); } else Snd.ding(0); return { pts, text: yd >= 300 ? 'MONSTER!' : yd >= 250 ? 'BOMBED IT' : yd >= 200 ? 'Nice drive' : glass ? 'Off the glass' : 'In play', sub: yd + ' yd' + (bonus ? ' + ' + bonus + ' bonus' : ''), tone: yd >= 250 ? 'great' : yd >= 150 ? 'good' : 'miss', hold: 2.4 }; }
    };
  }
});
