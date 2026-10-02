// Effetti dei colpi: schizzi di sudore e lividi (con un leggero gonfiore) sul viso e sul corpo di Mike.
import * as THREE from 'three';

// ---------------------------------------------------------------- sudore
export class Sweat {
  constructor(scene, max = 160) {
    const g = new THREE.SphereGeometry(1, 6, 4);
    const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transparent: true, opacity: 0.5,
      clearcoat: 1, emissive: 0x30363c, envMapIntensity: 2.5, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(g, m, max);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this.p = Array.from({ length: max }, () => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, size: 0 }));
    this.next = 0;
    this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(); this._q = new THREE.Quaternion();
    this.mesh.count = max;
    this.sweatCol = new THREE.Color(0xf4f8ff); this.bloodCol = new THREE.Color(0x6a0609);
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.sweatCol);
    this.update(0);
  }

  // point = punto d'impatto, dir = direzione del pugno, blood = quante goccioline rosse (poche, piccole)
  burst(point, dir, strength = 1, blood = 0) {
    const n = Math.round(14 + 14 * Math.min(1.5, strength));
    for (let i = 0; i < n; i++) {
      const idx = this.next;
      const d = this.p[idx]; this.next = (this.next + 1) % this.p.length;
      const red = i < blood;
      this.mesh.setColorAt(idx, red ? this.bloodCol : this.sweatCol);
      d.pos.copy(point).add(new THREE.Vector3((Math.random() - 0.5) * 0.06, (Math.random() - 0.3) * 0.06, (Math.random() - 0.5) * 0.06));
      // gli schizzi partono soprattutto nel verso del pugno e verso l'alto, aprendosi a ventaglio
      d.vel.copy(dir).multiplyScalar(0.6 + Math.random() * 1.6 * strength)
        .add(new THREE.Vector3((Math.random() - 0.5) * 2.2, 0.4 + Math.random() * 1.4, (Math.random() - 0.5) * 2.2));
      d.life = 0.5 + Math.random() * 0.5;
      d.size = red ? 0.0012 + Math.random() * 0.0016 : 0.0012 + Math.random() * 0.0024;
      if (red) d.vel.multiplyScalar(0.6);                    // cadono vicino, non volano lontano
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.p.length; i++) {
      const d = this.p[i];
      if (d.life > 0) {
        d.life -= dt;
        d.vel.y -= 9.8 * dt;
        d.vel.multiplyScalar(1 - dt * 0.8);
        d.pos.addScaledVector(d.vel, dt);
      }
      const s = d.life > 0 ? d.size * Math.min(1, d.life * 4) : 0;
      // goccia leggermente allungata nel verso del moto
      this._s.set(s, s * 1.6, s);
      this._q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.vel.lengthSq() > 1e-6 ? d.vel.clone().normalize() : new THREE.Vector3(0, 1, 0));
      this._m.compose(d.pos, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- lividi
// I punti sono definiti rispetto alla punta del naso nella posa di riposo (metri; x>0 = sinistra di Mike).
const SPOTS = [
  ['occhio_s', [0.034, 0.028, -0.032], 0.030], ['occhio_d', [-0.034, 0.028, -0.032], 0.030],
  ['zigomo_s', [0.052, -0.006, -0.050], 0.034], ['zigomo_d', [-0.052, -0.006, -0.050], 0.034],
  ['arcata_s', [0.030, 0.052, -0.022], 0.022], ['arcata_d', [-0.030, 0.052, -0.022], 0.022],
  ['labbro', [0.0, -0.043, -0.010], 0.022], ['naso', [0.0, 0.0, -0.005], 0.020],
  ['mascella_s', [0.058, -0.062, -0.065], 0.034], ['mascella_d', [-0.058, -0.062, -0.065], 0.034],
  ['costole_s', [0.12, -0.52, -0.10], 0.10], ['costole_d', [-0.12, -0.52, -0.10], 0.10],
  ['addome', [0.0, -0.66, -0.06], 0.10],
];
const N = SPOTS.length;

export class Bruises {
  constructor(model) {
    this.level = new Float32Array(N);
    this.uniforms = { uBruise: { value: Array.from({ length: N }, () => new THREE.Vector4()) },
      uBruiseLevel: { value: Array.from({ length: N }, () => 0) } };
    // il corpo e' la mesh con il materiale della pelle
    let body = null;
    model.traverse(o => { if (o.isMesh && o.material && o.material.name === 'Pelle') body = o; });
    this.ok = !!body;
    if (!body) return;
    // punta del naso nella geometria a riposo: il punto piu' avanti (+Z) nella zona della testa
    const pos = body.geometry.attributes.position;
    body.geometry.computeBoundingBox();
    const bb = body.geometry.boundingBox, H = bb.max.y - bb.min.y;
    const k = H / 1.8;                                      // unita' della geometria per metro
    let nose = null;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < bb.max.y - 0.22 * k || y > bb.max.y - 0.08 * k) continue;
      if (!nose || pos.getZ(i) > nose.z) nose = new THREE.Vector3(pos.getX(i), y, pos.getZ(i));
    }
    SPOTS.forEach(([, o, r], i) => this.uniforms.uBruise.value[i].set(nose.x + o[0] * k, nose.y + o[1] * k, nose.z + o[2] * k, r * k));
    this.k = k;
    const mat = body.material;
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, this.uniforms);
      const decl = `uniform vec4 uBruise[${N}];\nuniform float uBruiseLevel[${N}];\nvarying vec3 vRest;\n`;
      sh.vertexShader = decl + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vRest = position;
        float sw = 0.0;
        for (int i = 0; i < ${N}; i++) {
          float d = distance(position, uBruise[i].xyz);
          sw += uBruiseLevel[i] * (1.0 - smoothstep(0.0, uBruise[i].w, d)) * ((i == 0 || i == 1) ? 2.0 : 1.0);
        }
        transformed += normal * min(sw, 1.0) * ${(0.005 * k).toFixed(5)};   // gonfiore`);
      sh.fragmentShader = decl + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        float bz = 0.0, cut = 0.0, eyeb = 0.0;
        for (int i = 0; i < ${N}; i++) {
          float d = distance(vRest, uBruise[i].xyz);
          float f = uBruiseLevel[i] * (1.0 - smoothstep(uBruise[i].w * 0.25, uBruise[i].w, d));
          bz = max(bz, f);
          if (i == 0 || i == 1) eyeb = max(eyeb, f);
          if (i == 4 || i == 5) cut = max(cut, smoothstep(0.75, 1.0, uBruiseLevel[i]) * (1.0 - smoothstep(0.0, uBruise[i].w * 0.3, d)));
        }
        // livido: prima arrossato, poi violaceo e scuro; sull'arcata un taglio rosso quando e' al massimo
        vec3 redd = diffuseColor.rgb * vec3(1.25, 0.72, 0.72);
        vec3 purple = diffuseColor.rgb * vec3(0.52, 0.30, 0.42);
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(redd, purple, smoothstep(0.35, 0.9, bz)), smoothstep(0.0, 0.5, bz) * 0.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.015, 0.02), cut * 0.9);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.22, 0.12, 0.2), smoothstep(0.45, 1.0, eyeb) * 0.85);   // occhio nero`);
    };
    mat.needsUpdate = true;
  }

  // colpo: lx>0 = sinistra di Mike, ly = altezza rispetto al centro della testa (m)
  hit(zone, lx, ly, strength = 1) {
    if (!this.ok) return;
    const side = Math.abs(lx) < 0.025 ? 'c' : lx > 0 ? 's' : 'd';
    let names;
    if (zone === 'head') {
      if (side === 'c') names = ly > -0.02 ? ['naso'] : ['labbro'];
      else if (ly > 0.03) names = ['arcata_' + side, 'occhio_' + side];
      else if (ly > -0.03) names = ['occhio_' + side, 'zigomo_' + side];
      else names = ['zigomo_' + side, 'mascella_' + side];
    } else names = side === 'c' ? ['addome'] : ['costole_' + side];
    const add = 0.11 * Math.min(1.6, strength);
    names.forEach((n, j) => {
      const i = SPOTS.findIndex(s => s[0] === n);
      this.level[i] = Math.min(1, this.level[i] + add * (j === 0 ? 1 : 0.5));
      this.uniforms.uBruiseLevel.value[i] = this.level[i];
    });
  }

  // quanto e' gia' segnata la zona di un colpo (0..1)
  worst() { return Math.max(...this.level.slice(0, 10)); }

  reset() {
    this.level.fill(0);
    for (let i = 0; i < N; i++) this.uniforms.uBruiseLevel.value[i] = 0;
  }
}

