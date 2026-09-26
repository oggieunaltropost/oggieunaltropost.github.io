// Menu' a pagine davanti a te: una pagina ha un titolo, un testo facoltativo (regole, statistiche)
// e dei pulsanti. I pulsanti si premono toccandoli con l'indice oppure puntandoli e facendo pizzico/grilletto.
import * as THREE from 'three';

const BW = 0.13, BH = 0.024, GAP = 0.006;
const INFO_W = 0.27;        // larghezza (m) del testo a 1000 px di canvas

function drawButton(canvas, label, hover, flash, disabled) {
  const g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  g.globalAlpha = disabled ? 0.35 : 1;
  g.fillStyle = flash ? '#7dffcf' : hover && !disabled ? 'rgba(53,198,192,0.95)' : 'rgba(18,32,48,0.92)';
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 34); g.fill();
  g.strokeStyle = 'rgba(125,255,207,0.85)'; g.lineWidth = 5;
  g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 34); g.stroke();
  g.fillStyle = (flash || hover) && !disabled ? '#06201f' : '#ffffff';
  g.font = '600 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = 44;
  while (g.measureText(label).width > w - 40 && size > 26) { size -= 2; g.font = `600 ${size}px sans-serif`; }
  g.fillText(label, w / 2, h / 2 + 2);
  g.globalAlpha = 1;
}

export class Menu {
  // onAction(id): chiamata quando si preme un pulsante
  constructor(scene, onAction) {
    this.onAction = onAction;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.mode = null;
    this.buttons = [];
    this.raycaster = new THREE.Raycaster();
    this.pokeLock = 0;
    this.infoCanvas = document.createElement('canvas');
    this.infoTex = new THREE.CanvasTexture(this.infoCanvas);
    this.infoTex.colorSpace = THREE.SRGBColorSpace;
    this.info = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.infoTex, transparent: true, depthTest: false }));
    this.info.renderOrder = 39;
    this.group.add(this.info);
  }

  get open() { return this.group.visible; }
  get items() { return this.page?.items ?? []; }

  // page: { title, info: () => string[], items: [{ id, label: () => string, disabled?: () => bool }] }
  setPage(page) {
    for (const b of this.buttons) { this.group.remove(b.mesh); b.tex.dispose(); b.mesh.material.dispose(); }
    this.page = page;
    this.buttons = page.items.map(it => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 104;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }));
      m.renderOrder = 40;
      this.group.add(m);
      return { mesh: m, canvas, tex, item: it, hover: false, flash: 0 };
    });
    // piu' di 6 voci: due colonne
    const cols = page.cols ?? (page.items.length > 6 ? 2 : 1), rows = Math.ceil(page.items.length / cols);
    this.cols = cols;
    this.buttons.forEach((b, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      b.mesh.position.set((col - (cols - 1) / 2) * (BW + GAP), -row * (BH + GAP), 0);
    });
    this.rows = rows;
    this.infoKey = null;
    this.pokeLock = 0.5;   // il dito che ha appena premuto non preme subito anche la pagina nuova
    this.redraw(true);
  }

  redraw(force = false) {
    for (const b of this.buttons) {
      const label = b.item.label();
      const disabled = !!b.item.disabled?.();
      const key = label + b.hover + (b.flash > 0) + disabled;
      if (!force && key === b.key) continue;
      b.key = key;
      drawButton(b.canvas, label, b.hover, b.flash > 0, disabled);
      b.tex.needsUpdate = true;
    }
    this.drawInfo(force);
  }

  // titolo + testo sopra ai pulsanti; la larghezza segue la riga piu' lunga
  drawInfo(force) {
    const title = this.page?.title ?? '';
    const lines = this.page?.info?.() ?? [];
    const key = title + '|' + lines.join('|');
    if (!force && key === this.infoKey) return;
    this.infoKey = key;
    this.info.visible = !!(title || lines.length);
    if (!this.info.visible) return;
    const g = this.infoCanvas.getContext('2d');
    g.font = '32px sans-serif';
    let wText = Math.max(0, ...lines.map(l => g.measureText(l).width));
    g.font = 'bold 50px sans-serif';
    wText = Math.max(wText, g.measureText(title).width);
    const buttonsW = (this.cols * BW + (this.cols - 1) * GAP) / INFO_W * 1000;
    const W = Math.ceil(Math.max(buttonsW, wText + 80));
    const H = (title ? 90 : 20) + lines.length * 46 + 24;
    this.infoCanvas.width = W; this.infoCanvas.height = H;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(12,20,32,0.9)';
    g.beginPath(); g.roundRect(0, 0, W, H, 34); g.fill();
    g.strokeStyle = 'rgba(125,255,207,0.7)'; g.lineWidth = 5;
    g.beginPath(); g.roundRect(3, 3, W - 6, H - 6, 32); g.stroke();
    let y = 20;
    if (title) { g.fillStyle = '#7dffcf'; g.font = 'bold 50px sans-serif'; g.textBaseline = 'top'; g.fillText(title, 40, y + 8); y += 80; }
    g.fillStyle = '#ffffff'; g.font = '32px sans-serif'; g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, 40, y + i * 46));
    this.infoTex.dispose();
    this.infoTex = new THREE.CanvasTexture(this.infoCanvas);
    this.infoTex.colorSpace = THREE.SRGBColorSpace;
    this.info.material.map = this.infoTex;
    this.info.material.needsUpdate = true;
    const wM = W / 1000 * INFO_W, hM = H / 1000 * INFO_W;
    this.info.scale.set(wM, hM, 1);
    this.info.position.set(0, BH / 2 + GAP * 1.5 + hM / 2, 0);
  }

  show(mode, camera, dist = 0.6) {
    this.mode = mode;
    this.group.visible = true;
    this.group.scale.setScalar(1.5);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    this.group.position.copy(camera.position).addScaledVector(fwd, dist);
    this.group.position.y -= 0.06;
    this.group.lookAt(camera.position);
    this.redraw(true);
  }

  hide() { this.group.visible = false; this.mode = null; }

  toggleWorld(camera, dist = 0.6) { if (this.open) this.hide(); else this.show('world', camera, dist); }

  // raggio da controller o mano: restituisce il pulsante colpito
  hit(origin, dir) {
    if (!this.open) return null;
    this.raycaster.set(origin, dir);
    const hits = this.raycaster.intersectObjects(this.buttons.map(b => b.mesh), false);
    if (!hits.length) return null;
    return { button: this.buttons.find(b => b.mesh === hits[0].object), distance: hits[0].distance };
  }

  setHover(buttons) {
    for (const b of this.buttons) b.hover = buttons.includes(b);
  }

  press(b) {
    if (!this.buttons.includes(b) || b.item.disabled?.()) return;
    b.flash = 0.18;
    this.pokeLock = 0.6;
    this.onAction(b.item.id);
    if (this.open) this.redraw(true);
  }

  // tocco con la punta dell'indice
  poke(tips) {
    if (!this.open || this.pokeLock > 0) return;
    const local = new THREE.Vector3();
    for (const tip of tips) {
      for (const b of this.buttons) {
        b.mesh.worldToLocal(local.copy(tip));
        if (Math.abs(local.x) < BW / 2 && Math.abs(local.y) < BH / 2 && local.z < 0.012 && local.z > -0.02) {
          this.press(b);
          return;
        }
      }
    }
  }

  update(dt) {
    if (!this.open) return;
    this.pokeLock -= dt;
    for (const b of this.buttons) b.flash -= dt;
    this.redraw();
  }
}
