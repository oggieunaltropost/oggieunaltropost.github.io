// Incontro vero: danno, atterramenti, conteggio dell'arbitro, KO e KO tecnico (regole del pugilato),
// e la prova per rialzarsi quando vai a terra tu.
import * as THREE from 'three';

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

// Bersagli luminosi da colpire per rialzarsi: uno alla volta, davanti a te.
export class GetUpChallenge {
  constructor(scene) {
    this.group = new THREE.Group(); this.group.visible = false; scene.add(this.group);
    this.target = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.9, depthTest: false }));
    this.target.renderOrder = 1200;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.45, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthTest: false, side: THREE.DoubleSide }));
    ring.renderOrder = 1201; this.target.add(ring); this.ring = ring;
    this.group.add(this.target);
    // buio quando sei a terra
    this.dark = null;
    this.done = false; this.left = 0; this.t = 0;
  }

  attachDark(camera) {
    this.dark = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x1a0606, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false }));
    this.dark.renderOrder = 1150; this.dark.visible = false;
    camera.add(this.dark);
  }

  // n bersagli, raggio r: piu' atterramenti = piu' bersagli e piu' piccoli
  start(n, r, head, yaw) {
    this.left = n; this.r = r; this.done = false; this.t = 0;
    this.yaw = yaw; this.group.visible = true;
    if (this.dark) { this.dark.visible = true; this.dark.material.opacity = 0.62; }
    this._place(head);
  }

  _place(head) {
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const p = head.clone().addScaledVector(f, 0.38 + Math.random() * 0.14)
      .addScaledVector(r, (Math.random() - 0.5) * 0.6).add(new THREE.Vector3(0, -0.28 + Math.random() * 0.4, 0));
    this.target.position.copy(p);
    this.target.scale.setScalar(this.r);
  }

  // true quando hai colpito tutti i bersagli
  update(dt, gloves, head) {
    if (!this.group.visible) return false;
    this.t += dt;
    this.ring.rotation.z += dt * 3;
    this.target.material.opacity = 0.65 + 0.3 * Math.sin(this.t * 8);
    this.target.lookAt(head);
    const hit = gloves.some(g => g.mesh.visible && g.center.distanceTo(this.target.position) < this.r + 0.07);
    if (hit) {
      this.left--;
      if (this.left <= 0) { this.done = true; this.stop(); return true; }
      this._place(head);
    }
    return false;
  }

  stop() {
    this.group.visible = false;
    if (this.dark) { this.dark.visible = false; this.dark.material.opacity = 0; }
  }
}
