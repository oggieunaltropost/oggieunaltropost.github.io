// Allenamento alla palla a doppio elastico (double end bag). La palla (400 g, 11 cm di raggio) e' tenuta da due
// elastici in tensione: uno al soffitto, uno a un anello a terra. Fisica: due molle che tirano soltanto (un elastico
// non spinge), gravita', aria. Colpita schizza via e gli elastici la riportano indietro veloce: se non ti sposti o
// non pari, ti prende in faccia (rimbalza sulla testa, lampo rosso, vibrazione) e si conta.
// Colpi a segno / a vuoto come la pera veloce.
// Sistema: quello del ring (arena): il giocatore in (0, 0, playerZ) guarda verso -Z, pavimento a 0.
import * as THREE from 'three';
import * as sfx from './sfx.js?v=20261004230128';
import { t as tr } from './i18n.js?v=20261004230128';

const M = 0.4, R = 0.105, PUNCH_MASS = 2.4, E_HIT = 0.55, E_HEAD = 0.35;
const TENSION = 110, STRETCH = 0.25;           // tensione a riposo (N) e allungamento a riposo degli elastici (25%)
const G = 9.81, DRAG = 0.9, HEAD_R = 0.11;

function leather() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#141416'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#9a1418'; g.fillRect(0, 96, 512, 64);                              // fascia rossa
  for (let i = 0; i < 6000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.04)'; g.fillRect(Math.random() * 512, Math.random() * 256, 2, 1 + Math.random() * 2); }
  g.setLineDash([6, 6]); g.strokeStyle = 'rgba(220,200,170,0.55)'; g.lineWidth = 2;
  for (const y of [96, 160]) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * 128 + 64, 0); g.lineTo(k * 128 + 64, 256); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = '#f2ece0'; g.font = '900 40px Impact, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.translate(128, 128); g.scale(0.6, 1); g.fillText('HOME BOXING', 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

