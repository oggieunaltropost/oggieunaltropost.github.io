// Il maxischermo dello stadio (nel panorama e' spento, un rettangolo nero 20,6 x 7,8 m sopra l'anello alto, sul lato corto): qui
// ci disegniamo sopra, a intervalli, brevi animazioni con la scritta HOME BOXING. Il resto del tempo resta nero (spento).
// Animazioni: neon che si accende lettera per lettera, due guantoni che si scontrano, scritta a puntini LED che scorre,
// disturbo da vecchio televisore che si compone nel logo, conto alla rovescia con "FIGHT!".
import * as THREE from 'three';

const W = 640, H = 242;                                   // pixel della tela (stesso rapporto dello schermo)
const SCREEN = { x: 0, y: 35.65, z: 115.2, w: 20.6, h: 7.8 };   // (spazio del ring: x = y di Blender, z = x di Blender)
const FONT = '900 112px Impact, "Arial Black", system-ui, sans-serif';
const rnd = (a, b) => a + Math.random() * (b - a);
// parole a caso (la scritta HOME BOXING resta il tema delle altre animazioni): le lettere entrano una a una dall'alto con un rimbalzo
const WORDS = ['KO!', 'ROUND 1', 'FIGHT!', 'CHAMPION', 'WIN BY KO', 'NO MERCY', 'GLOVES UP', 'TITLE FIGHT', 'ALLA GRANDE', 'SENZA PIETA\'', 'DI NUOVO!', 'ONE MORE ROUND', 'GO GO GO', 'GUARDIA ALTA', 'FUORI I SECONDI', 'FIGHT NIGHT'];
const WCOL = [['#ffd34d', '#c4161f'], ['#ff5a5a', '#f2ece0'], ['#4cc3ff', '#1d4fc4'], ['#6bff9a', '#14803a'], ['#ff8fe0', '#7a2a8a']];
const sm = q => { q = Math.min(1, Math.max(0, q)); return q * q * (3 - 2 * q); };

