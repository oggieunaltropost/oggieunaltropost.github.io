// Sparring con il partner (in palestra, sul ring). Niente KO e niente punteggio da incontro: si lavora.
//  - libero: il partner combatte con la sua intelligenza, alla velocita' scelta
//  - combinazioni: l'allenatore chiama ("jab, diretto, gancio!"), il partner abbassa la guardia e tu tiri;
//    si riconosce che colpo hai tirato (diritto, gancio, montante, al corpo, con quale mano)
//  - difesa: l'allenatore annuncia ("schiva!", "para!", "giu'!"), il partner tira quel colpo; poi devi tornare in guardia
// Durata libera: si va avanti finche' non fermi dalla pausa. La velocita' del partner (colpi, andata e ritorno,
// spostamenti, parate) si regola trascinando su e giu' il cursore della barra al tuo fianco.
import * as THREE from 'three';
import * as sfx from './sfx.js?v=20261004121714';
import { t as tr } from './i18n.js?v=20261004121714';

// combinazioni chiamate: voce, colpi che tira il partner (non qui) e quello che devi tirare tu
// codici: 1 jab, 2 diretto, 3 gancio sinistro, 4 gancio destro, 5 montante sinistro, 6 montante destro; 'b' = al corpo
const CALLS = [
  { v: 'c_k_1', seq: ['1'], lvl: 0 }, { v: 'c_k_2', seq: ['2'], lvl: 0 }, { v: 'c_k_11', seq: ['1', '1'], lvl: 0 },
  { v: 'c_k_12', seq: ['1', '2'], lvl: 0 }, { v: 'c_k_112', seq: ['1', '1', '2'], lvl: 1 }, { v: 'c_k_123', seq: ['1', '2', '3'], lvl: 1 },
  { v: 'c_k_32', seq: ['3', '2'], lvl: 1 }, { v: 'c_k_23', seq: ['2', '3'], lvl: 1 }, { v: 'c_k_16', seq: ['1', '6'], lvl: 1 },
  { v: 'c_k_63', seq: ['6', '3'], lvl: 2 }, { v: 'c_k_34', seq: ['3', '4'], lvl: 2 }, { v: 'c_k_1232', seq: ['1', '2', '3', '2'], lvl: 2 },
  { v: 'c_k_b', seq: ['b'], lvl: 0 }, { v: 'c_k_12b', seq: ['1', '2b'], lvl: 1 },
];
// difesa: cosa annuncia l'allenatore e cosa tira il partner
const ATTACKS = [
  { v: 'c_d_slip', combo: ['jab'] }, { v: 'c_d_slip', combo: ['cross'] }, { v: 'c_d_block', combo: ['jab'] },
  { v: 'c_d_block', combo: ['cross'] }, { v: 'c_d_duck', combo: ['hook_l'] }, { v: 'c_d_duck', combo: ['hook_r'] },
  { v: 'c_d_body', combo: ['body_r'] }, { v: 'c_d_body', combo: ['body_l'] },
];
const pick = a => a[Math.floor(Math.random() * a.length)];
const GOOD = ['c_good1', 'c_good2', 'c_good3', 'c_good4'];

export class Sparring {
  constructor(scene) {
    this.scene = scene;
    this._board(); this._slider();
    let p = 0.12; try { const v = parseFloat(localStorage.getItem('hb-spar-speed')); if (v >= 0 && v <= 1) p = v; } catch (e) {}
    this.p = p;
    this.active = false;
  }
  get speed() { return 0.3 + 0.9 * this.p; }                     // 30% .. 120% della velocita' normale

