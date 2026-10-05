// Torneo a eliminazione diretta da 32: tu + 31 pugili. I tuoi 5 avversari sono sempre personaggi veri del
// gioco (se non bastano si ripetono); gli altri sono nomi inventati con una sagoma nera e perdono sempre
// contro un personaggio vero. Il tabellone e' una tela disegnata (come nel foglio del torneo) appesa davanti
// a te; le animazioni (chi combatte, chi passa il turno, il campione che arriva alla coppa) sono oggetti 3D
// che si muovono sopra la tela.
import * as THREE from 'three';
import { t } from './i18n.js?v=20261005210731';

// misure del tabellone: cambiano con il numero di partecipanti (32: 5 turni, 64: 6 turni e tela piu' alta)
let W = 2048, H = 1024;                    // tela del tabellone
const PW = 1.6; let PH = PW * H / W;       // pannello in metri
let BW = 150, BH = 40, COL = 172;          // casella: larghezza, altezza, passo tra le colonne (px)
let TOP = 150, BOT = 990, NR = 5;          // NR = turni
function setLayout(size) {
  NR = Math.round(Math.log2(size));
  if (NR >= 6) { H = 1500; BW = 128; BH = 31; COL = 140; TOP = 150; BOT = 1465; }
  else { H = 1024; BW = 150; BH = 40; COL = 172; TOP = 150; BOT = 990; }
  PH = PW * H / W;
}
const CHAMP_Y = () => Math.round(H * 0.46), CUP_Y = () => Math.round(H * 0.322);

const FIRST = ['Tony', 'Ivan', 'Rocco', 'Carlos', 'Kenji', 'Marcus', 'Dmitri', 'Leon', 'Viktor', 'Diego', 'Sami', 'Jake',
  'Omar', 'Luca', 'Andre', 'Hector', 'Bo', 'Tariq', 'Nikolai', 'Rafael', 'Kofi', 'Sean', 'Mateo', 'Yuri', 'Dante', 'Emil',
  'Joe', 'Kwame', 'Paolo', 'Rex', 'Stefan', 'Tommy', 'Vito', 'Hiro', 'Bruno', 'Felix'];
const LAST = ['Rocca', 'Petrov', 'Santos', 'Kane', 'Moreno', 'Okafor', 'Novak', 'Ferraro', 'Wright', 'Tanaka', 'Duarte',
  'Brennan', 'Volkov', 'Silva', 'Mensah', 'Costa', 'Hughes', 'Ricci', 'Kowalski', 'Ortega', 'Baker', 'Nakamura',
  'Lombardi', 'Grant', 'Ibarra', 'Stone', 'Marino', 'Dragan', 'Cruz', 'Fox', 'Bianchi', 'Steel'];
