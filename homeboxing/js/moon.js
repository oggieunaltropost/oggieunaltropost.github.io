// Stage "Sulla Luna": il ring su una piana lunare. Sfondo = foto a 360 gradi fatta in Blender (blender/create_moon.py:
// regolite e crateri, montagne all'orizzonte, cielo nero pieno di stelle con la Via Lattea, la Terra, il Sole basso).
// Davanti, in 3D:
//  - la regolite vicina con i suoi crateretti (colore preso pixel per pixel dalla foto al bordo: niente giunta)
//    e una fila di impronte di scarponi che passa accanto al ring; un modulo lunare posato un po' piu' in la'
//  - ogni tanto una cometa che compare, attraversa piano il cielo con la coda (sempre dalla parte opposta al Sole)
//    e svanisce
//  - ogni tanto un asteroide che si schianta lontano: scia che scende, lampo, polvere che vola ad archi lenti
//    (poca gravita' e niente aria: traiettorie pulite) e ricade piano, anello di polvere; resta il cratere
// Sistema di riferimento: quello del ring (origine al centro del tappeto, y in alto).
import * as THREE from 'three';
import { contactShadow } from './contact_shadow.js?v=20261010174937';
import { panoDepth } from './pano_depth.js?v=20261010174937';
import { Astronaut } from './astronaut.js?v=20261010174937';
import * as sfx from './sfx.js?v=20261010174937';

const EYE = 1.65, R_FADE0 = 10, R_FADE1 = 16, G = 1.62;          // gravita' lunare
const SUN = new THREE.Vector3(-0.4532, 0.4226, 0.7849).normalize();  // dalla foto (Blender (0.7849,-0.4532,0.4226))
const EARTH = new THREE.Vector3(0.7686, 0.5299, -0.3584).normalize();
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const ss = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const glowTex = (() => { let t = null; return () => {
  if (t) return t;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 1, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (t = new THREE.CanvasTexture(c));
}; })();

