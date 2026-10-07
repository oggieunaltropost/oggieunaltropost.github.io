// Astronauta dello stage "Sulla Luna": gira attorno al ring a balzi a piedi uniti, come gli astronauti dell'Apollo:
// si accuccia, si spinge e resta in aria a lungo (un sesto della gravita' terrestre), atterra piegando le gambe.
// Ogni tanto si ferma e si guarda intorno. (modello e animazioni: blender/create_astronaut.py)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { contactShadow } from './contact_shadow.js?v=20261008003034';

const R = 5.6, G = 1.62, HOP = 0.95;                   // raggio del giro (attorno al ring), metri a balzo
const T_UP = 0.32, T_DOWN = 0.86;                      // frazioni del balzo: stacco e atterraggio (come in Blender)

export class Astronaut {
  constructor(parent) {
    this.group = new THREE.Group(); this.group.name = 'astronauta'; parent.add(this.group);
    this.shadow = contactShadow(0.7, 0.7, 0.55); this.shadow.position.y = 0.012; this.group.add(this.shadow);
    this.a = Math.random() * Math.PI * 2; this.state = 'hop'; this.t = 0; this.next = 20 + Math.random() * 15; this.prevPh = 0;
    new GLTFLoader().load('assets/astronauta.glb?v=20261008003034', g => {
      this.model = g.scene; this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      // visiera dorata a specchio: riflette il paesaggio lunare (l'ambiente della scena e' la foto della luna)
      this.model.traverse(o => { if (o.isMesh && /Visiera/.test(o.material.name)) { const m = o.material; m.metalness = 1; m.roughness = 0.03; m.color.setRGB(1.0, 0.78, 0.4); m.envMapIntensity = 2.2; } });
      this.group.add(this.model);
      this.mixer = new THREE.AnimationMixer(this.model);
      const clip = n => g.animations.find(c => c.name === n);
      this.hop = this.mixer.clipAction(clip('salta')); this.look = this.mixer.clipAction(clip('fermo'));
      this.hop.play(); this.look.play(); this.look.setEffectiveWeight(0);
      this.dur = clip('salta').duration;
    });
  }
  update(dt) {
    if (!this.mixer) return;
    this.t += dt;
    const ph = (this.hop.time % this.dur) / this.dur;
    let y = 0;
    if (this.state === 'hop') {
      if (ph >= T_UP && ph < T_DOWN) {                       // in aria: avanza lungo il giro, parabola lunare
        const tAir = (T_DOWN - T_UP) * this.dur, u = (ph - T_UP) / (T_DOWN - T_UP);
        this.a += (HOP / R) * dt / tAir;
        y = 0.5 * G * (u * tAir) * ((1 - u) * tAir);
      }
      if (this.prevPh > T_DOWN && ph < this.prevPh && this.t > this.next) {          // dopo un atterraggio: sosta
        this.state = 'look'; this.st = 5 + Math.random() * 4; this.hop.setEffectiveWeight(0); this.look.setEffectiveWeight(1); this.look.time = 0;
      }
    } else {
      this.st -= dt;
      if (this.st <= 0) { this.state = 'hop'; this.next = this.t + 20 + Math.random() * 20; this.hop.time = 0; this.hop.setEffectiveWeight(1); this.look.setEffectiveWeight(0); }
    }
    this.prevPh = ph;
    this.hop.paused = this.state !== 'hop';
    this.mixer.update(dt);
    const x = Math.cos(this.a) * R, z = Math.sin(this.a) * R;
    const yaw = this.state === 'hop' ? Math.atan2(-Math.sin(this.a), Math.cos(this.a)) : Math.atan2(-x, -z);   // in cammino: tangente; fermo: guarda il ring
    this.yaw = this.yaw === undefined ? yaw : this.yaw + Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw)) * Math.min(1, dt * 3);
    this.model.position.set(x, y, z); this.model.rotation.y = this.yaw;
    this.shadow.position.set(x, 0.012, z); const k = 1 / (1 + y * 2); this.shadow.scale.set(0.7 * 1.45 * k, 0.7 * 1.45 * k, 1); this.shadow.material.opacity = 0.55 * k;
  }
}
