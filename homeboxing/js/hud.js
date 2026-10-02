// Tabellone dei punti (pannello 3D con una canvas) e lampo rosso quando Mike ti colpisce.
import * as THREE from 'three';

export class Scoreboard {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024; this.canvas.height = 560;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    // Disegnato subito dopo le pareti/mobili invisibili e senza controllare la profondita': i mobili
    // non lo coprono. Scrive pero' la sua profondita', quindi Mike (davanti) ci passa sopra.
    // (con depthTest spento WebGL non scrive la profondita': per questo si usa AlwaysDepth)
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, depthFunc: THREE.AlwaysDepth, depthWrite: true, fog: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.6), mat);
    this.mesh.name = 'tabellone';
    this.mesh.renderOrder = -5;
    // cornice
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.66, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x15171d, depthFunc: THREE.AlwaysDepth, depthWrite: true, fog: false }));
    frame.position.z = -0.02; frame.renderOrder = -6; this.mesh.add(frame);
    this.last = '';
  }

  draw(s) {
    const key = JSON.stringify(s);
    if (key === this.last) return;
    this.last = key;
    const g = this.canvas.getContext('2d'), W = 1024, H = 560;
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd34d'; g.font = '900 54px system-ui, sans-serif';
    g.fillText(`ROUND ${s.round}`, W * 0.2, 52);
    g.fillStyle = '#c9ced8'; g.font = '700 34px system-ui, sans-serif';
    g.fillText((s.level || '').toUpperCase(), W * 0.45, 54);
    const mm = Math.floor(s.time / 60), ss = String(Math.floor(s.time % 60)).padStart(2, '0');
    g.fillStyle = s.time < 10 && s.running ? '#ff5a5a' : '#ffffff';
    g.font = '800 64px ui-monospace, monospace';
    g.fillText(`${mm}:${ss}`, W * 0.72, 54);
    // colonne giocatore / Mike
    const col = (x, name, color, p) => {
      g.fillStyle = color; g.fillRect(x - 230, 100, 460, 64);
      g.fillStyle = '#fff'; g.font = '800 44px system-ui, sans-serif'; g.fillText(name, x, 133);
      g.font = '900 150px system-ui, sans-serif'; g.fillText(p.points, x, 250);
      g.font = '500 30px system-ui, sans-serif'; g.fillStyle = '#c9ced8';
      g.fillText(`Colpi a segno ${p.hits}`, x, 360);
      g.fillText(`Parate ${p.blocks}   Schivate ${p.dodges}`, x, 400);
    };
    col(W * 0.27, 'TU', '#c4161f', s.player);
    col(W * 0.73, 'MIKE', '#1a49b8', s.mike);
    g.fillStyle = '#2a2f3a'; g.fillRect(W / 2 - 2, 110, 4, 300);
    g.fillStyle = '#ffffff'; g.font = '700 34px system-ui, sans-serif';
    g.fillText(s.message || '', W / 2, 482);
    g.fillStyle = '#9aa3b6'; g.font = '500 27px system-ui, sans-serif';
    g.fillText(s.diag || '', W / 2, 535);
    this.tex.needsUpdate = true;
  }
}

// lampo rosso attaccato alla testa
export class HitFlash {
  constructor(camera) {
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff1010, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false }));
    this.mesh.renderOrder = 999;
    camera.add(this.mesh);
    this.v = 0;
  }
  hit(strength = 1) { this.v = Math.min(0.6, 0.35 * strength + 0.15); }
  update(dt) {
    this.v = Math.max(0, this.v - dt * 1.6);
    this.mesh.material.opacity = this.v;
    this.mesh.visible = this.v > 0.001;
  }
}
