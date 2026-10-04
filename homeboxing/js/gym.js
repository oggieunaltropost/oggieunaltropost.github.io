// Stage "In palestra": vecchia palestra di boxe con le luci soffuse (blender/create_gym.py: le luci sono gia' "cotte"
// nelle texture, qui si disegna tutto senza luci). Il ring sta su una pedana alta 1 m: il pavimento della palestra e'
// a -1 m. I sacchi pesanti oscillano appena. L'uomo delle pulizie (blender/create_janitor.py) fa il giro attorno al
// ring: cammina spingendo il mocio fino al punto dopo, lava un po' li', poi riparte. Il mocio lo disegniamo qui, lungo
// la retta delle sue due mani fino a terra, cosi' resta sempre in mano.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const FLOOR = -1.0;
const WALK_SPEED = 0.42;                       // m/s (come la clip "cammina" di Blender)
// giro attorno al ring (fuori dalla pedana, dai gradini e dai sacchi)
const PATH = [[-3.8, -3.6], [0, -3.9], [3.8, -3.6], [4.3, 0], [3.9, 3.4], [0, 3.5], [-3.9, 3.4], [-4.3, 0]];
const PATH_TRAIN = [[3.9, 3.4], [4.3, 0], [3.8, -3.6], [0, -3.9], [3.8, -3.6], [4.3, 0]];   // allenamento: lontano dal tuo sacco
const BAG_SPOT = [-5.2, 0];                    // allenamento: qui pende il tuo sacco (spazio libero sul lato ovest)

export class Gym {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'palestra';
    this.t = 0; this.bags = [];
    const L = new GLTFLoader();
    L.load('assets/palestra.glb?v=20261004112524', g => {
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const m = o.material;
        o.material = new THREE.MeshBasicMaterial({ map: m.map, toneMapped: false });   // luce gia' nella texture
        if (o.material.map) { o.material.map.colorSpace = THREE.SRGBColorSpace; o.material.map.anisotropy = 4; }
      });
      g.scene.traverse(o => { if (/^Sacco/.test(o.name)) this.bags.push({ o, ph: Math.random() * 6, amp: 0.012 + Math.random() * 0.02 }); });
      this.group.add(g.scene);
      this.loaded = true; if (this.onLoad) this.onLoad();
    });
    L.load('assets/inserviente.glb?v=20261004112524', g => this._janitor(g));
  }

  _janitor(g) {
    const J = g.scene, P0 = (this.path || PATH)[0]; J.position.set(P0[0], FLOOR, P0[1]);
    J.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; if (o.material) o.material.envMapIntensity = 0.4; } });
    this.group.add(J);
    this.jMixer = new THREE.AnimationMixer(J);
    const clip = n => g.animations.find(a => a.name === n);
    this.aMop = this.jMixer.clipAction(clip('lava')); this.aWalk = this.jMixer.clipAction(clip('cammina'));
    this.aMop.play(); this.aWalk.play(); this.aWalk.setEffectiveWeight(0);
    this.handR = J.getObjectByName('hand_r'); this.handL = J.getObjectByName('hand_l');
    this.midR = J.getObjectByName('middle_01_r'); this.midL = J.getObjectByName('middle_01_l');
    // mocio: manico di legno e frange grigie
    const mop = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1.4, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.6 }));
    stick.position.y = 0.72; mop.add(stick);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6 }));
    head.position.y = 0.07; mop.add(head);
    const fr = new THREE.MeshStandardMaterial({ color: 0xb9b3a4, roughness: 1 });
    for (let k = 0; k < 26; k++) {                               // frange che si allargano a terra
      const a = k / 26 * Math.PI * 2, r = 0.05 + Math.random() * 0.1;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.012, 0.16), fr);
      s.position.set(Math.cos(a) * r, 0.012, Math.sin(a) * r); s.rotation.y = -a + Math.PI / 2; mop.add(s);
    }
    this.mop = mop; this.group.add(mop);
    this.J = J; this.wp = 0; this.state = 'lava'; this.stateT = 4 + Math.random() * 4; this.blend = 0;
  }

  _updJanitor(dt) {
    const J = this.J; if (!J) return;
    const P = this.path || PATH, tgt = P[(this.wp + 1) % P.length];
    if (this.state === 'lava') {
      if ((this.stateT -= dt) <= 0) this.state = 'cammina';
    } else {
      const dx = tgt[0] - J.position.x, dz = tgt[1] - J.position.z, d = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let dy = Math.atan2(Math.sin(want - J.rotation.y), Math.cos(want - J.rotation.y));
      J.rotation.y += Math.max(-1.2 * dt, Math.min(1.2 * dt, dy));
      if (Math.abs(dy) < 0.6) {
        const v = WALK_SPEED * Math.min(1, d / 0.4);
        J.position.x += Math.sin(J.rotation.y) * v * dt; J.position.z += Math.cos(J.rotation.y) * v * dt;
      }
      if (d < 0.08) { this.wp = (this.wp + 1) % P.length; this.state = 'lava'; this.stateT = 7 + Math.random() * 8; }
    }
    // dissolvenza tra "lava" e "cammina"
    this.blend += ((this.state === 'cammina' ? 1 : 0) - this.blend) * Math.min(1, dt * 3);
    this.aWalk.setEffectiveWeight(this.blend); this.aMop.setEffectiveWeight(1 - this.blend);
    this.jMixer.update(dt);
    J.updateMatrixWorld(true);
    // mocio lungo la retta delle mani (dal pugno destro, in basso, verso il sinistro), fino a terra
    const grip = (h, m) => h.getWorldPosition(new THREE.Vector3()).lerp(m.getWorldPosition(new THREE.Vector3()), 0.6);
    const R = this.group.worldToLocal(grip(this.handR, this.midR)), Lh = this.group.worldToLocal(grip(this.handL, this.midL));
    const d = Lh.clone().sub(R).normalize();
    if (d.y > 0.2) {
      const t = (R.y - FLOOR) / d.y;
      const foot = R.clone().addScaledVector(d, -t);
      this.mop.position.copy(foot);
      this.mop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      this.mop.visible = true;
    }
  }

  // allenamento: la palestra si sposta e gira perche' il punto libero BAG_SPOT finisca sul sacco davanti a te,
  // con il pavimento a quota 0 (dove stai davvero); l'uomo delle pulizie lavora dall'altra parte
  setTraining(on, bagZ) {
    this.path = on ? PATH_TRAIN : PATH;
    if (on) { this.group.rotation.y = -Math.PI / 2; this.group.position.set(0, 1, bagZ - BAG_SPOT[0]); }
    else { this.group.rotation.y = 0; this.group.position.set(0, 0, 0); }
    if (this.J) { this.wp = 0; this.J.position.set(this.path[0][0], FLOOR, this.path[0][1]); this.state = 'lava'; this.stateT = 3; }
  }

  update(dt) {
    this.t += dt;
    for (const b of this.bags) {                             // i sacchi oscillano appena (qualcuno li ha colpiti)
      b.o.rotation.x = Math.sin(this.t * 1.7 + b.ph) * b.amp;
      b.o.rotation.z = Math.sin(this.t * 1.3 + b.ph * 1.7) * b.amp * 0.7;
    }
    this._updJanitor(dt);
  }
}
