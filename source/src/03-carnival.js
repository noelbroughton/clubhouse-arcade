/* ============ Carnival games ============ */
const GAMES = [];
const hd = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/* ---- Barrel Blast ---- */
GAMES.push({
  id: 'barrels', group: 'carnival', name: 'Barrel Blast', tag: 'Hit the TNT and set off a chain reaction', unit: 'pts', spt: 3, rounds: [1, 2, 3],
  how: ['Red barrels are full of TNT. Hit one, or land right beside it, and it blows.', 'Explosions set off nearby barrels. Longer chains score more.', 'Crates you send flying add bonus points. The gold barrel is worth 300.'],
  cam: { p: [0, 3.6, 8], l: [0, 5, -62] }, camMax: 16, thumb: { p: [-17, 8, -6], l: [3, 4, -50] },
  create(ctx) {
    envCanyon(ctx);
    const W = new CANNON.World(); W.gravity.set(0, -16, 0); W.broadphase = new CANNON.SAPBroadphase(W); W.solver.iterations = 7; W.allowSleep = true; W.defaultContactMaterial.friction = .6; W.defaultContactMaterial.restitution = .05;
    const gb = new CANNON.Body({ mass: 0 }); gb.addShape(new CANNON.Plane()); gb.quaternion.setFromEuler(-PI / 2, 0, 0); W.addBody(gb);
    const grp = new T.Group(); ctx.root.add(grp); const tags = new T.Group(); ctx.root.add(tags); rangeArcs(ctx, [20, 40, 60, 80, 100, 120], { half: .6, maxW: 44, sides: [1] }); const tagAt = (x, z, y) => tags.add(tagLabel(Math.round(Math.hypot(x, z) * YD) + ' yd', x, y + 1, z, .85 + Math.hypot(x, z) * .013));
    const crateM = new T.MeshStandardMaterial({ roughness: .8, map: ctex(128, 128, (g, w) => { g.fillStyle = '#c98d4f'; g.fillRect(0, 0, w, w); g.fillStyle = '#b57a40'; for (let i = 0; i < 4; i++)g.fillRect(14, 14 + i * 26, w - 28, 22); g.strokeStyle = '#7a4a22'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, w - 12); g.lineWidth = 9; g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, w - 10); g.stroke(); speckle(g, w, w, 500, .05); }) });
    const side = (a, b, t) => new T.MeshStandardMaterial({ roughness: .5, metalness: .25, map: ctex(512, 128, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; g.fillRect(0, 12, w, 14); g.fillRect(0, h - 26, w, 14); g.font = '64px "Titan One",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff6e4'; g.strokeStyle = b; g.lineWidth = 8; for (const x of [.25, .75]) { g.strokeText(t, w * x, h / 2 + 3); g.fillText(t, w * x, h / 2 + 3); } }) });
    const barM = [side('#d6263c', '#6b0f1c', 'TNT'), mat(0x8a1626, { metalness: .3 }), mat(0x8a1626, { metalness: .3 })], goldM = [side('#ffc93c', '#8a5a00', '300'), mat(0xd9a020, { metalness: .5 }), mat(0xd9a020, { metalness: .5 })];
    const cg = new T.BoxGeometry(2, 2, 2), bg = new T.CylinderGeometry(1, 1, 2.6, 24);
    let objs = [], pending = [], lastBoom = -9, lastHit = -9, time = 0, booms = 0, pts = 0, smashed = 0;
    const spawn = (kind, x, y, z) => { const bar = kind !== 'crate', b = new CANNON.Body({ mass: bar ? 34 : 26 }); b.addShape(new CANNON.Box(new CANNON.Vec3(bar ? .92 : 1, bar ? 1.3 : 1, bar ? .92 : 1))); b.position.set(x, y, z); b.sleepSpeedLimit = .5; b.sleepTimeLimit = .4; b.angularDamping = .25; W.addBody(b); b.sleep(); const m = new T.Mesh(bar ? bg : cg, bar ? (kind === 'gold' ? goldM : barM) : crateM); m.castShadow = m.receiveShadow = true; m.position.set(x, y, z); m.rotation.y = bar ? rnd(6) : 0; grp.add(m); objs.push({ kind, bar, b, m, alive: true, home: new V3(x, y, z), hit: false, counted: false, ry: m.rotation.y }); };
    const pyramid = (x, z, n, top) => { for (let i = 0; i < n; i++)for (let j = 0; j < n - i; j++)spawn('crate', x + (j - (n - i - 1) / 2) * 2.08, 1 + i * 2, z); if (top) spawn(top, x, n * 2 + 1.3, z); };
    const row = (x, z, w, h, kind = 'tnt') => { for (let i = 0; i < h; i++)for (let j = 0; j < w; j++)spawn(kind, x + (j - (w - 1) / 2) * (kind === 'crate' ? 2.08 : 2), (kind === 'crate' ? 1 : 1.3) + i * (kind === 'crate' ? 2 : 2.6), z); };
    const tower = (x, z, h, top) => { for (let i = 0; i < h; i++)spawn('crate', x, 1 + i * 2, z); spawn(top, x, h * 2 + 1.3, z); };
    const reset = round => {
      objs.forEach(o => { if (o.alive) W.removeBody(o.b); grp.remove(o.m); }); objs = []; pending = []; const s = round % 2 ? -1 : 1; while (tags.children.length) tags.remove(tags.children[0]); [[-5 * s, -17, 4.5], [6 * s, -22, 4.5], [-10 * s, -32, 11], [9 * s, -44, 5], [0, -60, 11.5], [15 * s, -78, 13.5], [-14 * s, -74, 8], [0, -100, 6], [-20 * s, -104, 5], [22 * s, -112, 5]].forEach(t => tagAt(t[0], t[1], t[2]));
      row(-5 * s, -17, 1, 1); row(6 * s, -22, 2, 1); pyramid(-10 * s, -32, 3, 'tnt'); row(-14.6 * s, -32, 1, 1); row(9 * s, -44, 3, 1); row(9 * s, -47, 2, 1, 'crate');
      tower(0, -60, 3, 'gold'); row(-2.4, -60, 1, 1); row(2.4, -60, 1, 1); pyramid(15 * s, -78, 4, 'tnt'); row(-14 * s, -74, 4, 2); row(-14 * s, -77, 3, 1, 'crate'); row(0, -100, 5, 1); row(0, -103.2, 4, 2, 'crate'); row(-20 * s, -104, 2, 1); row(22 * s, -112, 3, 1);
    };
    const detonate = (o, chain) => {
      if (!o.alive) return; o.alive = false; W.removeBody(o.b); grp.remove(o.m); const p = new V3(o.b.position.x, o.b.position.y, o.b.position.z); FX.explode(p, o.kind === 'gold' ? 1.5 : 1); lastBoom = time; booms++;
      const v = (o.kind === 'gold' ? 300 : 100) + chain * 50; pts += v; FX.text(p.clone().setY(p.y + 3), '+' + v, chain ? 'big' : ''); if (chain > 1) FX.text(p.clone().setY(p.y + 7), 'CHAIN x' + (chain + 1), 'coral');
      for (const q of objs) { if (!q.alive) continue; const d = new V3(q.b.position.x - p.x, q.b.position.y - p.y, q.b.position.z - p.z), l = d.length(); if (l > 11) continue; q.b.wakeUp(); const k = (1 - l / 11) * 20; d.normalize(); q.b.velocity.x += d.x * k; q.b.velocity.y += Math.abs(d.y) * k + k * .55; q.b.velocity.z += d.z * k; q.b.angularVelocity.set(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)); if (q.bar && l < 7 && !pending.some(e => e.o === q)) pending.push({ o: q, t: rnd(.14, .34), chain: chain + 1 }); }
    };
    return {
      beginTurn(pl, round) { reset(round); },
      beginShot() { pts = 0; booms = 0; smashed = 0; },
      step(B) {
        if (B.cd > 0) return;
        for (const o of objs) {
          if (!o.alive) continue; const bp = o.b.position, dx = B.p.x - bp.x, dy = B.p.y - bp.y, dz = B.p.z - bp.z; if (dx * dx + dy * dy + dz * dz > 2.9) continue;
          if (o.bar) { detonate(o, 0); B.state = 'done'; B.m.visible = false; return; }
          lastHit = time; for (const q of objs) { if (!q.alive) continue; const l = Math.hypot(q.b.position.x - bp.x, q.b.position.y - bp.y, q.b.position.z - bp.z); if (l > 3.4) continue; const k = q === o ? 1.15 : .75; q.b.wakeUp(); q.b.velocity.set(B.v.x * k + rnd(-1.5, 1.5), Math.abs(B.v.y) * .15 + 5, B.v.z * k); q.b.angularVelocity.set(rnd(-5, 5), rnd(-5, 5), rnd(-5, 5)); } B.v.multiplyScalar(-.12); B.v.y = Math.abs(B.v.y) + 2; B.cd = .25; Snd.thud(); FX.dust(B.p, [0xc98d4f, 0x8a5a2b], 14); if (!o.hit) { o.hit = true; } return;
        }
      },
      onLand(B) { let best = null, bd = 3.6; for (const o of objs) { if (!o.alive || !o.bar) continue; const d = hd(B.p.x, B.p.z, o.b.position.x, o.b.position.z); if (d < bd && o.b.position.y < 3) { bd = d; best = o; } } if (best) { detonate(best, 0); B.m.visible = false; return 'stop'; } },
      update(dt) { time += dt; for (const o of objs) if (o.alive && o.bar && o.b.sleepState !== 2 && !pending.some(e => e.o === o) && Math.hypot(o.b.position.x - o.home.x, o.b.position.y - o.home.y, o.b.position.z - o.home.z) > 1.1) pending.push({ o, t: rnd(.25, .5), chain: booms ? booms : 0 }); pending = pending.filter(e => { e.t -= dt; if (e.t <= 0) { detonate(e.o, e.chain); return false; } return true; }); W.step(1 / 60, dt, 12); for (const o of objs) if (o.alive && o.b.sleepState !== 2) { o.m.position.set(o.b.position.x, o.b.position.y, o.b.position.z); o.m.quaternion.set(o.b.quaternion.x, o.b.quaternion.y, o.b.quaternion.z, o.b.quaternion.w); if (o.bar) o.m.rotateY(o.ry); } },
      settled() { return !pending.length && time - lastBoom > 1.5 && time - lastHit > 1.8; },
      result() {
        for (const o of objs) if (o.alive && !o.bar && !o.counted && (Math.hypot(o.b.position.x - o.home.x, o.b.position.y - o.home.y, o.b.position.z - o.home.z) > 1.6)) { o.counted = true; smashed++; pts += 20; }
        if (!pts) return { pts: 0, text: pick(['Missed!', 'No boom', 'So close!']), tone: 'miss' };
        const sub = [booms ? booms + (booms > 1 ? ' barrels' : ' barrel') : '', smashed ? smashed + (smashed > 1 ? ' crates' : ' crate') : ''].filter(Boolean).join(' · ');
        return { pts, text: booms >= 4 ? 'CHAIN REACTION!' : booms ? 'KABOOM!' : 'SMASH!', sub: '+' + pts + ' · ' + sub, tone: booms >= 3 ? 'great' : 'good' };
      }
    };
  }
});

