/* ============ environments and set pieces ============ */
const gPyr = () => geo('pyr', () => new T.ConeGeometry(.7071, 1, 4).rotateY(PI / 4));
function groundPlane(ctx, tex, y = 0, size = 3000) { const m = new T.Mesh(new T.PlaneGeometry(size, size).rotateX(-PI / 2), new T.MeshStandardMaterial({ map: tex, roughness: .95 })); m.position.y = y; m.receiveShadow = true; ctx.root.add(m); return m; }
function hillsRing(ctx, o) { const r = ctx.rng, m = mat(0xffffff, { roughness: 1 }); for (let i = 0; i < o.n; i++) { const a = i / o.n * PI * 2 + r() * .2, d = lerp(o.r[0], o.r[1], r()), w = lerp(o.w[0], o.w[1], r()), h = lerp(o.h[0], o.h[1], r()); ctx.far.put(gIco(3), m, Math.sin(a) * d, -h * .25, Math.cos(a) * d, w, h, w * lerp(.8, 1.3, r()), r() * 6, C(o.cols[i % o.cols.length])); } }
function mountains(ctx, o) { const r = ctx.rng, m = mat(0xffffff, { flatShading: true, roughness: 1 }), sn = mat(0xf4f8ff, { flatShading: true, roughness: .9 }); for (let i = 0; i < o.n; i++) { const a = i / o.n * PI * 2 + r() * .25, d = lerp(o.r[0], o.r[1], r()), h = lerp(o.h[0], o.h[1], r()), w = h * lerp(.9, 1.5, r()), x = Math.sin(a) * d, z = Math.cos(a) * d, ry = r() * 6; ctx.far.put(gCone(7), m, x, h / 2 - 4, z, w, h, w, ry, C(o.cols[i % o.cols.length])); if (o.snow && h > o.snow) ctx.far.put(gCone(7), sn, x, h - h * .14 - 4 + .5, z, w * .29, h * .28, w * .29, ry); } }
function clouds(ctx, n, tint = 0xffffff, y = [140, 260]) { const r = ctx.rng, m = mat(0xffffff, { roughness: 1, emissive: tint, emissiveIntensity: .45, fog: false }); for (let i = 0; i < n; i++) { const a = r() * PI * 2, d = lerp(350, 1300, r()), cx = Math.sin(a) * d, cz = Math.cos(a) * d, cy = lerp(y[0], y[1], r()), s = lerp(18, 46, r()); for (let k = 0; k < 6; k++)ctx.far.put(gIco(2), m, cx + (k - 2.5) * s * .75 + r() * s * .3, cy + r() * s * .25, cz + r() * s * .5, s * lerp(.7, 1.2, r()), s * lerp(.42, .62, r()), s * lerp(.7, 1, r())); } }
function treeRound(b, x, z, s, r, cols) { b.put(gCyl(7), mat(0x7a4a2b), x, 1.5 * s, z, .34 * s, 3 * s, .34 * s); const m = mat(0xffffff, { flatShading: true }), c = C(cols[r() * cols.length | 0]); b.put(gIco(1), m, x, 4.5 * s, z, 2.5 * s, 2.3 * s, 2.5 * s, r() * 6, c); b.put(gIco(1), m, x + 1.4 * s, 3.5 * s, z + .5 * s, 1.6 * s, 1.5 * s, 1.6 * s, r() * 6, c.clone().multiplyScalar(.82)); b.put(gIco(1), m, x - 1.3 * s, 3.7 * s, z - .6 * s, 1.7 * s, 1.5 * s, 1.7 * s, r() * 6, c.clone().multiplyScalar(.9)); }
function treePine(b, x, z, s, r, cols) { b.put(gCyl(7), mat(0x5c3b24), x, 1 * s, z, .3 * s, 2 * s, .3 * s); const m = mat(0xffffff, { flatShading: true }), c = C(cols[r() * cols.length | 0]); for (let i = 0; i < 3; i++)b.put(gCone(8), m, x, (2.6 + i * 1.9) * s, z, (2.3 - i * .55) * s, 3.2 * s, (2.3 - i * .55) * s, r() * 6, c.clone().multiplyScalar(1 - i * .0 + i * .06)); }
function scatter(ctx, n, fn, ok, box = [-300, 300, -420, 40]) { const r = ctx.rng; let k = 0, g = 0; while (k < n && g++ < n * 30) { const x = lerp(box[0], box[1], r()), z = lerp(box[2], box[3], r()); if (!ok(x, z)) continue; fn(ctx.near, x, z, lerp(.9, 1.7, r()), r); k++; } }
function waterPlane(ctx, y = -.5, col = 0x1b7fd6, size = 3200) {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N), ws = []; const r = srand(5);
  for (let i = 0; i < 9; i++)ws.push([1 + (r() * 5 | 0), 1 + (r() * 5 | 0), r() * 6, .5 + r()]);
  for (let yy = 0; yy < N; yy++)for (let xx = 0; xx < N; xx++) { let dx = 0, dy = 0; for (const w of ws) { const ph = 2 * PI * (w[0] * xx + w[1] * yy) / N + w[2], cc = Math.cos(ph) * w[3]; dx += cc * w[0]; dy += cc * w[1]; } const nx = -dx * .09, ny = -dy * .09, l = Math.hypot(nx, ny, 1), i = (yy * N + xx) * 4; im.data[i] = (nx / l * .5 + .5) * 255; im.data[i + 1] = (ny / l * .5 + .5) * 255; im.data[i + 2] = (1 / l * .5 + .5) * 255; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(size / 15, size / 15);
  const m = new T.Mesh(new T.PlaneGeometry(size, size).rotateX(-PI / 2), new T.MeshStandardMaterial({ color: C(col).multiplyScalar(.55), roughness: .1, metalness: .35, normalMap: t, normalScale: new T.Vector2(.5, .5), envMapIntensity: .9 })); m.position.y = y; m.receiveShadow = true; ctx.root.add(m);
  ctx.ticks.push(dt => { t.offset.x += dt * .012; t.offset.y += dt * .02; }); return m;
}
/* --- carnival props --- */
function tent(ctx, x, z, r, h, c1, c2) {
  const g = new T.Group(); g.position.set(x, 0, z); ctx.root.add(g);
  M(geo('cylo', () => new T.CylinderGeometry(1, 1, 1, 28, 1, true)), new T.MeshStandardMaterial({ map: stripeTex(c1, c2, 16), roughness: .9, side: T.DoubleSide }), 0, h / 2, 0, r, h, r, g);
  M(gCone(28), new T.MeshStandardMaterial({ map: stripeTex(c1, c2, 16), roughness: .85 }), 0, h + h * .42, 0, r * 1.2, h * .84, r * 1.2, g);
  M(gTor(.09), mat(c1), 0, h, 0, r * 1.2, r * 1.2, 1.6, g).rotation.x = PI / 2;
  M(gCyl(8), mat(0xf4f0e0), 0, h * 1.84 + 1, 0, .1, 2.4, .1, g); M(gSph(), mat(0xffc93c, { metalness: .5, roughness: .3 }), 0, h * 1.84 + 2.3, 0, .3, .3, .3, g);
  const f = M(geo('pen', () => new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, -.9, 0, 2.2, -.45, 0], 3)).setAttribute('normal', new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))), mat(c1, { side: T.DoubleSide }), 0, h * 1.84 + 2, 0, 1, 1, 1, g);
  ctx.ticks.push((dt, t) => { f.rotation.y = Math.sin(t * 2 + x) * .5 + .6; });
  M(gBox(), mat(0x2a1a3a), 0, h * .36, r * .99, r * .5, h * .72, .3, g);
  return g;
}
function bunting(ctx, a, b, sag, n, cols) {
  const tri = geo('tri', () => new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([-.5, 0, 0, .5, 0, 0, 0, -1.1, 0], 3)).setAttribute('normal', new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)));
  const m = mat(0xffffff, { side: T.DoubleSide, roughness: .7 }), d = new V3().subVectors(b, a), ry = Math.atan2(-d.z, d.x), pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, p = new V3().lerpVectors(a, b, t); p.y -= sag * 4 * t * (1 - t); pts.push(p); if (i < n) { const t2 = (i + .5) / n, q = new V3().lerpVectors(a, b, t2); q.y -= sag * 4 * t2 * (1 - t2); const s = d.length() / n * .78; ctx.near.put(tri, m, q.x, q.y, q.z, s, s, s, ry, C(cols[i % cols.length])); } }
  ctx.root.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0x3a2a20 })));
}
function lightString(ctx, a, b, sag, n, cols) { for (let i = 0; i <= n; i++) { const t = i / n, p = new V3().lerpVectors(a, b, t); p.y -= sag * 4 * t * (1 - t); ctx.far.put(gIco(1), glowMat(0xffffff), p.x, p.y, p.z, .22, .22, .22, 0, C(cols[i % cols.length])); } }
function balloon(ctx, x, y, z, col, s = 1, str = 4) {
  const g = new T.Group(); g.position.set(x, y, z); ctx.root.add(g); M(gSph(), mat(col, { roughness: .22, metalness: .05 }), 0, 0, 0, s, s * 1.22, s, g); M(gCone(8), mat(col), 0, -s * 1.28, 0, s * .14, s * .2, s * .14, g);
  if (str) g.add(new T.Line(new T.BufferGeometry().setFromPoints([new V3(0, -s * 1.3, 0), new V3(.2, -s * 1.3 - str, 0)]), new T.LineBasicMaterial({ color: 0xffffff })));
  const ph = x * 1.7 + z; ctx.ticks.push((dt, t) => { g.position.y = y + Math.sin(t * 1.3 + ph) * .35; g.rotation.z = Math.sin(t * .9 + ph) * .08; }); return g;
}
function hotAir(ctx, x, y, z, s, c1, c2) {
  const g = new T.Group(); g.position.set(x, y, z); ctx.root.add(g); const m = new T.MeshStandardMaterial({ map: stripeTex(c1, c2, 12), roughness: .7, fog: false });
  M(gSph(), m, 0, 0, 0, s, s * 1.12, s, g); const c = M(gCone(24), m, 0, -s * 1.25, 0, s * .82, s * 1.3, s * .82, g); c.rotation.x = PI; M(gBox(), mat(0x8a5a2b), 0, -s * 2.35, 0, s * .34, s * .3, s * .34, g);
  ctx.ticks.push((dt, t) => { g.position.y = y + Math.sin(t * .25 + x) * 4; g.position.x = x + Math.sin(t * .05 + z) * 30; }); return g;
}
function signBoard(ctx, text, x, z, w, ry, o = {}) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.root.add(g); const h = w * .3, top = o.top || h + 5;
  M(gBox(), mat(o.frame || 0xffc93c), 0, top - h / 2, 0, w + .7, h + .7, .4, g); M(gBox(), mat(o.bg || 0xd6304a), 0, top - h / 2, .08, w, h, .4, g);
  const l = label(text, { w: 1024, h: 300, size: h * .9, color: o.color || '#fff6e4', stroke: o.stroke || '#5a0a18' }); l.position.set(0, top - h / 2, .32); g.add(l);
  for (const s of [-1, 1]) M(gCyl(10), mat(o.post || 0xf4f0e0), s * w * .42, (top - h) / 2, 0, .22, top - h, .22, g);
  if (o.bulbs !== false) for (let i = 0; i < 18; i++) { const b = M(gIco(1), glowMat(i % 2 ? 0xffe27a : 0xffffff), lerp(-w / 2, w / 2, i / 17), top + .28, .25, .16, .16, .16, g); b.castShadow = false; }
  return g;
}
function ferrisWheel(ctx, o) {
  const R = o.R, cy = o.cy, n = o.n, g = new T.Group(); g.position.set(o.x, 0, o.z); if (o.ry) g.rotation.y = o.ry; ctx.root.add(g);
  const wh = new T.Group(); wh.position.y = cy; g.add(wh); const steel = mat(0xf2f4ff, { metalness: .35, roughness: .4 }), col = mat(o.col || 0xff5d73, { metalness: .2, roughness: .45 });
  for (const dz of [-1.7, 1.7]) { M(gTor(.016), col, 0, 0, dz, R, R, R, wh); M(gTor(.02), steel, 0, 0, dz, R * .58, R * .58, R * .58, wh); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * PI * 2; rod(new V3(0, 0, dz), new V3(Math.cos(a) * R, Math.sin(a) * R, dz), .11, steel, wh); } }
  for (let i = 0; i < n; i++) { const a = i / n * PI * 2; rod(new V3(Math.cos(a) * R, Math.sin(a) * R, -1.7), new V3(Math.cos(a) * R, Math.sin(a) * R, 1.7), .14, steel, wh); }
  const hub = M(gCyl(24), mat(0xffc93c, { metalness: .5, roughness: .3 }), 0, 0, 0, 1.7, 4.6, 1.7, wh); hub.rotation.x = PI / 2;
  const st = M(gCyl(5), mat(0xd6304a), 0, 0, 2.35, 1.1, .2, 1.1, wh); st.rotation.x = PI / 2;
  const nb = 44; for (let i = 0; i < nb; i++) { const a = i / nb * PI * 2, b = M(gIco(1), glowMat([0xffe27a, 0xff8fa0, 0x8fe8ff][i % 3]), Math.cos(a) * R, Math.sin(a) * R, 2, .26, .26, .26, wh); b.castShadow = false; }
  const leg = mat(0x3b6fe0, { metalness: .2, roughness: .5 }); for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(new V3(sx * R * .5, 0, sz * 3.4), new V3(0, cy, sz * 2.5), .5, leg, g);
  M(gBox(), mat(0x6b5a8c), 0, .3, 0, R * 1.3, .6, 9, g);
  const cars = [], cols = o.cols || [0xff5d73, 0x3fa7ff, 0xffc93c, 0x44d68a, 0xb98bff];
  for (let i = 0; i < n; i++) {
    const c = new T.Group(); g.add(c); const cm = new T.MeshStandardMaterial({ color: C(cols[i % cols.length]), roughness: .4, metalness: .1, emissive: C(cols[i % cols.length]), emissiveIntensity: 0 });
    M(gCyl(20), steel, 0, -.6, 0, .1, 1.2, .1, c); const body = new T.Group(); body.position.y = -2.5; c.add(body);
    M(gCyl(20), cm, 0, -.5, 0, 1.75, 1.3, 1.75, body); M(gSph(), cm, 0, -1.1, 0, 1.75, .55, 1.75, body); const rf = M(gCone(20), cm, 0, 1.55, 0, 1.95, .9, 1.95, body); M(gCyl(20), mat(0xfff6e4), 0, .12, 0, 1.82, .14, 1.82, body);
    for (let k = 0; k < 4; k++)M(gCyl(6), steel, Math.cos(k * PI / 2 + .78) * 1.5, .6, Math.sin(k * PI / 2 + .78) * 1.5, .07, 1.1, .07, body);
    cars.push({ g: c, body, m: cm, i, spin: 0, hit: false });
  }
  const fw = { g, wh, cars, R, cy, n, a: 0, sp: o.sp || .1, pos: new V3(o.x, cy, o.z) };
  ctx.ticks.push((dt, t) => { fw.a += fw.sp * dt; wh.rotation.z = fw.a; for (const c of cars) { const a = fw.a + c.i / n * PI * 2; c.g.position.set(Math.cos(a) * R, cy + Math.sin(a) * R, 0); c.g.rotation.z = Math.sin(t * 1.1 + c.i) * .05; if (c.spin > 0) { c.spin = Math.max(0, c.spin - dt * 1.2); c.body.rotation.y = c.spin * c.spin * 14; } } });
  return fw;
}
function envCarnival(ctx, o = {}) { E.snd = 'carnival';
  atmosphere({ sky: [0x2580f2, 0xbfe6ff, 0xa9d8f4], fog: 0xcbe9ff, fogNear: 200, fogFar: 1700, hemi: [0xe6f5ff, 0x79b858, .9], sun: [0xfff0cf, 1.4, [.45, .8, .42]], exp: 1 });
  groundPlane(ctx, groundTex(0x70d24e, 0x62c744, 3000 / 14));
  hillsRing(ctx, { n: 30, r: [430, 760], w: [120, 220], h: [36, 90], cols: [0x56b848, 0x49a944, 0x6ac853, 0x3f9c48] });
  clouds(ctx, 18);
  const greens = [0x3fae4a, 0x4fc257, 0x2f9a48, 0x6fd060];
  scatter(ctx, 120, (b, x, z, s, r) => treeRound(b, x, z, s, r, greens), (x, z) => Math.abs(x) > 44 + Math.max(0, -z) * .2 || z < -300);
  const TC = [[0xe8344e, 0xfff6e4], [0x2f7fe8, 0xfff6e4], [0xffc93c, 0xe8344e], [0x1fbfae, 0xfff6e4], [0x8a55e0, 0xffe27a], [0xff8a2e, 0xfff6e4]];
  [[-31, -22, 6.5, 6], [33, -34, 7.5, 7], [-43, -66, 9, 8], [47, -80, 9, 8], [-60, -122, 11, 9], [64, -138, 11, 9], [-30, 14, 6, 6], [30, 16, 6, 6]].forEach((t, i) => tent(ctx, t[0], t[1], t[2], t[3], TC[i % 6][0], TC[i % 6][1]));
  const cols = [0xff5d73, 0xffc93c, 0x2ad4c0, 0x3fa7ff, 0xb98bff], pole = new T.MeshStandardMaterial({ map: ctex(8, 32, g => { g.fillStyle = '#e8344e'; g.fillRect(0, 0, 8, 32); g.fillStyle = '#fff6e4'; g.fillRect(0, 0, 8, 16); }, [1, 6]), roughness: .6 });
  const P = [[-19, -8, 13], [19, -8, 13], [-27, -46, 12], [29, -56, 12], [-37, -94, 13], [40, -108, 13]];
  P.forEach(p => { M(gCyl(12), pole, p[0], p[2] / 2, p[1], .28, p[2], .28, ctx.root); M(gSph(), mat(0xffc93c, { metalness: .5, roughness: .3 }), p[0], p[2] + .3, p[1], .5, .5, .5, ctx.root); });
  for (const i of [0, 1]) { bunting(ctx, new V3(P[i][0], P[i][2], P[i][1]), new V3(P[i + 2][0], P[i + 2][2], P[i + 2][1]), 2.5, 22, cols); bunting(ctx, new V3(P[i + 2][0], P[i + 2][2], P[i + 2][1]), new V3(P[i + 4][0], P[i + 4][2], P[i + 4][1]), 2.5, 24, cols); lightString(ctx, new V3(P[i][0], P[i][2] - 1, P[i][1]), new V3(P[i + 2][0], P[i + 2][2] - 1, P[i + 2][1]), 3.4, 22, [0xffe27a, 0xff8fa0, 0x8fe8ff]); }
  P.slice(0, 4).forEach((p, i) => { for (let k = 0; k < 3; k++)balloon(ctx, p[0] + (k - 1) * 1.5 + (p[0] < 0 ? -2 : 2), p[2] * .55 + k * .9, p[1] + k * .4, cols[(i + k) % 5], 1, 4.5); });
  hotAir(ctx, -150, 120, -420, 20, 0xe8344e, 0xffe27a); hotAir(ctx, 190, 150, -520, 22, 0x2f7fe8, 0xfff6e4); hotAir(ctx, 60, 190, -700, 24, 0x8a55e0, 0x2ad4c0);
  if (!o.noWheel) ferrisWheel(ctx, { x: -96, z: -190, cy: 30, R: 25, n: 12, ry: .5, sp: .12 });
  if (o.sign) signBoard(ctx, o.sign, o.signAt ? o.signAt[0] : -27, o.signAt ? o.signAt[1] : -42, 13, o.signAt ? o.signAt[2] : .5);
}
function envCanyon(ctx) { E.snd = 'canyon';
  atmosphere({ sky: [0x2f8ff0, 0xffe6bf, 0xf3c890], fog: 0xf7d9ac, fogNear: 220, fogFar: 1500, hemi: [0xfff1dc, 0xd89a5a, .9], sun: [0xfff0d0, 1.45, [-.5, .75, .35]], exp: 1 });
  groundPlane(ctx, groundTex(0xe6bc78, 0xdfb26c, 3000 / 30, 1));
  const r = ctx.rng, rock = mat(0xffffff, { flatShading: true, roughness: 1 }); const rockV = mat(0xffffff, { flatShading: true, roughness: 1, vertexColors: true });
  const RC = [0xc8643c, 0xb5532f, 0xd47a48, 0xa84a2c];
  for (let i = 0; i < 26; i++) { const side = i % 2 ? 1 : -1, z = lerp(30, -520, r()), x = side * lerp(95, 330, r()), w = lerp(34, 90, r()), h = lerp(26, 80, r()), ry = r() * 6, c = C(RC[i % 4]); ctx.near.put(gMesa(), rockV, x, h / 2 - 2, z, w, h, w * lerp(.6, 1.1, r()), ry, c); ctx.near.put(gMesa(), rockV, x, h + 2, z, w * .86, 8, w * .7, ry + .3, C(0xe09a60)); ctx.near.put(gMesa(), rockV, x, 5, z, w * 1.25, 14, w * 1.1, ry + .7, c.clone().multiplyScalar(.85)); }
  for (let i = 0; i < 9; i++) { const x = lerp(-420, 420, i / 8), h = lerp(70, 150, r()), w = lerp(80, 150, r()); ctx.far.put(gMesa(), rockV, x, h / 2 - 3, -640 - r() * 160, w, h, w * .7, r() * 6, C(RC[i % 4]).multiplyScalar(.9)); }
  clouds(ctx, 10, 0xfff4e0);
  const cg = mat(0x4c9a52, { roughness: .8 });
  scatter(ctx, 46, (b, x, z, s) => { b.put(gCyl(10), cg, x, 2.2 * s, z, .5 * s, 4.4 * s, .5 * s); b.put(gSph(), cg, x, 4.4 * s, z, .5 * s); for (const d of [-1, 1]) { b.put(gCyl(8), cg, x + d * .8 * s, 2.3 * s, z, .34 * s, 1.2 * s, .34 * s, 0, null, 0, PI / 2); b.put(gCyl(8), cg, x + d * 1.25 * s, 3 * s + d * .2 * s, z, .34 * s, 1.5 * s, .34 * s); b.put(gSph(), cg, x + d * 1.25 * s, 3.75 * s + d * .2 * s, z, .34 * s); } }, (x, z) => Math.abs(x) > 34 + Math.max(0, -z) * .12 && Math.abs(x) < 90, [-90, 90, -330, 20]);
  scatter(ctx, 60, (b, x, z, s) => b.put(gIco(1), rock, x, .3 * s, z, 1.6 * s, 1.1 * s, 1.4 * s, r() * 6, C(RC[(x * 7 | 0) & 3])), (x, z) => Math.abs(x) > 30 + Math.max(0, -z) * .1, [-140, 140, -360, 30]);
  // water tower and a boom-town sign
  const wood = mat(0x8a5a33), tw = new T.Group(); tw.position.set(42, 0, -74); ctx.root.add(tw); for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(new V3(sx * 3.4, 0, sz * 3.4), new V3(sx * 2.4, 12, sz * 2.4), .28, wood, tw);
  M(gCyl(18), mat(0xa66a3a), 0, 15, 0, 4, 6, 4, tw); M(gCone(18), mat(0x7a3a2a), 0, 19.4, 0, 4.6, 2.8, 4.6, tw); for (const y of [13.2, 16.6]) M(gTor(.03), mat(0x44403c, { metalness: .6 }), 0, y, 0, 4.05, 4.05, 4.05, tw).rotation.x = PI / 2;
  signBoard(ctx, 'BOOMTOWN', -30, -46, 14, .5, { bg: 0x6b3b1f, frame: 0xc88a3a, post: 0x6b3b1f, color: '#ffe27a', stroke: '#2a1206', bulbs: false });
}
function clubhouse(ctx, x, z, ry, s = 1) {
  const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s); ctx.root.add(g);
  const wall = mat(0xf3ead8), roof = mat(0x39455e, { roughness: .6 }), trim = mat(0xffffff), glass = new T.MeshStandardMaterial({ color: C(0x1b2a44), roughness: .1, metalness: .6, emissive: C(0xffd27a), emissiveIntensity: .55 }), stone = mat(0x9a9388), wood = mat(0x8a5a33);
  M(gBox(), stone, 0, .6, 0, 46, 1.2, 22, g); M(gBox(), wood, 0, 1.25, 15, 46, .2, 10, g);
  const wing = (wx, ww, wh, wd) => { M(gBox(), wall, wx, 1.2 + wh / 2, 0, ww, wh, wd, g); M(gPyr(), roof, wx, 1.2 + wh + wh * .32, 0, ww + 1.6, wh * .64, wd + 1.6, g); M(gBox(), trim, wx, 1.2 + wh, 0, ww + .8, .35, wd + .8, g); for (let i = 0; i < Math.round(ww / 4); i++) { const px = wx - ww / 2 + 2 + i * 4; if (px > wx + ww / 2 - 1) break; M(gBox(), glass, px, 1.2 + wh * .5, wd / 2 + .06, 2.4, wh * .62, .12, g); } };
  wing(0, 18, 9, 16); wing(-15, 14, 6.5, 13); wing(15, 14, 6.5, 13);
  for (let i = 0; i < 6; i++)M(gCyl(12), trim, -12.5 + i * 5, 4.2, 9.5, .32, 6, .32, g); M(gBox(), roof, 0, 7.4, 9.5, 28, .4, 3.4, g);
  M(gBox(), wall, 0, 15.2, 0, 3, 5, 3, g); M(gPyr(), roof, 0, 19, 0, 4, 3, 4, g); M(gCyl(6), trim, 0, 23.5, 0, .08, 6, .08, g);
  for (const u of [[-16, 17], [-6, 18], [6, 18], [16, 17]]) { M(gCyl(6), trim, u[0], 2.5, u[1], .07, 2.6, .07, g); M(gCone(12), mat(u[0] % 12 ? 0xd6304a : 0xfff6e4), u[0], 4.1, u[1], 2, 1, 2, g); M(gCyl(12), wood, u[0], 1.9, u[1], .8, .08, .8, g); }
  return g;
}
function flagPin(ctx, x, z, col = 0xe8344e, h = 3.2) {
  const g = new T.Group(); g.position.set(x, 0, z); ctx.root.add(g); M(gCyl(8), mat(0xfff6e4), 0, h / 2, 0, .05, h, .05, g); M(gDisc(), mat(0x101010), 0, .03, 0, .22, 1, .22, g).castShadow = false;
  const fm = new T.MeshStandardMaterial({ color: C(col), side: T.DoubleSide, roughness: .7 }), f = M(geo('flag', () => new T.PlaneGeometry(1, 1, 8, 1).translate(.5, 0, 0)), fm, 0, h - h * .14, 0, h * .42, h * .26, 1, g);
  const base = f.geometry.attributes.position.array.slice(); const fg = f.geometry = f.geometry.clone();
  ctx.ticks.push((dt, t) => { const a = fg.attributes.position.array; for (let i = 0; i < a.length; i += 3)a[i + 2] = Math.sin(base[i] * 5 - t * 6 + x) * .12 * base[i]; fg.attributes.position.needsUpdate = true; });
  return { g, fm };
}
function sailboat(ctx, x, z, col) { const g = new T.Group(); g.position.set(x, -.4, z); ctx.root.add(g); M(gSph(), mat(0xfff6e4), 0, .2, 0, 1.6, .8, 4.2, g); M(gCyl(6), mat(0x8a5a33), 0, 5, 0, .08, 9, .08, g); const s = M(geo('sail', () => new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, 8, 0, 0, 0, 3.4], 3)).setAttribute('normal', new T.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0], 3))), mat(col, { side: T.DoubleSide }), .1, 1.2, 0, 1, 1, 1, g); const ph = x; g.rotation.y = x; ctx.ticks.push((dt, t) => { g.rotation.z = Math.sin(t * .8 + ph) * .06; g.position.y = -.4 + Math.sin(t * 1.1 + ph) * .12; g.position.x += dt * .5 * Math.sign(Math.sin(ph)); }); }
const PINES = [0x1f6b3f, 0x2a7d48, 0x1a5a3a, 0x358a4e];
function envLake(ctx, o = {}) { E.snd = 'lake';
  atmosphere({ sky: [0x1565d8, 0xcfe9ff, 0x9fcdf2], fog: 0xcfe6fb, fogNear: 260, fogFar: 2000, hemi: [0xe8f4ff, 0x4a7a5a, .85], sun: [0xfff2d6, 1.5, [-.45, .7, -.5]], exp: 1 });
  waterPlane(ctx, -.5, 0x1b78cf);
  const shore = new T.Mesh(new T.RingGeometry(o.shore || 290, 1600, 72).rotateX(-PI / 2), new T.MeshStandardMaterial({ map: groundTex(0x4fae52, 0x49a64c, 120, 1), roughness: 1 })); shore.receiveShadow = true; ctx.root.add(shore);
  const sand = new T.Mesh(new T.RingGeometry((o.shore || 290) - 8, (o.shore || 290) + 1, 72).rotateX(-PI / 2), mat(0xe9d9a8)); sand.position.y = -.2; ctx.root.add(sand);
  mountains(ctx, { n: 26, r: [900, 1250], h: [170, 380], cols: [0x5f7896, 0x6c86a4, 0x55708e, 0x7890ab], snow: 230 });
  hillsRing(ctx, { n: 22, r: [520, 760], w: [130, 240], h: [40, 100], cols: [0x2f7d48, 0x3a8c4f, 0x2a7042] });
  clouds(ctx, 16);
  const sh = o.shore || 290; scatter(ctx, 210, (b, x, z, s, r) => treePine(b, x, z, s * 1.5, r, PINES), (x, z) => { const d = Math.hypot(x, z); return d > sh + 6 && d < sh + 190 && !(Math.hypot(x - 150, z + 255) < 60); }, [-480, 480, -480, 480]);
  clubhouse(ctx, 150, -262, -.62, 1.5);
  sailboat(ctx, -120, -150, 0xe8344e); sailboat(ctx, 100, -90, 0xfff6e4); sailboat(ctx, -60, -230, 0xffc93c);
  // tee deck
  const wood = new T.MeshStandardMaterial({ map: ctex(256, 256, (g, w, h) => { g.fillStyle = '#a8763f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(0,0,0,${.06 + (i % 3) * .05})`; g.fillRect(i * 32, 0, 2, h); g.fillStyle = `rgba(255,255,255,${.03 * (i % 2)})`; g.fillRect(i * 32 + 2, 0, 30, h); } speckle(g, w, h, 900, .05); }, [6, 6]), roughness: .8 });
  M(gCyl(40), wood, 0, -.6, 5, 15, 1.2, 15, ctx.root); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; M(gCyl(8), mat(0x6b4526), Math.sin(a) * 14.4, -.4, 5 + Math.cos(a) * 14.4, .4, 2.4, .4, ctx.root); }
  M(gBox(), mat(0x2f9a48), 0, .04, 0, 3, .06, 4, ctx.root);
}
function envCourse(ctx) { E.snd = 'lake';
  atmosphere({ sky: [0x1a6ee0, 0xd6ecff, 0xa9d2f2], fog: 0xd3e8fb, fogNear: 240, fogFar: 1900, hemi: [0xe8f4ff, 0x5a9a55, .9], sun: [0xfff2d6, 1.5, [.5, .72, .3]], exp: 1 });
  groundPlane(ctx, groundTex(0x58b44e, 0x4fa946, 3000 / 16));
  mountains(ctx, { n: 26, r: [900, 1250], h: [170, 380], cols: [0x5f7896, 0x6c86a4, 0x55708e, 0x7890ab], snow: 230 });
  hillsRing(ctx, { n: 24, r: [460, 760], w: [130, 240], h: [40, 100], cols: [0x2f7d48, 0x3a8c4f, 0x2a7042] }); clouds(ctx, 16);
  scatter(ctx, 190, (b, x, z, s, r) => treePine(b, x, z, s * 1.5, r, PINES), (x, z) => (Math.abs(x) > 62 + Math.max(0, -z) * .12 || z < -260) && Math.hypot(x - 92, z + 150) > 50 && Math.hypot(x + 80, z + 95) > 34, [-360, 360, -480, 60]);
  clubhouse(ctx, 96, -150, -.9, 1.25);
  const pond = M(gDisc(), new T.MeshStandardMaterial({ color: C(0x1b78cf), roughness: .12, metalness: .3 }), -80, .05, -95, 30, 1, 22, ctx.root); pond.castShadow = false; M(gDisc(), mat(0xe9d9a8), -80, .03, -95, 33, 1, 25, ctx.root).castShadow = false;
  for (const b of [[38, -62, 9, 6], [-40, -150, 11, 7], [44, -175, 8, 8]]) { M(gDisc(), mat(0xf0e0b0), b[0], .04, b[1], b[2], 1, b[3], ctx.root).castShadow = false; }
  M(gBox(), mat(0x3f9a44), 0, .04, 0, 4, .06, 5, ctx.root);
}
let _glow; function glowTex() { return _glow && _glow.image ? _glow : (_glow = ctex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); })); }
