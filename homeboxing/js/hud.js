// Tabellone dei punti (pannello 3D con una canvas) e lampo rosso quando Mike ti colpisce.
import * as THREE from 'three';
import { t as tr } from './i18n.js?v=20261008003546';

// ---- puntatori: raggi dalle mani/controller. Puntare un pulsante e' come toccarlo col guantone.
// ogni raggio: { o, d, hit, sel (grilletto / pizzico tenuto), click (appena premuto) }
let RAYS = [], HEAD = null;
export function setRays(r, head) { RAYS = r; HEAD = head || HEAD; }
const _ro = new THREE.Vector3(), _rd = new THREE.Vector3(), _inv = new THREE.Matrix4();
// raggio contro il pannello (piano locale z = zf): punto locale colpito o null
function rayLocal(group, o, d, zf) {
  _inv.copy(group.matrixWorld).invert();
  _ro.copy(o).applyMatrix4(_inv);
  _rd.copy(o).add(d).applyMatrix4(_inv).sub(_ro);
  if (Math.abs(_rd.z) < 1e-6) return null;
  const t = (zf - _ro.z) / _rd.z;
  if (t <= 0) return null;
  return _ro.clone().addScaledVector(_rd, t);
}
// ---- barra di presa sotto un pannello: mano (o raggio) ferma sulla barra 0,4 s = presa, il pannello segue
// la mano; mano ferma 0,6 s = lasciato li'
function makeDragBar(group, y, x = 0, vertical = false, len = 0.3) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 40; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(4, 6, 248, 28, 14); g.fill();
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.047), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: 0x9aa3b6, transparent: true, opacity: 0.85, depthTest: false }));
  bar.position.set(x, y, 0.01); bar.renderOrder = 1103; group.add(bar);
  if (vertical) bar.rotation.z = Math.PI / 2;                 // maniglia di lato (in piedi)
  const hw = len / 2 + 0.02, hh = 0.04;
  return { bar, t: 0, grab: null, hw: vertical ? hh : hw, hh: vertical ? hw : hh };
}
function updateDragBar(D, group, dt, gloves) {
  const bw = D.bar.getWorldPosition(new THREE.Vector3());
  const rayPoint = (r, dist) => r.o.clone().addScaledVector(r.d.clone().normalize(), dist);
  if (D.grab) {
    const G = D.grab;
    let p = null;
    if (G.glove) p = G.glove.mesh.visible ? G.glove.center.clone() : null;
    else {
      // come le finestre del Quest: resta attaccato al raggio finche' tieni premuto (grilletto o pizzico),
      // sempre girato verso di te; lasci e resta li'
      const r = RAYS[G.ray];
      // si lascia: raggio sparito (mano aperta) o, se preso col grilletto/pizzico, grilletto lasciato
      if (!r || (G.bySel && !r.sel)) { D.grab = null; D.t = -0.3; D.bar.material.color.setHex(0x9aa3b6); return false; }
      group.position.copy(rayPoint(r, G.dist)).add(G.offset);
      if (HEAD) group.rotation.set(0, Math.atan2(HEAD.x - group.position.x, HEAD.z - group.position.z), 0);
      return true;
    }
    if (!p) { D.grab = null; D.bar.material.color.setHex(0x9aa3b6); return false; }
    G.still = p.distanceTo(G.last) < 0.004 ? G.still + dt : 0;
    G.last.copy(p);
    group.position.copy(p).add(G.offset);
    if (G.still > 0.6) { D.grab = null; D.t = -0.8; D.bar.material.color.setHex(0x9aa3b6); }
    return true;
  }
  let src = null;
  for (const g of gloves) if (g.mesh.visible && g.center.distanceTo(bw) < 0.075) src = { glove: g, p: g.center.clone() };
  const sc = group.scale.x || 1;
  if (!src) RAYS.forEach((r, i) => {
    const l = rayLocal(group, r.o, r.d, 0.01);
    if (l && Math.abs(l.x - D.bar.position.x) < D.hw && Math.abs(l.y - D.bar.position.y) < D.hh) {
      const w = l.clone().applyMatrix4(group.matrixWorld);
      if (!r.hit || r.o.distanceTo(w) < r.o.distanceTo(r.hit)) r.hit = w;
      src = { ray: i, p: w, dist: r.o.distanceTo(w) };
    }
  });
  D.t = src ? D.t + dt : Math.max(Math.min(D.t, 0), D.t - dt);
  D.bar.material.color.setHex(src ? 0xffd34d : 0x9aa3b6);
  if (src && src.ray !== undefined && (RAYS[src.ray].click || D.t > 0.5)) {   // raggio sulla barra + grilletto (o mezzo secondo a pugno chiuso)
    D.grab = { ...src, bySel: !!RAYS[src.ray].click, offset: group.position.clone().sub(src.p), last: src.p.clone(), still: 0 };
    D.t = 0; return true;
  }
  if (src && src.ray === undefined && D.t > 0.4) {                     // col guantone: tienilo sulla barra
    D.grab = { ...src, offset: group.position.clone().sub(src.p), last: src.p.clone(), still: 0 };
    D.t = 0;
    return true;
  }
  return false;
}
// quali pulsanti sono puntati (e dove: il punto colpito per disegnare il puntino)
function pointed(group, buttons, zf, size, bounds) {
  const set = new Set(); set.clicked = new Set();         // clicked: premuto adesso col grilletto / pizzico (come sul Quest)
  for (const r of RAYS) {
    const p = rayLocal(group, r.o, r.d, zf);
    if (!p || Math.abs(p.x) > bounds[0] || Math.abs(p.y) > bounds[1]) continue;
    const w = p.clone().applyMatrix4(group.matrixWorld);
    if (!r.hit || r.o.distanceTo(w) < r.o.distanceTo(r.hit)) r.hit = w;
    for (const b of buttons) {
      const [cx, cy, hw, hh] = size(b);
      if (Math.abs(p.x - cx) < hw && Math.abs(p.y - cy) < hh) { set.add(b); if (r.click) set.clicked.add(b); }
    }
  }
  return set;
}
// il raggio con il puntino, visibile solo quando c'e' un menu aperto
export class RayPointers {
  constructor(scene) {
    this.items = [0, 1].map(() => {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 1, 6, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.55, depthTest: false }));
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
      line.renderOrder = dot.renderOrder = 1200; line.visible = dot.visible = false;
      scene.add(line, dot);
      return { line, dot };
    });
  }
  update(rays, show) {
    this.items.forEach((it, i) => {
      const r = show && rays[i];
      it.line.visible = !!r; it.dot.visible = !!(r && r.hit);
      if (!r) return;
      const end = r.hit || r.o.clone().addScaledVector(r.d, 1.2);
      it.line.position.copy(r.o); it.line.lookAt(end); it.line.scale.set(1, 1, r.o.distanceTo(end));
      if (r.hit) it.dot.position.copy(r.hit);
    });
  }
}