/* ---- Mole Patrol ---- */
function moleModel() {
  const g = new T.Group(), fur = new T.MeshStandardMaterial({ color: C(0x8f5d3d), roughness: .9 }), pink = mat(0xf2a6a0), wht = mat(0xffffff, { roughness: .4 }), blk = mat(0x1a1218, { roughness: .3 });
  M(gSph(), fur, 0, 1.7, 0, 2, 2.8, 2, g); M(gSph(), mat(0xd9b48f), 0, 1.25, 1.25, 1.4, 1.85, 1, g); M(gSph(), mat(0xe9c9a6), 0, 2.35, 1.6, .95, .7, .9, g); M(gSph(), pink, 0, 2.62, 2.42, .34, .28, .3, g);
  for (const s of [-1, 1]) { M(gSph(), wht, s * .78, 3.2, 1.45, .46, .5, .4, g); M(gSph(), blk, s * .74, 3.2, 1.8, .22, .26, .16, g); M(gBox(), wht, s * .19, 1.84, 2.36, .32, .5, .12, g); M(gSph(), pink, s * 1.85, 1.35, 1.1, .62, .42, .6, g); M(gSph(), fur, s * 1.25, 4.05, .2, .42, .42, .25, g); }
  return { g, fur };
}
GAMES.push({
  id: 'moles', group: 'carnival', name: 'Mole Patrol', tag: 'Bonk the moles before they duck', unit: 'pts', spt: 4, rounds: [1, 2, 3],
  how: ['Moles pop out of nine burrows. Land your ball on one to bonk it.', 'Front row scores 100, middle 200, back row 300.', 'A golden mole is worth double.'],
  cam: { p: [0, 4.2, 9], l: [0, 2.5, -52] }, camMax: 8, thumb: { p: [15, 8, -8], l: [-3, 2, -46] },
  create(ctx) {
    envCarnival(ctx, { sign: 'MOLE PATROL' });
    const holes = [], dirt = mat(0x7a5236), dark = mat(0x1c120c); let pts = 0, msg = '', n = 0;
    [[-30, 10.5, 100], [-52, 15, 200], [-78, 20, 300]].forEach(([z, dx, v], r) => [-1, 0, 1].forEach(i => {
      const x = i * dx; M(gTor(.3), dirt, x, .1, z, 3.3, 3.3, 3.2, ctx.root).rotation.x = PI / 2; M(gDisc(), dark, x, .06, z, 3.2, 1, 3.2, ctx.root).castShadow = false;
      for (let k = 0; k < 7; k++) { const a = k / 7 * PI * 2 + i; M(gIco(1), dirt, x + Math.cos(a) * 4.2, .2, z + Math.sin(a) * 4.2, .7, .45, .7, ctx.root); }
      const m = moleModel(); m.g.position.set(x, -6.5, z); m.g.scale.setScalar(1 + r * .12); ctx.root.add(m.g); holes.push({ x, z, v, r, m, up: 0, tgt: 0, gold: false, bonk: 0, ph: rnd(6) });
    }));
    [[-30, 100], [-52, 200], [-78, 300]].forEach(([z, v], r) => { for (const sd of [-1, 1]) ctx.root.add(tagLabel(Math.round(-z * YD) + ' yd · ' + v + ' pts', sd * (18 + r * 7), 1.9 + r * .5, z, 1.5 + r * .45, { w: 600, color: '#ffe27a' })); });
    const bonk = (h, B) => { const v = h.v * (h.gold ? 2 : 1); pts += v; n++; h.bonk = .9; msg = h.gold ? 'GOLDEN BONK!' : 'BONK!'; const p = new V3(h.x, 5, h.z); FX.stars(p, 34); FX.ring(p, 8, h.gold ? 0xffe27a : 0xffffff, .5, .3); FX.text(p.setY(8), '+' + v, h.gold ? 'big' : ''); Snd.bonk(); if (h.gold) Snd.coin(); Cam.shake = .25; };
    return {
      beginShot() { pts = 0; n = 0; msg = ''; const rows = [0, 1, 2].map(r => holes.filter(h => h.r === r)), ups = [pick(rows[0]), pick(rows[1]), pick(rows[2])]; const ex = pick(holes.filter(h => !ups.includes(h))); ups.push(ex); holes.forEach(h => { h.tgt = ups.includes(h) ? 1 : 0; h.gold = false; h.bonk = 0; }); if (Math.random() < .4) pick(ups.slice(1, 3)).gold = true; holes.forEach(h => h.m.fur.color.copy(C(h.gold ? 0xffc21f : 0x8f5d3d))); Snd.pop(); },
      step(B) { if (B.cd > 0) return; for (const h of holes) if (h.up > .75 && h.bonk <= 0 && h.tgt && hd(B.p.x, B.p.z, h.x, h.z) < 2.7 && B.p.y < 6.2) { bonk(h, B); B.v.set(rnd(-3, 3), 9, rnd(2, 5)); B.cd = 9; return; } },
      onLand(B) { if (B.cd > 0) return; for (const h of holes) { const d = hd(B.p.x, B.p.z, h.x, h.z); if (d < 3.5 && h.tgt && h.bonk <= 0) { bonk(h, B); return 'stop'; } if (d < 3 && !h.tgt) { msg = 'Nobody home!'; B.m.visible = false; return 'stop'; } } },
      update(dt, t) { for (const h of holes) { if (h.bonk > 0) { h.bonk -= dt; if (h.bonk <= 0) h.tgt = 0; } h.up = lerp(h.up, h.tgt, 1 - Math.exp(-dt * (h.tgt ? 7 : 9))); const k = h.up, s = h.m.g.scale.x; h.m.g.position.y = lerp(-6.5, -.2, k) + Math.sin(t * 2.4 + h.ph) * .22 * k; h.m.g.scale.y = s * (h.bonk > 0 ? .55 + .3 * Math.abs(Math.sin(h.bonk * 20)) * h.bonk : 1); h.m.g.rotation.y = Math.atan2(-h.x, -h.z + 9) + Math.sin(t * 1.3 + h.ph) * .25; h.m.g.rotation.z = Math.sin(t * 3 + h.ph) * .05 * k; } },
      result() { return pts ? { pts, text: msg, sub: '+' + pts, tone: n > 1 || pts >= 400 ? 'great' : 'good' } : { pts: 0, text: msg || pick(['Missed!', 'Too slow!', 'They ducked!']), tone: 'miss' }; }
    };
  }
});

