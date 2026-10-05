// Stage "In palestra": vecchia palestra di boxe con le luci soffuse (blender/create_gym.py: le luci sono gia' "cotte"
// nelle texture, qui si disegna tutto senza luci). Il ring sta su una pedana alta 1 m: il pavimento della palestra e'
// a -1 m. I sacchi pesanti oscillano appena. L'uomo delle pulizie (blender/create_janitor.py) fa il giro attorno al
// ring: cammina spingendo il mocio fino al punto dopo, lava un po' li', poi riparte. Il mocio lo disegniamo qui, lungo
// la retta delle sue due mani fino a terra, cosi' resta sempre in mano.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildRing, RING_SIZE } from './ring.js?v=20261005203039';
import { makeGloveMesh } from './player.js?v=20261005203039';

const FLOOR = -1.0;
const WALK_SPEED = 0.42;                       // m/s (come la clip "cammina" di Blender)
// giro attorno al ring (fuori dalla pedana, dai gradini e dai sacchi)
const PATH = [[-3.8, -3.6], [0, -3.9], [3.8, -3.6], [4.3, 0], [3.9, 3.4], [0, 3.5], [-3.9, 3.4], [-4.3, 0]];
// allenamento: il giro completo attorno al ring, dal tuo lato passa tra la pedana e te (a ~1 m: lo vedi da vicino)
const PATH_TRAIN = [[3.9, 3.4], [0, 3.5], [-3.3, 3.2], [-3.3, 0], [-3.3, -3.3], [0, -3.9], [3.8, -3.6], [4.3, 0]];
const BAG_SPOT = [-5.2, 0];
// tappeto di gomma (create_gym.py): spesso 1,6 cm, l'inserviente e il mocio ci salgono sopra
const floorAt = (x, z) => FLOOR + (Math.abs(x) < 7 && z > 3.4 && z < 5.8 ? 0.016 : 0);                    // allenamento: qui pende il tuo sacco (spazio libero sul lato ovest)

