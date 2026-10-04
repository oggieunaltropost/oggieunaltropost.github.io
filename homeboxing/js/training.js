// Allenamento al sacco pesante (in palestra). Il sacco e' un corpo rigido appeso a un gancio: pendolo sferico con
// la sua inerzia vera (45 kg, 1,30 m), si torce sulla catena, si smorza piano. I pugni gli danno un impulso come un
// urto vero (massa efficace del pugno, velocita' del guantone verso il sacco, un po' di attrito per la torsione);
// spingendolo piano lo si sposta. Il guantone non entra nel sacco: si ferma sulla superficie.
// Tabellone sul muro dietro al sacco: tempo, colpi a segno, colpo piu' forte, colpi al minuto.
// Sistema: quello del ring (arena): il giocatore sta in (0, 0, playerZ) e guarda verso -Z; il pavimento e' a 0.
import * as THREE from 'three';
import * as sfx from './sfx.js?v=20261004141415';
import { t as tr } from './i18n.js?v=20261004141415';

const M = 45, R = 0.19, H = 1.3;              // massa, raggio, altezza del sacco
const HOOK = 2.72;                             // gancio (perno)
const TOP = 0.62;                              // dal gancio al bordo alto del sacco (catena + cinghie)
const D = TOP + H / 2;                         // dal gancio al baricentro
const ICM = M * (3 * R * R + H * H) / 12;
const IB = new THREE.Vector3(ICM + M * D * D, M * R * R / 2, ICM + M * D * D);   // inerzia attorno al gancio (assi del sacco)
const G = 9.81;
const PUNCH_MASS = 2.4;                       // massa efficace di un pugno (pugno + avambraccio + spinta)
const REST = 0.15;                            // rimbalzo (il sacco e' morbido: assorbe)
const SWING_DAMP = 13, TWIST_DAMP = 0.5, TWIST_K = 2.2;

// cuoio del sacco: rosso scuro con le cuciture dei pannelli e la scritta HOME BOXING
function leather() {
  const W = 2048, Hh = 1024, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  g.fillStyle = '#5a0a0c'; g.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 26000; i++) {                                  // grana del cuoio
    const v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,190,170,0.05)';
    g.fillRect(Math.random() * W, Math.random() * Hh, 2 + Math.random() * 3, 1 + Math.random() * 2);
  }
  const sh = g.createLinearGradient(0, 0, 0, Hh); sh.addColorStop(0, 'rgba(0,0,0,0.25)'); sh.addColorStop(0.12, 'rgba(0,0,0,0)'); sh.addColorStop(0.88, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = sh; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = 'rgba(20,0,0,0.85)'; g.lineWidth = 6;              // cuciture dei 4 pannelli e degli orli
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * W / 4 + W / 8, 0); g.lineTo(k * W / 4 + W / 8, Hh); g.stroke(); }
  g.setLineDash([10, 9]); g.strokeStyle = 'rgba(230,200,150,0.55)'; g.lineWidth = 3;
  for (let k = 0; k < 4; k++) for (const s of [-12, 12]) { g.beginPath(); g.moveTo(k * W / 4 + W / 8 + s, 0); g.lineTo(k * W / 4 + W / 8 + s, Hh); g.stroke(); }
  for (const y of [40, Hh - 40]) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.setLineDash([]);
  for (const cx of [W * 0.25, W * 0.75]) {                          // scritta verticale davanti e dietro
    // (un pixel della texture e' 0,58 mm in giro e 1,27 mm in altezza: si compensa, lettere non deformate)
    g.save(); g.translate(cx, Hh / 2); g.scale(1, (2 * Math.PI * R / W) / (H / Hh)); g.rotate(-Math.PI / 2);
    g.font = '900 112px Impact, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 14; g.strokeStyle = '#1a0405'; g.strokeText('HOME BOXING', 0, 0);
    g.fillStyle = '#f2ece0'; g.fillText('HOME BOXING', 0, 0);
    g.restore();
    g.fillStyle = '#f2ece0'; g.fillRect(cx - 230, 70, 460, 14); g.fillRect(cx - 230, Hh - 84, 460, 14);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  // rilievo: grana e cuciture (mappa delle normali da una mappa d'altezza)
  const n = document.createElement('canvas'); n.width = 1024; n.height = 512; const ng = n.getContext('2d');
  const hgt = new Float32Array(1024 * 512); for (let i = 0; i < hgt.length; i++) hgt[i] = Math.random() * 0.5;
  for (let k = 0; k < 4; k++) { const x = Math.round((k * 1024 / 4 + 1024 / 8)); for (let y = 0; y < 512; y++) for (let d = -2; d <= 2; d++) hgt[y * 1024 + ((x + d + 1024) % 1024)] = -2; }
  const img = ng.createImageData(1024, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) {
    const i = y * 1024 + x, dx = hgt[y * 1024 + (x + 1) % 1024] - hgt[i], dy = hgt[Math.min(511, y + 1) * 1024 + x] - hgt[i];
    img.data[i * 4] = 128 - dx * 40; img.data[i * 4 + 1] = 128 - dy * 40; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255;
  }
  ng.putImageData(img, 0, 0);
  const nt = new THREE.CanvasTexture(n); nt.wrapS = THREE.RepeatWrapping;
  return { map: t, normalMap: nt };
}