export class DoubleEndTraining {
  constructor(parent) {
    this.parent = parent;
    this.group = new THREE.Group(); this.group.name = 'allenamento doppio elastico'; this.group.visible = false; parent.add(this.group);
    const chrome = new THREE.MeshStandardMaterial({ color: 0xc0c4cc, metalness: 1, roughness: 0.2 });
    const steel = new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.7, roughness: 0.4 });
    this.ball = new THREE.Group(); this.group.add(this.ball);
    const body = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), new THREE.MeshPhysicalMaterial({ map: leather(), roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 }));
    body.scale.set(1, 1.08, 1); body.rotation.y = -Math.PI / 2; this.ball.add(body);
    for (const s of [1, -1]) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.004, 6, 12), chrome); l.position.y = s * (R * 1.08 + 0.008); this.ball.add(l); }
    const cordM = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.7 });
    this.cords = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 8), cordM); this.group.add(m); return m; });
    this.hookTop = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 16), chrome); this.group.add(this.hookTop);
    this.plate = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.012, 24), steel); this.group.add(this.plate);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 8, 16), chrome); this.group.add(this.ring);
    this._board();
    this.x = new THREE.Vector3(); this.v = new THREE.Vector3();
    this.att = { left: null, right: null }; this.inside = { left: false, right: false };
    this.A = new THREE.Vector3(); this.B = new THREE.Vector3(); this.rest = new THREE.Vector3();
  }
  _board() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; this.bc = c;
    this.btex = new THREE.CanvasTexture(c); this.btex.colorSpace = THREE.SRGBColorSpace;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 0.05), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.5, metalness: 0.4 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: this.btex, toneMapped: false })); face.position.z = 0.026; frame.add(face);
    this.board = frame; this.group.add(frame); this.lastDraw = '';
  }
  _drawBoard() {
    const t = Math.floor(this.time), mm = Math.floor(t / 60), ss = t % 60;
    const tot = this.hits + this.misses, acc = tot ? Math.round(this.hits / tot * 100) : 0;
    const key = `${mm}:${ss}|${this.hits}|${this.misses}|${this.taken}|${acc}`;
    if (key === this.lastDraw) return; this.lastDraw = key;
    const g = this.bc.getContext('2d'), W = 1024;
    g.fillStyle = '#07080a'; g.fillRect(0, 0, W, 512);
    g.fillStyle = '#6a1f8a'; g.fillRect(0, 0, W, 70);
    g.fillStyle = '#fff'; g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tr('de_title'), W / 2, 36);
    const cell = (x, label, val, col, big = 120) => {
      g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif'; g.fillText(label, x, 120);
      g.fillStyle = col; g.font = `900 ${big}px "Courier New", monospace`; g.fillText(val, x, 225);
    };
    cell(W / 6, tr('bag_time'), `${mm}:${String(ss).padStart(2, '0')}`, '#ffd34d', 104);
    cell(W / 2, tr('speed_hits'), String(this.hits), '#4cff7a');
    cell(W * 5 / 6, tr('speed_miss'), String(this.misses), '#ffb04c');
    g.strokeStyle = '#2a2e36'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 330); g.lineTo(W - 40, 330); g.stroke();
    g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif';
    g.fillText(tr('de_taken'), W * 0.3, 380); g.fillText(tr('speed_acc'), W * 0.7, 380);
    g.fillStyle = '#ff5a5a'; g.font = '900 76px "Courier New", monospace'; g.fillText(String(this.taken), W * 0.3, 452);
    g.fillStyle = '#fff'; g.fillText(tot ? acc + '%' : '—', W * 0.7, 452);
    this.btex.needsUpdate = true;
  }

  // la palla davanti a te all'altezza della faccia; elastico al soffitto e anello a terra
  start(playerZ, headY, ceilY = 4.6) {
    this.group.visible = true;
    const z = playerZ - 0.55, y = THREE.MathUtils.clamp(headY - 0.05, 1.3, 2.0);
    this.rest.set(0, y, z); this.A.set(0, ceilY, z); this.B.set(0, 0.006, z);
    this.L1 = this.A.distanceTo(this.rest) / (1 + STRETCH); this.L2 = this.B.distanceTo(this.rest) / (1 + STRETCH);
    this.k1 = TENSION / (this.A.distanceTo(this.rest) - this.L1); this.k2 = TENSION / (this.B.distanceTo(this.rest) - this.L2);
    this.hookTop.position.copy(this.A); this.plate.position.copy(this.B); this.ring.position.set(0, 0.03, z);
    this.board.position.set(1.6, 2.65, playerZ - 3.2); this.board.rotation.set(0, -0.4, 0);
    this.reset();
  }
  stop() { this.group.visible = false; }
  reset() {
    this.x.copy(this.rest); this.v.set(0, 0, 0); this.time = 0; this.hits = 0; this.misses = 0; this.taken = 0; this.lastDraw = '';
    this.att.left = this.att.right = null; this.headCool = 0; this.whooshCool = 0; this._apply(); this._drawBoard();
  }
  _cord(m, a, b) {
    const d = b.clone().sub(a); m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }
  _apply() {
    this.ball.position.copy(this.x);
    const up = this.A.clone().sub(this.x).normalize();                       // la palla si orienta lungo gli elastici
    this.ball.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    const top = this.x.clone().addScaledVector(up, R * 1.08 + 0.01), bot = this.x.clone().addScaledVector(up, -(R * 1.08 + 0.01));
    this._cord(this.cords[0], top, this.A); this._cord(this.cords[1], this.B.clone().setY(0.03), bot);
  }
  _step(h) {
    const f = new THREE.Vector3(0, -M * G, 0);
    for (const [P, L, k] of [[this.A, this.L1, this.k1], [this.B, this.L2, this.k2]]) {
      const d = P.clone().sub(this.x), len = d.length();
      if (len > L) f.addScaledVector(d.divideScalar(len), k * (len - L));      // un elastico tira e basta
    }
    f.addScaledVector(this.v, -DRAG * M);
    this.v.addScaledVector(f, h / M); this.x.addScaledVector(this.v, h);
  }

  update(dt, player, cam) {
    if (!this.group.visible) return;
    this.time += dt; this.headCool -= dt; this.whooshCool -= dt;
    const n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n;
    for (let i = 0; i < n; i++) this._step(h);
    const gq = this.group.getWorldQuaternion(new THREE.Quaternion()).invert();
    // guantoni: colpi a segno, a vuoto
    for (const side of ['left', 'right']) {
      const g = player.gloves[side];
      if (!g.mesh.visible) { this.inside[side] = false; continue; }
      const Gp = this.group.worldToLocal(g.center.clone()), vg = g.vel.clone().applyQuaternion(gq);
      const toB = this.x.clone().sub(Gp), dist = toB.length(), dir = toB.clone().divideScalar(Math.max(dist, 1e-4));
      const approach = vg.dot(dir);
      if (!this.att[side] && g.speed > 1.8 && approach > 1.3 && dist < 0.5) this.att[side] = { t: this.time, hit: false };
      const rr = R + g.radius * 0.8;
      if (dist < rr) {
        const nrm = dir.clone().negate(), vn = -(vg.clone().sub(this.v)).dot(nrm);
        if (!this.inside[side] && vn > 0.6) {
          this.v.addScaledVector(nrm, -(1 + E_HIT) * vn * PUNCH_MASS / (PUNCH_MASS + M));
          this.hits++; if (this.att[side]) this.att[side].hit = true; else this.att[side] = { t: this.time, hit: true };
          sfx.speedHit(Math.min(1.2, vn / 5), g.center, cam);
          player.pulse(side, Math.min(1, 0.2 + vn / 10), 25);
        }
        this.inside[side] = true;
        const push = nrm.clone().transformDirection(this.group.matrixWorld).multiplyScalar(rr - dist);
        g.mesh.position.add(push); g.center.add(push);
      } else if (dist > rr + 0.03) this.inside[side] = false;
      const A = this.att[side];
      if (A && (approach < -0.6 || dist > 0.65 || this.time - A.t > 0.7)) { if (!A.hit) this.misses++; this.att[side] = null; }
    }
    // la palla torna indietro e ti prende in faccia?
    const head = this.group.worldToLocal(player.head.clone()).add(new THREE.Vector3(0, -0.04, 0.02));
    const hb = this.x.clone().sub(head), hd = hb.length();
    if (hd < R + HEAD_R) {
      const nrm = hb.divideScalar(Math.max(hd, 1e-4)), vn = -this.v.dot(nrm);
      if (vn > 0.5) {
        this.v.addScaledVector(nrm, (1 + E_HEAD) * vn);
        if (this.headCool <= 0 && vn > 1.2) {
          this.taken++; this.headCool = 0.4;
          sfx.punchHit(Math.min(1, 0.3 + vn / 8), false);
          player.pulse('left', 0.7, 60); player.pulse('right', 0.7, 60);
          if (this.onTaken) this.onTaken(Math.min(1, vn / 6));
        }
      }
      this.x.copy(head).addScaledVector(nrm, R + HEAD_R);                     // non ti entra in testa
    } else if (hd < 0.4 && this.v.length() > 4 && this.whooshCool <= 0) { sfx.whoosh(); this.whooshCool = 0.35; }   // ti sfiora
    this._apply();
    this._drawBoard();
  }
}
