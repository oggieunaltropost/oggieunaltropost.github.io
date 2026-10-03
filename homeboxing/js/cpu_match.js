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
  // A, B: istanze di Mike (pugili); secs: durata; onHit(zone, power) per pubblico e suoni
  constructor(A, B, secs, hooks = {}) {
    this.f = [A, B]; this.view = [new FighterAsPlayer(B), new FighterAsPlayer(A)];   // A vede B e viceversa
    this.dmg = [0, 0]; this.pts = [0, 0]; this.time = secs; this.done = false; this.winner = null; this.endT = 0;
    this.hooks = hooks;
    for (const f of this.f) { f.resetPose(); f.enabled = true; f.events.length = 0; }
  }
  update(dt) {
    if (this.done) return;
    for (const v of this.view) v.update(dt);
    for (let i = 0; i < 2; i++) this.f[i].update(dt, this.view[i]);
    // conta solo i pugni che vanno a segno di ciascuno (i "mikeHit": il suo colpo ha preso l'altro)
    for (let i = 0; i < 2; i++) {
      for (const e of this.f[i].events) {
        if (e.type !== 'mikeHit' || this.endT) continue;
        const o = 1 - i, power = 0.8 + Math.random() * 0.5;
        this.pts[i] += e.zone === 'head' ? 2 : 1;
        this.dmg[o] = Math.min(100, this.dmg[o] + (e.zone === 'head' ? 3.5 + 6 * power : 2 + 3.5 * power));
        if (this.hooks.onHit) this.hooks.onHit(e.zone, power);
        if (this.dmg[o] >= 100) { this.winner = i; this.f[o].knockdown(); this.f[i].enabled = false; this.endT = 4; if (this.hooks.onKO) this.hooks.onKO(); }
      }
      this.f[i].events.length = 0;
    }
    for (let i = 0; i < 2; i++) this.f[i].fatigue = this.dmg[i] / 100;
    if (this.endT) { this.endT -= dt; if (this.endT <= 0) this.finish(); return; }
    this.time -= dt;
    if (this.time <= 0) this.finish();
  }
  // fine (o salto al risultato): KO gia' avvenuto, altrimenti ai punti; se si salta prima, si stima dall'andamento
  finish(skipped = false) {
    if (this.done) return;
    if (this.winner === null) {
      const [a, b] = this.pts;
      if (a !== b && !skipped) this.winner = a > b ? 0 : 1;
      else {                                          // in parita' (o saltato): favorito chi e' avanti, ma con un po' di sorte
        const pa = 0.5 + Math.max(-0.35, Math.min(0.35, (a - b) * 0.03 + (this.dmg[1] - this.dmg[0]) * 0.004));
        this.winner = Math.random() < pa ? 0 : 1;
      }
    }
    this.done = true;
    for (const f of this.f) f.enabled = false;
  }
}
