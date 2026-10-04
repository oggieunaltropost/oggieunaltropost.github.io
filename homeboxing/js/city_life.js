// Stage "In cima al grattacielo": la citta' si muove. Auto (con i semafori) lungo le strade vere della citta' di
// Blender (blender/create_city.py: stesse strade, fiume, parchi e ponti), battelli sul fiume, navi sul mare, uno
// stormo di uccelli attorno alla torre, ogni tanto un aereo di linea.
// Auto, battelli e navi stanno dietro ai palazzi della foto: Blender ha calcolato anche la distanza di ogni punto del
// panorama (citta_profondita.png); se un palazzo della foto e' piu' vicino dell'auto, l'auto non si vede.
// Le cose lontane (oltre FAR) vengono avvicinate e rimpicciolite nella stessa direzione: da lassu' l'occhio non vede
// la differenza, e la scena resta dentro il campo di vista della camera.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const STEP = 64, SEA_Y = 2600, GROUND = -260.4, FAR = 800;
const O = new THREE.Vector3(0, 1.6, 0);                // dove stava la camera panoramica di Blender
const riverX = y => 350 + 260 * Math.sin(y / 900) - 0.12 * y;
const water = (x, y, pad = 0) => y > SEA_Y - pad || Math.abs(x - riverX(y)) < 70 + pad;
const PARKS = [[886, 875, 193], [57, -808, 260], [-1053, -1862, 157], [-1198, -1092, 158], [-1962, -1100, 164], [-1487, -167, 174],
  [1167, 953, 178], [-2003, 630, 226], [-520, 331, 162], [2074, 1085, 231], [2270, -1499, 196]];
const inPark = (x, y) => PARKS.some(([px, py, pr]) => Math.hypot(x - px, y - py) < pr + 6);
// Blender (x, y, z) -> gioco
const toGame = (bx, by, bz, v = new THREE.Vector3()) => v.set(by, GROUND + bz, bx);

class DepthPano {
  constructor(url, uU) {
    this.uU = uU;
    fetch(url).then(r => r.blob()).then(b => createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })).then(bmp => {
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height).data;
      const d = new Float32Array(c.width * c.height);
      for (let i = 0; i < d.length; i++) { const v = px[i * 4] * 256 + px[i * 4 + 1]; d[i] = v === 65535 ? Infinity : v * 0.5; }
      this.W = c.width; this.H = c.height; this.d = d;
    }).catch(e => console.warn('profondita citta', e));
  }
  // distanza (m) del panorama nella direzione n (normalizzata); Infinity se non ancora caricata o cielo
  at(n) {
    if (!this.d) return Infinity;
    let u = Math.atan2(n.z, n.x) / (2 * Math.PI) + 0.5 + this.uU; u -= Math.floor(u);
    const v = Math.asin(Math.max(-1, Math.min(1, n.y))) / Math.PI + 0.5;
    const x = Math.min(this.W - 1, (u * this.W) | 0), y = Math.min(this.H - 1, ((1 - v) * this.H) | 0);
    return this.d[y * this.W + x];
  }
}

const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const _haze = new THREE.Color(0.78, 0.83, 0.9);

export class CityLife {
  constructor(group, panoU) {
    this.group = group; this.t = 0;
    this.depth = new DepthPano('assets/citta_profondita.png', panoU);
    this._cars(); this._boats(); this._ships(); this._birds(); this._plane();
  }

  // posiziona un oggetto: P (gioco) -> se lontano lo avvicina e lo rimpicciolisce; ritorna [posizione, scala, distanza vera]
  _place(P) {
    _v.copy(P).sub(O); const d = _v.length();
    const k = d > FAR ? FAR / d : 1;
    return [_p.copy(O).addScaledVector(_v, k), k, d];
  }
  // e' nascosto da un palazzo della foto?
  _hidden(P, d, margin) { _n.copy(P).sub(O).normalize(); return this.depth.at(_n) < d - margin; }

