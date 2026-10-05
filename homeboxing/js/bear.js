// Orso polare dello stage "Nella neve": passeggia lento avanti e indietro su un arco a ~11 m davanti al ring,
// ogni tanto si ferma e si guarda intorno, ai capi si gira e torna indietro. (modello e passo: blender/create_bear.py)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { contactShadow } from './contact_shadow.js?v=20261005221349';

const R = 11.5, A0 = -2.45, A1 = -0.75, SPEED = 0.34;    // arco davanti a te (tu guardi verso -Z)

export class Bear {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.name = 'orso'; parent.add(this.group);
    this.shadow = contactShadow(1.1, 2.2, 0.45); this.shadow.position.y = 0.02; this.group.add(this.shadow);
    this.a = A0 + 0.3; this.dir = 1; this.state = 'walk'; this.t = 0; this.next = 8 + Math.random() * 10; this.yaw = 0;
    new GLTFLoader().load('assets/orso.glb?v=20261005221349', g => {
      this.model = g.scene; this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      this.group.add(this.model);
      this.mixer = new THREE.AnimationMixer(this.model);
      const clip = n => g.animations.find(c => c.name === n);
      this.walk = this.mixer.clipAction(clip('cammina')); this.idle = this.mixer.clipAction(clip('fermo'));
      this.walk.play(); this.idle.play(); this.idle.setEffectiveWeight(0);
      this.w = 1;                                           // peso della camminata (sfuma con il fermo)
    });
  }
  update(dt) {
    if (!this.mixer) return;
    this.t += dt;
    let moving = 0;
    if (this.state === 'walk') {
      moving = 1; this.a += this.dir * SPEED * dt / R;
      if ((this.dir > 0 && this.a > A1) || (this.dir < 0 && this.a < A0)) { this.state = 'stop'; this.st = 5 + Math.random() * 4; this.turn = true; }
      else if (this.t > this.next) { this.state = 'stop'; this.st = 4 + Math.random() * 5; this.turn = false; this.next = this.t + 14 + Math.random() * 14; }
    } else if (this.state === 'stop') {
      this.st -= dt;
      if (this.st <= 0) { if (this.turn) { this.state = 'turn'; this.tt = 0; this.yaw0 = this.yaw; } else this.state = 'walk'; }
    } else if (this.state === 'turn') {                     // si gira piano camminando sul posto
      moving = 0.6; this.tt += dt; const k = Math.min(1, this.tt / 3.5);
      this.yaw = this.yaw0 + Math.PI * k * k * (3 - 2 * k);
      if (k >= 1) { this.dir = -this.dir; this.state = 'walk'; }
    }
    this.w += (moving - this.w) * Math.min(1, dt * 2);
    this.walk.setEffectiveWeight(this.w); this.idle.setEffectiveWeight(1 - this.w);
    this.walk.timeScale = 0.4 + 0.6 * this.w;
    this.mixer.update(dt);
    const x = Math.cos(this.a) * R, z = Math.sin(this.a) * R;
    if (this.state === 'walk' || this.state === 'stop' && !this.turnStarted) {
      if (this.state === 'walk') this.yaw = Math.atan2(-Math.sin(this.a) * this.dir, Math.cos(this.a) * this.dir);   // tangente all'arco
    }
    this.model.position.set(x, 0.03, z); this.model.rotation.y = this.yaw;
    this.shadow.position.set(x, 0.02, z); this.shadow.rotation.z = -this.yaw;
  }
}
