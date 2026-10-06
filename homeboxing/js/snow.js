// Stage "Nella neve": il ring in una valle di montagna d'inverno. Sfondo = foto a 360 gradi fatta in Blender
// (blender/create_snow.py: montagne innevate, boschi di abeti, cielo coperto). Davanti, in 3D:
//  - la neve vicina (colorata pixel per pixel come la foto nel punto in cui finisce, cosi' non si vede la giunta),
//    con qualche duna morbida;
//  - i fiocchi che cadono ondeggiando nel vento, si posano (anche sul tappeto del ring) e si sciolgono in pochi
//    secondi: non si accumula niente;
//  - il lupo (blender/create_wolf.py) con il pelo a gusci: gira attorno al ring a passo lento, con le zampe che
//    poggiano davvero nella neve (IK) e lasciano le impronte, che pian piano si riempiono e spariscono. Ogni tanto
//    si ferma, si gira verso il ring, si siede sulle zampe posteriori e guarda il combattimento; a volte ulula;
//    poi si rialza e riprende a girare a caso.
//  - vento freddo, passi nella neve e ululato con l'audio spaziale.
import * as THREE from 'three';
import { Bear } from './bear.js?v=20261006224408';
import { panoDepth } from './pano_depth.js?v=20261006224408';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as sfx from './sfx.js?v=20261006224408';

const EYE = 1.65;                     // altezza della camera della foto
const R_FADE0 = 11, R_FADE1 = 17;     // la neve 3D sfuma nella foto tra questi raggi
const W_RMIN = 4.3, W_RMAX = 8.5;     // il lupo gira tra questi raggi (fuori dal ring, sulla neve 3D)
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
const ss = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ang = (z, y) => Math.atan2(z, y);                     // angolo nel piano sagittale (ruotare attorno a +X lo aumenta)
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// dune morbide (stessa formula nello shader dei fiocchi): piatto sotto e attorno al ring
export function snowH(x, z) {
  return 0;                                              // (pavimento piatto: la neve vicina e' la foto)
  const r = Math.hypot(x, z);
  return ss(3.0, 5.0, r) * (0.035 * Math.sin(0.9 * x + 0.4 * z) + 0.025 * Math.sin(1.7 * z - 0.6 * x + 1.3) + 0.012 * Math.sin(3.1 * x + 2.2 * z));
}
const SNOWH_GLSL = `float snowH(vec2 p){ return 0.0; }`;

// scheletro del lupo a riposo (coordinate del gioco: muso verso +Z), come in create_wolf.py
const XF = 0.105, XH = 0.11;
const J = {
  front: [[0.70, 0.30], [0.42, 0.27], [0.11, 0.30], [0.02, 0.37]],      // spalla, gomito, polso, punta (y, z)
  hind: [[0.70, -0.33], [0.45, -0.21], [0.19, -0.40], [0.02, -0.34]],    // anca, ginocchio, garretto, punta
};

