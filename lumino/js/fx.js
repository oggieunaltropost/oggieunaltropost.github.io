// Effetti: cuoricini, bacca luminosa (obiettivo), mirino e pannello istruzioni nel visore.
import * as THREE from 'three';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const heartTex = canvasTexture(128, 128, (g, w) => {
  g.fillStyle = '#ff5f8f';
  g.beginPath();
  g.moveTo(64, 112);
  g.bezierCurveTo(8, 72, 8, 20, 40, 20);
  g.bezierCurveTo(56, 20, 64, 34, 64, 40);
  g.bezierCurveTo(64, 34, 72, 20, 88, 20);
  g.bezierCurveTo(120, 20, 120, 72, 64, 112);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath(); g.ellipse(42, 42, 10, 7, -0.6, 0, Math.PI * 2); g.fill();
});

const zzzTex = canvasTexture(128, 128, g => {
  g.fillStyle = '#bfe9ff'; g.font = 'bold 90px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('z', 64, 64);
});

// impronta di zampina: cuscinetto + 3 ditini
const pawTex = canvasTexture(128, 128, g => {
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(64, 84, 28, 24, 0, 0, Math.PI * 2); g.fill();
  for (const [x, y] of [[30, 42], [64, 28], [98, 42]]) { g.beginPath(); g.ellipse(x, y, 13, 15, 0, 0, Math.PI * 2); g.fill(); }
});
const FOOT_LIFE = 9;      // secondi prima che l'orma sparisca
const FOOT_MAX = 140;

const berryMat = new THREE.MeshStandardMaterial({ color: 0xff3d7f, emissive: 0xff2a6a, emissiveIntensity: 1.2, roughness: 0.25 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4cd964, roughness: 0.5 });
const berryGeo = new THREE.SphereGeometry(0.012, 20, 12);
const leafGeo = new THREE.SphereGeometry(0.006, 10, 6).scale(1.4, 0.35, 0.7);
const glowGeo = new THREE.SphereGeometry(0.024, 16, 10);

