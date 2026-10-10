// Stage "Stadio": il ring al centro di uno stadio vuoto, aperto in alto, di giorno. Sfondo = foto a 360 gradi fatta in
// Blender (blender/create_stadium.py: prato a strisce, cartelloni, due anelli di gradinate vuote, torri faro, cielo con
// nuvole) con la sua profondita' per il 3D vero. Davanti, in 3D: ogni tanto passa un aereo da traino che si porta dietro
// lo striscione "HOME BOXING" (stoffa che ondeggia nel vento), con il rumore del motore che cambia passando (effetto
// Doppler).
// Sistema di riferimento: quello del ring (origine al centro del tappeto, y in alto).
import * as THREE from 'three';
import { panoDepth } from './pano_depth.js?v=20261010121339';
import { contactShadow } from './contact_shadow.js?v=20261010121339';
import * as sfx from './sfx.js?v=20261010121339';
import { Footballer } from './footballer.js?v=20261010121339';
import { NightFireworks } from './fireworks.js?v=20261010121339';
import { StadiumScreen } from './stadium_screen.js?v=20261010121339';

const EYE = 1.65;
// il Sole della foto: Blender (-0.2484, -0.5327, 0.809) -> gioco (y, z, x)
const SUN = new THREE.Vector3(-0.5327, 0.809, -0.2484).normalize();

const BANNER_L = 30, BANNER_H = 6.5, SEG_X = 60, SEG_Y = 8;
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

// scia di fumo dell'aereo: tante nuvolette (quadrati che guardano sempre la camera) in un'unica draw call; ognuna nasce
// dietro l'aereo, si allarga, sale piano col vento e svanisce in ~14 s
const SMOKE_N = 320;
class Smoke {
  constructor(parent) {
    this.t = 0; this.i = 0;
    this.p = new Float32Array(SMOKE_N * 3); this.age = new Float32Array(SMOKE_N).fill(99); this.ttl = new Float32Array(SMOKE_N).fill(1);
    this.r0 = new Float32Array(SMOKE_N); this.vel = new Float32Array(SMOKE_N * 3); this.seed = new Float32Array(SMOKE_N);
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(SMOKE_N * 3), 3); this.aPos.setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(SMOKE_N), 1); this.aSize.setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(SMOKE_N), 1); this.aAlpha.setUsage(THREE.DynamicDrawUsage);
    this.aSeed = new THREE.InstancedBufferAttribute(this.seed, 1);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iSize', this.aSize); g.setAttribute('iAlpha', this.aAlpha); g.setAttribute('iSeed', this.aSeed);
    g.instanceCount = SMOKE_N;
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      vertexShader: `attribute vec3 iPos; attribute float iSize; attribute float iAlpha; attribute float iSeed; varying vec2 vUv; varying float vA; varying float vS;
        void main(){ vUv = position.xy; vA = iAlpha; vS = iSeed;
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0); mv.xy += position.xy * iSize;
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec2 vUv; varying float vA; varying float vS;
        void main(){ float r = length(vUv); if (r > 1.0) discard;
          float edge = 1.0 - smoothstep(0.35, 1.0, r);
          float n = 0.82 + 0.18 * sin(vUv.x * 5.0 + vS * 40.0) * sin(vUv.y * 5.0 + vS * 17.0);       // un po' di grana: non un disco liscio
          vec3 col = mix(vec3(0.97), vec3(0.78, 0.8, 0.84), smoothstep(0.0, 1.0, r)) * n;
          gl_FragColor = vec4(col, vA * edge); }`,
    });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3; parent.add(this.mesh);
    for (let k = 0; k < SMOKE_N; k++) this.aSeed.array[k] = Math.random();
    this.aSeed.needsUpdate = true;
  }
  emit(pos, vel) {
    const k = this.i; this.i = (this.i + 1) % SMOKE_N;
    this.p[k * 3] = pos.x; this.p[k * 3 + 1] = pos.y; this.p[k * 3 + 2] = pos.z;
    this.vel[k * 3] = vel.x + (Math.random() - 0.5) * 0.7; this.vel[k * 3 + 1] = vel.y + 0.15 + Math.random() * 0.3; this.vel[k * 3 + 2] = vel.z + (Math.random() - 0.5) * 0.7;
    this.age[k] = 0; this.ttl[k] = 11 + Math.random() * 5; this.r0[k] = 0.45 + Math.random() * 0.25;
  }
  update(dt) {
    for (let k = 0; k < SMOKE_N; k++) {
      if (this.age[k] >= this.ttl[k]) { this.aAlpha.array[k] = 0; continue; }
      this.age[k] += dt; const u = this.age[k] / this.ttl[k];
      this.p[k * 3] += this.vel[k * 3] * dt; this.p[k * 3 + 1] += this.vel[k * 3 + 1] * dt; this.p[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      this.vel[k * 3] *= Math.pow(0.8, dt); this.vel[k * 3 + 1] *= Math.pow(0.9, dt); this.vel[k * 3 + 2] *= Math.pow(0.8, dt);     // il getto si ferma, resta il vento
      this.aPos.array[k * 3] = this.p[k * 3]; this.aPos.array[k * 3 + 1] = this.p[k * 3 + 1]; this.aPos.array[k * 3 + 2] = this.p[k * 3 + 2];
      this.aSize.array[k] = this.r0[k] + u * 4.2;                         // si allarga fino a ~9 m
      this.aAlpha.array[k] = 0.5 * Math.min(1, this.age[k] / 0.4) * Math.pow(1 - u, 1.6);   // appare subito e svanisce piano
    }
    this.aPos.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = true;
  }
}