  // ---- tabellone (sopra il ring, dietro al partner)
  _board() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; this.bc = c;
    this.btex = new THREE.CanvasTexture(c); this.btex.colorSpace = THREE.SRGBColorSpace;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.66, 0.04), new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.5, metalness: 0.4 }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.59), new THREE.MeshBasicMaterial({ map: this.btex, toneMapped: false })); face.position.z = 0.021; frame.add(face);
    this.board = frame; frame.visible = false; this.lastDraw = '';
  }
  _drawBoard() {
    const t = Math.floor(this.time), mm = Math.floor(t / 60), ss = t % 60, S = this.st;
    let cells;
    if (this.kind === 'combo') {
      const tot = S.ok + S.bad;
      cells = [[tr('sp_ok'), S.ok, '#4cff7a'], [tr('sp_wrong'), S.bad, '#ff5a5a'], [tr('speed_acc'), tot ? Math.round(S.ok / tot * 100) + '%' : '—', '#fff']];
    } else if (this.kind === 'difesa') {
      cells = [[tr('sp_avoided'), S.avoided, '#4cff7a'], [tr('sp_taken'), S.taken, '#ff5a5a'], [tr('sp_guard'), S.guardN ? Math.round(S.guardOk / S.guardN * 100) + '%' : '—', '#fff']];
    } else {
      cells = [[tr('sp_landed'), S.landed, '#4cff7a'], [tr('sp_taken'), S.taken, '#ff5a5a'], [tr('sp_defended'), S.blocked + S.dodged, '#4cb8ff']];
    }
    const key = `${mm}:${ss}|${cells.map(c => c[1]).join('|')}|${Math.round(this.speed * 100)}`;
    if (key === this.lastDraw) return; this.lastDraw = key;
    const g = this.bc.getContext('2d'), W = 1024;
    g.fillStyle = '#07080a'; g.fillRect(0, 0, W, 512);
    g.fillStyle = '#9a1418'; g.fillRect(0, 0, W, 72);
    g.fillStyle = '#fff'; g.font = '900 44px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tr('sp_title') + ' · ' + tr('sp_' + this.kind), W / 2, 37);
    g.fillStyle = '#9aa3b6'; g.font = '700 32px system-ui, sans-serif'; g.fillText(tr('bag_time'), W * 0.25, 120); g.fillText(tr('sp_speed'), W * 0.75, 120);
    g.fillStyle = '#ffd34d'; g.font = '900 100px "Courier New", monospace'; g.fillText(`${mm}:${String(ss).padStart(2, '0')}`, W * 0.25, 205);
    g.fillStyle = '#4cb8ff'; g.fillText(Math.round(this.speed * 100) + '%', W * 0.75, 205);
    g.strokeStyle = '#2a2e36'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 290); g.lineTo(W - 40, 290); g.stroke();
    cells.forEach(([lab, val, col], i) => {
      const x = W * (i + 0.5) / 3;
      g.fillStyle = '#9aa3b6'; g.font = '700 30px system-ui, sans-serif'; g.fillText(lab, x, 335);
      g.fillStyle = col; g.font = '900 86px "Courier New", monospace'; g.fillText(String(val), x, 425);
    });
    this.btex.needsUpdate = true;
  }

  // ---- cursore della velocita': barra verticale al tuo fianco; tieni il guantone sul pomello e trascinalo
  _slider() {
    const G = new THREE.Group(); G.visible = false;
    const track = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.6 })); G.add(track);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.037, 1, 0.022), new THREE.MeshBasicMaterial({ color: 0x4cb8ff })); G.add(fill);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.3 })); G.add(knob);
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; this.sc = c;
    this.stex = new THREE.CanvasTexture(c); this.stex.colorSpace = THREE.SRGBColorSpace;
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshBasicMaterial({ map: this.stex, transparent: true, depthWrite: false })); lab.position.y = 0.31; G.add(lab);
    this.slider = { G, knob, fill, lab, grab: null, hover: 0, last: '' };
  }
  _drawSlider() {
    const txt = `${tr('sp_speed')} ${Math.round(this.speed * 100)}%`;
    if (txt === this.slider.last) return; this.slider.last = txt;
    const g = this.sc.getContext('2d'); g.clearRect(0, 0, 256, 96);
    g.fillStyle = 'rgba(10,12,16,0.85)'; g.beginPath(); g.roundRect(0, 0, 256, 96, 20); g.fill();
    g.fillStyle = '#fff'; g.font = '800 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 48);
    this.stex.needsUpdate = true;
  }
  _layoutSlider() {
    const S = this.slider, y = -0.25 + 0.5 * this.p;
    S.knob.position.set(0, y, 0.02); S.fill.scale.y = Math.max(0.001, 0.5 * this.p); S.fill.position.y = -0.25 + 0.25 * this.p;
    this._drawSlider();
  }
  _updSlider(dt, player) {
    const S = this.slider; if (!S.G.visible) return;
    S.G.updateMatrixWorld(true);
    const kw = S.knob.getWorldPosition(new THREE.Vector3());
    if (S.grab) {
      const g = player.gloves[S.grab];
      if (!g.mesh.visible) { S.grab = null; return; }
      const loc = S.G.worldToLocal(g.center.clone());
      if (Math.hypot(loc.x, loc.z) > 0.2) { S.grab = null; S.knob.material.color.set(0xf2f2f2); return; }   // allontani la mano: lasciato
      this.p = THREE.MathUtils.clamp((loc.y + 0.25) / 0.5, 0, 1);
      this._layoutSlider(); this._applySpeed();
      S.still = g.speed < 0.05 ? (S.still || 0) + dt : 0;
      if (S.still > 0.8) { S.grab = null; S.knob.material.color.set(0xf2f2f2); try { localStorage.setItem('hb-spar-speed', this.p.toFixed(3)); } catch (e) {} }
      return;
    }
    let near = null;
    for (const side of ['left', 'right']) { const g = player.gloves[side]; if (g.mesh.visible && g.center.distanceTo(kw) < 0.08) near = side; }
    S.hover = near ? S.hover + dt : 0;
    S.knob.material.color.set(near ? 0xffd34d : 0xf2f2f2);
    if (near && S.hover > 0.35) { S.grab = near; S.hover = 0; S.still = 0; sfx.punchBlock(); }
  }

  // ---- velocita' del partner: tutto piu' lento (colpi andata e ritorno, passi, parate, frequenza degli attacchi)
  _applySpeed() {
    if (!this.mike || !this.base) return;
    const s = this.speed, b = this.base, m = this.mike;
    m.cfg = { ...b, punchSpeed: b.punchSpeed * s, moveSpeed: b.moveSpeed * Math.pow(s, 0.7), defenseSpeed: b.defenseSpeed * s,
      attackEvery: b.attackEvery.map(v => v / s), retreatTime: b.retreatTime / s,
      reactDelay: Array.isArray(b.reactDelay) ? b.reactDelay.map(v => v / s) : b.reactDelay };
    if (this.kind !== 'libero') m.cfg = { ...m.cfg, reactChance: this.kind === 'combo' ? 0 : m.cfg.reactChance, evade: 0, reflex: 0, feints: 0, counterChance: 0 };
    if (this.kind === 'combo') m.cfg.moveSpeed *= 0.2;                       // nelle combinazioni sta quasi fermo davanti a te
  }

  // ---- inizio / fine
  start(kind, mike, arena, boardPos, slidePos, lookAt) {
    this.kind = kind; this.mike = mike; this.arena = arena; this.active = true;
    this.base = { ...mike.cfg };
    mike.noAttack = kind !== 'libero';
    this._applySpeed();
    arena.add(this.board); this.board.position.copy(boardPos); this.board.visible = true;
    arena.add(this.slider.G); this.slider.G.position.copy(slidePos); this.slider.G.visible = true;
    arena.updateMatrixWorld(true); this.board.lookAt(lookAt); this.slider.G.lookAt(lookAt);   // girati verso di te
    this._layoutSlider();
    this.reset();
    sfx.announce(['c_start', { libero: 'c_free', combo: 'c_combo', difesa: 'c_defense' }[kind]]);
    this.next = 3.5;                                          // primo esercizio dopo la presentazione
  }
  stop(sayTips = true) {
    if (!this.active) return;
    this.active = false; this.board.visible = false; this.slider.G.visible = false;
    if (this.mike) { this.mike.noAttack = false; if (this.base) this.mike.cfg = this.base; }
    if (sayTips && this.time > 20) sfx.announce(['c_end', this._tip()]);
  }
  reset() {
    this.time = 0; this.st = { ok: 0, bad: 0, avoided: 0, taken: 0, guardOk: 0, guardN: 0, landed: 0, blocked: 0, dodged: 0, thrown: 0, body: 0, headTaken: 0 };
    this.task = null; this.next = 2; this.coachT = 0; this.track = { left: null, right: null }; this.lastDraw = '';
    this._drawBoard();
  }
  _tip() {
    const S = this.st;
    if (S.headTaken >= 4 && S.headTaken > (S.blocked + S.dodged + S.avoided) * 0.6) return 'c_tip_guard';
    if (this.kind === 'combo' && S.ok >= 5 && S.ok >= S.bad * 2) return 'c_tip_combo';
    if (this.kind === 'libero' && S.landed > 6 && S.body < S.landed * 0.15) return 'c_tip_body';
    if (S.thrown > 10 && S.landed + S.ok < S.thrown * 0.35) return 'c_tip_miss';
    return 'c_tip_def';
  }
  _coach(v, force = false) {
    if (!force && (this.coachT > 0 || sfx.voiceBusy())) return false;
    sfx.announce(v); this.coachT = 2.2; return true;
  }

  // ---- i tuoi colpi: si riconosce che pugno hai tirato (nel sistema "tu -> partner")
  _trackPunches(dt, player) {
    const head = player.head, ph = this.mike.headCenter();
    const fwd = ph.clone().sub(head).setY(0).normalize(), up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3().crossVectors(fwd, up);
    const out = [];
    for (const side of ['left', 'right']) {
      const g = player.gloves[side]; let T = this.track[side];
      if (!g.mesh.visible) { this.track[side] = null; continue; }
      const towards = g.vel.dot(fwd);
      if (!T && g.speed > 1.3 && towards > 0.9) T = this.track[side] = { t: 0, p0: g.center.clone(), best: 0, pBest: g.center.clone(), peak: 0 };
      if (!T) continue;
      T.t += dt; T.peak = Math.max(T.peak, g.speed);
      const f = g.center.clone().sub(T.p0).dot(fwd);
      if (f > T.best) { T.best = f; T.pBest.copy(g.center); }
      if (T.t > 0.45 || (T.t > 0.08 && towards < 0.2)) {
        this.track[side] = null;
        if (T.best < 0.12 || T.peak < 1.6) continue;                   // non era un pugno
        const d = T.pBest.clone().sub(T.p0), F = d.dot(fwd), U = d.dot(up), I = d.dot(right) * (side === 'left' ? 1 : -1);   // in avanti, in su, verso l'interno
        let n;
        if (U > 0.09 && U > F * 0.7) n = side === 'left' ? '5' : '6';
        else if (I > 0.14 && I > F * 0.8) n = side === 'left' ? '3' : '4';      // gancio: arriva di lato
        else n = side === 'left' ? '1' : '2';
        const body = T.pBest.y < ph.y - 0.3;
        out.push({ n, body, side });
        this.st.thrown++;
      }
    }
    return out;
  }

  update(dt, player, events) {
    if (!this.active) return;
    this.time += dt; this.coachT -= dt; this.next -= dt;
    this._updSlider(dt, player);
    const punches = this._trackPunches(dt, player), S = this.st, m = this.mike;
    // eventi dell'incontro (niente danni: si conta e basta)
    for (const e of events) {
      if (e.type === 'playerHit') { S.landed++; if (e.zone === 'body') S.body++; }
      else if (e.type === 'mikeHit') {
        S.taken++; if (e.zone !== 'body') S.headTaken++;
        if (this.task && this.task.kind === 'def') this.task.res = 'hit';
        if (this.kind === 'libero' && S.headTaken % 3 === 0) this._coach('c_bad1');
      }
      else if (e.type === 'playerBlocked') { S.blocked++; if (this.task && this.task.kind === 'def') this.task.res = 'ok'; }
      else if (e.type === 'playerDodged') { S.dodged++; if (this.task && this.task.kind === 'def') this.task.res = 'ok'; }
    }
    if (this.kind === 'libero') {
      if (S.landed && S.landed % 6 === 0 && this._lastPraise !== S.landed && this._coach(pick(GOOD))) this._lastPraise = S.landed;
    } else if (this.kind === 'combo') this._combo(dt, punches);
    else this._defense(dt, player);
    this._drawBoard();
  }

  // combinazioni: chiama, apre la guardia, aspetta i tuoi colpi e li confronta
  _combo(dt, punches) {
    const m = this.mike, S = this.st;
    if (!this.task) {
      if (this.next > 0 || sfx.voiceBusy()) { m.low = Math.max(0, m.low - dt); return; }
      const maxLvl = this.speed < 0.6 ? 0 : this.speed < 0.9 ? 1 : 2;
      const c = pick(CALLS.filter(x => x.lvl <= maxLvl));
      sfx.announce(c.v);
      this.task = { kind: 'combo', c, got: [], wait: sfx.voiceDur(c.v) + 0.15, t: 0 };
      return;
    }
    const T = this.task; T.t += dt;
    m.low = 1; m.lowTarget = 1;                               // guardia aperta: tocca a te
    if (T.t < T.wait * 0.6) return;                           // (i colpi contano da quando sta finendo di chiamare)
    for (const p of punches) T.got.push(p);
    const need = T.c.seq.length, window = (0.9 + 0.55 * need) / Math.sqrt(this.speed);
    if (T.got.length >= need || T.t > T.wait + window) {
      const ok = T.got.length === need && T.c.seq.every((x, i) => {
        const g = T.got[i];
        if (x === 'b') return g.body;
        if (x.endsWith('b')) return g.body && g.n === x[0];
        return g.n === x && !g.body;
      });
      if (ok) { S.ok++; this._coach(pick(GOOD), true); }
      else { S.bad++; this._coach(T.got.length < need ? pick(['c_bad2', 'c_bad3']) : 'c_bad5', true); }
      this.task = null; this.next = 1.2 / Math.sqrt(this.speed);
    }
  }

  // difesa: annuncia, tira, guarda come ti difendi e se torni in guardia
  _defense(dt, player) {
    const m = this.mike, S = this.st;
    if (!this.task) {
      if (this.next > 0 || sfx.voiceBusy() || m.state !== 'stalk') return;
      const a = pick(ATTACKS);
      sfx.announce(a.v);
      this.task = { kind: 'def', a, t: 0, thrown: false, res: null, delay: sfx.voiceDur(a.v) + 0.35 / this.speed, after: 0 };
      return;
    }
    const T = this.task; T.t += dt;
    if (!T.thrown && T.t > T.delay) { m.throwCombo(T.a.combo); T.thrown = true; }
    if (!T.thrown) return;
    const done = m.state === 'retreat' || m.state === 'stalk';
    if (!T.res && done && T.t > T.delay + 0.3) T.res = 'ok';               // non ti ha preso: evitato
    if (T.res && !T.judged) {
      T.judged = true;
      if (T.res === 'ok') S.avoided++;
      else S.taken += 0;                                                    // (gia' contato dall'evento)
    }
    if (T.judged) {
      // torni in guardia? (tutti e due i guantoni vicino al viso) mentre lui ritira il pugno
      T.after += dt;
      const up = Object.values(player.gloves).every(g => g.mesh.visible && g.center.distanceTo(player.head) < 0.32);
      if (up && T.after > 0.15) {
        S.guardN++; S.guardOk++;
        this._coach(T.res === 'ok' ? pick(GOOD) : 'c_bad1', true);
        this.task = null; this.next = 1.0 / Math.sqrt(this.speed);
      } else if (T.after > 1.1 / Math.sqrt(this.speed)) {
        S.guardN++;
        this._coach(T.res === 'ok' ? 'c_backguard' : 'c_bad4', true);
        this.task = null; this.next = 1.4 / Math.sqrt(this.speed);
      }
    }
  }
}