export class Scoreboard {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; this.canvas.height = 560;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    // Disegnato subito dopo le pareti/mobili invisibili e senza controllare la profondita': i mobili
    // non lo coprono. Scrive pero' la sua profondita', quindi Mike (davanti) ci passa sopra.
    // (con depthTest spento WebGL non scrive la profondita': per questo si usa AlwaysDepth)
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, depthFunc: THREE.AlwaysDepth, depthWrite: true, fog: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), mat);
    this.mesh.name = 'tabellone';
    this.mesh.renderOrder = -5;
    // cornice
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.66, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x15171d, depthFunc: THREE.AlwaysDepth, depthWrite: true, fog: false }));
    frame.position.z = -0.02; frame.renderOrder = -6; this.mesh.add(frame);
    this.last = '';
  }

  draw(s) {
    const key = JSON.stringify(s) + tr('you') + tr('opp');
    if (key === this.last) return;
    this.last = key;
    const g = this.canvas.getContext('2d'), W = 1024, H = 560;
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd34d'; g.font = '900 54px system-ui, sans-serif';
    g.fillText(`ROUND ${s.round}${s.rounds ? '/' + s.rounds : ''}`, W * 0.2, 52);
    g.fillStyle = '#c9ced8'; g.font = '700 34px system-ui, sans-serif';
    g.fillText((s.level || '').toUpperCase(), W * 0.45, 54);
    const mm = Math.floor(s.time / 60), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
    g.fillStyle = s.time < 10 && s.running ? '#ff5a5a' : '#ffffff';
    g.font = '800 64px ui-monospace, monospace';
    g.fillText(`${mm}:${ss}`, W * 0.72, 54);
    // colonne giocatore / Mike
    const col = (x, name, color, p) => {
      g.fillStyle = color; g.fillRect(x - 230, 100, 460, 64);
      g.fillStyle = '#fff'; g.font = '800 44px system-ui, sans-serif'; g.fillText(name, x, 133);
      g.font = '900 150px system-ui, sans-serif'; g.fillText(p.points, x, 250);
      // energia: verde -> rosso
      const e = Math.max(0, 1 - (p.dmg || 0) / 100);
      g.fillStyle = '#2a2f3a'; g.fillRect(x - 200, 338, 400, 20);
      g.fillStyle = e > 0.5 ? '#3cc46b' : e > 0.25 ? '#f0b429' : '#e5484d'; g.fillRect(x - 200, 338, 400 * e, 20);
      g.font = '500 28px system-ui, sans-serif'; g.fillStyle = '#c9ced8';
      g.fillText(tr('stats', { h: p.hits, b: p.blocks, d: p.dodges }), x, 392);
      const extra = [p.kd ? tr('down_times', { n: p.kd, v: tr(p.kd === 1 ? 'once' : 'times') }) : '', p.penalties ? tr('penalties', { n: p.penalties }) : ''].filter(Boolean).join(' · ');
      if (extra) { g.fillStyle = p.penalties ? '#ffd34d' : '#ff8a8a'; g.fillText(extra, x, 428); }
    };
    col(W * 0.27, s.names ? s.names[0] : tr('you'), '#c4161f', s.player);
    col(W * 0.73, s.names ? s.names[1] : tr('opp'), '#1a49b8', s.mike);
    g.fillStyle = '#2a2f3a'; g.fillRect(W / 2 - 2, 110, 4, 300);
    g.fillStyle = '#ffffff'; g.font = '700 34px system-ui, sans-serif';
    g.fillText(s.message || '', W / 2, 482);
    g.fillStyle = '#9aa3b6'; g.font = '500 27px system-ui, sans-serif';
    g.fillText(s.diag || '', W / 2, 535);
    this.tex.needsUpdate = true;
  }
}