export class Snow {
  constructor(ringSize = 3.2) {
    this.group = new THREE.Group(); this.group.name = 'neve';
    this.ringHalf = (ringSize + 0.5) / 2;
    this.sunDir = new THREE.Vector3(-0.45, 0.55, -0.7).normalize();     // sole velato basso
    this.t = 0;
    this._sky(); this._ground(); this._flakes(); this._prints(); this._wolf();
    this.bear = new Bear(this.group, (p, yaw, side) => this._print(p, yaw, side, 2.6));                          // l'orso polare che passeggia piu' in la'
  }
  // ---------------------------------------------------------------- foto a 360 gradi
  _sky() {
    const img = new Image();
    const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    img.onload = () => { tex.needsUpdate = true; this.skyLoaded = true; this._tintGround(img); if (this.onSkyLoad) this.onSkyLoad(); };
    img.src = 'assets/neve_panorama.jpg?v=20261006224408';
    this.skyTex = tex;
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uPano: { value: tex } },
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
    this.group.add(panoDepth('assets/neve_profondita.png', tex, { eye: EYE, flat: 14 }));   // sfondo in 3D vero
  }
  // ---------------------------------------------------------------- neve vicina
  _ground() {
    const RS = 36, AS = 96, geo = new THREE.BufferGeometry(), pos = [], uv = [], idx = [];
    const radii = []; for (let i = 0; i <= RS; i++) radii.push(i === 0 ? 0 : 0.6 + Math.pow(i / RS, 1.6) * (R_FADE1 - 0.6));
    for (let i = 0; i <= RS; i++) for (let j = 0; j <= AS; j++) {
      const a = j / AS * Math.PI * 2, r = radii[i], x = Math.cos(a) * r, z = Math.sin(a) * r;
      pos.push(x, r < 2.7 ? -0.004 : snowH(x, z) - 0.004, z); uv.push(x / 2.5, z / 2.5);
    }
    for (let i = 0; i < RS; i++) for (let j = 0; j < AS; j++) {
      const a = i * (AS + 1) + j, b = a + AS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const n = geo.attributes.position.count, col = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 0.9; col[i * 4 + 3] = 1; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    this.groundGeo = geo;
    const mat = new THREE.MeshBasicMaterial({ map: this._snowTex(), vertexColors: true, transparent: true, depthWrite: true, toneMapped: false });
    mat.vertexAlphas = true;
    const g = new THREE.Mesh(geo, mat); g.renderOrder = -5; this.group.add(g);
    g.visible = false;                                    // (ora la neve vicina e' la foto stessa, stesa piatta: niente cerchio diverso)
  }
  // grana della neve: quasi bianca, ondine del vento e qualche scintilla (media ~1: il colore lo da' la foto)
  _snowTex() {
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    const im = g.createImageData(S, S), d = im.data;
    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S * Math.PI * 2, v = y / S * Math.PI * 2;
      let k = 1 + 0.025 * Math.sin(u * 3 + Math.sin(v * 2) * 1.5) + 0.02 * Math.sin(v * 5 + Math.sin(u * 4)) + (hash(x, y) - 0.5) * 0.05;
      if (hash(x + 7, y + 3) > 0.9985) k = 1.12;                 // scintilla
      const val = Math.min(255, k * 236);
      d[(y * S + x) * 4] = val; d[(y * S + x) * 4 + 1] = val; d[(y * S + x) * 4 + 2] = Math.min(255, val * 1.01); d[(y * S + x) * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  // colore di ogni vertice = il pixel della foto che si vede in quella direzione dall'altezza degli occhi (la neve 3D
  // continua la foto senza giunta); un filo di luce sulle dune; trasparenza verso il bordo
  _tintGround(img) {
    const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H); const px = g.getImageData(0, 0, W, H).data;
    const pos = this.groundGeo.attributes.position, nor = this.groundGeo.attributes.normal, col = this.groundGeo.attributes.color;
    const L = new THREE.Vector3(-0.45, 0.6, -0.65).normalize();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z);
      _v.set(x, y - EYE, z).normalize();
      const u = ((Math.atan2(_v.z, _v.x) / (Math.PI * 2) + 0.5) % 1 + 1) % 1, v = Math.asin(_v.y) / Math.PI + 0.5;
      const pi = (Math.min(H - 1, Math.floor((1 - v) * H)) * W + Math.min(W - 1, Math.floor(u * W))) * 4;
      const lit = 0.97 + 0.12 * (nor.getX(i) * L.x + nor.getY(i) * L.y + nor.getZ(i) * L.z - L.y);
      const lin = k => Math.pow(px[pi + k] / 255, 2.2);
      // la foto e' in sRGB, la texture della grana ha media ~0.93: si compensa
      col.setXYZW(i, lin(0) / 0.86 * lit, lin(1) / 0.86 * lit, lin(2) / 0.86 * lit, 1 - ss(R_FADE0, R_FADE1, r));
    }
    col.needsUpdate = true;
  }
  // ---------------------------------------------------------------- fiocchi: tutto nello shader, ciclo per fiocco
  // cade (ondeggiando, un filo di vento), si posa sulla neve o sul ring, si scioglie e riparte da in alto altrove
  _flakes() {
    const N = 5000, geo = new THREE.BufferGeometry(), seed = new Float32Array(N * 4);
    for (let i = 0; i < N * 4; i++) seed[i] = Math.random();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 1, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.flakeMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 }, uH: { value: 800 }, uTex: { value: new THREE.CanvasTexture(c) }, uRing: { value: this.ringHalf } },
      vertexShader: `attribute vec4 aSeed; uniform float uT, uH, uRing; varying float vA;
        ${SNOWH_GLSL}
        float hash(float n){ return fract(sin(n) * 43758.5453); }
        void main(){
          float H = 7.5, vel = 0.55 + 0.45 * aSeed.z, tf = H / vel, ts = 2.5 + 3.5 * aSeed.w, C = tf + ts;
          float tt = uT + aSeed.w * 97.0 + aSeed.x * 31.0, k = floor(tt / C), t = tt - k * C;
          float a = hash(k * 12.9 + aSeed.x * 78.2) * 6.2831853, r = sqrt(hash(k * 7.3 + aSeed.y * 41.7)) * 11.5 + 0.3;
          vec3 p = vec3(cos(a) * r, 0.0, sin(a) * r);
          float tc = min(t, tf);
          p.x += 0.18 * tc + 0.22 * sin(tc * (0.9 + aSeed.y) + aSeed.x * 6.28);                 // vento e ondeggio
          p.z += 0.22 * cos(tc * (0.7 + aSeed.x) + aSeed.y * 6.28);
          float ground = (abs(p.x) < uRing && abs(p.z) < uRing) ? 0.007 : snowH(p.xz) + 0.004;
          p.y = ground + H - vel * tc;
          float size = 0.011 + 0.012 * aSeed.y; vA = smoothstep(0.0, 0.8, t);
          if (t > tf) { float m = (t - tf) / ts; size *= 1.0 - 0.55 * m; vA *= (1.0 - m) * (1.0 - m) * 0.9; p.y = ground; }   // posato: si scioglie
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float px = size * projectionMatrix[1][1] * uH / max(0.05, -mv.z);
          vA *= clamp(px / 1.5, 0.0, 1.0); gl_PointSize = clamp(px, 1.5, 28.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform sampler2D uTex; varying float vA;
        void main(){ float a = texture2D(uTex, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(vec3(0.97, 0.98, 1.0), a); }`,
    });
    const pts = new THREE.Points(geo, this.flakeMat); pts.frustumCulled = false; pts.renderOrder = 5; this.group.add(pts);
  }
  // ---------------------------------------------------------------- impronte (si riempiono di neve e spariscono)
  _prints() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.filter = 'blur(3px)'; g.fillStyle = '#fff';
    const ov = (x, y, rx, ry, r = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); g.fill(); };
    ov(32, 42, 15, 14);                                                  // cuscinetto
    ov(19, 25, 6, 8, -0.3); ov(45, 25, 6, 8, 0.3); ov(27, 14, 6, 8, -0.1); ov(37, 14, 6, 8, 0.1);   // dita
    const N = 200, geo = new THREE.PlaneGeometry(0.11, 0.11); geo.rotateX(-Math.PI / 2);
    const born = new THREE.InstancedBufferAttribute(new Float32Array(N).fill(-1e4), 1); geo.setAttribute('aBorn', born);
    this.printMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
      uniforms: { uT: { value: 0 }, uTex: { value: new THREE.CanvasTexture(c) } },
      vertexShader: `attribute float aBorn; uniform float uT; varying vec2 vUv; varying float vA;
        void main(){ vUv = uv; float age = uT - aBorn; vA = clamp(1.0 - age / 45.0, 0.0, 1.0) * smoothstep(0.0, 0.15, age);
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uTex; varying vec2 vUv; varying float vA;
        void main(){ float a = texture2D(uTex, vUv).a * vA * 0.38; if (a < 0.01) discard; gl_FragColor = vec4(0.5, 0.57, 0.7, a); }`,
    });
    this.prints = new THREE.InstancedMesh(geo, this.printMat, N); this.prints.frustumCulled = false; this.prints.renderOrder = -4;
    const m = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < N; i++) this.prints.setMatrixAt(i, m);
    this.printBorn = born; this.printI = 0; this.group.add(this.prints);
  }
  _print(p, yaw, side, size = 1) {                       // (size: l'orso le lascia grandi)
    const i = this.printI; this.printI = (i + 1) % this.printBorn.count;
    _q.setFromAxisAngle(Y, yaw + Math.PI + side * 0.08);
    _v.set(p.x, snowH(p.x, p.z) + 0.002, p.z);
    this.prints.setMatrixAt(i, new THREE.Matrix4().compose(_v, _q, _v2.set((0.9 + Math.random() * 0.15) * size, 1, size)));
    this.prints.instanceMatrix.needsUpdate = true;
    this.printBorn.array[i] = this.t; this.printBorn.needsUpdate = true;
  }
  // ---------------------------------------------------------------- lupo
  _wolf() {
    this.wolf = new THREE.Group(); this.wolf.visible = false; this.group.add(this.wolf);
    // ombra morbida sotto (luce coperta: niente ombra netta)
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 32, 2, 64, 32, 62); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(1, 0, 0, 0.5, 0, 16); g.fillStyle = gr; g.fillRect(0, -32, 128, 128);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.45, color: 0x223355, polygonOffset: true, polygonOffsetFactor: -3 }));
    sh.geometry.rotateX(-Math.PI / 2); sh.geometry.rotateY(Math.PI / 2); sh.renderOrder = -3; this.shadow = sh; this.group.add(sh);
    new GLTFLoader().load('assets/lupo.glb?v=20261006224408', gl => {
      let skinned = null; gl.scene.traverse(o => { if (o.isSkinnedMesh) skinned = o; });
      if (!skinned) return;
      this.wolf.add(gl.scene);
      // pelo a gusci: 14 copie del corpo gonfiate lungo la normale, tagliate a ciuffi (stessi ciuffi in tutti i gusci)
      const NS = 14;
      for (let k = 0; k <= NS; k++) {
        const mat = this._furMat(k / NS, k === 0);
        if (k === 0) { skinned.material = mat; skinned.castShadow = true; continue; }
        const s = new THREE.SkinnedMesh(skinned.geometry, mat); s.bind(skinned.skeleton, skinned.bindMatrix);
        s.frustumCulled = false; skinned.parent.add(s); s.position.copy(skinned.position); s.quaternion.copy(skinned.quaternion); s.scale.copy(skinned.scale);
      }
      skinned.frustumCulled = false;
      // ossa: rotazione a riposo e assi (laterale e verticale del lupo) nel sistema di ogni osso
      this.wolf.updateMatrixWorld(true);
      const wq = this.wolf.getWorldQuaternion(new THREE.Quaternion()).invert();
      this.B = {};
      for (const b of skinned.skeleton.bones) {
        const rw = b.getWorldQuaternion(new THREE.Quaternion()).premultiply(wq);           // rispetto al lupo
        const inv = rw.clone().invert();
        this.B[b.name] = { b, q0: b.quaternion.clone(), p0: b.position.clone(), ax: X.clone().applyQuaternion(inv), ay: Y.clone().applyQuaternion(inv), d: 0, yaw: 0 };
      }
      const pb = this.B.bacino.b.parent;
      this.bacParentInv = pb.getWorldQuaternion(new THREE.Quaternion()).premultiply(wq).invert();
      this.bacParentScale = pb.getWorldScale(new THREE.Vector3()).x / this.wolf.getWorldScale(new THREE.Vector3()).x;
      this.legs = [];
      for (const [s, x] of [['s', 1], ['d', -1]]) {
        this.legs.push(this._leg(['spalla_' + s, 'avambraccio_' + s, 'piede_ant_' + s], J.front, ['bacino', 'torace'], x * XF, 0.25 + (x > 0 ? 0 : 0.5), true));
        this.legs.push(this._leg(['coscia_' + s, 'tibia_' + s, 'piede_post_' + s], J.hind, ['bacino'], x * XH, (x > 0 ? 0 : 0.5), false));
      }
      this._wolfStart();
      this.wolf.visible = true;
    });
  }
  _leg(names, j, anc, x, off, front) {
    const seg = k => [j[k + 1][1] - j[k][1], j[k + 1][0] - j[k][0]];         // (dz, dy)
    const L = [0, 1, 2].map(k => Math.hypot(...seg(k))), A = [0, 1, 2].map(k => ang(...seg(k)));
    return { bones: names.map(n => this.B[n]), anc: anc.map(n => this.B[n]), L, A, x, off, front, z0: j[3][1], prev: 0, toe: new THREE.Vector3() };
  }
  // pelo: guscio k (0 = pelle) spostato lungo la normale di posa; pelo lungo su dorso, collo e coda, corto su zampe e muso
  _furMat(layer, base) {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
    m.onBeforeCompile = sh => {
      sh.uniforms.uL = { value: layer };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
        uniform float uL; varying vec3 vB; varying float vL; varying float vF;
        float furLen(vec3 p){ float f = mix(0.3, 1.0, smoothstep(0.38, 0.62, p.y));      // zampe corte
          f *= mix(1.0, 0.35, smoothstep(0.62, 0.75, p.z));                                  // muso raso
          f *= 1.0 + 0.5 * smoothstep(-0.42, -0.6, p.z) + 0.35 * smoothstep(0.25, 0.45, p.z) * smoothstep(0.95, 0.8, p.y);   // coda folta, gorgiera
          f *= smoothstep(0.022, 0.04, min(min(length(p - vec3(0.046, 1.0, 0.69)), length(p - vec3(-0.046, 1.0, 0.69))), length(p - vec3(0.0, 0.945, 0.905))));   // occhi e tartufo puliti
          return f; }`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vB = position; float fl0 = furLen(position); float fl = fl0 * uL; vF = fl0;
          transformed += normal * 0.034 * fl; transformed.y -= 0.012 * fl * fl;  vL = uL;`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vB; varying float vL; varying float vF;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (vL > 0.0) { vec3 c = floor(vB * 260.0); float h = h3(c);
            if (h < 0.08 + vL * 0.9 || vF < 0.05) discard; }
          diffuseColor.rgb *= mix(0.42, 0.95, vL);`);
    };
    m.customProgramCacheKey = () => 'fur' + (base ? 0 : 1);
    return m;
  }
  _wolfStart() {
    const a = Math.random() * Math.PI * 2, r = (W_RMIN + W_RMAX) / 2;
    this.W = { p: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), yaw: 0, v: 0, ph: 0, state: 'walk', st: 0, sit: 0, howl: 0,
      dirSign: Math.random() < 0.5 ? 1 : -1, target: new THREE.Vector3(), timer: 0, nextHowl: 25 + Math.random() * 30, look: new THREE.Vector3(), lookYaw: 0, lookPitch: 0 };
    this.W.yaw = Math.atan2(-this.W.p.z, this.W.p.x) * 0 + a + Math.PI / 2 * this.W.dirSign;
    this._newTarget();
  }
  _newTarget() {
    const W = this.W, a0 = Math.atan2(W.p.z, W.p.x);
    if (Math.random() < 0.2) W.dirSign *= -1;
    const a = a0 + W.dirSign * (0.5 + Math.random() * 0.7), r = W_RMIN + Math.random() * (W_RMAX - W_RMIN);
    W.target.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  }
  _updWolf(dt, camLocal) {
    const W = this.W;
    if (!W || !this.legs) return;
    W.st += dt;
    let vT = 0, yawT = W.yaw;
    const toC = Math.atan2(-W.p.x, -W.p.z);                                     // direzione del ring
    if (W.state === 'walk') {
      _v.subVectors(W.target, W.p); _v.y = 0;
      const r = Math.hypot(W.p.x, W.p.z);
      if (r < W_RMIN - 0.3) _v.add(_v2.set(W.p.x, 0, W.p.z).multiplyScalar(1.5 / r));     // lontano dalle corde
      yawT = Math.atan2(_v.x, _v.z); vT = 0.8;
      if (_v.length() < 0.5) {
        if (Math.random() < 0.45 && W.st > 6) { W.state = 'turn'; W.st = 0; }
        else this._newTarget();
      }
    } else if (W.state === 'turn') {                                            // si gira verso il ring, a passetti
      yawT = toC; vT = 0.25;
      if (Math.abs(wrap(toC - W.yaw)) < 0.12) { W.state = 'sitdown'; W.st = 0; }
    } else if (W.state === 'sitdown') {
      W.sit = Math.min(1, W.sit + dt / 1.3);
      if (W.sit >= 1) { W.state = 'sit'; W.st = 0; W.timer = 7 + Math.random() * 10; }
    } else if (W.state === 'sit') {
      if (this.t > W.nextHowl && W.st > 2 && W.st < W.timer - 5) { W.state = 'howl'; W.st = 0; W.nextHowl = this.t + 45 + Math.random() * 50; }
      else if (W.st > W.timer) { W.state = 'standup'; W.st = 0; }
    } else if (W.state === 'howl') {
      W.howl = Math.min(1, W.howl + dt / 0.8);
      if (W.st > 0.5 && !W.howled) { W.howled = true; if (this.cam) { this.wolf.localToWorld(_v.set(0, 1.1, 0.7)); sfx.wolfHowl(_v, this.cam); } }
      if (W.st > 5.2) { W.state = 'sit'; W.st = 0; W.timer = 2 + Math.random() * 4; W.howled = false; }
    } else if (W.state === 'standup') {
      W.sit = Math.max(0, W.sit - dt / 1.0);
      if (W.sit <= 0) { W.state = 'walk'; W.st = 0; this._newTarget(); }
    }
    if (W.state !== 'howl') W.howl = Math.max(0, W.howl - dt / 1.2);
    // passo: velocita' e svolta morbide
    const dy = wrap(yawT - W.yaw);
    const turnMax = W.state === 'turn' ? 1.0 : 1.2;
    W.yaw += THREE.MathUtils.clamp(dy, -turnMax * dt, turnMax * dt);
    if (W.state === 'walk') vT *= 1 - Math.min(1, Math.abs(dy) / 1.6) * 0.6;
    W.v += THREE.MathUtils.clamp(vT - W.v, -1.2 * dt, 0.8 * dt);
    W.p.x += Math.sin(W.yaw) * W.v * dt; W.p.z += Math.cos(W.yaw) * W.v * dt;
    W.p.y = snowH(W.p.x, W.p.z);
    this.wolf.position.copy(W.p); this.wolf.rotation.set(0, W.yaw, 0);
    this.shadow.position.set(W.p.x - Math.sin(W.yaw) * 0.08 * W.sit, W.p.y + 0.004, W.p.z - Math.cos(W.yaw) * 0.08 * W.sit); this.shadow.rotation.y = W.yaw;
    // ciclo del passo (piu' veloce con la velocita'; da fermo le zampe tornano sotto il corpo)
    const T = 1.05, duty = 0.62, moving = W.v > 0.05;
    const stepAmt = THREE.MathUtils.clamp(W.v / 0.25, 0, 1) * (1 - W.sit);
    if (moving || stepAmt > 0.01) W.ph += dt / T * Math.max(0.4, W.v / 0.8);
    const stride = Math.max(W.v, W.state === 'turn' ? 0.12 : 0) * T * duty * (1 - W.sit);
    // sguardo: verso il ring (o il giocatore) quando e' fermo, avanti quando cammina
    const s = ss(0, 1, W.sit), hw = ss(0, 1, W.howl);
    this.wolf.updateMatrixWorld(true);
    _v.copy(camLocal); this.wolf.worldToLocal(this.group.localToWorld(_v));
    const wantLook = W.state === 'sit' || W.state === 'sitdown';
    const tgt = _v2.set(0, 1.2, 0); this.wolf.worldToLocal(this.group.localToWorld(tgt));
    tgt.lerp(_v, 0.35 + 0.25 * Math.sin(this.t * 0.21));                     // il combattimento, ogni tanto il giocatore
    const ly = wantLook ? THREE.MathUtils.clamp(Math.atan2(tgt.x, tgt.z - 0.6), -1.1, 1.1) : 0;
    const lp = wantLook ? THREE.MathUtils.clamp(Math.atan2(tgt.y - 1.0, Math.hypot(tgt.x, tgt.z)), -0.4, 0.5) : 0;
    W.lookYaw += (ly * (1 - hw) - W.lookYaw) * Math.min(1, dt * 2.5); W.lookPitch += (lp * (1 - hw) - W.lookPitch) * Math.min(1, dt * 2.5);
    // spina dorsale
    const bob = 0.012 * Math.cos(W.ph * Math.PI * 4) * stepAmt, breath = 0.012 * Math.sin(this.t * 1.7);
    const B = this.B;
    B.bacino.d = -0.75 * s + 0.02 * Math.sin(W.ph * Math.PI * 4) * stepAmt;
    B.torace.d = 0.1 * s + breath;
    B.collo.d = 0.42 * s + 0.05 * Math.sin(W.ph * Math.PI * 4) * stepAmt - 0.75 * hw - W.lookPitch * 0.5 - 0.1 * (1 - s);
    B.testa.d = 0.28 * s - 0.55 * hw - W.lookPitch * 0.5 + 0.08 * (1 - s);
    B.collo.yaw = W.lookYaw * 0.5; B.testa.yaw = W.lookYaw * 0.5;
    const TK = this.tailK || [0.6, 1.15, 0.8];                 // seduto: la coda distesa dietro, appoggiata sulla neve (prima andava sottoterra)
    B.coda1.d = TK[0] * s + 0.12 * (1 - s); B.coda2.d = TK[1] * s - 0.1 * (1 - s); B.coda3.d = TK[2] * s;      
    const wag = Math.sin(W.ph * Math.PI * 2) * 0.12 * stepAmt + Math.sin(this.t * 0.8) * 0.05;
    B.coda1.yaw = wag; B.coda2.yaw = wag * 1.2; B.coda3.yaw = wag * 1.4;
    for (const n of ['bacino', 'torace', 'collo', 'testa', 'coda1', 'coda2', 'coda3']) this._setBone(B[n]);
    // il bacino scende quando si siede (spostamento espresso nel sistema del genitore)
    _v.set(0, -0.47 * s + bob, 0.04 * s).applyQuaternion(this.bacParentInv).divideScalar(this.bacParentScale);
    B.bacino.b.position.copy(B.bacino.p0).add(_v);
    this.wolf.updateMatrixWorld(true);
    // zampe: punta del piede sul terreno (cammino o seduto), IK a due ossa + ultimo osso con angolo dato
    for (const L of this.legs) {
      const p = ((W.ph + L.off) % 1 + 1) % 1;
      let z = L.z0, y = 0.02, a3 = L.A[2];
      if (p < duty) z = L.z0 + stride * (0.5 - p / duty);
      else {
        const u = (p - duty) / (1 - duty), e = u * u * (3 - 2 * u), lift = Math.sin(Math.PI * u) * Math.min(1, stride / 0.1) * (1 - W.sit);
        z = L.z0 + stride * (-0.5 + e); y += 0.08 * lift; a3 += (L.front ? 1.0 : 0.55) * lift;
      }
      // seduto: davanti zampe dritte, dietro garretto e piede a terra in avanti
      if (s > 0) {
        const zs = L.front ? 0.33 : -0.04, as = L.front ? L.A[2] : 1.62;
        z += (zs - z) * s; a3 += (as - a3) * s;
      }
      // impronta quando il piede tocca (fine dell'oscillazione)
      if (p < L.prev && W.v > 0.1) {
        _v.set(L.x, 0, z - 0.035); this.wolf.localToWorld(_v); this.group.worldToLocal(_v);
        this._print(_v, W.yaw, Math.sign(L.x));
        if (this.cam && Math.random() < 0.75) { this.group.localToWorld(_v); sfx.snowStep(_v, this.cam); }
      }
      L.prev = p;
      this._ik(L, z, y, a3);
    }
  }
  _setBone(o) {
    o.b.quaternion.copy(o.q0).multiply(_q.setFromAxisAngle(o.ax, o.d)).multiply(_q2.setFromAxisAngle(o.ay, o.yaw || 0));
  }
  _ik(L, fz, fy, a3) {
    const [b1, b2, b3] = L.bones;
    b1.b.getWorldPosition(_v); this.wolf.worldToLocal(_v);
    const sz = _v.z, sy = _v.y;
    const [L1, L2, L3] = L.L;
    const wz = fz - L3 * Math.sin(a3), wy = fy - L3 * Math.cos(a3);
    let dz = wz - sz, dyy = wy - sy, d = Math.hypot(dz, dyy);
    d = THREE.MathUtils.clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
    const beta = ang(dz, dyy), g = Math.acos(THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const A1 = L.front ? beta + g : beta - g;
    const ez = sz + L1 * Math.sin(A1), ey = sy + L1 * Math.cos(A1);
    const A2 = ang(wz - ez, wy - ey);
    let phi = 0; for (const a of L.anc) phi += a.d;
    b1.d = A1 - L.A[0] - phi; b2.d = A2 - L.A[1] - phi - b1.d; b3.d = a3 - L.A[2] - phi - b1.d - b2.d;
    // angoli continui (niente salti di 2 pi greco)
    b1.d = wrap(b1.d); b2.d = wrap(b2.d); b3.d = wrap(b3.d);
    this._setBone(b1); this._setBone(b2); this._setBone(b3);
  }
  update(dt, cam) {
    this.t += dt; this.cam = cam;
    this.flakeMat.uniforms.uT.value = this.t; this.printMat.uniforms.uT.value = this.t;
    this.flakeMat.uniforms.uH.value = (this._drawH || 1000) * 0.5;      // altezza in pixel dell'immagine di un occhio
    cam.getWorldPosition(_v2); const camLocal = this.group.worldToLocal(_v2.clone());
    this._updWolf(Math.min(dt, 0.05), camLocal);
    this.bear.update(Math.min(dt, 0.05));
  }
  setDrawHeight(h) { this._drawH = h; }
  setRing(size) { this.ringHalf = (size + 0.5) / 2; this.flakeMat.uniforms.uRing.value = this.ringHalf; }
}