/* ---- Ferris Frenzy ---- */
GAMES.push({
  id: 'ferris', group: 'carnival', name: 'Ferris Frenzy', tag: 'Ring the gondolas as the big wheel turns', unit: 'pts', spt: 4, rounds: [1, 2, 3],
  how: ['Hit a gondola on the turning wheel to light it up. Anywhere near one counts.', 'Each gondola shows its points. The gold one is worth 500, and the hub is worth 400.', 'Hitting the wheel itself scores 25. Pop the balloons out front for 50 each.'],
  cam: { p: [0, 3.4, 9], l: [0, 17, -62] }, camMax: 6, thumb: { p: [20, 6, 6], l: [-3, 20, -60] },
  create(ctx) {
    envCarnival(ctx, { noWheel: true, sign: 'FERRIS FRENZY', signAt: [-30, -40, .55] });
    const V = [100, 200, 100, 300, 100, 200, 100, 300, 200, 500], CC = { 100: 0x3fa7ff, 200: 0x44d68a, 300: 0xff5d73, 500: 0xffc93c };
    const fw = ferrisWheel(ctx, { x: 0, z: -64, cy: 23.5, R: 19, n: 10, sp: .1, cols: V.map(v => CC[v]) });
    rangeArcs(ctx, [20, 30, 40, 50, 60], { half: .5, maxW: 26 }); ctx.root.add(tagLabel('Wheel · ' + Math.round(64 * YD) + ' yd', 0, 2.2, -56, 2.6, { w: 560 })); fw.cars.forEach((c, i) => { c.v = V[i]; const l = label(String(c.v), { size: 2.7, color: '#fff' }); l.position.set(0, -3.1, 3.05); c.g.add(l); c.l = l; });
    const bal = [], BC = [0xff5d73, 0xffc93c, 0x2ad4c0, 0xb98bff, 0x3fa7ff, 0xff9a3c]; [[-9, 4, -20], [8, 5, -24], [-3, 7, -30], [12, 8, -34], [-13, 9, -38], [3, 11, -42], [-7, 12, -46], [10, 13, -48]].forEach((p, i) => bal.push({ g: balloon(ctx, p[0], p[1], p[2], BC[i % 6], 1.5, p[1] - .5), p: new V3(p[0], p[1], p[2]), alive: true }));
    let pts = 0, msg = '', hub = false, pz = 0; const wp = new V3(); fw.cars.forEach(c => c.body.scale.setScalar(1.45));
    return {
      beginTurn() { fw.cars.forEach(c => { c.hit = false; c.m.emissiveIntensity = 0; }); bal.forEach(b => { b.alive = true; b.g.visible = true; }); hub = false; },
      beginShot() { pts = 0; msg = ''; pz = 0; },
      step(B) {
        for (const b of bal) if (b.alive && B.p.distanceTo(b.g.position) < 3.2) { b.alive = false; b.g.visible = false; pts += 50; FX.confetti(b.g.position, 30, .6); FX.text(b.g.position, '+50', 'teal'); Snd.pop(); msg = msg || 'POP!'; }
        if (B.cd > 0) return; const was = pz; pz = B.p.z; if (!(was > -64 && pz <= -64)) return;
        const hx = B.p.x, hy = B.p.y, dh = Math.hypot(hx, hy - fw.cy);
        if (!hub && dh < 3.2) { hub = true; pts += 400; msg = 'DEAD CENTRE!'; wp.set(0, fw.cy, -61); FX.stars(wp, 50); FX.confetti(wp, 80); FX.text(wp, '+400', 'big'); Snd.cheer(); B.v.multiplyScalar(.15); B.cd = 9; return; }
        let best = null, bd = 4.4; for (const c of fw.cars) { const d = Math.hypot(hx - c.g.position.x, hy - (c.g.position.y - 2.6)); if (d < bd) { bd = d; best = c; } }
        if (best) { const c = best; wp.set(c.g.position.x, c.g.position.y - 2.6, -64); const v = c.hit ? 25 : c.v; pts += v; c.hit = true; c.spin = 1; c.m.emissiveIntensity = .8; msg = c.v === 500 && v === 500 ? 'GOLDEN GONDOLA!' : 'DING!'; FX.confetti(wp, c.v >= 300 ? 110 : 60); FX.stars(wp, 20); FX.text(wp.clone().setY(wp.y + 3), '+' + v, v >= 300 ? 'big' : ''); Snd.ding(V.indexOf(c.v) % 4); if (v >= 300) Snd.cheer(); B.v.multiplyScalar(.2); B.v.z = Math.abs(B.v.z) * .6 + 2; B.cd = 9; return; }
        if (dh < fw.R + 3) { pts += 25; msg = msg || 'CLANG!'; wp.set(hx, hy, -63); FX.stars(wp, 16, [0xffffff, 0xcfd8ff]); FX.text(wp, '+25'); Snd.glass(); B.v.multiplyScalar(.2); B.v.z = Math.abs(B.v.z) * .6 + 2; B.cd = 9; }
      },
      update() { },
      result() { return pts ? { pts, text: msg, sub: '+' + pts, tone: pts >= 300 ? 'great' : 'good' } : { pts: 0, text: pick(['Missed the wheel', 'Whoosh!', 'So close!']), tone: 'miss' }; }
    };
  }
});