// lampo rosso attaccato alla testa
export class HitFlash {
  constructor(camera) {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff1010, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false }));
    this.mesh.renderOrder = 999;
    camera.add(this.mesh);
    this.v = 0;
  }
  hit(strength = 1) { this.v = Math.min(0.6, 0.35 * strength + 0.15); }
  setBase(b) { this.base = b; }
  update(dt) {
    this.v = Math.max(this.base || 0, this.v - dt * 1.6);
    this.mesh.material.opacity = this.v;
    this.mesh.visible = this.v > 0.001;
  }
}

// Menu di pausa: si apre alzando tutte e due le braccia sopra la testa (o con A/B/X/Y).
// I pulsanti si "premono" tenendoci sopra un guantone per un secondo e mezzo: niente click per sbaglio.
export class PauseMenu {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'pausa'; this.group.visible = false;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.62),
      new THREE.MeshBasicMaterial({ color: 0x0b0d12, transparent: true, opacity: 0.88, depthTest: false }));
    panel.renderOrder = 1100; this.group.add(panel); this.panel = panel;
    this.drag = makeDragBar(this.group, -0.31 - 0.06);
    this.title = this._label(tr('pause'), 0, 0.23, 0.6, 0.1, '#ffd34d', 72);
    this.group.add(this.title);
    // fine incontro: com'e' finita (sotto il titolo) e la medaglia sopra il pannello se hai vinto
    this.sub = this._label(' ', 0, 0.135, 0.56, 0.05, '#c9cfdb', 40); this.group.add(this.sub);
    this.medal = this._medal(); this.medal.position.set(0, 0.47, 0.01); this.group.add(this.medal);

    this.buttons = [
      { id: 'resume', tk: 'resume', color: 0x1f8a4c, x: -0.29 },
      { id: 'restart', tk: 'restart', color: 0x1d4fc4, x: 0 },
      { id: 'exit', tk: 'menu_btn', color: 0xc4161f, x: 0.29 },
      { id: 'change', tk: 'pause_change', color: 0x8a5a1a, x: 0.11 },          // (solo in allenamento: torna alla scelta)
    ].map(b => {
      const g = new THREE.Group(); g.position.set(b.x, -0.06, 0.02);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.04),
        new THREE.MeshBasicMaterial({ color: b.color, depthTest: false, transparent: true }));
      base.renderOrder = 1101; g.add(base);
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.22),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthTest: false }));
      fill.position.z = 0.021; fill.renderOrder = 1102; fill.scale.y = 0.001; g.add(fill);
      const t = this._label(tr(b.tk), 0, 0, 0.24, 0.06, '#ffffff', 40); t.position.z = 0.023; g.add(t);
      this.group.add(g);
      return { ...b, group: g, fill, hold: 0, label: t };
    });
  }

  _label(text, x, y, w, h, color, px) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
    const g = c.getContext('2d');
    let size = Math.min(px, Math.floor(c.height * 0.78));          // mai piu' alta del suo riquadro (non si taglia)
    do { g.font = `800 ${size}px system-ui, sans-serif`; size -= 2; } while (g.measureText(text).width > c.width * 0.94 && size > 10);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false }));
    m.userData = { canvas: c, tex: t, color, px };
    m.position.set(x, y, 0.01); m.renderOrder = 1103;
    return m;
  }

  // medaglia d'oro col nastro blu e oro e la stella
  _medal() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 340; const g = c.getContext('2d');
    for (const s of [-1, 1]) {                                      // nastro a V: blu notte con i bordi oro (nessuna bandiera)
      g.save(); g.translate(128 + s * 34, 0); g.rotate(-s * 0.32);
      g.fillStyle = '#16307a'; g.fillRect(-36, -10, 72, 190);
      g.fillStyle = '#e8b830'; g.fillRect(-36, -10, 9, 190); g.fillRect(27, -10, 9, 190);
      g.restore();
    }
    const cx = 128, cy = 228, r = 96;
    const gr = g.createRadialGradient(cx - 30, cy - 34, 10, cx, cy, r);
    gr.addColorStop(0, '#fff6c2'); gr.addColorStop(0.45, '#f2c230'); gr.addColorStop(1, '#a8740c');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = 7; g.strokeStyle = '#8a5d06'; g.beginPath(); g.arc(cx, cy, r - 14, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#c8900e'; g.beginPath();                          // stella
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 24 : 56; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff1a8'; g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2 * 340 / 256), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false }));
    m.renderOrder = 1104; m.visible = false;
    return m;
  }

  // davanti alla testa, a 55 cm, girato verso di te
  setTitle(text, colorOverride) {
    const { canvas: c, tex, px } = this.title.userData, g = c.getContext('2d');
    const color = colorOverride || this.title.userData.color;
    g.clearRect(0, 0, c.width, c.height);
    let size = Math.min(px, Math.floor(c.height * 0.78));          // mai piu' alta del suo riquadro (non si taglia)
    do { g.font = `800 ${size}px system-ui, sans-serif`; size -= 2; } while (g.measureText(text).width > c.width * 0.94 && size > 10);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2); tex.needsUpdate = true;
  }

  // cambio lingua: si ridisegnano le scritte
  relabel() {
    const paint = (m, text) => MenuPanel.prototype._paint(m, text, m.userData.color);
    for (const b of this.buttons) paint(b.label, tr(b.tk));
  }
  // result (solo a fine incontro): { win: true/false/null (pari), how: 'KO'... }
  open(head, yaw, end = false, result = null, change = false) {
    this.age = 0;
    if (end && result) {
      this.setTitle(tr(result.win === true ? 'res_win' : result.win === false ? 'res_lose' : 'res_draw'),
        result.win === true ? '#ffd34d' : result.win === false ? '#ff5a5a' : '#ffffff');
      MenuPanel.prototype._paint(this.sub, tr('fight_over') + (result.how ? ' · ' + tr('how_' + result.how) : ''), '#c9cfdb');
    } else { this.setTitle(tr(end ? 'fight_over' : 'pause')); MenuPanel.prototype._paint(this.sub, ' ', '#c9cfdb'); }
    this.medal.visible = !!(end && result && result.win === true); this.medalT = 0;
    this.buttons[0].group.visible = !end;
    // fine incontro: solo due pulsanti, centrati
    const ch = change && !end;
    // (come in tutti i menu: uscire a sinistra, continuare/rigiocare a destra)
    const xs = end ? { exit: -0.145, restart: 0.145 } : ch ? { exit: -0.33, change: -0.11, restart: 0.11, resume: 0.33 } : { exit: -0.29, restart: 0, resume: 0.29 };
    for (const b of this.buttons) if (xs[b.id] !== undefined) { b.x = xs[b.id]; b.group.position.x = b.x; b.group.scale.x = ch ? 0.8 : 1; }
    this.buttons[3].group.visible = ch;
    // fine incontro: due soli pulsanti -> pannello stretto e tutto un po' piu' piccolo; "RIGIOCA" invece di "RICOMINCIA"
    this.panel.scale.x = end ? 0.68 : 1; this.group.scale.setScalar(end ? 0.78 : 1);
    const rb = this.buttons.find(b => b.id === 'restart'); rb.tk = end ? 'replay' : 'restart';
    MenuPanel.prototype._paint(rb.label, tr(rb.tk), rb.label.userData.color);
    this.buttons[1].group.children[2].visible = true;
    this.group.position.set(head.x - Math.sin(yaw) * 0.55, head.y - 0.1, head.z - Math.cos(yaw) * 0.55);
    this.group.rotation.set(0, yaw, 0);
    this.group.visible = true;
    for (const b of this.buttons) { b.hold = 0; b.fill.scale.y = 0.001; }
  }
  close() { this.group.visible = false; }

  // restituisce l'id del pulsante premuto (o null)
  update(dt, gloves) {
    if (!this.group.visible) return null;
    if (this.medal.visible) { this.medalT += dt; this.medal.rotation.y = Math.sin(this.medalT * 1.6) * 0.35; }   // la medaglia oscilla
    this.group.updateMatrixWorld(true);
    if (updateDragBar(this.drag, this.group, dt, gloves)) return null;      // lo stai spostando
    this.age = (this.age || 0) + dt;
    const aimed = this.age < 0.7 ? Object.assign(new Set(), { clicked: new Set() }) :      // appena aperto: il raggio non preme ancora
      pointed(this.group, this.buttons.filter(b => b.group.visible), 0.04, b => [b.x, -0.06, 0.125, 0.11], [0.45, 0.31]);
    for (const b of this.buttons) {
      if (!b.group.visible) continue;
      const p = b.group.getWorldPosition(new THREE.Vector3());
      const on = aimed.has(b) || gloves.some(g => g.mesh.visible && g.center.distanceTo(p) < 0.14);
      const need = b.id === 'exit' ? 1.5 : 0.6;       // uscire va tenuto premuto; gli altri sono rapidi
      b.hold = on ? b.hold + dt : Math.max(0, b.hold - dt * 2);
      if (aimed.clicked.has(b) && b.id !== 'exit') b.hold = need;   // grilletto / pizzico: subito (non per uscire)
      b.fill.scale.y = Math.max(0.001, Math.min(1, b.hold / need));
      b.fill.position.y = -0.11 + 0.11 * b.fill.scale.y;
      if (b.hold >= need) { b.hold = 0; return b.id; }
    }
    return null;
  }
}

