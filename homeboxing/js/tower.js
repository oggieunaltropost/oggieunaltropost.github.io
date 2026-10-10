// Modalita' Sopravvivenza: la torre. Un piano per ogni avversario (dal basso), tu a destra del piano che devi
// conquistare. Dopo una vittoria il tuo gettone sale al piano sopra con scia, lampo e suono; in cima la corona.
import * as THREE from 'three';
import { t } from './i18n.js?v=20261010190640';

const W = 1024, H = 1600;                    // tela
const PW = 0.9, PH = PW * H / W;             // pannello in metri
const TOP = 420, BOTTOM = H - 80;            // fascia dei piani (px)
const VIS = 8;                               // piani visibili insieme: con tanti avversari la torre scorre verso l'alto

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

export class TowerView {
  constructor(scene, fighters) {
    this.fighters = fighters;
    this.group = new THREE.Group(); this.group.name = 'torre'; this.group.visible = false;
    scene.add(this.group);
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, toneMapped: false }));
    board.renderOrder = 1100; this.group.add(board);
    // cornice che pulsa sul piano da conquistare
    this.hl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this._glowTex(), transparent: true, depthTest: false, toneMapped: false }));
    this.hl.renderOrder = 1101; this.hl.visible = false; this.group.add(this.hl);
    // il tuo gettone, la sua scia e il lampo d'arrivo
    // (gettone piu' piccolo del riquadro del piano: resta dentro con un po' di margine)
    this.token = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.0675), new THREE.MeshBasicMaterial({ map: this._tokenTex(), transparent: true, depthTest: false, toneMapped: false }));
    this.token.renderOrder = 1104; this.group.add(this.token);
    const halo = this._haloTex();
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthTest: false, toneMapped: false, opacity: 0, blending: THREE.AdditiveBlending }));
    this.flash.renderOrder = 1103; this.group.add(this.flash);
    this.trail = Array.from({ length: 14 }, () => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthTest: false, toneMapped: false, opacity: 0, blending: THREE.AdditiveBlending }));
      m.renderOrder = 1102; this.group.add(m); return { m, t: 0 };
    });
    this.crownGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthTest: false, toneMapped: false, opacity: 0, blending: THREE.AdditiveBlending }));
    this.crownGlow.renderOrder = 1099; this.group.add(this.crownGlow);
    this.time = 0; this.anim = null; this.S = null;
    this.faces = {};
    for (const [id, f] of Object.entries(fighters)) { const im = new Image(); im.src = f.thumb; im.onload = () => this.draw(); this.faces[id] = im; }
  }
  _lx(px) { return (px / W - 0.5) * PW; }
  _ly(py) { return (0.5 - py / H) * PH; }
  // primo piano visibile: un paio sotto quello da conquistare (gli altri piu' in basso escono dalla vista)
  base() { const S = this.S; if (!S) return 0; const n = S.order.length; return n <= VIS ? 0 : Math.max(0, Math.min(n - VIS, (this.focus ?? S.idx) - 2)); }
  floorY(i) { const n = this.S ? Math.min(VIS, this.S.order.length) : 8; return n <= 1 ? BOTTOM : BOTTOM - (i - this.base()) * (BOTTOM - TOP) / (n - 1); }
  crownY() { return 270; }
  _glowTex() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    g.shadowColor = '#ffd34d'; g.shadowBlur = 22; g.strokeStyle = '#ffd34d'; g.lineWidth = 8;
    rr(g, 20, 20, 472, 88, 16); g.stroke(); g.stroke();
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  _haloTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 6, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,240,160,1)'); gr.addColorStop(0.35, 'rgba(255,200,60,0.6)'); gr.addColorStop(1, 'rgba(255,160,20,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  _tokenTex() {
    const c = document.createElement('canvas'); c.width = 448; c.height = 200; const g = c.getContext('2d');
    g.shadowColor = 'rgba(255,60,60,0.9)'; g.shadowBlur = 24;
    rr(g, 18, 18, 412, 164, 30); g.fillStyle = '#c4161f'; g.fill();
    g.shadowBlur = 0; g.lineWidth = 8; g.strokeStyle = '#ffd34d'; g.stroke();
    g.fillStyle = '#ffffff'; g.font = '900 104px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('🥊 ' + t('you'), 224, 104);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  _face(g, id, cx, cy, r, beaten) {
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath(); g.fillStyle = '#3a404c'; g.fill(); g.clip();
    const im = this.faces[id], f = this.fighters[id];
    if (im && im.complete && im.naturalWidth) { const [fx, fy, fs] = f.face; g.drawImage(im, fx, fy, fs, fs, cx - r, cy - r, 2 * r, 2 * r); }
    if (beaten) { g.fillStyle = 'rgba(10,10,14,0.55)'; g.fillRect(cx - r, cy - r, 2 * r, 2 * r); }
    g.restore();
    g.lineWidth = 4; g.strokeStyle = beaten ? '#555c6b' : '#ffc928'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    if (beaten) {                                   // sconfitto: croce rossa
      g.strokeStyle = '#e5484d'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - r * 0.6, cy - r * 0.6); g.lineTo(cx + r * 0.6, cy + r * 0.6);
      g.moveTo(cx + r * 0.6, cy - r * 0.6); g.lineTo(cx - r * 0.6, cy + r * 0.6); g.stroke();
    }
  }
  draw(climbing = null) {
    const S = this.S; if (!S) return;
    const g = this.canvas.getContext('2d'), n = S.order.length;
    this.focus = this.intro ? this.intro.focus : climbing ? climbing.from + 1 : S.idx;      // (in salita la torre e' gia' inquadrata sull'arrivo: niente scatto alla fine)
    const b0 = this.base(), showTop = b0 + VIS >= n;
    g.clearRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, 'rgba(18,14,30,0.97)'); bg.addColorStop(1, 'rgba(6,8,12,0.97)');
    rr(g, 6, 6, W - 12, H - 12, 34); g.fillStyle = bg; g.fill();
    const gold = g.createLinearGradient(0, 0, W, H); gold.addColorStop(0, '#fff1a8'); gold.addColorStop(0.4, '#ffc928'); gold.addColorStop(1, '#d99a14');
    g.lineWidth = 9; g.strokeStyle = gold; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd34d'; g.font = '900 70px system-ui, sans-serif'; g.fillText(t('sv_title'), W / 2, 70);
    g.fillStyle = '#e6e8ee'; let fs = 36; const sub = this.subtitle || '';
    do { g.font = `700 ${fs}px system-ui, sans-serif`; fs -= 2; } while (g.measureText(sub).width > W - 90 && fs > 16);
    g.fillText(sub, W / 2, 130);
    // la torre: corpo con le finestre, un piano per avversario
    const tx0 = 120, tx1 = W - 120;
    g.fillStyle = '#151924'; g.fillRect(tx0, TOP - 70, tx1 - tx0, BOTTOM - TOP + 120);
    g.strokeStyle = '#2c3242'; g.lineWidth = 4; g.strokeRect(tx0, TOP - 70, tx1 - tx0, BOTTOM - TOP + 120);
    // merli in cima e corona
    if (showTop) {                                   // la cima (merli e corona) solo quando si vede l'ultimo piano
      for (let x = tx0; x < tx1; x += 70) { g.fillStyle = '#151924'; g.fillRect(x, TOP - 105, 44, 40); }
      this._crown(g, W / 2, this.crownY(), S.state === 'champion');
    } else { g.fillStyle = '#8a93a6'; g.font = '900 60px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('▲ ▲ ▲', W / 2, TOP - 60); }
    const reached = climbing ? climbing.from + 1 : S.idx;       // piani gia' conquistati
    // (durante lo scorrimento iniziale b0 non e' intero: i piani che escono dalla torre vengono tagliati)
    g.save(); g.beginPath(); g.rect(0, TOP - 64, W, BOTTOM - TOP + 120); g.clip();
    for (let i = Math.max(0, Math.floor(b0 - 1)); i < Math.min(n, Math.ceil(b0 + VIS + 1)); i++) {
      const y = this.floorY(i), id = S.order[i], beaten = i < reached || (S.state === 'champion');
      const lit = i <= reached;
      rr(g, tx0 + 20, y - 52, tx1 - tx0 - 40, 104, 14);
      g.fillStyle = lit ? 'rgba(48,40,22,0.95)' : 'rgba(28,32,42,0.95)'; g.fill();
      g.lineWidth = 3; g.strokeStyle = i === reached && S.state !== 'champion' ? '#ffc928' : '#3b4252'; g.stroke();
      // numero del piano, grande a sinistra della torre: dorato se raggiunto, grigio se ancora da salire
      const cur = i === reached && S.state !== 'champion' && S.state !== 'lost';
      rr(g, 18, y - 40, 88, 80, 16); g.fillStyle = cur ? '#ffc928' : lit ? 'rgba(255,201,40,0.25)' : 'rgba(40,46,60,0.9)'; g.fill();
      g.fillStyle = cur ? '#1a1406' : lit ? '#ffd34d' : '#6b7386'; g.font = '900 54px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText(String(i + 1), 62, y + 4);
      g.textAlign = 'left';
      this._face(g, id, tx0 + 96, y + 10, 34, beaten);
      g.fillStyle = beaten ? '#7b8394' : '#ffffff'; g.font = '900 40px system-ui, sans-serif';
      g.fillText(this.fighters[id].name.toUpperCase(), tx0 + 146, y + 12);
      if (S.state === 'lost' && i === S.idx) { g.fillStyle = '#e5484d'; g.font = '900 30px system-ui, sans-serif'; g.fillText('KO', tx1 - 150, y + 12); }
    }
    g.restore();
    this.tex.needsUpdate = true;
  }
  _crown(g, x, y, won) {
    const gr = g.createLinearGradient(x - 90, 0, x + 90, 0); gr.addColorStop(0, '#b8860b'); gr.addColorStop(0.5, '#ffe27a'); gr.addColorStop(1, '#b8860b');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 90, y + 40); g.lineTo(x - 100, y - 40); g.lineTo(x - 50, y); g.lineTo(x, y - 60); g.lineTo(x + 50, y);
    g.lineTo(x + 100, y - 40); g.lineTo(x + 90, y + 40); g.closePath(); g.fill();
    g.fillRect(x - 92, y + 40, 184, 22);
    for (const [cx, cy, c] of [[x - 100, y - 44, '#e5484d'], [x, y - 64, '#3fb0ff'], [x + 100, y - 44, '#e5484d']]) { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, 11, 0, Math.PI * 2); g.fill(); }
  }
  open(head, yaw) {
    this.group.position.set(head.x - Math.sin(yaw) * 1.25, head.y + 0.1, head.z - Math.cos(yaw) * 1.25);
    this.group.rotation.set(0, yaw, 0);
    this.group.visible = true;
  }
  close() { this.group.visible = false; this.hl.visible = false; }
  _placeToken(py, scale = 1, px = W - 260) { this.token.position.set(this._lx(px), this._ly(py), 0.006); this.token.scale.setScalar(scale); }
  // stato attuale: gettone accanto al piano da conquistare (o in cima se campione)
  // intro: la prima volta, se la torre non sta tutta nel pannello, la si guarda scorrere dalla cima (il campione)
  // fino al primo piano: cosi' si vede chi c'e' da affrontare
  show(S, subtitle, intro = false) {
    this.S = S; this.subtitle = subtitle; this.anim = null;
    const n = S.order.length;
    if (intro && n > VIS) {
      this.intro = { t: 0, from: n - VIS + 2, to: S.idx, focus: n - VIS + 2, sub: subtitle };
      this.token.visible = false; this.hl.visible = false; this.crownGlow.material.opacity = 0;
      this.draw(); return;
    }
    this.intro = null; this.draw();
    const top = S.state === 'champion';
    this._placeToken(top ? this.crownY() + 105 : this.floorY(Math.min(S.idx, S.order.length - 1)), 1, top ? W / 2 : W - 260);
    this.token.visible = S.state !== 'lost' || true;
    this.hl.visible = !top && S.state !== 'lost';
    if (this.hl.visible) { const y = this.floorY(S.idx); this.hl.position.set(0, this._ly(y), 0.004); this.hl.scale.set(PW * 0.84, 0.13, 1); }
    this.crownGlow.position.set(0, this._ly(this.crownY()), 0.002); this.crownGlow.material.opacity = top ? 0.9 : 0;
  }
  // vittoria: il gettone sale dal piano 'from' al successivo (o alla corona); onArrive a meta' corsa per i suoni
  climb(S, from, subtitle, onDone) {
    this.S = S; this.subtitle = subtitle; this.draw({ from });
    this.hl.visible = false;
    const toTop = from + 1 >= S.order.length;
    this.anim = { t: 0, dur: toTop ? 2.4 : 1.7, y0: this.floorY(from), y1: toTop ? this.crownY() + 100 : this.floorY(from + 1), toTop, from, onDone, arrived: false };
  }
  update(dt) {
    if (!this.group.visible) return;
    this.time += dt;
    if (this.hl.visible) this.hl.material.opacity = 0.55 + 0.45 * Math.sin(this.time * 4);
    for (const p of this.trail) if (p.t > 0) { p.t -= dt; p.m.material.opacity = Math.max(0, p.t / 0.5) * 0.8; p.m.scale.setScalar(0.5 + p.t * 1.4); }
    if (this.flash.material.opacity > 0) { this.flash.material.opacity = Math.max(0, this.flash.material.opacity - dt * 1.6); this.flash.scale.setScalar(1 + (1 - this.flash.material.opacity) * 1.5); }
    if (this.intro) {                                  // scorrimento iniziale: ferma un attimo in cima, scende, si ferma sul primo
      const I = this.intro; I.t += dt;
      const dur = Math.max(3.2, 0.32 * Math.abs(I.from - I.to));   // stessa velocita' della torre da 16 (piu' piani = piu' tempo)
      const k = Math.min(1, Math.max(0, (I.t - 1.0) / dur)), e = k * k * (3 - 2 * k);
      I.focus = I.from + (I.to - I.from) * e; this.draw();
      if (k >= 1) { this.intro = null; this.token.visible = true; this.show(this.S, I.sub); }
      return;
    }
    const A = this.anim; if (!A) return;
    A.t += dt;
    const k = Math.min(1, A.t / A.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;      // parte piano, scatta, frena
    const py = A.y0 + (A.y1 - A.y0) * e;
    this._placeToken(py, 1 + 0.35 * Math.sin(Math.PI * k), A.toTop ? (W - 260) + (W / 2 - (W - 260)) * Math.max(0, (k - 0.5) / 0.5) : W - 260);   // in cima: al centro, sotto la corona
    this.token.position.x += Math.sin(k * Math.PI * 6) * 0.004 * (1 - k);
    // scia luminosa
    const free = this.trail.find(p => p.t <= 0);
    if (free && k < 0.95) { free.t = 0.5; free.m.position.set(this.token.position.x + (Math.random() - 0.5) * 0.05, this.token.position.y - 0.03, 0.005); }
    if (A.toTop) this.crownGlow.material.opacity = Math.max(0, (k - 0.6) / 0.4) * 0.9;
    if (k >= 1 && !A.arrived) {
      A.arrived = true;
      this.flash.position.copy(this.token.position); this.flash.position.z = 0.007; this.flash.material.opacity = 1; this.flash.scale.setScalar(1);
      if (A.toTop) this.S.state = 'champion';
      this.draw();
      setTimeout(() => { this.anim = null; if (A.onDone) A.onDone(); }, 900);
    }
  }
}