const ROUND_KEYS = ['tr_r64', 'tr_r32', 'tr_r16', 'tr_qf', 'tr_sf', 'tr_f'];

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export class Tournament {
  // fighters: { id: { name, thumb, face:[x,y,size] } }
  // spectator: torneo da guardare (tu non ci sei): 16 personaggi veri, ognuno contro un nome inventato al primo turno
  // size: 32 o 64 partecipanti. Al primo turno i personaggi veri affrontano un nome inventato finche' ce ne sono:
  // tra loro si incontrano solo quelli in piu' (con 32 e 36 personaggi sono tutti veri)
  constructor(fighters, spectator = false, size = 32) {
    this.spectator = spectator; this.size = size; this.rounds = Math.round(Math.log2(size));
    setLayout(size);                                 // (i nomi dei turni dipendono da quanti sono)
    const ids = shuffle(Object.keys(fighters));
    const used = new Set(), fake = () => {
      let n; do n = FIRST[Math.floor(Math.random() * FIRST.length)] + ' ' + LAST[Math.floor(Math.random() * LAST.length)]; while (used.has(n));
      used.add(n); return { kind: 'fake', name: n };
    };
    const slots = Array.from({ length: size }, () => null);
    const real = id => ({ kind: 'real', id, name: fighters[id].name });
    // Teste di serie: al primo turno ogni personaggio vero affronta un nome inventato (e lo batte), cosi' i veri si
    // incontrano tra loro solo dal secondo turno in poi. Tu sei l'eccezione: il tuo primo avversario e' vero.
    // Entrano 15 personaggi (tu + 15 = 16 vincitori del primo turno); gli altri restano fuori, a caso ogni volta.
    const M = size / 2;                              // incontri del primo turno
    let rest, free;
    if (spectator) { rest = ids.slice(0, size); free = shuffle(Array.from({ length: M }, (_, k) => k)); }
    else {
      slots[0] = { kind: 'you' }; slots[1] = real(ids[0]);
      rest = ids.slice(1, size - 1); free = shuffle(Array.from({ length: M - 1 }, (_, k) => k + 1));
    }
    const doubles = Math.max(0, rest.length - free.length);       // incontri tra due veri (solo quelli che servono)
    let k = 0;
    free.forEach((m, i) => {
      if (k >= rest.length) return;
      if (i < doubles) { slots[m * 2] = real(rest[k++]); slots[m * 2 + 1] = real(rest[k++]); }
      else slots[m * 2 + (Math.random() < 0.5 ? 0 : 1)] = real(rest[k++]);
    });
    this.opp = [ids[0]];
    for (let i = 0; i < size; i++) if (!slots[i]) slots[i] = fake();
    this.p = slots;                                   // partecipanti
    this.ent = [slots.map((_, i) => i)];             // ent[r][j] = indice del partecipante in posizione j al turno r
    this.round = 0; this.state = 'next';            // next | won | lost | champion
  }
  // il tuo avversario di questo turno: chi ti sta accanto nel tabellone (puo' dipendere da un incontro CPU)
  opponentIndex() { const row = this.ent[this.round], j = row.indexOf(0); return row[j ^ 1]; }
  opponent() { return this.p[this.opponentIndex()].id; }
  // incontri di questo turno tra due personaggi veri della CPU (senza di te): [{ j, a, b }] (indici dei partecipanti)
  cpuMatches() {
    const row = this.ent[this.round], out = [];
    for (let j = 0; j < row.length; j += 2) {
      const A = this.p[row[j]], B = this.p[row[j + 1]];
      if (A.kind === 'real' && B.kind === 'real') out.push({ j, a: row[j], b: row[j + 1] });
    }
    return out;
  }
  // risultato del tuo incontro: si giocano anche tutti gli altri del turno
  result(youWon, forced = {}) {                       // forced: { j: vincitore } per gli incontri CPU gia' visti
    const r = this.round, cur = this.ent[r], nxt = [];
    for (let j = 0; j < cur.length; j += 2) {
      const a = cur[j], b = cur[j + 1], A = this.p[a], B = this.p[b];
      let w;
      if (forced[j] !== undefined) w = forced[j];
      else if (A.kind === 'you') w = youWon ? a : b;
      else if (B.kind === 'you') w = youWon ? b : a;
      else if (A.kind === 'real' && B.kind !== 'real') w = a;      // un personaggio vero batte sempre uno inventato
      else if (B.kind === 'real' && A.kind !== 'real') w = b;
      else w = Math.random() < 0.5 ? a : b;
      nxt.push(w);
    }
    this.ent.push(nxt);
    if (!youWon) this.state = 'lost';
    else if (r === this.rounds - 1) this.state = 'champion';
    else { this.round++; this.state = 'next'; }
    return r;                                         // turno appena giocato (per l'animazione)
  }
  // nome del turno r contando dalla finale: 0 = trentaduesimi ... 5 = finale (per testi e voci)
  stage(r = this.round) { return r + 6 - this.rounds; }
  isFinal(r = this.round) { return r === this.rounds - 1; }
}

// ---------------------------------------------------------------- disegno e animazioni
// posizione (centro, in px della tela) della casella j del turno r (r = 0..NR-1; r = NR = campione)
function boxPos(r, j) {
  if (r === NR) return { x: W / 2, y: CHAMP_Y() };
  const n = (1 << NR) >> r, half = n / 2, left = j < half, k = left ? j : j - half;
  const span = BOT - TOP, y = TOP + (k + 0.5) * span / half;
  const x = left ? 20 + BW / 2 + r * COL : W - 20 - BW / 2 - r * COL;
  return { x, y };
}