  // ---------------------------------------------------------------- auto
  // Viaggiano solo sui tratti di strada che da lassu' si vedono davvero (calcolati con la mappa di profondita'):
  // cosi' non passano "attraverso" i palazzi della foto e non spariscono di colpo; ai capi del tratto sfumano.
  // Ogni auto tiene la distanza da quella davanti nella sua corsia e si ferma ai semafori.
  _cars() {
    const N = 400;
    const parts = [], paint = (g, col) => { const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < c.length; i += 3) { c[i] = col[0]; c[i + 1] = col[1]; c[i + 2] = col[2]; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g.toNonIndexed ? g : g; };
    const box = (w, h, d, x, y, z, col) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(); g.translate(x, y, z); parts.push(paint(g, col)); };
    box(4.3, 0.7, 1.8, 0, 0.5, 0, [1, 1, 1]);                      // carrozzeria (prende il colore dell'auto)
    box(2.2, 0.55, 1.62, -0.25, 1.12, 0, [0.12, 0.13, 0.15]);      // abitacolo: vetri scuri
    box(2.0, 0.05, 1.5, -0.25, 1.42, 0, [1, 1, 1]);                // tetto
    for (const x of [-1.35, 1.35]) for (const z of [-0.86, 0.86]) {
      const w = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10).toNonIndexed(); w.rotateX(Math.PI / 2); w.translate(x, 0.34, z); parts.push(paint(w, [0.04, 0.04, 0.045]));
    }
    const geo = mergeGeometries(parts); geo.computeVertexNormals();
    this.carMesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.35 }), N);
    this.carMesh.frustumCulled = false;
    const pal = [0xf2f2f2, 0xf2f2f2, 0x1a1a1c, 0x1a1a1c, 0x9a9da3, 0x9a9da3, 0x5a5e66, 0xa8141a, 0x1c3d8a, 0x0e1f40, 0xf2c014, 0x2f6b3a];
    const col = new THREE.Color();
    this.cars = [];
    for (let i = 0; i < N; i++) {
      const c = { v: 0, vmax: 9 + Math.random() * 7, len: Math.random() < 0.06 ? 2.6 : 1, a: 0, seg: null };   // qualche autobus/camion
      this.cars.push(c);
      this.carMesh.setColorAt(i, col.setHex(c.len > 1 ? (Math.random() < 0.5 ? 0xd8d8d0 : 0xc23a1c) : pal[(Math.random() * pal.length) | 0]));
      this.carMesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    }
    this.segs = null;
    this.group.add(this.carMesh);
  }
  _carXYs(axis, line, s) { return axis === 0 ? [s, line] : [line, s]; }
  _roadOk(axis, road, x, y) {
    const d = Math.hypot(x, y);
    if (d < 130 || d > 2800) return false;
    if (water(x, y, 4) && !(axis === 0 && (((road % 5) + 5) % 5) === 0 && y < SEA_Y - 40)) return false;   // sul fiume solo sui ponti
    return !inPark(x, y);
  }
  // tratti di strada visibili (una volta sola, quando c'e' la mappa di profondita')
  _buildSegments() {
    const segs = []; let total = 0;
    for (const axis of [0, 1]) for (let road = -41; road <= 41; road++) for (const dir of [-1, 1]) {
      const line = (road + 0.5) * STEP + dir * 2.6 * (axis ? 1 : -1);
      let s0 = null;
      for (let s = -2600; s <= 2604; s += 6) {
        const [x, y] = this._carXYs(axis, line, s);
        let ok = s <= 2600 && this._roadOk(axis, road, x, y);
        if (ok) { toGame(x, y, 1.6, _s); _v.copy(_s).sub(O); const d = _v.length(); ok = !this._hidden(_s, d, 3 + d * 0.012); }
        if (ok && s0 === null) s0 = s;
        if (!ok && s0 !== null) { if (s - 6 - s0 >= 45) { segs.push({ axis, road, dir, line, s0, s1: s - 6, key: `${axis}|${road}|${dir}` }); total += s - 6 - s0; } s0 = null; }
      }
    }
    this.segs = segs; this.segTotal = total;
    for (const c of this.cars) this._spawnCar(c, true);
  }
  _spawnCar(c, anywhere) {
    if (!this.segs || !this.segs.length) return;
    let r = Math.random() * this.segTotal, S = this.segs[0];
    for (const g of this.segs) { r -= g.s1 - g.s0; if (r <= 0) { S = g; break; } }
    c.seg = S;
    c.s = anywhere ? S.s0 + Math.random() * (S.s1 - S.s0) : (S.dir > 0 ? S.s0 : S.s1);
    c.v = anywhere ? c.vmax * Math.random() : c.vmax * 0.7; c.a = anywhere ? 1 : 0;
  }
  _updCars(dt) {
    if (!this.segs) { if (this.depth.d) this._buildSegments(); return; }
    const t = this.t;
    // chi c'e' davanti nella stessa corsia (per tenere la distanza)
    const lanes = new Map();
    for (const c of this.cars) { if (!c.seg) continue; const k = c.seg.key; if (!lanes.has(k)) lanes.set(k, []); lanes.get(k).push(c); }
    for (const L of lanes.values()) { L.sort((a, b) => (b.s - a.s) * b.seg.dir); for (let i = 0; i < L.length; i++) L[i].ahead = i ? L[i - 1] : null; }
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      if (!c.seg) { this._spawnCar(c, false); this.carMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      const S = c.seg;
      // semaforo al prossimo incrocio (alterna i due versi ogni 18 s, sfasato per incrocio)
      const f = c.s / STEP - 0.5, nx = S.dir > 0 ? Math.floor(f) + 1 : Math.ceil(f) - 1;
      const dist = ((nx + 0.5) * STEP - c.s) * S.dir;
      const ph = (t / 18 + ((nx * 0.37 + S.road * 0.61) % 1 + 1) % 1) % 1;
      const red = (ph < 0.5) !== (S.axis === 0);
      let target = c.vmax;
      if (red && dist > 8 && dist < 40) target = Math.max(0, (dist - 9.5) * 0.6);
      if (c.ahead) { const gap = (c.ahead.s - c.s) * S.dir - 4.5 * (c.ahead.len + c.len) / 2; target = Math.min(target, Math.max(0, (gap - 3) * 0.8)); }
      c.v += THREE.MathUtils.clamp(target - c.v, -7 * dt, 2.5 * dt);
      c.s += S.dir * c.v * dt;
      // comparsa e scomparsa sfumate ai capi del tratto
      const left = S.dir > 0 ? S.s1 - c.s : c.s - S.s0;
      c.a = Math.min(1, c.a + dt * 2) * THREE.MathUtils.clamp(left / 12, 0, 1);
      if (left <= 0) { c.seg = null; this.carMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      const [x, y] = this._carXYs(S.axis, S.line, c.s);
      toGame(x, y, 0, _s);
      const [p, k] = this._place(_s);
      const sc = k * c.a;
      _q.setFromAxisAngle(UP, (S.axis === 0 ? Math.PI / 2 : 0) + (S.dir < 0 ? Math.PI : 0));
      _m.compose(p, _q, _v.set(sc * c.len, sc * (c.len > 1 ? 1.35 : 1), sc));
      this.carMesh.setMatrixAt(i, _m);
    }
    this.carMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- battelli sul fiume e navi sul mare
  _boatModel(L, hullCol, cabins) {
    const B = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(L, L * 0.09, L * 0.22), new THREE.MeshLambertMaterial({ color: hullCol }));
    hull.position.y = L * 0.045; B.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(L * 0.11, L * 0.16, 4), hull.material);
    bow.rotation.set(0, Math.PI / 4, -Math.PI / 2); bow.scale.set(1, 1, 0.42); bow.position.set(L * 0.58, L * 0.045, 0); B.add(bow);
    for (const [x, w, h, col] of cabins) {
      const cb = new THREE.Mesh(new THREE.BoxGeometry(L * w, L * h, L * 0.18), new THREE.MeshLambertMaterial({ color: col }));
      cb.position.set(L * x, L * (0.09 + h / 2), 0); B.add(cb);
    }
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(L * 3, L * 0.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, map: this._wakeTex() }));
    wake.rotation.x = -Math.PI / 2; wake.position.set(-L * 1.9, 0.3, 0); B.add(wake);
    const mats = new Set(); B.traverse(o => { if (o.isMesh) mats.add(o.material); });
    B.userData.mats = [...mats].map(m => ({ m, base: m.color.clone() }));
    B.userData.clip = [new THREE.Plane(), new THREE.Plane()];
    this.group.add(B); return B;
  }
  _wakeTex() {
    if (this.wt) return this.wt;
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(256, 26); g.lineTo(0, 0); g.lineTo(0, 64); g.lineTo(256, 38); g.fill();
    return (this.wt = new THREE.CanvasTexture(c));
  }
  _boats() {
    this.boats = [];
    for (let i = 0; i < 4; i++) {
      const L = 18 + Math.random() * 22;
      const m = this._boatModel(L, [0xf4f4f0, 0x24304a, 0xe8e2d0][i % 3], [[-0.05, 0.55, 0.11, 0xe8eef2]]);
      this.boats.push({ m, L, y: -2500 + Math.random() * 5000, dir: Math.random() < 0.5 ? -1 : 1, off: (Math.random() * 2 - 1) * 35, v: 3.5 + Math.random() * 3 });
    }
  }
  _ships() {
    this.ships = [];
    for (let i = 0; i < 5; i++) {
      const L = 70 + Math.random() * 110;
      const m = i % 2 ? this._boatModel(L, 0x30343c, [[-0.35, 0.18, 0.12, 0xf0f0ea], [0.1, 0.45, 0.06, 0xb0442a]])     // mercantile
                      : this._boatModel(L, 0xf6f6f6, [[-0.05, 0.7, 0.12, 0xf6f6f6], [-0.08, 0.5, 0.07, 0xdfe6ee]]);  // traghetto
      this.ships.push({ m, L, x: (Math.random() * 2 - 1) * 9000, y: 3300 + Math.random() * 7000, dir: Math.random() < 0.5 ? -1 : 1, v: 5 + Math.random() * 4 });
    }
  }
  _putBoat(B, bx, by, hx, hy, d0, river = false) {
    toGame(bx, by, 0.25, _s);
    const [p, k, d] = this._place(_s);
    B.position.copy(p); B.scale.setScalar(k);
    B.rotation.set(0, Math.atan2(-hx, hy), 0);                 // direzione Blender (hx, hy) = gioco (hy, hx)
    // ponte vicino? la parte del battello che sta sotto l'impalcato non si vede: passa sotto
    let bridge = null;
    if (river) { const iy = 5 * Math.round((by / STEP - 0.5) / 5), yb = (iy + 0.5) * STEP; if (Math.abs(by - yb) < 40) bridge = yb; }
    const [A, Bp] = B.userData.clip;
    if (bridge !== null) {
      // fascia del ponte (x del gioco = y di Blender), portata nello spazio "avvicinato" e poi nel mondo
      const c1 = -(bridge + 6.8), c2 = bridge - 6.8;
      A.set(new THREE.Vector3(1, 0, 0), k * c1 + (k - 1) * O.x); Bp.set(new THREE.Vector3(-1, 0, 0), k * c2 - (k - 1) * O.x);
      A.applyMatrix4(this.group.matrixWorld); Bp.applyMatrix4(this.group.matrixWorld);
    }
    for (const { m } of B.userData.mats) { m.clippingPlanes = bridge !== null ? B.userData.clip : null; m.clipIntersection = true; }
    // lontano si confonde con la foschia del mare (come nella foto)
    const f = (1 - Math.exp(-d / 5000)) * 0.85;
    for (const { m, base } of B.userData.mats) if (m.color) m.color.copy(base).lerp(_haze, f);
    _s.y += 4; B.visible = bridge !== null || !this._hidden(_s, d, d0 + d * 0.02);
  }
  _updBoats(dt) {
    for (const b of this.boats) {
      b.y += b.dir * b.v * dt;
      if (b.y > SEA_Y - 30 || b.y < -3500) { b.dir *= -1; b.y = THREE.MathUtils.clamp(b.y, -3500, SEA_Y - 30); }
      const dx = 260 / 900 * Math.cos(b.y / 900) - 0.12;
      this._putBoat(b.m, riverX(b.y) + b.off, b.y, dx * b.dir, b.dir, 6, true);
    }
    for (const s of this.ships) {
      s.x += s.dir * s.v * dt;
      if (Math.abs(s.x) > 10000) { s.x = -s.dir * 10000; s.y = 3300 + Math.random() * 7000; }
      this._putBoat(s.m, s.x, s.y, s.dir, 0, 30);
    }
  }

  // ---------------------------------------------------------------- stormo di gabbiani attorno alla torre
  // gabbiano: corpo affusolato bianco, testa e becco giallo, coda; ali in due pezzi (braccio e mano: la punta segue il
  // battito con un po' di ritardo) grigie con la punta nera; materiale opaco. Volano in stormo, virano inclinati,
  // alternano battiti e planate; ognuno con il suo ritmo.
  _gullModel() {
    const G = new THREE.Group();
    const col = (geo, f) => { const p = geo.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const k = f(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2]; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; };
    const mat = this.gullMat || (this.gullMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide }));
    const W = [0.93, 0.93, 0.92], GR = [0.62, 0.65, 0.7], BK = [0.08, 0.08, 0.09];
    const body = new THREE.Mesh(col(new THREE.CapsuleGeometry(0.055, 0.24, 6, 10), () => W), mat); body.rotation.x = Math.PI / 2; body.scale.set(1, 1, 0.9); G.add(body);
    const head = new THREE.Mesh(col(new THREE.SphereGeometry(0.045, 10, 8), () => W), mat); head.position.set(0, 0.025, -0.19); G.add(head);
    const beak = new THREE.Mesh(col(new THREE.ConeGeometry(0.012, 0.05, 6), () => [0.9, 0.7, 0.1]), mat); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.02, -0.25); G.add(beak);
    const ts = new THREE.Shape(); ts.moveTo(-0.03, 0); ts.lineTo(-0.06, 0.11); ts.lineTo(0.06, 0.11); ts.lineTo(0.03, 0); ts.closePath();
    const tg = col(new THREE.ShapeGeometry(ts), () => W); tg.rotateX(Math.PI / 2); const tail = new THREE.Mesh(tg, mat); tail.position.z = 0.14; G.add(tail);
    // ala: braccio (spalla -> gomito) e mano (gomito -> punta nera), sagome viste dall'alto (y = + bordo d'attacco)
    const arm = new THREE.Shape(); arm.moveTo(0, 0.05); arm.lineTo(0.3, 0.06); arm.lineTo(0.3, -0.08); arm.lineTo(0, -0.1); arm.closePath();
    const hand = new THREE.Shape(); hand.moveTo(0, 0.06); hand.lineTo(0.22, 0.04); hand.lineTo(0.38, -0.01); hand.lineTo(0.3, -0.05); hand.lineTo(0, -0.08); hand.closePath();
    const ag = col(new THREE.ShapeGeometry(arm), () => GR); ag.rotateX(-Math.PI / 2);
    const hg = col(new THREE.ShapeGeometry(hand), x => x > 0.2 ? BK : GR); hg.rotateX(-Math.PI / 2);
    const wings = [];
    for (const s of [1, -1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.035, 0.02, -0.03); G.add(sh);
      const a = new THREE.Mesh(ag, mat); a.scale.x = s; sh.add(a);
      const el = new THREE.Group(); el.position.x = s * 0.3; sh.add(el);
      const h = new THREE.Mesh(hg, mat); h.scale.x = s; el.add(h);
      wings.push({ sh, el, s });
    }
    G.userData.wings = wings;
    return G;
  }
  _birds() {
    this.birds = [];
    for (let i = 0; i < 14; i++) {
      const B = this._gullModel(); B.scale.setScalar(1.25); this.group.add(B);
      this.birds.push({ B, ph: Math.random() * 6, f: 2.6 + Math.random() * 0.8, o: new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 16),
        prev: new THREE.Vector3(), yaw: 0, bank: 0 });
    }
  }
  _updBirds(dt) {
    const t = this.t;
    const r = 75 + 45 * Math.sin(t * 0.05) + 35 * Math.sin(t * 0.13);       // a volte vicini, a volte lontani
    const a = t * 0.085, y = -12 + 12 * Math.sin(t * 0.07);
    for (const b of this.birds) {
      const sw = Math.sin(t * 0.5 + b.ph);
      _p.set(Math.cos(a + b.o.x * 0.004) * (r + b.o.z), y + b.o.y + sw * 1.2, Math.sin(a + b.o.x * 0.004) * (r + b.o.z));
      _v.copy(_p).sub(b.prev); b.prev.copy(_p);
      b.B.position.copy(_p);
      if (_v.lengthSq() > 1e-6 && dt > 0) {
        const yaw = Math.atan2(-_v.x, -_v.z);                              // testa (-z) nel verso del volo
        let dy = Math.atan2(Math.sin(yaw - b.yaw), Math.cos(yaw - b.yaw));
        b.yaw += dy; b.bank += (THREE.MathUtils.clamp(-dy / dt * 0.25, -0.6, 0.6) - b.bank) * Math.min(1, dt * 3);
        b.B.rotation.set(-_v.y / Math.max(_v.length(), 1e-4) * 0.5, b.yaw, b.bank, 'YXZ');
      }
      // battito: braccio su e giu', la mano segue in ritardo; ogni tanto planata con le ali appena a V
      const glide = Math.sin(t * 0.35 + b.ph) > 0.25;
      const ph = t * b.f * Math.PI * 2 + b.ph * 3;
      const A1 = glide ? 0.08 : 0.15 + Math.sin(ph) * 0.55, A2 = glide ? 0.04 : Math.sin(ph - 0.9) * 0.45;
      for (const W of b.B.userData.wings) { W.sh.rotation.z = W.s * A1; W.el.rotation.z = W.s * A2; }
    }
  }

  // ---------------------------------------------------------------- aereo di linea di passaggio
  _plane() {
    const P = new THREE.Group(); P.visible = false;
    const white = new THREE.MeshLambertMaterial({ color: 0xf4f5f7 }), grey = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(2, 34, 4, 10), white); fus.rotation.z = Math.PI / 2; P.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 36), grey); wing.position.set(1, -0.6, 0); P.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 13), grey); tail.position.set(-17, 0.5, 0); P.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 0.4), new THREE.MeshLambertMaterial({ color: 0x1d4f9c })); fin.position.set(-17, 4, 0); P.add(fin);
    for (const z of [-8, 8]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4, 10), grey); e.rotation.z = Math.PI / 2; e.position.set(3, -2, z); P.add(e); }
    this.blink = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false })); this.blink.position.set(0, -2.2, 0); P.add(this.blink);
    this.plane = P; this.group.add(P);
    this.nextPlane = 25 + Math.random() * 30; this.pf = null;
  }
  _updPlane(dt) {
    if (!this.pf) {
      if ((this.nextPlane -= dt) > 0) return;
      const a = Math.random() * Math.PI * 2, dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar((Math.random() < 0.5 ? -1 : 1) * (1500 + Math.random() * 3500));
      this.pf = { dir, side, h: 900 + Math.random() * 900, climb: (Math.random() - 0.3) * 0.05, s: -9000 };
      this.plane.visible = true;
    }
    const F = this.pf; F.s += 190 * dt;
    if (F.s > 9000) { this.pf = null; this.plane.visible = false; this.nextPlane = 60 + Math.random() * 60; return; }
    _s.copy(F.side).addScaledVector(F.dir, F.s); _s.y = F.h + F.s * F.climb;
    const [p, k] = this._place(_s);
    this.plane.position.copy(p); this.plane.scale.setScalar(k);
    this.plane.rotation.set(0, Math.atan2(-F.dir.z, F.dir.x), Math.atan(F.climb));
    this.blink.visible = (this.t % 1.2) < 0.1;
  }

  update(dt) {
    this.t += dt;
    this._updCars(dt); this._updBoats(dt); this._updBirds(dt); this._updPlane(dt);
  }
}