/* ---- Dunk Derby ---- */
function kart(col) {
  const g = new T.Group(), c = new T.MeshStandardMaterial({ color: C(col), roughness: .35, metalness: .15 }), wht = mat(0xfff6e4), tyre = mat(0x1a1a1e);
  M(gBox(), c, 0, .75, 0, 1.7, .6, 2.9, g); M(gBox(), c, 0, 1.05, -1, 1.5, .45, .8, g); M(gBox(), wht, 0, 1.15, .85, 1.5, .5, .9, g); M(gBox(), wht, 0, 2.45, .1, 1.8, .12, 2.5, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { M(gCyl(6), wht, sx * .78, 1.75, sz * 1 + .1, .05, 1.4, .05, g); const w = M(gCyl(14), tyre, sx * .9, .42, sz * 1.02, .42, .34, .42, g); w.rotation.z = PI / 2; }
  M(gSph(), c, 0, 1.55, .2, .42, .5, .36, g); M(gSph(), mat(0xf2c9a0), 0, 2.08, .2, .3, .3, .3, g); M(gSph(), c, 0, 2.2, .18, .32, .2, .32, g); M(gBox(), c, 0, 2.17, -.12, .4, .06, .4, g);
  M(gCyl(6), wht, .7, 3.3, 1.2, .03, 1.6, .03, g); return g;
}
GAMES.push({
  id: 'dunk', group: 'carnival', name: 'Dunk Derby', tag: 'Splash a pool to drive your cart down the track', unit: 'spaces', spt: 3, rounds: [2, 3, 5],
  how: ['Land your ball in a paddling pool to move your golf cart.', 'Near pools move you 1 or 2 spaces. Far pools move you 3 or 5.', 'First cart through the finish arch wins.'],
  cam: { p: [2, 4.2, 9], l: [-2, 2, -52] }, camMax: 10, thumb: { p: [-4, 7, 2], l: [-8, 1, -48] },
  create(ctx, match) {
    envCarnival(ctx, { sign: 'DUNK DERBY', signAt: [30, -44, -.5] });
    const P = [{ x: -1, z: -22, r: 4.3, st: 1, c: 0xff5d73 }, { x: 11, z: -38, r: 4.9, st: 2, c: 0xffc93c }, { x: 0, z: -58, r: 5.5, st: 3, c: 0x2ad4c0 }, { x: 12, z: -86, r: 6.4, st: 5, c: 0xb98bff }];
    for (const p of P) { M(gTor(.13), mat(p.c, { roughness: .3 }), p.x, .55, p.z, p.r, p.r, 6, ctx.root).rotation.x = PI / 2; const w = M(gDisc(), new T.MeshStandardMaterial({ color: C(0x35b8f0), roughness: .08, metalness: .2 }), p.x, .75, p.z, p.r * .97, 1, p.r * .97, ctx.root); w.castShadow = false; const l = label('+' + p.st, { size: 2.6 + p.st * .5, color: '#fff' }); l.position.set(p.x, 5 + p.st * .7, p.z); ctx.root.add(l); p.l = l; ctx.ticks.push((dt, t) => { l.quaternion.copy(E.cam.quaternion); l.position.y = 5 + p.st * .7 + Math.sin(t * 2 + p.z) * .3; }); ctx.root.add(tagLabel(Math.round(Math.hypot(p.x, p.z) * YD) + ' yd', p.x, 1.9 + p.st * .2, p.z, 1.3 + p.st * .22, { color: '#ffe27a' })); }
    const FIN = 20, SL = 4.6, Z0 = -6, X0 = -15, np = match.players.length, tw = np * 2.4 + 1.6, xc = X0 - (np - 1) * 1.2;
    const tr = new T.Mesh(new T.PlaneGeometry(tw, FIN * SL + 12).rotateX(-PI / 2), new T.MeshStandardMaterial({ map: ctex(64, 64, (g, w, h) => { g.fillStyle = '#d98a4a'; g.fillRect(0, 0, w, h); g.fillStyle = '#c97a3c'; g.fillRect(0, 0, w, h / 2); }, [1, FIN + 2.6]), roughness: .9 })); tr.position.set(xc, .04, Z0 - FIN * SL / 2); tr.receiveShadow = true; ctx.root.add(tr);
    for (const s of [-1, 1]) for (let i = 0; i < 44; i++)ctx.near.put(gBox(), mat(0xffffff), xc + s * (tw / 2 + .25), .3, Z0 + 5 - i * (FIN * SL + 10) / 43, .5, .6, 2, 0, C(i % 2 ? 0xe8344e : 0xfff6e4));
    for (let i = 5; i < FIN; i += 5) { const l = label(String(FIN - i) + ' to go', { size: 1.4, color: '#fff6e4' }); l.position.set(xc + tw / 2 + 2.6, 2, Z0 - i * SL); ctx.root.add(l); ctx.ticks.push(() => l.quaternion.copy(E.cam.quaternion)); }
    const fz = Z0 - FIN * SL, chk = ctex(256, 64, (g, w, h) => { for (let y = 0; y < 2; y++)for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#14121c' : '#fff'; g.fillRect(x * 32, y * 32, 32, 32); } });
    for (const s of [-1, 1]) M(gCyl(12), mat(0xfff6e4), xc + s * (tw / 2 + 1), 5, fz, .3, 10, .3, ctx.root); M(gBox(), new T.MeshStandardMaterial({ map: chk }), xc, 9.2, fz, tw + 2.6, 2.2, .3, ctx.root); const fl = label('FINISH', { size: 1.7, color: '#ffe27a' }); fl.position.set(xc, 11.4, fz); ctx.root.add(fl);
    const karts = match.players.map((pl, i) => { const g = kart(PCOL[pl.c]); g.position.set(X0 - i * 2.4, 0, Z0); g.rotation.y = PI; ctx.root.add(g); return { g, st: 0, z: Z0, done: false }; });
    ctx.near.build(); let pts = 0, msg = '', cur = 0, moving = 0, fin = false;
    const dunk = (p, B) => { const k = karts[cur], was = k.st; k.st = Math.min(FIN, k.st + p.st); pts = k.st - was; msg = 'SPLASH! +' + p.st; FX.splash(new V3(p.x, .8, p.z)); FX.confetti(new V3(p.x, 2, p.z), 50); FX.text(new V3(p.x, 6, p.z), '+' + p.st, 'big'); Snd.coin(); B.m.visible = false; moving = 2.6; Cam.cutTo([k.g.position.x + 9, 5.5, k.z + 9], [k.g.position.x - 1, 1.5, Z0 - k.st * SL + 4], 2.6); if (k.st >= FIN && !k.done) { k.done = true; fin = true; msg = 'FINISHED!'; setTimeout(() => { FX.confetti(new V3(xc, 8, fz), 200, 1.3); Snd.cheer(); }, 1500); } };
    return {
      beginTurn(pl, round, pi) { cur = pi; },
      beginShot() { pts = 0; msg = ''; },
      onLand(B) { for (const p of P) if (hd(B.p.x, B.p.z, p.x, p.z) < p.r) { dunk(p, B); return 'stop'; } },
      step(B) { if (B.state !== 'roll') return; for (const p of P) if (hd(B.p.x, B.p.z, p.x, p.z) < p.r - .3) { dunk(p, B); B.state = 'done'; return; } },
      update(dt, t) { moving -= dt; karts.forEach((k, i) => { const tz = Z0 - k.st * SL, d = tz - k.z; k.z += clamp(d, -dt * 14, dt * 14); k.g.position.z = k.z; k.g.position.y = Math.abs(d) > .05 ? Math.abs(Math.sin(t * 18)) * .12 : 0; }); },
      settled() { return moving <= 0; },
      scores() { return karts.map(k => k.st); },
      over() { return fin; },
      result() { return pts ? { pts: 0, text: msg, sub: karts[cur].st >= FIN ? 'Across the line' : (FIN - karts[cur].st) + ' spaces to go', tone: 'great' } : { pts: 0, text: pick(['No splash', 'Dry land!', 'Just missed']), tone: 'miss' }; }
    };
  }
});
