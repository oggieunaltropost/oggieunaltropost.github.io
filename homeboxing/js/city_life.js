// Stage "In cima al grattacielo": la citta' si muove. Auto (con i semafori) lungo le strade vere della citta' di
// Blender (blender/create_city.py: stesse strade, fiume, parchi e ponti), battelli sul fiume, navi sul mare, uno
// stormo di uccelli attorno alla torre, ogni tanto un aereo di linea.
// Auto, battelli e navi stanno dietro ai palazzi della foto: Blender ha calcolato anche la distanza di ogni punto del
// panorama (citta_profondita.png); se un palazzo della foto e' piu' vicino dell'auto, l'auto non si vede.
// Le cose lontane (oltre FAR) vengono avvicinate e rimpicciolite nella stessa direzione: da lassu' l'occhio non vede
// la differenza, e la scena resta dentro il campo di vista della camera.
import * as THREE from 'three';

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
  _cars() {
    const N = 2000;                                   // da lassu' se ne vede solo una parte: le altre sono nelle strade coperte dai palazzi
    const g = new THREE.BoxGeometry(4.4, 1.5, 1.9);
    this.carMesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
    this.carMesh.frustumCulled = false;
    const pal = [0xf2f2f2, 0xf2f2f2, 0x1a1a1c, 0x1a1a1c, 0x9a9da3, 0x9a9da3, 0x5a5e66, 0xa8141a, 0x1c3d8a, 0x0e1f40, 0xf2c014, 0x2f6b3a];
    const col = new THREE.Color();
    this.cars = [];
    for (let i = 0; i < N; i++) {
      const c = { v: 0, vmax: 9 + Math.random() * 7, len: Math.random() < 0.06 ? 2.7 : 1 };   // qualche autobus/camion
      this._spawnCar(c, true); this.cars.push(c);
      this.carMesh.setColorAt(i, col.setHex(c.len > 1 ? (Math.random() < 0.5 ? 0xd8d8d0 : 0xc23a1c) : pal[(Math.random() * pal.length) | 0]));
    }
    this.group.add(this.carMesh);
  }
  _spawnCar(c, anywhere) {
    for (let tries = 0; tries < 50; tries++) {
      c.axis = Math.random() < 0.5 ? 0 : 1;                                   // 0: si muove lungo x di Blender, 1: lungo y
      c.road = Math.round((Math.random() * 2 - 1) * 2600 / STEP);
      c.dir = Math.random() < 0.5 ? -1 : 1;
      c.line = (c.road + 0.5) * STEP + c.dir * 2.6 * (c.axis ? 1 : -1);       // corsia
      c.s = (Math.random() * 2 - 1) * 2600;
      if (this._carOk(c)) { c.v = anywhere ? c.vmax * Math.random() : c.vmax * 0.6; return; }
    }
  }
  _carXY(c) { return c.axis === 0 ? [c.s, c.line] : [c.line, c.s]; }
  _carOk(c) {
    const [x, y] = this._carXY(c), d = Math.hypot(x, y);
    if (d < 130 || d > 2800) return false;
    if (water(x, y, 4) && !(c.axis === 0 && (((c.road % 5) + 5) % 5) === 0 && y < SEA_Y - 40)) return false;   // sul fiume solo sui ponti
    return !inPark(x, y);
  }
  _updCars(dt) {
    const t = this.t;
    for (let i = 0; i < this.cars.length; i++) {
      const c = this.cars[i];
      // prossimo incrocio e il suo semaforo (alterna i due versi ogni 18 s, sfasato per incrocio)
      const f = c.s / STEP - 0.5, nx = c.dir > 0 ? Math.floor(f) + 1 : Math.ceil(f) - 1;
      const dist = ((nx + 0.5) * STEP - c.s) * c.dir;
      const ph = (t / 18 + ((nx * 0.37 + c.road * 0.61) % 1 + 1) % 1) % 1;
      const red = (ph < 0.5) !== (c.axis === 0);
      let target = c.vmax;
      if (red && dist > 8 && dist < 40) target = Math.max(0, (dist - 9.5) * 0.6);
      c.v += THREE.MathUtils.clamp(target - c.v, -6 * dt, 2.5 * dt);
      c.s += c.dir * c.v * dt;
      if (!this._carOk(c)) this._spawnCar(c, false);
      const [x, y] = this._carXY(c);
      toGame(x, y, 0.75 * c.len, _s);
      const [p, k, d] = this._place(_s);
      let sc = k;
      _s.y += 1.2;
      if (this._hidden(_s, d, 4 + d * 0.015)) sc = 0;
      _q.setFromAxisAngle(UP, c.axis === 0 ? Math.PI / 2 : 0);
      _m.compose(p, _q, _v.set(sc * c.len, sc * c.len, sc));
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
    for (let i = 0; i < 7; i++) {
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
  _putBoat(B, bx, by, hx, hy, d0) {
    toGame(bx, by, 0.25, _s);
    const [p, k, d] = this._place(_s);
    B.position.copy(p); B.scale.setScalar(k);
    B.rotation.set(0, Math.atan2(-hx, hy), 0);                 // direzione Blender (hx, hy) = gioco (hy, hx)
    _s.y += 4; B.visible = !this._hidden(_s, d, d0 + d * 0.02);
  }
  _updBoats(dt) {
    for (const b of this.boats) {
      b.y += b.dir * b.v * dt;
      if (b.y > SEA_Y - 30 || b.y < -3500) { b.dir *= -1; b.y = THREE.MathUtils.clamp(b.y, -3500, SEA_Y - 30); }
      const dx = 260 / 900 * Math.cos(b.y / 900) - 0.12;
      this._putBoat(b.m, riverX(b.y) + b.off, b.y, dx * b.dir, b.dir, 6);
    }
    for (const s of this.ships) {
      s.x += s.dir * s.v * dt;
      if (Math.abs(s.x) > 10000) { s.x = -s.dir * 10000; s.y = 3300 + Math.random() * 7000; }
      this._putBoat(s.m, s.x, s.y, s.dir, 0, 30);
    }
  }

  // ---------------------------------------------------------------- stormo di uccelli attorno alla torre
  _birds() {
    const wingG = new THREE.PlaneGeometry(0.45, 0.22); wingG.translate(0.225, 0, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a3c42, side: THREE.DoubleSide });
    this.birds = [];
    for (let i = 0; i < 16; i++) {
      const B = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.25, 3, 6), mat); body.rotation.x = Math.PI / 2; B.add(body);
      const L = new THREE.Mesh(wingG, mat), Rw = new THREE.Mesh(wingG, mat); Rw.rotation.y = Math.PI;
      const lw = new THREE.Group(), rw = new THREE.Group(); lw.add(L); rw.add(Rw); B.add(lw, rw);
      this.group.add(B);
      this.birds.push({ B, lw, rw, ph: Math.random() * 6, o: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 14), prev: new THREE.Vector3() });
    }
  }
  _updBirds(dt) {
    const t = this.t;
    const r = 70 + 50 * Math.sin(t * 0.05) + 40 * Math.sin(t * 0.13);       // a volte vicini, a volte lontani
    const a = t * 0.09, y = -15 + 12 * Math.sin(t * 0.07);
    for (const b of this.birds) {
      const sw = 3 * Math.sin(t * 0.6 + b.ph);
      _p.set(Math.cos(a + b.o.x * 0.004) * (r + b.o.z), y + b.o.y + sw * 0.3, Math.sin(a + b.o.x * 0.004) * (r + b.o.z));
      _v.copy(_p).sub(b.prev); b.prev.copy(_p);
      b.B.position.copy(_p);
      if (_v.lengthSq() > 1e-6) b.B.rotation.set(0, Math.atan2(_v.x, _v.z), 0);
      const glide = Math.sin(t * 0.4 + b.ph) > 0.3;                        // ogni tanto planano
      const fl = glide ? 0.12 : Math.sin(t * 11 + b.ph * 3) * 0.7;
      b.lw.rotation.z = fl; b.rw.rotation.z = -fl;
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
