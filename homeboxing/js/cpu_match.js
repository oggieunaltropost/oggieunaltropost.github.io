// Incontro tra due pugili della CPU (torneo): ognuno "vede" l'altro come se fosse il giocatore, con la sua
// testa e i suoi guantoni veri, cosi' usano la stessa intelligenza (parate, schivate, combinazioni) che usano
// contro di te. Tu guardi senza guantoni e puoi saltare al risultato.
import * as THREE from 'three';

const _v = new THREE.Vector3();

// un guantone dell'avversario visto come i guantoni del giocatore (posizione, velocita', spinta del pugno)
class GloveProxy {
  constructor(f, s) {
    this.f = f; this.s = s; this.side = s === 'l' ? 'left' : 'right';
    this.center = new THREE.Vector3(); this.prev = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.contactPoint = new THREE.Vector3(); this.speed = 0; this.radius = 0.075; this.cooldown = 0;
    this.punchId = 0; this.wasFast = false; this.hist = []; this.mesh = { visible: true }; this.t = 0;
  }
  update(dt) {
    this.t += dt;
    this.prev.copy(this.center);
    this.center.copy(this.f.glove(this.s).center);
    if (dt > 0 && this.t > dt) this.vel.subVectors(this.center, this.prev).divideScalar(dt);
    // conta come pugno solo se sta davvero tirando: i guantoni che si muovono veloci per parare o schivare
    // facevano reagire l'altro, che reagiva a sua volta... (difese a catena, movimenti a scatti)
    const P = this.f.punch;
    if (!(P && !P.move && this.f.state === 'attack')) this.vel.set(0, 0, 0);
    this.speed = this.vel.length();
    this.hist.push({ p: this.center.clone(), s: this.speed, t: this.t });
    while (this.hist.length && this.t - this.hist[0].t > 0.25) this.hist.shift();
    const fast = this.speed > 1.5;
    if (fast && !this.wasFast) this.punchId++;
    this.wasFast = fast;
    if (this.cooldown > 0) this.cooldown -= dt;
  }
  peakSpeed() { let m = this.speed; for (const h of this.hist) m = Math.max(m, h.s || 0); return m; }
  travel(dir) { let b = 0; for (const h of this.hist) b = Math.max(b, _v.subVectors(this.center, h.p).dot(dir)); return b; }
  segment() { return [this.prev, this.center]; }
}

class FighterAsPlayer {
  constructor(f) { this.f = f; this.head = new THREE.Vector3(); this.gloves = { left: new GloveProxy(f, 'l'), right: new GloveProxy(f, 'r') }; }
  update(dt) { this.head.copy(this.f.headCenter()); for (const g of Object.values(this.gloves)) g.update(dt); }
}

