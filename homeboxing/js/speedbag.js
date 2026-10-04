// Allenamento alla pera veloce (speed bag). La pera (300 g) pende da un girello sotto una tavola rotonda di legno;
// e' un pendolo leggero: colpita schizza via, sbatte contro la tavola (si piega di ~78 gradi) e rimbalza avanti e
// indietro perdendo energia a ogni colpo: il classico "ta-ta-ta". Il guantone le da' un impulso (urto con il pugno
// molto piu' pesante di lei). Colpo a segno: il guantone la tocca spingendola. Colpo a vuoto: un pugno parte veloce
// verso la pera, le arriva vicino e il braccio torna indietro senza averla toccata.
// Sistema: quello del ring (arena): il giocatore in (0, 0, playerZ) guarda verso -Z, pavimento a 0.
import * as THREE from 'three';
import * as sfx from './sfx.js?v=20261004212007';
import { t as tr } from './i18n.js?v=20261004212007';

const M = 0.3, PUNCH_MASS = 2.4, E_HIT = 0.5, E_BOARD = 0.62;
const LC = 0.15, RB = 0.1;                    // dal girello al centro della pera, raggio (parte larga)
const COS_MAX = Math.cos(THREE.MathUtils.degToRad(78));     // oltre si appoggia alla tavola
const G = 9.81, DRAG = 1.6;

function leather() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#7a1d12'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 6000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,200,170,0.05)'; g.fillRect(Math.random() * 512, Math.random() * 256, 2, 1 + Math.random() * 2); }
  g.strokeStyle = 'rgba(25,5,0,0.9)'; g.lineWidth = 4;
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * 128 + 64, 0); g.lineTo(k * 128 + 64, 256); g.stroke(); }
  g.setLineDash([6, 6]); g.strokeStyle = 'rgba(235,205,160,0.6)'; g.lineWidth = 2;
  for (let k = 0; k < 4; k++) for (const s of [-7, 7]) { g.beginPath(); g.moveTo(k * 128 + 64 + s, 0); g.lineTo(k * 128 + 64 + s, 256); g.stroke(); }
  g.setLineDash([]);
  g.save(); g.translate(128, 150); g.scale(1, 0.75); g.fillStyle = '#f2ece0'; g.font = '900 46px Impact, system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('HB', 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

export class SpeedBagTraining {
  constructor(parent) {
    this.parent = parent;
    this.group = new THREE.Group(); this.group.name = 'allenamento pera'; this.group.visible = false; parent.add(this.group);
    this._build(); this._board();
    this.u = new THREE.Vector3(0, -1, 0); this.v = new THREE.Vector3();
    this.att = { left: null, right: null }; this.inside = { left: false, right: false };
    this.reset();
  }