export class Stadium {
  constructor({ night = false } = {}) {
    this.night = night;                                  // stadio di notte: stesso stadio (e stessa profondita'), fari accesi, cielo stellato; niente aereo ne' calciatore
    this.group = new THREE.Group(); this.group.name = night ? 'stadio di notte' : 'stadio';
    this.sunDir = SUN.clone();
    this.t = 0;
    this._sky();
    this.screen = new StadiumScreen(this.group);          // il maxischermo (spento nel panorama): ogni tanto ci appare la scritta HOME BOXING
    if (night) { this.screen2 = new StadiumScreen(this.group, { front: true });          // di notte un secondo schermo, di fronte a te (quello del panorama e' dietro)
      this._nightLights(); this.fw = new NightFireworks(this.group); return; }
    this._plane();
    this.smoke = new Smoke(this.group); this.smokeT = 0;
    this.player = new Footballer(this.group);           // il calciatore col pallone
    this.nextPlane = 12 + Math.random() * 14;           // il primo passaggio dopo un po'
    this.fly = null;
  }
  // ---------------------------------------------------------------- foto a 360 gradi
  _sky() {
    const tex = new THREE.TextureLoader().load(this.night ? 'assets/stadio_notte_panorama.jpg?v=20261010121339' : 'assets/stadio_panorama.jpg?v=20261010121339', () => { this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
    tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
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
    // sfondo in 3D vero: il prato piatto, le gradinate e le torri alla loro distanza
    this.group.add(panoDepth('assets/stadio_profondita.png', tex, { eye: EYE, flat: 40 }));
  }

  // ---------------------------------------------------------------- di notte: i quattro fari illuminano il ring
  // (sono le torri del panorama: x = y di Blender, z = x di Blender, a 58 m di quota). Ognuno e' un faro vero, che punta sul ring:
  // luce calda, nessun calo con la distanza; sul ring, sulle corde e sui pugili si vedono quattro riflessi. Attorno a ogni lampada
  // un alone luminoso (come l'abbagliamento dei fari veri).
  _nightLights() {
    this.lights = [];
    const halo = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,248,230,1)'); gr.addColorStop(0.12, 'rgba(255,236,200,0.75)'); gr.addColorStop(0.4, 'rgba(255,220,170,0.18)'); gr.addColorStop(1, 'rgba(255,210,150,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    for (const [x, z] of [[-74, -98], [74, -98], [-74, 98], [74, 98]]) {
      const L = new THREE.SpotLight(0xffefd8, 0.62, 0, 0.16, 0.65, 0);
      L.position.set(x * 0.99, 58, z * 0.99); L.target.position.set(0, 0.6, 0); this.group.add(L); this.group.add(L.target);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false, fog: false, opacity: 0.9 }));
      s.position.set(x * 0.97, 58.5, z * 0.97); s.scale.setScalar(34); s.renderOrder = 7; this.group.add(s);
      this.lights.push(L);
    }
  }

  // ---------------------------------------------------------------- l'aereo
  _plane() {
    const P = new THREE.Group(); P.visible = false;
    const yellow = new THREE.MeshStandardMaterial({ color: 0xf3c431, roughness: 0.55, metalness: 0.05 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc4161f, roughness: 0.55 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: 0.6 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x2a3b4c, roughness: 0.1, metalness: 0.3 });
    const add = (geo, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); P.add(o); return o; };
    // fusoliera: ellissoide affusolato verso la coda (muso verso +Z)
    const body = add(new THREE.SphereGeometry(1, 20, 14), yellow, 0, 0, 0.3); body.scale.set(0.62, 0.66, 2.3);
    const tail = add(new THREE.ConeGeometry(0.42, 3.4, 12), yellow, 0, 0.12, -2.9); tail.rotation.x = -Math.PI / 2; tail.scale.set(1, 1, 0.9);
    add(new THREE.BoxGeometry(0.66, 0.14, 1.6), red, 0, 0.06, 0.3).scale.set(1, 1, 1);             // fascia rossa lungo la fiancata (appoggiata)
    add(new THREE.SphereGeometry(0.5, 12, 8), glass, 0, 0.45, 0.55).scale.set(0.95, 0.62, 1.4);   // tettuccio
    // ala alta con i due montanti
    add(new THREE.BoxGeometry(10.6, 0.13, 1.55), yellow, 0, 0.88, 0.45);
    add(new THREE.BoxGeometry(10.6, 0.14, 0.12), red, 0, 0.9, 1.2);                                    // bordo d'attacco rosso
    for (const s of [-1, 1]) { const st = add(new THREE.BoxGeometry(0.07, 1.35, 0.09), dark, s * 1.6, 0.32, 0.5); st.rotation.z = s * 0.52; }
    // coda
    add(new THREE.BoxGeometry(3.4, 0.09, 0.95), yellow, 0, 0.12, -3.9);
    add(new THREE.BoxGeometry(0.09, 1.25, 1.05), red, 0, 0.7, -3.85);
    // carrello
    add(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 12), dark, -0.78, -0.95, 0.75).rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 12), dark, 0.78, -0.95, 0.75).rotation.z = Math.PI / 2;
    // elica e cuffia
    add(new THREE.ConeGeometry(0.2, 0.5, 12), dark, 0, 0, 2.95).rotation.x = Math.PI / 2;
    this.prop = new THREE.Group(); this.prop.position.set(0, 0, 2.75); P.add(this.prop);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.3, 0.05), dark); this.prop.add(blade);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color: 0xcfd3d8, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    this.prop.add(disc);
    P.scale.setScalar(1.45);                           // (un po' piu' grande del vero: da lontano si legga)
    this.plane = P; this.group.add(P);

    // striscione: stoffa 30 x 6,5 m; l'origine e' sull'asta davanti, +x va verso la coda
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 448; const g = cv.getContext('2d');
    g.fillStyle = '#f6f2e8'; g.fillRect(0, 0, 2048, 448);
    g.fillStyle = '#c4161f'; g.fillRect(0, 0, 2048, 26); g.fillRect(0, 422, 2048, 26);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 262px system-ui, "Arial Black", sans-serif';
    g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = '#141416'; g.strokeText('HOME BOXING', 1024, 236);
    g.fillStyle = '#d81e2c'; g.fillText('HOME BOXING', 1024, 236);
    const btex = new THREE.CanvasTexture(cv); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 8;
    this.bannerMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, uniforms: { uTex: { value: btex }, uT: { value: 0 }, uL: { value: BANNER_L } },
      vertexShader: `uniform float uT; uniform float uL; varying vec2 vUv; varying float vShade;
        void main(){
          vUv = uv; float s = uv.x;                                   // 0 = asta davanti, 1 = coda
          vec3 p = position;                                          // x in [0, L], y in [-H/2, H/2]
          float w = 1.1 * s * s + 0.15 * s;                            // l'ondeggiare cresce verso la coda
          float ph = s * 9.0 - uT * 5.0;
          p.z += sin(ph) * (0.9 + 1.5 * s) * w + sin(ph * 0.55 + 1.3 + p.y * 0.35) * 0.5 * s;
          p.y += sin(ph * 0.8 + 0.7) * 0.35 * s * s - 0.55 * s * s;    // un po' di sacco verso il basso
          p.x -= 0.25 * s * s * (1.0 + sin(uT * 2.0 + s * 3.0) * 0.3);    // la stoffa si accorcia dove ondeggia
          vShade = 0.86 + 0.14 * cos(ph);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `uniform sampler2D uTex; varying vec2 vUv; varying float vShade;
        void main(){
          vec2 uv = vUv; if (!gl_FrontFacing) uv.x = 1.0 - uv.x;      // dietro: stampato al contrario, si legge giusto anche li'
          vec4 c = texture2D(uTex, uv);
          gl_FragColor = vec4(c.rgb * vShade, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const geo = new THREE.PlaneGeometry(BANNER_L, BANNER_H, SEG_X, SEG_Y); geo.translate(BANNER_L / 2, 0, 0);
    this.banner = new THREE.Mesh(geo, this.bannerMat); this.banner.frustumCulled = false; this.banner.visible = false;
    this.group.add(this.banner);
    // asta davanti allo striscione e cavo di traino (due fili: in alto e in basso)
    this.pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, BANNER_H, 6), dark); this.pole.visible = false; this.group.add(this.pole);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3));
    this.line = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x20242c })); this.line.frustumCulled = false; this.line.visible = false;
    this.group.add(this.line);
  }

  // un passaggio: retta a quota 90-130 m, a 30-110 m dal ring, da un lato all'altro (lunga ~1 km: ~30 s)
  _launch() {
    const a = Math.random() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));                        // direzione del volo
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const off = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 80);
    const h = 90 + Math.random() * 40;                                                   // sopra le torri faro (58 m + fari): non attraversa niente
    const L = 520;
    this.fly = { dir, side, off, h, p: new THREE.Vector3().copy(dir).multiplyScalar(-L).addScaledVector(side, off).setY(h), v: 30 + Math.random() * 5, L, t: 0, roll: 0 };
    this.plane.visible = this.banner.visible = this.pole.visible = this.line.visible = true;
  }

  setRing(size) {
    if (this.player) this.player.setRing(size);
    if (!this.ringShadow) { this.ringShadow = contactShadow(1, 1, 0.55, 0.66); this.ringShadow.position.y = 0.008; this.group.add(this.ringShadow); }
    this.ringShadow.scale.set((size + 0.3) * 1.45, (size + 0.3) * 1.45, 1);
  }

  update(dt, cam) {
    if (this.screen) this.screen.update(dt);
    if (this.screen2) this.screen2.update(dt);
    if (this.night) { if (this.fw) this.fw.update(dt, cam); return; }
    this.t += dt;
    this.bannerMat.uniforms.uT.value = this.t;
    this.player.update(dt, cam);
    this.smoke.update(dt);                                  // la scia continua a svanire anche dopo che l'aereo se n'e' andato
    const F = this.fly;
    if (!F) {
      if ((this.nextPlane -= dt) <= 0) this._launch();
      return;
    }
    F.t += dt;
    F.p.addScaledVector(F.dir, F.v * dt);
    const pos = F.p, P = this.plane;
    // assetto: muso lungo il volo, un po' di rollio e beccheggio lenti
    const yaw = Math.atan2(F.dir.x, F.dir.z);
    P.position.copy(pos); P.rotation.set(Math.sin(this.t * 0.6) * 0.03, yaw, Math.sin(this.t * 0.45 + 1) * 0.06 + Math.sin(this.t * 0.17) * 0.03, 'YXZ');
    this.prop.rotation.z += dt * 90;
    // striscione: dietro la coda, 18 m di cavo; l'asta e' verticale e la stoffa parte da li'
    const back = _v.copy(F.dir).negate();
    const tail = _w.copy(pos).addScaledVector(back, 5.6).add(new THREE.Vector3(0, -0.15, 0));       // coda dell'aereo
    const poleC = new THREE.Vector3().copy(tail).addScaledVector(back, 18).add(new THREE.Vector3(0, -2.6 + Math.sin(this.t * 0.8) * 0.15, 0));
    this.banner.position.copy(poleC);
    this.banner.rotation.set(0, Math.atan2(F.dir.z, F.dir.x) * -1 + Math.PI, 0);   // +x locale = verso la coda (-direzione del volo)
    this.pole.position.copy(poleC);
    const lp = this.line.geometry.attributes.position;
    lp.setXYZ(0, tail.x, tail.y, tail.z); lp.setXYZ(1, poleC.x, poleC.y + BANNER_H / 2, poleC.z);
    lp.setXYZ(2, tail.x, tail.y, tail.z); lp.setXYZ(3, poleC.x, poleC.y - BANNER_H / 2, poleC.z); lp.needsUpdate = true;
    // fumo: una nuvoletta ogni ~1,2 m di volo, dallo scarico (sotto e dietro il muso)
    this.smokeT += dt;
    while (this.smokeT > 1.2 / F.v) {
      this.smokeT -= 1.2 / F.v;
      const ex = _v.copy(F.dir).multiplyScalar(-3.2).add(pos).add(new THREE.Vector3(0, -0.5, 0));       // scarico (la posizione e' del passo corrente)
      this.smoke.emit(ex, new THREE.Vector3(-F.dir.x * 0.6, 0, -F.dir.z * 0.6));
    }
    // rumore del motore, con l'effetto Doppler (piu' acuto quando si avvicina)
    if (cam) {
      const cp = cam.getWorldPosition(new THREE.Vector3()), wp = this.group.localToWorld(pos.clone());
      const to = wp.clone().sub(cp), dist = to.length();
      const vr = to.dot(this.group.localToWorld(pos.clone().add(F.dir)).sub(wp)) / Math.max(1, dist) * F.v;   // > 0: si allontana
      sfx.planeBuzz(wp, cam, 1 - vr / 340);
    }
    // finito il passaggio (oltre la fine della retta): sparisce e riparte dopo un po'
    if (F.t * F.v > 2 * F.L) {
      this.fly = null; this.plane.visible = this.banner.visible = this.pole.visible = this.line.visible = false;
      sfx.planeStop(); this.nextPlane = 30 + Math.random() * 40;
    }
  }
  dispose() { sfx.planeStop(); }
}
