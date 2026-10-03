// Stage "Nel deserto": il ring sulla sabbia, dune tutto intorno e altopiani di roccia rossa all'orizzonte
// (foto a 360 gradi fatta in Blender: blender/create_desert.py). Davanti, in 3D: la sabbia vicina con le
// increspature del vento (sfuma nella foto), sassi, cespugli secchi e ogni tanto un rotolacampo che passa.
import * as THREE from 'three';

const PANO_U = 0.0;
const SUN = new THREE.Vector3(-0.338, 0.12, -0.941).normalize();      // il sole della foto (u = 0,195)
const WIND = new THREE.Vector3(0.8, 0, 0.6).normalize();

export class Desert {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'deserto';
    this.sunDir = SUN.clone();
    this._sky(); this._sand(); this._props(); this._tumble();
    this.t = 0;
  }
  _sky() {
    const tex = new THREE.TextureLoader().load('assets/deserto_panorama.jpg?v=20261003211950', () => { this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
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
  // sabbia vicina: increspature ondulate; il bordo sfuma (alpha) e lascia vedere la sabbia della foto
  _sand() {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 512, 512);          // grigio chiaro: il colore lo da' il materiale (= quello della foto)
    for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = `rgba(${v < 0.5 ? '170,170,170' : '255,255,255'},0.15)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    for (let y = 0; y < 512; y += 16) {                    // creste delle increspature (ombra + luce)
      for (const [dy, col] of [[0, 'rgba(150,150,150,0.35)'], [4, 'rgba(255,255,255,0.4)']]) {
        g.strokeStyle = col; g.lineWidth = 3; g.beginPath();
        for (let x = 0; x <= 512; x += 8) g.lineTo(x, y + dy + Math.sin(x / 512 * Math.PI * 4 + y * 0.3) * 4);
        g.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 30); tex.anisotropy = 8; tex.rotation = Math.atan2(WIND.x, WIND.z);
    const a = document.createElement('canvas'); a.width = a.height = 256; const ga = a.getContext('2d');
    const gr = ga.createRadialGradient(128, 128, 70, 128, 128, 128); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
    ga.fillStyle = gr; ga.fillRect(0, 0, 256, 256);
    const alpha = new THREE.CanvasTexture(a);
    // stesso colore della sabbia nella foto (209,175,149), senza luci del gioco: il bordo non si vede
    const SANDC = new THREE.Color().setRGB(209 / 255 / 0.91, 175 / 255 / 0.91, 149 / 255 / 0.91, THREE.SRGBColorSpace);
    const sand = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshBasicMaterial({ map: tex, alphaMap: alpha, transparent: true, color: SANDC, depthWrite: false, toneMapped: false }));
    sand.rotation.x = -Math.PI / 2; sand.position.y = -0.005; sand.receiveShadow = true; sand.renderOrder = -5;
    this.group.add(sand);
    // sotto il ring: sabbia opaca (riceve bene le ombre)
    const under = new THREE.Mesh(new THREE.CircleGeometry(8, 48), new THREE.MeshBasicMaterial({ map: tex, color: SANDC, toneMapped: false }));
    under.rotation.x = -Math.PI / 2; under.position.y = -0.002; under.receiveShadow = true; this.group.add(under);
  }
  // sassi di arenaria e cespugli secchi intorno (lontani dal ring)
  _props() {
    const rockM = new THREE.MeshStandardMaterial({ color: 0x9a5534, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 22, s = 0.15 + Math.random() * (d > 14 ? 0.9 : 0.4);
      const geo = new THREE.IcosahedronGeometry(1, 1), p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const f = 0.75 + Math.random() * 0.5; p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * 0.7, p.getZ(k) * f); }
      geo.computeVertexNormals();
      const r = new THREE.Mesh(geo, rockM); r.scale.setScalar(s); r.position.set(Math.cos(a) * d, s * 0.25, Math.sin(a) * d);
      r.rotation.set(Math.random(), Math.random() * 6, Math.random()); r.castShadow = true; this.group.add(r);
    }
    const twig = new THREE.LineBasicMaterial({ color: 0x6b4a2c });
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, d = 5 + Math.random() * 25, pts = [];
      for (let k = 0; k < 26; k++) {                      // rametti che partono dal centro verso l'alto e i lati
        const th = Math.random() * Math.PI * 2, up = 0.15 + Math.random() * 0.35, l = 0.15 + Math.random() * 0.3;
        pts.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(th) * l, up, Math.sin(th) * l));
      }
      const b = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), twig);
      b.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); b.scale.setScalar(0.7 + Math.random() * 0.8); this.group.add(b);
    }
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
