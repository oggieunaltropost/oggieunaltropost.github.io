// Quando ci sono Lumino e Lumina e nessuno da' loro istruzioni, giocano tra loro:
//  - "acchiapparella": uno scappa, l'altro lo insegue; quando lo prende saltellano felici;
//  - "coccole": si vengono incontro, si guardano e fanno le coccole (cuoricini).
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
// stati in cui un personaggio e' libero di mettersi a giocare
const PLAYABLE = ['idle', 'walk', 'land', 'happy'];

export class Social {
  constructor(room, fx) {
    this.room = room;
    this.fx = fx;
    this.kind = null;
    this.cooldown = 3 + Math.random() * 3;
  }

  get busy() { return this.kind !== null; }

  stop(a, b) {
    for (const c of [a, b]) if (c && ['play', 'chase', 'cuddle'].includes(c.mode) && c.target) c.clearTarget();
    this.kind = null;
    this.cooldown = 6 + Math.random() * 8;
  }

  // a, b: i due personaggi; allowed: niente gara/seguimi/gatti e niente istruzioni in corso
  update(dt, a, b, userPos, allowed) {
    const ok = allowed && [a, b].every(c => c.enabled && c.state !== 'hidden');
    if (!ok) { if (this.kind) this.stop(a, b); return false; }
    if (this.kind) {
      // se uno dei due riceve un'altra istruzione (bacca, chiamata, presa...) il gioco finisce
      const interrupted = [a, b].some(c => !PLAYABLE.includes(c.state) && !['climb', 'mantle', 'jump'].includes(c.state)
        || (c.target && !['play', 'chase', 'cuddle'].includes(c.mode)));
      if (interrupted) { this.stop(a, b); return false; }
      this.t += dt;
      return this.kind === 'chase' ? this.chaseStep(dt, a, b) : this.cuddleStep(dt, a, b);
    }
    // entrambi fermi o a spasso: ogni tanto parte un gioco
    const free = [a, b].every(c => PLAYABLE.includes(c.state) && (!c.target || c.mode === 'wander'));
    if (!free) return false;
    this.cooldown -= dt;
    if (this.cooldown > 0) return false;
    const r = Math.random();
    if (r < 0.55) this.startChase(a, b, userPos);
    else if (r < 0.9) this.startCuddle(a, b);
    else this.cooldown = 4;
    return this.busy;
  }

  // ------------------------------------------------------------ acchiapparella
  startChase(a, b, userPos) {
    const [runner, chaser] = Math.random() < 0.5 ? [a, b] : [b, a];
    this.kind = 'chase';
    this.t = 0;
    this.runner = runner;
    this.chaser = chaser;
    this.retarget = 0;
    this.pickRunTarget(userPos);
    chaser.sfx?.squeak(1.25);
  }

  pickRunTarget(userPos) {
    const p = this.room.sample(Math.random() < 0.25, this.runner.pos, 2.2, userPos);
    if (p && p.distanceTo(this.runner.pos) > 0.5) this.runner.setTarget(p, 'play');
  }

  chaseStep(dt, a, b) {
    const { runner, chaser } = this;
    if (!runner.target && PLAYABLE.includes(runner.state)) this.pickRunTarget(chaser.userPos);
    this.retarget -= dt;
    if (this.retarget <= 0 && chaser.free) {
      this.retarget = 0.3;
      chaser.setTarget(runner.pos, 'chase');
    }
    const caught = Math.hypot(runner.pos.x - chaser.pos.x, runner.pos.z - chaser.pos.z) < 0.16 &&
      Math.abs(runner.pos.y - chaser.pos.y) < 0.1;
    if (caught) {
      // preso! saltellano felici; spesso si riparte subito con un altro gioco
      runner.clearTarget(); chaser.clearTarget();
      runner.happy(); chaser.happy();
      this.stop(a, b);
      if (Math.random() < 0.5) this.cooldown = 1.5;
      return true;
    }
    if (this.t > 10) this.stop(a, b);
    return true;
  }

  // ------------------------------------------------------------ coccole
  startCuddle(a, b) {
    const mid = new THREE.Vector3().addVectors(a.pos, b.pos).multiplyScalar(0.5);
    const g = this.room.groundBelow(mid, 0.15, 1);
    if (!g || g.normal.y < 0.7 || !this.room.isStandable(g.point)) { this.cooldown = 3; return; }
    const dir = new THREE.Vector3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z);
    if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
    dir.normalize();
    // naso a naso: le origini stanno sotto la pancia, la testa e' ~8 cm piu' avanti
    const pa = g.point.clone().addScaledVector(dir, -0.09), pb = g.point.clone().addScaledVector(dir, 0.09);
    this.kind = 'cuddle';
    this.t = 0;
    this.met = false;
    a.setTarget(this.snap(pa), 'cuddle');
    b.setTarget(this.snap(pb), 'cuddle');
  }

  snap(p) {
    const g = this.room.groundBelow(p, 0.1, 0.5);
    return g ? g.point.clone() : p;
  }

  cuddleStep(dt, a, b) {
    const arrived = [a, b].every(c => !c.target && PLAYABLE.includes(c.state));
    if (arrived && !this.met) {
      this.met = true;
      this.metT = this.t;
      // si girano uno verso l'altro
      for (const [c, o] of [[a, b], [b, a]]) c.heading.set(o.pos.x - c.pos.x, 0, o.pos.z - c.pos.z).normalize();
      a.happy(); b.happy();
      const mid = a.center.clone().add(b.center).multiplyScalar(0.5).addScaledVector(UP, 0.05);
      this.fx.hearts(mid, 6);
    }
    if (this.met) {
      for (const [c, o] of [[a, b], [b, a]]) {
        if (c.state === 'idle') c.turnToward(new THREE.Vector3(o.pos.x - c.pos.x, 0, o.pos.z - c.pos.z).normalize(), dt, 3);
      }
      if (this.t - this.metT > 3.5) this.stop(a, b);
    } else if (this.t > 12) this.stop(a, b);
    return true;
  }
}
