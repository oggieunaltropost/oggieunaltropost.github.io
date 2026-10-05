// Stage "In cima al grattacielo": il ring sul tetto di una torre a 260 m, poco piu' largo del ring.
// Tutto intorno la citta' in una bella giornata di sole (foto a 360 gradi fatta in Blender: blender/create_city.py), davanti
// in 3D il tetto, il parapetto di vetro, le luci rosse e le facciate della torre che scendono fino alla citta'.
// La citta' si muove (city_life.js): auto, battelli, navi, uccelli, aerei. Ogni tanto passa un elicottero (il suono lo fa sfx.heli, spaziale: piu' forte quando e' vicino).
// Sistema di riferimento: quello del ring (origine al centro del tappeto, y in alto).
import * as THREE from 'three';
import { CityLife } from './city_life.js?v=20261005192220';

const PANO_U = 0.0;               // rotazione del panorama (il sole della foto a sinistra, un po' dietro)
const TOWER_H = 260;              // dal tetto alla strada
const SUN = new THREE.Vector3(-0.643, 0.624, -0.445).normalize();   // il sole della foto (bella giornata: u 0,096, alto 39 gradi)
const MOON = new THREE.Vector3(-0.65, 0.53, 0.545).normalize();     // la luna della foto di notte (blender/create_city_notte.py)

export class Rooftop {
  // night: lo stesso stage di notte ("Citta' di notte"): panorama notturno, finestre accese, fari sul ring
  constructor(ringSize, night = false) {
    this.group = new THREE.Group(); this.group.name = night ? 'notte' : 'grattacielo';
    this.night = night;
    this.sunDir = (night ? MOON : SUN).clone();
    this.S = ringSize + 1.5;                       // lato del tetto: poco piu' del ring
    this._sky(); this._roof(); this._tower(); this._heli();
    if (night) this._floods();
    this.life = new CityLife(this.group, PANO_U, night);   // auto, battelli, navi, uccelli, aereo
    this.t = 0;
  }

  _sky() {
    const tex = new THREE.TextureLoader().load(this.night ? 'assets/citta_notte_panorama.jpg?v=20261005192220' : 'assets/citta_panorama.jpg?v=20261005192220', () => { this.skyLoaded = true; if (this.onSkyLoad) this.onSkyLoad(); });
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
    sky.renderOrder = -10; sky.frustumCulled = false;
    this.group.add(sky);
  }

