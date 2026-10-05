// Ombra di contatto: un velo scuro e sfumato steso sul terreno sotto un oggetto. Serve dove il terreno e' senza
// luci (luna, vulcano: e' la foto a 360 gradi che continua) e quindi non riceve ombre vere: senza, il ring e le
// cose appoggiate sembrano sospese a mezz'aria.
import * as THREE from 'three';

const texs = {};
// hole: frazione centrale vuota (per il ring: l'ombra sta tutta fuori, sul tappeto non scurisce)
function shadowTex(hole = 0) {
  if (texs[hole]) return texs[hole];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.filter = 'blur(18px)'; g.fillStyle = '#000';
  g.beginPath(); g.roundRect(40, 40, S - 80, S - 80, 30); g.fill();     // rettangolo morbido (va bene anche per i tondi)
  if (hole > 0) { g.globalCompositeOperation = 'destination-out'; g.filter = 'blur(4px)'; const hw = S * hole / 2; g.fillRect(S / 2 - hw, S / 2 - hw, 2 * hw, 2 * hw); }
  return (texs[hole] = new THREE.CanvasTexture(c));
}
export function contactShadow(w, d, opacity = 0.6, hole = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex(hole), color: 0x000000, transparent: true, opacity, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  m.rotation.x = -Math.PI / 2; m.scale.set(w * 1.45, d * 1.45, 1); m.renderOrder = -3; m.name = 'ombra di contatto';
  return m;
}
