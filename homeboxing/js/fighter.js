// Fighter: comportamento condiviso di tutti i pugili. Modello animato + intelligenza artificiale (si muove, para, schiva, attacca).
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
// simboli per i calzoncini (disegnati in bianco su trasparente, centrati in (cx, cy), altezza ~ 120 * s)
function legIcon(g, kind, cx, cy, s) {
  if(kind==='diamond'||kind==='metronome'){
    g.save();g.translate(cx,cy);g.scale(s,s);g.lineWidth=7;g.lineJoin='round';
    if(kind==='diamond'){g.beginPath();g.moveTo(-78,-42);g.lineTo(-44,-78);g.lineTo(44,-78);g.lineTo(78,-42);g.lineTo(0,70);g.closePath();g.moveTo(-78,-42);g.lineTo(78,-42);g.moveTo(-44,-78);g.lineTo(-25,-42);g.lineTo(0,70);g.lineTo(25,-42);g.lineTo(44,-78);g.moveTo(-25,-42);g.lineTo(0,-78);g.lineTo(25,-42);g.stroke();}
    else{g.beginPath();g.moveTo(-52,74);g.lineTo(-28,-75);g.lineTo(28,-75);g.lineTo(52,74);g.closePath();g.moveTo(-52,53);g.lineTo(52,53);g.moveTo(0,47);g.lineTo(46,-42);g.stroke();g.fillRect(24,-23,19,22);}
    g.restore();return;
  }
  g.save(); g.translate(cx, cy); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
  if (kind === 'glove') {                                           // guantone: corpo, pollice staccato da una riga, polsino
    g.rotate(-0.25);
    g.beginPath(); g.ellipse(6, -14, 50, 42, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(-44, 6, 17, 26, 0.35, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.roundRect(-26, 18, 64, 34, 7); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = 5;
    g.beginPath(); g.arc(-22, -4, 26, -1.9, 1.3); g.stroke(); g.fillRect(-26, 16, 64, 4);
  } else if (kind === 'hammer') {                                   // martello (Mjolnir): testa quadrata con le facce, manico con l'occhiello
    g.rotate(-0.5);
    g.beginPath(); g.roundRect(-14, -30, 28, 126, 8); g.fill();                                  // manico
    g.beginPath(); g.roundRect(-78, -92, 156, 74, 12); g.fill();                                  // testa
    g.beginPath(); g.roundRect(-92, -86, 22, 62, 6); g.fill(); g.beginPath(); g.roundRect(70, -86, 22, 62, 6); g.fill();   // facce battenti
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = 6;
    g.strokeRect(-56, -80, 112, 50);                                                             // riquadro inciso sulla testa
    g.fillRect(-14, -22, 28, 5);                                                                 // stacco testa / manico
    g.globalCompositeOperation = 'source-over'; g.lineWidth = 9;
    g.beginPath(); g.arc(0, 104, 14, 0, Math.PI * 2); g.stroke();                                // occhiello in fondo al manico
  } else if (kind === 'lion') {                                     // testa di leone: criniera a punte, muso chiaro con occhi, naso e bocca
    const sp = 18, R1 = 104, R2 = 84;
    g.beginPath(); for (let k = 0; k < sp * 2; k++) { const a = k * Math.PI / sp, r = k % 2 ? R2 : R1; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();   // criniera
    g.beginPath(); g.arc(-52, -78, 20, 0, Math.PI * 2); g.arc(52, -78, 20, 0, Math.PI * 2); g.fill();                 // orecchie
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.ellipse(0, 6, 56, 68, 0, 0, Math.PI * 2); g.fill();                                              // muso
    g.globalCompositeOperation = 'source-over';
    g.beginPath(); g.ellipse(-24, -14, 11, 8, 0.25, 0, Math.PI * 2); g.ellipse(24, -14, 11, 8, -0.25, 0, Math.PI * 2); g.fill();   // occhi
    g.beginPath(); g.moveTo(-17, 8); g.lineTo(17, 8); g.lineTo(0, 28); g.closePath(); g.fill();                         // naso
    g.lineWidth = 7; g.beginPath(); g.moveTo(0, 28); g.lineTo(0, 44); g.moveTo(-24, 40); g.quadraticCurveTo(-10, 56, 0, 44); g.quadraticCurveTo(10, 56, 24, 40); g.stroke();   // bocca
  } else if (kind === 'kungfu') {                                   // sagoma che da' un calcio volante (di lato, verso destra)
    g.lineWidth = 20;
    g.beginPath(); g.arc(-10, -78, 21, 0, Math.PI * 2); g.fill();                                // testa
    g.lineWidth = 34; g.beginPath(); g.moveTo(-14, -48); g.lineTo(-36, 14); g.stroke();          // busto (piegato all'indietro)
    g.lineWidth = 20;
    g.beginPath(); g.moveTo(-36, 14); g.lineTo(26, 6); g.lineTo(92, -22); g.stroke();            // gamba del calcio, tesa in avanti e in alto
    g.beginPath(); g.moveTo(-36, 14); g.lineTo(-62, 44); g.lineTo(-30, 74); g.stroke();          // gamba piegata sotto
    g.lineWidth = 15;
    g.beginPath(); g.moveTo(-18, -40); g.lineTo(18, -52); g.lineTo(44, -34); g.stroke();         // braccio avanti
    g.beginPath(); g.moveTo(-22, -38); g.lineTo(-62, -52); g.lineTo(-84, -76); g.stroke();       // braccio indietro
  } else if (kind === 'bull') {                                     // toro: testa di fronte con le corna, orecchie, occhi e narici
    g.lineWidth = 19;
    g.beginPath(); g.moveTo(-40, -40); g.quadraticCurveTo(-106, -36, -96, -104); g.stroke();
    g.beginPath(); g.moveTo(40, -40); g.quadraticCurveTo(106, -36, 96, -104); g.stroke();
    g.beginPath(); g.ellipse(-64, -30, 26, 12, 0.45, 0, Math.PI * 2); g.ellipse(64, -30, 26, 12, -0.45, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-50, -54); g.quadraticCurveTo(0, -78, 50, -54); g.lineTo(42, 8); g.quadraticCurveTo(56, 40, 38, 74); g.quadraticCurveTo(0, 94, -38, 74); g.quadraticCurveTo(-56, 40, -42, 8); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.ellipse(-24, -22, 10, 5.5, 0.2, 0, Math.PI * 2); g.ellipse(24, -22, 10, 5.5, -0.2, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(-17, 52, 7, 11, 0.2, 0, Math.PI * 2); g.ellipse(17, 52, 7, 11, -0.2, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over'; g.lineWidth = 8; g.beginPath(); g.arc(0, 76, 15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();   // anello al naso
  } else if (kind === 'star5') {                                    // stella a cinque punte del Marocco (pentagramma, solo contorno)
    g.lineWidth = 12; g.beginPath();
    for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5; g.lineTo(Math.cos(a) * 92, Math.sin(a) * 92); }
    g.stroke();
  } else if (kind === 'bolt') {                                     // fulmine
    g.beginPath(); [[20, -106], [-50, 8], [-6, 8], [-28, 106], [52, -22], [8, -22], [36, -106]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
  } else if (kind === 'wolf') {                                     // lupo seduto che ulula alla luna
    g.lineWidth = 8; g.beginPath(); g.arc(-62, -66, 30, 0, Math.PI * 2); g.stroke();                              // luna
    g.beginPath(); g.ellipse(-8, 52, 50, 46, 0, 0, Math.PI * 2); g.fill();                                        // corpo
    g.lineWidth = 40; g.beginPath(); g.moveTo(4, 24); g.lineTo(26, -50); g.stroke();                              // collo
    g.beginPath(); [[14, -58], [18, -102], [38, -72], [100, -114], [94, -92], [62, -62], [46, -42]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();   // testa con il muso in su
    g.lineWidth = 22; g.beginPath(); g.moveTo(-50, 64); g.quadraticCurveTo(-96, 60, -104, 22); g.stroke();       // coda
    g.fillRect(2, 70, 20, 40); g.fillRect(34, 70, 20, 40);                                                         // zampe
  } else if (kind === 'tree') {                                     // albero: chioma a tre piani e tronco
    g.fillRect(-12, 34, 24, 72);
    g.beginPath(); g.moveTo(0, -108); g.lineTo(-58, -30); g.lineTo(58, -30); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, -74); g.lineTo(-74, 8); g.lineTo(74, 8); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, -40); g.lineTo(-90, 52); g.lineTo(90, 52); g.closePath(); g.fill();
  } else if (kind === 'heart') {                                    // cuore
    g.beginPath(); g.moveTo(0, 92); g.bezierCurveTo(-130, 8, -104, -96, 0, -42); g.bezierCurveTo(104, -96, 130, 8, 0, 92); g.closePath(); g.fill();
  } else if (kind === 'cobra') {                                    // cobra col cappuccio aperto
    g.lineWidth = 30; g.beginPath(); g.moveTo(-44, 104); g.bezierCurveTo(66, 100, 70, 36, 6, 14); g.bezierCurveTo(-46, -6, -14, -28, 0, -44); g.stroke();
    g.beginPath(); g.ellipse(0, -52, 48, 36, 0, 0, Math.PI * 2); g.fill();                                        // cappuccio
    g.beginPath(); g.ellipse(0, -90, 24, 20, 0, 0, Math.PI * 2); g.fill();                                        // testa
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(-10, -94, 4, 5, 0, 0, Math.PI * 2); g.ellipse(10, -94, 4, 5, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = 6; g.beginPath(); g.moveTo(0, -56); g.lineTo(0, -34); g.stroke();                               // disegno sul cappuccio
  }
  g.restore();
}
import * as THREE from 'three';
import { drawFlag } from './roster.js?v=20261013002357';
import { punchMotion } from './punch_motion.js?v=20261013002357';
export { StyleLearner } from './style_learn.js?v=20261013002357';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { firstContact, fighterShapes, playerShapes, PUNCH_LIMITS, impactPower, conditioning, exert } from './combat.js?v=20261013002357';
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
  '1-1-2b-3':['jab','jab','body_r','hook_l'],
  '2-3b-6':['cross','hook_body_l','uppercut_r'],
  '4b': ['hook_body_r'], '5b-2':['uppercut_body_l','cross'], '6b-3':['uppercut_body_r','hook_l'], '3b-6b':['hook_body_l','uppercut_body_r'],
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
  // (2026-10-10, Atom: stile misto) raffiche di jab, combinazioni lunghe che chiudono con ganci e montanti
  '1-1-1-2': ['jab', 'jab', 'jab', 'cross'], '1-2-3-6': ['jab', 'cross', 'hook_l', 'uppercut_r'],
  '1-2-6-3-2': ['jab', 'cross', 'uppercut_r', 'hook_l', 'cross'], '1-3b-3-2': ['jab', 'body_l', 'hook_l', 'cross'],
  '5-6-3-2': ['uppercut_l', 'uppercut_r', 'hook_l', 'cross'],
  // (Jesse: il gancio sinistro) doppio, dopo il jab, in chiusura
  '3-3': ['hook_l', 'hook_l'], '1-3': ['jab', 'hook_l'], '1-1-3': ['jab', 'jab', 'hook_l'], '1-3-3': ['jab', 'hook_l', 'hook_l'],
};
const combos = (...names) => names.map(n => C[n]);
// se tieni la guardia alta, Mike lavora al corpo e con montanti e ganci che entrano di lato
const BODY_COMBOS = combos('2b', '1-2b', '3b-3', '2-3b', '1-3b-3', '2b-3-2', '3b-4', '6-3b-3', '5b-2', '6b-3','4b','3b-6b');
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
  hook_body_l:{side:'l',from:7,to:12,zone:'body'},hook_body_r:{side:'r',from:8,to:13,zone:'body'},
  uppercut_body_l:{side:'l',from:4,to:8,zone:'body'},uppercut_body_r:{side:'r',from:4,to:9,zone:'body'},
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

export async function loadFighterGLTF(url, onProgress) {
  return new GLTFLoader().loadAsync(url, e => onProgress && e.total && onProgress(e.loaded / e.total));
}

export class Fighter {
  constructor(gltf, scene, level = 'normale', cfg = null) {
    this.cfg0 = cfg || {};                                 // aspetto del personaggio (fighters.js)
    this.setLevel(level);
    this.root = new THREE.Group(); this.root.name = this.cfg0.name || 'Fighter';
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
    this.brandShorts(); this.recolor(); this.legName(); this.gloveLetter(); this.helmetSeams();
    if (this.cfg0.hairTint) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Capelli folti') this.tintHair(o.material, this.cfg0.hairTint); });
    if (this.cfg0.fur) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Capelli') this.furMaterial(o.material, this.cfg0.fur); });
    if (this.cfg0.noStubble) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Capelli') o.visible = false; });
    if (this.cfg0.glow) this.model.traverse(o => { if (o.isMesh && this.cfg0.glow.includes(o.material.name)) { o.material.emissive.copy(o.material.color); o.material.emissiveIntensity = o.material.name === 'Cresta' ? 1.4 : 0.6; o.material.toneMapped = false; } });
    if (this.cfg0.evenSkin !== false) this.evenSkin();
    if (this.cfg0.metal) this.model.traverse(o => { if (o.isMesh && this.cfg0.metal.mats.includes(o.material.name)) { o.material.metalness = this.cfg0.metal.metalness; o.material.roughness = this.cfg0.metal.roughness; o.material.sheen = 0; o.material.envMapIntensity = 1.3; } });   // (Atom: tutto d'oro)
    if (this.cfg0.skinGloss) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Pelle') { o.material.roughness = this.cfg0.skinGloss; } });
    if (this.cfg0.skinTint) this.model.traverse(o => { if (o.isMesh && o.material.name === 'Pelle') o.material.color.setHex(this.cfg0.skinTint); });
    const bone = n => this.model.getObjectByName(n);
    this.bones = {};
    for (const n of ['head', 'neck_01', 'spine_01', 'spine_02', 'spine_03', 'hand_l', 'hand_r', 'lowerarm_l', 'lowerarm_r', 'upperarm_l', 'upperarm_r', 'pelvis','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r'])
      this.bones[n] = bone(n);

    this.model.updateWorldMatrix(true,true);
    this.glovePalmLocal={};this.gloveAxisLocal={};
    for(const side of ['l','r']){
      const hand=this.bones['hand_'+side],index=bone('index_01_'+side),pinky=bone('pinky_01_'+side),thumb=bone('thumb_03_'+side);
      if(!hand||!index||!pinky||!thumb)continue;
      const wrist=hand.getWorldPosition(new THREE.Vector3()),axis=wrist.clone().sub(this.bonePos('lowerarm_'+side)).normalize();
      const lateral=pinky.getWorldPosition(new THREE.Vector3()).sub(index.getWorldPosition(new THREE.Vector3()));lateral.addScaledVector(axis,-lateral.dot(axis)).normalize();
      const palm=lateral.cross(axis).normalize();if(palm.dot(thumb.getWorldPosition(new THREE.Vector3()).sub(wrist))<0)palm.negate();
      this.gloveAxisLocal[side]=axis.clone().applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()).invert());
      this.glovePalmLocal[side]=palm.applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()).invert());
    }
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {};
    for (const c of gltf.animations) this.clips[c.name] = c;
    for(const [name,base] of Object.entries({hook_body_l:'hook_l',hook_body_r:'hook_r',uppercut_body_l:'uppercut_l',uppercut_body_r:'uppercut_r'})){
      if(this.clips[base]){this.clips[name]=this.clips[base].clone();this.clips[name].name=name;}
    }
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
    this.condition = conditioning({dmg:0});
    this.armContacts = {};
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
    this.root.updateMatrixWorld(true);
    // Range for compact punches comes from their bent arm, not the old clips
    // which reached forward by straightening the elbow.
    const local=p=>this.root.worldToLocal(p),head=local(this.headCenter());
    for(const [name,spec] of Object.entries(PUNCH))if(name.startsWith('hook')||name.startsWith('uppercut')){
      const sh=local(this.bonePos('upperarm_'+spec.side)),el=local(this.bonePos('lowerarm_'+spec.side)),hand=local(this.bonePos('hand_'+spec.side));
      const a=sh.distanceTo(el),b=el.distanceTo(hand),radius=Math.sqrt(a*a+b*b-2*a*b*Math.cos(THREE.MathUtils.degToRad(98)));
      const y=head.y-(spec.zone==='body'?.43:.08),horizontal=Math.sqrt(Math.max(.04,radius*radius-(y-sh.y)**2));
      const z=sh.z+Math.sqrt(Math.max(.04,horizontal*horizontal-sh.x*sh.x))+.07;
      Object.assign(res[name],{x:0,y,z,dist:Math.max(.46,z),yaw:0});
    }
    for(const name of Object.keys(PUNCH))if(res[name])res[name].yaw=0;
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

  // scritte e simboli sui calzoncini (cfg.legs = [{ side: 'left' | 'right', text, icon, stars, badge, underline, color, ... }], o il vecchio
  // cfg.legName; { pattern: 'cobra', color } = motivo ripetuto tutto intorno, anche dietro): stampati sul davanti delle cosce. Maschere (bianco su
  // trasparente) mappate sul davanti dei calzoncini e colorate nello shader: conta solo la copertura (alfa), cosi' non resta nessun bordo.
  legName() {
    const legs = this.cfg0.legs || (this.cfg0.legName ? [this.cfg0.legName] : null); if (!legs) return;
    let sh = null; this.model.traverse(o => { if (o.isMesh && o.material.name === 'Raso blu') sh = o; });
    if (!sh) return;
    const geo = sh.geometry; geo.computeBoundingBox(); const bb = geo.boundingBox, W = bb.max.x - bb.min.x, Hh = bb.max.y - bb.min.y;
    const PX = 1024, PY = Math.round(PX * Hh / W), K = PX * 0.38 / 512;           // (una vecchia tela 512x256 copriva 0,38 W)
    const masks = {}, cols = { left: new THREE.Color(0, 0, 0), right: new THREE.Color(0, 0, 0) };
    let pat = null;
    for (const L of legs) {
      if (L.pattern) {                                                           // motivo: una tessera 256x256 con due icone, che si ripete
        const cv = Object.assign(document.createElement('canvas'), { width: 256, height: 256 }), g = cv.getContext('2d');
        g.fillStyle = '#fff'; g.strokeStyle = '#fff';
        if (L.pattern === 'strisce') g.fillRect(0, 0, 128, 256);                  // strisce verticali (stelle e strisce)
        else { legIcon(g, L.pattern, 64, 64, 0.5); legIcon(g, L.pattern, 192, 192, 0.5); }
        pat = { cv, col: new THREE.Color(L.color), rep: L.rep || 4 }; continue;
      }
      const cv = masks[L.side] || (masks[L.side] = Object.assign(document.createElement('canvas'), { width: PX, height: PY }));
      const g = cv.getContext('2d'), sd = L.side === 'left' ? 1 : -1;
      cols[L.side].set(L.color);
      g.save(); g.translate(PX * (0.5 + sd * (L.x ?? 0.30)), PY * (1 - (L.y ?? 0.4))); g.scale(K, K); g.translate(-256, -128);
      g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const name = L.text === undefined ? (this.cfg0.name || '').toUpperCase() : L.text, n = L.stars || 0;
      if (L.badge) {                                                             // lettera "stilosa": tondo con il bordo e lettera corsiva
        g.lineWidth = 12; g.beginPath(); g.arc(256, 128, 96, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 4; g.beginPath(); g.arc(256, 128, 80, 0, Math.PI * 2); g.stroke();
        g.font = 'italic 900 128px Georgia, "Times New Roman", serif'; g.fillText(name, 256, 138);
      } else if (name) {
        let size = L.icon ? 120 : (L.size || 150); g.font = `900 ${size}px system-ui, sans-serif`;
        while (g.measureText(name).width > 470 && size > 30) { size -= 6; g.font = `900 ${size}px system-ui, sans-serif`; }
        g.fillText(name, 256, L.ny ?? (n || L.icon ? 78 : 128));
        if (L.underline) g.fillRect(256 - 224, (L.ny ?? 128) + size * 0.62, 448, 9);          // linea sotto la scritta
      }
      for (let i = 0; i < n; i++) {                                              // stelle sotto il nome
        const cx = 256 + (i - (n - 1) / 2) * 78, cy = 208, R = 34; g.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? R * 0.42 : R; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        g.closePath(); g.fill();
      }
      if (L.icon) legIcon(g, L.icon, 256, L.iy ?? (name ? 184 : 128), L.scale ?? (name ? 1.3 : 1));
      g.restore();
    }
    const tex = {};
    for (const s of ['left', 'right']) {
      const cv = masks[s] || Object.assign(document.createElement('canvas'), { width: 4, height: 4 });
      tex[s] = new THREE.CanvasTexture(cv); tex[s].colorSpace = THREE.NoColorSpace; tex[s].anisotropy = 4; tex[s].premultiplyAlpha = false;
    }
    const ptex = new THREE.CanvasTexture(pat ? pat.cv : Object.assign(document.createElement('canvas'), { width: 4, height: 4 }));
    ptex.colorSpace = THREE.NoColorSpace; ptex.wrapS = ptex.wrapT = THREE.RepeatWrapping; ptex.anisotropy = 4;
    const box = new THREE.Vector4(bb.min.x, bb.min.y, W, Hh), pc = new THREE.Vector3((bb.max.x + bb.min.x) / 2, (bb.max.z + bb.min.z) / 2, pat ? 1 : 0);
    const m = sh.material = sh.material.clone();
    let nationalPatch=null;
    if(this.cfg0.flagPatch){
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=168;
      const context=canvas.getContext('2d');drawFlag(context,this.cfg0.flagPatch,256,168);
      context.strokeStyle='#e5dfd0';context.lineWidth=9;context.strokeRect(4.5,4.5,247,159);
      context.strokeStyle='rgba(255,255,255,.12)';context.lineWidth=1;
      for(let row=2;row<168;row+=3){context.beginPath();context.moveTo(0,row);context.lineTo(256,row);context.stroke();}
      nationalPatch=new THREE.CanvasTexture(canvas);nationalPatch.colorSpace=THREE.NoColorSpace;nationalPatch.anisotropy=4;
    }
    m.onBeforeCompile = shd => {
      shd.uniforms.uMkL = { value: tex.left }; shd.uniforms.uMkR = { value: tex.right }; shd.uniforms.uBox = { value: box };
      shd.uniforms.uColL = { value: cols.left }; shd.uniforms.uColR = { value: cols.right };
      shd.uniforms.uMkP = { value: ptex }; shd.uniforms.uColP = { value: pat ? pat.col : cols.left }; shd.uniforms.uPC = { value: pc }; shd.uniforms.uRep = { value: pat ? pat.rep : 1 };
      shd.vertexShader = shd.vertexShader.replace('void main() {', `varying vec3 vOP; varying vec3 vON;
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
 vOP = position; vON = normal;`);
      shd.fragmentShader = shd.fragmentShader.replace('void main() {', `uniform sampler2D uMkL; uniform sampler2D uMkR; uniform sampler2D uMkP; uniform vec4 uBox; uniform vec3 uColL; uniform vec3 uColR; uniform vec3 uColP; uniform vec3 uPC; uniform float uRep; varying vec3 vOP; varying vec3 vON;
void main() {`).replace('#include <map_fragment>', `#include <map_fragment>
        { vec2 q = vec2((vOP.x - uBox.x) / uBox.z, (vOP.y - uBox.y) / uBox.w);
          if (uPC.z > 0.5) {                                                      // motivo tutto intorno (anche dietro)
            float ang = atan(vOP.x - uPC.x, vOP.z - uPC.y) / 6.2831853 + 0.5;
            vec2 pu = vec2(ang * uRep * 2.0, q.y * uRep * 0.54);
            diffuseColor.rgb = mix(diffuseColor.rgb, uColP, smoothstep(0.35, 0.65, texture2D(uMkP, pu).a) * 0.9);
          }
          if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0 && vON.z > 0.05) {
            vec2 uv = q;
            float aL = smoothstep(0.1, 0.6, texture2D(uMkL, uv).a), aR = smoothstep(0.1, 0.6, texture2D(uMkR, uv).a);
            diffuseColor.rgb = mix(mix(diffuseColor.rgb, uColL, aL), uColR, aR); } }`);
      if(nationalPatch){
        shd.uniforms.uNationalPatch={value:nationalPatch};
        shd.fragmentShader=shd.fragmentShader.replace('uniform sampler2D uMkL;', 'uniform sampler2D uNationalPatch; uniform sampler2D uMkL;');
        shd.fragmentShader=shd.fragmentShader.replace('diffuseColor.rgb = mix(mix(diffuseColor.rgb, uColL, aL), uColR, aR);',`diffuseColor.rgb = mix(mix(diffuseColor.rgb, uColL, aL), uColR, aR);
          vec2 flagUV=(q-vec2(.70,.74))/vec2(.14,.13);
          if(flagUV.x>0.0&&flagUV.x<1.0&&flagUV.y>0.0&&flagUV.y<1.0){vec3 badge=texture2D(uNationalPatch,flagUV).rgb;diffuseColor.rgb=pow(badge,vec3(2.2));}`);
      }
    };
    m.customProgramCacheKey=()=>nationalPatch?'shorts-national-patch-v1':'shorts-marks-v1';
    m.needsUpdate = true;
  }

  // lettere sul davanti dei guantoni (cfg.gloveLetter = { text, color, size } per tutti e due, o { left: {...}, right: {...} }): maschera bianca
  // su trasparente colorata nello shader (solo copertura, bordi netti). Il guantone e' una mesh con ossa: la lettera si mette dove il guantone,
  // nella posa di guardia, guarda verso di te. Si calcola dopo i primi fotogrammi cercando, tra i vertici, a quali direzioni della mesh a riposo
  // corrispondono "destra", "su" e "verso di te" nella posa; la lettera sta li' e segue il guantone.
  gloveLetter() { if (this.cfg0.gloveLetter) this._gloveWait = 4; }
  _gloveSetup() {
    const G0 = this.cfg0.gloveLetter; if (!G0) return;
    this.model.updateMatrixWorld(true);
    this.model.traverse(o => {
      if (!o.isSkinnedMesh || !/^Guantone_[lr]$/.test(o.name) || o.material.name !== 'Pelle guantoni') return;
      const G = G0.left || G0.right ? G0[o.name.endsWith('_l') ? 'left' : 'right'] : G0; if (!G) return;
      const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.font = '900 220px system-ui, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; if (G.text) g.fillText(G.text, 128, 138);
      if(G.shape==='triangle'){g.beginPath();g.moveTo(128,30);g.lineTo(232,216);g.lineTo(24,216);g.closePath();g.fill();}
      if(G.shape==='circle'){g.beginPath();g.arc(128,128,100,0,Math.PI*2);g.fill();}
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.anisotropy = 1;
      const col = new THREE.Color(G.color || '#ffffff'), strC = new THREE.Color(G.stripes ? G.stripes.color : '#ffffff'), strF = G.stripes ? G.stripes.freq : 0;
      o.skeleton.update();
      const pa = o.geometry.attributes.position, n = pa.count, B = new Array(n), P = new Array(n), tmp = new THREE.Vector3();
      let zmax = -Infinity;
      for (let i = 0; i < n; i++) { B[i] = new THREE.Vector3().fromBufferAttribute(pa, i); P[i] = o.getVertexPosition(i, new THREE.Vector3()); zmax = Math.max(zmax, P[i].z); }
      const ext = P.reduce((m_, v) => Math.max(m_, v.z), -1e9) - P.reduce((m_, v) => Math.min(m_, v.z), 1e9), idx = [];
      for (let i = 0; i < n; i++) if (P[i].z > zmax - ext * 0.3) idx.push(i);
      const mean = (arr, f) => { const r = new THREE.Vector3(); for (const i of arr) r.add(f(i)); return r.multiplyScalar(1 / arr.length); };
      const mB = mean(idx, i => B[i]), mP = mean(idx, i => P[i]);
      const axis = a => {
        const r = new THREE.Vector3(); let v = 0;
        for (const i of idx) { const d = tmp.copy(P[i]).sub(mP).dot(a); r.addScaledVector(tmp.copy(B[i]).sub(mB), d); v += d * d; }
        return r.multiplyScalar(1 / Math.max(v, 1e-9)).normalize();
      };
      const T = axis(new THREE.Vector3(1, 0, 0)), U = axis(new THREE.Vector3(0, 1, 0)), N = axis(new THREE.Vector3(0, 0, 1));
      const box = new THREE.Vector4(mB.x, mB.y, mB.z, G.size ?? 0.085);
      const m = o.material = o.material.clone();
      m.onBeforeCompile = shd => {
        shd.uniforms.uMk = { value: tex }; shd.uniforms.uC = { value: box }; shd.uniforms.uCol = { value: col };
        shd.uniforms.uT = { value: T }; shd.uniforms.uU = { value: U }; shd.uniforms.uN = { value: N }; shd.uniforms.uSC = { value: strC }; shd.uniforms.uSF = { value: strF };
        shd.vertexShader = shd.vertexShader.replace('void main() {', `varying vec3 vOP; varying vec3 vON;
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
 vOP = position; vON = normal;`);
        shd.fragmentShader = shd.fragmentShader.replace('void main() {', `uniform vec3 uSC; uniform float uSF; uniform sampler2D uMk; uniform vec4 uC; uniform vec3 uCol; uniform vec3 uT; uniform vec3 uU; uniform vec3 uN; varying vec3 vOP; varying vec3 vON;
void main() {`).replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 d = vOP - uC.xyz;
          if (uSF > 0.0) { float sv = fract((dot(d, uT) + 0.7 * dot(d, uU)) * uSF); float st = smoothstep(0.30, 0.38, sv) * (1.0 - smoothstep(0.56, 0.64, sv)); diffuseColor.rgb = mix(diffuseColor.rgb, uSC, st * 0.95); }
          vec2 q = vec2(dot(d, uT) / uC.w + 0.5, dot(d, uU) / uC.w + 0.5);
          if (q.x > 0.02 && q.x < 0.98 && q.y > 0.02 && q.y < 0.98 && dot(normalize(vON), uN) > 0.3) diffuseColor.rgb = mix(diffuseColor.rgb, uCol, smoothstep(0.4, 0.62, texture2D(uMk, q).a)); }`);
      };
      m.needsUpdate = true;
    });
  }

  // colori cambiati a runtime (cfg.recolor = [{ mat: nome materiale, mesh: parte del nome della mesh (facoltativa), color }]) e tatuaggio sulla spalla
  recolor() {
    for (const R of this.cfg0.recolor || []) {
      this.model.traverse(o => {
        if (!o.isMesh || o.material.name !== R.mat || (R.mesh && !o.name.includes(R.mesh))) return;
        o.material = o.material.clone(); o.material.color.set(R.color); if (o.material.map) o.material.map = null;
      });
    }
    if (this.cfg0.shoulderTattoo) this._tatWait = 4;                                 // (il tatuaggio si mette dopo i primi fotogrammi)
  }
  _tattooSetup() {
    const T = this.cfg0.shoulderTattoo; if (!T) return;
    const neck = T.where === 'neck', boneName = neck ? 'neck_01' : (T.side === 'right' ? 'upperarm_r' : 'upperarm_l');
    let skin = null, bone = null, head = null; this.model.traverse(o => { if (o.isSkinnedMesh && o.material.name === 'Pelle') skin = o; if (neck && o.isBone && o.name === 'head') head = o; if (o.isBone && o.name === boneName) bone = o; });
    if (!skin || !bone) return;
    this.model.updateMatrixWorld(true);
    const c = document.createElement('canvas'); c.width = neck ? 512 : 256; c.height = neck ? 128 : 256; const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (neck) { let sz = 120; g.font = `italic 900 ${sz}px Georgia, "Times New Roman", serif`; while (g.measureText(T.text).width > 480 && sz > 30) { sz -= 4; g.font = `italic 900 ${sz}px Georgia, "Times New Roman", serif`; } g.fillText(T.text, 256, 70); }
    else { g.font = 'italic 900 230px Georgia, "Times New Roman", serif'; g.fillText(T.text, 128, 140); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4;
    const wp = bone.getWorldPosition(new THREE.Vector3()); if (neck && head) wp.lerp(head.getWorldPosition(new THREE.Vector3()), T.mix ?? 0.5);
    const p = skin.worldToLocal(wp), sd = T.side === 'right' ? -1 : 1;
    const N = neck ? new THREE.Vector3(sd * (T.nx ?? 0), 0, 1).normalize() : new THREE.Vector3(sd * 0.93, 0, 0.37).normalize(), Tv = new THREE.Vector3(0.7 * sd * -1 * -1, 0, -0.7 * sd).normalize(), U = new THREE.Vector3(0, 1, 0);
    const Tx = new THREE.Vector3().crossVectors(U, N).normalize();                                                  // "destra" sulla superficie vista da fuori
    const c0 = neck ? p.clone().add(new THREE.Vector3(sd * (T.dx ?? 0), T.dy ?? 0, 0)) : p.clone().addScaledVector(N, 0.0).add(new THREE.Vector3(sd * 0.15, 0.015, -0.05));
    const m = skin.material = skin.material.clone(); const col = new THREE.Color(T.color);
    m.onBeforeCompile = shd => {
      m.userData.shd = shd;
      shd.uniforms.uTat = { value: tex }; shd.uniforms.uTC = { value: new THREE.Vector4(c0.x, c0.y, c0.z, T.size ?? 0.1) }; shd.uniforms.uTA = { value: neck ? 0.25 : 1 }; shd.uniforms.uTCol = { value: col };
      shd.uniforms.uTX = { value: Tx }; shd.uniforms.uTN = { value: N };
      shd.vertexShader = shd.vertexShader.replace('void main() {', `varying vec3 vOP; varying vec3 vON;
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
 vOP = position; vON = normal;`);
      shd.fragmentShader = shd.fragmentShader.replace('void main() {', `uniform sampler2D uTat; uniform vec4 uTC; uniform float uTA; uniform vec3 uTCol; uniform vec3 uTX; uniform vec3 uTN; varying vec3 vOP; varying vec3 vON;
void main() {`).replace('#include <map_fragment>', `#include <map_fragment>
        { vec3 d = vOP - uTC.xyz; vec2 q = vec2(dot(d, uTX) / uTC.w + 0.5, dot(d, vec3(0.0, 1.0, 0.0)) / (uTC.w * uTA) + 0.5);
          if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0 && dot(normalize(vON), uTN) > 0.25) diffuseColor.rgb = mix(diffuseColor.rgb, uTCol, smoothstep(0.4, 0.62, texture2D(uTat, q).a) * 0.88); }`);
    };
    m.needsUpdate = true;
  }

  // caschetto da sparring: pelle imbottita con cuciture scure (cresta centrale, fascia sopra le orecchie, fascia alta) e un po' di grana, cosi'
  // non sembra plastica fusa. Righe disegnate nello shader in coordinate della mesh a riposo (restano attaccate al caschetto).
  helmetSeams() {
    let hg = null; this.model.traverse(o => { if (o.isMesh && o.material.name === 'Caschetto') hg = o; });
    if (!hg) return;
    const geo = hg.geometry; geo.computeBoundingBox(); const bb = geo.boundingBox, H = bb.max.y - bb.min.y;
    const m = hg.material = hg.material.clone(); m.roughness = 0.7; if ('clearcoat' in m) m.clearcoat = 0.05;
    const U = new THREE.Vector4((bb.max.x + bb.min.x) / 2, bb.min.y, H, 0);
    m.onBeforeCompile = shd => {
      shd.uniforms.uH = { value: U };
      shd.vertexShader = shd.vertexShader.replace('void main() {', `varying vec3 vOP;
void main() {`).replace('#include <begin_vertex>', `#include <begin_vertex>
 vOP = position;`);
      shd.fragmentShader = shd.fragmentShader.replace('void main() {', `uniform vec4 uH; varying vec3 vOP;
void main() {`).replace('#include <map_fragment>', `#include <map_fragment>
        { float dx = abs(vOP.x - uH.x), hy = (vOP.y - uH.y) / uH.z;
          float s1 = 1.0 - smoothstep(0.0022, 0.0042, dx);                                        // cresta centrale
          float s2 = 1.0 - smoothstep(0.0022, 0.0042, abs(hy - 0.40) * uH.z);                     // fascia sopra le orecchie
          float s3 = 1.0 - smoothstep(0.0022, 0.0042, abs(hy - 0.74) * uH.z);                     // fascia alta
          float seam = max(s1, max(s2, s3));
          float stitch = step(0.5, fract((vOP.z + vOP.x * 0.7 + vOP.y) * 260.0));               // punti di cucitura (tratteggio)
          diffuseColor.rgb *= mix(1.0, 0.30, seam * (0.6 + 0.4 * stitch)); }`);
    };
    m.needsUpdate = true;
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
    const pose=[];this.model.traverse(b=>{if(b.isBone)pose.push([b,b.quaternion.clone(),b.position.clone()]);});
    this.victoryBlend={pose,t:0,duration:1.35};this.enabled=false;this.punch=null;this.combo=[];this.defending=null;this.reaction=null;this.vel.set(0,0,0);this.moveVel.set(0,0,0);
    for (const l of this.layers) l.out = true;
    // a caso: due braccia alzate o un braccio solo
    const name = this.clips.celebrate1 && Math.random() < 0.5 ? 'celebrate1' : 'celebrate';
    this.celebrating={t:0,one:name==='celebrate1',side:Math.random()<.5?'l':'r',hands:Object.fromEntries(['l','r'].map(s=>[s,this.root.worldToLocal(this.bonePos('hand_'+s))])),elbows:Object.fromEntries(['l','r'].map(s=>[s,this.root.worldToLocal(this.bonePos('lowerarm_'+s))]))};
    const a = this.mixer.clipAction(this.clips[name]);
    a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.setEffectiveWeight(0); a.play();
    this.layers.push({ name, action: a, t: 0, dur: 1e9, ts: 1, w: 0, out: false, hold: true,fin:1.35 });
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
    const faceUV=fg.attributes.uv,uvGrid=new Map(),uvKey=(u,v)=>`${Math.round(u*100000)},${Math.round(v*100000)}`;
    if(faceUV)for(let i=0;i<faceUV.count;i++){const key=uvKey(faceUV.getX(i),faceUV.getY(i));if(!uvGrid.has(key))uvGrid.set(key,[]);uvGrid.get(key).push(i);}
    const FBr = new THREE.Matrix3().setFromMatrix4(FB);
    const mo = fm[F.morphTargetDictionary && F.morphTargetDictionary.mouth_open] || null;      // (spostamento della bocca aperta, per il pizzetto)
    this.model.traverse(o => {
      if (!o.isSkinnedMesh || o === F || o.morphTargetDictionary || !/capelli|eyebrow|pizzett|barba|beard/i.test((o.material && o.material.name || '') + o.name)) return;
      const isGoatee = this.cfg0.goatee && /pizzett/i.test((o.material?.name||'')+o.name);
      const jawBeard = isGoatee || (this.cfg0.id === 'reza' && /barba/i.test(o.name));
      const g = o.geometry, gp = g.attributes.position, inv = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(o.bindMatrix).invert());
      const near = new Int32Array(gp.count).fill(-1),neighbors=Array.from({length:gp.count},()=>[]);
      for (let i = 0; i < gp.count; i++) {
        v.fromBufferAttribute(gp, i).applyMatrix4(o.bindMatrix);
        const cx = Math.floor(v.x / C), cy = Math.floor(v.y / C), cz = Math.floor(v.z / C);
        let best = 0.04 * 0.04, bi = -1;
        // Skin-derived beard shells retain the skin UVs. They identify the
        // original outer-lip vertex, unlike a nearest point inside the mouth.
        const uv=g.attributes.uv,copies=uv&&uvGrid.get(uvKey(uv.getX(i),uv.getY(i)));
        if(copies?.length){let closest=Infinity;for(const j of copies){const d=(fw[j*3]-v.x)**2+(fw[j*3+1]-v.y)**2+(fw[j*3+2]-v.z)**2;if(d<closest){closest=d;bi=j;}}if(closest<.045*.045){near[i]=bi;neighbors[i]=[{j:bi,distance:0}];continue;}}
        for (const lowerOnly of (jawBeard ? [true, false] : [false])) {     // la barba della mandibola segue la pelle sotto il labbro
          for (const radius of [1,3]) {
          if(radius===3 && best<C*C)break;
          for (let dx = -radius; dx <= radius; dx++) for (let dy = -radius; dy <= radius; dy++) for (let dz = -radius; dz <= radius; dz++) {
            if(radius===3 && Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz))<=1)continue;
            const l = grid.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!l) continue;
            for (const j of l) {
              if (lowerOnly && fw[j * 3 + 1] > v.y + 0.004) continue;
              const d = (fw[j * 3] - v.x) ** 2 + (fw[j * 3 + 1] - v.y) ** 2 + (fw[j * 3 + 2] - v.z) ** 2;
              if (d < best) { best = d; bi = j; }
            }
          }
          }
          if (bi >= 0) break;
        }

        near[i] = bi;
        if(bi>=0){
          const lower=mo&&mo.getY(bi)<-.002,samples=[];
          for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++)for(let dz=-2;dz<=2;dz++)for(const j of grid.get(`${cx+dx},${cy+dy},${cz+dz}`)||[]){
            if(mo&&((mo.getY(j)<-.002)!==!!lower))continue;
            const distance=(fw[j*3]-v.x)**2+(fw[j*3+1]-v.y)**2+(fw[j*3+2]-v.z)**2;if(distance<.04*.04)samples.push({j,distance});
          }
          samples.sort((a,b)=>a.distance-b.distance);neighbors[i]=samples.slice(0,6);if(!neighbors[i].length)neighbors[i]=[{j:bi,distance:0}];
        }
      }
      if (!near.some(j => j >= 0)) return;
      // pizzetto: la parte alta (vicina al labbro) con la bocca aperta scende di piu' (ci sarebbe finita davanti ai denti)
      const top = new Float32Array(gp.count); let y0 = 1e9, y1 = -1e9;
      if (jawBeard) {
        for (let i = 0; i < gp.count; i++) { v.fromBufferAttribute(gp, i).applyMatrix4(o.bindMatrix); top[i] = v.y; y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
        for (let i = 0; i < gp.count; i++) top[i] = THREE.MathUtils.clamp((top[i] - y0) / Math.max(1e-4, y1 - y0) * 1.3, 0, 1);
      }
      g.morphAttributes.position = fm.map(src => {
        const arr = new Float32Array(gp.count * 3), d = new THREE.Vector3(), isMouth = jawBeard && src === mo;
        for (let i = 0; i < gp.count; i++) {
          const j = near[i]; if (j < 0) continue;
          d.set(0,0,0);let sum=0;for(const sample of neighbors[i]){const w=1/(sample.distance+.000016);d.addScaledVector(new THREE.Vector3().fromBufferAttribute(src,sample.j),w);sum+=w;}d.divideScalar(sum||1).applyMatrix3(FBr).applyMatrix3(inv);   // (dallo spazio della pelle a quello del guscio)
          // Preserve the skin deformation exactly; exaggeration stretches hairs across the lips.
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
    this.armContacts = {}; this.feetPlant = null;this.victoryBlend=null;this.celebrating=null;this.blockedRun=0;this.openSearchUntil=0;this.lastCoverage=null;
    this.dejected = false;
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
    this.previousCollisionShapes=fighterShapes(this).map(s=>({center:s.center.clone(),end:s.end?.clone()}));
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
      // Procedural punches use the clip only as a clock. Its authored return
      // must never reappear after the corrected arm has reached the guard.
      l.action.setEffectiveWeight(l.procedural?0:l.w);
      total += l.procedural?0:l.w;
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
    // sconfitto: smette di saltellare, resta quasi fermo (l'animazione di guardia a velocita' ridottissima: solo una lenta oscillazione)
    const calm = 1 - 0.95 * (this.dej || 0); this.idle.timeScale = calm; this.idleLow.timeScale = calm;
    // il mixer riscrive un osso solo se il valore dell'animazione cambia: nei tratti fermi le piegature aggiunte qui
    // sotto (busto verso la tua testa, braccio, fiatone) si sommavano a ogni fotogramma (capriola all'indietro).
    // Si riparte sempre dalla posa dell'animazione
    if (this._animQ) for (const [b, q] of this._animQ) b.quaternion.copy(q);
    if(this._animHip)this.bones.pelvis.position.copy(this._animHip);
    this.mixer.update(dt);
    if(this.victoryBlend){const B=this.victoryBlend;B.t+=dt;const w=THREE.MathUtils.smoothstep(B.t,0,B.duration);for(const [bone,q,pos] of B.pose){bone.quaternion.copy(q.clone().slerp(bone.quaternion,w));bone.position.copy(pos.clone().lerp(bone.position,w));}if(w>=1)this.victoryBlend=null;}
    if (this._gloveWait && --this._gloveWait === 0) this._gloveSetup();
    if (this._tatWait && --this._tatWait === 0) this._tattooSetup();
    this._updBraid(dt);
    this._animQ = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r', 'neck_01','thigh_l','thigh_r','calf_l','calf_r','foot_l','foot_r'].filter(n => this.bones[n]).map(n => [this.bones[n], this.bones[n].quaternion.clone()]);
    this._animHip=this.bones.pelvis.position.clone();
    this.updateFace(dt);
    this.root.updateMatrixWorld(true);
    this._punchBody();
    this._reachBend(dt);
    this._guardForward(free);
    this._punchPose(dt);
    this._pronateStraight();
    this._punchLegs();
    this._contactPose(dt);
    this._plantFeet(dt);
    this._dejectFx(dt);
    this._victoryPose(dt);
    this.lookAtEyes(dt);
  }

  // punto da colpire, scelto al lancio: centro del viso, mento, fronte o una tempia, quello piu' lontano dai tuoi guantoni
  _guardForward(weight) {
    const amount=this.cfg0.guardForward||0,spread=this.cfg0.guardSpread||0;
    if((!amount&&!spread)||weight<=.001||this.down||this.dejected||this.goal)return;
    const right=new THREE.Vector3(1,0,0).applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()));
    for(const side of ['l','r']){
      const lower=this.bones['lowerarm_'+side],hand=this.bones['hand_'+side];
      // Rotate only the forearm: shoulder and elbow positions are unchanged.
      this._rotateToward(lower,hand,this.bonePos('hand_'+side).addScaledVector(this.forward(),amount).addScaledVector(right,side==='l'?spread:-spread),weight);
    }
  }
  _rotateToward(bone,child,target,weight=1,maxAngle=.65) {
    if(!bone?.parent||!child)return;
    const origin=bone.getWorldPosition(new THREE.Vector3()),from=child.getWorldPosition(new THREE.Vector3()).sub(origin),to=target.clone().sub(origin);
    if(from.lengthSq()<1e-8||to.lengthSq()<1e-8)return;
    const delta=new THREE.Quaternion().setFromUnitVectors(from.normalize(),to.normalize());
    const angle=delta.angleTo(new THREE.Quaternion());
    const limited=new THREE.Quaternion().slerp(delta,Math.min(weight,maxAngle/Math.max(.001,angle)));
    bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(limited.multiply(bone.getWorldQuaternion(new THREE.Quaternion()))));
    bone.updateMatrixWorld(true);
  }
  _limbTo(upper,lower,end,target,weight=1,limit=.22) {
    const u=this.bones[upper],l=this.bones[lower],e=this.bones[end];if(!u||!l||!e)return;
    const a=u.getWorldPosition(new THREE.Vector3()),b=l.getWorldPosition(new THREE.Vector3()),c=e.getWorldPosition(new THREE.Vector3());
    const correction=target.clone().sub(c).clampLength(0,limit),goal=c.clone().addScaledVector(correction,weight),axis=goal.clone().sub(a);
    const l1=a.distanceTo(b),l2=b.distanceTo(c),distance=THREE.MathUtils.clamp(axis.length(),Math.abs(l1-l2)+.005,(l1+l2)*.98);axis.normalize();goal.copy(a).addScaledVector(axis,distance);
    const pole=b.clone().sub(a);pole.addScaledVector(axis,-pole.dot(axis));
    if(pole.lengthSq()<1e-6)pole.copy(new THREE.Vector3(0,1,0).cross(axis));pole.normalize();
    const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const elbow=a.clone().addScaledVector(axis,along).addScaledVector(pole,height);
    this._rotateToward(u,l,elbow);this._rotateToward(l,e,goal);
  }
  contactArm(side,point,blocked=false) {
    this.armContacts[side]={point:point.clone(),age:0,blocked};
    const p=this.punch;if(p&&!p.move){
      p.resolved=true;p.contactEnded=true;
      if(p.motion){
        // Contact ends the outward stroke, not the whole arm animation. Return
        // from the contact point at the selected speed before releasing guard.
        const offset=this.glove(side).center.sub(this.bonePos('hand_'+side));
        p.returnFrom=point.clone().sub(offset);p.returnPole=this.bonePos('lowerarm_'+side).sub(this.bonePos('upperarm_'+side));p.returnStart=p.layer.t;
      }else{p.layer.ts=Math.max(p.layer.ts,1.2);p.layer.action.timeScale=p.layer.ts;p.layer.out=true;p.layer.fade=blocked?.10:.12;}
    }
    this._contactPose(0);
  }
  _contactPose(dt) {
    for(const [side,c] of Object.entries(this.armContacts)){
      c.age+=dt;if(c.age>.16||this.down){delete this.armContacts[side];continue;}
      const glove=this.glove(side),hand=this.bonePos('hand_'+side),offset=glove.center.clone().sub(hand);
      this._limbTo('upperarm_'+side,'lowerarm_'+side,'hand_'+side,c.point.clone().sub(offset),Math.max(0,1-c.age/.16),.16);
    }
  }
  _solvePunchArm(side,target,pole,maxReach,minAngle=0) {
    this._solveChain('upperarm_'+side,'lowerarm_'+side,'hand_'+side,target,pole,maxReach,minAngle);
  }
  _solveChain(upper,lower,end,target,pole,maxReach,minAngle=0) {
    const u=this.bones[upper],l=this.bones[lower],h=this.bones[end];
    const shoulder=this.bonePos(upper),elbow=this.bonePos(lower),hand=this.bonePos(end);
    const a=shoulder.distanceTo(elbow),b=elbow.distanceTo(hand),axis=target.clone().sub(shoulder);
    const minReach=Math.max(Math.abs(a-b)+.01,Math.sqrt(a*a+b*b-2*a*b*Math.cos(THREE.MathUtils.degToRad(minAngle))));
    const distance=THREE.MathUtils.clamp(axis.length(),minReach,maxReach);axis.normalize();
    const goal=shoulder.clone().addScaledVector(axis,distance);
    pole=pole.clone().addScaledVector(axis,-pole.dot(axis));
    if(pole.lengthSq()<1e-8)pole.set(axis.z,0,-axis.x);pole.normalize();
    const along=(a*a-b*b+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,a*a-along*along));
    const joint=shoulder.clone().addScaledVector(axis,along).addScaledVector(pole,height);
    this._rotateToward(u,l,joint,1,Math.PI);this._rotateToward(l,h,goal,1,Math.PI);
  }
  _punchBody() {
    const p=this.punch;if(!p?.motion||!this.enabled||this.down||p.layer.out)return;
    const spec=PUNCH[p.name],phase=p.layer.t/((spec.from+spec.to)/2/30);
    const returnStart=p.returnStart??(spec.from+spec.to)/2/30;
    const recovery=1-THREE.MathUtils.smoothstep(p.layer.t,returnStart,p.layer.dur*.68);
    for(const [name,q] of p.bodyGuard){const b=this.bones[name],idle=b.quaternion.clone();b.quaternion.copy(q).slerp(idle,1-recovery);}
    this.bones.pelvis.position.lerp(p.hipPosition,recovery);
    const loaded=THREE.MathUtils.smoothstep(phase,0,p.motion.loadFraction),struck=THREE.MathUtils.smoothstep(phase,p.motion.loadFraction,1);
    const sign=spec.side==='l'?-1:1,curved=p.name.startsWith('hook')||p.name.startsWith('uppercut');
    const yaw=sign*THREE.MathUtils.degToRad(p.name==='jab'?18:p.name==='cross'?32:30)*(curved?(-.25*loaded+1.25*struck):struck)*recovery;
    const hip=this.bones.pelvis;
    hip.position.addScaledVector(p.hipDropLocal,loaded*recovery);
    hip.updateWorldMatrix(true,true);
    const world=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw).multiply(hip.getWorldQuaternion(new THREE.Quaternion()));
    hip.quaternion.copy(hip.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
    if(p.name==='cross')for(const [name,share] of [['spine_01',.4],['spine_02',.6]]){
      const bone=this.bones[name];bone.updateWorldMatrix(true,true);const turn=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(28)*share*struck*recovery).multiply(bone.getWorldQuaternion(new THREE.Quaternion()));bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(turn));
    }
    // Rear hand rotates through hips AND torso, while the planted stance stays stable.
    this.root.updateMatrixWorld(true);
  }
  _punchLegs(){
    const p=this.punch;if(!p?.motion||!p.feetGuard||p.hipDrop<.025||p.layer.out||this.down||!this.enabled)return;
    const peak=(PUNCH[p.name].from+PUNCH[p.name].to)/2/30,phase=p.layer.t/peak,recovery=1-THREE.MathUtils.smoothstep(p.layer.t,p.returnStart??peak,p.layer.dur*.68),weight=THREE.MathUtils.smoothstep(phase,0,p.motion.loadFraction)*recovery;
    for(const side of ['l','r']){
      const hip=this.bonePos('thigh_'+side),knee=this.bonePos('calf_'+side),foot=this.bonePos('foot_'+side);
      const lengths=[hip.distanceTo(knee),knee.distanceTo(foot)];
      const pole=knee.clone().sub(hip).normalize().lerp(this.forward(),weight);
      this._solveChain('thigh_'+side,'calf_'+side,'foot_'+side,foot.clone().lerp(p.feetGuard[side],weight),pole,(lengths[0]+lengths[1])*.999);
    }
  }
  _punchPose(dt) {
    const p=this.punch;if(!this.enabled||!p?.motion||p.move||this.down)return;
    // A miss resolves scoring, not the pose: retain the safe elbow through recovery.
    const spec=PUNCH[p.name],m=p.motion,peak=(spec.from+spec.to)/2/30;
    const phase=p.layer.t/peak,end=p.layer.dur*.68;
    const liveGuard=this.bonePos('hand_'+spec.side),livePole=this.bonePos('lowerarm_'+spec.side).sub(this.bonePos('upperarm_'+spec.side));
    let target,pole;
    if(phase<=1&&!p.returnFrom){target=m.sample(phase);pole=m.pole(phase,target,this.bonePos('upperarm_'+spec.side));}
    else {
      const t=THREE.MathUtils.smoothstep(p.layer.t,p.returnStart??peak,end);
      target=(p.returnFrom||m.endpoint).clone().lerp(liveGuard,t);
      pole=(p.returnPole||m.pole(1,target,this.bonePos('upperarm_'+spec.side))).clone().lerp(livePole,t);
    }
    const recovery=1-THREE.MathUtils.smoothstep(p.layer.t,p.returnStart??peak,end);
    const max=phase<=1?THREE.MathUtils.lerp((p.armLengths[0]+p.armLengths[1])*.98,m.maxReach,THREE.MathUtils.smoothstep(phase,0,m.loadFraction)):THREE.MathUtils.lerp(m.maxReach,(p.armLengths[0]+p.armLengths[1])*.98,1-recovery);
    const compact=p.name.startsWith('hook')||p.name.startsWith('uppercut');
    const angle=compact?m.minArmAngle*THREE.MathUtils.smoothstep(phase,0,m.loadFraction)*recovery:0;
    this._solvePunchArm(spec.side,target,pole,max,angle);
    // Open a small lane beside the guard for a straight punch, then return.
    const other=spec.side==='l'?'r':'l';
    const freeIdle=this.bonePos('hand_'+other),freeTarget=p.freeGuard.clone().add(this.bonePos('upperarm_'+other).sub(p.freeShoulder)).lerp(freeIdle,1-recovery);
    if(!compact){const open=THREE.MathUtils.smoothstep(phase,0,.32)*recovery;freeTarget.addScaledVector(p.freeLane,open);}
    const glove=this.glove(spec.side),offset=this.glove(other).center.clone().sub(freeIdle),near=freeTarget.clone().add(offset).sub(glove.center),clear=.18*this.root.getWorldScale(new THREE.Vector3()).y;
    if(near.length()<clear){const away=p.freeLane.clone().normalize();if(away.lengthSq()<.01)away.copy(this.forward()).cross(new THREE.Vector3(0,1,0)).multiplyScalar(other==='l'?1:-1);freeTarget.addScaledVector(away,clear-near.length());}
    const freePole=p.freePole.clone().lerp(this.bonePos('lowerarm_'+other).sub(this.bonePos('upperarm_'+other)),1-recovery);
    this._solvePunchArm(other,freeTarget,freePole,(p.freeLengths[0]+p.freeLengths[1])*.98);
    for(let i=0;i<3;i++){
      const freeCenter=this.glove(other).center,delta=freeCenter.clone().sub(glove.center),distance=delta.length();
      if(distance>=clear-.002)break;
      const correction=(distance>1e-5?delta.normalize():p.freeLane.clone().normalize()).multiplyScalar(clear-distance);
      const target=this.bonePos('hand_'+other).add(correction);
      this._solvePunchArm(other,target,freePole,(p.freeLengths[0]+p.freeLengths[1])*.98);
    }
  }
  _victoryPose(dt){
    const C=this.celebrating;if(!C||this.down)return;C.t+=dt;
    const w=THREE.MathUtils.smoothstep(C.t,.18,1.65);if(w<.001)return;
    const head=this.headCenter(),forward=this.forward(),lateral=new THREE.Vector3(forward.z,0,-forward.x);
    for(const side of ['l','r']){
      const sign=side==='l'?1:-1,shoulder=this.bonePos('upperarm_'+side),elbow=this.bonePos('lowerarm_'+side),hand=this.bonePos('hand_'+side),length=shoulder.distanceTo(elbow)+elbow.distanceTo(hand);
      const goal=C.one&&side!==C.side?this.bonePos('pelvis').add(new THREE.Vector3(0,.20,0)).addScaledVector(lateral,sign*.24).addScaledVector(forward,.14):head.clone().add(new THREE.Vector3(0,.28+.012*Math.sin(C.t*2.3),0)).addScaledVector(lateral,sign*.14).addScaledVector(forward,.02);
      const start=this.root.localToWorld(C.hands[side].clone()),target=start.lerp(goal,w).addScaledVector(lateral,sign*.10*Math.sin(Math.PI*w));
      const pole=this.root.localToWorld(C.elbows[side].clone()).sub(shoulder).lerp(lateral.clone().multiplyScalar(sign).addScaledVector(forward,.25),w);
      this._solvePunchArm(side,target,pole,length*.995,0);
    }
  }
  _pronateStraight(){
    const p=this.punch;if(!this.enabled||!p?.motion||p.move||this.down||p.name.startsWith('hook')||p.name.startsWith('uppercut'))return;
    const side=p.side,palmLocal=this.glovePalmLocal[side];if(!palmLocal)return;
    const spec=PUNCH[p.name],peak=(spec.from+spec.to)/2/30,phase=p.layer.t/peak;
    const weight=THREE.MathUtils.smoothstep(phase,.12,.90)*(1-THREE.MathUtils.smoothstep(p.layer.t,p.returnStart??peak,p.layer.dur*.68));
    const lower=this.bones['lowerarm_'+side],hand=this.bones['hand_'+side],axis=this.bonePos('hand_'+side).sub(this.bonePos('lowerarm_'+side)).normalize();
    const handWorld=hand.getWorldQuaternion(new THREE.Quaternion()),fistAxis=this.gloveAxisLocal[side].clone().applyQuaternion(handWorld).normalize();
    const aligned=handWorld.clone().premultiply(new THREE.Quaternion().setFromUnitVectors(fistAxis,axis));handWorld.slerp(aligned,weight);
    hand.quaternion.copy(hand.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(handWorld));hand.updateWorldMatrix(false,true);
    const palm=palmLocal.clone().applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));palm.addScaledVector(axis,-palm.dot(axis)).normalize();
    const down=new THREE.Vector3(0,-1,0);down.addScaledVector(axis,-down.dot(axis));if(down.lengthSq()<.01)return;down.normalize();
    const angle=Math.atan2(axis.dot(palm.clone().cross(down)),palm.dot(down))*weight;
    // Twist about the forearm itself: the elbow and wrist positions stay fixed.
    const world=lower.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
    lower.quaternion.copy(lower.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));lower.updateWorldMatrix(false,true);
  }
  _plantFeet(dt) {
    if(!this.bones.foot_l||!this.bones.foot_r)return;
    if(this.down||this.goal||this.dejected||!this.enabled){this.feetPlant=null;return;}
    const l=this.bonePos('foot_l'),r=this.bonePos('foot_r'),side=l.y<=r.y?'l':'r',foot=side==='l'?l:r;
    // Stay within the same ring bounds as the body; preserve ankle height.
    if(this.bounds)for(const [sd,pos] of [['l',l],['r',r]]){
      const bounded=pos.clone();this.bounds(bounded);bounded.y=pos.y;
      if(bounded.distanceToSquared(pos)>.0001)this._limbTo('thigh_'+sd,'calf_'+sd,'foot_'+sd,bounded,1,.08);
    }
    const walking=this.vel.length()>.06;
    const plant=this.feetPlant;
    if(!plant||plant.side!==side||plant.age>(walking?.22:.45)||plant.point.distanceTo(foot)>.09)this.feetPlant={side,point:foot.clone(),age:0};
    const contact=this.feetPlant;contact.age+=dt;
    this._limbTo('thigh_'+side,'calf_'+side,'foot_'+side,contact.point,.65,.055);
  }
  // (i ganci prendono la tempia dal lato da cui arrivano). Ai livelli bassi sbaglia spesso e mira al centro.
  chooseAim(player, name) {
    const spec = PUNCH[name]; if (!spec || !player) return null;
    const H = player.head, toMe = _c.copy(this.root.getWorldPosition(_e)).sub(H).setY(0).normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(toMe).normalize();      // tua destra / sinistra vista da lui
    let cands;
    if(spec.zone==='body'){
      const center=player.f?player.f.torso()[0].clone().lerp(player.f.torso()[1],.42):H.clone().add(new THREE.Vector3(0,-.40,0));
      const floor=player.f?player.f.bonePos('pelvis').y+.20:H.y-.58;
      cands=[center,center.clone().addScaledVector(right,.14),center.clone().addScaledVector(right,-.14),center.clone().add(new THREE.Vector3(0,.11,0))];for(const p of cands)p.y=Math.max(p.y,floor);
    }else{
      cands=[[0,0],[0,-.09],[0,.07],[.09,.01],[-.09,.01]].map(([x,y])=>H.clone().addScaledVector(right,x).add(new THREE.Vector3(0,y,0)));
      if(name.startsWith('uppercut'))cands=cands.filter(p=>p.y<=H.y);
    }
    const skill = this.cfg.readGuard ?? 0.6;
    if (Math.random() > skill && this.time>=(this.openSearchUntil||0)) return cands[0];
    const gl = Object.values(player.gloves).filter(g => g.mesh.visible);
    let best = cands[0], bs = -1;
    for (const p of cands) {
      const route=this.bonePos('hand_'+spec.side).clone().lerp(p,.60);
      const sc = Math.min(...gl.map(g=>distPointSeg(g.center,route,p)),.4)+Math.min(...gl.map(g=>g.center.distanceTo(p)),.4)*.35+Math.random()*.006;
      if (sc > bs) { bs = sc; best = p; }
    }
    return best;
  }

  // colpi al volto all'altezza della TUA testa (anche se sei piu' basso o abbassato in guardia): se il pugno
  // passerebbe sopra, si piega in avanti col busto quanto serve (al massimo ~25 gradi); se sei piu' alto si raddrizza
  // all'indietro (poco) e alza il braccio che colpisce dalla spalla (fino a ~34 gradi).
  // A pugno partito resta l'inclinazione della partenza (se ti abbassi all'ultimo, il colpo puo' andare a vuoto)
  // sconfitto (verdetto a suo sfavore): abbassa le braccia e si incurva un po' in avanti, a testa bassa. `dejected` = 0/1,
  // la posa arriva piano (dej)
  _dejectFx(dt) {
    this.dej = (this.dej || 0) + ((this.dejected ? 1 : 0) - (this.dej || 0)) * Math.min(1, dt * 2.2);
    const w = this.dej; if (w < 0.004) return;
    const fwd = _c.set(0, 0, 1).applyQuaternion(this.root.getWorldQuaternion(_q)).setY(0).normalize();
    const axis = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();    // + = avanti e giu' (busto), + = braccio che scende
    const rotW = (n, ang) => {
      const b = this.bones[n]; if (!b || !b.parent) return;
      const nw = new THREE.Quaternion().setFromAxisAngle(axis, ang).multiply(b.getWorldQuaternion(new THREE.Quaternion()));
      b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(nw)); b.updateMatrixWorld(true);
    };
    const A = this.dejA || { sp1: 0.16, sp2: 0.16, neck: 0.3 };
    rotW('spine_01', A.sp1 * w); rotW('spine_02', A.sp2 * w); rotW('neck_01', A.neck * w);
    // braccia stese in basso, penzolanti: ogni segmento si orienta verso il basso (prima si ruotava solo attorno all'asse
    // laterale e le mani finivano appoggiate sulla cintura, dentro il corpo)
    const rootP = this.root.getWorldPosition(new THREE.Vector3());
    const aimDown = (n, child, tgtFor, k) => {
      const bn = this.bones[n], ch = this.bones[child]; if (!bn || !ch || !bn.parent) return;
      bn.updateMatrixWorld(true);
      const p0 = bn.getWorldPosition(new THREE.Vector3()), dir = ch.getWorldPosition(new THREE.Vector3()).sub(p0).normalize();
      const s = Math.sign(p0.clone().sub(rootP).dot(axis)) || 1;
      const tgt = tgtFor(s), qr = new THREE.Quaternion().setFromUnitVectors(dir, tgt), qi = new THREE.Quaternion().slerp(qr, w * k);
      const nw = qi.multiply(bn.getWorldQuaternion(new THREE.Quaternion()));
      bn.quaternion.copy(bn.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(nw)); bn.updateMatrixWorld(true);
    };
    for (const sd of ['l', 'r']) {
      aimDown('upperarm_' + sd, 'lowerarm_' + sd, s => new THREE.Vector3(0, -1, 0).addScaledVector(axis, s * 0.14).addScaledVector(fwd, 0.04).normalize(), 1);
      aimDown('lowerarm_' + sd, 'hand_' + sd, s => new THREE.Vector3(0, -1, 0).addScaledVector(axis, s * 0.10).addScaledVector(fwd, 0.14).normalize(), 1);
    }
  }
  _reachBend(dt) {
    if(this.punch?.motion&&this.enabled&&!this.down)return;
    const P = this.lastPlayer, ap = this.enabled && !this.down ? this.aimPunch() : null;
    const name = this.punch ? this.punch.name : (this.combo.length ? this.combo[0] : null), sp = name && PUNCH[name];
    let target = 0, armT = 0;
    if (P && ap && sp) {
      const rp = this.root.getWorldPosition(_e), sc = this.root.getWorldScale(_d).y;
      const aimY = this.aimPt && this.punch && this.lockFor === this.punch ? this.aimPt.y : P.head.y - (sp.zone==='body'?.45:.03);
      const d = rp.y + ap.y * sc - aimY;                                // quanto il pugno passerebbe sopra (+) o sotto (-) il punto scelto
      const L = Math.max(0.4, Math.hypot(ap.dist, ap.y - 1.0) * sc);   // dal giro vita al pugno
      target = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(d / L, -1, 1)), -0.12, 0.32);
      if (d < 0) {                                                     // sei piu' alto: quello che manca lo fa il braccio
        const rest = -d - L * Math.sin(0.2);
        if (rest > 0) armT = THREE.MathUtils.clamp(Math.asin(Math.min(1, rest / (0.55 * sc))), 0, 0.55);
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
    this.frameDt=dt;
    this.stateT += dt;
    if (this.stun > 0) this.stun -= dt;
    const head = player.head;
    this.lastPlayer = player;
    if (this.goal) { this.updateGoal(dt); this.animate(dt); return; }   // va all'angolo

    // guarda sempre l'avversario
    const toP = new THREE.Vector3(head.x - this.root.position.x, 0, head.z - this.root.position.z);
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
        this.aimPt = this.punch.aim || this.chooseAim(player, this.punch.name);
        let dyA = dy;
        if (this.aimPt) { const rp = this.root.getWorldPosition(_e); dyA = Math.atan2(this.aimPt.x - rp.x, this.aimPt.z - rp.z) - (aimP ? aimP.yaw : 0) - this.root.rotation.y; dyA = Math.atan2(Math.sin(dyA), Math.cos(dyA)); }
        // Procedural paths already aim in world space. Turning by the old
        // clip's impact offset again creates a second, abrupt movement.
        this.lockYaw = this.punch.motion?this.root.rotation.y:this.root.rotation.y + Math.max(-0.35, Math.min(0.35, dyA));
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
      this.think(dt, player, dist);
      this.move(dt, dist, punching && this.lockDir ? this.lockDir : toP.clone().normalize());   // (colpendo: passo nella direzione di partenza)
    } else if (this.holdDist && !this.down) this.move(dt, dist, toP.clone().normalize());   // si allontana (angolo neutro)
    else this.vel.set(0, 0, 0);
    this.animate(dt);
    if (this.enabled && !player.f) { this.checkPlayerPunches(player); this.resolveMyPunch(player, dist); }
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
      else this.play(type, Math.min(2.4,c.defenseSpeed*(.85+.15*Math.min(1,g.speed/5))));
      this.defending = { kind, start: this.time, type, until: this.time + 0.55 / Math.max(1, c.defenseSpeed * 0.75), glove: g.side,
        punchId: this.reaction.punchId, hit: false, bailed };
      this.reaction = null;
    }
    if (this.defending) {
      const g = player.gloves[this.defending.glove === 'left' ? 'left' : 'right'];
      const hc = this.headCenter();
      const rel = _b.subVectors(hc, g.center);
      const coming = g.mesh.visible && g.speed > 0.8 && g.vel.dot(rel) / rel.length() > 0.3 && rel.length() < 0.75;
      const d=this.defending;d.closest=Math.min(d.closest??Infinity,rel.length());
      if(d.closest<.42&&rel.length()>d.closest+.035&&g.vel.dot(rel)<0)d.avoided=true;
      if (coming) {
        this.defending.until = Math.max(this.defending.until, this.time + 0.12);
        const h = HOLD[this.defending.type], l = this.current();
        if (h && l && l.name === this.defending.type && l.t * 30 > h[1]) { l.t = h[1] / 30 - 0.02; l.action.time = l.t; }
      }
    }
    if (this.defending && this.time > this.defending.until) {
      const ok = !this.defending.hit && this.defending.avoided;
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
        if(!this.noAttack){const coverage=Math.min(...Object.values(player.gloves).filter(g=>g.mesh.visible).map(g=>g.center.distanceTo(player.head)),1);if((this.lastCoverage??1)<.27&&coverage>.33&&Math.random()<(c.readGuard??.6))this.nextAttack=Math.min(this.nextAttack,Math.max(.08,c.reactDelay?.[0]??.15));this.lastCoverage=coverage;}
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
        if ((dist<=this.attackDist()+.025 && this.moveVel.length()<.22) && !this.defending) {
          this.counter = false;
          this.setState('attack'); this.nextPunch();
        }
        break;
      case 'attack':
        // pugno interrotto da un'altra animazione (parata, colpo preso): prima restava "in attacco" per sempre,
        // con la direzione bloccata (non si girava piu' verso di te) e senza tornare in guardia
        if (this.punch && ((this.punch.layer.out&&!this.punch.contactEnded) || this.stateT > 3 / Math.max(0.05, c.punchSpeed))) { this.punch = null; this.combo = []; this.setState('retreat'); break; }
        if (this.punch && (this.punch.contactEnded&&this.punch.layer.w<=.02 || this.punch.layer.t > this.punch.layer.dur * (this.punch.move ? 0.5 : 0.72))) {
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
  attackDist() {
    const a=this.aimPunch(),name=this.combo?.[0];
    const base=(a?a.dist-.03:this.cfg.attackDist)+(this.reachExtra||0);
    if((name==='jab'||name==='cross')&&this.lastPlayer){
      const spec=PUNCH[name],pivot=this.bonePos('pelvis'),shoulder=this.bonePos('upperarm_'+spec.side),elbow=this.bonePos('lowerarm_'+spec.side),wrist=this.bonePos('hand_'+spec.side),u=shoulder.distanceTo(elbow),l=elbow.distanceTo(wrist);
      shoulder.sub(pivot).applyAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(name==='jab'?-18:60)).add(pivot);
      const delta=shoulder.clone().sub(this.root.getWorldPosition(new THREE.Vector3())),forward=this.forward(),lateral=new THREE.Vector3(forward.z,0,-forward.x),dy=this.lastPlayer.head.y-.04-shoulder.y;
      const radius=Math.sqrt(u*u+l*l-2*u*l*Math.cos(THREE.MathUtils.degToRad(165)));
      return delta.dot(forward)+Math.sqrt(Math.max(.01,radius*radius-dy*dy-delta.dot(lateral)**2))+.065;
    }
    if(name?.startsWith('hook')&&this.lastPlayer){
      const spec=PUNCH[name],shoulder=this.bonePos('upperarm_'+spec.side),elbow=this.bonePos('lowerarm_'+spec.side),wrist=this.bonePos('hand_'+spec.side);
      const u=shoulder.distanceTo(elbow),l=elbow.distanceTo(wrist),radius=Math.sqrt(u*u+l*l+u*l)*.97;
      const targetY=this.lastPlayer.head.y-(spec.zone==='body'?.45:.05),drop=spec.zone==='body'?THREE.MathUtils.clamp(shoulder.y-targetY-.18,.16,.30):0;
      const dy=targetY-shoulder.y+drop,max=Math.sqrt(Math.max(0,radius*radius-dy*dy))+.075;
      const current=Math.hypot(this.lastPlayer.head.x-this.root.position.x,this.lastPlayer.head.z-this.root.position.z);
      return THREE.MathUtils.clamp(current,Math.min(base,max*.70),Math.max(base,max));
    }
    return base;
  }   // reachExtra: sparring in difesa, tira da un po' piu' lontano

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
    const target=this.chooseAim(player,name),spec=PUNCH[name];
    const b=target,a=name.startsWith('hook')?target.clone().addScaledVector(new THREE.Vector3(this.forward().z,0,-this.forward().x),spec.side==='l'?.25:-.25).addScaledVector(this.forward(),-.12):this.bonePos('hand_'+spec.side).clone().lerp(target,.55);
    let best = 9;
    for (const g of Object.values(player.gloves)) if (g.mesh.visible) best = Math.min(best, distPointSeg(g.center, a, b));
    return best;
  }
  // se il prossimo colpo e' coperto, Mike (secondo il livello) lo cambia con uno che arriva dove sei scoperto
  readGuard(player) {
    const name = this.combo[0];
    if (!name || !PUNCH[name] || !player || Math.random() >= (this.time<(this.openSearchUntil||0)?1:(this.cfg.readGuard ?? 0.6))) return true;
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
    const spec=PUNCH[name],side=spec.side,other=side==='l'?'r':'l';
    const shoulder=this.bonePos('upperarm_'+side),elbow=this.bonePos('lowerarm_'+side),hand=this.bonePos('hand_'+side);
    const aim=this.chooseAim(player,name);
    // Uppercuts finish at the chin, never at the forehead or above the head.
    if(name.startsWith('uppercut')&&spec.zone==='head')aim.y=Math.min(aim.y,player.head.y-.07);
    const lengths=[shoulder.distanceTo(elbow),elbow.distanceTo(hand)];
    const radius=Math.hypot(...lengths);
    const bodyHook=name.startsWith('hook_body');
    const hipDrop=THREE.MathUtils.clamp(shoulder.y-aim.y-radius*(bodyHook?.32:.55),bodyHook?.16:spec.zone==='body'?.04:0,bodyHook?.30:.23);
    const planningShoulder=shoulder.clone().add(new THREE.Vector3(0,-hipDrop,0));
    if(name==='jab'||name==='cross'){const pivot=this.bonePos('pelvis');planningShoulder.sub(pivot).applyAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(name==='jab'?-18:60)).add(pivot);}
    const motion=punchMotion(name,side,planningShoulder,hand,elbow,aim,this.forward(),lengths);
    const hip=this.bones.pelvis,hipDropLocal=new THREE.Vector3(0,-hipDrop,0).applyQuaternion(hip.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).divide(hip.parent.getWorldScale(new THREE.Vector3()));
    const speed=3.8*this.cfg.punchSpeed*(.7+.3*(this.condition?.stamina??100)/100)*(1-.15*(this.fatigue||0));
    const peak=(spec.from+spec.to)/2/30;
    const ts=peak/Math.max(.025,motion.outboundTime(speed));
    const layer=this.play(name,ts);
    layer.procedural=true;
    const freeShoulder=this.bonePos('upperarm_'+other),freeElbow=this.bonePos('lowerarm_'+other),freeGuard=this.bonePos('hand_'+other);
    this.punch={name,layer,resolved:false,inRange:false,counter:!!this.counterCombo,side,aim,motion,
      bodyGuard:['pelvis','spine_01','spine_02','spine_03','neck_01'].filter(n=>this.bones[n]).map(n=>[n,this.bones[n].quaternion.clone()]),hipPosition:hip.position.clone(),hipDropLocal,hipDrop,
      startShoulder:shoulder,startPole:elbow.clone().sub(shoulder),armLengths:lengths,
      freeGuard,freeShoulder,freePole:freeElbow.clone().sub(freeShoulder),freeLengths:[freeShoulder.distanceTo(freeElbow),freeElbow.distanceTo(freeGuard)],
      freeLane:new THREE.Vector3(this.forward().z,0,-this.forward().x).multiplyScalar(other==='l'?.12:-.12).add(new THREE.Vector3(0,-.06,0)),
      feetGuard:{l:this.bonePos('foot_l'),r:this.bonePos('foot_r')}};
    this.punch.prevCenter=this.glove(side).center.clone();this.punch.strokeStart=this.punch.prevCenter.clone();
    exert(this.condition,name==='jab'?1.5:name.startsWith('hook')?3:2.3);
    this.emit('mikeThrows', { name,point:this.glove(PUNCH[name].side).center.clone() });
  }

  move(dt, dist, dir) {
    // A launched punch plants the feet through its return to guard, including
    // the visible animation tail after the AI has already chosen to retreat.
    const planted=(this.state==='attack'&&this.punch&&!this.punch.move)||this.layers.some(l=>PUNCH[l.name]&&(!l.out||l.w>.02));
    if(planted){
      this.vel.set(0,0,0);this.moveVel.set(0,0,0);this.prevPos.copy(this.root.position);
      for(const l of Object.values(this.loco)){l.w=0;l.action.setEffectiveWeight(0);}
      return;
    }
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
    if (this.state === 'retreat') radial = Math.min(radial, -0.2);
    if (this.backOff > 0) { radial = -1.1; this.backOff -= 1.1 * dt; }   // passo indietro (schiva al corpo), con i passi
    const side = _c.set(dir.z, 0, -dir.x);       // perpendicolare: gira intorno
    const stepEnvelope=this.fw?Math.sin(Math.PI*THREE.MathUtils.clamp(this.fw.t/3.4,0,1)):1;
    const strafe = (this.state === 'stalk' ? Math.sin(this.time * 0.8 + this.strafe) * 0.06 : 0) + fwSide*stepEnvelope;
    // velocita' con un minimo di inerzia (un pugile non parte e non si ferma di colpo)
    const target = _b.copy(dir).multiplyScalar(radial).addScaledVector(side, strafe);
    this.moveVel.lerp(target, Math.min(1, dt * 6));
    this.prevPos.copy(this.root.position);
    this.root.position.addScaledVector(this.moveVel, dt);
    const separation=this.root.position.clone().sub(this.lastPlayer.head).setY(0),gap=separation.length();
    if(gap<.46&&gap>.001)this.root.position.addScaledVector(separation.normalize(),Math.min(.04,.46-gap));
    if (this.bounds) this.bounds(this.root.position);
    if (dt > 0) this.vel.subVectors(this.root.position, this.prevPos).divideScalar(dt);   // velocita' vera (con le corde)
  }

  // All contacts are resolved against the visible, animated pose.
  resolveMyPunch(player, dist) {
    const p=this.punch;if(!p||p.move||p.resolved||!this.enabled)return;
    const spec=PUNCH[p.name],frame=p.layer.t*30,{center}=this.glove(spec.side);
    const previousFrame=p.prevFrame??0;p.prevFrame=frame;
    const strikeFrom=p.motion?p.motion.loadFraction*(spec.from+spec.to)/2:spec.from;
    const strikeTo=p.motion?(spec.from+spec.to)/2:spec.to;
    const previous=p.prevCenter||center;p.prevCenter=center.clone();
    p.peakSpeed=Math.max(p.peakSpeed||0,Math.min(11,previous.distanceTo(center)/Math.max(.001,this.frameDt||.016)));
    if(!p.swingSound&&p.peakSpeed>1.2&&frame>=spec.from*.5){p.swingSound=true;this.emit('mikeSwing',{point:center.clone(),speed:p.peakSpeed});}
    if(frame>strikeTo&&previousFrame>=strikeTo){p.resolved=true;this.openUntil=this.time+.55;if(dist<1.2)this.emit('playerDodged');return;}
    // An extended guard can meet the fist before the old scoring window starts.
    // Check the outgoing stroke from its first motion; never score a wind-up hit.
    const shapes=playerShapes(player);
    const contact=firstContact(previous,center,frame<strikeFrom?shapes.filter(s=>s.kind==='block'):shapes);
    if(!contact||frame<strikeFrom&&center.distanceTo(p.aim)>=previous.distanceTo(p.aim))return;
    p.resolved=true;
    const measured=previous.distanceTo(center)/Math.max(.001,this.frameDt||.016);
    const speed=Math.min(11,Math.max(measured,p.peakSpeed||0));
    const data={name:p.name,zone:contact.zone,side:contact.side,counter:p.counter,point:contact.point.clone(),dir:center.clone().sub(previous).normalize(),speed,quality:contact.quality,power:impactPower(speed,1,this.condition?.stamina)};
    this.contactArm(spec.side,contact.point,contact.kind==='block');
    if(contact.kind==='block'){
      this.blockedRun=(this.blockedRun||0)+1;if(this.blockedRun>=3){this.openSearchUntil=this.time+5;this.blockedRun=0;}
      this.openUntil=this.time+.55;this.emit('playerBlocked',data);
      if(player.deferReactions)player.pendingContacts.push(['block',data]);else player.f?.receiveContact('block',data);
    }else{
      this.blockedRun=0;this.emit('mikeHit',data);if(player.deferReactions)player.pendingContacts.push(['hit',data]);else player.f?.receiveContact('hit',data);
    }
  }

  receiveContact(kind,event) {
    if(kind==='block'){exert(this.condition,.6);if(this.defending)this.defending.avoided=true;return;}
    this.reaction=null;if(this.defending)this.defending.hit=true;
    this.stun=Math.max(this.stun,.12+.22*(event.quality||1));
    const interrupted=this.punch&&!this.punch.move;
    if(interrupted&&event.quality>.55){this.punch=null;this.combo=[];this.setState('retreat');}
    this.play(event.zone==='head'?'hit_head':'hit_body',1.15);
    this.pain=event.zone==='head'?1.1:.8;
  }

  // Player and sparring share the same thresholds and physical collision rules.
  checkPlayerPunches(player) {
    const hc=this.headCenter(),torso=this.torso(),shapes=fighterShapes(this);
    for(const g of Object.values(player.gloves)){
      if(!g.mesh.visible||g.cooldown>0||g.coasting||g.peakSpeed()<PUNCH_LIMITS.peak)continue;
      const target=g.center.y>hc.y-.25?hc:torso[0].clone().add(torso[1]).multiplyScalar(.5);
      const toward=target.clone().sub(g.center).normalize();
      if(g.speed<PUNCH_LIMITS.current||g.vel.dot(toward)<.35*g.speed||g.travel(toward)<PUNCH_LIMITS.travel)continue;
      const [a,b]=g.segment(),speed=g.peakSpeed();
      const belt=this.bonePos('pelvis').y+.10;
      if(g.center.y<belt){
        const groin=this.bonePos('pelvis').addScaledVector(this.forward(),.13).add(new THREE.Vector3(0,-.13,0));
        if(this.lowBlowAllowed&&firstContact(a,b,[{kind:'low',center:groin,radius:.10}]))this.emit('lowBlow',{side:g.side});
        g.cooldown=.35;g.contactPoint.copy(g.center);g.hist.length=0;continue;
      }
      const contact=firstContact(a,b,shapes);
      if(!contact){
        if(this.defending&&this.defending.punchId===g.punchId&&g.vel.dot(hc.clone().sub(g.center))<=0)this.defending.avoided=true;
        continue;
      }
      const local=this.root.worldToLocal(contact.point.clone()),headLocal=this.root.worldToLocal(hc.clone());
      const event={side:g.side,speed,quality:contact.quality,zone:contact.zone,lx:local.x,ly:local.y-headLocal.y,point:contact.point.clone(),dir:g.vel.clone().normalize(),counter:this.committed()||this.time<this.openUntil};
      g.cooldown=.30;g.contactPoint.copy(g.center);g.hist.length=0;
      g.showContact?.(contact.point);
      if(contact.kind==='block'){this.emit('mikeBlocked',event);this.receiveContact('block',event);}
      else {this.emit('playerHit',event);this.receiveContact('hit',event);}
    }
  }
}