// Menu fluttuante del gioco (dentro il visore): pulsanti che si premono tenendoci sopra un guantone.
// spec: { title, rows: [{ y, buttons: [{ id, text, w, color, group? }] }] }
export class MenuPanel {
  constructor(spec, holdTime = 0.3) {   // (piu' rapidi: prima 0,45 s)
    this.hold = holdTime;
    this.group = new THREE.Group(); this.group.name = 'menu'; this.group.visible = false;
    const W = spec.width || 0.95, H = spec.height || 0.7;
    this.W = W; this.H = H;
    // fondo scuro con angoli arrotondati e cornice dorata; dietro, un bagliore dorato che pulsa piano
    const M = 0.05, CW = 1024, CH = Math.round(1024 * (H + 2 * M) / (W + 2 * M)), sc = CW / (W + 2 * M);
    const frame = (glowOnly) => {
      const c = document.createElement('canvas'); c.width = CW; c.height = CH;
      const g = c.getContext('2d'), x0 = M * sc, y0 = M * sc, w = W * sc, h = H * sc, r = 0.035 * sc;
      const path = () => { g.beginPath(); g.roundRect(x0, y0, w, h, r); };
      const gold = g.createLinearGradient(0, 0, CW, CH);
      gold.addColorStop(0, '#fff1a8'); gold.addColorStop(0.35, '#ffc928'); gold.addColorStop(0.65, '#d99a14'); gold.addColorStop(1, '#fff1a8');
      if (glowOnly) {
        g.shadowColor = 'rgba(255,201,40,0.95)'; g.shadowBlur = 0.03 * sc;
        g.strokeStyle = 'rgba(255,201,40,0.9)'; g.lineWidth = 0.012 * sc; path(); g.stroke(); g.stroke();
      } else {
        const bgG = g.createLinearGradient(0, y0, 0, y0 + h);
        bgG.addColorStop(0, 'rgba(22,26,36,0.95)'); bgG.addColorStop(1, 'rgba(8,10,14,0.95)');
        g.fillStyle = bgG; path(); g.fill();
        g.strokeStyle = gold; g.lineWidth = 0.009 * sc; path(); g.stroke();
        g.strokeStyle = 'rgba(255,241,168,0.45)'; g.lineWidth = 0.0025 * sc;
        g.beginPath(); g.roundRect(x0 + 0.014 * sc, y0 + 0.014 * sc, w - 0.028 * sc, h - 0.028 * sc, r * 0.7); g.stroke();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(W + 2 * M, H + 2 * M),
      new THREE.MeshBasicMaterial({ map: frame(true), transparent: true, depthTest: false, depthWrite: false }));
    glow.renderOrder = 1099; glow.position.z = -0.002; this.group.add(glow); this.glow = glow;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(W + 2 * M, H + 2 * M),
      new THREE.MeshBasicMaterial({ map: frame(false), transparent: true, depthTest: false }));
    bg.renderOrder = 1100; this.group.add(bg);
    this.time = 0;
    const lab = PauseMenu.prototype._label;
    const tw = spec.titleW || Math.min(W - 0.06, 0.66);         // riquadro stretto attorno al testo: lettere grandi e intere
    this.title = lab(spec.title, 0, H / 2 - (spec.titleH || 0.09) / 2 - 0.04, tw, spec.titleH || 0.09, '#ffd34d', 72);
    this.group.add(this.title);
    this.spec = spec; this.rowLabels = [];
    if (spec.subtitle) { this.sub = lab(spec.subtitle, 0, H / 2 - 0.155, W - 0.1, 0.045, '#c9ced8', 30); this.group.add(this.sub); }
    this.buttons = []; this.carousels = [];
    // barra sotto il pannello (o maniglia sul lato sinistro): la si prende e il pannello si sposta
    if (spec.draggable) this.drag = spec.dragSide === 'left' ? makeDragBar(this.group, 0, -W / 2 - 0.04, true, Math.max(0.08, H - 0.02)) : makeDragBar(this.group, -H / 2 - 0.085);
    for (const row of spec.rows) {
      if (row.carousel) {                                  // riga a scorrimento: frecce ai lati (fuori dalla cornice)
        const k = this.carousels.length;
        row._arrows = [{ id: `__car${k}-`, text: '‹', w: 0.06, x: -W / 2 + 0.065 }, { id: `__car${k}+`, text: '›', w: 0.06, x: W / 2 - 0.065 }];   // dentro la cornice
      }
      if (row.label) {
        const m = lab(row.label, 0, row.y + (row.h || 0.09) / 2 + 0.03, W - 0.1, 0.04, '#9aa3b6', 28);
        this.group.add(m); this.rowLabels.push({ m, tk: row.tk });
      }
      const gap = 0.02, total = row.buttons.reduce((a, b) => a + b.w, 0) + gap * (row.buttons.length - 1);
      let x = row.x ?? -total / 2;                  // (row.x: riga allineata da quel punto, es. in basso a sinistra)
      const car = row.carousel ? { row, items: [], idx: 0, off: 0, goal: null, drag: null, hoverT: 0, hoverI: -1, y: row.y, h: row.h || 0.09,
        spacing: (row.buttons[0] ? row.buttons[0].w : 0.18) + 0.03 } : null;
      if (car) this.carousels.push(car);
      for (const b of [...row.buttons, ...(row._arrows || [])]) {
        const g = new THREE.Group(); g.position.set(x + b.w / 2, row.y, 0.02); x += b.w + gap;
        const h = row.h || 0.09;
        const base = new THREE.Mesh(new THREE.BoxGeometry(b.w, h, 0.03),
          new THREE.MeshBasicMaterial({ color: b.color || 0x3a4254, depthTest: false, transparent: true }));
        base.renderOrder = 1101; g.add(base);
        const sel = new THREE.Mesh(new THREE.PlaneGeometry(b.w + 0.012, h + 0.012),
          new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }));
        sel.scale.set(1 + 0.02 / b.w, 1.1, 1);
        sel.position.z = -0.02; sel.renderOrder = 1100; sel.visible = false; g.add(sel);
        const fill = new THREE.Mesh(new THREE.PlaneGeometry(b.w, h),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthTest: false }));
        fill.position.z = 0.016; fill.renderOrder = 1102; fill.scale.x = 0.001; fill.visible = false; g.add(fill);
        let t;
        if (b.img) {                                   // pulsante con anteprima: immagine sopra, nome sotto
          const ih = h * 0.7, im = new THREE.Mesh(new THREE.PlaneGeometry(b.w - 0.018, ih - 0.012),
            new THREE.MeshBasicMaterial({ map: b.img, transparent: true, depthTest: false, toneMapped: false }));
          im.position.set(0, h / 2 - ih / 2, 0.017); im.renderOrder = 1102; g.add(im);
          const lh = h * 0.24, px = Math.round(512 * (lh * 0.75) / (b.w - 0.01) * 0.82);
          t = lab(b.text, 0, -h / 2 + h * 0.15, b.w - 0.01, lh * 0.75, '#ffffff', px); t.position.z = 0.018; g.add(t);
        } else {
          const px = Math.round(512 * (h * 0.6) / (b.w - 0.01) * 0.82);      // scritta grande quanto il pulsante
          t = lab(b.text, 0, 0, b.w - 0.01, h * 0.6, '#ffffff', px); t.position.z = 0.018; g.add(t);
        }
        this.group.add(g);
        const bt = { ...b, w: b.w, bh: h, g, sel, fill, t: 0, base, label: t, on: false, color0: b.color || 0x3a4254 };
        if (b.x !== undefined) g.position.x = b.x;
        if (car && !b.id.startsWith('__car')) { bt.car = car; car.items.push(bt); }
        this.buttons.push(bt);
      }
    }
  }
  // evidenzia la scelta attuale (es. livello, modalita')
  select(ids) {
    for (const c of this.carousels) {
      const i = c.items.findIndex(b => ids.includes(b.id));
      if (i >= 0 && !c.drag && c.goal === null) { c.idx = i; c.off = i; }
      this._layout(c);
    }
    for (const b of this.buttons) {
      const on = ids.includes(b.id);
      b.sel.visible = on;
      b.base.material.color.setHex(on ? 0xffc928 : b.color0);      // scelta attuale: giallo pieno con scritta scura
      if (on !== b.on) { b.on = on; this._paint(b.label, b.text, on ? '#111111' : '#ffffff'); }
    }
  }
  _paint(m, text, color) {
    const { canvas: c, tex, px } = m.userData, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    let size = Math.min(px, Math.floor(c.height * 0.78));          // mai piu' alta del suo riquadro (non si taglia)
    do { g.font = `800 ${size}px system-ui, sans-serif`; size -= 2; } while (g.measureText(text).width > c.width * 0.94 && size > 10);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2); tex.needsUpdate = true;
  }
  // cambio lingua: tr(chiave) per sottotitolo, etichette delle righe e pulsanti che hanno una chiave (tk)
  relabel() {
    if (this.sub && this.spec.subtitleTk) this._paint(this.sub, tr(this.spec.subtitleTk), this.sub.userData.color);
    if (this.spec.titleTk) this.setTitle(tr(this.spec.titleTk));
    for (const r of this.rowLabels) if (r.tk) this._paint(r.m, tr(r.tk), r.m.userData.color);
    for (const b of this.buttons) if (b.tk) { b.text = tr(b.tk) + (b.disabled ? ' (' + tr('soon') + ')' : ''); this._paint(b.label, b.text, b.disabled ? '#8a909c' : b.on ? '#111111' : '#ffffff'); }
    this.titleText = null;
  }
  setTitle(text) { if (text !== this.titleText) { this.titleText = text; this._paint(this.title, text, this.title.userData.color); } }
  open(head, yaw, dist = 0.55, drop = 0.2) {
    this.age = 0;
    this.group.position.set(head.x - Math.sin(yaw) * dist, head.y - drop, head.z - Math.cos(yaw) * dist);
    this.group.rotation.set(-0.25, yaw, 0, 'YXZ');
    this.group.visible = true;
    for (const b of this.buttons) { b.t = 0; b.fill.scale.x = 0.001; }
  }
  close() { this.group.visible = false; }
  update(dt, gloves) {
    if (!this.group.visible) return null;
    this.time += dt;
    this.glow.material.opacity = 0.55 + 0.45 * Math.sin(this.time * 2.2);    // bagliore che pulsa
    this.group.updateMatrixWorld(true);
    if (this.drag && this._updateDrag(dt, gloves)) { this.moved = true; return null; }   // lo stai spostando: niente pulsanti
    this.age = (this.age || 0) + dt;
    const aimed = this.age < 0.7 ? Object.assign(new Set(), { clicked: new Set() }) :      // appena aperto: il raggio non preme ancora
      pointed(this.group, this.buttons, 0.035, b => [b.g.position.x, b.g.position.y, b.w / 2 * b.g.scale.x, b.bh / 2 * b.g.scale.y], [this.W / 2 + 0.05, this.H / 2 + 0.05]);
    for (const c of this.carousels) { const id = this._updateCarousel(c, dt, gloves, aimed); if (id) return id; }
    for (const b of this.buttons) {
      if (b.disabled || !b.g.visible || b.car) continue;       // (non ancora disponibile o nascosto; le voci a scorrimento non si "premono")
      const p = b.g.getWorldPosition(new THREE.Vector3());
      const on = aimed.has(b) || gloves.some(g => g.mesh.visible && g.center.distanceTo(p) < Math.max(0.09, b.w / 2));
      const hold = b.hold || this.hold;             // (b.hold: pulsanti da tenere premuti a lungo, es. Esci dal gioco)
      b.t = on ? b.t + dt : Math.max(0, b.t - dt * 3);
      if (aimed.clicked.has(b) && b.t >= 0 && !b.hold) b.t = hold;  // grilletto / pizzico: subito (non per quelli da tenere)
      b.fill.scale.x = Math.max(0.001, Math.min(1, b.t / hold));
      b.fill.position.x = -b.w / 2 * (1 - b.fill.scale.x);
      b.fill.visible = b.t > 0.01;                 // vuota: niente righina bianca al centro
      if (b.t >= hold) {
        b.t = -0.5;                                  // pausa breve prima di poterlo ripremere
        const m = /^__car(\d+)([+-])$/.exec(b.id);
        if (m) { const c = this.carousels[+m[1]]; c.goal = Math.max(0, Math.min(c.items.length - 1, c.idx + (m[2] === '+' ? 1 : -1))); b.t = this.hold * 0.55; continue; }
        return b.id;
      }
    }
    return null;
  }
  // barra di presa: mano (o raggio) ferma sulla barra per 0,4 s = presa; il pannello segue la mano;
  // mano ferma per 0,6 s = lasciato li'
  _updateDrag(dt, gloves) { return updateDragBar(this.drag, this.group, dt, gloves); }
  // voci a scorrimento: quella al centro e' la scelta; le altre rimpiccioliscono e spariscono ai lati
  _layout(c) {
    for (let i = 0; i < c.items.length; i++) {
      const b = c.items[i], d = i - c.off, ad = Math.abs(d);
      b.g.visible = ad < 1.45;                       // tre voci alla volta (le altre scorrono)
      b.g.position.set(d * c.spacing, c.y, 0.02 - Math.min(1, ad) * 0.01);
      b.g.scale.setScalar(1 - 0.16 * Math.min(1, ad));
    }
  }
  _updateCarousel(c, dt, gloves, aimed) {
    const n = c.items.length;
    // mano dentro la fascia della riga: la fila segue il movimento della mano
    let hand = null;
    for (const g of gloves) {
      if (!g.mesh.visible) continue;
      const l = this.group.worldToLocal(g.center.clone());
      if (Math.abs(l.y - c.y) < c.h / 2 + 0.04 && Math.abs(l.x) < this.W / 2 && Math.abs(l.z) < 0.16) { hand = l; break; }
    }
    c.vel = c.vel || 0;
    if (hand) {
      if (c.drag) {
        // la fila va un po' piu' della mano (1,5x: meno fatica), con la velocita' misurata per lo slancio
        const d = -(hand.x - c.drag.x) * 1.5 / c.spacing;
        c.off = Math.max(-0.45, Math.min(n - 0.55, c.off + d));
        if (dt > 0) c.vel += (d / dt - c.vel) * 0.35;
        if (Math.abs(d) > 0.004) { c.goal = null; c.target = null; }
      } else c.vel = 0;
      c.drag = { x: hand.x };
    } else if (c.drag) {
      // lasciata: scivola con lo slancio (al massimo ~2 voci) e si ferma esattamente su una voce
      c.drag = null;
      const v = Math.max(-9, Math.min(9, c.vel));
      c.vel = v; c.target = Math.max(0, Math.min(n - 1, Math.round(c.off + v * 0.22)));
    }
    // puntare (raggio) o tenere ferma la mano su una voce laterale per mezzo secondo: va al centro
    let hov = -1;
    c.items.forEach((b, i) => { if (b.g.visible && aimed.has(b)) hov = i; });
    if (hov >= 0 && hov !== c.idx && !hand) { if (hov === c.hoverI) c.hoverT += dt; else { c.hoverI = hov; c.hoverT = 0; } if (c.hoverT > 0.45) { c.goal = hov; c.hoverT = 0; } }
    else { c.hoverI = -1; c.hoverT = 0; }
    if (!c.drag) {                                   // lasciata: va (morbida) sulla voce scelta dallo slancio, o su quella chiesta
      const target = c.goal !== null ? c.goal : (c.target != null ? c.target : Math.max(0, Math.min(n - 1, Math.round(c.off))));
      const w = 9, h = Math.min(dt, 0.05);           // molla smorzata: parte con la velocita' della mano, arriva senza rimbalzi
      c.vel += (w * w * (target - c.off) - 2 * w * c.vel) * h; c.off += c.vel * h;
      if (Math.abs(target - c.off) < 0.008 && Math.abs(c.vel) < 0.08) {
        c.off = target; c.goal = null; c.target = null; c.vel = 0;
        if (target !== c.idx) { c.idx = target; this._layout(c); return c.items[target].id; }
      }
    }
    this._layout(c);
    return null;
  }
}