  // tetto: pavimento di lastre, cordolo, parapetto di vetro con corrimano, luci rosse agli angoli
  _roof() {
    const S = this.S, h = S / 2;
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#6f7177'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const v = 95 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v},${v + 4},0.25)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
    g.strokeStyle = 'rgba(30,32,36,0.8)'; g.lineWidth = 3;
    for (let k = 0; k <= 512; k += 128) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
    const ft = new THREE.CanvasTexture(c); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(S / 2.4, S / 2.4); ft.anisotropy = 4;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(S, 0.3, S), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.9 }));
    floor.position.y = -0.16; floor.receiveShadow = true; this.group.add(floor);
    const metal = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.85, roughness: 0.3 });
    const curbM = new THREE.MeshStandardMaterial({ color: 0x3a3d43, roughness: 0.7 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfd6e6, metalness: 0, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, side = new THREE.Group(); side.rotation.y = a;
      const curb = new THREE.Mesh(new THREE.BoxGeometry(S + 0.3, 0.25, 0.3), curbM); curb.position.set(0, 0.1, h); side.add(curb);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(S, 1.0), glass); pane.position.set(0, 0.73, h + 0.02); pane.renderOrder = 5; side.add(pane);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, S + 0.1, 10), metal); rail.rotation.z = Math.PI / 2; rail.position.set(0, 1.25, h + 0.02); side.add(rail);
      for (let p = -2; p <= 2; p++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 0.05), metal); post.position.set(p * S / 4.2, 0.75, h + 0.02); side.add(post);
      }
      this.group.add(side);
    }
    // luci rosse di segnalazione sugli angoli (lampeggiano)
    this.beacons = [];
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 8), metal); pole.position.set(sx * (h + 0.05), 0.8, sz * (h + 0.05)); this.group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff2010, toneMapped: false }));
      lamp.position.set(sx * (h + 0.05), 1.65, sz * (h + 0.05)); this.group.add(lamp); this.beacons.push(lamp);
    }
  }

  // le facciate: vetro scuro con le righe dei piani e qualche finestra accesa; scendono fino alla citta'
  _tower() {
    const S = this.S, w = S + 0.3;
    const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const g = c.getContext('2d');
    g.fillStyle = '#1a2230'; g.fillRect(0, 0, 256, 1024);
    const floors = 64, cols = 6, fh = 1024 / floors, cw = 256 / cols;
    for (let f = 0; f < floors; f++) for (let k = 0; k < cols; k++) {
      const on = Math.random() < (this.night ? 0.3 : 0.07);
      g.fillStyle = on ? (Math.random() < 0.5 ? '#ffcf86' : '#ffe2b0') : (Math.random() < 0.5 ? '#26324a' : '#2e3a52');
      g.fillRect(k * cw + 3, f * fh + 3, cw - 6, fh - 5);
    }
    g.fillStyle = '#5b6372'; for (let f = 0; f < floors; f++) g.fillRect(0, f * fh, 256, 2);   // marcapiani
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, TOWER_H / (floors * 3.6)); tex.anisotropy = 8;
    const em = tex.clone(); em.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: this.night ? 1.0 : 0.55, metalness: 0.4, roughness: 0.25 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, TOWER_H, w), mat);
    body.position.y = -0.3 - TOWER_H / 2; this.group.add(body);
    this.towerMat = mat;
  }

  // notte: quattro fari sui pali agli angoli che illuminano il ring (la luce vera la da' la luce principale, qui i corpi
  // luminosi e il cono di luce appena visibile)
  _floods() {
    const h = this.S / 2, metal = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.7, roughness: 0.4 });
    const lens = new THREE.MeshBasicMaterial({ color: 0xfff3dc, toneMapped: false });
    const cone = new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.012, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide });
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const x = sx * (h - 0.15), z = sz * (h - 0.15);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 8), metal); pole.position.set(x, 1.6, z); this.group.add(pole);
      const head = new THREE.Group(); head.position.set(x, 3.25, z); head.lookAt(0, 0.4, 0); this.group.add(head);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.2), metal); head.add(box);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.24), lens); l.position.z = 0.101; head.add(l);
      const d = Math.hypot(x, 3.25 - 0.4, z), c = new THREE.Mesh(new THREE.ConeGeometry(1.1, d, 20, 1, true), cone);
      c.rotation.x = -Math.PI / 2; c.position.z = d / 2 + 0.1; c.renderOrder = 6; head.add(c);
    }
  }

  // elicottero: fusoliera affusolata bianca con fascia rossa, cabina vetrata, cofano motore, coda con impennaggi,
  // rotore a 4 pale (con disco sfocato quando gira), rotore di coda, pattini, luci di navigazione e lampeggiante
  _heli() {
    const H = new THREE.Group(); H.visible = false;
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f3f5, metalness: 0.3, roughness: 0.3 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc8202a, metalness: 0.3, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x16181c, metalness: 0.4, roughness: 0.5 });
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0x0b1420, metalness: 0.6, roughness: 0.05, clearcoat: 1 });
    // fusoliera: profilo a goccia ruotato (muso verso -Z)
    const prof = [[0, -2.6], [0.55, -2.4], [1.0, -1.9], [1.25, -1.0], [1.3, 0.0], [1.2, 1.0], [0.85, 1.8], [0.45, 2.4], [0, 2.6]].map(([r, z]) => new THREE.Vector2(r, z));
    const bodyG = new THREE.LatheGeometry(prof, 24); bodyG.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyG, white); body.scale.set(1, 0.95, 1); H.add(body);
    const belly = new THREE.Mesh(bodyG, red); belly.scale.set(1.01, 0.42, 1.01); belly.position.y = -0.55; H.add(belly);   // fascia rossa in basso
    const cab = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), glassM);
    cab.scale.set(1.12, 1.0, 1.5); cab.rotation.x = -Math.PI / 2.4; cab.position.set(0, 0.2, -1.55); H.add(cab);
    for (const sx of [-1, 1]) {                                  // finestrini laterali
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.55), glassM); w.position.set(sx * 1.24, 0.25, 0.1); w.rotation.y = sx * Math.PI / 2; H.add(w);
    }
    const cowl = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.6, 6, 12), white); cowl.rotation.x = Math.PI / 2; cowl.position.set(0, 1.15, 0.4); H.add(cowl);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 5.8, 12), white); boom.rotation.x = Math.PI / 2; boom.position.set(0, 0.45, 5.1); H.add(boom);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.07, 0.5), red); stab.position.set(0, 0.45, 6.6); H.add(stab);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.9), red); fin.position.set(0, 1.1, 7.75); fin.rotation.x = -0.25; H.add(fin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.55, 8), dark); mast.position.set(0, 1.75, 0); H.add(mast);
    const rotor = new THREE.Group(); rotor.position.set(0, 2.05, 0);
    rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.18, 10), dark));
    for (let k = 0; k < 4; k++) {
      const arm = new THREE.Group(); arm.rotation.y = k * Math.PI / 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.05, 0.28), dark); b.position.x = 3.0; b.rotation.z = -0.03; arm.add(b); rotor.add(arm);
    }
    H.add(rotor);
    // disco sfocato del rotore che gira (le pale vere si vedono appena)
    const disc = new THREE.Mesh(new THREE.CircleGeometry(5.9, 40), new THREE.MeshBasicMaterial({ color: 0x15171a, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.set(0, 2.06, 0); H.add(disc);
    const trot = new THREE.Group(); trot.position.set(0.18, 1.2, 7.8);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.12), dark); b.rotation.x = k * Math.PI / 3; trot.add(b); }
    H.add(trot);
    for (const sx of [-1, 1]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.0, 8), dark); skid.rotation.x = Math.PI / 2; skid.position.set(sx * 1.1, -1.55, -0.2); H.add(skid);
      for (const z of [-1.3, 0.9]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), dark); st.position.set(sx * 0.95, -1.2, z); st.rotation.z = sx * 0.25; H.add(st); }
    }
    this.heliLights = [[0xff2010, [-1.3, 0.1, -0.2]], [0x20ff40, [1.3, 0.1, -0.2]], [0xff2010, [0, 1.62, 1.2]], [0xffffff, [0, 0.5, 7.9]]].map(([col, p]) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
      l.position.set(...p); H.add(l); return l;
    });
    this.heli = H; this.rotor = rotor; this.trot = trot;
    if (this.night) this._heliNight(H);
    this.group.add(H);
    this.nextHeli = 10 + Math.random() * 12;
    this.flight = null;
  }
  // di notte: ogni luce ha il suo alone, due strobo bianchi anticollisione (doppio lampo), un faro di ricerca sotto
  // il muso col suo fascio nella foschia, finestrini della cabina appena illuminati
  _heliNight(H) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const halo = new THREE.CanvasTexture(c);
    const glow = (parent, col, size) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      sp.scale.setScalar(size); parent.add(sp); return sp;
    };
    for (const l of this.heliLights) glow(l, l.material.color, 3.2);
    this.strobes = [[0, -0.95, 0.4], [0, 1.15, 7.6]].map(p => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      l.position.set(...p); H.add(l); glow(l, 0xffffff, 7); l.visible = false; return l;
    });
    // faro: lampada sotto il muso e cono di luce verso il basso e in avanti
    const spot = new THREE.Group(); spot.position.set(0, -1.1, -1.8); spot.rotation.x = 0.75; H.add(spot);   // (giu' e in avanti: il muso e' verso -Z)
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false, side: THREE.DoubleSide }));
    lamp.rotation.x = Math.PI / 2; spot.add(lamp); glow(lamp, 0xfff2d8, 5);
    const bc = document.createElement('canvas'); bc.width = 8; bc.height = 256; const bg = bc.getContext('2d');
    const gy = bg.createLinearGradient(0, 0, 0, 256); gy.addColorStop(0, 'rgba(255,255,255,0.9)'); gy.addColorStop(0.3, 'rgba(255,255,255,0.35)'); gy.addColorStop(1, 'rgba(255,255,255,0)');
    bg.fillStyle = gy; bg.fillRect(0, 0, 8, 256);
    const L = 90, cone = new THREE.Mesh(new THREE.ConeGeometry(9, L, 24, 1, true),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), color: 0xfff0d0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    cone.position.y = -L / 2; spot.add(cone);                  // (apice sulla lampada, si allarga verso il basso)
    this.searchCone = cone; this.searchSpot = spot;
    // di notte la fusoliera e' scura (la luce dei fari sul ring non arriva fin la'): si vedono le luci.
    // Finestrini: un filo di luce dal cruscotto
    const seen = new Map();
    H.traverse(o => {
      if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
      if (!seen.has(o.material)) { const m = o.material.clone(); m.color.multiplyScalar(0.28); if (m.clearcoat === 1) m.emissive = new THREE.Color(0x1a2a3a); seen.set(o.material, m); }
      o.material = seen.get(o.material);
    });
  }

  // percorso casuale: passaggio dritto, giro ad arco attorno alla torre (inclinato in virata) o salita dalla citta'
  _newFlight() {
    const kind = ['dritto', 'dritto', 'arco', 'arco', 'salita'][Math.floor(Math.random() * 5)];
    const a0 = Math.random() * Math.PI * 2, speed = 25 + Math.random() * 25;
    let pathFn, dur;
    if (kind === 'dritto') {
      const dir = new THREE.Vector3(Math.cos(a0), 0, Math.sin(a0)), side = new THREE.Vector3(-dir.z, 0, dir.x);
      const dist = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 220), y0 = -80 + Math.random() * 140, y1 = y0 + (Math.random() - 0.5) * 60, L = 800;
      const mid = side.clone().multiplyScalar(dist);
      pathFn = u => mid.clone().addScaledVector(dir, (u - 0.5) * L).setY(y0 + (y1 - y0) * u);
      dur = L / speed;
    } else if (kind === 'arco') {
      const R = 90 + Math.random() * 180, sweep = Math.PI * (0.6 + Math.random() * 0.9) * (Math.random() < 0.5 ? -1 : 1), y = -40 + Math.random() * 90;
      const lead = 400, sg = Math.sign(sweep);                // arriva da lontano, gira attorno alla torre, se ne va
      const at = a => new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R), tan = a => new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(sg);
      pathFn = u => {
        if (u < 0.2) return at(a0).addScaledVector(tan(a0), -(1 - u / 0.2) * lead);
        if (u > 0.8) return at(a0 + sweep).addScaledVector(tan(a0 + sweep), (u - 0.8) / 0.2 * lead);
        return at(a0 + sweep * (u - 0.2) / 0.6).setY(y + Math.sin(u * 9) * 3);
      };
      dur = (2 * lead + Math.abs(sweep) * R) / speed;
    } else {
      const dir = new THREE.Vector3(Math.cos(a0), 0, Math.sin(a0)), d0 = 120 + Math.random() * 150;
      pathFn = u => dir.clone().multiplyScalar(d0 + u * 500).setY(-170 + u * 330);   // sale dai palazzi verso il cielo
      dur = 600 / speed;
    }
    this.flight = { pathFn, dur, t: 0, prev: pathFn(0), yaw: 0 };
    this.heli.visible = true;
  }
  // ritorna la posizione (nel mondo) dell'elicottero se sta volando, per il suono
  update(dt) {
    this.t += dt;
    this.life.update(dt);
    const blink = (this.t % 1.4) < 0.25;
    for (const b of this.beacons) b.visible = blink;
    if (!this.flight) {
      this.nextHeli -= dt;
      if (this.nextHeli <= 0) this._newFlight();
      return null;
    }
    const F = this.flight; F.t += dt;
    const k = F.t / F.dur;
    if (k >= 1) { this.flight = null; this.heli.visible = false; this.nextHeli = 30 + Math.random() * 45; return null; }
    const p = F.pathFn(k), v = p.clone().sub(F.prev); F.prev = p;
    this.heli.position.copy(p);
    if (v.lengthSq() > 1e-6) {
      const yaw = Math.atan2(-v.x, -v.z);                    // muso nella direzione del volo
      let dy = Math.atan2(Math.sin(yaw - F.yaw), Math.cos(yaw - F.yaw));
      if (F.t < 0.1) { F.yaw = yaw; dy = 0; }
      F.yaw += dy;
      const bank = THREE.MathUtils.clamp(-dy / Math.max(dt, 1e-3) * 0.35, -0.5, 0.5);   // inclinato in virata
      const pitch = 0.1 + THREE.MathUtils.clamp(-v.y / Math.max(v.length(), 1e-3) * 0.3, -0.2, 0.2);
      this.heli.rotation.set(pitch, F.yaw, bank, 'YXZ');
    }
    this.rotor.rotation.y += dt * 40; this.trot.rotation.x += dt * 70;
    this.heliLights[2].visible = (this.t % 1.1) < 0.12; this.heliLights[3].visible = (this.t % 1.5) < 0.1;
    if (this.strobes) {                                // strobo: doppio lampo ogni 1,3 s, i due sfasati
      this.strobes.forEach((l, i) => { const ph = (this.t + i * 0.65) % 1.3; l.visible = ph < 0.05 || (ph > 0.14 && ph < 0.19); });
      this.searchSpot.rotation.z = Math.sin(this.t * 0.4) * 0.35;   // il faro spazzola piano a destra e sinistra
    }
    return this.heli.getWorldPosition(new THREE.Vector3());
  }
}