// ---------------------------------------------------------------- festa per il vincitore
// Coriandoli che scendono volteggiando + fuochi d'artificio che scoppiano sopra il ring.
export class Celebration {
  constructor(scene, max = 700) {
    this.group = new THREE.Group(); scene.add(this.group);
    const g = new THREE.PlaneGeometry(0.035, 0.022);
    this.conf = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), max);
    this.conf.frustumCulled = false; this.conf.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.conf);
    this.c = Array.from({ length: max }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 }));
    // scintille dei fuochi
    const sg = new THREE.SphereGeometry(0.018, 6, 4);
    this.sparkMax = 900;
    this.spark = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ toneMapped: false }), this.sparkMax);
    this.spark.frustumCulled = false; this.spark.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.spark);
    this.s = Array.from({ length: this.sparkMax }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1 }));
    this.next = 0; this.nextS = 0; this.t = 0; this.active = 0; this.colors = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._sc = new THREE.Vector3();
    this.hideAll();
  }
  hideAll() {
    const z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.c.length; i++) this.conf.setMatrixAt(i, z);
    for (let i = 0; i < this.sparkMax; i++) this.spark.setMatrixAt(i, z);
    this.conf.instanceMatrix.needsUpdate = this.spark.instanceMatrix.needsUpdate = true;
  }
  // center = centro del ring; colors = colori del vincitore
  start(center, colors, seconds = 9) {
    this.center = center.clone(); this.colors = colors.map(c => new THREE.Color(c)); this.active = seconds; this.t = 0;
    this.confT = 0; this.fireT = 0;
  }
  _confetto() {
    const d = this.c[this.next], i = this.next; this.next = (this.next + 1) % this.c.length;
    d.p.copy(this.center).add(new THREE.Vector3((Math.random() - 0.5) * 4, 3.2 + Math.random() * 0.8, (Math.random() - 0.5) * 4));
    d.v.set((Math.random() - 0.5) * 0.3, -0.5 - Math.random() * 0.4, (Math.random() - 0.5) * 0.3);
    d.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    d.w.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    d.life = 6;
    const pal = Math.random() < 0.6 ? this.colors : [new THREE.Color(0xffd34d), new THREE.Color(0xffffff)];
    this.conf.setColorAt(i, pal[Math.floor(Math.random() * pal.length)]);
    this.conf.instanceColor.needsUpdate = true;
  }
  _firework() {
    const at = this.center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 2.6 + Math.random() * 1.2, (Math.random() - 0.5) * 3 - 0.5));
    const col = Math.random() < 0.7 ? this.colors[Math.floor(Math.random() * this.colors.length)] : new THREE.Color(0xffd34d);
    for (let k = 0; k < 70; k++) {
      const s = this.s[this.nextS], i = this.nextS; this.nextS = (this.nextS + 1) % this.sparkMax;
      s.p.copy(at);
      s.v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(1.2 + Math.random() * 1.0);
      s.life = s.max = 1.1 + Math.random() * 0.5;
      this.spark.setColorAt(i, col);
    }
    this.spark.instanceColor.needsUpdate = true;
    return at;
  }
  // restituisce dove e' scoppiato un fuoco (per il suono), oppure null
  update(dt) {
    let boom = null;
    if (this.active > 0) {
      this.active -= dt;
      this.confT += dt * 80;
      while (this.confT > 1) { this._confetto(); this.confT--; }
      this.fireT -= dt;
      if (this.fireT <= 0) { boom = this._firework(); this.fireT = 0.5 + Math.random() * 0.6; }
    }
    for (let i = 0; i < this.c.length; i++) {
      const d = this.c[i];
      if (d.life <= 0) continue;
      d.life -= dt;
      d.p.addScaledVector(d.v, dt); d.p.x += Math.sin(this.t * 3 + i) * 0.003;
      d.r.x += d.w.x * dt; d.r.y += d.w.y * dt; d.r.z += d.w.z * dt;
      this._q.setFromEuler(d.r);
      const s = d.life > 0 && d.p.y > this.center.y ? 1 : 0;
      this._m.compose(d.p, this._q, this._sc.set(s, s, s));
      this.conf.setMatrixAt(i, this._m);
    }
    for (let i = 0; i < this.sparkMax; i++) {
      const s = this.s[i];
      if (s.life <= 0) { if (s.max) { this.spark.setMatrixAt(i, this._m.makeScale(0, 0, 0)); s.max = 0; } continue; }
      s.life -= dt;
      s.v.y -= 1.5 * dt; s.v.multiplyScalar(1 - dt * 1.2);
      s.p.addScaledVector(s.v, dt);
      const k = Math.max(0, s.life / s.max);
      this._m.compose(s.p, this._q.identity(), this._sc.set(k, k, k));
      this.spark.setMatrixAt(i, this._m);
    }
    this.t += dt;
    this.conf.instanceMatrix.needsUpdate = this.spark.instanceMatrix.needsUpdate = true;
    return boom;
  }
}
