// Fuochi d'artificio dello "Stadio di notte": ogni tanto un razzo parte da dietro lo stadio (fuori dalle gradinate, a 150-230 m dal
// ring, in una direzione a caso sui quattro lati), sale con una scia sottile e scoppia in alto sopra le gradinate. Figure:
// peonia (sfera compatta con le stelle che lasciano una codina), crisantemo (code lunghe), anello, salice dorato che cade,
// doppia sfera, palma (pochi rami spessi) e scoppio multiplo (3-5 scoppi vicini uno dopo l'altro, a volte con un crepitio
// di scintille bianche alla fine). Ogni scoppio da' un lampo di luce che illumina ring e pugili e un botto posizionale
// (sfx.fireworkLaunch/Burst). Un solo THREE.Points (scintille additive, colore che svanisce) e una sola luce puntiforme.
import * as THREE from 'three';
import * as sfx from './sfx.js?v=20261010150310';

const N = 14000;                                          // scintille al massimo
const PALETTE = [[1.0, 0.12, 0.08], [1.0, 0.7, 0.2], [0.2, 0.45, 1.0], [0.25, 1.0, 0.4], [1.0, 0.15, 0.75], [1.0, 1.0, 0.95], [0.25, 0.95, 1.0], [1.0, 0.4, 0.08], [0.7, 0.3, 1.0]];

