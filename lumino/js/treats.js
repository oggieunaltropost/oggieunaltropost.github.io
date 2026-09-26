// Bacche lanciate in modalita' normale: ne restano a terra fino a 10 (la piu' vecchia sparisce solo oltre il limite).
// I personaggi liberi vanno a mangiarle una alla volta; se due puntano la stessa, la mangia chi arriva prima.
import * as THREE from 'three';
import { makeBerry } from './fx.js';

const MAX = 10;

export class Treats {
  constructor(scene, fx) {
    this.scene = scene;
    this.fx = fx;
    this.list = [];
    this.driveT = 0;
  }

  get count() { return this.list.length; }

  add(p) {
    if (this.list.length >= MAX) this.remove(this.list[0]);
    const mesh = makeBerry();
    mesh.position.copy(p);
    mesh.scale.setScalar(0.01);
    this.scene.add(mesh);
    const b = { mesh, pos: p.clone(), age: 0, eaten: false, eatT: 0 };
    this.list.push(b);
    this.driveT = 0;   // i personaggi reagiscono subito
    return b;
  }

  remove(b) {
    this.scene.remove(b.mesh);
    const i = this.list.indexOf(b);
    if (i >= 0) this.list.splice(i, 1);
  }

  clear() { for (const b of [...this.list]) this.remove(b); }

  // manda ogni personaggio libero verso la bacca piu' comoda
  drive(creatures) {
    for (const c of creatures) {
      if (!c.free) continue;
      if (c.target && !['goto', 'wander', 'play', 'chase', 'cuddle', 'follow', 'cat'].includes(c.mode)) continue;
      let best = null, bd = Infinity;
      for (const b of this.list) {
        if (b.eaten || b.age < 0.2) continue;
        let d = b.pos.distanceTo(c.pos) + Math.abs(b.pos.y - c.pos.y) * 0.8;
        for (const o of creatures) if (o !== c && o.treat === b && o.pos.distanceTo(b.pos) < d) d += 0.5;
        if (d < bd) { bd = d; best = b; }
      }
      if (!best) continue;
      if (c.mode === 'goto' && c.treat === best && c.target) continue;
      c.treat = best;
      c.setTarget(best.pos, 'goto', () => {
        c.treat = null;
        if (best.eaten || !this.list.includes(best) || best.pos.distanceTo(c.pos) > 0.1) return false;
        best.eaten = true;
        c.sfx?.nom();
        // chi correva verso la stessa bacca: "uffa", e punta la prossima
        for (const o of creatures) if (o !== c && o.treat === best) { o.treat = null; o.clearTarget(); o.sfx?.squeak(0.72); }
        return true;
      });
    }
  }

  update(dt, t, creatures, enabled) {
    for (const b of [...this.list]) {
      b.age += dt;
      if (b.eaten) {
        b.eatT += dt;
        b.mesh.scale.setScalar(Math.max(0.001, 1 - b.eatT * 4));
        if (b.eatT > 0.25) this.remove(b);
        continue;
      }
      const grow = Math.min(1, b.age * 5);
      b.mesh.scale.setScalar(grow < 1 ? grow * (1 + Math.sin(grow * Math.PI) * 0.4) : 1);
      b.mesh.position.set(b.pos.x, b.pos.y + 0.014 + Math.sin(t * 3 + b.age) * 0.003, b.pos.z);
      b.mesh.rotation.y += dt * 1.5;
      b.mesh.userData.glow.material.opacity = 0.14 + 0.08 * Math.sin(t * 5 + b.age);
    }
    if (!enabled || !this.list.length) return false;
    this.driveT -= dt;
    if (this.driveT <= 0) { this.driveT = 0.3; this.drive(creatures); }
    return this.list.some(b => !b.eaten);
  }
}
