// Allenamento con la corda (in palestra). Niente guantoni: le mani hanno le fasce e tengono due manopole con una
// corda di cuoio. La corda gira attorno alla retta tra le mani con una fisica semplice ma vera: i polsi (rotazione
// del controller/mano attorno a quella retta, piu' il cerchietto che fanno le mani) la spingono, la gravita' la tira
// giu': se giri troppo piano non passa sopra la testa e ricade. Avanti o indietro secondo il verso dei polsi.
// Quando passa sotto i piedi: se eri in aria (la testa sopra la tua altezza da fermo) e' un salto, altrimenti la
// corda si ferma sulle caviglie: errore.
// Sistema: quello del ring (arena), pavimento a 0, il giocatore in (0, 0, playerZ) guarda verso -Z.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as sfx from './sfx.js?v=20261010135749';
import { t as tr } from './i18n.js?v=20261010135749';

const SEG = 48, RAD = 6, ROPE_R = 0.0055;
const G = 9.81, DRAG = 0.35;
const DRIVE_K = 9;                // quanto i polsi "tengono" la corda
const SPIN_MIN = 2.6;             // sotto questa velocita' (rad/s) la corda non sta girando davvero
const JUMP_H = 0.045;             // la testa sale di almeno 4,5 cm sopra l'altezza da fermo = sei in aria
const JUMP_V = 0.35;              // ...e ci arriva con una spinta vera verso l'alto (m/s), non abbassando/alzando la testa

function wrapTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#eeebe3'; g.fillRect(0, 0, 256, 256);                      // fasce bianche
  g.strokeStyle = 'rgba(90,85,75,0.35)'; g.lineWidth = 4;
  for (let k = -256; k < 512; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 120, 256); g.stroke(); }   // giri della fascia
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2;
  for (let k = -256; k < 512; k += 22) { g.beginPath(); g.moveTo(k + 6, 0); g.lineTo(k + 126, 256); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export class RopeTraining {
  constructor(parent, scene) {
    this.parent = parent; this.scene = scene;
    this.group = new THREE.Group(); this.group.name = 'allenamento corda'; this.group.visible = false; parent.add(this.group);
    // corda: tubo aggiornato a ogni fotogramma
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array((SEG + 1) * RAD * 3); this.nrm = new Float32Array((SEG + 1) * RAD * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3));
    const idx = [];
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = i * RAD + j, b = i * RAD + (j + 1) % RAD, c = a + RAD, d = b + RAD; idx.push(a, c, b, b, c, d);
    }
    geo.setIndex(idx);
    this.rope = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a3018, roughness: 0.55, metalness: 0.0 }));
    this.rope.frustumCulled = false; this.group.add(this.rope);
    this.pts = Array.from({ length: SEG + 1 }, () => new THREE.Vector3());
    // manopole (legno scuro con il cuoio) e fasce sulle mani: nella scena, seguono le mani
    this.hands = {};
    const wood = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.45 }), tape = new THREE.MeshStandardMaterial({ map: wrapTexture(), roughness: 0.85 });
    for (const side of ['left', 'right']) {
      const handle = new THREE.Group();
      const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.16, 12), wood); handle.add(hb);
      for (const y of [-0.05, 0, 0.05]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0165, 0.002, 6, 16), wood); r.rotation.x = Math.PI / 2; r.position.y = y; handle.add(r); }
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), wood); cap.position.y = 0.08; handle.add(cap);
      const wrap = new THREE.Group();                                        // pugno fasciato + polso
      const fist = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), tape); fist.scale.set(0.047, 0.04, 0.055); fist.position.z = -0.075; wrap.add(fist);
      const knuck = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.05, 4, 10), tape); knuck.rotation.z = Math.PI / 2; knuck.position.set(0, 0.012, -0.115); wrap.add(knuck);
      const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.035, 0.09, 16), tape); wrist.rotation.x = Math.PI / 2; wrist.position.z = 0.0; wrap.add(wrist);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0xc89272, roughness: 0.6 }));
      arm.rotation.x = Math.PI / 2; arm.position.z = 0.1; wrap.add(arm);
      handle.visible = wrap.visible = false; scene.add(handle); scene.add(wrap);
      this.hands[side] = { handle, wrap, prevQ: new THREE.Quaternion(), center: new THREE.Vector3(), prevP: new THREE.Vector3(), init: false, rate: 0 };
    }
    this._board();
    // mani vere fasciate con la manopola (blender/create_hands.py): appena caricate prendono il posto di quelle semplici
    new GLTFLoader().load('assets/mani_fasce.glb?v=20261010135749', g => {
      for (const [side, nm] of [['right', 'mano_d'], ['left', 'mano_s']]) {
        const node = g.scene.getObjectByName(nm); if (!node) continue;
        node.removeFromParent(); node.position.set(0, 0, 0); node.quaternion.identity();
        node.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material.map) o.material.map.anisotropy = 4; } });
        const H = this.hands[side];
        node.visible = H.wrap.visible; scene.add(node);
        H.real = node; node.traverse(o => { if (o !== node && /^punta/.test(o.name)) H.tip = o; });
        H.wrap.visible = H.handle.visible = false;
      }
    });
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
    const key = `${mm}:${ss}|${this.jumps}|${this.errors}|${this.streak}|${this.best}`;
    if (key === this.lastDraw) return; this.lastDraw = key;
    const g = this.bc.getContext('2d'), W = 1024, H = 512;
    g.fillStyle = '#07080a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1f6f8a'; g.fillRect(0, 0, W, 70);
    g.fillStyle = '#fff'; g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tr('rope_title'), W / 2, 36);
    const cell = (x, label, val, col, big = 130) => {
      g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif'; g.fillText(label, x, 120);
      g.fillStyle = col; g.font = `900 ${big}px "Courier New", monospace`; g.fillText(val, x, 230);
    };
    cell(W / 6, tr('bag_time'), `${mm}:${String(ss).padStart(2, '0')}`, '#ffd34d', 110);
    cell(W / 2, tr('rope_jumps'), String(this.jumps), '#4cff7a');
    cell(W * 5 / 6, tr('rope_errors'), String(this.errors), '#ff5a5a');
    g.strokeStyle = '#2a2e36'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 335); g.lineTo(W - 40, 335); g.stroke();
    g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif';
    g.fillText(tr('rope_streak'), W * 0.3, 385); g.fillText(tr('rope_best'), W * 0.7, 385);
    g.fillStyle = '#fff'; g.font = '900 76px "Courier New", monospace';
    g.fillText(String(this.streak), W * 0.3, 455); g.fillText(String(this.best), W * 0.7, 455);
    this.btex.needsUpdate = true;
  }

  start(playerZ) {
    this.group.visible = true;
    this.board.position.set(0, 2.35, playerZ - 3.5); this.board.rotation.set(0, 0, 0);
    for (const h of Object.values(this.hands)) { if (h.real) h.real.visible = true; else h.handle.visible = h.wrap.visible = true; h.init = false; }
    this.reset();
  }
  stop() {
    this.group.visible = false;
    for (const h of Object.values(this.hands)) { h.handle.visible = h.wrap.visible = false; if (h.real) h.real.visible = false; }
    sfx.ropeWhooshStop();
  }
  reset() {
    this.phi = -0.6; this.w = 0; this.time = 0; this.jumps = 0; this.errors = 0; this.streak = 0; this.best = 0;
    this.stuck = 0; this.base = null; this.airT = -9; this.prevH = null; this.vy = 0; this.pushT = -9; this.psi = null; this.lastFloor = 0; this.lastDraw = ''; this.spinning = false;
    this._drawBoard();
  }

  // pose delle mani: manopola nel pugno, fasce attorno; restituisce la punta (dove esce la corda), in coordinate arena
  _hand(side, g, handsMode) {
    const H = this.hands[side], q = g.mesh.quaternion, p = g.mesh.position;
    if (H.real) {                                     // mano vera: segue il polso, la corda esce dalla punta della manopola
      H.real.position.copy(p); H.real.quaternion.copy(q); H.real.updateMatrixWorld(true);
      return this.parent.worldToLocal(H.tip.getWorldPosition(new THREE.Vector3()));
    }
    H.wrap.position.copy(p); H.wrap.quaternion.copy(q);
    // asse della manopola: con il controller lungo il "davanti" del controller, con le mani di traverso nel pugno
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q), lat = new THREE.Vector3(side === 'left' ? 1 : -1, 0, 0).applyQuaternion(q);
    let ax = handsMode ? lat : fwd.clone().add(new THREE.Vector3(0, 1, 0).applyQuaternion(q).multiplyScalar(0.25)).normalize();
    if (ax.y < -0.2) ax.negate();
    const c = g.center.clone();
    H.handle.position.copy(c); H.handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax);
    return this.parent.worldToLocal(c.addScaledVector(ax, 0.085));
  }

  update(dt, player, cam, floorY) {
    if (!this.group.visible) return;
    this.time += dt;
    const handsMode = player.mode === 'mani';
    const L = this._hand('left', player.gloves.left, handsMode), Rr = this._hand('right', player.gloves.right, handsMode);
    // asse di rotazione: dalla mano sinistra alla destra, orizzontale
    const A = Rr.clone().sub(L); A.y = 0; if (A.lengthSq() < 1e-4) A.set(1, 0, 0); A.normalize();
    const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3().crossVectors(up, A);    // davanti al giocatore
    // velocita' di rotazione dei polsi attorno all'asse (rotazione della mano + cerchietto che fa la mano)
    let drive = 0, n = 0;
    for (const side of ['left', 'right']) {
      const g = player.gloves[side], H = this.hands[side];
      if (!g.mesh.visible && !g.active) continue;
      const q = g.mesh.quaternion, P = this.parent.worldToLocal(g.center.clone());
      if (!H.init) { H.prevQ.copy(q); H.center.copy(P); H.prevP.copy(P); H.init = true; continue; }
      const dq = q.clone().multiply(H.prevQ.clone().invert()); if (dq.w < 0) { dq.x = -dq.x; dq.y = -dq.y; dq.z = -dq.z; dq.w = -dq.w; }
      const ang = 2 * Math.acos(Math.min(1, dq.w)), s = Math.sqrt(Math.max(1e-9, 1 - dq.w * dq.w));
      const wr = ang / Math.max(dt, 1e-3) * (new THREE.Vector3(dq.x / s, dq.y / s, dq.z / s).dot(A));
      H.center.lerp(P, Math.min(1, dt * 2.5));                                // centro del cerchietto (media lenta)
      const r = P.clone().sub(H.center), v = P.clone().sub(H.prevP).divideScalar(Math.max(dt, 1e-3));
      r.addScaledVector(A, -r.dot(A)); v.addScaledVector(A, -v.dot(A));
      const wc = r.lengthSq() > 0.0009 ? new THREE.Vector3().crossVectors(r, v).dot(A) / r.lengthSq() : 0;
      const w = Math.abs(wr) > Math.abs(wc) ? wr : wc;
      H.rate += (THREE.MathUtils.clamp(w, -25, 25) - H.rate) * Math.min(1, dt * 12);
      H.prevQ.copy(q); H.prevP.copy(P);
      drive += H.rate; n++;
    }
    drive = n ? drive / n : 0;
    if (this.debugDrive !== undefined) drive = this.debugDrive;
    // raggio del giro: la corda tocca terra sotto e passa sopra la testa
    const mid = L.clone().add(Rr).multiplyScalar(0.5);
    const R = THREE.MathUtils.clamp(mid.y + 0.04, 0.8, 1.3);
    // fisica: gravita' (vuole la corda in basso), polsi (la tirano alla loro velocita'), aria
    const wasBelow = Math.cos(this.phi) > 0;
    const prevPhi = this.phi;
    if (this.stuck > 0) { this.stuck -= dt; this.w = 0; this.phi = 0; }
    else {
      const k = Math.abs(drive) > 1.2 ? DRIVE_K : 1.5;
      const acc = -(G / R) * Math.sin(this.phi) + k * (drive - this.w) - DRAG * this.w;
      this.w += acc * dt; this.phi += this.w * dt;
    }
    // salto: la testa sopra l'altezza da fermo
    const h = player.head.y - floorY;
    if (this.base === null) this.base = h;
    if (this.prevH === null) this.prevH = h;
    this.vy += ((h - this.prevH) / Math.max(dt, 1e-3) - this.vy) * Math.min(1, dt * 20); this.prevH = h;
    if (this.vy > JUMP_V) this.pushT = this.time;                       // stacco: la testa sale veloce
    const air = h > this.base + JUMP_H && this.time - this.pushT < 0.45;
    if (air) this.airT = this.time;
    // l'altezza da fermo si aggiorna solo quando la testa e' quasi immobile (non durante il piegamento o il salto)
    else if (Math.abs(this.vy) < 0.12 && h < this.base + 0.02) this.base += (h - this.base) * Math.min(1, dt * 0.8);
    // passaggio sotto i piedi (phi attraversa 0, corda in basso)
    const crossed = Math.floor(prevPhi / (2 * Math.PI)) !== Math.floor(this.phi / (2 * Math.PI)) && wasBelow;
    const spinning = Math.abs(this.w) > SPIN_MIN;
    if (crossed && spinning) {
      const feet = this.parent.localToWorld(new THREE.Vector3(mid.x, 0.02, mid.z));
      if (this.time - this.airT < 0.12) {
        this.jumps++; this.streak++; this.best = Math.max(this.best, this.streak);
        sfx.ropeSlap(Math.abs(this.w) / 12, feet, cam);
      } else {
        this.errors++; this.streak = 0; this.stuck = 0.6; this.phi = 0; this.w = 0;
        sfx.ropeTrip(feet, cam);
        player.pulse('left', 0.6, 60); player.pulse('right', 0.6, 60);
      }
    } else if (crossed && Math.abs(this.w) > 1.2) sfx.ropeSlap(0.25, this.parent.localToWorld(new THREE.Vector3(mid.x, 0.02, mid.z)), cam);
    // forma: arco tra le due punte, il centro un po' in ritardo (la corda "insegue" le mani), mai sotto il pavimento
    const lag = THREE.MathUtils.clamp(this.w / 14, -1, 1) * 0.28;
    const slack = 1 - THREE.MathUtils.clamp(Math.abs(this.w) / 5, 0, 1);       // ferma: pende morbida e appoggia a terra
    if (!this.psi || this.stuck > 0) this.psi = Array.from({ length: SEG + 1 }, () => this.phi);
    const spin = THREE.MathUtils.clamp(Math.abs(this.w) / 10, 0, 1);
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG, s = Math.sin(Math.PI * t);
      const target = this.phi - lag * s;
      this.psi[i] += (target - this.psi[i]) * Math.min(1, dt * (34 - 22 * s));     // il centro arriva dopo: la corda ondeggia
      const psi = this.psi[i];
      const dir = new THREE.Vector3().addScaledVector(up, -Math.cos(psi)).addScaledVector(fwd, Math.sin(psi));
      // in alto, se gira piano, la gravita' la schiaccia un po'; girando forte si tende (forza centrifuga)
      const top = Math.max(0, -Math.cos(psi));
      const rad = R * Math.pow(s, 0.7) * (1 + 0.12 * slack) * (1 - 0.18 * (1 - spin) * top * s) * (0.97 + 0.03 * spin);
      const p = this.pts[i].copy(L).lerp(Rr, t).addScaledVector(dir, rad);
      p.y -= 0.06 * (1 - spin) * s * s * top;
      if (p.y < 0.006) p.y = 0.006;
    }
    this._tube();
    // fruscio
    const lvl = THREE.MathUtils.clamp((Math.abs(this.w) - 2) / 12, 0, 1);
    sfx.ropeWhoosh(lvl, Math.abs(Math.sin(this.phi)));
    this._drawBoard();
  }

  _tube() {
    const P = this.pts, pos = this.pos, nrm = this.nrm;
    let prevN = null;
    for (let i = 0; i <= SEG; i++) {
      const T = P[Math.min(SEG, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize();
      let N = prevN ? prevN.clone().addScaledVector(T, -prevN.dot(T)) : new THREE.Vector3(0, 1, 0).addScaledVector(T, -T.y);
      if (N.lengthSq() < 1e-6) N = new THREE.Vector3(1, 0, 0).addScaledVector(T, -T.x);
      N.normalize(); prevN = N;
      const B = new THREE.Vector3().crossVectors(T, N);
      for (let j = 0; j < RAD; j++) {
        const a = j / RAD * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), k = (i * RAD + j) * 3;
        const nx = N.x * c + B.x * s, ny = N.y * c + B.y * s, nz = N.z * c + B.z * s;
        pos[k] = P[i].x + nx * ROPE_R; pos[k + 1] = P[i].y + ny * ROPE_R; pos[k + 2] = P[i].z + nz * ROPE_R;
        nrm[k] = nx; nrm[k + 1] = ny; nrm[k + 2] = nz;
      }
    }
    this.rope.geometry.attributes.position.needsUpdate = true; this.rope.geometry.attributes.normal.needsUpdate = true;
    this.rope.geometry.computeBoundingSphere();
  }
}