function sparkTexture() {                                 // punto nitido: nucleo pieno e un piccolo alone (prima era un'ombra morbida e grande: sembrava sfocato)
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.28, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

export class NightFireworks {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.name = 'fuochi'; parent.add(this.group);
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.max = new Float32Array(N);
    this.base = new Float32Array(N * 3); this.drag = new Float32Array(N); this.grav = new Float32Array(N); this.trail = new Uint8Array(N);
    this.next = 0;
    for (let i = 0; i < N; i++) this.pos[i * 3 + 1] = -1000;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.15, map: sparkTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true, toneMapped: false, fog: false,
    }));
    this.points.frustumCulled = false; this.points.renderOrder = 6; this.group.add(this.points);
    this.flash = new THREE.PointLight(0xffffff, 0, 0, 0); this.group.add(this.flash);      // il lampo del botto (luce sempre presente: niente ricompilazioni)
    this.flashT = 0; this.flashK = 0; this.flashCol = new THREE.Color();
    this.rockets = []; this.bursts = []; this.t = 0; this.next_ = 6 + Math.random() * 5; this.queue = [];
  }

  _spawn(x, y, z, vx, vy, vz, r, g, b, life, drag, grav, trail = 0) {
    const i = this.next; this.next = (this.next + 1) % N; const k = i * 3;
    this.pos[k] = x; this.pos[k + 1] = y; this.pos[k + 2] = z; this.vel[k] = vx; this.vel[k + 1] = vy; this.vel[k + 2] = vz;
    this.base[k] = r; this.base[k + 1] = g; this.base[k + 2] = b; this.col[k] = r; this.col[k + 1] = g; this.col[k + 2] = b;
    this.life[i] = this.max[i] = life; this.drag[i] = drag; this.grav[i] = grav; this.trail[i] = trail;
  }
  _dir() { const u = Math.random() * 2 - 1, a = Math.random() * 2 * Math.PI, s = Math.sqrt(1 - u * u); return [s * Math.cos(a), u, s * Math.sin(a)]; }
  _ball(at, col, n, sp, life, trail, drag = 1.5, grav = 2.6) {
    for (let k = 0; k < n; k++) { const d = this._dir(), s = sp * (0.8 + Math.random() * 0.3); this._spawn(at.x, at.y, at.z, d[0] * s, d[1] * s, d[2] * s, col[0], col[1], col[2], life * (0.85 + Math.random() * 0.3), drag, grav, trail); }
  }

  // un razzo: parte da terra dietro lo stadio (oltre le gradinate) e scoppia a 85-140 m di quota
  launch(cam) {
    const a = Math.random() * 2 * Math.PI, r = 150 + Math.random() * 80;
    const x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r, top = 85 + Math.random() * 55, T = 2.2 + top / 90;
    this.rockets.push({ x, z, y: 0, top, t: 0, T, kind: Math.random(), done: false });
    if (cam) sfx.fireworkLaunch(this.group.localToWorld(new THREE.Vector3(x, 1, z)), cam, T);
  }
  // uno scoppio (at: posizione; type: figura; sc: scala; power: forza del botto)
  _explode(at, type, cam, sc = 1, power = 1, cols = null) {
    const c1 = cols ? cols[0] : PALETTE[Math.floor(Math.random() * PALETTE.length)], c2 = cols ? cols[1] : PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const sp = (20 + Math.random() * 5) * sc;
    if (type === 'peony') this._ball(at, c1, Math.round(330 * sc), sp, 2.0, 2);
    else if (type === 'chrysanthemum') this._ball(at, c1, Math.round(260 * sc), sp * 0.9, 2.6, 3, 1.3, 3.2);
    else if (type === 'double') { this._ball(at, c1, 300, sp, 2.0, 2); this._ball(at, c2, 170, sp * 0.52, 1.7, 0); }
    else if (type === 'ring') {
      const nx = this._dir(), ax = new THREE.Vector3(nx[0], nx[1], nx[2]), u = new THREE.Vector3(1, 0, 0).cross(ax).normalize(), w = ax.clone().cross(u);
      for (let k = 0; k < 190; k++) { const a = k / 190 * 2 * Math.PI, s = sp * 1.0; this._spawn(at.x, at.y, at.z, (u.x * Math.cos(a) + w.x * Math.sin(a)) * s, (u.y * Math.cos(a) + w.y * Math.sin(a)) * s, (u.z * Math.cos(a) + w.z * Math.sin(a)) * s, c1[0], c1[1], c1[2], 1.9, 1.5, 2.4, 1); }
      this._ball(at, [1, 1, 0.85], 50, sp * 0.3, 1.2, 0);
    } else if (type === 'willow') this._ball(at, [1.0, 0.72, 0.26], 190, sp * 0.7, 3.6, 3, 1.2, 4.4);
    else if (type === 'palm') {                              // pochi rami spessi che si aprono e ricadono
      for (let b = 0; b < 8; b++) { const d = this._dir(); if (d[1] < -0.1) d[1] = -d[1] * 0.5; for (let k = 0; k < 26; k++) { const s = sp * (0.75 + k * 0.012); this._spawn(at.x, at.y, at.z, d[0] * s + (Math.random() - 0.5) * 1.2, d[1] * s + 2, d[2] * s + (Math.random() - 0.5) * 1.2, 1.0, 0.7, 0.28, 2.6 + k * 0.02, 1.6, 4.0, 3); } }
    }
    this.flash.position.copy(at); this.flash.position.y = Math.min(at.y, 60); this.flashCol.setRGB(0.6 + c1[0] * 0.4, 0.6 + c1[1] * 0.4, 0.6 + c1[2] * 0.4);
    this.flash.color.copy(this.flashCol); this.flashT = 0.7; this.flashK = Math.max(this.flashK * 0.5, power);
    if (cam) sfx.fireworkBurst(this.group.localToWorld(at.clone()), cam, type, power);
  }
  _burst(R, cam) {
    const at = new THREE.Vector3(R.x, R.y, R.z), k = R.kind;
    if (k < 0.34) {                                          // scoppio multiplo: 3-5 scoppi vicini uno dopo l'altro (colori a caso o gli stessi), a volte col crepitio finale
      const n = 3 + Math.floor(Math.random() * 3), same = Math.random() < 0.5, cs = [PALETTE[Math.floor(Math.random() * PALETTE.length)], PALETTE[Math.floor(Math.random() * PALETTE.length)]];
      for (let i = 0; i < n; i++) {
        const p = at.clone().add(new THREE.Vector3((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 34));
        this.bursts.push({ at: this.t + i * (0.28 + Math.random() * 0.3), p, type: Math.random() < 0.3 ? 'chrysanthemum' : 'peony', sc: 0.6 + Math.random() * 0.25, power: 0.55, cols: same ? cs : null });
      }
      if (Math.random() < 0.6) this.bursts.push({ at: this.t + n * 0.45 + 0.4, p: at.clone(), type: 'glitter', sc: 1, power: 0.35 });
    } else {
      const type = k < 0.5 ? 'peony' : k < 0.62 ? 'chrysanthemum' : k < 0.74 ? 'ring' : k < 0.84 ? 'double' : k < 0.93 ? 'willow' : 'palm';
      this._explode(at, type, cam, 1, 1);
      if (type === 'peony' && Math.random() < 0.5) this.bursts.push({ at: this.t + 1.0, p: at.clone(), type: 'glitter', sc: 1, power: 0.25 });
    }
  }
  _glitter(at, cam) {                                        // scintille bianche che brillano e si spengono (crepitio)
    for (let k = 0; k < 120; k++) { const d = this._dir(), s = 3 + Math.random() * 9; this._spawn(at.x + d[0] * 6, at.y + d[1] * 6, at.z + d[2] * 6, d[0] * s * 0.3, d[1] * s * 0.3, d[2] * s * 0.3, 1, 0.95, 0.8, 0.25 + Math.random() * 0.9, 0.5, 1.2, 0); }
    if (cam) sfx.fireworkCrackle(this.group.localToWorld(at.clone()), cam);
  }

  update(dt, cam) {
    this.t += dt;
    // il prossimo razzo (ogni tanto due o tre di seguito)
    this.next_ -= dt;
    if (this.next_ <= 0) {
      const n = Math.random() < 0.2 ? 2 + Math.floor(Math.random() * 2) : 1;
      for (let k = 0; k < n; k++) this.queue.push(this.t + k * (0.5 + Math.random() * 0.8));
      this.next_ = 9 + Math.random() * 12;
    }
    while (this.queue.length && this.queue[0] <= this.t) { this.queue.shift(); this.launch(cam); }
    // razzi in salita, con la scia
    for (const R of this.rockets) {
      R.t += dt; const q = Math.min(1, R.t / R.T), e = 1 - (1 - q) * (1 - q);
      R.y = R.top * e;
      const sx = R.x + Math.sin(R.t * 9) * 0.15, sz = R.z + Math.cos(R.t * 7) * 0.15;
      if (Math.random() < 0.7) this._spawn(sx, R.y, sz, (Math.random() - 0.5) * 1.5, -4 - Math.random() * 3, (Math.random() - 0.5) * 1.5, 1.0, 0.7, 0.3, 0.45 + Math.random() * 0.25, 3.0, 4.0);
      this._spawn(sx, R.y, sz, 0, 0, 0, 1, 0.95, 0.8, 0.05, 0, 0);
      if (q >= 1 && !R.done) { R.done = true; this._burst(R, cam); }
    }
    this.rockets = this.rockets.filter(R => !R.done);
    // scoppi in coda (scoppio multiplo, crepitii)
    for (const B of this.bursts) if (!B.done && B.at <= this.t) { B.done = true; if (B.type === 'glitter') this._glitter(B.p, cam); else this._explode(B.p, B.type, cam, B.sc, B.power, B.cols); }
    this.bursts = this.bursts.filter(B => !B.done);
    // scintille
    const pos = this.pos, col = this.col, vel = this.vel, base = this.base;
    for (let i = 0; i < N; i++) {
      if (this.life[i] <= 0) { if (pos[i * 3 + 1] > -900) { pos[i * 3 + 1] = -1000; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; } continue; }
      this.life[i] -= dt; const k = i * 3, dr = Math.max(0, 1 - this.drag[i] * dt);
      vel[k] *= dr; vel[k + 1] = vel[k + 1] * dr - this.grav[i] * dt; vel[k + 2] *= dr;
      pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
      const tr = this.trail[i];                               // codina: piccole scintille che restano dietro la stella e svaniscono subito
      if (tr && Math.random() < (tr === 1 ? 0.2 : tr === 2 ? 0.3 : 0.45)) this._spawn(pos[k], pos[k + 1], pos[k + 2], vel[k] * 0.05, vel[k + 1] * 0.05 - 0.2, vel[k + 2] * 0.05, base[k], base[k + 1] * 0.85, base[k + 2] * 0.7, tr === 2 ? 0.28 : 0.6, 2.0, 2.0, 0);
      const f = Math.max(0, this.life[i] / this.max[i]), fl = 0.7 + 0.3 * Math.sin(this.t * 45 + i * 7.3);      // si spegne con un po' di scintillio
      const kk = (f < 0.35 ? f / 0.35 : 1) * (this.max[i] < 0.9 ? 1 : fl) * 1.25;
      col[k] = base[k] * kk; col[k + 1] = base[k + 1] * kk; col[k + 2] = base[k + 2] * kk;
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
    // lampo
    if (this.flashT > 0) { this.flashT -= dt; const f = Math.max(0, this.flashT / 0.7); this.flash.intensity = this.flashK * 1.0 * f * f * (0.8 + 0.2 * Math.sin(this.t * 60)); }
    else { this.flash.intensity = 0; this.flashK = 0; }
  }
}
