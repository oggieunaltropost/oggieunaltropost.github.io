// Stage "Nel deserto": il ring sulla sabbia rossa del Namaqualand. Sfondo = foto vera a 360 gradi "Goegap"
// (Poly Haven, CC0) a piena risoluzione; davanti, in 3D, solo la sabbia sotto e attorno al ring (texture
// fotografica red_sand portata al colore della foto, sfuma nella foto entro pochi metri) e ogni tanto un
// rotolacampo spinto dal vento. Le rocce e i cespugli sono quelli veri della foto.
import * as THREE from 'three';

const PANO_U = 0.0;
const SUN = new THREE.Vector3(0.522, 0.744, 0.417).normalize();      // il sole della foto
const WIND = new THREE.Vector3(0.8, 0, 0.6).normalize();

export class Desert {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'deserto';
    this.sunDir = SUN.clone();
    this._sky(); this._sand(); this._tumble();
    this.t = 0;
  }
  _sky() {
    const tex = new THREE.TextureLoader().load('assets/deserto_panorama.jpg?v=20261003213645', () => { this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
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
    const tex = L.load('assets/sabbia_rossa_colore.jpg?v=20261003213645'); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 6); tex.anisotropy = 8;
    const a = document.createElement('canvas'); a.width = a.height = 256; const ga = a.getContext('2d');
    const gr = ga.createRadialGradient(128, 128, 128 * 5 / 9, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
    ga.fillStyle = gr; ga.fillRect(0, 0, 256, 256);
    const sand = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ map: tex, alphaMap: new THREE.CanvasTexture(a), transparent: true, depthWrite: false, toneMapped: false }));
    sand.rotation.x = -Math.PI / 2; sand.position.y = -0.005; sand.renderOrder = -5; this.group.add(sand);
    // sotto il ring: opaca e illuminata (riceve le ombre dei pugili)
    const nor = L.load('assets/sabbia_rossa_rilievo.jpg?v=20261003213645'); nor.wrapS = nor.wrapT = THREE.RepeatWrapping; nor.repeat.set(3, 3);
    const t2 = tex.clone(); t2.repeat.set(3, 3); t2.needsUpdate = true;
    const under = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48), new THREE.MeshStandardMaterial({ map: t2, normalMap: nor, roughness: 0.95 }));
    under.rotation.x = -Math.PI / 2; under.position.y = -0.003; under.receiveShadow = true; this.group.add(under);
  }
  // rotolacampo: palla di rametti che rotola col vento, saltellando
  _tumble() {
    const pts = [];
    for (let k = 0; k < 160; k++) {
      const u = new THREE.Vector3().randomDirection().multiplyScalar(0.25 + Math.random() * 0.12);
      const v = u.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.18));
      pts.push(u, v.setLength(Math.min(0.4, v.length())));
    }
    this.tw = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8a6a42 }));
    this.tw.visible = false; this.group.add(this.tw);
    this.nextTw = 6 + Math.random() * 10; this.twF = null;
  }
  update(dt) {
    this.t += dt;
    if (!this.twF) {
      this.nextTw -= dt;
      if (this.nextTw <= 0) {                             // entra da lontano controvento, passa a 5-20 m da te
        const side = new THREE.Vector3(-WIND.z, 0, WIND.x), off = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 15);
        this.twF = { p: side.clone().multiplyScalar(off).addScaledVector(WIND, -35), v: 2.5 + Math.random() * 2.5, phase: 0, life: 0 };
        this.tw.visible = true;
      }
      return;
    }
    const F = this.twF; F.life += dt;
    const gust = 1 + 0.4 * Math.sin(this.t * 1.3);
    F.p.addScaledVector(WIND, F.v * gust * dt);
    F.phase += dt * F.v * 2.2;
    const hop = Math.abs(Math.sin(F.phase)) * 0.35;      // saltelli
    this.tw.position.set(F.p.x, 0.35 + hop, F.p.z);
    this.tw.rotateOnWorldAxis(new THREE.Vector3(WIND.z, 0, -WIND.x), -F.v * gust * dt / 0.35);   // rotola
    if (F.life > 75 / F.v) { this.twF = null; this.tw.visible = false; this.nextTw = 15 + Math.random() * 20; }
  }
}