  _build() {
    const steel = new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.7, roughness: 0.4 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xc0c4cc, metalness: 1, roughness: 0.2 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a3418, roughness: 0.45 });
    this.stand = new THREE.Group(); this.group.add(this.stand);
    // colonna dietro alla tavola con la base a terra, braccio, tavola rotonda
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.07), steel); this.stand.add(post); this.post = post;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.5), steel); base.position.y = 0.015; this.stand.add(base); this.base = base;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.5), steel); this.stand.add(arm); this.arm = arm;
    const board = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.045, 40), wood); this.stand.add(board); this.boardMesh = board;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.01, 8, 40), steel); rim.rotation.x = Math.PI / 2; this.stand.add(rim); this.rim = rim;
    this.pivot = new THREE.Group(); this.stand.add(this.pivot);
    const swivel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 10), chrome); swivel.position.y = -0.005; this.pivot.add(swivel);
    this.bag = new THREE.Group(); this.pivot.add(this.bag);
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.004, 6, 12), chrome); loop.position.y = -0.03; this.bag.add(loop);
    const prof = [[0.0, -0.04], [0.022, -0.042], [0.03, -0.06], [0.06, -0.1], [0.092, -0.14], [RB, -0.17], [0.098, -0.2], [0.085, -0.235], [0.055, -0.262], [0.0, -0.272]]
      .map(([r, y]) => new THREE.Vector2(r, y)).reverse();     // dal basso in alto: facce verso l'esterno (al contrario si vedeva l'interno)
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshPhysicalMaterial({ map: leather(), roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 }));
    body.rotation.y = -Math.PI / 2; this.bag.add(body);
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
    const tot = this.hits + this.misses, acc = tot ? Math.round(this.hits / tot * 100) : 0, per = this.time > 5 ? Math.round(this.hits / (this.time / 60)) : 0;
    const key = `${mm}:${ss}|${this.hits}|${this.misses}|${acc}|${per}`;
    if (key === this.lastDraw) return; this.lastDraw = key;
    const g = this.bc.getContext('2d'), W = 1024;
    g.fillStyle = '#07080a'; g.fillRect(0, 0, W, 512);
    g.fillStyle = '#8a3a1a'; g.fillRect(0, 0, W, 70);
    g.fillStyle = '#fff'; g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tr('speed_title'), W / 2, 36);
    const cell = (x, label, val, col, big = 120) => {
      g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif'; g.fillText(label, x, 120);
      g.fillStyle = col; g.font = `900 ${big}px "Courier New", monospace`; g.fillText(val, x, 225);
    };
    cell(W / 6, tr('bag_time'), `${mm}:${String(ss).padStart(2, '0')}`, '#ffd34d', 104);
    cell(W / 2, tr('speed_hits'), String(this.hits), '#4cff7a');
    cell(W * 5 / 6, tr('speed_miss'), String(this.misses), '#ff5a5a');
    g.strokeStyle = '#2a2e36'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 330); g.lineTo(W - 40, 330); g.stroke();
    g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif';
    g.fillText(tr('speed_acc'), W * 0.3, 380); g.fillText(tr('bag_rate'), W * 0.7, 380);
    g.fillStyle = '#fff'; g.font = '900 76px "Courier New", monospace';
    g.fillText(tot ? acc + '%' : '—', W * 0.3, 452); g.fillText(per ? String(per) : '—', W * 0.7, 452);
    this.btex.needsUpdate = true;
  }

  // la pera davanti a te, il punto largo all'altezza della bocca (la tavola si regola sulla tua altezza)
  start(playerZ, headY) {
    this.group.visible = true;
    const py = THREE.MathUtils.clamp(headY + 0.1, 1.45, 2.1);
    this.stand.position.set(0, 0, playerZ - 0.5);
    this.pivot.position.set(0, py, 0);
    this.boardMesh.position.set(0, py + 0.0225, -0.02); this.rim.position.copy(this.boardMesh.position);
    this.arm.position.set(0, py + 0.07, -0.3); this.post.scale.y = py + 0.1; this.post.position.set(0, (py + 0.1) / 2, -0.55); this.base.position.z = -0.55;
    this.board.position.set(1.6, 2.65, playerZ - 3.2); this.board.rotation.set(0, -0.4, 0);
    this.reset();
  }
  stop() { this.group.visible = false; }
  reset() {
    this.u.set(0, -1, 0); this.v.set(0, 0, 0); this.time = 0; this.hits = 0; this.misses = 0; this.lastDraw = '';
    this.att.left = this.att.right = null; this._apply(); this._drawBoard();
  }
  _apply() { this.bag.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), this.u); }
  _pivotLocal() { return new THREE.Vector3().copy(this.pivot.position).add(this.stand.position); }   // (nel gruppo)

  _step(h, cam) {
    // pendolo sferico: punto sulla sfera di raggio LC, gravita' tangente, aria
    const g = new THREE.Vector3(0, -G, 0); g.addScaledVector(this.u, -g.dot(this.u));
    this.v.addScaledVector(g, h).multiplyScalar(Math.max(0, 1 - DRAG * h));
    this.u.addScaledVector(this.v, h / LC).normalize();
    this.v.addScaledVector(this.u, -this.v.dot(this.u));
    // la tavola: oltre ~78 gradi la pera la colpisce e rimbalza
    const c = -this.u.y;
    if (c < COS_MAX) {
      const eth = new THREE.Vector3(0, 1, 0).addScaledVector(this.u, -this.u.y).normalize();   // verso l'alto lungo la sfera
      const vth = this.v.dot(eth);
      if (vth > 0) {
        this.v.addScaledVector(eth, -(1 + E_BOARD) * vth);
        if (vth > 0.4) sfx.speedRebound(Math.min(1.2, vth / 5), this.group.localToWorld(this._pivotLocal()), cam);
      }
      // rimette la pera sul limite
      const horiz = new THREE.Vector3(this.u.x, 0, this.u.z).normalize(), s = Math.sqrt(1 - COS_MAX * COS_MAX);
      if (horiz.lengthSq() > 0.5) this.u.set(horiz.x * s, -COS_MAX, horiz.z * s);
    }
  }

  update(dt, player, cam) {
    if (!this.group.visible) return;
    this.time += dt;
    const n = Math.max(1, Math.ceil(dt / 0.002)), h = dt / n;
    for (let i = 0; i < n; i++) this._step(h, cam);
    this._apply();
    const P = this._pivotLocal(), C = P.clone().addScaledVector(this.u, LC + 0.02);       // centro della parte larga
    const gq = this.group.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const side of ['left', 'right']) {
      const g = player.gloves[side];
      if (!g.mesh.visible) { this.inside[side] = false; continue; }
      const Gp = this.group.worldToLocal(g.center.clone()), vg = g.vel.clone().applyQuaternion(gq);
      const toBag = C.clone().sub(Gp), dist = toBag.length(), dir = toBag.clone().divideScalar(Math.max(dist, 1e-4));
      // colpo partito verso la pera?
      const approach = vg.dot(dir);
      if (!this.att[side] && g.speed > 1.8 && approach > 1.3 && dist < 0.45) this.att[side] = { t: this.time, hit: false };
      const rr = RB + g.radius * 0.8;
      if (dist < rr) {
        const nrm = dir.clone().negate();                                        // dalla pera verso il guantone
        const vb = this.v.clone();
        const vn = -(vg.clone().sub(vb)).dot(nrm);
        if (!this.inside[side] && vn > 0.6) {
          const dv = (1 + E_HIT) * vn * PUNCH_MASS / (PUNCH_MASS + M);
          this.v.addScaledVector(nrm, -dv); this.v.addScaledVector(this.u, -this.v.dot(this.u));
          this.hits++; if (this.att[side]) this.att[side].hit = true; else this.att[side] = { t: this.time, hit: true };
          sfx.speedHit(Math.min(1.2, vn / 5), g.center, cam);
          player.pulse(side, Math.min(1, 0.2 + vn / 10), 25);
        }
        this.inside[side] = true;
        const push = nrm.clone().transformDirection(this.group.matrixWorld).multiplyScalar(rr - dist);  // il guantone non entra
        g.mesh.position.add(push); g.center.add(push);
      } else if (dist > rr + 0.03) this.inside[side] = false;
      // fine del tentativo: il braccio torna indietro (o si allontana) senza averla presa = a vuoto
      const A = this.att[side];
      if (A && (approach < -0.6 || dist > 0.6 || this.time - A.t > 0.7)) {
        if (!A.hit) this.misses++;
        this.att[side] = null;
      }
    }
    this._drawBoard();
  }
}