export class StadiumScreen {
  // front: lo schermo sta di fronte a te (dal lato opposto a quello del panorama), con cornice e pali, per lo stadio di notte
  constructor(parent, { front = false } = {}) {
    this.c = document.createElement('canvas'); this.c.width = W; this.c.height = H; this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const F = front ? 1.35 : 1, zz = front ? -101 : SCREEN.z, yy = front ? 38.5 : SCREEN.y;       // (di fronte: piu' vicino e piu' grande)
    this.mesh.position.set(SCREEN.x, yy, zz); this.mesh.rotation.y = front ? 0 : Math.PI; this.mesh.scale.set(F, F, 1);       // guarda verso il ring
    if (front) {                                                                                   // cornice nera e due pali, come lo schermo del panorama
      const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.5, metalness: 0.6 });
      const fr = new THREE.Mesh(new THREE.BoxGeometry(SCREEN.w * F + 1.4, SCREEN.h * F + 1.4, 0.6), dark); fr.position.set(SCREEN.x, yy, zz - 0.35); parent.add(fr);
      for (const dx of [-9, 9]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 12, 10), dark); po.position.set(dx, yy - SCREEN.h * F / 2 - 5.5, zz - 0.9); parent.add(po); }
    }
    this.mesh.renderOrder = -8; this.mesh.name = 'maxischermo'; parent.add(this.mesh);
    this.dots = document.createElement('canvas'); this.dots.width = 160; this.dots.height = 60; this.dg = this.dots.getContext('2d', { willReadFrequently: true });
    this.t = 0; this.acc = 0; this.mode = null; this.next = 4 + Math.random() * 6; this.mt = 0;
    this._black();
  }
  _black() { const g = this.g; g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H); this.tex.needsUpdate = true; }

  update(dt) {
    this.t += dt;
    if (!this.mode) {
      this.next -= dt;
      if (this.next <= 0) { const m = ['neon', 'punch', 'ticker', 'glitch', 'countdown', 'words', 'words']; this.mode = m[Math.floor(Math.random() * m.length)]; this.mt = 0; this.dur = { neon: 7, punch: 6.5, ticker: 9, glitch: 5.5, countdown: 6.5, words: 5.5 }[this.mode]; if (this.mode === 'words') this.word = WORDS[Math.floor(Math.random() * WORDS.length)]; }
      return;
    }
    this.acc += dt; if (this.acc < 1 / 18) return;               // 18 fotogrammi al secondo bastano
    const d = this.acc; this.acc = 0; this.mt += d;
    const g = this.g; g.save(); g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H);
    this['_' + this.mode](g, this.mt, this.dur);
    g.restore(); this.tex.needsUpdate = true;
    if (this.mt >= this.dur) { this.mode = null; this.next = rnd(10, 26); this._black(); }
  }

  _text(g, txt, x, y, size, fill, stroke = null, lw = 0) {
    g.font = `900 ${size}px Impact, "Arial Black", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(txt, x, y); }
    g.fillStyle = fill; g.fillText(txt, x, y);
  }
  _logo(g, a = 1, scale = 1, cx = W / 2, cy = H / 2) {
    g.save(); g.globalAlpha = a; g.translate(cx, cy); g.scale(scale, scale);
    this._text(g, 'HOME', 0, -34, 104, '#f2ece0', '#c4161f', 12); this._text(g, 'BOXING', 0, 52, 104, '#f2ece0', '#c4161f', 12);
    g.restore();
  }

  // neon rosso che si accende lettera per lettera con lo sfarfallio, resta acceso e si spegne a scatti
  _neon(g, t, dur) {
    const txt = 'HOME BOXING', n = txt.length, on = Math.min(n, Math.floor(t / 0.28)), off = t > dur - 1.6;
    g.font = '900 78px Impact, "Arial Black", sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    const tw = g.measureText(txt).width; let x = (W - tw) / 2;
    for (let i = 0; i < n; i++) {
      const ch = txt[i], cw = g.measureText(ch).width;
      let lit = i < on; let k = lit ? 1 : 0;
      if (lit) { const since = t - i * 0.28; if (since < 0.5) k = Math.random() < 0.55 ? 1 : 0.15; if (off) k *= Math.random() < 0.5 + 0.5 * (dur - t) / 1.6 ? 1 : 0; }
      g.shadowColor = '#ff2a3a'; g.shadowBlur = 28 * k; g.fillStyle = `rgba(255,${Math.round(70 + 120 * k)},${Math.round(80 + 100 * k)},${0.15 + 0.85 * k})`; g.fillText(ch, x, H / 2 - 20); g.shadowBlur = 0;
      x += cw;
    }
    g.fillStyle = `rgba(80,140,255,${0.25 + 0.5 * Math.min(1, t / 3)})`;                                        // sotto, una riga blu a neon che si allunga
    const bw = (W - 120) * sm((t - 2.5) / 2); g.shadowColor = '#3a7bff'; g.shadowBlur = 18; g.fillRect((W - bw) / 2, H / 2 + 40, bw, 6); g.shadowBlur = 0;
    if (!off) this._text(g, 'THE RING AWAITS', W / 2, H / 2 + 80, 28, `rgba(190,205,230,${0.4 * sm((t - 4) / 1)})`);
  }

  // due guantoni arrivano dai lati, si scontrano al centro con lampo e onda d'urto, la scritta schizza fuori e trema
  _punch(g, t, dur) {
    const hit = 1.5, glove = (x, y, dir, col) => {
      g.save(); g.translate(x, y); g.scale(dir, 1);
      g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 4;
      g.beginPath(); g.roundRect(-46, -30, 92, 60, 26); g.fill(); g.stroke();                      // il guantone
      g.fillStyle = '#f2ece0'; g.fillRect(-62, -20, 20, 40);                                       // il polsino
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(8, -12, 22, 9, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    if (t < hit) {
      const k = sm(t / hit), off = 330 * (1 - k * k);
      glove(W / 2 - 55 - off, H / 2, 1, '#d81e2c'); glove(W / 2 + 55 + off, H / 2, -1, '#1d4fc4');
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
      for (let i = 0; i < 5; i++) { const y = H / 2 - 40 + i * 20, l = 90 * k; g.beginPath(); g.moveTo(W / 2 - 55 - off - 70, y); g.lineTo(W / 2 - 55 - off - 70 - l, y); g.moveTo(W / 2 + 55 + off + 70, y); g.lineTo(W / 2 + 55 + off + 70 + l, y); g.stroke(); }   // le righe di velocita'
    } else {
      const u = t - hit, shake = (u < 1.2 ? 6 * (1 - u / 1.2) : 0), sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
      if (u < 0.5) { g.fillStyle = `rgba(255,255,255,${0.9 * (1 - u / 0.5)})`; g.fillRect(0, 0, W, H); }                    // lampo
      g.strokeStyle = `rgba(255,220,120,${Math.max(0, 1 - u / 1.0)})`; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, H / 2, 20 + u * 520, 0, Math.PI * 2); g.stroke();   // onda d'urto
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + 0.3, r = 30 + u * 260 * (0.6 + 0.4 * ((i * 7) % 5) / 4); g.fillStyle = `rgba(255,${180 + (i % 3) * 25},80,${Math.max(0, 1 - u / 1.4)})`; g.beginPath(); g.arc(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r * 0.55, 4, 0, Math.PI * 2); g.fill(); }   // scintille
      const sc = 0.2 + 0.8 * Math.min(1, u / 0.35) + 0.12 * Math.sin(u * 14) * Math.max(0, 1 - u / 1.6);                    // la scritta schizza con un rimbalzo
      const out = t > dur - 0.8 ? (dur - t) / 0.8 : 1;
      this._logo(g, out, sc * 0.96, W / 2 + sx, H / 2 + sy);
    }
  }

  // scritta a puntini LED (matrice) che scorre da destra a sinistra
  _ticker(g, t, dur) {
    const dg = this.dg, dw = 160, dh = 60; dg.clearRect(0, 0, dw, dh);
    const msg = 'HOME BOXING  *  ROUND 1  *  FIGHT NIGHT  *  HOME BOXING  *  ';
    dg.fillStyle = '#fff'; dg.font = '900 40px Impact, "Arial Black", sans-serif'; dg.textBaseline = 'middle'; dg.textAlign = 'left';
    const tw = dg.measureText(msg).width, x0 = dw - ((t * 46) % (tw)); dg.fillText(msg, x0, dh / 2 + 2); dg.fillText(msg, x0 + tw, dh / 2 + 2);
    const px = dg.getImageData(0, 0, dw, dh).data, sx = W / dw, sy = (H - 40) / dh;
    const fade = Math.min(1, t / 0.6, (dur - t) / 0.6);
    for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) {
      const a = px[(j * dw + i) * 4 + 3] / 255; if (a < 0.05) { g.fillStyle = 'rgba(40,12,12,0.55)'; g.fillRect(i * sx + sx * 0.3, 20 + j * sy + sy * 0.3, sx * 0.4, sy * 0.4); continue; }
      g.fillStyle = `rgba(255,${Math.round(110 + 80 * a)},40,${fade * a})`; g.beginPath(); g.arc(i * sx + sx / 2, 20 + j * sy + sy / 2, Math.min(sx, sy) * 0.42, 0, Math.PI * 2); g.fill();
    }
  }

  // disturbo da vecchio televisore, righe che saltano, poi il logo si compone con lo spostamento dei colori e si ritira
  _glitch(g, t, dur) {
    const res = sm((t - 1.2) / 1.2), out = t > dur - 0.9 ? (dur - t) / 0.9 : 1;
    if (t < 2.4) {
      const im = g.createImageData(W / 4, H / 4); const k = (1 - res) * 0.9;
      for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() < k ? Math.random() * 255 : 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      const c = document.createElement('canvas'); c.width = W / 4; c.height = H / 4; c.getContext('2d').putImageData(im, 0, 0);
      g.imageSmoothingEnabled = false; g.globalAlpha = 0.9; g.drawImage(c, 0, 0, W, H); g.globalAlpha = 1;
    }
    if (t > 0.9) {
      const jit = (Math.random() < 0.3 ? 1 : 0) * (1 - res) * 24, off = 5 * (1 - res) + (Math.random() < 0.15 ? 8 : 0);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.9 * out; g.save(); g.translate(-off + jit, 0); this._logoTint(g, '#ff2040'); g.restore();
      g.save(); g.translate(off - jit, 0); this._logoTint(g, '#20c8ff'); g.restore();
      g.save(); g.translate(0, 0); this._logoTint(g, '#f2ece0'); g.restore();
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    for (let i = 0; i < 6; i++) { const y = ((t * 90 + i * 53) % H); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, y, W, 3); }
    if (Math.random() < 0.25) { const y = Math.random() * H; g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, y, W, 2 + Math.random() * 6); }
  }
  _logoTint(g, col) {
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 104px Impact, "Arial Black", sans-serif';
    g.fillText('HOME', W / 2, H / 2 - 34); g.fillText('BOXING', W / 2, H / 2 + 52);
  }

  // una parola a caso: le lettere cadono una a una con un rimbalzo, un lampo a ognuna, poi la riga luminosa e l'uscita a scatti
  _words(g, t, dur) {
    const w = this.word || 'KO!', pal = WCOL[(w.length + Math.floor(w.charCodeAt(0))) % WCOL.length];
    let size = 120; g.font = `900 ${size}px Impact, "Arial Black", sans-serif`; const full = g.measureText(w).width; if (full > W - 80) size = Math.floor(size * (W - 80) / full);
    g.font = `900 ${size}px Impact, "Arial Black", sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'left';
    const tw = g.measureText(w).width; let x = (W - tw) / 2; const out = t > dur - 0.8 ? (dur - t) / 0.8 : 1;
    for (let i = 0; i < w.length; i++) {
      const ch = w[i], cw = g.measureText(ch).width, t0 = 0.15 + i * 0.1, u = Math.min(1, Math.max(0, (t - t0) / 0.4));
      if (u > 0) {
        const bounce = u < 1 ? (1 - u) * (1 - u) * Math.cos(u * 9) : 0, y = H / 2 - 20 - bounce * 150;
        g.save(); g.globalAlpha = Math.min(1, u * 3) * out; g.translate(x + cw / 2, y); g.rotate((1 - u) * (i % 2 ? 0.5 : -0.5)); g.translate(-cw / 2, 0);
        g.lineWidth = size * 0.1; g.strokeStyle = pal[1]; g.lineJoin = 'round'; g.strokeText(ch, 0, 0); g.fillStyle = pal[0]; g.fillText(ch, 0, 0); g.restore();
        if (u > 0.55 && u < 0.8) { g.fillStyle = `rgba(255,255,255,${0.5 * (0.8 - u) / 0.25})`; g.beginPath(); g.arc(x + cw / 2, H / 2 + 36, 30 + (u - 0.55) * 200, 0, Math.PI * 2); g.fill(); }   // piccolo lampo all'arrivo
      }
      x += cw;
    }
    const bw = (W - 140) * sm((t - 1.2 - w.length * 0.1) / 0.6); g.fillStyle = `rgba(255,255,255,${0.8 * out})`; g.fillRect((W - bw) / 2, H / 2 + 62, bw, 5);
  }
  // 3 - 2 - 1 con un anello che si chiude, poi "FIGHT!" con un lampo e l'abbaglio dal bordo
  _countdown(g, t, dur) {
    const step = Math.floor(t / 1.2);
    if (step < 3) {
      const n = 3 - step, u = (t % 1.2) / 1.2, col = n === 3 ? '#ffd34d' : n === 2 ? '#ff9a3a' : '#ff4a3a';
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 10; g.beginPath(); g.arc(W / 2, H / 2, 92, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = col; g.lineWidth = 10; g.beginPath(); g.arc(W / 2, H / 2, 92, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - u)); g.stroke();
      const sc = 1 + 0.45 * Math.max(0, 1 - u * 6) ; g.save(); g.translate(W / 2, H / 2 + 4); g.scale(sc, sc); this._text(g, String(n), 0, 0, 150, col, '#000', 6); g.restore();
    } else {
      const u = t - 3.6, out = t > dur - 0.7 ? (dur - t) / 0.7 : 1;
      if (u < 0.4) { g.fillStyle = `rgba(255,240,200,${0.8 * (1 - u / 0.4)})`; g.fillRect(0, 0, W, H); }
      const sc = 0.5 + 0.6 * Math.min(1, u / 0.25) + 0.05 * Math.sin(u * 20);
      g.save(); g.globalAlpha = out; g.translate(W / 2 + (Math.random() - 0.5) * 3, H / 2); g.scale(sc, sc); this._text(g, 'FIGHT!', 0, 0, 130, '#ff3a2a', '#f2ece0', 8); g.restore();
      g.strokeStyle = `rgba(255,120,60,${0.7 * out})`; g.lineWidth = 5; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r0 = 130 + u * 200, r1 = r0 + 40; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r0 * 1.6, H / 2 + Math.sin(a) * r0 * 0.7); g.lineTo(W / 2 + Math.cos(a) * r1 * 1.6, H / 2 + Math.sin(a) * r1 * 0.7); g.stroke(); }
    }
  }
}
