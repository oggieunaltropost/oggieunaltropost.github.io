// Stage "Nel deserto": il ring sulla sabbia rossa. Sfondo = panorama a 360 gradi fatto in Blender (blender/create_desert.py:
// dune, rocce, cespugli, cactus, mesas e montagne) con la sua mappa di profondita'; davanti, in 3D, ogni tanto uno
// scorpione che esce dalla sabbia, cammina un po' e si risotterra.
import * as THREE from 'three';
import { panoDepth } from './pano_depth.js?v=20261010182023';
import { panoGround } from './pano_ground.js?v=20261010182023';
import { contactShadow } from './contact_shadow.js?v=20261010182023';
import * as sfx from './sfx.js?v=20261010182023';

const PANO_U = 0.0;
const SUN = new THREE.Vector3(-0.4465, 0.7193, 0.5321).normalize();      // il sole del panorama (blender/create_desert.py)

const _gw = new THREE.Vector3();
const SC_RMIN = 3.2, SC_RMAX = 6.6, SC_RING = 2.7;      // (piu' in la': col ring rialzato il bordo nascondeva la sabbia vicina)      // scorpione: tra il ring (lato 3,2 m + grembiule) e il bordo della sabbia piena

export class Desert {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'deserto';
    this.sunDir = SUN.clone();
    this._sky(); this._sand(); this._scorpion(); this._mound(); this._scorpion2(); this._cacti(); this._rocks(); this._eagles();
    this.t = 0;
  }
  _sky() {
    const tex = new THREE.TextureLoader().load('assets/deserto_panorama.jpg?v=20261010182023', () => { this._sampleSand(tex); this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
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
    // sfondo 3D: profondita' esatta dal render (blender/create_desert.py): terreno, mesas e montagne alla loro distanza
    this.panoRoot = panoDepth('assets/deserto_profondita.png', tex, { eye: 1.62, uU: PANO_U, flat: 20, hi: true, onReady: () => this._placeCacti() });
    this.group.add(this.panoRoot);
  }
  // il colore medio della sabbia sotto il ring (dal panorama): il rilievo che alza lo scorpione e' dello stesso colore
  _sampleSand(tex) {
    try {
      const im = tex.image, W = 96, H = 24, c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, im.height * 0.86, im.width, im.height * 0.12, 0, 0, W, H);   // le righe in fondo: la sabbia sotto i piedi
      const d = g.getImageData(0, 0, W, H).data; let r = 0, gg = 0, b = 0; const n = W * H;
      for (let i = 0; i < n; i++) { r += d[i * 4]; gg += d[i * 4 + 1]; b += d[i * 4 + 2]; }
      this.sandRGB = [r / n / 255, gg / n / 255, b / n / 255];
      if (this.spray) { this.spray.material.color.setRGB(this.sandRGB[0], this.sandRGB[1], this.sandRGB[2], THREE.SRGBColorSpace).multiplyScalar(0.92); this.spray.material.needsUpdate = true; }
    } catch (e) { this.sandRGB = [0.62, 0.36, 0.22]; }
  }
  // ---- cactus veri (saguaro) in 3D: prima erano dipinti nel panorama e alcuni sembravano tagliati a meta'. Tronco a coste, braccia
  // curve che salgono, colore che schiarisce sulle coste. Poggiano sul terreno dello sfondo (si misura con un raggio, appena e' pronto).
  _cacti() {
    this.cactusGroup = new THREE.Group(); this.cactusGroup.name = 'cactus'; this.group.add(this.cactusGroup);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const ribbed = (geo, amp, n, hy0, hy1) => {                    // coste verticali + colore piu' chiaro sulle coste
      const p = geo.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 0.5 + 0.5 * Math.cos(n * a);
        const f = 1 + amp * (k - 0.5);
        p.setX(i, x * f); p.setZ(i, z * f);
        const g = 0.62 + 0.38 * k; c[i * 3] = 0.075 * g; c[i * 3 + 1] = 0.115 * g; c[i * 3 + 2] = 0.06 * g;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.computeVertexNormals(); return geo;
    };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, envMapIntensity: 0.35 });
    this.cactusList = [];
    for (let i = 0; i < 18; i++) {
      const r = i < 5 ? 14 + rnd() * 14 : 24 + Math.pow(rnd(), 1.4) * 110, a = rnd() * Math.PI * 2;
      const H = 1.9 + rnd() * 2.3, R = 0.17 + rnd() * 0.06, G = new THREE.Group();
      // tronco: profilo di rotazione, un po' piu' stretto in basso e tondo in cima
      const prof = []; for (let k = 0; k <= 14; k++) { const y = k / 14 * H; const t = k / 14; prof.push(new THREE.Vector2(R * (0.8 + 0.2 * Math.min(1, t * 6)) * (t > 0.9 ? Math.sqrt(Math.max(0.02, 1 - (t - 0.9) / 0.1 * ((t - 0.9) / 0.1))) : 1), y)); }
      prof.push(new THREE.Vector2(0.001, H));
      G.add(new THREE.Mesh(ribbed(new THREE.LatheGeometry(prof, 18), 0.22, 12), mat));
      // braccia: curve che escono di lato e salgono
      const na = rnd() < 0.15 ? 0 : 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < na; k++) {
        const y0 = H * (0.3 + rnd() * 0.3), ang = rnd() * Math.PI * 2, out = 0.55 + rnd() * 0.45, up = 0.7 + rnd() * 1.3, ar = R * (0.62 + rnd() * 0.1);
        const dx = Math.cos(ang), dz = Math.sin(ang);
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(dx * R * 0.5, y0, dz * R * 0.5), new THREE.Vector3(dx * out * 0.7, y0 + 0.05, dz * out * 0.7), new THREE.Vector3(dx * out, y0 + 0.3, dz * out), new THREE.Vector3(dx * out * 1.02, y0 + 0.3 + up * 0.6, dz * out * 1.02), new THREE.Vector3(dx * out * 1.02, y0 + 0.3 + up, dz * out * 1.02)]);
        const tube = new THREE.TubeGeometry(curve, 14, ar, 14, false);
        // la tubazione ha gli anelli attorno alla curva: le coste si fanno nello spazio locale della sezione (colore e leggero rilievo)
        const pos = tube.attributes.position, col = new Float32Array(pos.count * 3);
        for (let q = 0; q < pos.count; q++) { const seg = q % 15, kk = 0.5 + 0.5 * Math.cos(10 * seg / 14 * Math.PI * 2), g = 0.62 + 0.38 * kk; col[q * 3] = 0.075 * g; col[q * 3 + 1] = 0.115 * g; col[q * 3 + 2] = 0.06 * g; }
        tube.setAttribute('color', new THREE.BufferAttribute(col, 3));
        G.add(new THREE.Mesh(tube, mat));
        const cap = new THREE.Mesh(new THREE.SphereGeometry(ar, 14, 8), mat); cap.position.set(dx * out * 1.02, y0 + 0.3 + up, dz * out * 1.02); cap.scale.set(1, 1.0, 1); G.add(cap);
      }
      const sh = contactShadow(R * 5, R * 5, 0.45); sh.position.y = 0.02; G.add(sh);
      G.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); G.rotation.y = rnd() * 6.28; G.visible = false;
      this.cactusGroup.add(G); this.cactusList.push(G);
    }
  }
  // ---- le quattro rocce grandi piu' vicine: dipinte nel panorama una (a destra) si vedeva tagliata a meta'; ora sono sassi 3D veri
  _rocks() {
    this.rockGroup = new THREE.Group(); this.rockGroup.name = 'rocce'; this.group.add(this.rockGroup);
    let seed = 21; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: false, envMapIntensity: 0.4 });
    this.rockList = [];
    for (const [x, z, sx, sz, sy] of [[-37, -9, 1.9, 1.1, 0.8], [37, -12, 1.5, 1.6, 0.7], [-38, -22, 1.4, 1.5, 0.7], [29, -27, 1.3, 1.1, 1.1]]) {
      const geo = new THREE.IcosahedronGeometry(1, 3), p = geo.attributes.position, c = new Float32Array(p.count * 3), ph = rnd() * 10;
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize(), n = 1 + 0.22 * Math.sin(v.x * 3.1 + ph) * Math.cos(v.y * 2.7 + ph * 1.3) + 0.12 * Math.sin(v.z * 7 + ph * 2) + 0.06 * Math.sin((v.x + v.y) * 11 + ph);
        p.setXYZ(i, v.x * n * sx, Math.max(-0.25, v.y) * n * sy, v.z * n * sz);
        const g = 0.8 + 0.3 * Math.sin(v.x * 5 + v.y * 3 + ph) + 0.15 * v.y;                 // un po' di variazione e piu' chiaro in alto
        c[i * 3] = 0.27 * g; c[i * 3 + 1] = 0.145 * g; c[i * 3 + 2] = 0.085 * g;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat); m.position.set(x, 0, z); m.rotation.y = rnd() * 6.28; m.visible = false;
      const sh = contactShadow(sx * 2.4, sz * 2.4, 0.4); sh.position.y = 0.02; sh.visible = false; m.userData.sh = sh; this.rockGroup.add(m); this.rockGroup.add(sh);
      this.rockList.push(m);
    }
  }
  _placeCacti() {                                             // appena lo sfondo e' pronto: ogni cactus sul suo terreno
    if (!this.cactusList || !this.panoRoot) return;
    const rc = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), o = new THREE.Vector3();
    this.group.updateMatrixWorld(true);
    for (const G of this.cactusList) {
      o.set(G.position.x, 400, G.position.z); rc.set(this.group.localToWorld(o.clone()), down);
      const hit = rc.intersectObject(this.panoRoot, true).find(h => h.object.name === 'sfondo 3D');
      G.position.y = hit ? this.group.worldToLocal(hit.point.clone()).y : 0; G.visible = true;
    }
    for (const R of this.rockList) {
      o.set(R.position.x, 400, R.position.z); rc.set(this.group.localToWorld(o.clone()), down);
      const hit = rc.intersectObject(this.panoRoot, true).find(h => h.object.name === 'sfondo 3D');
      R.position.y = (hit ? this.group.worldToLocal(hit.point.clone()).y : 0) + 0.05; R.visible = true;
      // l'ombra e' un foglio piatto: dove il terreno sale o scende la tagliava e restava una riga scura sulla roccia. Sta all'altezza
      // piu' alta del terreno sotto di lei (campionato su una griglia), poco sopra, cosi' non la attraversa mai
      let top = R.position.y - 0.05; const sc = R.userData.sh.scale;
      for (let ix = -2; ix <= 2; ix++) for (let iz = -2; iz <= 2; iz++) {
        o.set(R.position.x + ix * sc.x / 5, 400, R.position.z + iz * sc.y / 5); rc.set(this.group.localToWorld(o.clone()), down);
        const h2 = rc.intersectObject(this.panoRoot, true).find(h => h.object.name === 'sfondo 3D');
        if (h2) top = Math.max(top, this.group.worldToLocal(h2.point.clone()).y);
      }
      R.userData.sh.position.set(R.position.x, top + 0.012, R.position.z); R.userData.sh.visible = false;   // (a quella distanza il foglio d'ombra si vedeva solo come una riga scura di taglio: niente ombra)
    }
  }
  // sabbia vicina: foto di sabbia rossa (colore = quello del terreno della foto), il bordo sfuma tra 5 e 9 m
  _sand() {
    const L = new THREE.TextureLoader();
    const tex = L.load('assets/sabbia_rossa_colore.jpg?v=20261010182023'); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 6); tex.anisotropy = 8;
    const a = document.createElement('canvas'); a.width = a.height = 256; const ga = a.getContext('2d');
    const gr = ga.createRadialGradient(128, 128, 128 * 5 / 9, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
    ga.fillStyle = gr; ga.fillRect(0, 0, 256, 256);
    const sand = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ map: tex, alphaMap: new THREE.CanvasTexture(a), transparent: true, depthWrite: true, toneMapped: false }));   // (scrive la profondita': lo scorpione sotto la sabbia non si vede)
    sand.rotation.x = -Math.PI / 2; sand.position.y = -0.005; sand.renderOrder = -5; this.group.add(sand);
    sand.visible = false;                                 // (ora la sabbia vicina e' la foto stessa, stesa piatta: niente cerchio)
    // sotto il ring: opaca e illuminata (riceve le ombre dei pugili)
    const nor = L.load('assets/sabbia_rossa_rilievo.jpg?v=20261010182023'); nor.wrapS = nor.wrapT = THREE.RepeatWrapping; nor.repeat.set(3, 3);
    const t2 = tex.clone(); t2.repeat.set(3, 3); t2.needsUpdate = true;
    const under = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48), new THREE.MeshStandardMaterial({ map: t2, normalMap: nor, roughness: 0.95 }));
    under.rotation.x = -Math.PI / 2; under.position.y = -0.003; under.receiveShadow = true; this.group.add(under);
    under.visible = false;
  }
  // il rilievo di sabbia attorno allo scorpione: si gonfia quando esce (o si risotterra), si apre in un cratere con l'orlo
  // e poi si spiana piano. Una griglia 28x28 che si deforma, ombreggiata a mano (la sabbia della foto non ha luci)
  _mound() {
    const geo = new THREE.PlaneGeometry(2.0, 2.0, 40, 40); geo.rotateX(-Math.PI / 2);
    this.mGeo = geo; this.mBase = geo.attributes.position.array.slice();
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
    const ac = document.createElement('canvas'); ac.width = ac.height = 64; const ag = ac.getContext('2d');
    const gr = ag.createRadialGradient(32, 32, 14, 32, 32, 31); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); ag.fillStyle = gr; ag.fillRect(0, 0, 64, 64);
    this.mound = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, alphaMap: new THREE.CanvasTexture(ac), transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
    this.mound.visible = false; this.mound.renderOrder = -4; this.mound.frustumCulled = false; this.group.add(this.mound);
    this.m = { x: 0, z: 0, A: 0, cd: 0, cr: 0, on: false, fade: 0 };
  }
  _setMound() {
    const m = this.m, P = this.mGeo.attributes.position, C = this.mGeo.attributes.color, B = this.mBase, n = P.count, sand = this.sandRGB || [0.62, 0.36, 0.22];
    const L = new THREE.Vector3(0.45, 0.8, 0.3).normalize(), nrm = new THREE.Vector3(), base = new THREE.Color().setRGB(sand[0], sand[1], sand[2], THREE.SRGBColorSpace);
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = B[i * 3], z = B[i * 3 + 2], d = Math.hypot(x, z), a = Math.atan2(z, x);
      const wob = 1 + 0.18 * Math.sin(a * 5 + this.t * 3) * Math.sin(a * 3 - this.t);                // il rilievo non e' liscio
      let h = m.A * Math.exp(-(d / 0.27) * (d / 0.27)) * wob;
      h += m.cr * Math.exp(-((d - 0.24) / 0.09) * ((d - 0.24) / 0.09)) * (0.85 + 0.3 * Math.sin(a * 7 + 1.3));
      h -= m.cd * Math.exp(-(d / 0.13) * (d / 0.13));
      P.setXYZ(i, x + m.x, h + 0.004, z + m.z);
    }
    // normali approssimate dalle differenze finite sulla griglia (29 x 29)
    const W = 41;
    for (let j = 0; j < W; j++) for (let k = 0; k < W; k++) {
      const i = j * W + k, il = j * W + Math.max(0, k - 1), ir = j * W + Math.min(W - 1, k + 1), iu = Math.max(0, j - 1) * W + k, id = Math.min(W - 1, j + 1) * W + k;
      const dx = P.getY(ir) - P.getY(il), dz = P.getY(id) - P.getY(iu), st = 2.0 / 40 * 2;
      nrm.set(-dx / st, 1, -dz / st).normalize();
      const sh = (0.1 + 0.9 * Math.max(0, nrm.dot(L))) / (0.1 + 0.9 * L.y);      // 1 sul piano (colore della sabbia); pendii all'ombra piu' scuri, al sole piu' chiari
      col.copy(base).multiplyScalar(Math.max(0.28, sh)); C.setXYZ(i, col.r, col.g, col.b);
    }
    P.needsUpdate = true; C.needsUpdate = true;
  }
  _updMound(dt) {
    const m = this.m, C = this.sc;
    if (C && C.phase === 'su') {
      const k = Math.min(1, C.t / 1.3), sm = q => { q = Math.min(1, Math.max(0, q)); return q * q * (3 - 2 * q); };
      m.x = C.x; m.z = C.z; m.on = true; m.fade = 1;
      m.A = 0.12 * Math.sin(Math.min(1, k / 0.4) * Math.PI / 2) * (1 - sm((k - 0.4) / 0.3)); m.cd = 0.08 * sm((k - 0.3) / 0.5); m.cr = 0.065 * sm((k - 0.35) / 0.5);
    } else if (C && C.phase === 'giu') {
      const sm = q => { q = Math.min(1, Math.max(0, q)); return q * q * (3 - 2 * q); };
      m.x = C.x; m.z = C.z; m.on = true; m.fade = 1;
      m.A = 0.15 * sm((C.t - 0.25) / 1.1); m.cd = 0.08 * (1 - sm((C.t - 0.2) / 0.9)); m.cr = 0.055 * (1 - sm((C.t - 0.5) / 0.7));
    } else if (m.on) {                                       // finito: il rilievo si spiana piano
      m.fade = Math.max(0, m.fade - dt / 9); const f = m.fade * m.fade;
      m.A *= Math.pow(0.5, dt / 3); m.cd *= Math.pow(0.5, dt / 3); m.cr *= Math.pow(0.5, dt / 3); m.k = f;
      if (m.fade <= 0) m.on = false;
    }
    this.mound.visible = m.on;
    if (m.on) { this.mound.material.opacity = C ? 1 : Math.min(1, m.fade * 3); this._setMound(); }
  }
  // scorpione: ogni tanto esce dalla sabbia (con uno spruzzo), cammina un po' attorno al ring e si risotterra.
  // Solo sulla sabbia 3D vicina (non nella foto). Lungo ~20 cm, corazza bruno-ambra lucida. Muso verso +Z.
  _scorpion() {
    const S = new THREE.Group(); S.visible = false;
    const shell = new THREE.MeshStandardMaterial({ color: 0x6b4318, roughness: 0.35, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a220b, roughness: 0.4 });
    const sting = new THREE.MeshStandardMaterial({ color: 0x1c1006, roughness: 0.3 });
    this.scMats = { shell, dark, sting };
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
    S.scale.setScalar(2.3);
    // sotto la sabbia non si vede (la sabbia 3D verso il bordo e' semitrasparente): taglio a filo del terreno
    this.clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    // dove il taglio a filo della sabbia apre il guscio si vedrebbe l'interno vuoto: le facce interne si colorano di sabbia
    const sandCap = m => { if (m.userData.sandCap) return; m.userData.sandCap = true; m.side = THREE.DoubleSide;
      m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>',
        '#include <dithering_fragment>\n if (!gl_FrontFacing) gl_FragColor = vec4(0.62, 0.36, 0.22, 1.0);'); }; m.needsUpdate = true; };
    S.traverse(o => { if (o.isMesh) { o.material.clippingPlanes = [this.clip]; sandCap(o.material); } });
    this.scorp = S; this.scBody = body; this.group.add(S);
    // spruzzi di sabbia
    const N = 520, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.sprayV = new Float32Array(N * 3);
    this.spray = new THREE.Points(geo, new THREE.PointsMaterial({ map: this._grain(), alphaTest: 0.3, color: 0xa57a58, size: 0.016, transparent: true, opacity: 0.9, depthWrite: false }));
    this.spray.visible = false; this.spray.frustumCulled = false; this.group.add(this.spray);
    this.nextSc = 3 + Math.random() * 4; this.sc = null;
    // nuvola di polvere (quando esce e quando si risotterra: copre lo scorpione che entra nella sabbia)
    const dc = document.createElement('canvas'); dc.width = dc.height = 128; const dg = dc.getContext('2d');
    let sd = 3; const rr = () => { sd = (sd * 16807) % 2147483647; return (sd - 1) / 2147483646; };
    for (let i = 0; i < 22; i++) {                           // una nuvola irregolare: tanti sbuffi sovrapposti, piu' densi al centro
      const ang = rr() * 6.28, rad = rr() * 34 * (0.4 + 0.6 * rr()), cx = 64 + Math.cos(ang) * rad, cy = 64 + Math.sin(ang) * rad, R = 16 + rr() * 22;
      const gr = dg.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, 'rgba(255,255,255,0.32)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      dg.fillStyle = gr; dg.fillRect(0, 0, 128, 128);
    }
    const dtex = new THREE.CanvasTexture(dc);
    this.dust = Array.from({ length: 110 }, () => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dtex, color: 0xa07a56, transparent: true, depthWrite: false, opacity: 0 }));
      sp.visible = false; this.group.add(sp); return { sp, life: 0, max: 1, v: new THREE.Vector3(), s0: 0.1, s1: 0.5, rot: 0 };
    });
  }
  _scorpion2() {                                           // il secondo scorpione: stesse parti, tutto suo (modello, rilievo, polvere)
    const o = Object.create(Desert.prototype); o.group = this.group; o.t = 0; o.sandRGB = this.sandRGB;
    o._scorpion(); o._mound(); o.nextSc = 9 + Math.random() * 8; this.sc2 = o;
  }
  _puff(p, n, sz = 1) {
    for (let k = 0; k < n; k++) {
      const D = this.dust.find(d => d.life <= 0) || this.dust.reduce((a, b) => (a.life < b.life ? a : b));
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.12 * sz;
      D.sp.position.set(p.x + Math.cos(a) * r, 0.04 + Math.random() * 0.08, p.z + Math.sin(a) * r);
      const out = (0.25 + Math.random() * 0.45) * sz;
      D.v.set(Math.cos(a) * out, 0.2 + Math.random() * 0.35, Math.sin(a) * out);
      D.max = D.life = 2.2 + Math.random() * 1.6; D.s0 = (0.28 + Math.random() * 0.2) * sz; D.s1 = (1.0 + Math.random() * 0.8) * sz;
      D.rot = (Math.random() - 0.5) * 1.2; D.sp.material.rotation = Math.random() * 6.28; D.sp.material.color.setHex(Math.random() < 0.5 ? 0xb89468 : 0xa5815a); D.sp.visible = true;
    }
  }
  _updDust(dt) {
    for (const D of this.dust) {
      if (D.life <= 0) continue;
      D.life -= dt; const k = 1 - D.life / D.max;
      D.sp.position.addScaledVector(D.v, dt); D.v.multiplyScalar(1 - dt * 0.9); D.v.y -= dt * 0.04;
      D.sp.scale.setScalar(D.s0 + (D.s1 - D.s0) * Math.sqrt(k)); D.sp.material.rotation += D.rot * dt;
      D.sp.material.opacity = 0.75 * Math.min(1, k * 6) * (1 - k) * (1 - k * 0.5);
      if (D.life <= 0) D.sp.visible = false;
    }
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
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.14, up = 0.5 + Math.random() * 1.0, h = 0.25 + Math.random() * 0.55;
      pos[i * 3] = p.x + Math.cos(a) * r; pos[i * 3 + 1] = 0.005; pos[i * 3 + 2] = p.z + Math.sin(a) * r;
      v[i * 3] = Math.cos(a) * h * n; v[i * 3 + 1] = up * n; v[i * 3 + 2] = Math.sin(a) * h * n;
    }
    this.spray.geometry.attributes.position.needsUpdate = true;
    this.spray.visible = true; this.sprayT = 0; this.spray.material.opacity = 0.7;
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
    this.spray.material.opacity = Math.max(0, 0.7 - Math.max(0, this.sprayT - 0.4) * 1.1);
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
    this._updSpray(dt); this._updDust(dt);
    this._updScorp(dt, cam, this.sc2);
    if (this.sc2) { this.sc2.sandRGB = this.sandRGB; this.sc2.t = this.t; this.sc2._updSpray(dt); this.sc2._updDust(dt); this.sc2._updScorp(dt, cam, this); }   // il secondo scorpione (a volte ce ne sono due)
  }
  // uno scorpione: attesa, uscita dalla sabbia, passeggiata, ritorno sotto. other = l'altro scorpione in scena (si tengono a distanza)
  _updScorp(dt, cam, other = null) {
    const S = this.scorp; this._updMound(dt);
    this.clip.constant = -this.group.getWorldPosition(_gw).y - 0.001;
    if (!this.sc) {
      if ((this.nextSc -= dt) > 0) return;
      // dove: solo sulla sabbia 3D piena attorno al ring (oltre i 4,5 m la sabbia sfuma nella foto: li' no)
      let x, z, tries = 0;
      do {
        const far = Math.random() < 0.35, a = Math.PI * 1.5 + (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.75), r = far ? 4.6 + Math.random() * 1.8 : 3.3 + Math.random() * 1.2;
        x = Math.cos(a) * r; z = Math.sin(a) * r;
      } while ((Math.max(Math.abs(x), Math.abs(z)) < SC_RING || (other && other.sc && Math.hypot(x - other.sc.x, z - other.sc.z) < 1.3)) && ++tries < 30);   // ai lati davanti a te (a 30-75 gradi dalla direzione dell'avversario, che davanti lo coprirebbe), oltre il bordo del ring
      this.sc = { phase: 'su', t: 0, x, z, yaw: Math.random() * Math.PI * 2, turn: 0, walk: 12 + Math.random() * 9 };
      const black = Math.random() < 0.5, M = this.scMats;                    // uno ambra o uno nero, a caso
      M.shell.color.setHex(black ? 0x17130f : 0x6b4318); M.shell.roughness = black ? 0.22 : 0.35; M.shell.metalness = black ? 0.25 : 0.1;
      M.dark.color.setHex(black ? 0x0a0908 : 0x3a220b); M.sting.color.setHex(black ? 0x050403 : 0x1c1006);
      S.position.set(x, -0.08, z); S.rotation.set(-0.5, this.sc.yaw, 0); S.visible = true;
      this._puff(S.position, 4);
      if (cam) sfx.sandRustle(this.group.localToWorld(S.position.clone()), cam, 1.6, 0.05);
      return;
    }
    const C = this.sc; C.t += dt;
    let speed = 0;
    if (C.phase === 'su') {                                  // esce dalla sabbia, muso in su
      const k = Math.min(1, C.t / 1.3), e = Math.min(1, Math.max(0, (k - 0.3) / 0.4)), ee = e * e * (3 - 2 * e);   // prima la sabbia si gonfia, poi lui sale
      S.position.y = -0.08 + 0.08 * ee; S.rotation.set(-0.5 * (1 - ee), C.yaw, 0);
      if ((C.pf = (C.pf || 0) - dt) <= 0 && k > 0.1 && k < 0.8) { C.pf = 0.09; this._puff(S.position, 2, 1.1); this._burst(S.position, 0.35); }
      if (k >= 1) { C.phase = 'cammina'; C.t = 0; }
    } else if (C.phase === 'cammina') {                    // cammina a scatti, curvando
      const go = Math.sin(C.t * 1.7) > -0.35;              // brevi soste
      speed = go ? 0.15 : 0;
      if (Math.random() < dt * 0.8) C.turn = (Math.random() - 0.5) * 1.6;
      C.yaw += C.turn * dt * (go ? 1 : 0.3);
      // resta sulla sabbia 3D e fuori dal ring
      const r = Math.hypot(C.x, C.z);
      if (r > SC_RMAX) C.yaw = Math.atan2(-C.x, -C.z);                       // torna verso il ring (resta sulla sabbia piena)
      else if (Math.max(Math.abs(C.x), Math.abs(C.z)) < SC_RING) C.yaw = Math.atan2(C.x, C.z);   // non sale sul ring
      C.x += Math.sin(C.yaw) * speed * dt; C.z += Math.cos(C.yaw) * speed * dt;
      S.position.set(C.x, 0, C.z); S.rotation.set(0, C.yaw, 0);
      if (C.t > C.walk && go) { C.phase = 'giu'; C.t = 0; C.pf = 0; this._puff(S.position, 6); if (cam) sfx.sandRustle(this.group.localToWorld(S.position.clone()), cam, 2.7, 0.06); }
      else if (go && cam && (C.sk = (C.sk || 0) - dt) <= 0) { C.sk = 0.9 + Math.random() * 1.2; sfx.sandRustle(this.group.localToWorld(S.position.clone()), cam, 0.35, 0.025); }   // ogni tanto un lieve raspare mentre cammina
    } else {                                               // si risotterra: gratta sul posto alzando tanta polvere, poi ci sparisce dentro
      speed = 0.12;                                         // (le zampe grattano veloci)
      if ((C.pf -= dt) <= 0) { C.pf = 0.045; this._puff(S.position, 3, 1.5); if (C.t < 1.9) this._burst(S.position, 0.4); }
      const k = Math.min(1, Math.max(0, (C.t - 0.8) / 0.8));             // scende solo quando il polverone lo copre
      S.position.y = -0.11 * k; S.rotation.set(0, C.yaw + Math.sin(C.t * 30) * 0.08, 0);
      if (C.t > 2.6) { S.visible = false; this.sc = null; this.nextSc = 3 + Math.random() * 6; }
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
  // ombra sotto il ring (la sabbia della foto non riceve ombre: senza, il ring sembrava sospeso)
  setRing(size) {
    if (!this.ringShadow) { this.ringShadow = contactShadow(1, 1, 0.5, 0.66); this.ringShadow.position.y = 0.008; this.group.add(this.ringShadow); }
    this.ringShadow.scale.set((size + 0.3) * 1.45, (size + 0.3) * 1.45, 1);
  }
}
