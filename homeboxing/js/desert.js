// Stage "Nel deserto": il ring sulla sabbia rossa del Namaqualand. Sfondo = foto vera a 360 gradi "Goegap"
// (Poly Haven, CC0) a piena risoluzione; davanti, in 3D, solo la sabbia sotto e attorno al ring (texture
// fotografica red_sand portata al colore della foto, sfuma nella foto entro pochi metri) e ogni tanto uno
// scorpione che esce dalla sabbia, cammina un po' e si risotterra. Le rocce e i cespugli sono quelli veri della foto.
import * as THREE from 'three';
import * as sfx from './sfx.js?v=20261004233118';

const PANO_U = 0.0;
const SUN = new THREE.Vector3(0.522, 0.744, 0.417).normalize();      // il sole della foto

const _gw = new THREE.Vector3();
const SC_RMIN = 2.5, SC_RMAX = 4.2, SC_RING = 2.2;      // scorpione: tra il ring (lato 3,2 m + grembiule) e il bordo della sabbia piena

export class Desert {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'deserto';
    this.sunDir = SUN.clone();
    this._sky(); this._sand(); this._scorpion(); this._eagles();
    this.t = 0;
  }
  _sky() {
    const tex = new THREE.TextureLoader().load('assets/deserto_panorama.jpg?v=20261004233118', () => { this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
    tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    this.skyTex = tex;
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uPano: { value: tex }, uU: { value: PANO_U } },
      vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uPano; uniform float uU; varying vec3 vD;
        void main(){ vec3 d = normalize(vD);
          vec2 uv = vec2(fract(atan(d.z, d.x) * 0.15915494 + 0.5 + uU), asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          gl_FragColor = vec4(texture2D(uPano, uv).rgb, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 32), m);
    sky.renderOrder = -10; sky.frustumCulled = false; this.group.add(sky);
  }
  // sabbia vicina: foto di sabbia rossa (colore = quello del terreno della foto), il bordo sfuma tra 5 e 9 m
  _sand() {
    const L = new THREE.TextureLoader();
    const tex = L.load('assets/sabbia_rossa_colore.jpg?v=20261004233118'); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 6); tex.anisotropy = 8;
    const a = document.createElement('canvas'); a.width = a.height = 256; const ga = a.getContext('2d');
    const gr = ga.createRadialGradient(128, 128, 128 * 5 / 9, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
    ga.fillStyle = gr; ga.fillRect(0, 0, 256, 256);
    const sand = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ map: tex, alphaMap: new THREE.CanvasTexture(a), transparent: true, depthWrite: true, toneMapped: false }));   // (scrive la profondita': lo scorpione sotto la sabbia non si vede)
    sand.rotation.x = -Math.PI / 2; sand.position.y = -0.005; sand.renderOrder = -5; this.group.add(sand);
    // sotto il ring: opaca e illuminata (riceve le ombre dei pugili)
    const nor = L.load('assets/sabbia_rossa_rilievo.jpg?v=20261004233118'); nor.wrapS = nor.wrapT = THREE.RepeatWrapping; nor.repeat.set(3, 3);
    const t2 = tex.clone(); t2.repeat.set(3, 3); t2.needsUpdate = true;
    const under = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48), new THREE.MeshStandardMaterial({ map: t2, normalMap: nor, roughness: 0.95 }));
    under.rotation.x = -Math.PI / 2; under.position.y = -0.003; under.receiveShadow = true; this.group.add(under);
  }
  // scorpione: ogni tanto esce dalla sabbia (con uno spruzzo), cammina un po' attorno al ring e si risotterra.
  // Solo sulla sabbia 3D vicina (non nella foto). Lungo ~20 cm, corazza bruno-ambra lucida. Muso verso +Z.
  _scorpion() {
    const S = new THREE.Group(); S.visible = false;
    const shell = new THREE.MeshStandardMaterial({ color: 0x6b4318, roughness: 0.35, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a220b, roughness: 0.4 });
    const sting = new THREE.MeshStandardMaterial({ color: 0x1c1006, roughness: 0.3 });
    const seg = (r, l, m = shell) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), m); o.scale.set(r, r * 0.4, l); o.castShadow = true; return o; };
    const body = new THREE.Group(); body.position.y = 0.018; S.add(body);
    const head = seg(0.022, 0.026); head.position.z = 0.035; body.add(head);
    for (let k = 0; k < 5; k++) { const a = seg(0.024 - k * 0.0012, 0.013, k % 2 ? shell : dark); a.position.z = 0.012 - k * 0.017; body.add(a); }
    // coda: 5 segmenti a catena che salgono e si piegano sopra la schiena, poi il pungiglione
    let parent = new THREE.Group(); parent.position.set(0, 0.002, -0.07); body.add(parent);
    this.tail = [];
    for (let k = 0; k < 5; k++) {
      const j = new THREE.Group(); parent.add(j);
      const sg = seg(0.009, 0.011, k % 2 ? shell : dark); sg.position.z = -0.009; j.add(sg);
      const nxt = new THREE.Group(); nxt.position.z = -0.019; j.add(nxt);
      this.tail.push(j); parent = nxt;
    }
    const bulb = seg(0.008, 0.01, dark); bulb.position.z = -0.006; parent.add(bulb);
    const st = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.016, 8), sting); st.position.set(0, -0.004, -0.016); st.rotation.x = -Math.PI / 2 - 0.9; parent.add(st);
    // chele: braccio, avambraccio e pinza (un dito mobile che si apre e chiude)
    this.claws = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.016, 0, 0.05); sh.rotation.y = s * 0.55; body.add(sh);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.004, 0.035, 6), shell); arm.rotation.x = Math.PI / 2; arm.position.z = 0.017; sh.add(arm);
      const el = new THREE.Group(); el.position.z = 0.034; el.rotation.y = -s * 1.0; sh.add(el);
      const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.025, 6), shell); arm2.rotation.x = Math.PI / 2; arm2.position.z = 0.012; el.add(arm2);
      const hand = seg(0.008, 0.012); hand.position.z = 0.03; el.add(hand);
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.02, 6), dark); f1.rotation.x = Math.PI / 2; f1.position.set(s * 0.003, 0, 0.048); el.add(f1);
      const f2g = new THREE.Group(); f2g.position.set(-s * 0.003, 0, 0.04); el.add(f2g);
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.018, 6), dark); f2.rotation.x = Math.PI / 2; f2.position.z = 0.008; f2g.add(f2);
      this.claws.push({ sh, f2g, s });
    }
    // 8 zampe: coscia che sale al ginocchio, tibia che scende a terra
    this.legs = [];
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const hip = new THREE.Group(); hip.position.set(s * 0.016, 0, 0.022 - k * 0.014);
      hip.rotation.y = s * (Math.PI / 2 - 0.35 + k * 0.25); body.add(hip);
      const thigh = new THREE.Group(); thigh.rotation.x = -0.6; hip.add(thigh);
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0022, 0.028, 5), shell); up.rotation.x = Math.PI / 2; up.position.z = 0.014; thigh.add(up);
      const knee = new THREE.Group(); knee.position.z = 0.028; knee.rotation.x = 1.5; thigh.add(knee);
      const low = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0018, 0.046, 5), dark); low.rotation.x = Math.PI / 2; low.position.z = 0.023; knee.add(low);
      this.legs.push({ hip, thigh, ph: (k % 2) * Math.PI + (s > 0 ? Math.PI : 0), base: hip.rotation.y, s });
    }
    S.scale.setScalar(1.3);
    // sotto la sabbia non si vede (la sabbia 3D verso il bordo e' semitrasparente): taglio a filo del terreno
    this.clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    // dove il taglio a filo della sabbia apre il guscio si vedrebbe l'interno vuoto: le facce interne si colorano di sabbia
    const sandCap = m => { if (m.userData.sandCap) return; m.userData.sandCap = true; m.side = THREE.DoubleSide;
      m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
        '#include <dithering_fragment>\n if (!gl_FrontFacing) gl_FragColor = vec4(0.62, 0.36, 0.22, 1.0);'); }; m.needsUpdate = true; };
    S.traverse(o => { if (o.isMesh) { o.material.clippingPlanes = [this.clip]; sandCap(o.material); } });
    this.scorp = S; this.scBody = body; this.group.add(S);
    // spruzzi di sabbia
    const N = 140, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.sprayV = new Float32Array(N * 3);
    this.spray = new THREE.Points(geo, new THREE.PointsMaterial({ map: this._grain(), alphaTest: 0.3, color: 0xc29a6e, size: 0.009, transparent: true, opacity: 0.9, depthWrite: false }));
    this.spray.visible = false; this.spray.frustumCulled = false; this.group.add(this.spray);
    this.nextSc = 8 + Math.random() * 10; this.sc = null;
  }
  _grain() {                                              // granello tondo (non quadrato)
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 2, 16, 16, 15); gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }
  _burst(p, n = 1) {
    const pos = this.spray.geometry.attributes.position.array, v = this.sprayV;
    for (let i = 0; i < pos.length / 3; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.06, up = 0.6 + Math.random() * 1.1, h = 0.2 + Math.random() * 0.6;
      pos[i * 3] = p.x + Math.cos(a) * r; pos[i * 3 + 1] = 0.005; pos[i * 3 + 2] = p.z + Math.sin(a) * r;
      v[i * 3] = Math.cos(a) * h * n; v[i * 3 + 1] = up * n; v[i * 3 + 2] = Math.sin(a) * h * n;
    }
    this.spray.geometry.attributes.position.needsUpdate = true;
    this.spray.visible = true; this.sprayT = 0; this.spray.material.opacity = 0.9;
  }
  _updSpray(dt) {
    if (!this.spray.visible) return;
    this.sprayT += dt;
    const pos = this.spray.geometry.attributes.position.array, v = this.sprayV;
    for (let i = 0; i < pos.length / 3; i++) {
      if (pos[i * 3 + 1] <= 0.003 && v[i * 3 + 1] <= 0) continue;          // gia' ricaduto
      v[i * 3 + 1] -= 9.8 * dt;
      pos[i * 3] += v[i * 3] * dt; pos[i * 3 + 1] = Math.max(0.003, pos[i * 3 + 1] + v[i * 3 + 1] * dt); pos[i * 3 + 2] += v[i * 3 + 2] * dt;
    }
    this.spray.geometry.attributes.position.needsUpdate = true;
    this.spray.material.opacity = Math.max(0, 0.9 - Math.max(0, this.sprayT - 0.5) * 1.2);
    if (this.sprayT > 1.3) this.spray.visible = false;
  }
  // ---- aquile reali che planano sulle termiche (apertura alare ~2 m): ali con le "dita" delle remiganti,
  // coda a ventaglio, testa dorata, becco giallo; virano inclinate, ogni tanto qualche battito; gridano (audio spaziale)
  _eagleModel() {
    const E = new THREE.Group();
    const dark = new THREE.Color(0x2e2117), mid = new THREE.Color(0x5a3d24), gold = new THREE.Color(0x9a7038);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
    const paint = (geo, f) => { const p = geo.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const col = f(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo; };
    // ala (sagoma vista dall'alto, x = apertura verso l'esterno, y = corda: + bordo d'attacco)
    const w = new THREE.Shape();
    w.moveTo(0, 0.13); w.lineTo(0.35, 0.17); w.lineTo(0.62, 0.15); w.lineTo(0.82, 0.1);
    const fingers = [[0.98, 0.06], [0.9, 0.02], [1.0, -0.01], [0.9, -0.04], [0.97, -0.08], [0.86, -0.1], [0.9, -0.15], [0.78, -0.15]];
    for (const [x, y] of fingers) w.lineTo(x, y);                             // le "dita" delle penne primarie
    w.lineTo(0.62, -0.2); w.lineTo(0.4, -0.24); w.lineTo(0.18, -0.22); w.lineTo(0, -0.16); w.closePath();
    const wg = paint(new THREE.ShapeGeometry(w, 6), (x, y) => x > 0.7 ? dark : y > 0.05 ? gold.clone().lerp(mid, 0.6) : mid);
    wg.rotateX(-Math.PI / 2);                                                   // in piano (y del disegno -> -z del mondo)
    this.eWings = [];
    for (const s of [1, -1]) {
      const hinge = new THREE.Group(); hinge.position.set(s * 0.06, 0.02, 0.02);
      const m = new THREE.Mesh(wg, mat); m.scale.set(s, 1, 1); hinge.add(m); E.add(hinge);
      this.eWings.push({ hinge, s });
    }
    const body = new THREE.Mesh(paint(new THREE.CapsuleGeometry(0.075, 0.42, 6, 12), (x, y) => y > 0.12 ? mid : dark), mat);
    body.rotation.x = Math.PI / 2; E.add(body);                                // lungo z (testa verso -z)
    const head = new THREE.Mesh(paint(new THREE.SphereGeometry(0.065, 14, 10), () => gold), mat); head.position.set(0, 0.03, -0.31); head.scale.set(1, 0.95, 1.2); E.add(head);
    const beak = new THREE.Mesh(paint(new THREE.ConeGeometry(0.022, 0.07, 8), () => new THREE.Color(0xd4a020)), mat); beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.015, -0.39); E.add(beak);
    const t = new THREE.Shape(); t.moveTo(-0.05, 0); t.lineTo(-0.13, 0.27); t.lineTo(0.13, 0.27); t.lineTo(0.05, 0); t.closePath();
    const tg = paint(new THREE.ShapeGeometry(t), () => dark); tg.rotateX(Math.PI / 2);
    const tail = new THREE.Mesh(tg, mat); tail.position.set(0, 0, 0.24); E.add(tail);
    E.scale.setScalar(1.05);
    return E;
  }
  _eagles() {
    this.eagles = [];
    for (let k = 0; k < 2; k++) {
      const m = this._eagleModel(); this.group.add(m);
      const a = Math.random() * Math.PI * 2, d = 25 + Math.random() * 40;
      this.eagles.push({ m, c: new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), R: 15 + Math.random() * 25, h: 18 + Math.random() * 22,
        ang: Math.random() * 6.28, dir: Math.random() < 0.5 ? 1 : -1, v: 10 + Math.random() * 3, flap: 0, flapT: 4 + Math.random() * 10, drift: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(1.2) });
      this.eWingsAll = (this.eWingsAll || []).concat([this.eWings]);
    }
    // la prima gira su una termica che passa proprio sopra il ring (piu' bassa): la sua ombra attraversa la sabbia e il ring
    const E0 = this.eagles[0]; E0.R = 26; E0.h = 15; E0.over = Math.random() * 6.28; E0.drift.set(0, 0, 0);
    E0.c.set(Math.cos(E0.over) * E0.R, 0, Math.sin(E0.over) * E0.R);
    this._eagleShadows();
    this.cryT = 6 + Math.random() * 10;
  }
  // ombra dell'aquila: sagoma vista dall'alto (ali aperte), proiettata sul terreno lungo la direzione del sole
  _eagleShadows() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.filter = 'blur(2px)'; g.fillStyle = '#000';
    const X = x => 128 + x * 116 / 1.1, Y = y => 64 - y * 116 / 1.1;            // metri -> pixel (alto = avanti)
    const wing = [[0, 0.13], [0.35, 0.17], [0.62, 0.15], [0.82, 0.1], [0.98, 0.06], [0.9, 0.02], [1.0, -0.01], [0.9, -0.04], [0.97, -0.08], [0.86, -0.1], [0.9, -0.15], [0.78, -0.15], [0.62, -0.2], [0.4, -0.24], [0.18, -0.22], [0, -0.16]];
    for (const s of [1, -1]) { g.beginPath(); wing.forEach(([x, y], i) => (i ? g.lineTo : g.moveTo).call(g, X(s * (x + 0.06)), Y(y))); g.closePath(); g.fill(); }
    g.beginPath(); g.ellipse(X(0), Y(-0.02), 0.08 * 116 / 1.1, 0.34 * 116 / 1.1, 0, 0, Math.PI * 2); g.fill();          // corpo e testa
    g.beginPath(); g.moveTo(X(-0.05), Y(-0.24)); g.lineTo(X(-0.13), Y(-0.51)); g.lineTo(X(0.13), Y(-0.51)); g.lineTo(X(0.05), Y(-0.24)); g.fill();   // coda
    const tex = new THREE.CanvasTexture(c);
    const geo = new THREE.PlaneGeometry(2.2 * 1.05, 1.1 * 1.05); geo.rotateX(-Math.PI / 2);
    this.eShadows = this.eagles.map(() => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, color: 0x2a1408,
        polygonOffset: true, polygonOffsetFactor: -4, toneMapped: false }));
      m.renderOrder = -2; m.visible = false; this.group.add(m); return m;
    });
  }
  _updEagles(dt, cam) {
    this.eagles.forEach((E, i) => {
      const w = E.v / E.R;
      E.ang += E.dir * w * dt;
      E.c.addScaledVector(E.drift, dt);                                       // la termica si sposta piano
      if (E.c.length() > 80) E.drift.negate();
      if (E.over !== undefined) { E.over += dt * 0.02; E.c.set(Math.cos(E.over) * E.R, 0, Math.sin(E.over) * E.R); }   // il cerchio passa sempre sul ring
      const x = E.c.x + Math.cos(E.ang) * E.R, z = E.c.z + Math.sin(E.ang) * E.R, y = E.h + Math.sin(this.t * 0.2 + i) * 4;
      E.m.position.set(x, y, z);
      const vx = -Math.sin(E.ang) * E.dir, vz = Math.cos(E.ang) * E.dir;     // direzione del volo
      const bank = Math.atan(E.v * E.v / (9.81 * E.R)) * E.dir;               // inclinazione in virata
      E.m.rotation.set(0, Math.atan2(-vx, -vz), 0); E.m.rotateZ(-bank);
      // ali: planata (leggermente a V) con qualche serie di battiti
      E.flapT -= dt;
      if (E.flapT <= 0 && E.flap <= 0) { E.flap = 1.6; E.flapT = 8 + Math.random() * 14; }
      let wingA = 0.12;
      if (E.flap > 0) { E.flap -= dt; wingA = 0.12 + Math.sin((1.6 - E.flap) * Math.PI * 2 * 1.8) * 0.45; }
      for (const W of this.eWingsAll[i]) W.hinge.rotation.z = W.s * wingA;
      // ombra: dove il raggio di sole che passa per l'aquila tocca terra; solo sulla sabbia 3D (sfuma verso il bordo)
      const sh = this.eShadows && this.eShadows[i];
      if (sh) {
        const gx = x - SUN.x / SUN.y * y, gz = z - SUN.z / SUN.y * y, r = Math.hypot(gx, gz);
        const a = 0.42 * (1 - THREE.MathUtils.smoothstep(r, 6.5, 9));
        sh.visible = a > 0.01; sh.material.opacity = a;
        sh.position.set(gx, 0.03, gz); sh.rotation.set(0, Math.atan2(-vx, -vz), 0);
      }
    });
    this.cryT -= dt;
    if (this.cryT <= 0 && cam) {
      const E = this.eagles[Math.floor(Math.random() * this.eagles.length)];
      sfx.eagleCry(E.m.getWorldPosition(new THREE.Vector3()), cam); this.cryT = 12 + Math.random() * 18;
    }
  }

  update(dt, cam) {
    this.t += dt;
    this._updEagles(dt, cam);
    this._updSpray(dt);
    const S = this.scorp;
    this.clip.constant = -this.group.getWorldPosition(_gw).y - 0.001;
    if (!this.sc) {
      if ((this.nextSc -= dt) > 0) return;
      // dove: solo sulla sabbia 3D piena attorno al ring (oltre i 4,5 m la sabbia sfuma nella foto: li' no)
      let x, z;
      do { const a = Math.random() * Math.PI * 2, r = SC_RMIN + Math.random() * (SC_RMAX - SC_RMIN - 0.3); x = Math.cos(a) * r; z = Math.sin(a) * r; } while (Math.max(Math.abs(x), Math.abs(z)) < SC_RING);
      this.sc = { phase: 'su', t: 0, x, z, yaw: Math.random() * Math.PI * 2, turn: 0, walk: 4 + Math.random() * 5 };
      S.position.set(x, -0.06, z); S.rotation.set(-0.5, this.sc.yaw, 0); S.visible = true;
      this._burst(S.position, 1);
      return;
    }
    const C = this.sc; C.t += dt;
    let speed = 0;
    if (C.phase === 'su') {                                  // esce dalla sabbia, muso in su
      const k = Math.min(1, C.t / 0.9), e = k * k * (3 - 2 * k);
      S.position.y = -0.06 + 0.06 * e; S.rotation.set(-0.5 * (1 - e), C.yaw, 0);
      if (k >= 1) { C.phase = 'cammina'; C.t = 0; }
    } else if (C.phase === 'cammina') {                    // cammina a scatti, curvando
      const go = Math.sin(C.t * 1.7) > -0.35;              // brevi soste
      speed = go ? 0.13 : 0;
      if (Math.random() < dt * 0.8) C.turn = (Math.random() - 0.5) * 1.6;
      C.yaw += C.turn * dt * (go ? 1 : 0.3);
      // resta sulla sabbia 3D e fuori dal ring
      const r = Math.hypot(C.x, C.z);
      if (r > SC_RMAX) C.yaw = Math.atan2(-C.x, -C.z);                       // torna verso il ring (resta sulla sabbia piena)
      else if (Math.max(Math.abs(C.x), Math.abs(C.z)) < SC_RING) C.yaw = Math.atan2(C.x, C.z);   // non sale sul ring
      C.x += Math.sin(C.yaw) * speed * dt; C.z += Math.cos(C.yaw) * speed * dt;
      S.position.set(C.x, 0, C.z); S.rotation.set(0, C.yaw, 0);
      if (C.t > C.walk && go) { C.phase = 'giu'; C.t = 0; this._burst(S.position, 0.8); }
    } else {                                               // si risotterra scavando (scende tremando)
      const k = Math.min(1, C.t / 1.1);
      S.position.y = -0.07 * k; S.rotation.set(0.35 * k, C.yaw + Math.sin(C.t * 30) * 0.08 * (1 - k), 0);
      speed = 0.05;
      if (k >= 1) { S.visible = false; this.sc = null; this.nextSc = 18 + Math.random() * 25; }
    }
    // zampe a passo alternato, chele che si aprono, coda che ondeggia
    const w = this.t * (speed > 0.06 ? 14 : 4);
    for (const L of this.legs) {
      L.hip.rotation.y = L.base + Math.sin(w + L.ph) * (speed > 0 ? 0.28 : 0.05) * L.s;
      L.thigh.rotation.x = -0.6 - Math.max(0, Math.cos(w + L.ph)) * (speed > 0 ? 0.35 : 0.05);
    }
    for (const c of this.claws) { c.f2g.rotation.y = -c.s * (0.15 + 0.15 * Math.sin(this.t * 3 + c.s)); c.sh.rotation.x = Math.sin(this.t * 1.3 + c.s) * 0.08; }
    this.tail.forEach((j, k) => { j.rotation.x = 0.55 + k * 0.08 + Math.sin(this.t * 2 + k * 0.5) * 0.05; j.rotation.y = Math.sin(this.t * 1.1 + k) * 0.04; });
    this.scBody.position.y = 0.018 + Math.abs(Math.sin(w)) * 0.002 * (speed > 0 ? 1 : 0);
  }
}