export class Moon {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'luna';
    this.sunDir = SUN.clone(); this.earthDir = EARTH.clone();
    this.t = 0;
    this._craters = [];                                             // crateretti vicini (x, z, raggio)
    for (let k = 0; k < 0; k++) {                                     // (nessuno: nella foto li' non ci sono, si vedeva lo stacco)
      const a = Math.random() * Math.PI * 2, d = 4.5 + Math.random() * 11, R = 0.3 + Math.random() ** 2 * 1.6;
      this._craters.push([Math.cos(a) * d, Math.sin(a) * d, R]);
    }
    this._ground(); this._sky(); this._lander(); this._comet(); this._impacts();
    this.astro = new Astronaut(this.group);                     // l'astronauta che gira attorno al ring a balzi   // (prima il terreno: la sua grana serve allo sfondo)      // (tolte le impronte: sembravano strane)
    this.nextComet = 8 + Math.random() * 10; this.nextImpact = 6 + Math.random() * 8;
  }
  // ---------------------------------------------------------------- foto a 360 gradi
  _sky() {
    const img = new Image();
    const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    img.onload = () => { tex.needsUpdate = true; this.skyLoaded = true; this._tintGround(img); if (this.onSkyLoad) this.onSkyLoad(); };
    img.src = 'assets/luna_panorama.jpg?v=20261010174937';
    this.skyTex = tex;
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uPano: { value: tex } },
      vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uPano; varying vec3 vD;
        void main(){ vec3 d = normalize(vD);
          vec2 uv = vec2(fract(atan(d.z, d.x) * 0.15915494 + 0.5), asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          gl_FragColor = vec4(texture2D(uPano, uv).rgb, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 64, 32), m);
    sky.renderOrder = -10; sky.frustumCulled = false; this.group.add(sky);
    this.group.add(panoDepth('assets/luna_profondita.png', tex, { eye: EYE, flat: 14, ratio: 2.6, grain: this.grainTex, grainMean: 0.19 }));   // sfondo in 3D vero
  }
  // ---------------------------------------------------------------- regolite vicina, con i crateretti
  _h(x, z) {
    let h = 0;
    for (const [cx, cz, R] of this._craters) {
      const d = Math.hypot(x - cx, z - cz) / R;
      if (d > 1.7) continue;
      if (d < 1) h -= 0.22 * R * (1 - d * d);
      h += 0.06 * R * Math.exp(-(((d - 1) / 0.25) ** 2));
    }
    const r = Math.hypot(x, z);
    return h * ss(3.2, 4.5, r);                                        // piatta come la foto (li' il terreno e' piano)
  }
  _ground() {
    const RS = 70, AS = 200, geo = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
    for (let i = 0; i <= RS; i++) for (let j = 0; j <= AS; j++) {
      const a = j / AS * Math.PI * 2, r = i === 0 ? 0 : 0.6 + Math.pow(i / RS, 1.3) * (R_FADE1 - 0.6), x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, this._h(x, z) - 0.004, z); uv.push(x / 1.6, z / 1.6);
    }
    for (let i = 0; i < RS; i++) for (let j = 0; j < AS; j++) { const a = i * (AS + 1) + j, b = a + AS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    geo.computeVertexNormals();
    const n = geo.attributes.position.count, col = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 0.2; col[i * 4 + 3] = 1; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    this.groundGeo = geo; this.baseY = Float32Array.from(geo.attributes.position.array);
    // grana della regolite: polvere fine con sassolini (512 px, si ripete ogni 1,6 m)
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    g.fillStyle = '#7a7672'; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 9000; k++) { const v = 90 + Math.random() * 70 | 0; g.fillStyle = `rgba(${v},${v - 3},${v - 6},0.35)`; g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    for (let k = 0; k < 260; k++) {                                // sassolini con la loro ombra
      const x = Math.random() * S, y = Math.random() * S, r = 1 + Math.random() ** 3 * 5;
      g.fillStyle = 'rgba(20,20,22,0.5)'; g.beginPath(); g.ellipse(x + r * 0.6, y + r * 0.4, r, r * 0.7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgb(${150 + Math.random() * 50 | 0},${148 + Math.random() * 45 | 0},${140 + Math.random() * 40 | 0})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    this.grainTex = tex;
    // senza luci (come la foto): il colore e' quello del panorama, cosi' al bordo non si vede nessuno stacco
    const mat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, toneMapped: false });
    const gm = new THREE.Mesh(geo, mat); gm.renderOrder = -5; this.group.add(gm);
    gm.visible = false;                                   // (ora il terreno vicino e' la foto stessa, stesa piatta: niente cerchio diverso)
  }
  // il colore della foto ai bordi (la grana vicina resta), e l'alpha che sfuma nella foto
  _tintGround(img) {
    const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H); const px = g.getImageData(0, 0, W, H).data;
    const pos = this.groundGeo.attributes.position, col = this.groundGeo.attributes.color;
    let sum = [0, 0, 0], ns = 0;
    const sample = (x, z) => {
      _v.set(x, -EYE, z).normalize();
      const u = ((Math.atan2(_v.z, _v.x) / (Math.PI * 2) + 0.5) % 1 + 1) % 1, v = Math.asin(_v.y) / Math.PI + 0.5;
      const pi = (Math.min(H - 1, Math.floor((1 - v) * H)) * W + Math.min(W - 1, Math.floor(u * W))) * 4;
      return [0, 1, 2].map(k => Math.pow(px[pi + k] / 255, 2.2));
    };
    for (let a = 0; a < 64; a++) { const s = sample(Math.cos(a) * 8, Math.sin(a) * 8); for (let k = 0; k < 3; k++) sum[k] += s[k]; ns++; }
    const avg = sum.map(v => v / ns);
    const tex = 0.19;                                                // (media della grana #7a7672, colore lineare)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), s = sample(x, z);
      // vicino: luce media della foto (cosi' il terreno ha la stessa luminosita'); verso il bordo: il pixel esatto
      const far = ss(2, 6, r), cc = [0, 1, 2].map(k => (avg[k] * (1 - far) + s[k] * far) / tex);   // (subito il pixel della foto)
      col.setXYZW(i, cc[0], cc[1], cc[2], 1 - ss(R_FADE0, R_FADE1, r));
    }
    col.needsUpdate = true;
  }
  // altezza degli occhi: il bordo della regolite combacia con la foto (fatta da 1,65 m)
  setEye(eye) {
    return;                                                          // (non serve piu': c'e' il terreno lontano vero)
    if (!(eye > 1.0 && eye < 2.3) || (this.eyeApplied != null && Math.abs(eye - this.eyeApplied) < 0.03)) return;
    this.eyeApplied = eye;
    const off = eye - EYE, p = this.groundGeo.attributes.position.array, b = this.baseY;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = b[i + 1] + off * ss(4.5, R_FADE1, Math.hypot(b[i], b[i + 2]));
    this.groundGeo.attributes.position.needsUpdate = true; this.groundGeo.computeBoundingSphere();
  }
  // ---------------------------------------------------------------- impronte di scarponi: una passeggiata accanto al ring
  _prints() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, 64, 128);
    g.fillStyle = 'rgba(25,24,24,0.75)'; g.beginPath(); g.roundRect(10, 8, 44, 112, 20); g.fill();
    g.strokeStyle = 'rgba(150,146,140,0.6)'; g.lineWidth = 3;
    for (let y = 20; y < 116; y += 9) { g.beginPath(); g.moveTo(14, y); g.lineTo(50, y); g.stroke(); }   // la suola a righe
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const geo = new THREE.PlaneGeometry(0.13, 0.3); geo.rotateX(-Math.PI / 2);
    const N = 34, im = new THREE.InstancedMesh(geo, mat, N), m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < N; i++) {
      const t = i / N, a = -2.4 + t * 2.0, R = 5.2 + Math.sin(t * 5) * 0.6;   // arco attorno al ring, a 5 m
      const x = Math.cos(a) * R, z = Math.sin(a) * R, side = i % 2 ? 1 : -1;
      const yaw = Math.atan2(-Math.sin(a), Math.cos(a)) + (Math.random() - 0.5) * 0.25;
      const ox = Math.cos(yaw) * 0.12 * side, oz = -Math.sin(yaw) * 0.12 * side;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      m.compose(new THREE.Vector3(x + ox, this._h(x + ox, z + oz) + 0.004, z + oz), q, new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, m);
    }
    im.renderOrder = -4; this.group.add(im);
  }
  // ---------------------------------------------------------------- modulo lunare (la parte che resta: base dorata, 4 zampe)
  _lander() {
    const L = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9962c, metalness: 0.9, roughness: 0.35 });
    const foil = new THREE.MeshStandardMaterial({ color: 0x8f8a7e, metalness: 0.7, roughness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2a2c, metalness: 0.4, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1.7, 8), gold); body.position.y = 1.75; L.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.0, 0.25, 8), foil); top.position.y = 2.72; L.add(top);
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 0.8, 16, 1, true), dark); noz.position.y = 0.65; L.add(noz);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4, ox = Math.cos(a), oz = Math.sin(a);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), foil);
      leg.position.set(ox * 2.6, 1.05, oz * 2.6); leg.lookAt(ox * 1.6, 2.1, oz * 1.6); leg.rotateX(Math.PI / 2); L.add(leg);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.12, 16), foil); pad.position.set(ox * 3.2, 0.06, oz * 3.2); L.add(pad);
    }
    const ladder = new THREE.Group(); ladder.position.set(2.45, 0.9, 0); ladder.rotation.z = 0.35; L.add(ladder);
    for (const s of [-0.25, 0.25]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), foil); r.position.z = s; ladder.add(r); }
    for (let k = 0; k < 6; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), foil); r.position.y = -0.8 + k * 0.32; ladder.add(r); }
    L.position.set(-6.8, -0.04, -7.4); L.rotation.y = 0.6; L.scale.setScalar(0.9);   // (dentro la regolite 3D, zampe appena affondate nella polvere)
    // ombre di contatto: sotto il corpo e sotto ogni piede (senza luci il terreno non riceve ombre vere)
    const sh = contactShadow(4.4, 4.4, 0.55); sh.position.set(-6.8, 0.012, -7.4); this.group.add(sh);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4 + 0.6, ps = contactShadow(1.0, 1.0, 0.7);
      ps.position.set(-6.8 + Math.cos(a) * 2.88, 0.013, -7.4 - Math.sin(a) * 2.88); this.group.add(ps);
    }
    L.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    this.group.add(L);
  }
  // ---------------------------------------------------------------- cometa
  _comet() {
    const C = new THREE.Group(); C.visible = false;
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xdff4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
    head.scale.setScalar(16); C.add(head);
    // coda: due veli (gas azzurro diritto, polvere bianca piu' larga e un po' curva), sfumati in punta
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
    const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gx; g.fillRect(0, 0, 64, 256); g.globalCompositeOperation = 'destination-in';
    const gy = g.createLinearGradient(0, 0, 0, 256); gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gy; g.fillRect(0, 0, 64, 256);
    const tt = new THREE.CanvasTexture(c);
    this.tails = [[0x9fd8ff, 12, 230, 0], [0xfff3e0, 28, 180, 0.12]].map(([col, w, len, bend]) => {
      const geo = new THREE.PlaneGeometry(w, len, 1, 8); geo.translate(0, -len / 2, 0);
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (0.25 + 0.75 * -y / len) + bend * y * y / len); }
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tt, color: col, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false }));
      C.add(m); return m;
    });
    this.comet = C; this.cometF = null; this.group.add(C);
  }
  _newComet() {
    // arco nel cielo a 700 m: da un punto a un altro, alti 20-60 gradi, in 14-24 s
    const D = 700, a0 = Math.random() * Math.PI * 2, a1 = a0 + (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.35);
    const e0 = 0.35 + Math.random() * 0.5, e1 = e0 + (Math.random() - 0.5) * 0.4;
    const dir = (a, e) => new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(D);
    this.cometF = { p0: dir(a0, e0), p1: dir(a1, e1), t: 0, dur: 14 + Math.random() * 10 };
    this.comet.visible = true;
  }
  _updComet(dt, camL) {
    if (!this.cometF) { if ((this.nextComet -= dt) <= 0) this._newComet(); return; }
    const F = this.cometF; F.t += dt;
    const k = F.t / F.dur;
    if (k >= 1) { this.cometF = null; this.comet.visible = false; this.nextComet = 25 + Math.random() * 35; return; }
    const fade = ss(0, 0.2, k) * (1 - ss(0.75, 1, k));
    this.comet.position.lerpVectors(F.p0, F.p1, k);
    this.comet.children[0].material.opacity = fade;
    // coda dalla parte opposta al Sole: il velo punta lungo -SUN e gira attorno a quell'asse verso di te
    const away = _v.copy(SUN).negate();
    for (const t of this.tails) {
      t.material.opacity = 0.6 * fade;
      t.quaternion.setFromUnitVectors(_w.set(0, -1, 0), away);
      if (camL) {                                                      // (il velo si gira verso chi guarda)
        const toCam = _w.copy(camL).sub(this.comet.position).normalize();
        const n0 = new THREE.Vector3(0, 0, 1).applyQuaternion(t.quaternion);
        const proj = toCam.clone().addScaledVector(away, -toCam.dot(away)).normalize();
        const ang = Math.atan2(n0.clone().cross(proj).dot(away), n0.dot(proj));
        t.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(away, ang));
      }
    }
  }
  // ---------------------------------------------------------------- asteroidi che si schiantano lontano
  _impacts() {
    const N = 900, geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aLife', new THREE.BufferAttribute(new Float32Array(N), 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(N), 1));
    this.dust = { geo, v: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N), N, i: 0 };
    this.dustMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uTex: { value: glowTex() }, uH: { value: 900 } },
      vertexShader: `attribute float aLife; attribute float aSize; uniform float uH; varying float vL;
        void main(){ vL = aLife; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aLife > 0.0 ? aSize * uH / -mv.z : 0.0; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uTex; varying float vL;
        void main(){ float a = texture2D(uTex, gl_PointCoord).a * clamp(vL, 0.0, 1.0); gl_FragColor = vec4(vec3(0.78, 0.76, 0.72), a * 0.85); }`,
    });
    this.dustPts = new THREE.Points(geo, this.dustMat); this.dustPts.frustumCulled = false; this.group.add(this.dustPts);
    // scia dell'asteroide che arriva, lampo, anello di polvere
    const add = (col, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); sp.scale.setScalar(s); sp.visible = false; this.group.add(sp); return sp; };
    this.rock = add(0xffe6b0, 3); this.flash = add(0xfff4d8, 40);
    this.trail = Array.from({ length: 10 }, () => add(0xffb070, 2));
    const rc = document.createElement('canvas'); rc.width = rc.height = 256; const g = rc.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128); gr.addColorStop(0, 'rgba(200,195,185,0)'); gr.addColorStop(0.7, 'rgba(200,195,185,0.7)'); gr.addColorStop(1, 'rgba(200,195,185,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(rc), transparent: true, depthWrite: false, opacity: 0 }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; this.group.add(this.ring);
    // il cratere che resta: conca scura con il bordo chiaro e raggi di materiale espulso
    const cc = document.createElement('canvas'); cc.width = cc.height = 256; const h = cc.getContext('2d');
    for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2, l = 70 + Math.random() * 55; h.strokeStyle = 'rgba(215,210,200,0.25)'; h.lineWidth = 2 + Math.random() * 4; h.beginPath(); h.moveTo(128 + Math.cos(a) * 50, 128 + Math.sin(a) * 50); h.lineTo(128 + Math.cos(a) * l, 128 + Math.sin(a) * l); h.stroke(); }
    const rim = h.createRadialGradient(128, 128, 20, 128, 128, 62); rim.addColorStop(0, 'rgba(15,15,16,0.95)'); rim.addColorStop(0.7, 'rgba(40,38,36,0.85)'); rim.addColorStop(0.86, 'rgba(225,220,210,0.8)'); rim.addColorStop(1, 'rgba(225,220,210,0)');
    h.fillStyle = rim; h.beginPath(); h.arc(128, 128, 62, 0, Math.PI * 2); h.fill();
    this.craterTex = new THREE.CanvasTexture(cc); this.craters = [];
    this.imp = null;
  }
  _newImpact() {
    const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 190;
    const P = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
    const from = P.clone().add(new THREE.Vector3((Math.random() - 0.5) * 120, 220 + Math.random() * 120, (Math.random() - 0.5) * 120));
    this.imp = { P, from, t: 0, fall: 0.9 + Math.random() * 0.5, size: 0.6 + Math.random() * 0.8, hit: false };
    this.rock.visible = true;
  }
  _updImpact(dt, cam) {
    const I = this.imp;
    if (!I) { if ((this.nextImpact -= dt) <= 0) this._newImpact(); }
    else {
      I.t += dt;
      if (!I.hit) {
        const k = Math.min(1, I.t / I.fall);
        this.rock.position.lerpVectors(I.from, I.P, k * k);
        this.trail.forEach((s, i) => { const kk = Math.max(0, k - i * 0.025); s.visible = true; s.position.lerpVectors(I.from, I.P, kk * kk); s.material.opacity = (1 - i / 10) * 0.8; s.scale.setScalar(2.5 * (1 - i / 12)); });
        if (k >= 1) {                                             // schianto
          I.hit = true; I.t = 0; this.rock.visible = false; this.trail.forEach(s => s.visible = false);
          this.flash.visible = true; this.flash.position.copy(I.P).setY(3); this.flash.material.opacity = 1;
          this.ring.visible = true; this.ring.position.copy(I.P).setY(0.3);
          const D = this.dust;
          for (let n = 0; n < 320; n++) {                         // polvere ad archi: tanti lenti, qualcuno veloce
            const i = D.i; D.i = (D.i + 1) % D.N;
            const az = Math.random() * Math.PI * 2, el = 0.3 + Math.random() * 0.9, sp = (3 + Math.random() ** 2 * 11) * I.size;   // (archi bassi e lenti: al massimo qualche decina di metri)
            D.geo.attributes.position.setXYZ(i, I.P.x, 0.5, I.P.z);
            D.v[i * 3] = Math.cos(az) * Math.cos(el) * sp; D.v[i * 3 + 1] = Math.sin(el) * sp; D.v[i * 3 + 2] = Math.sin(az) * Math.cos(el) * sp;
            D.max[i] = D.life[i] = 5 + Math.random() * 6; D.geo.attributes.aSize.setX(i, (0.35 + Math.random() * 0.9) * I.size);
          }
          if (cam) sfx.eruption(this.group.localToWorld(I.P.clone()), cam, 0.35);   // (sulla Luna non c'e' aria: solo un tonfo sordo)
          const cr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.craterTex, transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -1 }));
          cr.rotation.x = -Math.PI / 2; cr.rotation.z = Math.random() * 6.28; cr.position.copy(I.P).setY(0.05); cr.scale.setScalar(10 + 14 * I.size); cr.renderOrder = -3;
          this.group.add(cr); this.craters.push(cr);
          if (this.craters.length > 7) { const old = this.craters.shift(); this.group.remove(old); old.material.dispose(); old.geometry.dispose(); }
        }
      } else {
        this.flash.material.opacity = Math.max(0, 1 - I.t / 0.6); this.flash.scale.setScalar(40 + I.t * 60);
        const rk = Math.min(1, I.t / 5); this.ring.scale.setScalar(5 + rk * 70 * I.size); this.ring.material.opacity = 0.7 * (1 - rk);
        const cr = this.craters[this.craters.length - 1]; if (cr) cr.material.opacity = Math.min(1, I.t / 3);
        if (I.t > 6) { this.flash.visible = false; this.ring.visible = false; this.imp = null; this.nextImpact = 18 + Math.random() * 22; }
      }
    }
    // polvere: balistica lunare (nessuna resistenza dell'aria)
    const D = this.dust, p = D.geo.attributes.position, L = D.geo.attributes.aLife;
    for (let i = 0; i < D.N; i++) {
      if (D.life[i] <= 0) { if (L.array[i] !== 0) L.array[i] = 0; continue; }
      D.life[i] -= dt; D.v[i * 3 + 1] -= G * dt;
      let y = p.getY(i) + D.v[i * 3 + 1] * dt;
      if (y < 0.2) { y = 0.2; D.v[i * 3] *= 0.3; D.v[i * 3 + 2] *= 0.3; D.v[i * 3 + 1] = 0; D.life[i] = Math.min(D.life[i], 0.8); }
      p.setXYZ(i, p.getX(i) + D.v[i * 3] * dt, y, p.getZ(i) + D.v[i * 3 + 2] * dt);
      L.array[i] = Math.min(1, D.life[i] / 1.2) * Math.min(1, (D.max[i] - D.life[i]) * 4);
    }
    p.needsUpdate = true; L.needsUpdate = true; D.geo.attributes.aSize.needsUpdate = true;
  }
  // ombra sotto il ring (sulla regolite, che non riceve ombre)
  setRing(size) {
    if (!this.ringShadow) { this.ringShadow = contactShadow(1, 1, 0.55, 0.66); this.ringShadow.position.y = 0.01; this.group.add(this.ringShadow); }
    this.ringShadow.scale.set((size + 0.3) * 1.45, (size + 0.3) * 1.45, 1);
  }
  setDrawHeight(h) { this.dustMat.uniforms.uH.value = h * 0.5; }
  // ---------------------------------------------------------------- un fotogramma
  update(dt, cam) {
    this.t += dt;
    const camL = cam ? this.group.worldToLocal(cam.getWorldPosition(new THREE.Vector3())) : null;
    this._updComet(dt, camL);
    this._updImpact(dt, cam);
    this.astro.update(Math.min(dt, 0.05), cam);
  }
}