function roundRect(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

export class BracketView {
  constructor(scene, fighters) {
    this.fighters = fighters;
    this.group = new THREE.Group(); this.group.name = 'tabellone torneo'; this.group.visible = false;
    scene.add(this.group);
    this.canvas = document.createElement('canvas'); this.canvas.width = W; this.canvas.height = H;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, toneMapped: false }));
    board.renderOrder = 1100; this.group.add(board);
    // evidenziatori del tuo prossimo incontro (cornici che pulsano)
    this.hl = [0, 1].map(() => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this._glowTex(), transparent: true, depthTest: false, toneMapped: false }));
      m.renderOrder = 1101; m.visible = false; this.group.add(m); return m;
    });
    this.trophyGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: this._haloTex(), transparent: true, depthTest: false, toneMapped: false, opacity: 0 }));
    this.trophyGlow.renderOrder = 1099; this.trophyGlow.position.set(this._lx(W / 2), this._ly(CUP_Y()), 0.002); this.group.add(this.trophyGlow);
    this.board = board; this.size = 32;
    this.tokens = []; this.time = 0; this.anim = null;
    // icone: volti dei pugili veri (ritagliati dalle anteprime)
    this.faces = {};
    for (const [id, f] of Object.entries(fighters)) { const im = new Image(); im.src = f.thumb; im.onload = () => this.draw(); this.faces[id] = im; }
  }
  // tabellone da 32 o da 64: tela e pannello della misura giusta
  _fit(T) {
    if (!T || T.size === this.size) return;
    this.size = T.size; setLayout(T.size);
    this.canvas.height = H; this.tex.dispose();
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.board.material.map = this.tex; this.board.material.needsUpdate = true;
    this.board.geometry.dispose(); this.board.geometry = new THREE.PlaneGeometry(PW, PH);
    this.trophyGlow.position.set(this._lx(W / 2), this._ly(CUP_Y()), 0.002);
  }
  _lx(px) { return (px / W - 0.5) * PW; }
  halfH() { return PH / 2; }
  _ly(py) { return (0.5 - py / H) * PH; }
  _glowTex() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
    g.shadowColor = '#ffd34d'; g.shadowBlur = 18; g.strokeStyle = '#ffd34d'; g.lineWidth = 7;
    roundRect(g, 18, 18, 220, 60, 10); g.stroke(); g.stroke();
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }
  _haloTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,220,90,0.9)'); gr.addColorStop(1, 'rgba(255,200,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const tx = new THREE.CanvasTexture(c); return tx;
  }
  // icona di un partecipante, disegnata in un cerchio
  _icon(g, P, cx, cy, r) {
    g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath();
    g.fillStyle = P.kind === 'you' ? '#c4161f' : '#3a404c'; g.fill(); g.clip();
    if (P.kind === 'real' && this.faces[P.id] && this.faces[P.id].complete && this.faces[P.id].naturalWidth) {
      const [fx, fy, fs] = this.fighters[P.id].face;
      g.drawImage(this.faces[P.id], fx, fy, fs, fs, cx - r, cy - r, 2 * r, 2 * r);
    } else if (P.kind === 'fake') {                     // sagoma nera di un pugile in guardia
      g.fillStyle = '#0b0c0f';
      g.beginPath(); g.arc(cx, cy - r * 0.28, r * 0.3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(cx, cy + r * 0.62, r * 0.62, r * 0.48, 0, Math.PI, 0); g.fill();
      g.beginPath(); g.arc(cx - r * 0.42, cy + r * 0.08, r * 0.2, 0, Math.PI * 2); g.arc(cx + r * 0.42, cy + r * 0.08, r * 0.2, 0, Math.PI * 2); g.fill();
    } else if (P.kind === 'you') {                      // il tuo guantone rosso
      g.fillStyle = '#ffffff'; g.font = `900 ${Math.round(r * 0.8)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(t('you'), cx, cy + 1);
    }
    g.restore();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
  }
  _name(P) { return P.kind === 'you' ? t('you') : P.name; }
  _box(g, P, x, y, opts = {}) {
    const w = opts.w || BW, h = opts.h || BH;
    roundRect(g, x - w / 2, y - h / 2, w, h, 7);
    g.fillStyle = opts.out ? 'rgba(22,24,30,0.9)' : 'rgba(30,34,44,0.95)'; g.fill();
    g.lineWidth = opts.you ? 3 : 2; g.strokeStyle = opts.you ? '#e5484d' : opts.gold ? '#ffc928' : '#4a5163'; g.stroke();
    if (!P) return;
    const r = h * 0.38;
    this._icon(g, P, x - w / 2 + r + (h < 36 ? 4 : 6), y, r);
    g.fillStyle = opts.out ? '#6b7280' : '#ffffff';
    let size = Math.round(h * 0.42);
    g.textAlign = 'left'; g.textBaseline = 'middle';
    const name = this._name(P), room = w - 2 * r - 18;
    do { g.font = `800 ${size}px system-ui, sans-serif`; size--; } while (g.measureText(name).width > room && size > 9);
    g.fillText(name, x - w / 2 + 2 * r + 12, y + 1);
  }
  draw(hideFrom = null) {
    const T = this.T; if (!T) return;
    this._fit(T);
    const g = this.canvas.getContext('2d');
    g.clearRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, 'rgba(14,17,26,0.96)'); bg.addColorStop(1, 'rgba(6,8,12,0.96)');
    roundRect(g, 6, 6, W - 12, H - 12, 28); g.fillStyle = bg; g.fill();
    const gold = g.createLinearGradient(0, 0, W, H); gold.addColorStop(0, '#fff1a8'); gold.addColorStop(0.4, '#ffc928'); gold.addColorStop(1, '#d99a14');
    g.lineWidth = 8; g.strokeStyle = gold; g.stroke();
    // titolo e sottotitolo
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd34d'; g.font = '900 56px system-ui, sans-serif'; g.fillText(t('tr_title'), W / 2, 58);
    g.fillStyle = '#e6e8ee'; g.font = '700 32px system-ui, sans-serif'; g.fillText(this.subtitle || '', W / 2, 108);
    // linee: dal turno r al turno r+1 (dorate se il passaggio e' gia' avvenuto)
    for (let r = 0; r < NR; r++) {
      const n = (1 << NR) >> r;
      for (let j = 0; j < n; j++) {
        const a = boxPos(r, j), b = boxPos(r + 1, j >> 1), left = r < NR - 1 ? j < n / 2 : j === 0;
        const done = T.ent[r + 1] && T.ent[r + 1][j >> 1] === T.ent[r][j] && !(hideFrom !== null && r >= hideFrom);
        g.strokeStyle = done ? '#ffc928' : '#3b4252'; g.lineWidth = done ? 4 : 3;
        const x0 = a.x + (left ? BW / 2 : -BW / 2), xm = x0 + (left ? 11 : -11);
        const xe = r === NR - 1 ? b.x + (left ? -95 : 95) : b.x + (left ? -BW / 2 : BW / 2);
        g.beginPath(); g.moveTo(x0, a.y); g.lineTo(xm, a.y); g.lineTo(xm, b.y); g.lineTo(xe, b.y); g.stroke();
      }
    }
    // caselle
    for (let r = 0; r < NR; r++) {
      const row = T.ent[r]; if (!row || (hideFrom !== null && r > hideFrom)) continue;
      for (let j = 0; j < row.length; j++) {
        const P = T.p[row[j]], q = boxPos(r, j);
        const out = T.ent[r + 1] && T.ent[r + 1][j >> 1] !== row[j] && !(hideFrom !== null && r >= hideFrom);
        this._box(g, P, q.x, q.y, { you: P.kind === 'you', out });
      }
    }
    // turni futuri: caselle vuote
    for (let r = 1; r < NR; r++) if (!T.ent[r] || (hideFrom !== null && r > hideFrom)) for (let j = 0; j < (1 << NR) >> r; j++) { const q = boxPos(r, j); this._box(g, null, q.x, q.y); }
    // coppa e casella del campione
    this._trophy(g, W / 2, CUP_Y());
    const champ = T.ent[NR] && !(hideFrom !== null && hideFrom >= NR - 1) ? T.p[T.ent[NR][0]] : null;
    this._box(g, champ, W / 2, CHAMP_Y(), { w: 210, h: 54, gold: true, you: champ && champ.kind === 'you' });
    // quanti partecipanti: targhetta sotto la casella del campione
    g.fillStyle = '#ffd34d'; g.font = '800 26px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(t('tr_size', { n: T.size }), W / 2, CHAMP_Y() + 62);
    this.tex.needsUpdate = true;
  }
  _trophy(g, x, y) {
    const gr = g.createLinearGradient(x - 60, 0, x + 60, 0); gr.addColorStop(0, '#b8860b'); gr.addColorStop(0.5, '#ffe27a'); gr.addColorStop(1, '#b8860b');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x - 58, y - 80); g.lineTo(x + 58, y - 80); g.quadraticCurveTo(x + 52, y + 10, x, y + 22); g.quadraticCurveTo(x - 52, y + 10, x - 58, y - 80); g.fill();
    g.lineWidth = 9; g.strokeStyle = gr;
    g.beginPath(); g.arc(x - 62, y - 48, 24, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
    g.beginPath(); g.arc(x + 62, y - 48, 24, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
    g.fillRect(x - 10, y + 18, 20, 34); g.fillRect(x - 46, y + 50, 92, 18);
    g.fillStyle = '#7a5a10'; g.font = '900 30px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('★', x, y - 40);
  }
  open(head, yaw) {
    this.group.position.set(head.x - Math.sin(yaw) * 1.05, head.y + 0.05, head.z - Math.cos(yaw) * 1.05);
    this.group.rotation.set(0, yaw, 0);
    this.group.visible = true;
  }
  close() { this.group.visible = false; this.hl.forEach(h => (h.visible = false)); this._clearTokens(); }
  // prima di un incontro: evidenzia le due caselle del tuo prossimo incontro
  showNext(T, subtitle) {
    this.T = T; this._fit(T); this.subtitle = subtitle; this.anim = null; this._clearTokens();
    this.draw();
    const r = T.round, j = T.ent[r].indexOf(0);
    [j, j ^ 1].forEach((jj, k) => {
      const q = boxPos(r, jj), h = this.hl[k];
      h.position.set(this._lx(q.x), this._ly(q.y), 0.003); h.scale.set((BW + 40) / W * PW * 1.1, (BH + 40) / H * PH * 1.2, 1); h.visible = true;
    });
    this.trophyGlow.material.opacity = 0;
  }
  // evidenzia due caselle (un incontro) del turno r
  highlight(r, j) {
    [j, j ^ 1].forEach((jj, k) => {
      const q = boxPos(r, jj), h = this.hl[k];
      h.position.set(this._lx(q.x), this._ly(q.y), 0.003); h.scale.set((BW + 40) / W * PW * 1.1, (BH + 40) / H * PH * 1.2, 1); h.visible = true;
    });
  }
  showCpu(T, j, subtitle) { this.T = T; this._fit(T); this.subtitle = subtitle; this.anim = null; this._clearTokens(); this.draw(); this.highlight(T.round, j); this.trophyGlow.material.opacity = 0; }
  // dopo un incontro: i vincitori del turno avanzano (gettoni che corrono lungo le linee)
  showAdvance(T, r, subtitle, onDone) {
    this.T = T; this._fit(T); this.subtitle = subtitle; this.hl.forEach(h => (h.visible = false)); this._clearTokens();
    this.draw(r);                                      // il turno r ancora senza vincitori
    const nxt = T.ent[r + 1];
    nxt.forEach((pi, jj) => {
      const j = T.ent[r].indexOf(pi), a = boxPos(r, j), b = boxPos(r + 1, jj);
      const tok = this._token(T.p[pi], r === NR - 1 ? { w: 210, h: 54 } : {});
      tok.userData = { a, b, left: r < NR - 1 ? j < T.ent[r].length / 2 : j === 0 };
      tok.position.set(this._lx(a.x), this._ly(a.y), 0.004);
      this.group.add(tok); this.tokens.push(tok);
    });
    this.anim = { t: 0, dur: r === NR - 1 ? 2.0 : 1.4, r, onDone };
  }
  _token(P, opts) {
    const w = opts.w || BW, h = opts.h || BH;
    const c = document.createElement('canvas'); c.width = w + 8; c.height = h + 8;
    const g = c.getContext('2d'); g.translate(4, 4);
    this._box(g, P, w / 2, h / 2, { w, h, you: P.kind === 'you', gold: P.kind !== 'you' });
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry((w + 8) / W * PW, (h + 8) / H * PH), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthTest: false, toneMapped: false }));
    m.renderOrder = 1102; return m;
  }
  _clearTokens() { for (const k of this.tokens) { this.group.remove(k); k.geometry.dispose(); k.material.map.dispose(); k.material.dispose(); } this.tokens = []; }
  update(dt) {
    if (!this.group.visible) return;
    this.time += dt;
    const p = 0.55 + 0.45 * Math.sin(this.time * 5);
    for (const h of this.hl) if (h.visible) h.material.opacity = p;
    if (this.T && this.T.state === 'champion' && !this.anim) this.trophyGlow.material.opacity = 0.6 + 0.4 * Math.sin(this.time * 3);
    const A = this.anim; if (!A) return;
    A.t += dt;
    const k = Math.min(1, A.t / A.dur), e = k * k * (3 - 2 * k);
    for (const tok of this.tokens) {
      const { a, b, left } = tok.userData;
      // percorso a gomito: in orizzontale fino alla linea, poi in verticale, poi alla casella
      const xm = a.x + (left ? BW / 2 + 11 : -BW / 2 - 11);
      let x, y;
      if (e < 0.33) { const u = e / 0.33; x = a.x + (xm - a.x) * u; y = a.y; }
      else if (e < 0.66) { const u = (e - 0.33) / 0.33; x = xm; y = a.y + (b.y - a.y) * u; }
      else { const u = (e - 0.66) / 0.34; x = xm + (b.x - xm) * u; y = b.y; }
      tok.position.set(this._lx(x), this._ly(y), 0.004);
      tok.scale.setScalar(1 + 0.25 * Math.sin(Math.PI * e));
    }
    if (A.r === NR - 1) this.trophyGlow.material.opacity = e;
    if (k >= 1) {
      this.anim = null; this._clearTokens(); this.draw();
      if (A.onDone) A.onDone();
    }
  }
  roundName(r) { return t(ROUND_KEYS[r + 6 - NR]); }
}
