// Orso polare dello stage "Nella neve": passeggia lento avanti e indietro su un arco a ~11 m davanti al ring,
// ogni tanto si ferma e si guarda intorno, ai capi si gira e torna indietro. (modello e passo: blender/create_bear.py)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { contactShadow } from './contact_shadow.js?v=20261010020251';

const R = 11.5, A0 = -2.45, A1 = -0.75, SPEED = 0.7;    // (velocita' = passo delle zampe: niente scivolate)    // arco davanti a te (tu guardi verso -Z)

// coordinate del modello (glTF): y in alto, muso verso +z. Occhi e naso come in create_bear.py
function furMat(layer) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uL = { value: layer };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uL; varying vec3 vB; varying float vL; varying float vF;
      float furLen(vec3 p){ float f = 1.0;
        f *= mix(1.0, 0.25, smoothstep(0.98, 1.10, p.z) * step(0.8, p.y));        // muso raso
        f *= smoothstep(0.04, 0.16, p.y);                                          // piedi rasi
        f *= smoothstep(0.03, 0.05, min(min(length(p - vec3(0.087, 1.063, 1.03)), length(p - vec3(-0.087, 1.063, 1.03))), length(p - vec3(0.0, 0.961, 1.236))));
        f *= 1.0 + 0.4 * smoothstep(0.85, 1.05, p.y) * smoothstep(0.6, 0.2, p.z);   // dorso e collo un po' piu' folti
        return f; }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vB = position; float fl0 = furLen(position); float fl = fl0 * uL; vF = fl0;
        transformed += normal * 0.016 * fl; transformed.y -= 0.012 * fl * fl; transformed.z -= 0.008 * fl;   // corto e steso (pelo liscio) vL = uL;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vB; varying float vL; varying float vF;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vL > 0.0) { vec3 c = floor(vB * 340.0); float h = h3(c);
          if (h < 0.04 + vL * 0.7 || vF < 0.05) discard; }
        diffuseColor.rgb *= mix(0.78, 1.03, vL);`);
  };
  m.customProgramCacheKey = () => 'furOrso' + (layer > 0 ? 1 : 0);
  return m;
}

export class Bear {
  // onPrint(p, yaw, side): un'impronta nella neve dove appoggia una zampa
  constructor(parent, onPrint = null) {
    this.onPrint = onPrint;
    this.group = new THREE.Group(); this.group.name = 'orso'; parent.add(this.group);
    this.shadow = contactShadow(1.4, 2.9, 0.5); this.shadow.position.y = 0.02; this.group.add(this.shadow);
    this.a = A0 + 0.3; this.dir = 1; this.state = 'walk'; this.t = 0; this.next = 8 + Math.random() * 10; this.yaw = 0;
    new GLTFLoader().load('assets/orso.glb?v=20261010020251', g => {
      this.model = g.scene; this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
      // pelo a gusci (come il lupo): corto, morbido e pettinato verso il basso; raso su muso e piedi, occhi e naso puliti
      let sk = null; this.model.traverse(o => { if (o.isSkinnedMesh) sk = o; });
      if (sk) {
        const NS = 12;
        for (let k = 0; k <= NS; k++) {
          const mat = furMat(k / NS);
          if (k === 0) { sk.material = mat; continue; }
          const sh = new THREE.SkinnedMesh(sk.geometry, mat); sh.bind(sk.skeleton, sk.bindMatrix); sh.frustumCulled = false;
          sk.parent.add(sh); sh.position.copy(sk.position); sh.quaternion.copy(sk.quaternion); sh.scale.copy(sk.scale);
        }
      }
      this.model.scale.setScalar(1.3);                     // un orso polare adulto: grosso
      this.group.add(this.model);
      this.mixer = new THREE.AnimationMixer(this.model);
      const clip = n => g.animations.find(c => c.name === n);
      this.walk = this.mixer.clipAction(clip('cammina')); this.idle = this.mixer.clipAction(clip('fermo'));
      this.walk.play(); this.idle.play(); this.idle.setEffectiveWeight(0);
      this.w = 1;                                           // peso della camminata (sfuma con il fermo)
      // le quattro zampe: osso del piede e altezza della pianta sotto di lui (a riposo)
      this.feet = ['piede_ant_s', 'piede_ant_d', 'piede_post_s', 'piede_post_d'].map(n => {
        const b = this.model.getObjectByName(n); if (!b) return null;
        this.model.updateMatrixWorld(true); const p = this.group.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
        return { b, h0: p.y, side: n.endsWith('_s') ? 1 : -1, down: true, p: new THREE.Vector3() };
      }).filter(Boolean);
      this.lift = 0;
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
    this.model.position.set(x, this.lift, z); this.model.rotation.y = this.yaw;
    // zampe a terra: la pianta piu' bassa tocca la neve (l'animazione da sola a volte le lasciava a mezz'aria)
    if (this.feet && this.feet.length) {
      this.model.updateMatrixWorld(true);
      let lo = Infinity;
      for (const F of this.feet) { this.group.worldToLocal(F.b.getWorldPosition(F.p)); F.sole = F.p.y - F.h0 * 1.0; lo = Math.min(lo, F.sole); }
      const want = this.lift - lo; this.lift += (want - this.lift) * Math.min(1, dt * 12);
      // impronte: quando una zampa si appoggia (era alzata e ora tocca)
      for (const F of this.feet) {
        const h = F.sole - lo, down = h < 0.015;
        if (down && !F.down && this.state !== 'stop' && this.onPrint) this.onPrint(new THREE.Vector3(F.p.x, 0, F.p.z), this.yaw, F.side);
        if (h > 0.04) F.down = false; else if (down) F.down = true;
      }
    }
    this.shadow.position.set(x, 0.02, z); this.shadow.rotation.z = -this.yaw;
  }
}
