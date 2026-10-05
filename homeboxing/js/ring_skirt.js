// Base del ring: un ring vero e' rialzato (~90 cm). Negli stage all'aperto con il terreno vero (luna, vulcano, neve)
// il terreno sta piu' in basso e i lati della piattaforma sono coperti da un telo blu con la scritta HOME BOXING.
import * as THREE from 'three';

function skirtTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#14203a'; g.fillRect(0, 0, 1024, 256);
  for (let x = 0; x < 1024; x += 32) {                           // pieghe verticali del telo
    const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.04)'); gr.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = gr; g.fillRect(x, 0, 32, 256);
  }
  g.fillStyle = '#c9d6e2'; g.fillRect(0, 0, 1024, 10);           // bordino in alto
  g.font = '900 96px Impact, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f2ece0'; g.fillText('HOME BOXING', 512, 135);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class RingSkirt {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'base del ring'; this.group.visible = false;
    const mat = new THREE.MeshStandardMaterial({ map: skirtTex(), roughness: 0.9, side: THREE.DoubleSide });
    this.sides = [0, 1, 2, 3].map(k => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.receiveShadow = true; this.group.add(m); return m; });
  }
  set(size, drop) {
    this.group.visible = drop > 0.01; if (!this.group.visible) return;
    const h = size / 2 + 0.3, w = size + 0.6;
    this.sides.forEach((m, k) => {
      const a = k * Math.PI / 2;
      m.scale.set(w, drop, 1); m.position.set(Math.sin(a) * h, -drop / 2 + 0.001, Math.cos(a) * h); m.rotation.set(0, a, 0);
    });
  }
}
