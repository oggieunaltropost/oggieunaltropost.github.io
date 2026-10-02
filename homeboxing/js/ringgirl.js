// La ragazza del ring: tra un round e l'altro fa il giro del ring con il cartello del round successivo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SPEED = 0.62;          // m/s: un ciclo di camminata (1 s) = 62 cm (blender/create_ringgirl.py)

export class RingGirl {
  constructor(scene) {
    this.root = new THREE.Group(); this.root.name = 'ragazza del ring'; this.root.visible = false;
    scene.add(this.root);
    this.canvas = document.createElement('canvas'); this.canvas.width = 512; this.canvas.height = 360;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.ready = false;
  }

  async load(url = 'assets/ringgirl.glb') {
    const g = await new GLTFLoader().loadAsync(url);
    this.model = g.scene; this.root.add(this.model);
    this.model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true;
      const n = o.material.name || '';
      if (n === 'Cartello') { o.material = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }); this.card = o; }
      else if (/eyebrow|eyelash|ponytail/.test(n)) { o.material.alphaTest = 0.4; o.material.transparent = false; }
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.walk = this.mixer.clipAction(g.animations.find(a => a.name === 'cammina'));
    this.stand = this.mixer.clipAction(g.animations.find(a => a.name === 'ferma'));
    this.walk.play(); this.stand.play(); this.stand.setEffectiveWeight(0);
    this.ready = true;
  }

  _draw(round) {
    const g = this.canvas.getContext('2d'), W = 512, H = 360;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c4161f'; g.fillRect(0, 0, W, 22); g.fillRect(0, H - 22, W, 22);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#111'; g.font = '900 78px system-ui, sans-serif'; g.fillText('ROUND', W / 2, 98);
    g.fillStyle = '#c4161f'; g.font = '900 190px system-ui, sans-serif'; g.fillText(String(round), W / 2, 240);
    this.tex.needsUpdate = true;
  }

  // giro del ring a 50 cm dalle corde; parte dall'angolo lontano a sinistra
  start(arena, ringSize, round) {
    if (!this.ready) return;
    this._draw(round);
    const a = ringSize / 2 - 0.5;
    const pts = [[-a, -a], [a, -a], [a, a], [-a, a]].map(([x, z]) => new THREE.Vector3(x, 0, z).applyMatrix4(arena.matrixWorld));
    this.path = [...pts, pts[0]];
    this.seg = 0; this.u = 0; this.pause = 0; this.paused = false;
    this.root.position.copy(pts[0]);
    this.root.visible = true;
  }
  stop() { this.root.visible = false; }

  update(dt, look) {
    if (!this.root.visible || !this.ready) return;
    let a = this.path[this.seg], b = this.path[this.seg + 1];
    const len = a.distanceTo(b);
    // a meta' del lato davanti a te si ferma un attimo e mostra il cartello
    if (!this.paused && this.seg === 2 && this.u > 0.5) { this.paused = true; this.pause = 2.5; }
    const stopNow = this.pause > 0;
    if (stopNow) this.pause -= dt;
    else {
      this.u += SPEED * dt / Math.max(0.01, len);
      if (this.u >= 1) { this.u = 0; this.seg = (this.seg + 1) % (this.path.length - 1); a = this.path[this.seg]; b = this.path[this.seg + 1]; }
    }
    this.root.position.lerpVectors(a, b, this.u);
    const dir = b.clone().sub(a);
    let yaw = Math.atan2(dir.x, dir.z);
    if (stopNow) yaw = Math.atan2(look.x - this.root.position.x, look.z - this.root.position.z);
    let dy = Math.atan2(Math.sin(yaw - this.root.rotation.y), Math.cos(yaw - this.root.rotation.y));
    this.root.rotation.y += Math.max(-4 * dt, Math.min(4 * dt, dy));
    const w = stopNow ? 1 : 0;
    this.stand.setEffectiveWeight(w); this.walk.setEffectiveWeight(1 - w);
    this.mixer.update(dt);
    this.root.updateMatrixWorld(true);
    if (this.card) this.card.lookAt(look);       // il cartello e' sempre girato verso di te
  }
}