// ---- piccole operazioni sulle matrici 3x3
const _m = new THREE.Matrix3(), _mt = new THREE.Matrix3(), _d = new THREE.Matrix3();
function worldInertia(q, diag, out) {           // R diag R^T
  _m.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
  _mt.copy(_m).transpose(); _d.set(diag.x, 0, 0, 0, diag.y, 0, 0, 0, diag.z);
  return out.copy(_m).multiply(_d).multiply(_mt);
}

export class BagTraining {
  constructor(parent) {
    this.parent = parent;
    this.group = new THREE.Group(); this.group.name = 'allenamento sacco'; this.group.visible = false;
    parent.add(this.group);
    this.pivot = new THREE.Group(); this.group.add(this.pivot);       // ruota attorno al gancio
    this._build(); this._board();
    this.q = new THREE.Quaternion(); this.w = new THREE.Vector3();
    this.Iw = new THREE.Matrix3(); this.IwInv = new THREE.Matrix3();
    this.inside = { left: false, right: false };
    this.reset();
  }

  _build() {
    const steel = new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.8, roughness: 0.35 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 1.0, roughness: 0.22 });
    // supporto: tubo che scende dal soffitto con la piastra e il gancio (fermo)
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.7 - HOOK, 12), steel); pipe.position.y = (4.7 + HOOK) / 2 + 0.06; this.group.add(pipe);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16), steel); plate.position.y = HOOK + 0.08; this.group.add(plate);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 8, 16), chrome); hook.position.y = HOOK + 0.03; this.group.add(hook);
    this.pivot.position.y = HOOK;
    // catena: anelli alternati, poi il girello e quattro cinghie fino al bordo del sacco
    const link = new THREE.TorusGeometry(0.022, 0.0055, 6, 14);
    const CH = TOP - 0.3;
    for (let k = 0; k < Math.round(CH / 0.034); k++) {
      const l = new THREE.Mesh(link, chrome); l.position.y = -0.02 - k * 0.034; l.rotation.y = k % 2 ? Math.PI / 2 : 0; l.scale.set(1, 1.35, 1); this.pivot.add(l);
    }
    const swivel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 10), chrome); swivel.position.y = -CH - 0.04; this.pivot.add(swivel);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 18), chrome); ring.rotation.x = Math.PI / 2; ring.position.y = -CH - 0.085; this.pivot.add(ring);
    const strapM = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4, top = new THREE.Vector3(0, -CH - 0.085, 0), bot = new THREE.Vector3(Math.cos(a) * (R - 0.02), -TOP, Math.sin(a) * (R - 0.02));
      const len = top.distanceTo(bot), s = new THREE.Mesh(new THREE.BoxGeometry(0.03, len, 0.004), strapM);
      s.position.copy(top).add(bot).multiplyScalar(0.5); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize());
      s.rotateY(-a); this.pivot.add(s);
      const d = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 6, 12), chrome); d.position.copy(bot).add(new THREE.Vector3(0, 0.012, 0)); d.rotation.y = -a; this.pivot.add(d);
    }
    // il sacco: profilo un po' bombato, orli arrotondati
    const pts = [[0, 0], [R * 0.75, 0.004], [R * 0.96, 0.03], [R, 0.08], [R * 1.012, H * 0.5], [R, H - 0.08], [R * 0.96, H - 0.03], [R * 0.75, H - 0.004], [0, H]]
      .map(([r, y]) => new THREE.Vector2(r, -TOP - H + y));
    const lt = leather();
    const bagMat = new THREE.MeshPhysicalMaterial({ map: lt.map, normalMap: lt.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.3, sheenColor: new THREE.Color(0x553333) });
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), bagMat); body.castShadow = true; body.rotation.y = -Math.PI / 2; this.pivot.add(body);   // scritta verso di te
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.78, R * 0.78, 0.012, 40), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })); cap.position.y = -TOP + 0.003; this.pivot.add(cap);
    const dring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 16), chrome); dring.position.y = -TOP - H - 0.025; this.pivot.add(dring);
    this.body = body;
    // ombra morbida sul pavimento (segue il sacco)
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.004; this.group.add(this.shadow);
  }

  // tabellone sul muro dietro al sacco
  _board() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; this.bc = c;
    this.btex = new THREE.CanvasTexture(c); this.btex.colorSpace = THREE.SRGBColorSpace; this.btex.anisotropy = 4;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 0.05), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.5, metalness: 0.4 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: this.btex, toneMapped: false }));
    face.position.z = 0.026; frame.add(face);
    this.board = frame; this.group.add(frame);
    this.lastDraw = '';
  }
  _drawBoard() {
    const t = Math.floor(this.time), mm = Math.floor(t / 60), ss = t % 60;
    const per = this.time > 5 ? Math.round(this.hits / (this.time / 60)) : 0;
    const key = `${mm}:${ss}|${this.hits}|${Math.round(this.best)}|${per}`;
    if (key === this.lastDraw) return; this.lastDraw = key;
    const g = this.bc.getContext('2d'), W = 1024, Hh = 512;
    g.fillStyle = '#07080a'; g.fillRect(0, 0, W, Hh);
    g.fillStyle = '#d81e2c'; g.fillRect(0, 0, W, 70);
    g.fillStyle = '#ffffff'; g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tr('bag_title'), W / 2, 36);
    const cell = (x, label, val, col) => {
      g.fillStyle = '#9aa3b6'; g.font = '700 34px system-ui, sans-serif'; g.fillText(label, x, 125);
      g.fillStyle = col; g.font = '900 150px "Courier New", monospace'; g.fillText(val, x, 245);
    };
    cell(W * 0.27, tr('bag_time'), `${mm}:${String(ss).padStart(2, '0')}`, '#ffd34d');
    cell(W * 0.73, tr('bag_hits'), String(this.hits), '#4cff7a');
    g.strokeStyle = '#2a2e36'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 340); g.lineTo(W - 40, 340); g.stroke();
    g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif';
    g.fillText(tr('bag_best'), W * 0.27, 385); g.fillText(tr('bag_rate'), W * 0.73, 385);
    g.fillStyle = '#ffffff'; g.font = '900 72px "Courier New", monospace';
    g.fillText(this.best > 0 ? `${Math.round(this.best)} km/h` : '—', W * 0.27, 455);
    g.fillText(per ? String(per) : '—', W * 0.73, 455);
    this.btex.needsUpdate = true;
  }

  // piazza il sacco davanti al giocatore (a 85 cm) e il tabellone sul muro dietro
  start(playerZ) {
    this.group.visible = true;
    this.group.position.set(0, 0, playerZ - 0.85);
    this.board.position.set(1.55, 2.6, -2.6); this.board.rotation.set(0, -0.45, 0);    // sul muro, a destra del sacco, girato verso di te
    this.reset();
  }
  stop() { this.group.visible = false; }
  reset() {
    this.q.identity(); this.w.set(0, 0, 0); this.time = 0; this.hits = 0; this.best = 0; this.lastDraw = ''; this.prevSwing = 0; this.creakT = 0;
    this._apply(); this._drawBoard();
  }
  _apply() { this.pivot.quaternion.copy(this.q); this.pivot.updateMatrixWorld(true); }

  // un passo della fisica (h secondi)
  _step(h) {
    worldInertia(this.q, IB, this.Iw);
    this.IwInv.copy(this.Iw).invert();
    const down = new THREE.Vector3(0, -D, 0).applyQuaternion(this.q);                 // dal gancio al baricentro
    const tau = new THREE.Vector3().crossVectors(down, new THREE.Vector3(0, -M * G, 0));
    // smorzamento: oscillazione e torsione separate (asse del sacco)
    const ax = new THREE.Vector3(0, 1, 0).applyQuaternion(this.q);
    const wt = ax.clone().multiplyScalar(this.w.dot(ax)), ws = this.w.clone().sub(wt);
    tau.addScaledVector(ws, -SWING_DAMP).addScaledVector(wt, -TWIST_DAMP);
    // la catena si oppone alla torsione (ritorna piano alla posizione di partenza)
    const fx = new THREE.Vector3(1, 0, 0).applyQuaternion(this.q);
    const twist = Math.atan2(-fx.z, fx.x);
    tau.addScaledVector(ax, -TWIST_K * twist);
    const L = this.w.clone().applyMatrix3(this.Iw);
    const acc = tau.sub(new THREE.Vector3().crossVectors(this.w, L)).applyMatrix3(this.IwInv);
    this.w.addScaledVector(acc, h);
    // oscillazione massima ragionevole (60 gradi)
    const dq = new THREE.Quaternion(this.w.x * h * 0.5, this.w.y * h * 0.5, this.w.z * h * 0.5, 0).multiply(this.q);
    this.q.x += dq.x; this.q.y += dq.y; this.q.z += dq.z; this.q.w += dq.w; this.q.normalize();
  }
  // impulso J (vettore, mondo-locale del gruppo) applicato nel punto p (locale del gruppo)
  _impulse(p, J) {
    const r = p.clone().sub(new THREE.Vector3(0, HOOK, 0));
    this.w.add(new THREE.Vector3().crossVectors(r, J).applyMatrix3(this.IwInv));
  }

  update(dt, player, cam) {
    if (!this.group.visible) return;
    this.time += dt;
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (let i = 0; i < n; i++) this._step(h);
    this._apply();
    worldInertia(this.q, IB, this.Iw); this.IwInv.copy(this.Iw).invert();
    const hookP = new THREE.Vector3(0, HOOK, 0);
    const axis = new THREE.Vector3(0, -1, 0).applyQuaternion(this.q);
    const A = hookP.clone().addScaledVector(axis, TOP + 0.04), B = hookP.clone().addScaledVector(axis, TOP + H - 0.04);
    // ombra sotto al sacco
    this.shadow.position.x = B.x; this.shadow.position.z = B.z;
    // guantoni: urti e spinte
    for (const side of ['left', 'right']) {
      const g = player.gloves[side];
      if (!g.mesh.visible) { this.inside[side] = false; continue; }
      const G_ = this.group.worldToLocal(g.center.clone());
      const ab = B.clone().sub(A), t = THREE.MathUtils.clamp(G_.clone().sub(A).dot(ab) / ab.lengthSq(), 0, 1);
      const Q = A.clone().addScaledVector(ab, t);
      const off = G_.clone().sub(Q), dist = off.length(), rr = R + g.radius * 0.85;
      if (dist >= rr + 0.03) { this.inside[side] = false; continue; }
      if (dist >= rr) continue;
      const nrm = dist > 1e-4 ? off.divideScalar(dist) : new THREE.Vector3(0, 0, 1);
      const p = Q.clone().addScaledVector(nrm, R);
      const r = p.clone().sub(hookP);
      const vb = new THREE.Vector3().crossVectors(this.w, r);
      const vg = g.vel.clone().applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());
      const vrel = vg.sub(vb), vn = -vrel.dot(nrm);                      // velocita' verso il sacco
      if (!this.inside[side] && vn > 0.7) {
        // urto: impulso lungo la normale (massa efficace del pugno contro l'inerzia del sacco nel punto)
        const rxn = new THREE.Vector3().crossVectors(r, nrm);
        const k = 1 / PUNCH_MASS + rxn.clone().applyMatrix3(this.IwInv).cross(r).dot(nrm);
        const J = (1 + REST) * vn / k;
        this._impulse(p, nrm.clone().multiplyScalar(-J));
        // attrito: un colpo di striscio fa girare il sacco
        const vt = vrel.clone().addScaledVector(nrm, vn);
        if (vt.length() > 0.2) this._impulse(p, vt.normalize().multiplyScalar(Math.min(0.35 * J, PUNCH_MASS * 0.5 * vt.length())));
        const kmh = vn * 3.6;
        if (vn > 1.8) { this.hits++; this.best = Math.max(this.best, kmh); }
        const wp = this.group.localToWorld(p.clone());
        sfx.bagHit(Math.min(1.5, vn / 7), wp, cam);
        player.pulse(side, Math.min(1, 0.25 + vn / 9), 35 + vn * 6);
        this.inside[side] = true;
      } else {
        // appoggio / spinta: molla morbida (si sposta il sacco spingendo)
        const pen = rr - dist;
        this._impulse(p, nrm.clone().multiplyScalar(-Math.min(900 * pen, 250) * dt));
        this.inside[side] = true;
      }
      // il guantone si ferma sulla superficie
      const push = nrm.clone().transformDirection(this.group.matrixWorld).multiplyScalar(rr - dist);
      g.mesh.position.add(push); g.center.add(push);
    }
    // scricchiolio del gancio quando il sacco oscilla forte e inverte
    const swing = this.w.x * this.w.x + this.w.z * this.w.z;
    this.creakT -= dt;
    if (swing < this.prevSwing * 0.6 && this.prevSwing > 0.15 && this.creakT <= 0) {
      sfx.bagCreak(Math.min(1, this.prevSwing / 1.2), this.group.localToWorld(hookP.clone()), cam); this.creakT = 0.5;
    }
    this.prevSwing = swing;
    this._drawBoard();
  }
}
