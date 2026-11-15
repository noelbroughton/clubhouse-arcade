/* ============ Mini golf: putting physics, hole builder, three courses ============ */
const PUTT = { R: .11, T: .14, a: 1.55, maxV: 14 };
const HOLES = {
  pirate: [
    { n: 'The Plank', par: 2, cup: [0, -12.5], poly: [[-2, 1.5], [2, 1.5], [2, -14.5], [-2, -14.5]], bumps: [[-.95, -6, .45], [.95, -9, .45]] },
    { n: "Dead Man's Corner", par: 3, cup: [9.5, -10], poly: [[-2, 1.5], [2, 1.5], [2, -8], [11.5, -8], [11.5, -12], [-2, -12]], walls: [[-2, -9.5, .5, -12]], way: [[0, -9.5]] },
    { n: 'Shark Bridge', par: 3, cup: [0, -16], poly: [[-2.5, 1.5], [2.5, 1.5], [2.5, -18], [-2.5, -18]], water: [[-2.5, -11, -.9, -6.5], [.9, -11, 2.5, -6.5]] },
    { n: 'Skull Cave', par: 2, cup: [7, -15], polys: [[[-2.5, 1.5], [2.5, 1.5], [2.5, -10], [-2.5, -10]], [[3, -12], [10, -12], [10, -18], [3, -18]]], pipe: [[0, -8.3, 4.2, -13.2, 2.1, -1.35]], bumps: [[-1.4, -5, .4], [1.4, -5, .4]], way: [[0, -8.3]] },
    { n: 'Whirlpool', par: 3, cup: [0, -12.8], poly: [[-1.5, 1.5], [1.5, 1.5], [1.5, -3], [4.5, -4.5], [6, -8.5], [4.5, -12.5], [1.5, -14.5], [-1.5, -14.5], [-4.5, -12.5], [-6, -8.5], [-4.5, -4.5], [-1.5, -3]], spin: [[0, -8.5, 4.4, 1.3, 0]] },
    { n: 'Treasure Island', par: 4, cup: [1.6, -18], poly: [[-3, 1.5], [3, 1.5], [3, -20], [-3, -20]], walls: [[-3, -6, .9, -6], [3, -11.5, -.9, -11.5]], sand: [[-3, -17.5, -1, -14]], bumps: [[-.2, -16.3, .45]], way: [[2, -6], [-2, -11.5]] }
  ],
  meadow: [
    { n: 'The Windmill', par: 2, cup: [0, -14], poly: [[-2.2, 1.5], [2.2, 1.5], [2.2, -16], [-2.2, -16]], walls: [[-2.2, -8, -.75, -8], [.75, -8, 2.2, -8]], mill: [[0, -8, .75, .9, 0]] },
    { n: 'Hay Maze', par: 3, cup: [0, -13.5], poly: [[-2.8, 1.5], [2.8, 1.5], [2.8, -15.5], [-2.8, -15.5]], bumps: [[0, -4.5, .5], [-1.5, -7.5, .5], [1.5, -7.5, .5], [0, -10.5, .5]] },
    { n: 'Heartbreak Hill', par: 3, cup: [0, -14.5], poly: [[-2.2, 1.5], [2.2, 1.5], [2.2, -16.5], [-2.2, -16.5]], slope: [[-2.2, -10, 2.2, -5.5, 0, 2.4]] },
    { n: 'Barn Door', par: 3, cup: [-7.5, -12], poly: [[-2.2, 1.5], [2.2, 1.5], [2.2, -14], [-9.2, -14], [-9.2, -10], [-2.2, -10]], walls: [[2.2, -11.5, -.3, -14]], slide: [[-1.2, -6, 1.2, -6, 1.9, 1.5, 0]], way: [[0, -11.5]] },
    { n: 'Duck Pond', par: 3, cup: [0, -14.5], poly: [[-3, 1.5], [3, 1.5], [3, -16.5], [-3, -16.5]], water: [[-1.1, -10.5, 1.1, -6]], bumps: [[-2.1, -12.5, .4], [2.1, -12.5, .4]], way: [[2.1, -5.6], [2.1, -10.9]] },
    { n: 'Harvest Run', par: 4, cup: [0, -17.5], poly: [[-3, 1.5], [3, 1.5], [3, -19.5], [-3, -19.5]], spin: [[0, -6, 4.6, -1.2, 0]], walls: [[-3, -13, -.8, -13], [.8, -13, 3, -13]], mill: [[0, -13, .8, 1.1, .6]], bumps: [[-1.8, -9.5, .45], [1.8, -9.5, .45]] }
  ],
  neon: [
    { n: 'Laser Lane', par: 2, cup: [0, -13], poly: [[-2.2, 1.5], [2.2, 1.5], [2.2, -15], [-2.2, -15]], bumps: [[-.95, -5.5, .5], [.95, -8.5, .45], [-.85, -11, .4]] },
    { n: 'Ricochet', par: 3, cup: [6, -14.5], poly: [[-2, 1.5], [2, 1.5], [2, -6], [8, -6], [8, -16.5], [4, -16.5], [4, -10], [-2, -10]], walls: [[-2, -7.5, .5, -10], [5.5, -6, 8, -8.5]], way: [[0, -8], [6, -8]] },
    { n: 'Twin Turbines', par: 3, cup: [0, -16], poly: [[-2.6, 1.5], [2.6, 1.5], [2.6, -18], [-2.6, -18]], spin: [[0, -6, 4, 1.6, 0], [0, -11.5, 4, -1.6, .8]] },
    { n: 'Warp Gate', par: 2, cup: [-1.2, -15], polys: [[[-2.5, 1.5], [2.5, 1.5], [2.5, -9.5], [-2.5, -9.5]], [[-9.5, -13], [1, -13], [1, -17], [-9.5, -17]]], pipe: [[0, -7.8, -8, -15, 4.2, 0]], bumps: [[-1.3, -4.5, .4], [1.3, -4.5, .4], [-4.5, -14.1, .35], [-4.5, -15.9, .35]], way: [[0, -7.8]] },
    { n: 'Sliders', par: 3, cup: [0, -15], poly: [[-2.6, 1.5], [2.6, 1.5], [2.6, -17], [-2.6, -17]], slide: [[-1.6, -5.5, 1.6, -5.5, 1.8, 1.7, 0], [-1.6, -10.5, 1.6, -10.5, 1.8, 1.7, PI]] },
    { n: 'Jackpot', par: 2, cup: [0, -9.3], poly: [[-1.5, 1.5], [1.5, 1.5], [1.5, -3], [6, -5.5], [6, -12.5], [1.5, -15.5], [-1.5, -15.5], [-6, -12.5], [-6, -5.5], [-1.5, -3]], bumps: [[-1.6, -7.6, .5], [1.6, -7.6, .5], [-2.4, -10, .5], [2.4, -10, .5], [0, -11.8, .5]] }
  ]
};
function mkHole(d) {
  const h = Object.assign({ walls: [], bumps: [], spin: [], slide: [], mill: [], water: [], sand: [], slope: [], pipe: [], way: [] }, d); h.polys = d.polys || [d.poly]; h.segs = [];
  for (const P of h.polys) P.forEach((p, i) => { const q = P[(i + 1) % P.length]; h.segs.push([p[0], p[1], q[0], q[1]]); }); h.walls.forEach(w => h.segs.push(w)); return h;
}
const inRect = (b, s) => b.x >= s[0] && b.x <= s[2] && b.z >= s[1] && b.z <= s[3];
function inPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function hitSeg(b, ax, az, bx, bz, rad, e) { const dx = bx - ax, dz = bz - az, t = clamp(((b.x - ax) * dx + (b.z - az) * dz) / (dx * dx + dz * dz), 0, 1), cx = ax + dx * t, cz = az + dz * t; let nx = b.x - cx, nz = b.z - cz; const d = Math.hypot(nx, nz); if (d >= rad || d < 1e-6) return 0; nx /= d; nz /= d; b.x = cx + nx * rad; b.z = cz + nz * rad; b.nx = nx; b.nz = nz; const vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vz -= (1 + e) * vn * nz; return -vn; } return 1e-4; }
const spinEnds = (s, t) => { const a = s[4] + s[3] * t, cx = Math.cos(a) * s[2] / 2, cz = Math.sin(a) * s[2] / 2; return [s[0] - cx, s[1] - cz, s[0] + cx, s[1] + cz, a]; };
const slidePos = (s, t) => { const k = .5 + .5 * Math.sin(s[6] + s[5] * t), cx = lerp(s[0], s[2], k), cz = lerp(s[1], s[3], k), l = Math.hypot(s[2] - s[0], s[3] - s[1]) || 1, ux = (s[2] - s[0]) / l * s[4] / 2, uz = (s[3] - s[1]) / l * s[4] / 2; return [cx - ux, cz - uz, cx + ux, cz + uz, cx, cz]; };
const millAng = (m, t) => m[4] + m[3] * t;
const millShut = (m, t) => { const q = PI / 2, k = ((millAng(m, t) % q) + q) % q; return k < .36 || k > q - .36; };
function puttStep(h, b, t, dt, fx) {
  if (b.pipe) { b.pipe.t -= dt; if (b.pipe.t <= 0) { b.x = b.pipe.x; b.z = b.pipe.z; b.vx = b.pipe.vx; b.vz = b.pipe.vz; b.pipe = null; fx && fx('out'); } return; }
  let a = PUTT.a, sl = false; for (const s of h.sand) if (inRect(b, s)) a *= 4.5; for (const s of h.slope) if (inRect(b, s)) { b.vx += s[4] * dt; b.vz += s[5] * dt; sl = true; }
  let sp = Math.hypot(b.vx, b.vz); if (sp > 0) { const k = Math.max(0, sp - a * dt) / sp; b.vx *= k; b.vz *= k; sp *= k; } b.x += b.vx * dt; b.z += b.vz * dt;
  const dx = h.cup[0] - b.x, dz = h.cup[1] - b.z, dc = Math.hypot(dx, dz); if (dc < .3 && sp < 6.5) { b.sunk = b.done = true; return; } if (dc < .48 && dc > 1e-4) { const g = 5 * dt / dc; b.vx += dx * g; b.vz += dz * g; }
  const rad = PUTT.R + PUTT.T; let hit = 0; for (const s of h.segs) hit = Math.max(hit, hitSeg(b, s[0], s[1], s[2], s[3], rad, .72));
  for (const m of h.mill) if (millShut(m, t)) hit = Math.max(hit, hitSeg(b, m[0] - m[2], m[1], m[0] + m[2], m[1], rad + .05, .6));
  for (const s of h.spin) { const e = spinEnds(s, t); if (hitSeg(b, e[0], e[1], e[2], e[3], PUTT.R + .14, .8)) { b.vx += b.nx * 1.6; b.vz += b.nz * 1.6; hit = 3; } }
  for (const s of h.slide) { const e = slidePos(s, t); if (hitSeg(b, e[0], e[1], e[2], e[3], PUTT.R + .24, .7)) { b.vx += b.nx * .8; b.vz += b.nz * .8; hit = Math.max(hit, 2); } }
  h.bumps.forEach((c, i) => { const nx = b.x - c[0], nz = b.z - c[1], d = Math.hypot(nx, nz), rr = c[2] + PUTT.R; if (d < rr && d > 1e-5) { const ux = nx / d, uz = nz / d; b.x = c[0] + ux * rr; b.z = c[1] + uz * rr; const vn = b.vx * ux + b.vz * uz; if (vn < 0) { const out = Math.min(-vn * .9 + 2.2, 9); b.vx += (out - vn) * ux; b.vz += (out - vn) * uz; fx && fx('bump', i); } } });
  if (hit > 1.2 && fx) fx('wall', hit);
  for (const w of h.water) if (inRect(b, w)) { b.wet = b.done = true; return; }
  for (const p of h.pipe) if (Math.hypot(b.x - p[0], b.z - p[1]) < .5) { b.pipe = { t: .9, x: p[2], z: p[3], vx: p[4], vz: p[5] }; fx && fx('in'); return; }
  if (!h.polys.some(P => inPoly(P, b.x, b.z))) { b.oob = b.done = true; return; }
  if (sp < .07 && !sl) { b.vx = b.vz = 0; b.done = true; }
}
function segX(ax, az, bx, bz, cx, cz, dx, dz) { const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (Math.abs(d) < 1e-9) return false; const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d; return t > .001 && t < .999 && u > 0 && u < 1; }
function clearLine(h, x, z, tx, tz) { for (const s of h.segs) if (segX(x, z, tx, tz, s[0], s[1], s[2], s[3])) return false; for (const w of h.water) for (const e of [[w[0], w[1], w[2], w[1]], [w[2], w[1], w[2], w[3]], [w[2], w[3], w[0], w[3]], [w[0], w[3], w[0], w[1]]]) if (segX(x, z, tx, tz, e[0], e[1], e[2], e[3])) return false; return true; }
function aimFor(h, x, z) { const pts = h.way.concat([h.cup]); for (let i = pts.length - 1; i >= 0; i--) if (clearLine(h, x, z, pts[i][0], pts[i][1])) return Math.atan2(pts[i][0] - x, -(pts[i][1] - z)); return Math.atan2(h.cup[0] - x, -(h.cup[1] - z)); }
function remain(h, x, z) { const pts = h.way.concat([h.cup]); for (let i = pts.length - 1; i >= 0; i--) if (clearLine(h, x, z, pts[i][0], pts[i][1])) { let d = Math.hypot(pts[i][0] - x, pts[i][1] - z); for (let j = i + 1; j < pts.length; j++)d += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); return d; } return 60 + Math.hypot(h.cup[0] - x, h.cup[1] - z); }
function feltTex(c1, c2) { const t = ctex(256, 256, (g, w) => { g.fillStyle = hex(c1); g.fillRect(0, 0, w, w); for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() < .5 ? hex(c2) : 'rgba(255,255,255,.05)'; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); } }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(.5, .5); return t; }
function buildHole(grp, h, th) {
  const dyn = { spin: [], slide: [], mill: [], bump: [] }, feltM = new T.MeshStandardMaterial({ map: feltTex(th.felt[0], th.felt[1]), roughness: th.rough || .95, metalness: th.metal || 0, side: T.DoubleSide });
  for (const P of h.polys) { const m = new T.Mesh(new T.ShapeGeometry(new T.Shape(P.map(p => new T.Vector2(p[0], -p[1])))).rotateX(-PI / 2), feltM); m.receiveShadow = true; grp.add(m); }
  const flat = (x1, z1, x2, z2, m, y) => { const o = M(gBox(), m, (x1 + x2) / 2, y, (z1 + z2) / 2, x2 - x1, .02, z2 - z1, grp); o.castShadow = false; return o; };
  h.sand.forEach(s => flat(s[0], s[1], s[2], s[3], mat(0xf0deaa, { roughness: 1 }), .012));
  h.water.forEach(s => flat(s[0], s[1], s[2], s[3], new T.MeshStandardMaterial({ color: C(th.water || 0x1b9fd8), roughness: .08, metalness: .4 }), .014));
  h.slope.forEach(s => { const l = Math.hypot(s[4], s[5]), t = ctex(64, 64, (g, w) => { g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath(); g.moveTo(10, 22); g.lineTo(32, 44); g.lineTo(54, 22); g.stroke(); }, [(s[2] - s[0]) / 1.1, (s[3] - s[1]) / 1.1]); const o = flat(s[0], s[1], s[2], s[3], new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: new T.Color(E.hdr ? 1.3 : 1, E.hdr ? 1.3 : 1, E.hdr ? 1.3 : 1) }), .016); if (s[5] / l < 0) { t.rotation = PI; t.center.set(.5, .5); } dyn.slopeTex = dyn.slopeTex || []; dyn.slopeTex.push([t, s[5] > 0 ? -1 : 1]); });
  const posts = new Set(), H = .36, wall = (ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz), ry = -Math.atan2(dz, dx), w = M(gBox(), th.wall, (ax + bx) / 2, H / 2 - .08, (az + bz) / 2, L, H + .16, PUTT.T * 2, grp); w.rotation.y = ry; const c = M(gBox(), th.cap, (ax + bx) / 2, H + .03, (az + bz) / 2, L, .07, PUTT.T * 2 + .08, grp); c.rotation.y = ry; c.castShadow = false; for (const p of [[ax, az], [bx, bz]]) { const k = p[0].toFixed(2) + ',' + p[1].toFixed(2); if (!posts.has(k)) { posts.add(k); M(gCyl(14), th.post, p[0], H / 2, p[1], PUTT.T + .035, H + .14, PUTT.T + .035, grp); } } };
  h.segs.forEach(s => wall(s[0], s[1], s[2], s[3]));
  const cx = h.cup[0], cz = h.cup[1]; M(gDisc(), mat(0x050505), cx, .013, cz, .3, 1, .3, grp).castShadow = false; M(gTor(.07), mat(0xffffff, { roughness: .3 }), cx, .02, cz, .31, .31, .5, grp).rotation.x = PI / 2;
  M(gCyl(8), mat(0xf4f0e6), cx, 1.2, cz, .03, 2.4, .03, grp); const fg = M(geo('pen', () => new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, -.9, 0, 2.2, -.45, 0], 3)).setAttribute('normal', new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))), th.flag, cx, 2.4, cz, .45, .6, .45, grp); dyn.flag = fg;
  M(gDisc(), th.tee, 0, .011, 0, .26, 1, .26, grp).castShadow = false;
  h.bumps.forEach(c => { const g = new T.Group(); g.position.set(c[0], 0, c[1]); grp.add(g); M(gCyl(24), th.bump, 0, .28, 0, c[2], .56, c[2], g); M(gCyl(24), th.bumpTop, 0, .58, 0, c[2] * .8, .06, c[2] * .8, g).castShadow = false; M(gTor(.09), th.cap, 0, .3, 0, c[2] + .02, c[2] + .02, .8, g).rotation.x = PI / 2; dyn.bump.push({ g, t: 0 }); });
  h.spin.forEach(s => { const g = new T.Group(); g.position.set(s[0], 0, s[1]); grp.add(g); M(gBox(), th.mover, 0, .22, 0, s[2], .3, .26, g); M(gBox(), th.cap, 0, .39, 0, s[2], .05, .3, g).castShadow = false; M(gCyl(16), th.post, 0, .3, 0, .3, .6, .3, g); M(gSph(), th.bumpTop, 0, .62, 0, .2, .2, .2, g); dyn.spin.push({ g, s }); });
  h.slide.forEach(s => { const g = new T.Group(); grp.add(g); g.rotation.y = -Math.atan2(s[3] - s[1], s[2] - s[0]); M(gBox(), th.mover, 0, .24, 0, s[4], .48, .46, g); M(gBox(), th.cap, 0, .5, 0, s[4], .05, .5, g).castShadow = false; dyn.slide.push({ g, s }); });
  h.mill.forEach(m => { const g = new T.Group(); g.position.set(m[0], 0, m[1]); grp.add(g); const w = mat(0xf4efe4), rf = mat(0xb5402e), wd = mat(0x6b4526); for (const s of [-1, 1]) M(gBox(), w, s * (m[2] + .45), .9, 0, .9, 1.8, 1.1, g); M(geo('taper', () => new T.CylinderGeometry(.62, 1, 1, 8)), w, 0, 3, 0, 1.55, 2.6, 1.3, g); M(gCone(8), rf, 0, 4.9, 0, 1.25, 1.3, 1.25, g); const bl = new T.Group(); bl.position.set(0, 2.75, .78); g.add(bl); M(gCyl(10), wd, 0, 0, -.2, .16, .6, .16, bl).rotation.x = PI / 2; for (let i = 0; i < 4; i++) { const b = new T.Group(); b.rotation.z = i * PI / 2; bl.add(b); M(gBox(), wd, 0, -1.3, 0, .1, 2.6, .08, b); M(gBox(), mat(0xfaf4e6, { side: T.DoubleSide }), .32, -1.55, .02, .56, 2.05, .04, b); } const ms = []; g.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; ms.push(o); } }); dyn.mill.push({ bl, m, ms, op: 1 }); });
  h.pipe.forEach(p => { M(gDisc(), mat(0x050505), p[0], .013, p[1], .5, 1, .5, grp).castShadow = false; M(gTor(.1), th.pipe, p[0], .05, p[1], .52, .52, .9, grp).rotation.x = PI / 2; const a = M(gTor(.1), th.pipe, p[0], .55, p[1] - .15, .62, .62, 1, grp); a.castShadow = false; const l = Math.hypot(p[4], p[5]), t = M(gCyl(16), th.mover, p[2] - p[4] / l * .7, .3, p[3] - p[5] / l * .7, .34, 1.2, .34, grp); t.rotation.z = PI / 2; t.rotation.y = -Math.atan2(p[5], p[4]); M(gTor(.1), th.pipe, p[2], .3, p[3], .36, .36, .8, grp).rotation.y = -Math.atan2(p[5], p[4]) + PI / 2; });
  return dyn;
}
function miniGame(id, name, tag, envFn, thFn, thumb) {
  GAMES.push({
    id, group: 'minigolf', name, tag, unit: 'strokes', lower: true, putt: true, spt: 0, rounds: [3, 6], lenNames: ['3 holes', '6 holes'],
    how: ['Putt or chip the ball. Only speed and direction count, so any club works.', 'Use the Aim arrows, or the left and right keys, to line up bank shots. The bar shows the distance to the hole and a speed to try.', 'Each player plays the hole out. Water costs a stroke, and six strokes is the most you can take before picking up for 7.'],
    cam: { p: [0, 3.4, 6.5], l: [0, .3, -5] }, thumb,
    create(ctx) {
      envFn(ctx); const th = thFn(), defs = HOLES[id.slice(5)], grp = new T.Group(); ctx.root.add(grp); Ball.minS = PUTT.R;
      let h = null, hi = -1, dyn = null, clock = 0, pos = { x: 0, z: 0 }, prev = pos, aim = 0, strokes = 0, b = null, over = false, bt = 0, d0 = [0, -1], snd = 0, start = pos;
      const line = new T.Mesh(new T.PlaneGeometry(.16, 6).rotateX(-PI / 2).translate(0, 0, -3.3), new T.MeshBasicMaterial({ map: ctex(8, 64, g => { g.clearRect(0, 0, 8, 64); g.fillStyle = '#fff'; g.fillRect(0, 0, 8, 38); }, [1, 9]), transparent: true, depthWrite: false, toneMapped: false, color: new T.Color(1.6, 1.6, 1.6) })); line.renderOrder = 4; ctx.root.add(line);
      const tip = M(gCone(3), glowMat(0xffffff, { k: 1.6 }), 0, 0, -6.6, .34, .7, .05, line); tip.rotation.x = -PI / 2; tip.castShadow = false;
      const blocks = (mx, mz, tx, tz) => { const cx = Cam.p.x, cz = Cam.p.z, dx = tx - cx, dz = tz - cz, l2 = dx * dx + dz * dz; if (l2 < 1) return false; const t = ((mx - cx) * dx + (mz - cz) * dz) / l2; return t > .05 && t < 1.2 && Math.hypot(cx + dx * t - mx, cz + dz * t - mz) < 2.8; };
      const build = i => { grp.traverse(o => { if (o.geometry && o.geometry.type === 'ShapeGeometry') o.geometry.dispose(); }); while (grp.children.length) grp.remove(grp.children[0]); h = mkHole(defs[i % defs.length]); dyn = buildHole(grp, h, th); hi = i; };
      const cam = () => { const sx = Math.sin(aim), cz = -Math.cos(aim); Cam.mode = 'free'; Cam.fp.set(pos.x - sx * 7, 4.9, pos.z - cz * 7); Cam.fl.set(pos.x + sx * 4.5, .2, pos.z + cz * 4.5); line.position.set(pos.x, .04, pos.z); line.rotation.y = -aim; line.visible = true; };
      const info = () => { const pts = h.way.concat([h.cup]); let i = pts.length - 1; while (i > 0 && !clearLine(h, pos.x, pos.z, pts[i][0], pts[i][1])) i--; const d = Math.hypot(pts[i][0] - pos.x, pts[i][1] - pos.z), mph = Math.sqrt(2 * PUTT.a * d) / .44704 / (Store.d.putt || 1); $('aimTxt').textContent = Math.round(d * 3.281) + (i === pts.length - 1 ? ' ft to the hole' : ' ft to the turn') + ' · try about ' + Math.max(2, Math.round(mph * 1.1)) + ' mph'; };
      const fx = (k, v) => { if (k === 'bump') { const o = dyn.bump[v]; o.t = .3; FX.stars(new V3(o.g.position.x, .6, o.g.position.z), 10); Snd.ding(v % 4); } else if (k === 'wall') { if (snd <= 0) { Snd.thud(); snd = .12; } } else Snd.pop(); };
      return {
        beginTurn(pl, round) { if (round !== hi) build(round); pos = { x: 0, z: 0 }; strokes = 0; over = false; },
        beginShot() { Ball.on = true; Ball.m.visible = true; Ball.tm.visible = false; Ball.tr = []; Ball.state = 'idle'; Ball.p.set(pos.x, 0, pos.z); aim = aimFor(h, pos.x, pos.z); cam(); info(); },
        aim(d) { aim += d; cam(); },
        onLaunch(B, s) { const sp = clamp(s.speed * .44704 * Math.cos(s.vla * PI / 180) * (Store.d.putt || 1), .6, PUTT.maxV), a = aim + s.hla * PI / 180; b = { x: pos.x, z: pos.z, vx: Math.sin(a) * sp, vz: -Math.cos(a) * sp }; prev = start = { x: pos.x, z: pos.z }; d0 = [Math.sin(aim), -Math.cos(aim)]; B.state = 'custom'; B.p.set(pos.x, 0, pos.z); B.tm.visible = true; line.visible = false; strokes++; bt = 0; Cam.mode = 'free'; },
        step(B, dt) { clock += dt; bt += dt; snd -= dt; puttStep(h, b, clock, dt, fx); B.p.set(b.x, 0, b.z); B.m.visible = !b.pipe && !b.sunk; if (b.pipe) B.tr = []; else { Cam.fp.set(b.x - d0[0] * 7, 5.4, b.z - d0[1] * 7); Cam.fl.set(b.x + d0[0] * 2, .2, b.z + d0[1] * 2); } if (b.done || bt > 25) B.state = 'done'; },
        update(dt) { if (Shot.phase !== 'air') clock += dt; for (const o of dyn.spin) o.g.rotation.y = -spinEnds(o.s, clock)[4]; for (const o of dyn.slide) { const e = slidePos(o.s, clock); o.g.position.set(e[4], 0, e[5]); } for (const o of dyn.mill) { o.bl.rotation.z = millAng(o.m, clock); const hide = blocks(o.m[0], o.m[1], Ball.p.x, Ball.p.z) || blocks(o.m[0], o.m[1], h.cup[0], h.cup[1]), op = lerp(o.op, hide ? .16 : 1, 1 - Math.exp(-dt * 8)); if (Math.abs(op - o.op) > .002) { o.op = op; for (const ms of o.ms) { ms.material.opacity = op; ms.material.depthWrite = op > .9; ms.castShadow = op > .5; } } } for (const o of dyn.bump) { o.t = Math.max(0, o.t - dt); o.g.scale.setScalar(1 + o.t * .8); } if (dyn.slopeTex) for (const s of dyn.slopeTex) s[0].offset.y += dt * .5 * s[1]; if (dyn.flag) dyn.flag.rotation.y = Math.sin(clock * 2) * .3; },
        result(B) {
          B.rolled = Math.hypot(b.x - start.x, b.z - start.z); const cp = new V3(h.cup[0], 1, h.cup[1]);
          if (b.sunk) { over = true; const d = strokes - h.par; FX.confetti(cp, strokes === 1 ? 220 : 110, strokes === 1 ? 1.3 : 1); FX.stars(cp, 40); Snd.cup(); if (d <= 0) Snd.cheer(); else Snd.claps(12, 1, .2); Cam.cutTo([h.cup[0] - d0[0] * 5 + 2, 3.2, h.cup[1] - d0[1] * 5], [h.cup[0], .4, h.cup[1]], 2.2); return { pts: 1, text: strokes === 1 ? 'HOLE IN ONE!' : d <= -2 ? 'EAGLE!' : d === -1 ? 'BIRDIE!' : d === 0 ? 'PAR' : d === 1 ? 'Bogey' : 'In the hole', sub: strokes + (strokes > 1 ? ' strokes' : ' stroke') + ' · par ' + h.par, tone: d <= 0 ? 'great' : 'good', hold: 2.4 }; }
          let pen = 0, text, sub;
          if (b.wet) { pen = 1; pos = prev; text = 'SPLASH'; sub = '1 stroke penalty'; B.wet = true; FX.splash(new V3(b.x, 0, b.z)); } else if (b.oob) { pos = prev; text = 'Out of bounds'; sub = 'Replay from the same spot'; } else { pos = { x: b.x, z: b.z }; const ft = Math.hypot(h.cup[0] - b.x, h.cup[1] - b.z) * 3.281; text = ft < 3 ? 'So close!' : pick(['Keep going', 'Rolling', 'Line it up']); sub = Math.round(ft) + ' ft to go'; }
          strokes += pen; if (strokes >= 6) { over = true; pen++; text = 'Pick it up'; sub = 'Most you can take is 7'; }
          return { pts: 1 + pen, text, sub, tone: 'soft', hold: 1.3 };
        },
        turnOver() { return over; }, shotLabel() { return 'Par ' + h.par + ' · stroke ' + (strokes + 1); }, roundLabel() { return h.n; }
      };
    }
  });
}
miniGame('mini-pirate', 'Pirate Cove', 'Six holes of barrels, bridges and a skull cave', envPirate, () => ({ felt: [0x3fae5a, 0x389f50], wall: mat(0x8a5a2e, { roughness: .8 }), cap: mat(0xc49a5a, { roughness: .6 }), post: mat(0x5e3b1c), bump: mat(0xc8392b, { roughness: .45, metalness: .2 }), bumpTop: mat(0xffc93c, { metalness: .8, roughness: .25 }), mover: mat(0x6b4526, { roughness: .7 }), flag: mat(0x14121a, { side: T.DoubleSide }), tee: mat(0xf4e6b8), pipe: mat(0xbdb7a8, { roughness: .9 }), water: 0x16a8d8 }), { p: [8, 6, 5], l: [0, 0, -7] });
miniGame('mini-meadow', 'Windmill Meadows', 'Six classic holes: a windmill, a hill and a duck pond', envMeadow, () => ({ felt: [0x4fb655, 0x47a94d], wall: mat(0xf4f0e6, { roughness: .6 }), cap: mat(0xd6304a, { roughness: .4 }), post: mat(0xf4f0e6), bump: mat(0xe2bd58, { roughness: 1 }), bumpTop: mat(0xd6304a), mover: mat(0xb5352a, { roughness: .7 }), flag: mat(0xffc93c, { side: T.DoubleSide }), tee: mat(0xffffff), pipe: mat(0x6b4526), water: 0x2a8fd8 }), { p: [8, 6, 5], l: [0, 1, -8] });
miniGame('mini-neon', 'Neon Nights', 'Six glowing pinball-style holes under a city skyline', envNeon, () => ({ felt: [0x1b1650, 0x241c66], rough: .45, metal: .3, wall: mat(0x100c26, { roughness: .3, metalness: .7 }), cap: glowMat(0x29e0ff, { k: 1.7 }), post: glowMat(0xff3d9a, { k: 1.8 }), bump: mat(0x1a1440, { roughness: .2, metalness: .8 }), bumpTop: glowMat(0xff3d9a, { k: 2.4 }), mover: mat(0x1a1440, { roughness: .2, metalness: .8 }), flag: glowMat(0xffd24a, { k: 3, side: T.DoubleSide }), tee: glowMat(0xffffff, { k: 1.5 }), pipe: glowMat(0x9a6bff, { k: 4 }), water: 0x29e0ff }), { p: [8, 6, 5], l: [0, 1, -8] });
