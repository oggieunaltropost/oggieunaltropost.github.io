// Allenamento allo spago (slip line): uno spago teso in mezzo al ring, legato a due paletti con la base pesante,
// che corre nella direzione in cui guardi. Ci passi sotto da una parte all'altra piegando le gambe e rollando col
// busto (colpire o no e' una tua scelta): ogni passaggio pulito vale uno. Se lo passi con la testa troppo alta lo
// spago ti tocca, si piega e il passaggio non conta.
// L'altezza si regola con la barra al tuo fianco (guantone sul pomello e trascina): al massimo 20 cm sopra le spalle, al minimo
// la cintura. Si parte dal massimo.
// Sistema: quello del ring (arena), pavimento a 0, il giocatore in (0, 0, playerZ) guarda verso -Z.
import * as THREE from 'three';
import * as sfx from './sfx.js?v=20261006200731';
import { t as tr } from './i18n.js?v=20261006200731';

const N = 40, ROPE_R = 0.0075, HEAD_R = 0.115, SIDE = 0.11;
const RX = -0.3;                  // lo spago passa 30 cm alla tua sinistra: si parte da un lato

export class SlipLineTraining {
  constructor(parent) {
    this.parent = parent;
    this.group = new THREE.Group(); this.group.name = 'allenamento spago'; this.group.visible = false; parent.add(this.group);
    const steel = new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.7, roughness: 0.4 });
    const red = new THREE.MeshStandardMaterial({ color: 0xb3121b, roughness: 0.45 });
    // paletti: colonna, base tonda pesante, morsetto rosso dove e' legato lo spago (sale e scende con l'altezza)
    this.posts = [0, 1].map(() => {
      const G = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 28), steel); base.position.y = 0.025; G.add(base);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 12), steel); G.add(pole);
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), red); G.add(clamp);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 8), red); G.add(cap);
      this.group.add(G); return { G, pole, clamp, cap };
    });
    this.rope = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0xffd84a, roughness: 0.7, emissive: 0x3a2a00 }));
    this.rope.frustumCulled = false; this.group.add(this.rope);
    this.disp = Array.from({ length: N + 1 }, () => new THREE.Vector3());       // quanto e' spostato ogni punto (si rilassa)
    this.vel = Array.from({ length: N + 1 }, () => new THREE.Vector3());
    this._board(); this._slider();
    try { this.p = parseFloat(localStorage.getItem('hb-slip-p')); } catch (e) {}
    if (!(this.p >= 0 && this.p <= 1)) this.p = 1;                       // si parte alle spalle
  }

  // ---- tabellone
  _board() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; this.bc = c;
    this.btex = new THREE.CanvasTexture(c); this.btex.colorSpace = THREE.SRGBColorSpace;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.78, 0.05), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.5, metalness: 0.4 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.71), new THREE.MeshBasicMaterial({ map: this.btex, toneMapped: false })); face.position.z = 0.026; frame.add(face);
    this.board = frame; this.group.add(frame); this.lastDraw = '';
  }
  _drawBoard() {
    const t = Math.floor(this.time), mm = Math.floor(t / 60), ss = t % 60;
    const key = `${mm}:${ss}|${this.passes}|${this.touches}|${this.best}|${this.streak}`;
    if (key === this.lastDraw) return; this.lastDraw = key;
    const g = this.bc.getContext('2d'), W = 1024, H = 512;
    g.fillStyle = '#07080a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#2e7a3a'; g.fillRect(0, 0, W, 70);
    g.fillStyle = '#fff'; g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tr('slip_title'), W / 2, 36);
    const cell = (x, label, val, col, big = 130) => {
      g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif'; g.fillText(label, x, 120);
      g.fillStyle = col; g.font = `900 ${big}px "Courier New", monospace`; g.fillText(val, x, 230);
    };
    cell(W / 6, tr('bag_time'), `${mm}:${String(ss).padStart(2, '0')}`, '#ffd34d', 110);
    cell(W / 2, tr('slip_pass'), String(this.passes), '#4cff7a');
    cell(W * 5 / 6, tr('slip_touch'), String(this.touches), '#ff5a5a');
    g.strokeStyle = '#2a2e36'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 335); g.lineTo(W - 40, 335); g.stroke();
    g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif';
    g.fillText(tr('rope_streak'), W * 0.3, 385); g.fillText(tr('rope_best'), W * 0.7, 385);
    g.fillStyle = '#ffffff'; g.font = '900 72px "Courier New", monospace';
    g.fillText(String(this.streak), W * 0.3, 455); g.fillText(String(this.best), W * 0.7, 455);
    this.btex.needsUpdate = true;
  }

  // ---- barra dell'altezza (come quella della velocita' nello sparring)
  _slider() {
    const G = new THREE.Group(); G.visible = false;
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.6 })); G.add(track);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.037, 1, 0.022), new THREE.MeshBasicMaterial({ color: 0x4cff7a })); G.add(fill);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3 })); G.add(knob);
    const c = document.createElement('canvas'); c.width = 320; c.height = 96; this.sc = c;
    this.stex = new THREE.CanvasTexture(c); this.stex.colorSpace = THREE.SRGBColorSpace;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.075), new THREE.MeshBasicMaterial({ map: this.stex, transparent: true, depthWrite: false })); lab.position.y = 0.31; G.add(lab);
    this.slider = { G, knob, fill, grab: null, hover: 0, last: '' };
    this.group.add(G);
  }
  _drawSlider() {
    const txt = `${tr('slip_h')} ${Math.round(this.ropeY() * 100)} cm`;
    if (txt === this.slider.last) return; this.slider.last = txt;
    const g = this.sc.getContext('2d'); g.clearRect(0, 0, 320, 96);
    g.fillStyle = 'rgba(10,12,16,0.85)'; g.beginPath(); g.roundRect(0, 0, 320, 96, 20); g.fill();
    g.fillStyle = '#fff'; g.font = '800 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 160, 48);
    this.stex.needsUpdate = true;
  }
  _layoutSlider() {
    const S = this.slider, y = -0.25 + 0.5 * this.p;
    S.knob.position.set(0, y, 0.02); S.fill.scale.y = Math.max(0.001, 0.5 * this.p); S.fill.position.y = -0.25 + 0.25 * this.p;
    this._drawSlider(); this._placePosts();
  }
  _updSlider(dt, player) {
    const S = this.slider;
    S.G.updateMatrixWorld(true);
    const kw = S.knob.getWorldPosition(new THREE.Vector3());
    if (S.grab) {
      const g = player.gloves[S.grab];
      if (!g.mesh.visible) { S.grab = null; return; }
      const loc = S.G.worldToLocal(g.center.clone());
      if (Math.hypot(loc.x, loc.z) > 0.2) { S.grab = null; S.knob.material.color.set(0xf2f2f2); return; }   // allontani la mano: lasciato
      this.p = THREE.MathUtils.clamp((loc.y + 0.25) / 0.5, 0, 1);
      this._layoutSlider();
      S.still = g.speed < 0.05 ? (S.still || 0) + dt : 0;
      if (S.still > 0.8) { S.grab = null; S.knob.material.color.set(0xf2f2f2); try { localStorage.setItem('hb-slip-p', this.p.toFixed(3)); } catch (e) {} }
      return;
    }
    let near = null;
    for (const side of ['left', 'right']) { const g = player.gloves[side]; if (g.mesh.visible && g.center.distanceTo(kw) < 0.08) near = side; }
    S.hover = near ? S.hover + dt : 0;
    S.knob.material.color.set(near ? 0xffd34d : 0xf2f2f2);
    if (near && S.hover > 0.35) { S.grab = near; S.hover = 0; S.still = 0; sfx.punchBlock(); }
  }

  // altezza dello spago: dalla cintura (p = 0) alle spalle (p = 1), misurate dalla tua altezza da in piedi
  // in alto 20 cm sopra le spalle (richiesta utente), in basso la cintura
  ropeY() { const eye = this.eye || 1.6; const top = eye + 0.01, low = eye * 0.6; return low + (top - low) * this.p; }
  _placePosts() {
    const y = this.ropeY();
    this.posts.forEach((P, k) => {
      const z = k ? this.z1 : this.z0;
      P.G.position.set(0, 0, z);
      const h = y + 0.1; P.pole.scale.y = h; P.pole.position.y = h / 2; P.clamp.position.y = y; P.cap.position.y = h;
    });
  }

  // ---- inizio / fine
  start(playerZ, headY, ringSize) {
    this.group.visible = true; this.group.position.set(RX, 0, 0);
    this.eye = THREE.MathUtils.clamp(headY || 1.6, 1.3, 2.05);
    const half = Math.max(1.2, (ringSize || 3.2) / 2 - 0.3);
    this.z0 = Math.min(half, playerZ + 1.0); this.z1 = Math.max(-half, playerZ - 1.9);    // da dietro di te fino in fondo al ring
    this.board.position.set(-RX, 2.3, this.z1 - 0.9); this.board.rotation.set(0, 0, 0);
    this.slider.G.position.set(0.75 - RX, 1.15, playerZ - 0.45);
    this.group.updateMatrixWorld(true); this.slider.G.lookAt(this.group.localToWorld(new THREE.Vector3(-RX, 1.15, playerZ + 0.3)));
    this.slider.G.visible = true;
    this._layoutSlider();
    this.reset();
  }
  stop() { this.group.visible = false; this.slider.G.visible = false; }
  reset() {
    this.time = 0; this.passes = 0; this.touches = 0; this.streak = 0; this.best = 0; this.lastDraw = '';
    this.side = 0; this.minTop = 9; this.touched = false;
    for (const d of this.disp) d.set(0, 0, 0); for (const v of this.vel) v.set(0, 0, 0);
    this._drawBoard(); this._tube();
  }

  update(dt, player, cam) {
    if (!this.group.visible) return;
    this.time += dt;
    this._updSlider(dt, player);
    const H = this.group.worldToLocal(player.head.clone());
    const y = this.ropeY(), inZ = H.z < this.z0 - 0.1 && H.z > this.z1 + 0.1;
    // la testa contro lo spago: lo spinge via (lo spago "gira attorno" alla testa e poi torna dritto, oscillando)
    const t = THREE.MathUtils.clamp((H.z - this.z0) / (this.z1 - this.z0), 0, 1), k0 = t * N;
    const sag = s => 0.015 * Math.sin(Math.PI * s);
    let hit = false;
    for (let i = 0; i <= N; i++) {
      const s = i / N, z = this.z0 + (this.z1 - this.z0) * s;
      const D = this.disp[i], V = this.vel[i];
      const P = new THREE.Vector3(D.x, y - sag(s) + D.y, 0);
      const w = Math.max(0, 1 - Math.abs(i - k0) / (N * 0.22)) * Math.sin(Math.PI * s);     // (vicino ai paletti non si muove)
      const d = new THREE.Vector3(P.x - H.x, P.y - H.y, 0), L = d.length();
      if (inZ && w > 0 && L < HEAD_R + ROPE_R) {
        if (L < 1e-4) d.set(0, 1, 0); else d.divideScalar(L);
        const push = (HEAD_R + ROPE_R - L) * w;
        D.x += d.x * push; D.y += d.y * push; V.multiplyScalar(0.5);
        if (Math.abs(i - k0) < 2) hit = true;
      }
      // molla verso la posizione tesa + smorzamento
      V.x += (-160 * D.x - 6 * V.x) * dt; V.y += (-160 * D.y - 6 * V.y) * dt;
      D.addScaledVector(V, dt);
    }
    this._tube();
    // passaggi: la testa va da un lato all'altro dello spago; conta se la cima della testa e' rimasta sotto
    const top = H.y + 0.1;
    if (inZ && Math.abs(H.x) < SIDE) { this.minTop = Math.min(this.minTop, top); if (hit) this.touched = true; }
    const s = H.x > SIDE ? 1 : H.x < -SIDE ? -1 : 0;
    if (s !== 0) {
      if (this.side !== 0 && s !== this.side && inZ) {
        const feet = this.group.localToWorld(new THREE.Vector3(0, y, H.z));
        if (!this.touched && this.minTop < y + 0.02) {
          this.passes++; this.streak++; this.best = Math.max(this.best, this.streak); sfx.whoosh();
        } else {
          this.touches++; this.streak = 0; sfx.ropeTrip(feet, cam);
          player.pulse('left', 0.5, 50); player.pulse('right', 0.5, 50);
        }
      }
      this.side = s; this.minTop = 9; this.touched = false;
    }
    this._drawBoard();
  }

  _tube() {
    const y = this.ropeY(), pts = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, D = this.disp[i];
      pts.push(new THREE.Vector3(D.x, y - 0.015 * Math.sin(Math.PI * s) + D.y, this.z0 + (this.z1 - this.z0) * s));
    }
    this.rope.geometry.dispose();
    this.rope.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, ROPE_R, 6, false);
  }
}
