// Mike: modello animato + intelligenza artificiale (si muove, para, schiva, attacca).
// icone sui calzoncini (accanto al nome)
function drawIcon(g, kind, cx, cy, w) {
  g.save(); g.translate(cx, cy);
  const r = (x, y, ww, hh, c, rad = 0) => { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, ww, hh, rad); g.fill(); };
  if (kind === 'panino') {                                           // panino: pane col sesamo, insalata, pomodoro, formaggio, carne
    const W = w, H = w * 0.92;
    g.fillStyle = '#d98a2b'; g.beginPath(); g.ellipse(0, -H * 0.16, W * 0.5, H * 0.34, 0, Math.PI, 0); g.fill();   // pane sopra
    g.fillStyle = '#fff3c4'; for (const [sx, sy] of [[-0.25, -0.32], [-0.05, -0.38], [0.18, -0.33], [0.32, -0.24], [-0.36, -0.22], [0.06, -0.26]]) { g.beginPath(); g.ellipse(sx * W, sy * H, 4.5, 2.6, 0.3, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#3fa535'; g.beginPath(); g.moveTo(-W * 0.52, -H * 0.15);                                      // insalata ondulata
    for (let k = 0; k <= 10; k++) g.lineTo(-W * 0.52 + k * W * 0.104, -H * 0.15 + (k % 2 ? 9 : 0));
    g.lineTo(W * 0.52, -H * 0.04); g.lineTo(-W * 0.52, -H * 0.04); g.fill();
    r(-W * 0.48, -H * 0.06, W * 0.96, H * 0.1, '#d8261c', 6);                                                    // pomodoro
    g.fillStyle = '#ffcc1f'; g.beginPath(); g.moveTo(-W * 0.5, H * 0.04); g.lineTo(W * 0.5, H * 0.04); g.lineTo(W * 0.18, H * 0.16); g.lineTo(-W * 0.1, H * 0.1); g.fill();   // formaggio
    r(-W * 0.5, H * 0.08, W, H * 0.16, '#5a2e14', 10);                                                            // carne
    r(-W * 0.48, H * 0.25, W * 0.96, H * 0.16, '#e09a3c', 12);                                                    // pane sotto
  } else if (kind === 'sole') {                                      // sol levante: disco bianco col cerchio rosso
    g.fillStyle = '#f4f3ee'; g.beginPath(); g.roundRect(-w * 0.5, -w * 0.36, w, w * 0.72, 8); g.fill();
    g.fillStyle = '#c4122a'; g.beginPath(); g.arc(0, 0, w * 0.22, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
import * as THREE from 'three';
export { StyleLearner } from './style_learn.js?v=20261008003909';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const _lq = new THREE.Quaternion(), _lr = new THREE.Quaternion(), _qI = new THREE.Quaternion(), _lp = new THREE.Vector3(), _ld = new THREE.Vector3();

// Caratteristiche dell'avversario: per i prossimi pugili bastera' cambiare questi numeri.
export const MIKE = {
  name: 'Mike',
  stalkDist: 1.0,             // distanza di studio (m)
  attackDist: 0.70,           // distanza da cui colpisce
};

// Combinazioni della boxe. Numeri: 1 jab, 2 diretto, 3 gancio sinistro, 4 gancio destro,
// 5 montante sinistro, 6 montante destro; "b" = al corpo. Dentro ci possono stare schivate e abbassate.
const C = {
  // (2026-10-05: per i nuovi pugili) '3': ['hook_l'], '4': ['hook_r'], '1-3-4': ['jab', 'hook_l', 'hook_r'], '2-1-2': ['cross', 'jab', 'cross'], '1-1-2-schivata-2': ['jab', 'jab', 'cross', 'slip_r', 'cross'], '5': ['uppercut_l'], '6': ['uppercut_r'], '2-5': ['cross', 'uppercut_l'], '1-2-5': ['jab', 'cross', 'uppercut_l'], '3-6': ['hook_l', 'uppercut_r'], '1-schivata-6': ['jab', 'slip_r', 'uppercut_r'], '2b-3': ['body_r', 'hook_l'], '3b-4b': ['body_l', 'body_r'], '2-3b-2': ['cross', 'body_l', 'cross'], '1-2-3b-3': ['jab', 'cross', 'body_l', 'hook_l'], '4b-3': ['body_r', 'hook_l'], '1-2-1-2': ['jab', 'cross', 'jab', 'cross'], '2-3-2-3': ['cross', 'hook_l', 'cross', 'hook_l'], '1-1-2-3': ['jab', 'jab', 'cross', 'hook_l'], '1-2-1-2-3': ['jab', 'cross', 'jab', 'cross', 'hook_l'],
  '1': ['jab'], '2': ['cross'], '1-1': ['jab', 'jab'], '1-2': ['jab', 'cross'], '1-1-2': ['jab', 'jab', 'cross'],
  '1-2-3': ['jab', 'cross', 'hook_l'], '1-2-3-2': ['jab', 'cross', 'hook_l', 'cross'], '3-2': ['hook_l', 'cross'],
  '2-3': ['cross', 'hook_l'], '3-2-3': ['hook_l', 'cross', 'hook_l'], '2-3-2': ['cross', 'hook_l', 'cross'],
  '1-6': ['jab', 'uppercut_r'], '1-6-3-2': ['jab', 'uppercut_r', 'hook_l', 'cross'], '5-2': ['uppercut_l', 'cross'],
  '6-3': ['uppercut_r', 'hook_l'], '1-2-5-2': ['jab', 'cross', 'uppercut_l', 'cross'], '3-4': ['hook_l', 'hook_r'],
  '1-schivata-2': ['jab', 'slip_r', 'cross'], '1-2-schivata-2-3': ['jab', 'cross', 'slip_l', 'cross', 'hook_l'],
  '1-2-abbassata-3-2': ['jab', 'cross', 'duck', 'hook_l', 'cross'], 'abbassata-6-3': ['duck', 'uppercut_r', 'hook_l'],
  '2b': ['body_r'], '1-2b': ['jab', 'body_r'], '3b-3': ['body_l', 'hook_l'], '2-3b': ['cross', 'body_l'],
  '1-3b-3': ['jab', 'body_l', 'hook_l'], '2b-3-2': ['body_r', 'hook_l', 'cross'], '3b-4': ['body_l', 'hook_r'],
  '6-3b-3': ['uppercut_r', 'body_l', 'hook_l'],
  // per i pugili nuovi: jab doppiati, ganci a ripetizione, lavoro al corpo
  '1-2-1': ['jab', 'cross', 'jab'], '1-2-3-4': ['jab', 'cross', 'hook_l', 'hook_r'], '4-3': ['hook_r', 'hook_l'],
  '3-4-3': ['hook_l', 'hook_r', 'hook_l'], '3b-3b': ['body_l', 'body_l'], '2-3b-3': ['cross', 'body_l', 'hook_l'],
  '1-2-3b': ['jab', 'cross', 'body_l'], '5-6': ['uppercut_l', 'uppercut_r'],
};
const combos = (...names) => names.map(n => C[n]);
// se tieni la guardia alta, Mike lavora al corpo e con montanti e ganci che entrano di lato
const BODY_COMBOS = combos('2b', '1-2b', '3b-3', '2-3b', '1-3b-3', '2b-3-2', '3b-4', '6-3b-3', '5-2', '3-4');
// contrattacchi: [tipo del tuo pugno][difesa usata] -> risposte possibili
const COUNTER_TABLE = {
  jab: { slip: combos('2', '2-3', '6-3'), duck: combos('6-3', '2b-3-2'), block: combos('1-2', '2') },
  cross: { slip: combos('3-2', '3-2', '5-2'), duck: combos('3-2', '5-2'), block: combos('1-2', '3-2') },
  hook: { duck: combos('6-3', '3-2', '3b-3'), slip: combos('2-3'), block: combos('5-2', '1-2') },
  body: { block_low: combos('3-2', '2-3', '3-4'), back: combos('1-2') },
};
const COUNTERS = combos('2', '3-2', '1-2', '6-3');
// quante volte lascia un colpo appena partito per schivare il tuo (poi rientra col contrattacco)
// quante volte un attacco comincia con una finta (per i pugili tecnici, con le finte nel loro stile, x1,35)
const FEINT = { normale: 0.1, difficile: 0.25, impossibile: 0.4 };
const BAIL = { normale: 0.05, difficile: 0.15, impossibile: 0.25 };
// per chi si difende sempre allo stesso modo (lo impara durante l'incontro): schivi verso la sua sinistra -> gancio
// sinistro, verso la sua destra -> gancio destro, ti abbassi -> montante, arretri -> jab doppio e diretto,
// chiudi la guardia -> al corpo
const PUNISH = { slip_l: combos('1-2-3', '2-3'), slip_r: combos('1-2-3-4', '3-4'), duck: combos('1-6', '5-2', '6-3'),
  back: combos('1-1-2', '1-2-1'), block: combos('1-2b', '2-3b', '3b-3') };
const MOVES = new Set(['slip_l', 'slip_r', 'duck']);
const DEFENSES = new Set(['slip_l', 'slip_r', 'duck', 'block', 'block_low', 'back']);

// Livelli. reactChance = quante volte reagisce a un tuo pugno; reactDelay = riflessi (s);
// threatDist/threatSpeed = da quanto lontano e da che velocita' "legge" il pugno;
// defenseSpeed = rapidita' di parate e schivate; smart = sceglie la difesa giusta per il colpo;
// chain = difende anche il secondo pugno di una combinazione; counterChance = contrattacco;
// guardReach = quanto copre la guardia normale (senza parare apposta);
// openFactor = quanto reagisce subito dopo che hai parato/schivato un suo colpo (la tua finestra per colpire);
// bodyBias = quanto va al corpo se tieni la guardia alta; feints = finte al secondo mentre ti studia;
// lowGuard = quanto spesso abbassa la guardia mentre ti studia (e lascia la testa scoperta);
// readGuard = quanto spesso mira dove sei scoperto; evade = se si sta gia' difendendo quando arriva il tuo colpo,
// probabilita' che vada a vuoto; reflex = probabilita' di evitarlo all'ultimo anche senza essersi preparato;
// toughness = quanto danno incassa dai tuoi colpi (1 = normale).
export const LEVELS = {
  facile: { label: 'Facile', readGuard: 0.45, evade: 0.05, reflex: 0.0, toughness: 1.3, guardReach: -0.03, stalkDist: 0.85, openFactor: 0.1, reactChance: 0.35, reactDelay: [0.14, 0.24],
    attackEvery: [2.6, 4.2], retreatTime: 0.9, punchSpeed: 0.4, moveSpeed: 0.6, defenseSpeed: 1.1, threatDist: 0.8,
    threatSpeed: 1.6, smart: false, chain: false, counterChance: 0.1, blockReach: 0.07, bodyBias: 0.15, feints: 0, lowGuard: 0.6,
    combos: combos('1', '2', '1-2', '1-1', '1-1-2', '2-3') },
  normale: { label: 'Normale', readGuard: 0.8, evade: 0.38, reflex: 0.12, toughness: 1.0, guardReach: 0.0, stalkDist: 0.9, openFactor: 0.25, reactChance: 0.68, reactDelay: [0.05, 0.13],
    attackEvery: [0.9, 1.8], retreatTime: 0.5, punchSpeed: 1.0, moveSpeed: 0.9, defenseSpeed: 1.35, threatDist: 0.95,
    threatSpeed: 1.3, smart: false, chain: false, counterChance: 0.35, blockReach: 0.09, bodyBias: 0.45, feints: 0.08, lowGuard: 0.5,
    combos: combos('1', '1-2', '1-1-2', '1-2-3', '3-2', '2-3', '1-6', '1-2b', '1-schivata-2') },
  difficile: { label: 'Difficile', readGuard: 0.96, evade: 0.75, reflex: 0.42, toughness: 0.7, guardReach: 0.03, stalkDist: 0.95, openFactor: 0.45, reactChance: 0.9, reactDelay: [0.02, 0.06],
    attackEvery: [0.35, 0.85], retreatTime: 0.28, punchSpeed: 1.25, moveSpeed: 1.15, defenseSpeed: 1.75, threatDist: 1.25,
    threatSpeed: 0.95, smart: true, chain: true, counterChance: 0.65, blockReach: 0.11, bodyBias: 0.65, feints: 0.15, lowGuard: 0.4,
    combos: combos('1-2', '1-1-2', '1-2-3', '1-2-3-2', '1-6-3-2', '3-2-3', '2-3-2', '1-2-5-2', '1-schivata-2',
      '1-2-schivata-2-3', '1-2-abbassata-3-2', 'abbassata-6-3', '1-3b-3') },
  impossibile: { label: 'Impossibile', readGuard: 1.0, evade: 0.97, reflex: 0.9, toughness: 0.35, guardReach: 0.07, stalkDist: 1.0, openFactor: 0.95, reactChance: 1.0, reactDelay: [0.0, 0.0],
    attackEvery: [0.12, 0.4], retreatTime: 0.12, punchSpeed: 1.5, moveSpeed: 1.4, defenseSpeed: 2.4, threatDist: 1.6,
    threatSpeed: 0.7, smart: true, chain: true, counterChance: 0.85, blockReach: 0.15, bodyBias: 0.85, feints: 0.22, lowGuard: 0.3,
    combos: combos('1-2-3', '1-2-3-2', '1-6-3-2', '3-2-3', '2-3-2', '1-2-5-2', '1-2-schivata-2-3',
      '1-2-abbassata-3-2', 'abbassata-6-3', '1-schivata-2', '6-3b-3', '2b-3-2', '3-4') },
};

// finestre "attive" dei pugni, in fotogrammi a 30 fps (quando il guantone puo' colpire)
const PUNCH = {
  jab: { side: 'l', from: 2, to: 6, zone: 'head' },
  cross: { side: 'r', from: 3, to: 8, zone: 'head' },
  hook_l: { side: 'l', from: 7, to: 12, zone: 'head' },
  hook_r: { side: 'r', from: 8, to: 13, zone: 'head' },
  body_l: { side: 'l', from: 5, to: 10, zone: 'body' },
  body_r: { side: 'r', from: 3, to: 8, zone: 'body' },
  uppercut_l: { side: 'l', from: 4, to: 8, zone: 'head' },
  uppercut_r: { side: 'r', from: 4, to: 9, zone: 'head' },
};
// parte "ferma" delle difese (fotogrammi): la tiene finche' il tuo pugno e' ancora in arrivo
const HOLD = { block: [3, 12], block_low: [3, 12], slip_l: [4, 10], slip_r: [4, 10], duck: [5, 11] };

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3();
const _q = new THREE.Quaternion();
const STEP_SPEED = 0.22 / 0.5;    // un ciclo di passi (0,5 s) avanza di 22 cm

function rand(a, b) { return a + Math.random() * (b - a); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// distanza tra il punto p e il segmento ab
function distPointSeg(p, a, b) {
  _a.subVectors(b, a); const l2 = _a.lengthSq();
  let t = l2 > 1e-9 ? _b.subVectors(p, a).dot(_a) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return _c.copy(a).addScaledVector(_a, t).distanceTo(p);
}
// distanza (approssimata) tra due segmenti: campiona il primo
function distSegSeg(a0, a1, b0, b1) {
  let best = Infinity;
  for (let i = 0; i <= 6; i++) {
    _d.lerpVectors(a0, a1, i / 6);
    best = Math.min(best, distPointSeg(_d.clone(), b0, b1));
  }
  return best;
}

export async function loadMikeGLTF(url, onProgress) {
  return new GLTFLoader().loadAsync(url, e => onProgress && e.total && onProgress(e.loaded / e.total));
}

export class Mike {
  constructor(gltf, scene, level = 'normale', cfg = null) {
    this.cfg0 = cfg || {};                                 // aspetto del personaggio (fighters.js)
    this.setLevel(level);
    this.root = new THREE.Group(); this.root.name = 'Mike';
    this.model = gltf.scene;
    this.root.add(this.model);
    scene.add(this.root);
    this.model.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.castShadow = true;
      const m = o.material, n = m.name || '';
      // capelli rasati: ritaglio netto invece della trasparenza (che sulla nuca "sfarfallava" con la pelle)
      if (n === 'Raso blu' || n === 'Raso bianco') { m.sheen = 0; m.roughness = Math.max(m.roughness, 0.42); }   // raso: niente velo bianco (li sbiancava)
      if (n === 'Capelli folti') { m.transparent = false; m.depthWrite = true; m.alphaTest = 0.5; m.side = THREE.DoubleSide; m.roughness = 0.6; }   // capelli veri (Bruce)
      else if (n === 'Capelli') { m.transparent = false; m.depthWrite = true; m.vertexColors = true; m.alphaTest = 0.45; m.roughness = 1; m.envMapIntensity = 0.15; m.specularIntensity = 0.2; }
      else if (/teeth|tongue/i.test(n)) { m.transparent = false; m.alphaTest = 0; o.castShadow = false; }
      else if (n.includes('eyebrow') || n.includes('eyelash')) { m.transparent = true; m.depthWrite = false; m.alphaTest = 0.05; o.renderOrder = 2; o.castShadow = false; }
      // occhi: si tiene solo il bulbo con l'iride; la cornea (velo bianco semitrasparente) si scarta del tutto
      else if (n.includes('high-poly')) { m.transparent = false; m.alphaTest = 0.9; m.depthWrite = true; m.roughness = 0.15; o.castShadow = false; }
      if (m.envMapIntensity !== undefined) m.envMapIntensity = 0.8;
    });
    this.brandShorts();
    if (this.cfg0.hairTint) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Capelli folti') this.tintHair(o.material, this.cfg0.hairTint); });
    if (this.cfg0.fur) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Capelli') this.furMaterial(o.material, this.cfg0.fur); });
    if (this.cfg0.noStubble) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Capelli') o.visible = false; });
    if (this.cfg0.glow) this.model.traverse(o => { if (o.isMesh && this.cfg0.glow.includes(o.material.name)) { o.material.emissive.copy(o.material.color); o.material.emissiveIntensity = o.material.name === 'Cresta' ? 1.4 : 0.6; o.material.toneMapped = false; } });
    if (this.cfg0.evenSkin !== false) this.evenSkin();
    if (this.cfg0.skinGloss) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Pelle') { o.material.roughness = this.cfg0.skinGloss; } });
    if (this.cfg0.skinTint) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Pelle') o.material.color.setHex(this.cfg0.skinTint); });
    const bone = n => this.model.getObjectByName(n);
    this.bones = {};
    for (const n of ['head', 'neck_01', 'spine_01', 'spine_02', 'spine_03', 'hand_l', 'hand_r', 'lowerarm_l', 'lowerarm_r', 'upperarm_l', 'upperarm_r', 'pelvis'])
      this.bones[n] = bone(n);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;
    this.idle = this.mixer.clipAction(this.clips.idle);
    this.idle.play();
    this.idleLow = this.mixer.clipAction(this.clips.idle_low);
    this.idleLow.setEffectiveWeight(0); this.idleLow.play();
    this.low = 0; this.lowTarget = 0; this.lowTimer = 1;     // 0 = guardia alta, 1 = guardia bassa
    // passi da pugile: cicli "sul posto" che avanzano di STEP_SPEED m/s a velocita' normale
    this.loco = {};
    for (const n of ['step_f', 'step_b', 'step_l', 'step_r']) {
      const a = this.mixer.clipAction(this.clips[n]);
      a.setEffectiveWeight(0); a.play();
      this.loco[n] = { action: a, w: 0 };
    }
    this.vel = new THREE.Vector3();
    this.moveVel = new THREE.Vector3();
    this.prevPos = new THREE.Vector3();
    this.layers = [];            // animazioni singole in corso, con il loro peso

    this.state = 'stalk';
    this.stateT = 0;
    this.nextAttack = 2.0;
    this.combo = [];
    this.punch = null;           // pugno in corso: {name, layer, resolved, inRange}
    this.reaction = null;        // reazione programmata {at, glove, punchId}
    this.defending = null;       // {type, until, glove, punchId, hit}
    this.seen = { left: -1, right: -1 };
    this.stun = 0;
    this.strafe = Math.random() * 10;
    this.enabled = false;        // si muove e combatte solo durante il round
    this.events = [];
    this.bounds = null;          // funzione che tiene Mike dentro il ring
    this.time = 0;
    this.openUntil = 0;
    // viso: morph target (blender: unita' espressive MakeHuman)
    this.face = null;
    this.model.traverse(o => { if (o.isMesh && o.morphTargetDictionary && 'blink_l' in o.morphTargetDictionary) this.face = o; });
    if (this.face) {
      // interno della bocca: scuro, cosi' quando ansima a bocca aperta non si vede attraverso la testa
      const sk = this.face.skeleton, hi = sk.bones.findIndex(b => b.name === 'head');
      const cav = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 12), new THREE.MeshBasicMaterial({ color: 0x1a0806 }));
      cav.scale.set(1.5, 1.1, 0.8);
      // dietro ai denti (cosi' va bene per ogni pugile, alto o basso)
      let teeth = null; this.model.traverse(o => { if (o.isMesh && /teeth/i.test(o.material.name || o.name)) teeth = o; });
      if (teeth) {
        teeth.geometry.computeBoundingBox(); const c = teeth.geometry.boundingBox.getCenter(new THREE.Vector3());
        cav.position.copy(c).applyMatrix4(teeth.bindMatrix).applyMatrix4(sk.boneInverses[hi]);
      } else cav.position.set(0, 1.612, 0.118).applyMatrix4(this.face.bindMatrix).applyMatrix4(sk.boneInverses[hi]);
      sk.bones[hi].add(cav);
      this._followFace();
    }
    this.blinkT = 2; this.pain = 0; this.breath = 0;
    this._setupEyes();
    this._setupBraid();
    this.impact = this.measureImpacts();
  }

  // dove arriva la punta del guantone in ogni pugno (nel sistema di Mike, a meta' della finestra attiva):
  // serve per scegliere distanza e angolo giusti per centrare la testa dell'avversario
  measureImpacts() {
    const res = {};
    this.root.updateMatrixWorld(true);
    for (const [name, spec] of Object.entries(PUNCH)) {
      const a = this.mixer.clipAction(this.clips[name]);
      this.idle.setEffectiveWeight(0);
      a.reset(); a.setEffectiveWeight(1); a.play();
      // strada fatta dal guantone dalla guardia all'impatto (per dare a tutti i colpi la stessa velocita')
      const imp = (spec.from + spec.to) / 2 / 30;
      // velocita' come la vedi tu: quanto ci mette il guantone a fare gli ultimi 30 cm (in linea d'aria) prima
      // dell'impatto. (la strada totale non va: nel jab conta anche il caricamento e il diretto risultava lento)
      const N = 30, pts = [];
      for (let i = 0; i <= N; i++) {
        a.time = imp * i / N; this.mixer.update(0); this.root.updateMatrixWorld(true);
        pts.push(this.root.worldToLocal(this.glove(spec.side).tip));
      }
      const tip = pts[N];
      let i0 = N; while (i0 > 0 && pts[i0 - 1].distanceTo(tip) < 0.3) i0--;
      const dd = i0 > 0 ? pts[i0 - 1].distanceTo(tip) : pts[0].distanceTo(tip), tt = imp * (N - Math.max(0, i0 - 1)) / N;
      res[name] = { x: tip.x, y: tip.y, z: tip.z, dist: Math.hypot(tip.x, tip.z), yaw: Math.atan2(tip.x, tip.z), speed: dd / Math.max(1e-3, tt) };
      a.stop();
    }
    this.idle.setEffectiveWeight(1);
    this.mixer.update(0);
    // velocita' di riferimento: la media dei colpi di questo pugile (il suo ritmo resta quello)
    const v = Object.values(res).map(r => r.speed).filter(x => x > 0);
    this.refSpeed = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
    return res;
  }

  // il pugno da preparare o in corso (per distanza e angolo)
  aimPunch() {
    if (this.punch && this.impact[this.punch.name]) return this.impact[this.punch.name];
    if (this.punch && this.combo.length) return this.impact[this.combo.find(n => this.impact[n])];
    if (this.state === 'approach' && this.combo.length) return this.impact[this.combo[0]];
    return null;
  }

  // ---- riposo tra i round: va nel suo angolo e si siede sullo sgabello
  goTo(p, look) { this.goal = p.clone(); this.goalLook = look.clone(); this.atGoal = false; this.enabled = false; }
  leaveCorner() { this.goal = null; if (this.atGoal) this.resetPose(); this.atGoal = false; }
  updateGoal(dt) {
    const d = new THREE.Vector3(this.goal.x - this.root.position.x, 0, this.goal.z - this.root.position.z);
    const dist = d.length();
    if (dist > 0.04 && !this.atGoal) {
      d.normalize();
      this.root.position.addScaledVector(d, Math.min(dist, 0.8 * dt));
      this.vel.copy(d).multiplyScalar(0.8);
      const yaw = Math.atan2(d.x, d.z), dy = Math.atan2(Math.sin(yaw - this.root.rotation.y), Math.cos(yaw - this.root.rotation.y));
      this.root.rotation.y += Math.max(-5 * dt, Math.min(5 * dt, dy));
    } else {
      this.vel.set(0, 0, 0);
      const yaw = Math.atan2(this.goalLook.x - this.root.position.x, this.goalLook.z - this.root.position.z);
      const dy = Math.atan2(Math.sin(yaw - this.root.rotation.y), Math.cos(yaw - this.root.rotation.y));
      this.root.rotation.y += Math.max(-4 * dt, Math.min(4 * dt, dy));
      if (!this.atGoal && Math.abs(dy) < 0.2) { this.atGoal = true; this.play('stool', 1, true); }
    }
  }

  // fascia bianca dei calzoncini con la scritta HOME BOXING tra due righe dorate (mappatura cilindrica)
  // La pelle MakeHuman ha le gambe molto piu' scure (e pelose) del busto: a terra, sotto i fari, sembravano
  // bruciate. Si schiarisce gradualmente la zona delle gambe della texture (meta' bassa del pezzo del corpo).
  evenSkin() {
    let body = null;
    this.model.traverse(o => { if (o.isMesh && o.material.name === 'Pelle' && o.material.map) body = o; });
    if (!body) return;
    const img = body.material.map.image, W = img.width, H = img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const y0 = Math.round(H * 0.56), y1 = Math.round(H * 0.86), x1 = Math.round(W * 0.6);
    const d = g.getImageData(0, y0, x1, y1 - y0), a = d.data;
    for (let y = 0; y < y1 - y0; y++) {
      const v = (y0 + y) / H;
      const k = 1 + 0.5 * Math.min(1, Math.max(0, (v - 0.56) / 0.12)) * Math.min(1, Math.max(0, (0.86 - v) / 0.03));
      for (let x = 0, i = y * x1 * 4; x < x1; x++, i += 4) {
        if (a[i] + a[i + 1] + a[i + 2] < 40) continue;          // sfondo nero fuori dal disegno
        a[i] = Math.min(255, a[i] * k); a[i + 1] = Math.min(255, a[i + 1] * k); a[i + 2] = Math.min(255, a[i + 2] * k);
      }
    }
    g.putImageData(d, 0, y0);
    const t = new THREE.CanvasTexture(c);
    const o = body.material.map;
    t.flipY = o.flipY; t.colorSpace = o.colorSpace; t.wrapS = o.wrapS; t.wrapT = o.wrapT; t.anisotropy = 4;
    body.material.map = t; body.material.needsUpdate = true;
  }

  // barba e capelli a spazzola folti: trama di peli (colore con piccole variazioni, bordi sfrangiati)
  furMaterial(m, hex) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'), base = new THREE.Color(hex);
    g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, 512, 512);          // base piena (niente buchi)
    for (let i = 0; i < 30000; i++) {
      const x = Math.random() * 512, y = Math.random() * 512, l = 2 + Math.random() * 5, a = Math.random() * Math.PI;
      const k = 0.78 + Math.random() * 0.5;             // poco contrasto: niente puntini
      g.strokeStyle = `rgba(${Math.min(255, base.r * 255 * k) | 0},${Math.min(255, base.g * 255 * k) | 0},${Math.min(255, base.b * 255 * k) | 0},${0.55 + Math.random() * 0.45})`;
      g.lineWidth = 0.6 + Math.random() * 0.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); t.anisotropy = 4;
    m.map = t; m.color.set(0xffffff); m.roughness = 0.9;
    // bordo sfumato: dal colore dei vertici si tiene solo la trasparenza (attaccatura morbida), puntinata (alphaHash)
    this.model.traverse(o => {
      const ca = o.isMesh && o.material === m && o.geometry.attributes.color;
      if (!ca || ca.itemSize < 4) return;
      for (let i = 0; i < ca.count; i++) ca.setXYZ(i, 1, 1, 1);
      ca.needsUpdate = true;
    });
    // trasparenza vera (bordo sfumato liscio, non a retino); disegnata dopo la pelle
    m.vertexColors = true; m.alphaTest = 0.02; m.alphaHash = false; m.transparent = true; m.depthWrite = false; m.needsUpdate = true;
    this.model.traverse(o => { if (o.isMesh && o.material === m) o.renderOrder = 1; });
  }

  // capelli chiari (biondo): la texture MakeHuman e' scura; si tiene solo il chiaroscuro delle ciocche e si ricolora
  tintHair(m, hex) {
    const img = m.map && m.map.image; if (!img || !img.width) return;
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data, col = new THREE.Color(hex);
    let sum = 0, n = 0;
    for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 128) { sum += p[i] + p[i + 1] + p[i + 2]; n++; }
    const mean = Math.max(1, sum / Math.max(1, n));
    for (let i = 0; i < p.length; i += 4) {
      const k = Math.min(1.35, (p[i] + p[i + 1] + p[i + 2]) / mean) * 255;
      p[i] = Math.min(255, col.r * k); p[i + 1] = Math.min(255, col.g * k); p[i + 2] = Math.min(255, col.b * k);
    }
    g.putImageData(d, 0, 0);
    const t = new THREE.CanvasTexture(c); const o = m.map;
    t.flipY = o.flipY; t.colorSpace = o.colorSpace; t.wrapS = o.wrapS; t.wrapT = o.wrapT;
    m.map = t; m.color.set(0xffffff); m.needsUpdate = true;
  }

  brandShorts() {
    let band = null;
    this.model.traverse(o => { if (o.isMesh && o.material.name === 'Raso bianco') band = o; });
    if (!band) return;
    const c = document.createElement('canvas'); c.width = 2048; c.height = 160;
    const g = c.getContext('2d');
    const B = this.cfg0.band || { bg: '#f4f4f0', line: '#c99a2e', text: '#1239a8' };
    g.fillStyle = B.bg; g.fillRect(0, 0, 2048, 160);
    g.fillStyle = B.line; g.fillRect(0, 14, 2048, 10); g.fillRect(0, 128, 2048, 10);
    if (B.box) { g.fillStyle = B.box; g.fillRect(1024 - 170, 26, 340, 108); g.strokeStyle = B.text; g.lineWidth = 6; g.strokeRect(1024 - 162, 34, 324, 92); }   // riquadro (stile thai)
    g.fillStyle = B.text; g.font = `900 ${B.box ? 92 : 78}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const label = B.label || 'HOME BOXING ★';
    if (B.icon) {                                                     // scritta + icona disegnata accanto
      const tw = g.measureText(label).width, gap = 26, iw = 104, x0 = 1024 - (tw + gap + iw) / 2;
      g.fillText(label, x0 + tw / 2, 82);
      drawIcon(g, B.icon, x0 + tw + gap + iw / 2, 80, iw);
    } else g.fillText(label, 1024, 82);                             // una sola scritta, centrata sul davanti (u = 0.5 = +Z)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 4;
    const geo = band.geometry; geo.computeBoundingBox();
    const bb = geo.boundingBox.clone(), pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
    // altezza della fascia = la parte alta dei calzoncini interi (non del solo pezzo bianco: senza righe e' basso)
    this.model.traverse(o => { if (o.isMesh && o.material.name === 'Raso blu' && o.geometry !== geo) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox); } });
    const h = (bb.max.y - bb.min.y) * 0.19;                 // altezza della fascia (la parte alta)
    const cx = (bb.max.x + bb.min.x) / 2, cz = (bb.max.z + bb.min.z) / 2;
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = Math.atan2(pos.getX(i) - cx, pos.getZ(i) - cz) / (2 * Math.PI) + 0.5;
      uv[i * 2 + 1] = (pos.getY(i) - (bb.max.y - h)) / h;   // sotto la fascia resta bianco (bordo del disegno)
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    band.material = band.material.clone(); band.material.map = tex; band.material.color.set(0xffffff); band.material.needsUpdate = true;
  }

  // ---- colpo basso e vittoria
  lowBlowed() {
    this.enabled = false; this.punch = null; this.combo = []; this.reaction = null; this.defending = null;
    this.setState('stalk'); this.nextAttack = 2;
    this.play('lowblow', 1, true); this.pain = 1.6;
  }
  celebrate() {
    for (const l of this.layers) l.out = true;
    // a caso: due braccia alzate o un braccio solo
    const name = this.clips.celebrate1 && Math.random() < 0.5 ? 'celebrate1' : 'celebrate';
    const a = this.mixer.clipAction(this.clips[name]);
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveWeight(0); a.play();
    this.layers.push({ name, action: a, t: 0, dur: 1e9, ts: 1, w: 0, out: false, hold: true });
  }

  // ---- espressioni: battito di ciglia, smorfia quando lo colpisci, fiatone quando e' stanco
  _morph(n, v) { if (this.face) this.face.morphTargetInfluences[this.face.morphTargetDictionary[n]] = v; }
  // treccia (Fury): in Blender e' legata alle vertebre e restava incollata alla schiena. Qui oscilla: ogni vertice si
  // sposta di uSwing (punta della treccia) per un peso che cresce dall'attaccatura alla punta; uSwing e' un pendolo
  // spinto dai movimenti e dalle girate del busto (vedi _updBraid)
  _setupBraid() {
    const parts = []; this.model.traverse(o => { if (o.isSkinnedMesh && /treccia|legaccio/i.test((o.material && o.material.name || '') + o.name)) parts.push(o); });
    if (!parts.length) return;
    const v = new THREE.Vector3(); let top = -1e9, bot = 1e9;
    for (const o of parts) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.bindMatrix); top = Math.max(top, v.y); bot = Math.min(bot, v.y); } }
    // anche il ciuffo in fondo (mesh senza nome, sotto il legaccio)
    this.model.traverse(o => {
      if (!o.isSkinnedMesh || parts.includes(o) || o.name || !o.geometry) return;
      o.geometry.computeBoundingBox(); const c = o.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(o.bindMatrix);
      if (c.y < bot + 0.1 && c.y > bot - 0.2 && Math.abs(c.x) < 0.1) { parts.push(o); bot = Math.min(bot, c.y - 0.11); }
    });
    const U = { value: new THREE.Vector3() };
    for (const o of parts) {
      const g = o.geometry, p = g.attributes.position, w = new Float32Array(p.count);
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.bindMatrix); w[i] = Math.pow(THREE.MathUtils.clamp((top - v.y) / Math.max(0.05, top - bot), 0, 1), 1.6); }
      g.setAttribute('aSw', new THREE.BufferAttribute(w, 1));
      const inv = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(o.bindMatrix).invert());
      const m = o.material = o.material.clone();
      m.onBeforeCompile = sh => {
        sh.uniforms.uSwing = U; sh.uniforms.uSwInv = { value: inv };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float aSw; uniform vec3 uSwing; uniform mat3 uSwInv;`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>
transformed += uSwInv * uSwing * aSw;`);
      };
      m.customProgramCacheKey = () => 'treccia';
    }
    this.braid = { U, off: new THREE.Vector3(), vel: new THREE.Vector3(), lastP: null, lastV: new THREE.Vector3(), lastYaw: this.root.rotation.y, yawV: 0 };
  }
  _updBraid(dt) {
    const B = this.braid; if (!B || dt <= 0) return;
    const sp = this.bones.spine_03 || this.bones.neck_01; if (!sp) return;
    const p = sp.getWorldPosition(new THREE.Vector3());
    if (!B.lastP) { B.lastP = p.clone(); return; }
    const vel = p.clone().sub(B.lastP).divideScalar(dt); B.lastP.copy(p);
    const acc = vel.clone().sub(B.lastV).divideScalar(dt); B.lastV.copy(vel);
    const yaw = this.root.rotation.y, yv = Math.atan2(Math.sin(yaw - B.lastYaw), Math.cos(yaw - B.lastYaw)) / dt; B.lastYaw = yaw;
    const ya = (yv - B.yawV) / dt; B.yawV = yv;
    // accelerazione nel sistema del pugile (x di lato, z avanti): la treccia resta indietro rispetto a dove va il busto
    acc.applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
    // (la punta sta ~15 cm dietro l'asse del busto: girandosi resta indietro e si apre verso fuori)
    const f = new THREE.Vector3(-acc.x * 0.8 - ya * 0.15, 0, -Math.abs(acc.z) * 0.5 - yv * yv * 0.15);
    // molla verso la posizione di riposo (appoggiata alla schiena), poco smorzata: oscilla un po' prima di fermarsi
    f.addScaledVector(B.off, -26).addScaledVector(B.vel, -2.6);
    B.vel.addScaledVector(f, dt * 1.0); B.off.addScaledVector(B.vel, dt);
    B.off.x = THREE.MathUtils.clamp(B.off.x, -0.22, 0.22); B.off.z = THREE.MathUtils.clamp(B.off.z, -0.18, 0.0); B.off.y = Math.max(-0.02, -0.4 * Math.abs(B.off.x));   // (piu' si apre, piu' sale un po')
    B.U.value.copy(B.off);
  }
  // barba e sopracciglia sono gusci a parte, senza le espressioni del viso: quando la bocca si apriva (fiatone,
  // smorfie, a terra) la pelle si muoveva e la barba no, e copriva la bocca o sembrava scivolare. Qui ogni loro vertice
  // prende gli spostamenti del punto di pelle piu' vicino, e le espressioni sono le stesse (stesso array di pesi)
  _followFace() {
    const F = this.face, fg = F.geometry, fm = fg.morphAttributes.position;
    if (!fm || !fm.length) return;
    const fp = fg.attributes.position, FB = F.bindMatrix, C = 0.012, grid = new Map(), v = new THREE.Vector3();
    const key = (x, y, z) => `${Math.floor(x / C)},${Math.floor(y / C)},${Math.floor(z / C)}`;
    const fw = new Float32Array(fp.count * 3);
    for (let i = 0; i < fp.count; i++) {
      v.fromBufferAttribute(fp, i).applyMatrix4(FB); fw[i * 3] = v.x; fw[i * 3 + 1] = v.y; fw[i * 3 + 2] = v.z;
      const k = key(v.x, v.y, v.z); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i);
    }
    const FBr = new THREE.Matrix3().setFromMatrix4(FB);
    this.model.traverse(o => {
      if (!o.isSkinnedMesh || o === F || o.morphTargetDictionary || !/capelli|eyebrow/i.test((o.material && o.material.name || '') + o.name)) return;
      const g = o.geometry, gp = g.attributes.position, inv = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(o.bindMatrix).invert());
      const near = new Int32Array(gp.count).fill(-1);
      for (let i = 0; i < gp.count; i++) {
        v.fromBufferAttribute(gp, i).applyMatrix4(o.bindMatrix);
        const cx = Math.floor(v.x / C), cy = Math.floor(v.y / C), cz = Math.floor(v.z / C);
        let best = 0.02 * 0.02, bi = -1;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
          const l = grid.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!l) continue;
          for (const j of l) { const d = (fw[j * 3] - v.x) ** 2 + (fw[j * 3 + 1] - v.y) ** 2 + (fw[j * 3 + 2] - v.z) ** 2; if (d < best) { best = d; bi = j; } }
        }
        near[i] = bi;
      }
      if (!near.some(j => j >= 0)) return;
      g.morphAttributes.position = fm.map(src => {
        const arr = new Float32Array(gp.count * 3), d = new THREE.Vector3();
        for (let i = 0; i < gp.count; i++) {
          const j = near[i]; if (j < 0) continue;
          d.fromBufferAttribute(src, j).applyMatrix3(FBr).applyMatrix3(inv);   // (dallo spazio della pelle a quello del guscio)
          arr[i * 3] = d.x; arr[i * 3 + 1] = d.y; arr[i * 3 + 2] = d.z;
        }
        return new THREE.BufferAttribute(arr, 3);
      });
      g.morphTargetsRelative = true;
      o.morphTargetDictionary = F.morphTargetDictionary; o.morphTargetInfluences = F.morphTargetInfluences;   // stesse espressioni
      if (o.material) o.material.needsUpdate = true;
    });
  }
  updateFace(dt) {
    if (!this.face) return;
    this.blinkT -= dt;
    let blink = this.blinkT < 0.13 ? 1 : 0;
    if (this.blinkT < 0) this.blinkT = 1.8 + Math.random() * 3.5;
    this.pain = Math.max(0, this.pain - dt * 1.4);
    const p = Math.min(1, this.pain);
    const tired = Math.max(0, ((this.fatigue || 0) - 0.66) / 0.34);          // sotto un terzo di energia: fiatone
    this.breath += dt * (1.1 + tired * 0.9);                            // (respiro affannato ma non frenetico: ~1 al secondo)
    const pant = tired * (0.5 + 0.5 * Math.sin(this.breath * Math.PI));
    if (this.down) { blink = 0.75; }
    this._morph('blink_l', Math.max(blink, p * 0.7)); this._morph('blink_r', Math.max(blink, p * 0.9));
    const mean = this.cfg0.mean || {};                    // espressione di base (es. Brutus sempre accigliato)
    this._morph('squint_l', Math.max(p * 0.6, mean.squint || 0)); this._morph('squint_r', Math.max(p * 0.6, mean.squint || 0));
    this._morph('brow_l', Math.max(p * 0.8, mean.brow || 0)); this._morph('brow_r', Math.max(p * 0.8, mean.brow || 0));
    this._morph('grimace', p * 0.9);
    this._morph('mouth_open', Math.max(pant * 0.75, p * 0.25));     // fiatone: bocca che si apre e chiude
    this._morph('nose_l', pant * 0.6); this._morph('nose_r', pant * 0.6);
    // fiatone: spalle e petto che salgono e scendono
    if (tired > 0 && this.bones.spine_03) this.bones.spine_03.rotation.x -= tired * 0.03 * Math.sin(this.breath * Math.PI);
  }

  // ---- atterramento
  knockdown() {
    this.enabled = false; this.down = true; this.downLoop = false;
    this.punch = null; this.combo = []; this.reaction = null; this.defending = null;
    this.setState('stalk'); this.nextAttack = 2;
    this.play('knockdown', 1, true);        // la clip e' gia' lenta: barcolla stordito, poi va giu'
  }
  getUp() { this.getupLayer = this.play('getup', 1); this.down = false; this.downLoop = false; }
  // finita la caduta resta a terra tramortito: ciclo lento (testa che ciondola, un ginocchio che si piega)
  _downLoop() {
    const fall = this.layers.find(l => l.name === 'knockdown' && !l.out);
    if (!fall || fall.t < fall.dur || !this.clips.down) return;
    for (const l of this.layers) l.out = true;
    const a = this.mixer.clipAction(this.clips.down);
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveWeight(0); a.play();
    this.layers.push({ name: 'down', action: a, t: 0, dur: 1e9, ts: 1, w: 0, out: false, hold: true });
    this.downLoop = true;
  }
  isUp() { return !this.getupLayer || this.getupLayer.t >= this.getupLayer.dur - 0.15; }
  resetPose() {
    for (const l of this.layers) l.out = true;
    this.down = false; this.downLoop = false; this.getupLayer = null; this.punch = null; this.combo = []; this.defending = null; this.reaction = null;
  }

  setLevel(name) {
    this.levelName = LEVELS[name] ? name : 'normale';
    this.applyRound(this.round || 1);
  }
  // crescita della difficolta' (torneo, sopravvivenza): 0 = il livello scelto, 1 = il livello successivo.
  // Le abilita' si avvicinano in percentuale a quelle del livello sopra, senza saltarci dentro.
  setRamp(x) { this.ramp = Math.max(0, Math.min(1, x || 0)); this.applyRound(this.round || 1); }
  // stanchezza dei round (non la salute): un po' piu' lento e meno pronto a ogni round, +2,5% fino al 25% al massimo
  applyRound(round) {
    this.round = round;
    const t = Math.min(0.25, 0.025 * (round - 1)), b = { ...MIKE, ...LEVELS[this.levelName] };
    const names = Object.keys(LEVELS), nxt = LEVELS[names[Math.min(names.length - 1, names.indexOf(this.levelName) + 1)]];
    if (this.ramp > 0 && nxt) {
      const k = this.ramp;
      for (const [key, v] of Object.entries(nxt)) {
        if (typeof v === 'number' && typeof b[key] === 'number') b[key] = b[key] + (v - b[key]) * k;
        else if (Array.isArray(v) && Array.isArray(b[key]) && typeof v[0] === 'number') b[key] = b[key].map((x, i) => x + (v[i] - x) * k);
        else if (key === 'combos' && k >= 0.5) b.combos = [...b.combos, ...v];   // a meta' strada usa anche le combinazioni del livello sopra
        else if (typeof v === 'boolean' && k >= 0.5) b[key] = v;
      }
    }
    const md = this.cfg0.mods;                           // stile del pugile (es. Eddy agile)
    if (md) { b.moveSpeed *= md.moveSpeed || 1; b.defenseSpeed *= md.defenseSpeed || 1; b.evade = Math.min(0.95, (b.evade ?? 0) + (md.evade || 0));
      b.attackEvery = b.attackEvery.map(v => v * (md.attackEvery || 1));
      if (md.toughness) b.toughness = (b.toughness ?? 1) * md.toughness;
      if (md.punchSpeed) b.punchSpeed *= md.punchSpeed;
      if (md.extraCombos) b.combos = [...b.combos, ...combos(...md.extraCombos.filter(n => C[n])), ...combos(...md.extraCombos.filter(n => C[n]))]; }   // (contano doppio: le preferisce)
    this.cfg = { ...b,
      punchSpeed: b.punchSpeed * (1 - 0.6 * t), moveSpeed: b.moveSpeed * (1 - 0.6 * t), defenseSpeed: b.defenseSpeed * (1 - 0.8 * t),
      reactChance: b.reactChance * (1 - 0.6 * t), reactDelay: b.reactDelay.map(v => v + 0.12 * t),
      evade: (b.evade ?? 0) * (1 - 0.8 * t), reflex: (b.reflex ?? 0) * (1 - 0.8 * t),
      attackEvery: b.attackEvery.map(v => v * (1 + t)) };
  }

  // --------------------------------------------------------------- animazioni
  play(name, timeScale = 1, hold = false) {
    // la stessa difesa gia' in corso (non ancora a meta' del ritorno) continua: farla ripartire da capo faceva
    // saltare i guantoni all'inizio del movimento
    const same = DEFENSES.has(name) && this.layers.find(l => !l.out && l.name === name && l.t < l.dur * 0.55);
    if (same) { same.ts = Math.max(same.ts, timeScale); same.action.timeScale = same.ts; return same; }
    // quello che viene interrotto sfuma via un po' piu' piano (prima 0,07 s: un movimento lasciato a meta' scattava
    // nella posa nuova); i pugni pero' devono partire subito
    const fade = PUNCH[name] ? 0.1 : 0.17;
    for (const l of this.layers) if (!l.out) { l.out = true; l.fade = l.t < l.dur - 0.15 ? fade : 0.07; }
    const a = this.mixer.clipAction(this.clips[name]);
    a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true;
    a.timeScale = timeScale; a.setEffectiveWeight(0); a.play();
    const layer = { name, action: a, t: 0, dur: this.clips[name].duration, ts: timeScale, w: 0, out: false, hold, fin: PUNCH[name] ? 0.07 : 0.1 };
    // se la stessa azione era in uscita, quella vecchia sparisce subito
    this.layers = this.layers.filter(l => l.action !== a);
    this.layers.push(layer);
    return layer;
  }
  busyAnim() { return this.layers.some(l => !l.out && l.t < l.dur - 0.1); }
  current() { return this.layers.find(l => !l.out) || null; }

  animate(dt) {
    if (this.down && !this.downLoop) this._downLoop();
    let total = 0;
    for (const l of this.layers) {
      l.t += dt * l.ts;
      if (l.out) l.w = Math.max(0, l.w - dt / (l.fade || 0.07));
      else {
        let w = Math.min(1, l.t / (l.fin || 0.07)); w = w * w * (3 - 2 * w);   // (entrata morbida, non a gradino)
        if (l.t > l.dur - 0.14 && !l.hold) w = Math.min(w, Math.max(0, (l.dur - l.t) / 0.14));
        l.w = w;
      }
      l.action.setEffectiveWeight(l.w);
      total += l.w;
    }
    this.layers = this.layers.filter(l => {
      const keep = l.w > 0.001 || (!l.out && l.t < 0.07) || (l.hold && !l.out);
      if (!keep) l.action.stop();
      return keep;
    });
    // passi: direzione e velocita' nel sistema di Mike (+Z avanti, +X sua sinistra)
    const free = Math.max(0, 1 - total);
    const lv = _d.copy(this.vel).applyQuaternion(_q.copy(this.root.quaternion).invert());
    const sp = Math.hypot(lv.x, lv.z);
    const k = Math.min(1, Math.max(0, (sp - 0.03) / 0.12));
    const s2 = Math.max(1e-6, lv.x * lv.x + lv.z * lv.z);
    const want = { step_f: lv.z > 0 ? lv.z * lv.z / s2 : 0, step_b: lv.z < 0 ? lv.z * lv.z / s2 : 0,
      step_l: lv.x > 0 ? lv.x * lv.x / s2 : 0, step_r: lv.x < 0 ? lv.x * lv.x / s2 : 0 };
    let locoSum = 0;
    const ts = Math.min(2.2, Math.max(0.15, sp / STEP_SPEED));   // (piano = passi lenti: prima sotto il 60% i piedi pattinavano)
    for (const [n, l] of Object.entries(this.loco)) {
      l.w += (k * want[n] - l.w) * Math.min(1, dt * 10);
      l.action.setEffectiveWeight(free * l.w);
      l.action.timeScale = ts;
      locoSum += l.w;
    }
    const idleW = free * Math.max(0, 1 - locoSum);
    this.idle.setEffectiveWeight(idleW * (1 - this.low));
    this.idleLow.setEffectiveWeight(idleW * this.low);
    // il mixer riscrive un osso solo se il valore dell'animazione cambia: nei tratti fermi le piegature aggiunte qui
    // sotto (busto verso la tua testa, braccio, fiatone) si sommavano a ogni fotogramma (capriola all'indietro).
    // Si riparte sempre dalla posa dell'animazione
    if (this._animQ) for (const [b, q] of this._animQ) b.quaternion.copy(q);
    this.mixer.update(dt);
    this._updBraid(dt);
    this._animQ = ['spine_01', 'spine_02', 'spine_03', 'upperarm_l', 'upperarm_r'].filter(n => this.bones[n]).map(n => [this.bones[n], this.bones[n].quaternion.clone()]);
    this.updateFace(dt);
    this.root.updateMatrixWorld(true);
    this._reachBend(dt);
    this.lookAtEyes(dt);
  }

  // punto da colpire, scelto al lancio: centro del viso, mento, fronte o una tempia, quello piu' lontano dai tuoi guantoni
  // (i ganci prendono la tempia dal lato da cui arrivano). Ai livelli bassi sbaglia spesso e mira al centro.
  chooseAim(player, name) {
    const spec = PUNCH[name]; if (!spec || !player) return null;
    const H = player.head, toMe = _c.copy(this.root.getWorldPosition(_e)).sub(H).setY(0).normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(toMe).normalize();      // tua destra / sinistra vista da lui
    if (spec.zone === 'body') return null;
    const C = [[0, 0, 'centro'], [0, -0.09, 'mento'], [0, 0.07, 'fronte'], [0.08, 0.01, 'tempia'], [-0.08, 0.01, 'tempia']];
    let cands = C.map(([x, y]) => H.clone().addScaledVector(right, x).add(new THREE.Vector3(0, y, 0)));
    if (name.startsWith('hook')) {                                          // il gancio arriva di lato: prende quella tempia
      const s = name === 'hook_l' ? -1 : 1; cands = [H.clone().addScaledVector(right, 0.08 * s).add(new THREE.Vector3(0, 0.01, 0)), H.clone().add(new THREE.Vector3(0, -0.07, 0))];
    }
    const skill = this.cfg.readGuard ?? 0.6;
    if (Math.random() > skill) return cands[0];
    const gl = Object.values(player.gloves).filter(g => g.mesh.visible);
    let best = cands[0], bs = -1;
    for (const p of cands) {
      const sc = Math.min(...gl.map(g => g.center.distanceTo(p)), 0.4) + Math.random() * 0.02;
      if (sc > bs) { bs = sc; best = p; }
    }
    return best;
  }

  // colpi al volto all'altezza della TUA testa (anche se sei piu' basso o abbassato in guardia): se il pugno
  // passerebbe sopra, si piega in avanti col busto quanto serve (al massimo ~25 gradi); se sei piu' alto si raddrizza
  // all'indietro (poco) e alza il braccio che colpisce dalla spalla (fino a ~34 gradi).
  // A pugno partito resta l'inclinazione della partenza (se ti abbassi all'ultimo, il colpo puo' andare a vuoto)
  _reachBend(dt) {
    const P = this.lastPlayer, ap = this.enabled && !this.down ? this.aimPunch() : null;
    const name = this.punch ? this.punch.name : (this.combo.length ? this.combo[0] : null), sp = name && PUNCH[name];
    let target = 0, armT = 0;
    if (P && ap && sp && sp.zone === 'head') {
      const rp = this.root.getWorldPosition(_e), sc = this.root.getWorldScale(_d).y;
      const aimY = this.aimPt && this.punch && this.lockFor === this.punch ? this.aimPt.y : P.head.y - 0.03;
      const d = rp.y + ap.y * sc - aimY;                                // quanto il pugno passerebbe sopra (+) o sotto (-) il punto scelto
      const L = Math.max(0.4, Math.hypot(ap.dist, ap.y - 1.0) * sc);   // dal giro vita al pugno
      target = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(d / L, -1, 1)), -0.2, 0.45);
      if (d < 0) {                                                     // sei piu' alto: quello che manca lo fa il braccio
        const rest = -d - L * Math.sin(0.2);
        if (rest > 0) armT = THREE.MathUtils.clamp(Math.asin(Math.min(1, rest / (0.55 * sc))), 0, 0.8);
      }
    }
    const punching = this.enabled && !this.down && this.punch && !this.punch.move && this.state === 'attack';   // (a fine incontro o a terra: niente)
    if (punching) {
      // si fissa al lancio; si ricalcola una volta quando e' pronto il punto scelto (arriva un fotogramma dopo)
      const aimed = this.lockFor === this.punch;
      if (this.bendFor !== this.punch || (aimed && !this.bendAimed)) { this.bendFor = this.punch; this.bendAimed = aimed; this.bendLock = target; this.armLock = armT; }
      target = this.bendLock; armT = this.armLock;
    }
    else this.bendFor = null;
    // a pugno partito l'inclinazione arriva quasi subito (~0,1 s): il guantone va dritto verso la faccia;
    // prima si inclinava piano durante il colpo e il jab partiva basso e si alzava alla fine
    const kIn = punching ? 30 : 8;
    this.bend = (this.bend || 0) + (target - (this.bend || 0)) * Math.min(1, dt * kIn);
    this.armUp = (this.armUp || 0) + ((punching ? armT : 0) - (this.armUp || 0)) * Math.min(1, dt * (punching ? 30 : 10));
    if (Math.abs(this.bend) < 0.003 && this.armUp < 0.003) return;
    const fwd = _c.set(0, 0, 1).applyQuaternion(this.root.getWorldQuaternion(_q)).setY(0).normalize();
    const axis = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();   // ruotando di + attorno a questo, il busto va avanti e giu'
    for (const [n, k] of [['spine_01', 0.55], ['spine_02', 0.45]]) {
      const b = this.bones[n]; if (!b || !b.parent) continue;
      const wq = b.getWorldQuaternion(new THREE.Quaternion());
      const nw = new THREE.Quaternion().setFromAxisAngle(axis, this.bend * k).multiply(wq);
      b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(nw)); b.updateMatrixWorld(true);
    }
    // braccio che colpisce alzato dalla spalla (attorno allo stesso asse laterale, verso l'alto)
    if (this.armUp > 0.003 && this.punch && PUNCH[this.punch.name]) {
      const b = this.bones['upperarm_' + PUNCH[this.punch.name].side];
      if (b && b.parent) {
        const wq = b.getWorldQuaternion(new THREE.Quaternion());
        const nw = new THREE.Quaternion().setFromAxisAngle(axis, -this.armUp).multiply(wq);
        b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(nw)); b.updateMatrixWorld(true);
      }
    }
  }

  // occhi mobili: i bulbi (mesh "high-poly", legati alla testa) passano a due ossa nuove, una per occhio, con il
  // perno al centro del bulbo; ruotandole lo sguardo segue l'avversario
  _setupEyes() {
    const head = this.bones.head; if (!head) return;
    let eyes = null; this.model.traverse(o => { if (o.isSkinnedMesh && (o.material.name || '').includes('high-poly')) eyes = o; });
    const toHead = (sk, hi, m) => new THREE.Matrix4().multiplyMatrices(sk.boneInverses[hi], m.bindMatrix);
    // dove guarda il viso, nello spazio dell'osso della testa (il modello in posa guarda verso +Z)
    const skin = eyes || this.face;
    if (!skin) return;
    const sk0 = skin.skeleton, hi0 = sk0.bones.findIndex(b => b.name === 'head');
    if (hi0 < 0) return;
    this.faceLocal = new THREE.Vector3(0, 0, 1).transformDirection(toHead(sk0, hi0, skin));
    this.lookW = 0; this._lookBase = new THREE.Quaternion(); this._lookOut = null;
    if (!eyes) return;
    const g = eyes.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
    const sum = [new THREE.Vector3(), new THREE.Vector3()], cnt = [0, 0];
    for (let i = 0; i < pos.count; i++) { const k = pos.getX(i) < 0 ? 0 : 1; sum[k].x += pos.getX(i); sum[k].y += pos.getY(i); sum[k].z += pos.getZ(i); cnt[k]++; }
    if (!cnt[0] || !cnt[1]) return;
    const M = toHead(sk0, hi0, eyes), bones = sk0.bones.slice(), inv = sk0.boneInverses.map(m => m.clone());
    this.eyeBones = [0, 1].map(k => {
      const c = sum[k].divideScalar(cnt[k]).applyMatrix4(M);          // centro del bulbo, nello spazio della testa
      const b = new THREE.Bone(); b.name = 'occhio_' + k; b.position.copy(c); head.add(b);
      bones.push(b); inv.push(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z).multiply(sk0.boneInverses[hi0]));
      return b;
    });
    const n0 = bones.length - 2;
    for (let i = 0; i < pos.count; i++) { si.setXYZW(i, n0 + (pos.getX(i) < 0 ? 0 : 1), 0, 0, 0); sw.setXYZW(i, 1, 0, 0, 0); }
    si.needsUpdate = sw.needsUpdate = true;
    eyes.bind(new THREE.Skeleton(bones, inv), eyes.bindMatrix);
  }
  // ti guarda negli occhi: la testa si gira un po' verso i tuoi occhi (al massimo ~20 gradi), gli occhi fanno il resto
  lookAtEyes(dt) {
    const head = this.bones.head;
    if (!head || !this.faceLocal) return;
    const P = this.lastPlayer && this.lastPlayer.head;
    const on = P && !this.down && !this.getupLayer && !this.goal ? 1 : 0;
    this.lookW += (on - this.lookW) * Math.min(1, dt * 3);
    // se l'animazione non ha riscritto la testa, si riparte dalla posa di prima (niente rotazioni che si sommano)
    if (this._lookOut && head.quaternion.equals(this._lookOut)) head.quaternion.copy(this._lookBase);
    this._lookBase.copy(head.quaternion);
    if (this.lookW < 0.01) { this._lookOut = null; if (this.eyeBones) for (const e of this.eyeBones) e.quaternion.identity(); return; }
    // testa: t = frazione della rotazione che si applica (limitata a maxAng), il resto lo fanno gli occhi
    head.updateWorldMatrix(true, false);
    {
      const q = head.getWorldQuaternion(_lq).invert();
      const d = _ld.copy(P).sub(head.getWorldPosition(_lp)).normalize().applyQuaternion(q);
      _lr.setFromUnitVectors(this.faceLocal, d);
      const ang = 2 * Math.acos(Math.min(1, Math.abs(_lr.w)));
      const t = Math.min(0.6, 0.35 / Math.max(ang, 1e-4)) * this.lookW;
      _lr.copy(_qI.identity().slerp(_lr, t));
      head.quaternion.multiply(_lr);
      this._lookOut = (this._lookOut || new THREE.Quaternion()).copy(head.quaternion);
      head.updateMatrixWorld(true);
    }
    if (this.eyeBones) for (const e of this.eyeBones) {
      const q = head.getWorldQuaternion(_lq).invert();
      const d = _ld.copy(P).sub(e.getWorldPosition(_lp)).normalize().applyQuaternion(q);
      _lr.setFromUnitVectors(this.faceLocal, d);
      const ang = 2 * Math.acos(Math.min(1, Math.abs(_lr.w)));
      _lr.copy(_qI.identity().slerp(_lr, Math.min(1, 0.42 / Math.max(ang, 1e-4)) * this.lookW));   // occhi: al massimo ~24 gradi
      e.quaternion.copy(_lr); e.updateMatrixWorld(true);
    }
  }

  // --------------------------------------------------------------- punti del corpo nel mondo
  forward(out = new THREE.Vector3()) { return out.set(0, 0, 1).applyQuaternion(this.root.quaternion); }
  bonePos(n, out = new THREE.Vector3()) { return this.bones[n].getWorldPosition(out); }
  headCenter(out = new THREE.Vector3()) {
    const h = this.bonePos('head'), n = this.bonePos('neck_01');
    return out.copy(h).addScaledVector(h.clone().sub(n).normalize(), 0.085).addScaledVector(this.forward(), 0.03);
  }
  torso() {
    const f = this.forward();
    const s1 = this.bonePos('spine_01'), s2 = this.bonePos('spine_02'), s3 = this.bonePos('spine_03');
    const top = s3.clone().addScaledVector(s3.clone().sub(s2), 1.3).addScaledVector(f, 0.06);
    return [s1.addScaledVector(f, 0.06), top];
  }
  glove(side) {
    const w = this.bonePos('hand_' + side), e = this.bonePos('lowerarm_' + side);
    const d = w.clone().sub(e).normalize();
    return { center: w.clone().addScaledVector(d, 0.09), tip: w.clone().addScaledVector(d, 0.165) };
  }

  emit(type, data = {}) { this.events.push({ type, ...data }); }

  // --------------------------------------------------------------- un fotogramma
  update(dt, player) {
    this.time += dt;
    this.stateT += dt;
    if (this.stun > 0) this.stun -= dt;
    const head = player.head;
    this.lastPlayer = player;
    if (this.goal) { this.updateGoal(dt); this.animate(dt); return; }   // va all'angolo

    // guarda sempre l'avversario
    const toP = _a.set(head.x - this.root.position.x, 0, head.z - this.root.position.z);
    const dist = toP.length();
    const aimP = this.enabled ? this.aimPunch() : null;
    const want = Math.atan2(toP.x, toP.z) - (aimP ? aimP.yaw : 0);
    let dy = want - this.root.rotation.y;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    // pugno partito: non cambia piu' direzione (se ti sposti, lo schivi). Nella combinazione, a ogni nuovo colpo
    // puo' correggere la mira di poco (al massimo ~20 gradi); quando non colpisce torna a seguirti
    const punching = this.enabled && this.punch && !this.punch.move && this.state === 'attack';
    if (punching) {
      if (this.lockFor !== this.punch) {
        this.lockFor = this.punch;
        // dove colpire: il punto piu' scoperto (lontano dai tuoi guantoni), girandosi quel poco che serve
        this.aimPt = this.chooseAim(player, this.punch.name);
        let dyA = dy;
        if (this.aimPt) { const rp = this.root.getWorldPosition(_e); dyA = Math.atan2(this.aimPt.x - rp.x, this.aimPt.z - rp.z) - (aimP ? aimP.yaw : 0) - this.root.rotation.y; dyA = Math.atan2(Math.sin(dyA), Math.cos(dyA)); }
        this.lockYaw = this.root.rotation.y + Math.max(-0.35, Math.min(0.35, dyA));
        this.lockDir = new THREE.Vector3(Math.sin(this.lockYaw + (aimP ? aimP.yaw : 0)), 0, Math.cos(this.lockYaw + (aimP ? aimP.yaw : 0)));
      }
      const dl = Math.atan2(Math.sin(this.lockYaw - this.root.rotation.y), Math.cos(this.lockYaw - this.root.rotation.y));
      this.root.rotation.y += Math.max(-9 * dt, Math.min(9 * dt, dl));
    } else if (this.down || !this.isUp()) {
      this.lockFor = null;                            // a terra (e mentre si rialza) non si gira: il corpo sdraiato ruotava sul tappeto
    } else {
      this.lockFor = null;
      this.root.rotation.y += Math.max(-6 * dt, Math.min(6 * dt, dy));      // (non piu' di ~340 gradi/s: prima dopo una schivata si rigirava di scatto)
    }

    if (this.enabled) {
      this.checkPlayerPunches(player);
      this.think(dt, player, dist);
      this.move(dt, dist, punching && this.lockDir ? this.lockDir : toP.clone().normalize());   // (colpendo: passo nella direzione di partenza)
    } else if (this.holdDist && !this.down) this.move(dt, dist, toP.clone().normalize());   // si allontana (angolo neutro)
    else this.vel.set(0, 0, 0);
    this.animate(dt);
    if (this.enabled) this.resolveMyPunch(player, dist);
  }

  // sta tirando un pugno (partito e non ancora rientrato in guardia)
  committed() {
    const P = this.punch;
    return !!(P && !P.move && PUNCH[P.name] && this.state === 'attack' && P.layer.t > 0.02 && P.layer.t < P.layer.dur * 0.8);
  }
  think(dt, player, dist) {
    const c = this.cfg;
    // 1) difesa: guarda i tuoi guantoni. Conta solo un pugno in rotta di collisione con testa o corpo
    //    (non qualunque movimento delle mani), letto appena parte la spinta.
    // pugno partito: finche' il braccio non rientra e' impegnato e non puo' parare ne' schivare (a tutti i livelli:
    // prima ai livelli alti lasciava il colpo a meta' per schivare il tuo e non si riusciva mai a entrare)
    let committed = this.committed();
    // come i pugili veri, ogni tanto (dai livelli alti) lascia il colpo appena partito, schiva e rientra col
    // contrattacco: solo nella prima parte del pugno, a braccio non ancora disteso
    if (committed) {
      const P = this.punch;
      if (P.bail === undefined) P.bail = Math.random() < (BAIL[this.levelName] || 0);
      if (P.bail && P.layer.t < Math.max(PUNCH[P.name].from / 30, 0.16)) committed = false;   // (il jab arriva a segno quasi subito)
    }
    if (committed) this.reaction = null;
    // impara il tuo stile (Difficile e Impossibile) e, col passare dell'incontro, ne approfitta
    const L = this.learnOn && this.learner, ls = L ? L.strength(this.levelName) : 0;
    if (L) {
      L.observe(dt, this, player);
      if (L.ready(this.levelName)) { L.announced = true; this.emit('adapted'); }
      if (ls > 0) this._exploit(L, ls, committed);
    }
    if (!this.reaction && this.stun <= 0 && !committed) {
      const hc = this.headCenter();
      const [t0, t1] = this.torso();
      const tm = t0.clone().lerp(t1, 0.5);
      for (const g of Object.values(player.gloves)) {
        if (!g.mesh.visible || g.speed < c.threatSpeed || this.seen[g.side] === g.punchId) continue;
        if (this.defending && !c.chain) continue;
        if (this.defending && this.defending.glove === g.side && this.defending.punchId === g.punchId) continue;
        // verso cosa va il pugno: testa o corpo (il bersaglio a cui passera' piu' vicino)
        let threat = null, best = Infinity;
        for (const [T, R, zone] of [[hc, 0.30, 'head'], [tm, 0.30, 'body']]) {
          const rel = _b.subVectors(T, g.center);
          if (rel.length() > c.threatDist) continue;
          const tca = rel.dot(g.vel) / (g.speed * g.speed);      // fra quanto passa piu' vicino
          if (tca < 0 || tca > 0.5) continue;
          const miss = _c.copy(g.center).addScaledVector(g.vel, tca).distanceTo(T);
          if (miss < R && miss < best) { best = miss; threat = zone; }
        }
        if (!threat) continue;
        this.seen[g.side] = g.punchId;
        const open = this.time < this.openUntil;              // appena parato/schivato da te: e' scoperto
        const ready = this.state === 'feint';                 // stava fingendo: ti aspettava
        if (ready || Math.random() < c.reactChance * (open ? c.openFactor : 1) * (1 - 0.35 * (this.fatigue || 0))) this.reaction = { at: this.time + (ready ? c.reactDelay[0] : rand(...c.reactDelay)), glove: g, punchId: g.punchId, zone: threat };
        break;
      }
    }
    if (this.reaction && this.time >= this.reaction.at && !committed) {
      const g = this.reaction.glove;
      const type = this.chooseDefense(g, this.reaction.zone);
      // che pugno era (tu in guardia normale: sinistro = jab, destro = diretto)
      const lvx = Math.abs(g.vel.clone().applyQuaternion(_q.copy(this.root.quaternion).invert()).x) / Math.max(0.01, g.speed);
      const kind = this.reaction.zone === 'body' ? 'body' : lvx > 0.5 ? 'hook' : g.side === 'left' ? 'jab' : 'cross';
      const bailed = !!(this.punch && !this.punch.move && PUNCH[this.punch.name]);
      if (this.punch) { this.punch = null; this.combo = []; this.setState('retreat'); }
      if (type === 'back') this.backOff = 0.3;                       // indietro di un passo
      else this.play(type, c.defenseSpeed);
      this.defending = { kind, start: this.time, type, until: this.time + 0.55 / Math.max(1, c.defenseSpeed * 0.75), glove: g.side,
        punchId: this.reaction.punchId, hit: false, bailed };
      this.reaction = null;
    }
    if (this.defending) {
      const g = player.gloves[this.defending.glove === 'left' ? 'left' : 'right'];
      const hc = this.headCenter();
      const rel = _b.subVectors(hc, g.center);
      const coming = g.mesh.visible && g.speed > 0.8 && g.vel.dot(rel) / rel.length() > 0.3 && rel.length() < 0.75;
      if (coming) {
        this.defending.until = Math.max(this.defending.until, this.time + 0.12);
        const h = HOLD[this.defending.type], l = this.current();
        if (h && l && l.name === this.defending.type && l.t * 30 > h[1]) { l.t = h[1] / 30 - 0.02; l.action.time = l.t; }
      }
    }
    if (this.defending && this.time > this.defending.until) {
      const ok = !this.defending.hit;
      if (ok && this.defending.type !== 'block') this.emit('mikeDodged');
      this.defending_last = this.defending;
      this.defending = null;
      if (ok) this.maybeCounter(this.defending_last);
    }

    // ritmo della guardia: mentre ti studia ogni tanto la abbassa; appena c'e' pericolo o attacca la rialza
    const busy = this.reaction || this.defending || this.state !== 'stalk' || this.stun > 0;
    this.lowTimer -= dt;
    if (busy) this.lowTarget = 0;
    else if (this.lowTimer <= 0) {
      this.lowTimer = rand(1.0, 2.8);
      this.lowTarget = Math.random() < c.lowGuard ? rand(0.6, 1) : 0;
    }
    this.low += (this.lowTarget - this.low) * Math.min(1, dt * (this.lowTarget > this.low ? 3 : 9));

    // 2) attacco
    switch (this.state) {
      case 'stalk':
        if (this.noAttack) break;                          // sparring a esercizi: attacca solo quando lo chiama l'allenatore
        this.nextAttack -= dt;
        {
          // ti scopri (guantoni lontani dal viso) o hai appena tirato a vuoto: Mike ne approfitta
          const open = Object.values(player.gloves).filter(g => g.mesh.visible && g.center.distanceTo(player.head) > 0.42).length;
          if (open && Math.random() < dt * (0.6 + c.counterChance * 2) * open) this.nextAttack = Math.min(this.nextAttack, 0.05);
        }
        if (this.nextAttack <= 0 && !this.defending && this.stun <= 0) {
          // guardia alta (tutti e due i guantoni vicino al viso)? allora va al corpo o di gancio
          const high = Object.values(player.gloves).every(g => g.mesh.visible && g.center.distanceTo(player.head) < 0.42);
          const toBody = Math.random() < (high ? c.bodyBias : c.bodyBias * 0.3);
          this.combo = [...pick(toBody ? BODY_COMBOS : c.combos)]; this.counterCombo = false;
          // conosce la tua difesa abituale: tira la combinazione che la punisce
          const hb = L && ls > 0 && L.defHabit();
          if (hb && Math.random() < ls * hb.share) {
            const opts = PUNISH[hb.type].filter(cb => cb && cb.every(n => this.clips[n]));
            if (opts.length) this.combo = [...pick(opts)];
          } else this.readGuard(player);
          // finta: prima accenna un colpo per farti scoprire (piu' spesso ai livelli alti e se il pugile e' tecnico)
          const fr = (FEINT[this.levelName] || 0) * (this.cfg0.feints ? 1.35 : 1);
          if (!this.noAttack && dist < c.stalkDist + 0.4 && Math.random() < fr) this._startFeint(player);
          else this.setState('approach');
        } else if (!this.defending && !this.layers.length && this.cfg0.feints && Math.random() < this.cfg0.feints.rate * dt) {
          const f = this.cfg0.feints, mv = pick(f.moves.filter(n => this.clips[n]));    // finta del suo stile (a vuoto)
          if (mv) this.play(mv, f.speed);
        } else if (!this.defending && !this.layers.length && Math.random() < c.feints * dt) {
          this.play(pick(['slip_l', 'slip_r', 'duck', 'block']), c.defenseSpeed * 0.9);   // finta
        }
        break;
      case 'feint': {
        // guarda come reagisci alla finta e attacca dove ti sei scoperto
        const F = this.feint; F.t += dt;
        if (!F.bit) {
          for (const g of Object.values(player.gloves)) if (g.mesh.visible && g.punchId !== F.ids[g.side] && g.speed > 1.5) F.bit = 'counter';
          if (!F.bit) {
            const d = this.root.worldToLocal(player.head.clone()).sub(F.head), gd = this._guardDist(player);
            F.bit = d.y < -0.08 ? 'duck' : d.x > 0.07 ? 'slip_l' : d.x < -0.07 ? 'slip_r' : d.z > 0.1 ? 'back'
              : gd < F.guard - 0.06 && gd < 0.32 ? 'block' : null;
          }
          if (F.bit) {
            F.bitT = F.t; this.emit('feinted', { bit: F.bit });
            if (F.bit !== 'counter') { const opts = PUNISH[F.bit].filter(cb => cb && cb.every(n => this.clips[n])); if (opts.length) this.combo = [...pick(opts)]; }
          }
        }
        // hai provato a contrattaccare la finta: era pronto, si difende (la difesa e' gia' partita) e poi risponde
        if (F.bit === 'counter') { this.feint = null; this.combo = []; this.setState('stalk'); this.nextAttack = 0.7; break; }
        if ((F.bit && F.t - F.bitT > 0.06) || F.t > 0.45) {
          this.feint = null; this.counterCombo = !!F.bit;     // ci sei cascato: ti prende scoperto (colpo pieno)
          this.setState('approach');
        }
        break;
      }
      case 'approach':
        if ((Math.abs(dist - this.attackDist()) < 0.07 || this.stateT > (this.counter ? 0.35 : 1.2)) && !this.defending) {
          this.counter = false;
          this.setState('attack'); this.nextPunch();
        }
        break;
      case 'attack':
        // pugno interrotto da un'altra animazione (parata, colpo preso): prima restava "in attacco" per sempre,
        // con la direzione bloccata (non si girava piu' verso di te) e senza tornare in guardia
        if (this.punch && (this.punch.layer.out || this.stateT > 3 / Math.max(0.05, c.punchSpeed))) { this.punch = null; this.combo = []; this.setState('retreat'); break; }
        // sparring in difesa: dopo l'impatto il resto (seguito e rientro in guardia) accelera fino a durare quanto
        // l'andata: niente pausa col braccio fuori e niente salti (prima si saltava un pezzo e il braccio "scattava")
        if ((this.quickRecover || this.cfg.punchSpeed < 0.6) && this.punch && !this.punch.move && !this.punch.fast && PUNCH[this.punch.name]) {
          const sp = PUNCH[this.punch.name], L = this.punch.layer, imp = (sp.from + sp.to) / 2 / 30;
          if (L.t >= imp) { this.punch.fast = true; L.ts = L.ts * Math.max(1, (L.dur - imp) / imp); L.action.timeScale = L.ts; }
        }
        if (this.punch && this.punch.layer.t > this.punch.layer.dur * (this.punch.move ? 0.5 : 0.72)) {
          if (this.combo.length && this.stun <= 0) this.nextPunch();
          else { this.punch = null; this.setState('retreat'); }
        } else if (!this.punch) this.setState('retreat');
        break;
      case 'retreat':
        if (this.stateT > c.retreatTime) { this.setState('stalk'); this.nextAttack = rand(...c.attackEvery); }
        break;
    }
  }

  // quello che ha imparato di te, in pratica (s = quanto ne approfitta, 0..1)
  _exploit(L, s, committed) {
    const T = L.t, last = L.last;
    // a) sa cosa tiri dopo: si difende dal colpo che sta per arrivare prima ancora che parta
    const pred = L.predictNext();
    if (pred && last && !last.antic && T - last.t > 0.12 && T - last.t < 0.4) {
      last.antic = true;
      // (anche se si sta ancora difendendo dal colpo di prima: passa subito alla difesa dal prossimo)
      if (!committed && !(this.defending && this.defending.read) && this.stun <= 0 && !this.down && Math.random() < s * pred.p) {
        this.reaction = null;
        const type = { jab: 'slip_l', cross: 'slip_r', hook: 'duck', upper: 'back', body: 'block_low' }[pred.kind];
        const glove = pred.kind === 'jab' ? 'left' : pred.kind === 'cross' ? 'right' : last.side === 'left' ? 'right' : 'left';
        if (this.punch) { this.punch = null; this.combo = []; this.setState('retreat'); }
        if (type === 'back') this.backOff = 0.3; else this.play(type, this.cfg.defenseSpeed);
        this.defending = { kind: pred.kind === 'upper' ? 'jab' : pred.kind, start: this.time, type, until: this.time + 0.55 / Math.max(1, this.cfg.defenseSpeed * 0.75),
          glove, punchId: -1, hit: false, read: true };
      }
    }
    if (this.state !== 'stalk' || this.defending || this.stun > 0) return;
    // b) dopo che hai attaccato resti scoperto: parte subito, mentre rientri
    if (L.justEnded && T - L.justEnded < 0.15) {
      if (Math.random() < s * L.openAfter()) this.nextAttack = 0;
      L.justEnded = null;
    }
    // c) attacchi sempre con lo stesso ritmo: ti anticipa partendo un attimo prima di te
    const n = L.nextAttackIn();
    if (n !== null && n > 0.15 && n < 0.45 && this._beat !== L.seqStart) {
      this._beat = L.seqStart;
      if (Math.random() < s * 0.8) this.nextAttack = 0;
    }
  }

  _guardDist(player) {
    const gs = Object.values(player.gloves).filter(g => g.mesh.visible);
    return gs.length ? gs.reduce((a, g) => a + g.center.distanceTo(player.head), 0) / gs.length : 1;
  }
  _startFeint(player) {
    const opts = ['feint_jab', 'feint_jab', 'feint_dip'].filter(n => this.clips[n]);
    if (!opts.length) { this.setState('approach'); return; }
    this.play(pick(opts), 1.2);
    this.feint = { t: 0, head: this.root.worldToLocal(player.head.clone()), guard: this._guardDist(player),
      ids: { left: player.gloves.left.punchId, right: player.gloves.right.punchId }, bit: null };
    this.setState('feint');
  }

  // tolto di scena: libera la memoria della grafica (geometrie, materiali, immagini) e le animazioni
  dispose() {
    try { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model); } catch (e) {}
    this.root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) {
        for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) u.value.dispose();
        m.dispose();
      }
    });
  }

  setState(s) { this.state = s; this.stateT = 0; }
  // sparring: tira questa combinazione adesso (nomi dei colpi, es. ['jab', 'cross'])
  throwCombo(list) { this.combo = [...list]; this.counter = false; this.counterCombo = false; this.setState('approach'); }

  // quale difesa usare contro questo pugno
  chooseDefense(g, zone) {
    const c = this.cfg;
    const local = this.root.worldToLocal(g.center.clone());
    const lv = g.vel.clone().applyQuaternion(_q.copy(this.root.quaternion).invert());
    const sp = Math.max(0.01, lv.length());
    const hook = Math.abs(lv.x) / sp > 0.5;                         // arriva di lato
    // dove arrivera' il guantone rispetto alla testa: si sposta dal lato opposto (+X = sinistra di Mike)
    const hc0 = this.headCenter();
    const tA = Math.min(0.3, g.center.distanceTo(hc0) / Math.max(0.5, g.speed));
    const arrive = this.root.worldToLocal(g.center.clone().addScaledVector(g.vel, tA));
    const headL = this.root.worldToLocal(hc0.clone());
    const dx = arrive.x - headL.x;
    const away = Math.abs(dx) > 0.03 ? (dx > 0 ? 'slip_r' : 'slip_l') : (local.x > 0 ? 'slip_r' : 'slip_l');
    const r = Math.random();
    if (!c.smart) {
      if (zone === 'body') return r < 0.6 ? 'block_low' : 'back';
      if (hook && r < 0.5) return 'duck';
      return r < 0.5 ? 'block' : r < 0.85 ? away : 'duck';
    }
    // dove sta andando il pugno: al corpo o alla testa?
    if (zone === 'body') return 'block_low';                       // ai livelli alti para sempre in basso
    // abbassarsi serve solo se il pugno arriva all'altezza della testa o piu' in alto
    const hc = this.headCenter();
    const tArr = Math.min(0.3, g.center.distanceTo(hc) / Math.max(0.5, g.speed));
    const high = g.center.y + g.vel.y * tArr > hc.y - 0.03;
    if (hook) return high && r < 0.75 ? 'duck' : r < 0.85 ? away : 'block';
    return r < 0.75 ? away : high && r < 0.9 ? 'duck' : 'block';
  }

  // dopo una difesa riuscita: contrattacco immediato
  maybeCounter(d) {
    // (ha lasciato il suo colpo per schivare: rientra sempre)
    if (this.stun > 0 || this.state === 'attack' || (!(d && d.bailed) && Math.random() >= this.cfg.counterChance)) return;
    const key = d && (d.type.startsWith('slip') ? 'slip' : d.type);
    const opts = d && COUNTER_TABLE[d.kind] && COUNTER_TABLE[d.kind][key];
    this.combo = [...pick(opts || COUNTERS)]; this.counterCombo = true;      // (i contrattacchi fanno piu' male)
    this.setState('approach');
    this.counter = true;
  }
  attackDist() { const a = this.aimPunch(); return (a ? a.dist - 0.03 : this.cfg.attackDist) + (this.reachExtra || 0); }   // reachExtra: sparring in difesa, tira da un po' piu' lontano

  // ---- mira ai punti scoperti: da dove arriva ogni colpo e se un tuo guantone e' sulla traiettoria
  punchPath(name, player) {
    const f = this.forward(), side = _c.set(1, 0, 0).applyQuaternion(this.root.quaternion);   // +X = sinistra di Mike
    const head = player.head.clone().add(_d.set(0, -0.05, 0)), body = player.head.clone().add(_d.set(0, -0.45, 0));
    const spec = PUNCH[name], sx = spec.side === 'l' ? 1 : -1;
    const target = spec.zone === 'body' ? body : head;
    const shY = this.headCenter(_e).y - this.root.position.y - 0.27;                 // spalle all'altezza vera del pugile
    const shoulder = this.root.position.clone().add(_d.set(0, shY, 0)).addScaledVector(side, 0.2 * sx);
    let start;
    if (name === 'jab' || name === 'cross') start = shoulder;                                         // dritto, da davanti
    else if (name.startsWith('hook')) start = target.clone().addScaledVector(side, 0.45 * sx).addScaledVector(f, -0.15);   // di lato
    else if (name.startsWith('uppercut')) start = target.clone().add(_d.set(0, -0.45, 0)).addScaledVector(f, -0.25).addScaledVector(side, 0.1 * sx);
    else start = target.clone().addScaledVector(side, 0.35 * sx).addScaledVector(f, -0.25).add(_d.set(0, -0.05, 0));   // al corpo, un po' di lato
    return { a: start.lerp(target, 0.35), b: target };
  }
  // distanza minima fra i tuoi guantoni e la parte finale della traiettoria (sotto 0.16 m il colpo e' coperto)
  pathClearance(name, player) {
    const { a, b } = this.punchPath(name, player);
    let best = 9;
    for (const g of Object.values(player.gloves)) if (g.mesh.visible) best = Math.min(best, distPointSeg(g.center, a, b));
    return best;
  }
  // se il prossimo colpo e' coperto, Mike (secondo il livello) lo cambia con uno che arriva dove sei scoperto
  readGuard(player) {
    const name = this.combo[0];
    if (!name || !PUNCH[name] || !player || Math.random() >= (this.cfg.readGuard ?? 0.6)) return true;
    const CLEAR = 0.2;                                         // guantone del giocatore piu' vicino di 20 cm = colpo coperto
    if (this.pathClearance(name, player) >= CLEAR) return true;
    const open = Object.keys(PUNCH).filter(n => this.clips[n] && n !== name)
      .map(n => ({ n, c: this.pathClearance(n, player) })).filter(o => o.c >= CLEAR).sort((x, y) => y.c - x.c);
    if (!open.length) return false;                            // tutto coperto: non tira sui guantoni, aspetta un'apertura
    const head = open.filter(o => PUNCH[o.n].zone === 'head');
    const best = (head.length && Math.random() < 0.6 ? head : open).slice(0, 2);   // tra i piu' scoperti
    this.combo[0] = pick(best).n;
    return true;
  }

  nextPunch(player = this.lastPlayer) {
    if (this.readGuard(player) === false && this.combo.length && PUNCH[this.combo[0]] && Math.random() < (this.cfg.readGuard ?? 0.6)) {
      // guardia chiusa dappertutto: interrompe la combinazione e torna a studiarti (riparte appena ti apri)
      this.combo = []; this.punch = null; this.nextAttack = 0.25 + Math.random() * 0.35; this.setState('retreat'); return;
    }
    const name = this.combo.shift();
    if (!name || !this.clips[name]) { this.punch = null; this.setState('retreat'); return; }
    if (MOVES.has(name)) {                                   // movimento di difesa dentro la combinazione
      const layer = this.play(name, this.cfg.defenseSpeed);
      this.punch = { name, layer, resolved: true, move: true };
      return;
    }
    let ts = this.cfg.punchSpeed * (1 - 0.2 * (this.fatigue || 0));
    // stessa velocita' del guantone per tutti i colpi: il jab non e' piu' un lampo e il gancio ci mette di piu'
    // solo perche' fa piu' strada (prima ogni animazione aveva la sua velocita')
    const im = this.impact && this.impact[name];
    if (im && im.speed > 0 && this.refSpeed) ts *= THREE.MathUtils.clamp(this.refSpeed / im.speed, 0.4, 2.5);
    const layer = this.play(name, ts);
    this.punch = { name, layer, resolved: false, inRange: false, counter: !!this.counterCombo };
    this.emit('mikeThrows', { name });
  }

  move(dt, dist, dir) {
    if (this.stun > 0) { this.vel.set(0, 0, 0); if (this.moveVel) this.moveVel.set(0, 0, 0); return; }
    const c = this.cfg;
    let desired = this.holdDist || (this.state === 'approach' || this.state === 'attack' ? this.attackDist() : c.stalkDist);
    // gioco di gambe (incontri, anche contro di te; non negli esercizi): ogni tanto si allontana, ti gira intorno, cambia lato
    let fwSide = 0;
    if (this.footwork !== false && this.enabled && !this.holdDist && (this.state === 'stalk' || this.state === 'retreat')) {
      if (!this.fw || (this.fw.t -= dt) <= 0) this.fw = { t: 1.2 + Math.random() * 2.2, off: Math.random() < 0.45 ? 0.3 + Math.random() * 0.8 : 0, side: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.45) };
      desired += this.fw.off; fwSide = this.fw.side;
    }
    let radial = Math.max(-c.moveSpeed, Math.min(c.moveSpeed * (this.counter ? 1.6 : 1), (dist - desired) * 4));
    // pugno partito: il passo resta quello deciso al lancio (se indietreggi non ti insegue: la schivata indietro
    // funziona); ti segue di nuovo quando il colpo e' finito
    const pp = this.state === 'attack' && this.punch && !this.punch.move && !this.punch.resolved ? this.punch : null;
    if (pp) { if (pp.radial === undefined) pp.radial = radial; radial = Math.min(radial, pp.radial); }
    if (this.state === 'retreat') radial = Math.min(radial, -0.2);
    if (this.backOff > 0) { radial = -1.1; this.backOff -= 1.1 * dt; }   // passo indietro (schiva al corpo), con i passi
    const side = _c.set(dir.z, 0, -dir.x);       // perpendicolare: gira intorno
    const strafe = (this.state === 'stalk' ? Math.sin(this.time * 0.8 + this.strafe) * 0.3 : 0) + fwSide;
    // velocita' con un minimo di inerzia (un pugile non parte e non si ferma di colpo)
    const target = _b.copy(dir).multiplyScalar(radial).addScaledVector(side, strafe);
    this.moveVel.lerp(target, Math.min(1, dt * 6));
    this.prevPos.copy(this.root.position);
    this.root.position.addScaledVector(this.moveVel, dt);
    if (this.bounds) this.bounds(this.root.position);
    if (dt > 0) this.vel.subVectors(this.root.position, this.prevPos).divideScalar(dt);   // velocita' vera (con le corde)
  }

  // i miei pugni: hanno colpito, sono stati parati o sono andati a vuoto?
  resolveMyPunch(player, dist) {
    const p = this.punch;
    if (!p || p.resolved) return;
    const spec = PUNCH[p.name], f = p.layer.t * 30;
    if (f < spec.from) return;
    if (f > spec.to) {
      p.resolved = true;
      if (dist < 0.9) { this.openUntil = this.time + 0.7; this.emit('playerDodged'); }
      return;
    }
    p.inRange = true;
    const { tip, center } = this.glove(spec.side);
    // il tratto percorso dalla punta in questo fotogramma: un guantone tuo sulla traiettoria la ferma
    const prevTip = p.prevTip || tip;
    p.prevTip = tip.clone();
    for (const g of Object.values(player.gloves)) {
      // contatto vero fra i due guantoni (raggi ~6-7 cm): un guantone basso non ferma un colpo che gli passa sopra
      if (g.mesh.visible && (distPointSeg(g.center, prevTip, tip) < 0.13 || g.center.distanceTo(center) < 0.12)) {
        p.resolved = true; this.openUntil = this.time + 0.7; this.emit('playerBlocked', { side: g.side }); return;
      }
    }
    // la tua guardia alta (tutti e due i guantoni davanti al viso) ferma i colpi dritti e i montanti;
    // i ganci, che arrivano di lato, passano a volte
    const guardUp = Object.values(player.gloves).every(g => g.mesh.visible && g.center.distanceTo(player.head) < 0.32);
    if (p.hookThrough === undefined) p.hookThrough = Math.random() < 0.45;
    if (guardUp && spec.zone === 'head' && (!p.name.startsWith('hook') || !p.hookThrough) &&
        (tip.distanceTo(player.head) < 0.3 || center.distanceTo(player.head) < 0.28)) {
      p.resolved = true; this.openUntil = this.time + 0.7; this.emit('playerBlocked', { side: 'left' }); return;
    }
    if (spec.zone === 'body') {
      // il tuo corpo: dal petto alla pancia, sotto la testa
      const top = player.head.clone().add(new THREE.Vector3(0, -0.28, 0)), bot = player.head.clone().add(new THREE.Vector3(0, -0.62, 0));
      if (distPointSeg(tip, top, bot) < 0.2 || distPointSeg(center, top, bot) < 0.18) {
        p.resolved = true; this.emit('mikeHit', { name: p.name, zone: 'body', counter: p.counter, point: tip.clone(), dir: tip.distanceTo(prevTip) > 1e-4 ? tip.clone().sub(prevTip).normalize() : this.forward() });   // (dove: lividi negli incontri tra pugili)
      }
    } else if (tip.distanceTo(player.head) < 0.17 || center.distanceTo(player.head) < 0.15) {
      p.resolved = true; this.emit('mikeHit', { name: p.name, zone: 'head', counter: p.counter, point: tip.clone(), dir: tip.distanceTo(prevTip) > 1e-4 ? tip.clone().sub(prevTip).normalize() : this.forward() });   // (dove: lividi negli incontri tra pugili)
    }
  }

  // i tuoi pugni
  checkPlayerPunches(player) {
    const hc = this.headCenter();
    const [t0, t1] = this.torso();
    const towardMike = this.forward().negate();
    const gl = { l: this.glove('l'), r: this.glove('r') };
    for (const g of Object.values(player.gloves)) {
      if (!g.mesh.visible || g.cooldown > 0 || g.peakSpeed() < (this.lightHits ? 1.4 : 1.8)) continue;   // (in allenamento valgono anche i colpi leggeri)
      // niente doppi colpi: conta solo un guantone che IN QUESTO MOMENTO va veloce verso il bersaglio (testa o
      // busto) e che ci si e' avvicinato di almeno 12 cm. Un pugno gia' arrivato, che si ritira, un mezzo
      // movimento o la testa di Mike che dopo il colpo torna contro il guantone fermo non valgono
      const tgt = g.center.y > hc.y - 0.25 ? hc : _e.copy(t0).add(t1).multiplyScalar(0.5);
      const toT = _d.copy(tgt).sub(g.center).normalize();
      const minNow = this.lightHits ? 0.9 : 1.2;
      if (g.speed < minNow || g.vel.dot(toT) < 0.5 * g.speed) continue;   // (ganci: arrivano di lato ma si avvicinano)
      if (g.travel(toT) < 0.12) continue;
      const [a, b] = g.segment();
      let ev = null;
      // colpo basso: il pugno arriva sotto la cintura (vale solo finche' Mike ha almeno meta' energia)
      const belt = this.bonePos('pelvis').y + 0.10;          // bordo alto dei calzoncini
      const groin = this.bonePos('pelvis').addScaledVector(this.forward(), 0.13).add(new THREE.Vector3(0, -0.13, 0));
      if (this.lowBlowAllowed && g.center.y < belt && distPointSeg(groin, a, b) < g.radius + 0.14) {
        g.cooldown = 0.6; g.contactPoint.copy(g.center); g.hist.length = 0;   // (storia azzerata: per contarne un altro serve un pugno nuovo)
        this.emit('lowBlow', { side: g.side });
        continue;
      }
      // sotto la cintura non si fanno mai punti (anche quando non scatta la penalita')
      if (g.center.y < belt) { g.cooldown = 0.3; continue; }
      // in parata i guantoni coprono bene; nella guardia normale lasciano spazi
      const blocking = this.defending && this.defending.type === 'block';
      const blockLow = this.defending && this.defending.type === 'block_low';
      const guard = blocking ? this.cfg.blockReach : blockLow ? -0.06 : this.cfg.guardReach * (1 - this.low) - 0.06 * this.low;
      for (const s of ['l', 'r']) {
        if (distPointSeg(gl[s].center, a, b) < g.radius + guard) { ev = { type: 'mikeBlocked' }; break; }
      }
      if (!ev && blockLow && distSegSeg(a, b, t0, t1) < g.radius + 0.2) ev = { type: 'mikeBlocked' };
      if (!ev && distPointSeg(hc, a, b) < g.radius + 0.115) ev = { type: 'playerHit', zone: 'head' };
      if (!ev && distSegSeg(a, b, t0, t1) < g.radius + 0.16) ev = { type: 'playerHit', zone: 'body' };
      if (!ev) continue;
      // ai livelli alti la difesa funziona: se si stava gia' difendendo il colpo va quasi sempre a vuoto,
      // e a Impossibile lo evita all'ultimo anche senza essersi preparato
      if (ev.type === 'playerHit' && this.stun <= 0 && !this.down) {
        const d = this.defending;
        if (d && Math.random() < (this.cfg.evade ?? 0)) ev = { type: d.type.startsWith('block') ? 'mikeBlocked' : 'mikeDodged' };
        else if (!d && !this.committed() && Math.random() < (this.cfg.reflex ?? 0)) {
          const mv = ev.zone === 'body' ? 'block_low' : pick(['slip_l', 'slip_r', 'duck', 'block']);
          this.play(mv, this.cfg.defenseSpeed);
          ev = { type: mv.startsWith('block') ? 'mikeBlocked' : 'mikeDodged' };
        }
      }
      g.cooldown = 0.45; g.contactPoint.copy(g.center); g.hist.length = 0;
      ev.side = g.side; ev.speed = g.peakSpeed();
      const lp = this.root.worldToLocal(g.center.clone()), lh = this.root.worldToLocal(hc.clone());
      ev.why = `t+${this.defending ? (this.time - this.defending.start).toFixed(2) : '-'} hx${lh.x.toFixed(2)} gx${lp.x.toFixed(2)} gy${(lp.y - lh.y).toFixed(2)} ${this.state}${this.defending ? '/' + this.defending.type : ''}${this.time < this.openUntil ? '/aperto' : ''}${this.punch ? '/pugno' : ''}`;
      // dove ha colpito, nel sistema di Mike (per i lividi): x>0 = sua sinistra, y rispetto al centro della testa
      ev.lx = lp.x; ev.ly = lp.y - lh.y;
      ev.point = g.center.clone(); ev.dir = g.vel.clone().normalize();
      // preso mentre tirava o subito dopo aver mancato: e' un contrattacco tuo, fa piu' male
      if (ev.type === 'playerHit') ev.counter = this.committed() || this.time < this.openUntil;
      this.emit(ev.type, ev);
      if (ev.type === 'playerHit') {
        if (this.defending) this.defending.hit = true;
        this.reaction = null;
        this.stun = 0.35;
        if (this.punch && Math.random() < 0.6) { this.punch = null; this.combo = []; this.setState('retreat'); }
        this.play(ev.zone === 'head' ? 'hit_head' : 'hit_body', 1.1);
        this.pain = ev.zone === 'head' ? 1.1 : 0.8;          // smorfia
      }
    }
  }
}