// Numero del conto alla rovescia in un angolo della vista: entra grande e "pulsa", dal giallo al rosso.
export class CountdownHUD {
  constructor(camera) {
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = 256;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075),
      new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, toneMapped: false }));
    this.mesh.renderOrder = 1300; this.mesh.position.set(0.12, 0.085, -0.4); this.mesh.visible = false;
    camera.add(this.mesh);
    this.n = null; this.t = 0;
  }
  show(n, urgency = 0) {
    if (n === this.n && this.mesh.visible) return;
    this.n = n; this.t = 0; this.mesh.visible = true;
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    const col = `rgb(255, ${Math.round(211 - 180 * urgency)}, ${Math.round(77 - 60 * urgency)})`;
    g.fillStyle = 'rgba(10,12,18,0.7)'; g.beginPath(); g.arc(128, 128, 120, 0, Math.PI * 2); g.fill();
    g.strokeStyle = col; g.lineWidth = 10; g.stroke();
    g.fillStyle = col; g.font = '900 150px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n), 128, 138);
    this.tex.needsUpdate = true;
  }
  hide() { this.mesh.visible = false; this.n = null; }
  update(dt) {
    if (!this.mesh.visible) return;
    this.t += dt;
    const k = Math.max(0, 1 - this.t / 0.35);                 // entra grande e si assesta
    this.mesh.scale.setScalar(1 + 0.6 * k * k);
    this.mesh.material.opacity = Math.min(1, 0.4 + this.t * 3);
  }
}