export class Gym {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'palestra';
    this.t = 0; this.bags = [];
    const L = new GLTFLoader();
    L.load('assets/palestra.glb?v=20261005203039', g => {
      g.scene.traverse(o => {
        if (!o.isMesh) return;
        const m = o.material;
        o.material = new THREE.MeshBasicMaterial({ map: m.map, toneMapped: false });   // luce gia' nella texture
        if (o.material.map) { o.material.map.colorSpace = THREE.SRGBColorSpace; o.material.map.anisotropy = 4; }
      });
      g.scene.traverse(o => { if (/^Sacco/.test(o.name)) this.bags.push({ o, ph: Math.random() * 6, amp: 0.012 + Math.random() * 0.02 }); });
      g.scene.traverse(o => { if (o.name === 'Attrezzi') this._fixProps(o); });
      this.group.add(g.scene);
      this.loaded = true; if (this.onLoad) this.onLoad();
    });
    L.load('assets/inserviente.glb?v=20261005203039', g => this._janitor(g));
    // in allenamento il ring del gioco sparisce: sulla pedana restano corde, pali e angoli (girano con la palestra)
    this.ring = buildRing(RING_SIZE); this.ring.visible = false; this.group.add(this.ring);
  }

  _janitor(g) {
    const J = g.scene, P0 = (this.path || PATH)[0]; J.position.set(P0[0], FLOOR, P0[1]);
    J.traverse(o => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; if (o.material) o.material.envMapIntensity = 0.4; } });
    // pelle e occhi arrivano "trasparenti" da MakeHuman: disegnati in ordine sbagliato sparivano pezzi di faccia.
    // Opachi; capelli e sopracciglia con il taglio netto (alphaTest) invece della trasparenza
    J.traverse(o => { if (!o.isMesh || !o.material || !o.material.transparent) return;
      const m = o.material, cut = /short|eyebrow|hair|high-poly|eye/i.test(o.name + m.name);
      m.transparent = false; m.depthWrite = true; m.alphaTest = cut ? 0.5 : 0; m.side = THREE.FrontSide; m.needsUpdate = true; });
    J.traverse(o => { if (o.isMesh && /short04/i.test(o.name)) o.material.color.setRGB(2.2, 2.1, 2.0); });    // capelli grigi (la texture e' scura)
    J.traverse(o => { if (o.isMesh && o.material && o.material.name === 'Cappellino') {          // rosso scuro opaco (con il velluto sembrava rosa)
      o.material.color.setRGB(0.2, 0.025, 0.02); o.material.roughness = 0.85; if ('sheen' in o.material) o.material.sheen = 0; o.material.needsUpdate = true; } });
    this.group.add(J);
    this.jMixer = new THREE.AnimationMixer(J);
    const clip = n => g.animations.find(a => a.name === n);
    this.aMop = this.jMixer.clipAction(clip('lava')); this.aWalk = this.jMixer.clipAction(clip('cammina'));
    this.aMop.play(); this.aWalk.play(); this.aWalk.setEffectiveWeight(0);
    this.handR = J.getObjectByName('hand_r'); this.handL = J.getObjectByName('hand_l');
    this.midR = J.getObjectByName('middle_01_r'); this.midL = J.getObjectByName('middle_01_l');
    // il buco del pugno: in mezzo tra palmo, nocche e falangi piegate (il manico ci passa dentro, non attraverso le dita)
    this.fistR = ['middle_01_r', 'middle_02_r', 'middle_03_r', 'index_02_r', 'ring_02_r'].map(n => J.getObjectByName(n)).filter(Boolean);
    this.fistL = ['middle_01_l', 'middle_02_l', 'middle_03_l', 'index_02_l', 'ring_02_l'].map(n => J.getObjectByName(n)).filter(Boolean);
    // mocio: manico di legno e frange grigie
    const mop = new THREE.Group();
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 10), new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.6 }));
    stick.position.y = 0.72; mop.add(stick);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6 }));
    head.position.y = 0.07; mop.add(head);
    this.mop = mop; this.group.add(mop);
    // frange di cotone: ogni filo scende dalla testa del mocio e si appoggia a terra; quando il mocio si muove i fili
    // restano indietro e strisciano (non e' un pezzo rigido)
    const NF = 48, fg = new THREE.CylinderGeometry(0.006, 0.008, 1, 5); fg.translate(0, 0.5, 0);
    this.fringe = new THREE.InstancedMesh(fg, new THREE.MeshStandardMaterial({ color: 0xc9c2b2, roughness: 1 }), NF * 2);
    this.fringe.frustumCulled = false; this.group.add(this.fringe);
    this.strands = Array.from({ length: NF }, (_, k) => { const a = k / NF * Math.PI * 2 + Math.random() * 0.2;
      return { a, len: 0.13 + Math.random() * 0.07, tip: null }; });
    this.mopPrev = null;
    this.J = J; this.wp = 0; this.state = 'lava'; this.stateT = 4 + Math.random() * 4; this.blend = 0;
    this.headB = J.getObjectByName('head'); this.neckB = J.getObjectByName('neck_01'); this.look = 0; this.lookYaw = 0;
    this.restQ = [this.neckB, this.headB].filter(Boolean).map(b => [b, b.quaternion.clone()]);   // collo e testa dritti (le animazioni non li muovono)
    // dove guarda la faccia, nel sistema dell'osso della testa (a riposo la faccia guarda avanti come il corpo)
    J.updateMatrixWorld(true);
    if (this.headB) this.faceLocal = new THREE.Vector3(0, 0, 1).applyQuaternion(J.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(this.headB.getWorldQuaternion(new THREE.Quaternion()).invert());
    this.nextWatch = 12 + Math.random() * 15;
    J.traverse(o => { if (o.isMesh && o.morphTargetDictionary && o.morphTargetDictionary.bocca !== undefined) { this.mouthM = o; this.mouthI = o.morphTargetDictionary.bocca; } });
    this.talkT = 0; this.mouth = 0;
  }

  // ritocchi alla palestra di Blender senza rifarla (la luce e' cotta nelle texture): i guantoni appesi erano due
  // ovali colorati e la palla medica nera entrava nella panca. Si tolgono quei triangoli e si rimettono oggetti veri.
  // (coordinate del nodo Attrezzi = Blender (x, z, -y))
  _fixProps(att) {
    const FL = -1.0, X0 = -8.0;
    const HOOKS = [-4.0, -3.7, -3.4, 3.2, 3.5, 3.8, 4.1];
    const kill = [];
    for (const y of HOOKS) for (const s of [-1, 1]) kill.push([X0 + 0.13, FL + 1.52, -(y + s * 0.06), 0.115]);
    kill.push([-5.0, FL + 0.17, -5.3, 0.19]);                            // palla nera
    const g = att.geometry, p = g.attributes.position, idx = g.index ? g.index.array : null;
    if (idx) {
      const keep = [], c = new THREE.Vector3();
      for (let t = 0; t < idx.length; t += 3) {
        c.set(0, 0, 0); for (let k = 0; k < 3; k++) c.x += p.getX(idx[t + k]) / 3, c.y += p.getY(idx[t + k]) / 3, c.z += p.getZ(idx[t + k]) / 3;
        if (!kill.some(([x, y, z, r]) => (c.x - x) ** 2 + (c.y - y) ** 2 + (c.z - z) ** 2 < r * r)) keep.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      g.setIndex(keep);
    }
    // guantoni veri appesi per i lacci al gancio: polso in alto, punta in giu', dorso verso la sala
    const cols = [0xc8101a, 0x18181c, 0x1d3fb4], lace = new THREE.LineBasicMaterial({ color: 0xe8e4da });
    HOOKS.forEach((y, k) => {
      for (const s of [-1, 1]) {
        const holder = new THREE.Group(); holder.position.set(X0 + 0.16, FL + 1.6, -(y + s * 0.065)); holder.rotation.y = -Math.PI / 2 + s * 0.45;
        const gl = makeGloveMesh(s < 0 ? 'left' : 'right', cols[k % 3]); gl.rotation.set(-Math.PI / 2 + 0.12, 0, s * 0.08); gl.scale.setScalar(0.92);
        holder.add(gl); att.add(holder);
        const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(X0 + 0.07, FL + 1.7, -y), new THREE.Vector3(X0 + 0.15, FL + 1.61, -(y + s * 0.06))]);
        att.add(new THREE.Line(lg, lace));
      }
    });
    // la palla nera spostata un po' piu' in la', per terra accanto alle altre
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 18), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.75 }));
    ball.position.set(-4.25, FL + 0.17, -4.5); att.add(ball);
  }
  _updJanitor(dt, watchW) {
    const J = this.J; if (!J) return;
    const P = this.path || PATH, tgt = P[(this.wp + 1) % P.length];
    // ogni tanto si ferma, si appoggia al mocio e guarda te (o il match) per qualche secondo
    this.nextWatch -= dt;
    const wl = watchW ? this.group.worldToLocal(watchW.clone()) : null;
    const near = wl && Math.hypot(wl.x - J.position.x, wl.z - J.position.z) < 3.2;
    if (watchW && this.state !== 'guarda' && (this.nextWatch <= 0 || (near && this.sayKind && !this.said))) {
      this.prevState = this.state; this.state = 'guarda'; this.stateT = 4 + Math.random() * 4; this.facing = false;
      if (near && this.sayKind && !this.said) { this.said = true; this.sayT = 1.2; }   // si gira, poi parla
    }
    if (this.sayT > 0 && (this.facing || this.sayT > 0.2) && (this.sayT -= dt) <= 0 && this.onSay && this.headB) {   // parla solo quando ti guarda
      const dur = this.onSay(this.sayKind, this.headB.getWorldPosition(new THREE.Vector3())) || 2.5;
      this.talkT = dur; this.stateT = Math.max(this.stateT, dur + 1.5);       // resta fermo a guardarti finche' ha finito di parlare
    }
    // bocca: si apre e si chiude mentre parla (a sillabe, un po' irregolare)
    if (this.talkT > 0) this.talkT -= dt;
    const mo = this.talkT > 0 ? 0.25 + 0.75 * Math.abs(Math.sin(this.t * 11)) * (0.6 + 0.4 * Math.sin(this.t * 3.7)) : 0;
    this.mouth += (mo - this.mouth) * Math.min(1, dt * 18);
    if (this.mouthM) this.mouthM.morphTargetInfluences[this.mouthI] = this.mouth;
    if (this.state === 'guarda') {
      if (wl) {                                                   // si gira verso di te
        const want = Math.atan2(wl.x - J.position.x, wl.z - J.position.z);
        const dy = Math.atan2(Math.sin(want - J.rotation.y), Math.cos(want - J.rotation.y));
        J.rotation.y += Math.max(-2.2 * dt, Math.min(2.2 * dt, dy * 1.5));
        this.facing = Math.abs(dy) < 0.25;
      }
      if ((this.stateT -= dt) <= 0) { this.state = this.prevState || 'lava'; this.stateT = 2 + Math.random() * 3; this.nextWatch = 20 + Math.random() * 25; }
    } else if (this.state === 'lava') {
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
    J.position.y = floorAt(J.position.x, J.position.z);
    // dissolvenza tra "lava" e "cammina"
    this.blend += ((this.state === 'cammina' ? 1 : 0) - this.blend) * Math.min(1, dt * 3);
    this.aWalk.setEffectiveWeight(this.blend); this.aMop.setEffectiveWeight(1 - this.blend);
    this.look += ((this.state === 'guarda' ? 1 : 0) - this.look) * Math.min(1, dt * 2.5);
    for (const [bn, q] of this.restQ || []) bn.quaternion.copy(q);   // si riparte dritti: se no la girata verso di te restava (collo piegato)
    this.jMixer.update(dt * (1 - 0.92 * this.look));            // fermo a guardare: il mocio quasi immobile
    J.updateMatrixWorld(true);
    // testa e collo verso di te (oltre a quanto si e' girato col corpo)
    if (this.headB && wl && this.look > 0.01) {
      const hp = this.headB.getWorldPosition(new THREE.Vector3()), to = watchW.clone().sub(hp);
      // dove guarda adesso la faccia (con l'animazione il busto e la testa sono girati): si corregge da li'
      const fw = this.faceLocal.clone().applyQuaternion(this.headB.getWorldQuaternion(new THREE.Quaternion()));
      let yaw = Math.atan2(to.x, to.z) - Math.atan2(fw.x, fw.z); yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      const behind = THREE.MathUtils.smoothstep(Math.abs(yaw), 1.3, 1.9);           // sei dietro di lui: non gira la testa
      this.yawS = (this.yawS || 0) + (Math.max(-1.0, Math.min(1.0, yaw)) * (1 - behind) - (this.yawS || 0)) * Math.min(1, dt * 4);
      yaw = this.yawS * this.look;
      // su/giu' verso i tuoi occhi (attorno all'asse orizzontale del mondo: niente teste piegate di lato)
      const hz = Math.hypot(to.x, to.z), fz = Math.hypot(fw.x, fw.z);
      const pitch = Math.max(-0.45, Math.min(0.45, Math.atan2(to.y, hz) - Math.atan2(fw.y, fz))) * this.look * (1 - behind);
      const pAx = new THREE.Vector3(to.x, 0, to.z).normalize().cross(new THREE.Vector3(0, 1, 0)).normalize();
      for (const [b, k] of [[this.neckB, 0.4], [this.headB, 0.6]]) {   // rotazione attorno alla verticale del mondo
        if (!b) continue;
        const wq = b.getWorldQuaternion(new THREE.Quaternion());
        const nw = new THREE.Quaternion().setFromAxisAngle(pAx, pitch * k).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw * k)).multiply(wq);
        const pinv = b.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        b.quaternion.copy(pinv.multiply(nw)); b.updateMatrixWorld(true);
      }
    }
    // mocio lungo la retta delle mani (dal pugno destro, in basso, verso il sinistro), fino a terra
    const grip = (h, m, F) => {
      const c = h.getWorldPosition(new THREE.Vector3()).lerp(m.getWorldPosition(new THREE.Vector3()), 0.75), w = new THREE.Vector3();
      if (F.length < 3) return c;
      for (const b of F) c.add(b.getWorldPosition(w));
      return c.divideScalar(F.length + 1);
    };
    const R = this.group.worldToLocal(grip(this.handR, this.midR, this.fistR)), Lh = this.group.worldToLocal(grip(this.handL, this.midL, this.fistL));
    const d = Lh.clone().sub(R).normalize();
    if (d.y > 0.2) {
      const t = (R.y - FLOOR) / d.y;
      const foot = R.clone().addScaledVector(d, -t);
      foot.y = floorAt(foot.x, foot.z);                        // (sopra il tappeto di gomma)
      const head = foot.clone().addScaledVector(d, 0.1);       // testa del mocio un po' su dal pavimento, lungo il manico
      this.mop.position.copy(head).addScaledVector(d, -0.1);
      this.mop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      this.mop.visible = true;
      this._updFringe(dt, head);
    }
  }

  _updFringe(dt, head) {
    const v = this.mopPrev ? head.clone().sub(this.mopPrev).divideScalar(Math.max(dt, 1e-3)) : new THREE.Vector3();
    this.mopPrev = head.clone(); v.y = 0;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3();
    const fy = floorAt(head.x, head.z) + 0.004;
    this.strands.forEach((S, k) => {
      // dove vorrebbe stare la punta: a raggiera attorno alla testa, spinta indietro dal movimento
      const want = new THREE.Vector3(head.x + Math.cos(S.a) * S.len * 0.75, fy, head.z + Math.sin(S.a) * S.len * 0.75).addScaledVector(v, -0.12);
      if (!S.tip) S.tip = want.clone();
      S.tip.lerp(want, Math.min(1, dt * 6));                  // i fili seguono in ritardo (attrito sul pavimento)
      const r = S.tip.clone().sub(head); r.y = 0;
      if (r.length() > S.len * 0.95) r.setLength(S.len * 0.95); S.tip.set(head.x + r.x, fy, head.z + r.z);
      // primo pezzo: dalla testa giu' al pavimento poco fuori; secondo: disteso a terra fino alla punta
      const mid = new THREE.Vector3(head.x + r.x * 0.3, fy + 0.008, head.z + r.z * 0.3);
      for (const [a, b, i] of [[head, mid, k * 2], [mid, S.tip, k * 2 + 1]]) {
        const dir = b.clone().sub(a), L = Math.max(dir.length(), 1e-3);
        q.setFromUnitVectors(up, dir.divideScalar(L)); m.compose(a, q, sc.set(1, L, 1)); this.fringe.setMatrixAt(i, m);
      }
    });
    this.fringe.instanceMatrix.needsUpdate = true;
  }

  // allenamento: la palestra si sposta e gira perche' il punto libero BAG_SPOT finisca sul sacco davanti a te,
  // con il pavimento a quota 0 (dove stai davvero); l'uomo delle pulizie lavora dall'altra parte
  setTraining(on, bagZ, kind = null) {
    this.path = on ? PATH_TRAIN : PATH;
    this.sayKind = on ? kind : null; this.said = false;      // la sua battuta: una volta per allenamento
    if (this.mop) { this.mop.visible = false; this.mopPrev = null; }   // (riappare quando torna nelle sue mani)
    this.ring.visible = !!on;
    if (on) { this.group.rotation.y = -Math.PI / 2; this.group.position.set(0, 1, bagZ - BAG_SPOT[0]); }
    else { this.group.rotation.y = 0; this.group.position.set(0, 0, 0); }
    if (this.J) { this.wp = 0; this.J.position.set(this.path[0][0], FLOOR, this.path[0][1]); this.state = 'lava'; this.stateT = 3; }
  }

  update(dt, watchW = null) {
    this.t += dt;
    for (const b of this.bags) {                             // i sacchi oscillano appena (qualcuno li ha colpiti)
      b.o.rotation.x = Math.sin(this.t * 1.7 + b.ph) * b.amp;
      b.o.rotation.z = Math.sin(this.t * 1.3 + b.ph * 1.7) * b.amp * 0.7;
    }
    this._updJanitor(dt, watchW);
  }
}
