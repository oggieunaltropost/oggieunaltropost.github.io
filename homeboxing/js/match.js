// Incontro vero: danno, atterramenti, conteggio dell'arbitro, KO e KO tecnico (regole del pugilato),
// e la prova per rialzarsi quando vai a terra tu.
import * as THREE from 'three';
import { t as tr } from './i18n.js?v=20261003120215';

export const ROUNDS = 3, ROUND_S = 180, REST_S = 30;

// probabilita' di atterramento dopo un colpo: cresce col danno accumulato e con la potenza del colpo
// (power ~1 = colpo pieno). Un colpo potentissimo puo' mandare giu' anche un pugile fresco.
export function knockdownChance(dmg, power, zone) {
  if (dmg >= 100) return 1;
  let p = Math.max(0, (dmg - 50) / 50) * 0.55 * power;
  if (power > 1.25) p += 0.035;                    // "flash knockdown"
  if (zone === 'body') p *= 0.4;                   // al fegato capita, ma piu' di rado
  return Math.min(0.9, p);
}

// voce dell'arbitro (se il browser ha la sintesi vocale italiana), altrimenti un "tic"
const NUM = ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'];
export function say(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT'; u.rate = 1.05; u.pitch = 0.85; u.volume = 1;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.startsWith('it'));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}
export function sayCount(n) { return say(NUM[n] || String(n)); }

// Per rialzarti: un bottone luminoso da colpire N volte (10 al primo atterramento, 20 al secondo)
// prima che l'arbitro arrivi a 10. Ogni colpo conta solo se il guantone esce dal bottone e ci rientra.
export class GetUpChallenge {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    this.target = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.35, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.95, depthTest: false }));
    this.target.rotation.x = Math.PI / 2;           // il bottone guarda verso di te
    this.target.renderOrder = 1200;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.1, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0xc4161f, depthTest: false, transparent: true }));
    ring.renderOrder = 1201;
    this.pad = new THREE.Group(); this.pad.add(this.target, ring); this.group.add(this.pad);
    // scritta sopra il bottone
    this.canvas = document.createElement('canvas'); this.canvas.width = 1024; this.canvas.height = 256;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.label = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.115),
      new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false }));
    this.label.renderOrder = 1202; this.group.add(this.label);
    this.dark = null; this.done = false; this.left = 0; this.t = 0; this.inside = { left: false, right: false }; this.bump = 0;
  }

  attachDark(camera) {
    this.dark = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x1a0606, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false }));
    this.dark.renderOrder = 1150; this.dark.visible = false;
    camera.add(this.dark);
  }

  _draw() {
    const g = this.canvas.getContext('2d'), W = 1024, H = 256;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(10,12,18,0.85)'; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffd34d'; g.font = '900 64px system-ui, sans-serif';
    g.fillText(tr('getup_title', { n: this.n }), W / 2, 80);
    g.fillStyle = '#ffffff'; g.font = '800 92px system-ui, sans-serif';
    g.fillText(tr('getup_left', { n: this.left }), W / 2, 182);
    this.tex.needsUpdate = true;
  }

  start(n, r, head, yaw) {
    this.n = n; this.left = n; this.r = r; this.done = false; this.t = 0; this.bump = 0;
    this.inside = { left: true, right: true };      // al primo fotogramma non conta niente
    const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    // davanti a te, all'altezza del petto, a portata di pugno
    const p = head.clone().addScaledVector(f, 0.5).add(new THREE.Vector3(0, -0.22, 0));
    this.pad.position.copy(p); this.pad.rotation.set(0, yaw, 0); this.pad.scale.setScalar(r);
    this.label.position.copy(p).add(new THREE.Vector3(0, r + 0.12, 0)); this.label.rotation.set(0, yaw, 0);
    this.group.visible = true;
    if (this.dark) { this.dark.visible = true; this.dark.material.opacity = 0.62; }
    this._draw();
  }

  // true quando hai colpito il bottone tutte le volte richieste
  update(dt, gloves) {
    if (!this.group.visible) return false;
    this.t += dt;
    this.bump = Math.max(0, this.bump - dt * 6);
    this.pad.scale.setScalar(this.r * (1 + 0.25 * this.bump));
    this.target.material.color.setHex(this.bump > 0.3 ? 0xffffff : 0xffd34d);
    const c = this.pad.position;
    for (const g of gloves) {
      const now = g.mesh.visible && g.center.distanceTo(c) < this.r + 0.07;
      if (now && !this.inside[g.side] && g.speed > 0.8) {   // il guantone e' appena entrato con un pugno: un colpo
        this.left--; this.bump = 1; this._draw();
        if (this.left <= 0) { this.done = true; this.stop(); return true; }
      }
      this.inside[g.side] = now;
    }
    return false;
  }

  stop() {
    this.group.visible = false;
    if (this.dark) { this.dark.visible = false; this.dark.material.opacity = 0; }
  }
}