export class CpuMatch {
  // A, B: istanze di Mike (pugili); secs: durata di un round. Stesse regole degli incontri tuoi (hooks):
  // rounds (quanti), rest (riposo tra i round, s), oneKO ("un KO, fine partita"), threeKO (regola dei 3 atterramenti),
  // refills (energia recuperata rialzandosi: 75, 50, 25). Suoni e pubblico con gli altri hooks.
  constructor(A, B, secs, hooks = {}, delay = 0) {
    this.f = [A, B]; this.view = [new FighterAsPlayer(B), new FighterAsPlayer(A)];   // A vede B e viceversa
    this.dmg = [0, 0]; this.pts = [0, 0]; this.hits = [0, 0]; this.delay = delay; this.secs = secs; this.time = secs;
    this.done = false; this.winner = null; this.endT = 0;
    this.hooks = hooks; this.rounds = hooks.rounds || 1; this.round = 1; this.rest = 0;
    this.kdN = [0, 0]; this.kdLvl = [0, 0]; this.kd = null;                // atterramenti (come negli incontri veri: ci si puo' rialzare)
    for (const f of this.f) { f.resetPose(); f.enabled = delay <= 0; f.events.length = 0; }
  }
  update(dt) {
    if (this.done) return;
    if (this.delay > 0) {                             // presentazione: fermi in guardia, poi la campana
      this.delay -= dt;
      if (this.delay <= 0) { for (const f of this.f) f.enabled = true; if (this.hooks.onStart) this.hooks.onStart(); }
    }
    for (const v of this.view) v.update(dt);
    for (let i = 0; i < 2; i++) this.f[i].update(dt, this.view[i]);
    // conta solo i pugni che vanno a segno di ciascuno (i "mikeHit": il suo colpo ha preso l'altro)
    for (let i = 0; i < 2; i++) {
      for (const e of this.f[i].events) {
        // il pugile i e' stato colpito (lo "vede" lui, dove e con che forza): lividi, sudore e sangue come nei tuoi incontri
        if (e.type !== 'mikeHit' || this.endT || this.kd || this.rest > 0) continue;
        const o = 1 - i, power = 0.8 + Math.random() * 0.5;
        // colpito o: livido dove e' arrivato il guantone (nel sistema del pugile: x sua sinistra, y rispetto alla testa),
        // sudore e sangue come nei tuoi incontri
        if (this.hooks.onMark && e.point) {
          const T = this.f[o], lp = T.root.worldToLocal(e.point.clone()), lh = T.root.worldToLocal(T.headCenter());
          this.hooks.onMark(o, { zone: e.zone, lx: lp.x, ly: lp.y - lh.y, point: e.point, dir: e.dir, speed: 3.5 + power * 2 });
        }
        this.pts[i] += e.zone === 'head' ? 2 : 1; this.hits[i]++;
        this.dmg[o] = Math.min(100, this.dmg[o] + (e.zone === 'head' ? 3.5 + 6 * power : 2 + 3.5 * power) * (e.counter ? 1.5 : 1));   // (contrattacco: di piu')
        if (this.hooks.onHit) this.hooks.onHit(e.zone, power);
        if (this.dmg[o] >= 100 && !this.kd) this._knockdown(o);
      }
      this.f[i].events.length = 0;
    }
    for (let i = 0; i < 2; i++) this.f[i].fatigue = this.dmg[i] / 100;
    if (this.kd) { this._count(dt); if (this.kd) return; }
    if (this.endT) { this.endT -= dt; if (this.endT <= 0) this.finish(); return; }
    if (this.delay > 0) return;
    if (this.rest > 0) {                              // riposo tra i round: fermi, poi la campana del round dopo
      this.rest -= dt;
      if (this.rest <= 0) {
        this.round++; this.time = this.secs;
        for (const f of this.f) { f.resetPose(); f.enabled = true; }
        if (this.hooks.onRound) this.hooks.onRound(this.round, this.round === this.rounds);
      }
      return;
    }
    this.time -= dt;
    // come negli incontri tuoi: l'energia risale piano e la stanchezza degli atterramenti si smaltisce col tempo
    for (let i = 0; i < 2; i++) { this.dmg[i] = Math.max(0, this.dmg[i] - dt * 0.5); this.kdLvl[i] = Math.max(0, this.kdLvl[i] - dt / 90); }
    if (this.time <= 0) {
      if (this.round >= this.rounds) { this.finish(); return; }
      this.time = 0; this.rest = this.hooks.rest || 30;    // fine round: campana e riposo
      for (const f of this.f) { f.enabled = false; f.resetPose(); }
      for (let i = 0; i < 2; i++) { this.dmg[i] = Math.max(0, this.dmg[i] - 25); this.kdLvl[i] = Math.max(0, this.kdLvl[i] - 0.5); }   // all'angolo ci si riprende
      if (this.hooks.onRoundEnd) this.hooks.onRoundEnd(this.round);
    }
  }
  // atterrato: stesse regole tue. Energia che si recupera: 75, 50, 25 (con la regola dei 3 atterramenti il terzo e'
  // KO tecnico); senza la regola si continua con 15, 8, poi niente: si resta giu' e si conta fino a 10
  _knockdown(o) {
    const n = ++this.kdN[o], R = this.hooks.refills || [75, 50, 25];
    this.kdLvl[o] += 1; const lvl = Math.max(1, Math.round(this.kdLvl[o]));      // (atterramenti lontani nel tempo pesano meno)
    const refill = this.hooks.oneKO ? 0 : R[lvl - 1] ?? (this.hooks.threeKO !== false ? 0 : [15, 8][lvl - 4] ?? 0);
    const tko = this.hooks.threeKO !== false && !this.hooks.oneKO && n >= 3;
    this.f[o].knockdown(); this.f[0].enabled = false; this.f[1].enabled = false;
    if (this.hooks.onKD) this.hooks.onKD();
    this.kd = { o, t: 0, count: 0, upAt: refill <= 0 || tko ? 99 : 4 + Math.floor(Math.random() * 5), refill, out: refill <= 0 || tko, tko };
  }
  _count(dt) {
    const K = this.kd; K.t += dt;
    if (K.tko) {                                       // terzo atterramento: l'arbitro ferma l'incontro
      if (K.t > 1.5) { this.winner = 1 - K.o; this.how = 'TKO'; this.endT = 4; this.kd = null; if (this.hooks.onKO) this.hooks.onKO(); }
      return;
    }
    const c = Math.floor(K.t);                         // conteggio: un numero al secondo
    if (c > K.count && c <= 10) { K.count = c; if (this.hooks.onCount) this.hooks.onCount(c); }
    if (!K.up && K.count >= K.upAt) { K.up = true; this.f[K.o].getUp(); }
    if (!K.up && K.count >= 10) {                      // al 10 e' ancora giu': KO
      this.winner = 1 - K.o; this.how = 'KO'; this.endT = 4; this.kd = null; if (this.hooks.onKO) this.hooks.onKO();
    } else if (K.up && K.count >= 8 && (!this.f[K.o].isUp || this.f[K.o].isUp())) {   // conteggio obbligatorio fino a 8
      this.dmg[K.o] = 100 - K.refill;
      for (const f of this.f) { f.enabled = true; f.resetPose && f.resetPose(); }
      this.kd = null; if (this.hooks.onResume) this.hooks.onResume();
    }
  }
  // fine (o salto al risultato): KO gia' avvenuto, altrimenti ai punti; se si salta prima, si stima dall'andamento
  finish(skipped = false) {
    if (this.done) return;
    if (this.delay > 0) skipped = true;
    if (this.winner === null && this.kd && this.kd.out) this.winner = 1 - this.kd.o;   // saltato mentre contavano: resta giu'
    if (this.winner === null) {
      const [a, b] = this.pts;
      this.how = 'points';
      if (a !== b && !skipped) this.winner = a > b ? 0 : 1;
      else {                                          // in parita' (o saltato): favorito chi e' avanti, ma con un po' di sorte
        const pa = 0.5 + Math.max(-0.35, Math.min(0.35, (a - b) * 0.03 + (this.dmg[1] - this.dmg[0]) * 0.004 + (this.kdN[1] - this.kdN[0]) * 0.1));
        this.winner = Math.random() < pa ? 0 : 1;
      }
    }
    this.kd = null; this.done = true;
    for (const f of this.f) f.enabled = false;
  }
}