export function makeBerry() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(berryGeo, berryMat);
  b.castShadow = true;
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(0.004, 0.012, 0);
  leaf.rotation.z = 0.5;
  const glow = new THREE.Mesh(glowGeo,
    new THREE.MeshBasicMaterial({ color: 0xff6fa0, transparent: true, opacity: 0.18, depthWrite: false }));
  g.add(b, leaf, glow);
  g.userData.glow = glow;
  return g;
}

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // orme
    this.feetGeo = new THREE.PlaneGeometry(0.019, 0.019).rotateX(-Math.PI / 2).rotateY(Math.PI);
    this.feet = [];
    this.footIdx = 0;

    // bacca
    this.berry = makeBerry();
    this.berryGlow = this.berry.userData.glow;
    this.berry.visible = false;
    this.berryEat = 0;
    scene.add(this.berry);

    // mirini per i due controller/mani
    this.reticles = [0, 1].map(() => {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.024, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x7dffcf, transparent: true, opacity: 0.9, depthTest: false }));
      r.renderOrder = 20;
      r.visible = false;
      scene.add(r);
      return r;
    });

    // pannello istruzioni
    this.panel = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3),
      new THREE.MeshBasicMaterial({ transparent: true, depthTest: false }));
    this.panel.renderOrder = 30;
    this.panel.visible = false;
    scene.add(this.panel);
    this.panelTimer = 0;
    this.toastTimer = 0;
  }

  hearts(pos, n = 4) {
    for (let i = 0; i < n; i++) this._spawn(heartTex, pos, 0.022 + Math.random() * 0.012, i * 0.12);
  }

  // Orma luminosa su una superficie: pos sul punto di appoggio, normal della superficie, fwd direzione di marcia.
  footprint(pos, normal, fwd, hue = 0.47) {
    let m = this.feet[this.footIdx];
    if (!m) {
      m = new THREE.Mesh(this.feetGeo, new THREE.MeshBasicMaterial({
        map: pawTex, color: 0x8ffff0, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
      }));
      m.renderOrder = 7;
      this.scene.add(m);
      this.feet.push(m);
    }
    this.footIdx = (this.footIdx + 1) % FOOT_MAX;
    const z = fwd.clone().addScaledVector(normal, -fwd.dot(normal)).normalize();
    const x = new THREE.Vector3().crossVectors(normal, z).normalize();
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, normal, z));
    m.position.copy(pos).addScaledVector(normal, 0.0015);
    m.scale.setScalar(0.9 + Math.random() * 0.2);
    m.userData.t = 0;
    m.visible = true;
    m.material.opacity = 0.85;
    m.userData.hue = hue;
  }

  clearFootprints() { for (const m of this.feet) m.visible = false; }

  zzz(pos) { this._spawn(zzzTex, pos, 0.025, 0, 0.12); }

  _spawn(tex, pos, size, delay, drift = 0.05) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.setScalar(size);
    s.position.copy(pos);
    s.visible = false;
    s.userData = { t: -delay, life: 1.3, vel: new THREE.Vector3((Math.random() - 0.5) * drift, 0.12, (Math.random() - 0.5) * drift), size };
    this.scene.add(s);
    this.particles.push(s);
  }

  placeBerry(p) {
    this.berry.position.copy(p);
    this.berry.userData.base = p.y + 0.014;
    this.berry.scale.setScalar(0.01);
    this.berry.visible = true;
    this.berryEat = 0;
    this.berryGrow = 0;
  }
  eatBerry() { if (this.berry.visible) this.berryEat = 0.001; }
  hideBerry() { this.berry.visible = false; }

  setReticle(i, hit) {
    const r = this.reticles[i];
    if (!hit) { r.visible = false; return; }
    r.visible = true;
    r.position.copy(hit.point).addScaledVector(hit.normal, 0.003);
    r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hit.normal);
    r.material.color.set(hit.normal.y > 0.6 ? 0x7dffcf : 0xffb35c);
  }

  showPanel(lines, camera, seconds = 25, title = 'Lumino AR') {
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = '38px sans-serif';
    let need = Math.max(...lines.map(l => probe.measureText(l).width));
    probe.font = 'bold 62px sans-serif';
    need = Math.max(need, probe.measureText(title).width);
    const W = Math.max(1000, Math.ceil(need + 110));
    const H = Math.max(600, 230 + lines.length * 64);
    this.panel.scale.set(W / 1000, H / 600, 1);
    const tex = canvasTexture(W, H, (g, w, h) => {
      g.fillStyle = 'rgba(12,20,32,0.82)';
      g.beginPath(); g.roundRect(0, 0, w, h, 48); g.fill();
      g.strokeStyle = 'rgba(125,255,207,0.8)'; g.lineWidth = 6;
      g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, 46); g.stroke();
      g.fillStyle = '#7dffcf'; g.font = 'bold 62px sans-serif'; g.fillText(title, 50, 100);
      g.fillStyle = '#ffffff'; g.font = '38px sans-serif';
      lines.forEach((l, i) => g.fillText(l, 50, 180 + i * 64));
    });
    const old = this.panel.material.map;
    this.panel.material.map = tex;
    this.panel.material.needsUpdate = true;
    if (old) old.dispose();
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    fwd.y = 0; fwd.normalize();
    this.panel.position.copy(camera.position).addScaledVector(fwd, 0.75);
    this.panel.position.y -= 0.12;
    this.panel.lookAt(camera.position.x, this.panel.position.y, camera.position.z);
    this.panel.visible = true;
    this.panel.material.opacity = 1;
    this.panelTimer = seconds;
  }

  burst(pos, color, size = 1) {
    this.bits ||= [];
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    const geo = Fx.bitGeo ||= new THREE.IcosahedronGeometry(0.006, 0);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      m.scale.setScalar(size * (0.6 + Math.random() * 0.9));
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.2, Math.random() - 0.5).normalize()
        .multiplyScalar((0.5 + Math.random() * 0.7) * Math.sqrt(size));
      m.userData = { v, t: 0, life: 0.55 + Math.random() * 0.3 };
      this.scene.add(m);
      this.bits.push(m);
    }
    const flash = new THREE.Mesh(Fx.flashGeo ||= new THREE.SphereGeometry(1, 16, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    flash.position.copy(pos);
    flash.userData = { flash: true, t: 0, life: 0.18, size: 0.05 * size };
    this.scene.add(flash);
    this.bits.push(flash);
  }

  update(dt, time) {
    for (let i = (this.bits?.length ?? 0) - 1; i >= 0; i--) {
      const m = this.bits[i], u = m.userData;
      u.t += dt;
      const k = u.t / u.life;
      if (u.flash) { m.scale.setScalar(u.size * (0.4 + k)); m.material.opacity = 0.9 * (1 - k); }
      else { u.v.y -= 3 * dt; m.position.addScaledVector(u.v, dt); m.rotation.x += dt * 9; m.material.opacity = 1 - k * k; }
      if (k >= 1) { this.scene.remove(m); this.bits.splice(i, 1); }
    }
    for (const m of this.feet) {
      if (!m.visible) continue;
      const t = (m.userData.t += dt);
      // brillano appena lasciate, poi sbiadiscono piano
      m.material.opacity = t < FOOT_LIFE * 0.6 ? 0.85 - t * 0.04 : Math.max(0, (FOOT_LIFE - t) / (FOOT_LIFE * 0.4)) * 0.6;
      m.material.color.setHSL(m.userData.hue, 1, 0.78 - Math.min(0.2, t * 0.05));
      if (t >= FOOT_LIFE) m.visible = false;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const s = this.particles[i], u = s.userData;
      u.t += dt;
      if (u.t < 0) continue;
      s.visible = true;
      s.position.addScaledVector(u.vel, dt);
      const k = u.t / u.life;
      s.material.opacity = 1 - k * k;
      s.scale.setScalar(u.size * (0.6 + Math.min(1, u.t * 6) * 0.4 + k * 0.3));
      if (k >= 1) { this.scene.remove(s); s.material.dispose(); this.particles.splice(i, 1); }
    }
    if (this.berry.visible) {
      this.berry.rotation.y += dt * 1.5;
      this.berryGlow.material.opacity = 0.14 + 0.08 * Math.sin(time * 5);
      if (this.berryEat > 0) {
        this.berryEat += dt;
        this.berry.scale.setScalar(Math.max(0.001, 1 - this.berryEat * 4));
        if (this.berryEat > 0.25) this.berry.visible = false;
      } else {
        this.berryGrow = Math.min(1, this.berryGrow + dt * 5);
        const s = this.berryGrow;
        this.berry.scale.setScalar(s < 1 ? 1 + Math.sin(s * Math.PI) * 0.4 : 1);
        this.berry.position.y = this.berry.userData.base + Math.sin(time * 3) * 0.003;
      }
    }
    if (this.panel.visible) {
      this.panelTimer -= dt;
      if (this.panelTimer < 1) this.panel.material.opacity = Math.max(0, this.panelTimer);
      if (this.panelTimer <= 0) this.panel.visible = false;
    }
  }
}
