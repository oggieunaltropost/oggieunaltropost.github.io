// Home Boxing - avvio, realta' mista, round e punteggi.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRing, RING_SIZE } from './ring.js?v=20261003120215';
import { Mike, LEVELS, loadMikeGLTF } from './mike.js?v=20261003120215';
import { Sweat, Bruises, Celebration } from './fx.js?v=20261003120215';
import { Player, SimInput } from './player.js?v=20261003120215';
import { Scoreboard, HitFlash, PauseMenu, MenuPanel, CountdownHUD } from './hud.js?v=20261003120215';
import { Room } from './room.js?v=20261003120215';
import { Arena } from './arena.js?v=20261003120215';
import { Beach } from './beach.js?v=20261003120215';
import { RingGirl } from './ringgirl.js?v=20261003120215';
import { REST_S, knockdownChance, say, sayCount, GetUpChallenge } from './match.js?v=20261003120215';
import * as sfx from './sfx.js?v=20261003120215';
import { t, lang, setLang, onLang } from './i18n.js?v=20261003120215';
sfx.setVoiceLang(lang);

const $ = id => document.getElementById(id);
const status = t => { $('status').textContent = t; };

// ---------------------------------------------------------------- scena
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 60);
camera.position.set(0, 1.65, 0);
scene.add(camera);
const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = roomEnv;
scene.environmentIntensity = 0.7;

const hemi = new THREE.HemisphereLight(0xffffff, 0x404048, 1.1);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
key.position.set(1.2, 3.5, 1.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 8 });
key.shadow.bias = -0.0005;
// luce di riempimento dal punto di vista del giocatore (come le luci TV a bordo ring): illumina gambe e viso di Mike
const fill = new THREE.DirectionalLight(0xfff4ea, 0.4);
fill.position.set(0, 0.3, 0.5); fill.target.position.set(0, -0.6, -3);
camera.add(fill); camera.add(fill.target);

addEventListener('resize', () => {
  if (renderer.xr.isPresenting) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// l'arena (ring + tabellone) si sistema davanti al giocatore; il giocatore sta sul lato +Z
const arena = new THREE.Group();
scene.add(arena);
arena.add(key, key.target);           // luce e ombre seguono il ring
const board = new Scoreboard();
arena.add(board.mesh);
const PLAYER_Z = 0.8;                 // dove sta il giocatore rispetto al centro del ring (se c'e' spazio)
let ringSize = 0, ringObj = null, playerZ = PLAYER_Z;
function setRing(size, pz) {
  playerZ = pz;
  if (Math.abs(size - ringSize) > 1e-3) {
    if (ringObj) arena.remove(ringObj);
    ringObj = buildRing(size); arena.add(ringObj); ringSize = size;
  }
  arena.updateMatrixWorld(true);
  board.mesh.position.set(Math.min(1.15, size / 2 - 0.2), 1.95, -size / 2 - 0.1);
  board.mesh.lookAt(new THREE.Vector3(0, 1.6, pz).applyMatrix4(arena.matrix));
}
setRing(RING_SIZE, PLAYER_Z);
const room = new Room(scene);
const sweat = new Sweat(scene);
let bruises = null;
// round per incontro (dal menu: 1, 3, 6 o 12; di base 3)
let rounds = 3;
// durata dei round (dal menu: 1, 2 o 3 minuti; di base 3)
let roundSecs = 180;
try { roundSecs = parseInt(localStorage.getItem('hb-roundsec')) || 180; } catch (e) {}
try { rounds = parseInt(localStorage.getItem('hb-rounds')) || 3; } catch (e) {}
const party = new Celebration(scene);
const girl = new RingGirl(scene);
// sgabello di Mike nel suo angolo (blu), si vede solo nel riposo
const stool = new THREE.Group();
{ const m = new THREE.MeshStandardMaterial({ color: 0x23262d, roughness: 0.5, metalness: 0.4 });
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 20), m); seat.position.y = 0.5; stool.add(seat);
  for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6), m); const a = i * 2.1; l.position.set(Math.cos(a) * 0.11, 0.25, Math.sin(a) * 0.11); stool.add(l); } }
stool.visible = false; scene.add(stool);
let level = 'normale';
try { level = localStorage.getItem('hb-level') || 'normale'; } catch (e) {}
if (!LEVELS[level]) level = 'normale';
// dove si gioca: 'stanza' = realta' mista nella tua stanza, 'arena' = palazzetto virtuale con il pubblico,
// 'spiaggia' = ring sulla sabbia in riva al mare
const MODES = ['stanza', 'arena', 'spiaggia'];
let mode = 'stanza';
try { mode = localStorage.getItem('hb-mode') || 'stanza'; } catch (e) {}
if (!MODES.includes(mode)) mode = 'stanza';
let arenaEnv = null, beachEnv = null;
function applyMode() {
  const inArena = mode === 'arena', onBeach = mode === 'spiaggia';
  if (inArena && !arenaEnv) { arenaEnv = new Arena(RING_SIZE); arena.add(arenaEnv.group); }
  if (onBeach && !beachEnv) { beachEnv = new Beach(); arena.add(beachEnv.group); }
  if (arenaEnv) arenaEnv.group.visible = inArena;
  if (beachEnv) beachEnv.group.visible = onBeach;
  room.group.visible = mode === 'stanza';
  if (onBeach) {                                       // pieno giorno: sole alto dietro di te, cielo azzurro
    hemi.color.set(0xbfe0ff); hemi.groundColor.set(0xb89a68); hemi.intensity = 0.8;
    scene.environmentIntensity = 0.6; key.intensity = 2.3; fill.intensity = 0.4;
    key.color.set(0xfff0d8); key.position.copy(beachEnv.sunDir).multiplyScalar(6);   // il sole della foto
    scene.background = new THREE.Color(0xa9c9e6); scene.fog = null;
    // riflessi e luce d'ambiente dal panorama vero (appena l'immagine e' caricata)
    const useSky = () => {
      if (!beachEnv.envMap) beachEnv.envMap = pmrem.fromEquirectangular(beachEnv.skyTex).texture;
      if (mode === 'spiaggia') { scene.environment = beachEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (beachEnv.skyLoaded) useSky(); else beachEnv.onSkyLoad = useSky;
    camera.far = 400;                                  // si vedono orizzonte, citta' e promontorio
  } else {
    scene.environment = roomEnv; scene.environmentRotation.set(0, 0, 0);
    hemi.color.set(0xffffff); hemi.groundColor.set(0x404048);
    hemi.intensity = inArena ? 0.2 : 1.1;
    scene.environmentIntensity = inArena ? 0.3 : 0.7;     // nel palazzetto il pubblico resta in penombra
    key.intensity = inArena ? 0.9 : 2.2; key.color.set(0xfff1e0); key.position.set(1.2, 3.5, 1.5);
    fill.intensity = inArena ? 1.5 : 0.5;
    scene.background = inArena ? new THREE.Color(0x05060a) : (sim ? new THREE.Color(0x2a2c31) : null);
    scene.fog = inArena ? new THREE.Fog(0x05060a, 9, 26) : null;
    camera.far = 60;
  }
  camera.updateProjectionMatrix();
  sfx.crowdAmbient(inArena);
  sfx.seaAmbient(onBeach);
}
const READY_S = 6;                    // secondi prima del gong

const player = new Player(renderer, scene, camera);
const flash = new HitFlash(camera);
const pause = new PauseMenu();
scene.add(pause.group);
// menu principale dentro il gioco (stanza o arena, livello, inizia, esci)
// anteprime degli stage nel menu: foto del gioco per arena e spiaggia, un disegno per la stanza
function roomPreview() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#d9cbb4'; g.fillRect(0, 0, 320, 120);                       // parete
  g.fillStyle = '#9b7a55'; g.fillRect(0, 120, 320, 80);                      // parquet
  g.strokeStyle = 'rgba(60,40,20,0.35)';
  for (let x = -200; x < 520; x += 28) { g.beginPath(); g.moveTo(160 + (x - 160) * 0.5, 120); g.lineTo(x, 200); g.stroke(); }
  g.fillStyle = '#8fc3e8'; g.fillRect(28, 22, 70, 60); g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(28, 22, 70, 60);   // finestra
  g.beginPath(); g.moveTo(63, 22); g.lineTo(63, 82); g.stroke();
  g.fillStyle = '#4b5d78'; g.fillRect(222, 78, 86, 34); g.fillRect(218, 64, 94, 20);   // divano
  g.fillStyle = '#1e66c9'; g.fillRect(70, 132, 180, 46);                           // ring
  g.strokeStyle = '#e8412c'; g.lineWidth = 4; g.strokeRect(70, 108, 180, 34);
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.strokeRect(70, 118, 180, 24);
  g.fillStyle = '#eeeeee'; for (const x of [70, 250]) g.fillRect(x - 4, 100, 8, 70);
  // bollino "AR" (realta' aumentata: vedi la tua casa vera) nell'angolo in alto a destra
  g.fillStyle = '#ffd34d'; g.beginPath(); g.roundRect(244, 10, 66, 40, 9); g.fill();
  g.fillStyle = '#111111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 30px system-ui, sans-serif'; g.fillText('AR', 277, 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const stageImg = n => { const t = new THREE.TextureLoader().load(`assets/stage_${n}.webp?v=20261003120215`); t.colorSpace = THREE.SRGBColorSpace; return t; };
const mainMenu = new MenuPanel({ title: 'HOME BOXING', titleH: 0.1, width: 1.0, height: 1.5, rows: [
  { label: t('where'), tk: 'where', y: 0.41, h: 0.22, buttons: [{ id: 'm:stanza', tk: 'm_stanza', w: 0.29, img: roomPreview() },
    { id: 'm:arena', tk: 'm_arena', w: 0.29, img: stageImg('arena') }, { id: 'm:spiaggia', tk: 'm_spiaggia', w: 0.29, img: stageImg('spiaggia') }] },
  { label: t('level'), tk: 'level', y: 0.19, buttons: [{ id: 'l:facile', tk: 'l_facile', w: 0.205 }, { id: 'l:normale', tk: 'l_normale', w: 0.205 },
    { id: 'l:difficile', tk: 'l_difficile', w: 0.205 }, { id: 'l:impossibile', tk: 'l_impossibile', w: 0.205 }] },
  { label: t('rounds'), tk: 'rounds', y: 0.03, buttons: [{ id: 'r:1', text: '1', w: 0.15 }, { id: 'r:3', text: '3', w: 0.15 }, { id: 'r:6', text: '6', w: 0.15 }, { id: 'r:12', text: '12', w: 0.15 }] },
  { label: t('duration'), tk: 'duration', y: -0.13, buttons: [{ id: 'd:60', text: '1 min', w: 0.2 }, { id: 'd:120', text: '2 min', w: 0.2 }, { id: 'd:180', text: '3 min', w: 0.2 }] },
  { label: t('rule3'), tk: 'rule3', y: -0.29, buttons: [{ id: 'k:si', tk: 'yes', w: 0.2 }, { id: 'k:no', tk: 'no', w: 0.2 }] },
  { label: t('language'), tk: 'language', y: -0.45, buttons: [{ id: 'g:it', text: 'Italiano', w: 0.26 }, { id: 'g:en', text: 'English', w: 0.26 }] },
  { y: -0.63, h: 0.12, buttons: [{ id: 'start', tk: 'start', w: 0.52, color: 0x1f8a4c }, { id: 'quit', tk: 'quit', w: 0.34, color: 0xc4161f }] },
].map(r => ({ ...r, buttons: r.buttons.map(b => ({ ...b, text: b.tk ? t(b.tk) : b.text })) })) });
scene.add(mainMenu.group);
let armsUpT = 0, prevButtons = false;

let mike = null;
let sim = null, orbit = null;

// tiene Mike dentro le corde
const _inv = new THREE.Matrix4(), _p = new THREE.Vector3();
function keepInRing(pos) {
  _inv.copy(arena.matrixWorld).invert();
  _p.copy(pos).applyMatrix4(_inv);
  const m = ringSize / 2 - 0.4;
  _p.x = Math.max(-m, Math.min(m, _p.x)); _p.z = Math.max(-m, Math.min(m, _p.z)); _p.y = 0;   // sul tappeto
  pos.copy(_p.applyMatrix4(arena.matrixWorld));
}

// Altezza del pavimento vero. Il riferimento "local-floor" del Quest puo' sbagliare di molto
// (per esempio con il Confine disattivato): per questo si legge il pavimento dalla scansione
// della stanza (plane-detection), come in Lumino; se manca si stima dall'altezza della testa.
let floorY = 0, floorSource = 'visore';
function setFloor(y, source) {
  floorY = y; floorSource = source;
  arena.position.y = y; arena.updateMatrixWorld(true);
  if (mike) mike.root.position.y = y;
  console.log('pavimento', y.toFixed(3), source);
}

function detectFloor(frame) {
  const ref = renderer.xr.getReferenceSpace();
  if (!ref) return null;
  room.update(frame, ref);
  return room.floorY;
}

let lastPlace = null, fitted = false;
function placeArena(headPos, yaw) {
  lastPlace = { head: headPos.clone(), yaw };
  // ring piu' grande possibile dentro la stanza scansionata; senza scansione: 3,2 m davanti a te
  const fit = mode !== 'stanza' ? null : room.fitRing(headPos, yaw, RING_SIZE, PLAYER_Z);
  fitted = !!fit;
  arena.rotation.y = yaw;
  if (fit) {
    arena.position.set(fit.center.x, floorY, fit.center.z);
    arena.updateMatrix(); setRing(fit.size, fit.playerZ);
    console.log('ring', fit.size.toFixed(1), 'm, giocatore a', fit.playerZ.toFixed(2), 'dal centro');
  } else {
    const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    arena.position.set(headPos.x, floorY, headPos.z).addScaledVector(fwd, PLAYER_Z);
    arena.updateMatrix(); setRing(RING_SIZE, PLAYER_Z);
  }
  arena.updateMatrixWorld(true);
  if (mike) {
    const mz = Math.max(-(ringSize / 2 - 0.4), playerZ - 1.15);
    mike.root.position.set(0, 0, mz).applyMatrix4(arena.matrixWorld);
    mike.root.rotation.y = yaw;               // il modello guarda verso +Z: verso il giocatore
  }
}

// ---------------------------------------------------------------- incontro: round, punti, danno, atterramenti
const POWER = { facile: 0.75, normale: 0.95, difficile: 1.15, impossibile: 1.35 };   // forza dei pugni di Mike
// Atterramenti: si va giu' solo a energia zero. Rialzandosi l'energia risale sempre meno; quando non ce n'e'
// piu' da recuperare si resta giu': KO. Con la "regola dei 3 KO" il terzo atterramento chiude l'incontro.
const KD_REFILL = [75, 50, 25];
const getUp = new GetUpChallenge(scene);
getUp.attachDark(camera);
const countdown = new CountdownHUD(camera);
const nextMenu = new MenuPanel({ title: t('next_title', { n: 2, s: 30 }), titleH: 0.045, titleW: 0.32, width: 0.36, height: 0.15, rows: [
  { y: -0.025, h: 0.06, buttons: [{ id: 'next', tk: 'next_btn', text: t('next_btn'), w: 0.32, color: 0x1f8a4c }] },
] });
scene.add(nextMenu.group);
const fighter = () => ({ points: 0, hits: 0, blocks: 0, dodges: 0, dmg: 0, kd: 0, kdRound: 0, penalties: 0 });
const game = {
  round: 1, time: roundSecs, phase: 'ready', phaseT: 0, paused: false,
  player: fighter(), mike: fighter(), message: '', kd: null, result: null, foul: null, fill: null,
};
let threeKO = true;
try { threeKO = localStorage.getItem('hb-3ko') !== 'no'; } catch (e) {}

function setPeople(v) {                      // nel menu il ring e' vuoto: niente Mike, niente pubblico
  if (mike) mike.root.visible = v;
  if (arenaEnv) arenaEnv.setPeople(v);
}
function newMatch() {
  game.round = 1; game.result = null; game.kd = null; game.foul = null; game.fill = null;
  game.player = fighter(); game.mike = fighter();
  if (bruises) bruises.reset();
  if (mike) { mike.resetPose(); mike.holdDist = null; }
  getUp.stop(); setPeople(true);
  startRound();
}
function startRound() {
  girl.stop(); stool.visible = false; nextMenu.close(); countdown.hide();
  if (mike) mike.leaveCorner();
  game.time = roundSecs; game.phase = 'ready'; game.phaseT = 0; game.paused = false; game.kd = null; game.foul = null;
  game.announced = false; game.lastCount = 0; game.girlStarted = false;
  game.player.kdRound = 0; game.mike.kdRound = 0;
  game.message = t('round_of', { r: game.round, n: rounds });
  if (mike) mike.enabled = false;
}
const resetRound = newMatch;          // (nomi usati dal resto del codice)
newMatch();
game.phase = 'menu';            // finche' non scegli "Inizia incontro" non parte niente (anche fuori dal visore)

// un colpo a segno: danno; a energia zero si va giu'
function landed(who, zone, power) {
  const f = game[who];
  f.dmg = Math.min(100, f.dmg + (zone === 'head' ? 3.5 + 6 * power : 2 + 3.5 * power));
  if (game.kd || game.phase !== 'fight' || game.foul) return;
  if (f.dmg >= 100) knockdown(who, power);
}

function knockdown(who, power) {
  const f = game[who];
  f.kd++; f.kdRound++;
  mike.enabled = false;
  sfx.punchHit(1.4);
  sfx.voiceNow('knockdown');
  if (arenaEnv) arenaEnv.cheer(2);
  if (mode === 'arena') sfx.cheer('boato', 1);
  const refill = KD_REFILL[f.kd - 1] || 0;
  const kd = { who, count: 0, t: 0, up: false, refill, final: refill <= 0, tko: threeKO && f.kd >= 3 };
  if (who === 'mike') {
    mike.knockdown();
    kd.getUpAt = kd.final || kd.tko ? 99 : 4 + Math.floor(Math.random() * 5);      // si rialza tra il 4 e l'8
    game.message = t('mike_down');
  } else {
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
    const n = [10, 20, 30][f.kd - 1] || 30;
    if (!kd.final && !kd.tko) {
      getUp.start(n, 0.11, player.head, e.y);
      game.message = t('you_down_hit', { n });
    } else game.message = t('you_down_out');
    mike.holdDist = 1.7;                     // Mike va all'angolo neutro
  }
  if (kd.tko) game.message = t('third_kd', { who: t(who === 'mike' ? 'who_mike' : 'who_you') });
  game.kd = kd;
}

function updateKnockdown(dt) {
  const kd = game.kd, f = game[kd.who];
  kd.t += dt;
  if (kd.tko && kd.t > 1.5) return endMatch(kd.who === 'mike' ? 'player' : 'mike', 'TKO');
  if (kd.tko) return;
  const c = Math.floor(kd.t / 1.0);                     // conteggio: un numero al secondo
  if (c > kd.count && c <= 10) {
    kd.count = c;
    sfx.voiceNow('count_' + c);
    if (c <= 8) game.message = `${t(kd.who === 'mike' ? 'who_mike' : 'who_you')} ${t(kd.up ? 'is_up' : 'is_down')}… ${c}` + (kd.who === 'player' && !kd.up && !kd.final ? t('hit_button', { n: getUp.left }) : '');
  }
  if (kd.who === 'mike' && !kd.up && kd.count >= kd.getUpAt) { kd.up = true; mike.getUp(); }
  if (kd.who === 'player' && !kd.up && !kd.final && getUp.update(dt, Object.values(player.gloves))) {
    kd.up = true; game.message = t('up_after8');
  }
  if (!kd.up && kd.count >= 10) return endMatch(kd.who === 'mike' ? 'player' : 'mike', 'KO');
  // conteggio obbligatorio fino a 8, poi si riprende: l'energia risale (animazione sulla barra)
  if (kd.up && kd.count >= 8 && (kd.who === 'player' || mike.isUp())) {
    game.fill = { who: kd.who, from: f.dmg, to: 100 - kd.refill, t: 0 };
    game.kd = null; getUp.stop(); mike.holdDist = null;
    game.message = 'BOX!'; sfx.bell(1);
    mike.enabled = true;
  }
}

function endMatch(winner, how) {
  game.phase = 'end'; game.phaseT = 0; game.kd = null; game.foul = null;
  mike.enabled = false; getUp.stop(); mike.holdDist = null; countdown.hide(); nextMenu.close();
  sfx.bell(3);
  if (arenaEnv) arenaEnv.cheer(2);
  if (mode === 'arena') { sfx.cheer('boato', 1); setTimeout(() => sfx.cheer('applauso', 0.9), 2500); }
  game.result = { winner, how };
  const pts = `${game.player.points}-${game.mike.points}`;
  game.message = winner === 'player' ? t('win_you', { how: t('how_' + how) }) : winner === 'mike' ? t('win_mike', { how: t('how_' + how) }) : t('draw', { pts });
  if (how === 'PTS' && winner !== 'pari') game.message += ` (${pts})`;
  if (winner === 'mike' && !mike.down) mike.celebrate();          // Mike esulta a braccia alzate
  // festa per il vincitore: coriandoli e fuochi d'artificio nei suoi colori
  const c = new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld);
  party.start(c, winner === 'player' ? [0xd81e2c, 0xff7a7a, 0xffffff] : winner === 'mike' ? [0x1d4fc4, 0x7aa8ff, 0xffffff] : [0xd81e2c, 0x1d4fc4]);
  sfx.cheer('applauso', 1); sfx.cheer('boato', 0.9);
  // verdetto dell'annunciatore, come nei veri incontri
  const kind = how === 'KO' ? 'ko' : how === 'TKO' ? 'tko' : how === 'DQ' ? 'dq' : 'points';
  const who = winner === 'player' ? 'you' : 'mike';
  setTimeout(() => sfx.announce(winner === 'pari' ? ['scorecards', 'draw']
    : kind === 'points' ? ['scorecards', 'winner_intro', `win_${who}_points`]
    : kind === 'dq' ? [`win_${who}_dq`] : ['winner_intro', `win_${who}_${kind}`]), kind === 'dq' ? 2600 : 1800);
}

// colpo basso: niente punti, Mike si accascia; penalita' (alla terza squalifica); si riprende col gong
function lowBlow() {
  const p = ++game.player.penalties;
  game.mike.dmg = Math.min(99, game.mike.dmg + 10);
  sfx.punchHit(0.8);
  mike.lowBlowed();
  if (arenaEnv) arenaEnv.cheer(0.4);
  if (mode === 'arena') sfx.cheer('ooh', 1);
  if (p >= 3) {
    game.message = t('dq3');
    sfx.voiceNow('dq');
    game.foul = { t: 0, dq: true };
  } else {
    game.message = t('lowblow', { p });
    sfx.voiceNow('lowblow_' + p);
    game.foul = { t: 0 };
  }
}
function updateFoul(dt) {
  const f = game.foul;
  f.t += dt;
  // Mike prima si riprende e si rimette in guardia; con la terza penalita' poi gli danno la vittoria (ed esulta)
  if (f.t > 5.5 && !f.recovered) { f.recovered = true; mike.resetPose(); }
  if (f.dq) { if (f.t > 7) endMatch('mike', 'DQ'); return; }
  if (f.t > 7) { game.foul = null; sfx.announce('box'); sfx.bell(1); mike.enabled = true; game.message = 'BOX!'; }
}

function handleEvents() {
  for (const e of mike.events) {
    (window.evlog ||= []).push(`${game.time.toFixed(1)} ${e.type} ${e.zone || e.name || ''} ${e.why || ''}`);
    switch (e.type) {
      case 'lowBlow':
        lowBlow();
        break;
      case 'playerHit': {
        const pts = e.zone === 'head' ? 2 : 1;
        game.player.points += pts; game.player.hits++;
        game.message = t(e.zone === 'head' ? 'you_head' : 'you_body');
        sfx.punchHit(Math.min(1.3, 0.6 + e.speed / 6));
        if (mode === 'arena') { if (e.speed > 4 || e.zone === 'head') sfx.cheer('boato', Math.min(1, 0.4 + e.speed / 10)); }
        else sfx.crowd(0.08);
        if (arenaEnv) arenaEnv.cheer(Math.min(1.5, e.speed / 4) * (e.zone === 'head' ? 1 : 0.6));
        bruises.hit(e.zone, e.lx, e.ly, Math.min(1.6, e.speed / 4));
        {
          // qualche gocciolina rossa: solo nei colpi al viso molto forti o quando Mike e' gia' molto segnato
          const hurt = bruises.worst();
          const strong = e.speed > 5.5 && Math.random() < 0.45;
          const worn = hurt > 0.6 && Math.random() < 0.2 + (hurt - 0.6) * 1.5;
          const blood = e.zone === 'head' && (strong || worn) ? 1 + Math.floor(Math.random() * (1 + hurt * 3)) : 0;
          sweat.burst(e.point, e.dir, Math.min(1.5, e.speed / 4), blood);
        }
        player.pulse(e.side, 1.0, 70);
        landed('mike', e.zone, Math.min(1.5, e.speed / 5));
        break;
      }
      case 'mikeBlocked':
        game.mike.blocks++; game.message = t('mike_blocks');
        if (mode === 'arena' && Math.random() < 0.35) sfx.cheer('ooh', 0.6);
        sfx.punchBlock(); player.pulse(e.side, 0.4, 40);
        break;
      case 'mikeDodged':
        game.mike.dodges++; game.message = t('mike_dodges');
        if (mode === 'arena' && Math.random() < 0.5) sfx.cheer('ooh', 0.7);
        break;
      case 'mikeThrows':
        sfx.whoosh();
        break;
      case 'mikeHit':
        game.mike.points += e.zone === 'body' ? 1 : 2; game.mike.hits++;
        game.message = t(e.zone === 'body' ? 'mike_body' : 'mike_head');
        sfx.punchHit(e.zone === 'body' ? 0.9 : 1.2); flash.hit(e.zone === 'body' ? 0.5 : 1);
        if (arenaEnv) arenaEnv.cheer(0.6);
        if (mode === 'arena' && e.zone === 'head') sfx.cheer('boato', 0.6);
        player.pulse('left', 0.7, 90); player.pulse('right', 0.7, 90);
        landed('player', e.zone, POWER[level] * (0.85 + Math.random() * 0.3));
        break;
      case 'playerBlocked':
        game.player.blocks++; game.message = t('blocked');
        sfx.punchBlock(); player.pulse(e.side, 0.6, 50);
        break;
      case 'playerDodged':
        game.player.dodges++; game.message = t('dodged');
        break;
    }
  }
  mike.events.length = 0;
}

function startRest() {
  game.phase = 'rest'; game.phaseT = 0; countdown.hide();
  // Mike all'angolo sullo sgabello; la ragazza del ring entra quando lui e' seduto
  const h = ringSize / 2 - 0.42;
  const corner = new THREE.Vector3(h, 0, -h).applyMatrix4(arena.matrixWorld);
  const center = new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld);
  stool.position.copy(corner); stool.visible = true;
  mike.goTo(corner.clone().addScaledVector(center.clone().sub(corner).setY(0).normalize(), 0.12), center);
  if (mode === 'arena') sfx.cheer('applauso', 0.8);
  for (const k of ['player', 'mike']) game[k].dmg = Math.max(0, game[k].dmg - 25);   // all'angolo ci si riprende
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  nextMenu.open(player.head, e.y, 0.5, 0.35);
}

function updateGame(dt) {
  game.phaseT += dt;
  mike.fatigue = game.mike.dmg / 100;
  mike.lowBlowAllowed = game.mike.dmg <= 50;           // il colpo basso "riesce" solo se Mike ha almeno meta' energia
  if (game.fill) {                                      // energia che risale dopo un atterramento
    game.fill.t += dt;
    const k = Math.min(1, game.fill.t / 1.8);
    game[game.fill.who].dmg = game.fill.from + (game.fill.to - game.fill.from) * (1 - Math.pow(1 - k, 3));
    if (k >= 1) game.fill = null;
  }
  if (game.phase === 'menu') {
    game.message = t('choose_menu');
    flash.setBase(0);
  } else if (game.paused) {
    game.message = t('pause');
  } else if (game.phase === 'presentazione') {
    game.message = t('presenting');
    if (game.phaseT >= game.presT) { game.phase = 'ready'; game.phaseT = 0; }
  } else if (game.phase === 'ready') {
    const left = Math.ceil(READY_S - game.phaseT);
    game.message = left > 0 ? t('starts_in', { r: game.round, n: rounds, s: left }) : 'BOX!';
    if (left > 0 && renderer.xr.isPresenting && floorSource !== 'stanza' && floorSource !== 'mano') game.message = t('low_ring', { s: left });
    else if (left > 3 && game.round === 1) game.message = t('pause_hint', { s: left });
    if (!game.announced && game.phaseT >= READY_S - 1.6) {      // "Round one... Fight!" che finisce sul gong
      game.announced = true;
      sfx.announce(rounds > 1 && game.round === rounds ? 'final_round' : `round_${game.round}`);
    }
    if (game.phaseT >= READY_S) { game.phase = 'fight'; game.phaseT = 0; sfx.bell(1); mike.enabled = true; game.message = 'BOX!'; countdown.hide(); }
  } else if (game.phase === 'fight') {
    if (game.kd) updateKnockdown(dt);
    else if (game.foul) updateFoul(dt);
    else {
      game.time = Math.max(0, game.time - dt);
      // ultimi 10 secondi: solo l'annuncio a voce "Ten seconds!" (niente numeri a schermo)
      if (game.time <= 10 && game.lastCount !== 10 && roundSecs > 15) { game.lastCount = 10; sfx.announce('ten_seconds'); }
      if (!game.fill) for (const k of ['player', 'mike']) game[k].dmg = Math.max(0, game[k].dmg - dt * 0.5);   // si riprende un po'
      flash.setBase(game.player.dmg > 55 ? (game.player.dmg - 55) / 45 * 0.35 : 0);         // vista che si annebbia
      if (game.time === 0) {
        sfx.bell(3); mike.enabled = false; countdown.hide();
        if (game.round >= rounds) {
          const a = game.player.points, b = game.mike.points;
          endMatch(a > b ? 'player' : a < b ? 'mike' : 'pari', 'PTS');
        } else startRest();
      }
    }
  } else if (game.phase === 'rest') {
    const left = Math.ceil(REST_S - game.phaseT);
    game.message = t('rest', { r: game.round + 1, s: left });
    nextMenu.setTitle(t('next_title', { n: game.round + 1, s: left }));
    flash.setBase(0);
    if (!game.girlStarted && mike.atGoal) { game.girlStarted = true; girl.start(arena, ringSize, game.round + 1, player.head); }
    if (nextMenu.update(dt, Object.values(player.gloves)) === 'next') { sfx.punchBlock(); game.phaseT = REST_S; }
    if (game.phaseT >= REST_S) { game.round++; startRound(); }
  } else if (game.phase === 'end') {
    flash.setBase(0);
    if (game.phaseT > 6 && !pause.group.visible) openPause(true);
  }
  const xr = renderer.xr.getSession && renderer.xr.getSession();
  const feats = xr && xr.enabledFeatures ? (xr.enabledFeatures.includes('plane-detection') ? 'piani sì' : 'piani no') : '';
  board.draw({ round: game.round, rounds: rounds, level: t('l_' + level), time: game.phase === 'rest' ? Math.max(0, REST_S - game.phaseT) : game.time,
    running: game.phase === 'fight', player: game.player, mike: game.mike, message: game.message,
    diag: t('diag', { m: ringSize.toFixed(1), f: floorSource, e: (player.head.y + 0.06 - floorY).toFixed(1) }) + (feats ? ' · ' + feats : '') });
}

// ---------------------------------------------------------------- ciclo
let lastT = performance.now();
let placed = false, xrFrames = 0, roomCaptureAsked = false, headMax = 0, greetPending = false;
const floorTouch = { left: 0, right: 0 };
renderer.setAnimationLoop((t, frame) => { if (window.pauseLoop) return; const now = performance.now(); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; tick(dt, frame); });
// ---------------------------------------------------------------- presentazione dei pugili (speaker)
// "Signore e signori, benvenuti… nell'angolo rosso, lo sfidante! … nell'angolo blu… MIKE!", poi il primo round.
function startPresentation() {
  const parts = ['intro_1', 'intro_red', 'intro_blue'];
  const d = parts.map(n => sfx.voiceDur(n));
  if (d.some(x => !x)) return;                         // voci non ancora caricate: si parte e basta
  sfx.announce(parts);
  game.phase = 'presentazione'; game.phaseT = 0; game.presT = d.reduce((a, b) => a + b + 0.2, 0) + 0.8;
  game.message = t('presenting');
  // il pubblico applaude ai nomi
  const crowd = (ms, k, g) => setTimeout(() => { if (game.phase !== 'presentazione') return;
    if (mode === 'arena') { sfx.cheer(k, g); if (arenaEnv) arenaEnv.cheer(1.2); } }, ms);
  crowd((d[0] + d[1] + 0.3) * 1000, 'applauso', 0.8);
  crowd((d[0] + d[1] + d[2] + 0.5) * 1000, 'boato', 0.9);
}
// cambio lingua dal menu: scritte e voci
onLang(l => {
  sfx.setVoiceLang(l);
  mainMenu.relabel(); nextMenu.relabel(); pause.relabel();
  mainMenu.select(menuChoices());
  if (game.phase === 'menu') game.message = t('menu');
  showMode();
});

// ---------------------------------------------------------------- presentazione dell'incontro (arena e spiaggia)
// La vista parte in alto sopra il ring e scende facendo un giro completo attorno, fino al tuo angolo; solo allora
// compaiono i guantoni. Nel visore non si puo' muovere la testa: si sposta il riferimento della scena
// (spazio di riferimento con uno scostamento), cosi' sei tu a "volare" e il ring resta sempre davanti a te.
const INTRO_S = 11;
let intro = null, baseRef = null;
const _iR = new THREE.Matrix4(), _iT = new THREE.Matrix4(), _iRot = new THREE.Matrix4();
function startIntro() {
  if (mode === 'stanza' || !mike) return;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const H0 = new THREE.Vector3(); cam.getWorldPosition(H0);
  if (renderer.xr.isPresenting) baseRef = renderer.xr.getReferenceSpace();
  intro = { t: 0, H0, C: new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld), p0: camera.position.clone(), q0: camera.quaternion.clone() };
  game.phase = 'intro'; game.phaseT = 0; game.message = '';
  if (mode === 'arena') { sfx.cheer('applauso', 0.9); if (arenaEnv) arenaEnv.cheer(1); }
}
function introRig(t) {
  const k = Math.min(1, t / INTRO_S), e = k * k * k * (k * (k * 6 - 15) + 10);       // parte e arriva dolcemente
  const d = new THREE.Vector3(intro.H0.x - intro.C.x, 0, intro.H0.z - intro.C.z);
  const rEnd = d.length(); d.normalize();
  const rad = rEnd + (7 - rEnd) * Math.pow(1 - e, 1.2);       // da 7 m di distanza al tuo angolo
  const hgt = 8 * Math.pow(1 - e, 1.5);                       // da 8 m d'altezza ai tuoi occhi
  const phi = -2 * Math.PI * (1 - e);                         // un giro completo attorno al ring
  _iRot.makeRotationY(phi);
  const target = d.multiplyScalar(rad).applyMatrix4(_iRot).add(intro.C); target.y = intro.H0.y + hgt;
  return _iR.makeTranslation(target.x, target.y, target.z).multiply(_iRot)
    .multiply(_iT.makeTranslation(-intro.H0.x, -intro.H0.y, -intro.H0.z));
}
function updateIntro(dt) {
  intro.t += dt;
  const done = intro.t >= INTRO_S;
  const R = done ? _iR.identity() : introRig(intro.t);
  if (renderer.xr.isPresenting && baseRef) {
    if (done) renderer.xr.setReferenceSpace(baseRef);
    else {
      const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      R.clone().invert().decompose(p, q, s);
      renderer.xr.setReferenceSpace(baseRef.getOffsetReferenceSpace(
        new XRRigidTransform({ x: p.x, y: p.y, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w })));
    }
  } else if (sim) {
    if (done) { camera.position.copy(intro.p0); camera.quaternion.copy(intro.q0); }
    else {
      camera.position.copy(intro.H0).applyMatrix4(R);
      camera.quaternion.copy(intro.q0).premultiply(new THREE.Quaternion().setFromRotationMatrix(R));
    }
    camera.updateMatrixWorld(true);
  }
  // durante il volo: niente guantoni e Mike guarda il punto dove sei davvero
  for (const g of Object.values(player.gloves)) g.mesh.visible = false;
  player.head.copy(intro.H0);
  if (done) { intro = null; game.phase = 'ready'; game.phaseT = 2; }
}

// per le prove senza visore: window.stepGame(n, dt) fa avanzare il gioco di n fotogrammi
window.stepGame = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) tick(dt, null); };

function tick(dt, frame) {
  if (renderer.xr.isPresenting && !placed && xrFrames > 15) {   // aspetta che il tracciamento sia stabile
    const cam = renderer.xr.getCamera();
    const p = new THREE.Vector3(); cam.getWorldPosition(p);
    {
      const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
      placeArena(p, e.y); placed = true;
      if (game.phase === 'menu' && !mainMenu.group.visible) showMainMenu();
    }
  }
  if (renderer.xr.isPresenting && frame && xrFrames % 30 === 0) {
    const y = detectFloor(frame);
    const userSet = floorSource === 'mano' || floorSource === 'manuale';
    if (y !== null && !userSet && (floorSource !== 'stanza' || Math.abs(y - floorY) > 0.02)) setFloor(y, 'stanza');
    // la pianta della stanza e' arrivata dopo: rimetti il ring della misura giusta
    // (solo nella stanza: nell'arena il ring non si adatta e rimetterlo a posto riportava Mike al punto di partenza)
    if (placed && !fitted && mode === 'stanza' && room.floorPoly && lastPlace && game.phase === 'menu') placeArena(lastPlace.head, lastPlace.yaw);
    // nessuna scansione dopo 3 s e altezza della testa poco credibile: stima (occhi ~ 1,55 m da terra)
    if (y === null && floorSource === 'visore' && xrFrames > 200) {
      const h = player.head.y + 0.06 - floorY;
      if (h < 1.2 || h > 2.1) setFloor(player.head.y + 0.06 - 1.55, 'stima');
      else floorSource = 'visore ok';
    }
    // come Lumino: se la stanza non e' mai stata scansionata, il Quest propone la scansione (una volta)
    const session = renderer.xr.getSession();
    if (y === null && !roomCaptureAsked && xrFrames > 300 && !userSet && session && session.initiateRoomCapture) {
      roomCaptureAsked = true;
      session.initiateRoomCapture().catch(() => {});
    }
  }
  // Nell'arena (realta' virtuale) il Quest non da' la scansione della stanza: il pavimento si stima
  // dall'altezza dei tuoi occhi, misurata quando giochi nella stanza (pavimento vero) e salvata.
  if (false && renderer.xr.isPresenting && mode === 'arena' && xrFrames > 40 && xrFrames < 600 &&
      (floorSource === 'visore' || floorSource === 'stima')) {
    let eye = 1.55;
    try { eye = parseFloat(localStorage.getItem('hb-eye')) || 1.55; } catch (e) {}
    const y = headMax - eye;
    if (floorSource === 'visore' || Math.abs(y - floorY) > 0.02) setFloor(y, 'stima');
  }
  if (renderer.xr.isPresenting && mode === 'stanza' && xrFrames % 300 === 0 && xrFrames > 600 &&
      (floorSource === 'stanza' || floorSource === 'mano')) {
    const eye = headMax - floorY;
    if (eye > 1.2 && eye < 2.1) try { localStorage.setItem('hb-eye', eye.toFixed(3)); } catch (e) {}
  }
  // regolazione a mano con la levetta di un controller (su/giu')
  if (renderer.xr.isPresenting) for (const src of player.sources) {
    const ax = src.gamepad && src.gamepad.axes;
    if (ax && ax.length >= 4 && Math.abs(ax[3]) > 0.5) setFloor(floorY - ax[3] * dt * 0.3, 'manuale');
  }
  if (renderer.xr.isPresenting) xrFrames++;
  if (orbit) orbit.update();
  player.update(dt);
  if (intro) updateIntro(dt);
  else {
    if (renderer.xr.isPresenting || sim) calibrateByHand(dt);
    if (mike) updatePause(dt);
  }
  if (mike) {
    mike.update(dt, player);
    handleEvents();
    updateGame(dt);
  }
  flash.update(dt);
  countdown.update(dt);
  sweat.update(dt);
  girl.update(dt, player.head);
  if (stool.visible && mike && mike.atGoal) {         // lo sgabello esattamente sotto Mike seduto
    stool.position.copy(mike.root.position).addScaledVector(mike.forward(), -0.07);
  }
  if (party.update(dt)) sfx.firework();
  if (arenaEnv && arenaEnv.group.visible) { arenaEnv.update(dt); sfx.crowdLevel(arenaEnv.excite); }
  if (beachEnv && beachEnv.group.visible) beachEnv.update(dt, h => sfx.wave(0.2 + 0.25 * h));
  player.endFrame();
  renderer.render(scene, camera);
}

// Pausa: tutte e due le braccia alzate sopra la testa per 1,2 s (in combattimento non succede),
// oppure A/B/X/Y sui controller. Nel menu i pulsanti si premono tenendoci sopra un guantone.
function openPause(end = false) {
  game.paused = !end; mike.enabled = false;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  pause.open(player.head, e.y, end);
  if (!end) sfx.bell(1);
}
function closePause() {
  game.paused = false; pause.close();
  mike.enabled = game.phase === 'fight' && !game.kd;
}
const menuChoices = () => ['m:' + mode, 'l:' + level, 'r:' + rounds, 'd:' + roundSecs, threeKO ? 'k:si' : 'k:no', 'g:' + lang];
function showMainMenu() {
  if (greetPending) { greetPending = false; setTimeout(() => sfx.voiceNow('title'), 500); }   // "Home Boxing!" all'ingresso
  newMatch(); game.phase = 'menu'; game.message = t('menu');
  setPeople(false);
  mike.enabled = false; pause.close();
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  mainMenu.select(menuChoices());
  mainMenu.open(player.head, e.y);
}
function updateMainMenu(dt, gloves) {
  const id = mainMenu.update(dt, gloves);
  if (!id) return;
  sfx.punchBlock();
  if (id.startsWith('m:')) { mode = id.slice(2); try { localStorage.setItem('hb-mode', mode); } catch (e) {} applyMode(); placed = false; xrFrames = 16; }
  else if (id.startsWith('l:')) { level = id.slice(2); try { localStorage.setItem('hb-level', level); } catch (e) {} mike.setLevel(level); }
  else if (id.startsWith('d:')) { roundSecs = parseInt(id.slice(2)); try { localStorage.setItem('hb-roundsec', roundSecs); } catch (e) {} }
  else if (id.startsWith('k:')) { threeKO = id === 'k:si'; try { localStorage.setItem('hb-3ko', threeKO ? 'si' : 'no'); } catch (e) {} }
  else if (id.startsWith('r:')) { rounds = parseInt(id.slice(2)); try { localStorage.setItem('hb-rounds', rounds); } catch (e) {} }
  else if (id.startsWith('g:')) setLang(id.slice(2));
  else if (id === 'start') { mainMenu.close(); newMatch(); startPresentation(); return; }   // (startIntro: volo iniziale, sospeso: fa girare la testa)
  else if (id === 'quit') { mainMenu.close(); const s = renderer.xr.getSession(); if (s) s.end(); return; }
  mainMenu.select(menuChoices());
}

function updatePause(dt) {
  const g = Object.values(player.gloves);
  const up = g.every(x => x.mesh.visible && x.center.y > player.head.y + 0.11);   // mani alla fronte (piu' su il visore non le vede)
  armsUpT = up ? armsUpT + dt : 0;
  let pressed = false;
  for (const s of player.sources) {
    const b = s.gamepad && s.gamepad.buttons;
    if (b && ((b[4] && b[4].pressed) || (b[5] && b[5].pressed))) pressed = true;
  }
  const click = pressed && !prevButtons; prevButtons = pressed;
  if (game.phase === 'menu') { updateMainMenu(dt, g); return; }
  if (!game.paused && !pause.group.visible && game.phase !== 'end' && (armsUpT > 1.5 || click)) { armsUpT = -2; openPause(); return; }
  if (game.paused && click) { closePause(); return; }
  const id = pause.update(dt, g);
  if (id === 'resume') closePause();
  else if (id === 'restart') { closePause(); newMatch(); }
  else if (id === 'exit') { closePause(); showMainMenu(); }
}

// Pavimento "a mano": accovacciati e appoggia una mano (o il controller) a terra per 2 secondi.
// Funziona anche senza scansione della stanza.
function calibrateByHand(dt) {
  const head = player.head;
  headMax = Math.max(headMax * (1 - dt * 0.02), head.y);       // altezza da in piedi (si adatta piano)
  const crouched = head.y < headMax - 0.3;
  for (const g of Object.values(player.gloves)) {
    const low = g.mesh.visible && head.y - g.center.y > 0.45 && g.speed < 0.25;
    floorTouch[g.side] = crouched && low ? floorTouch[g.side] + dt : 0;
    if (floorTouch[g.side] > 2) {
      floorTouch[g.side] = -3;                                    // pausa prima di poterlo rifare
      setFloor(g.center.y - 0.035, 'mano');
      sfx.bell(1);
      game.message = t('floor_fixed');
    }
  }
}

// ---------------------------------------------------------------- avvio
loadMikeGLTF('assets/mike.glb?v=20261003120215', f => status(t('loading', { p: Math.min(100, Math.round(f * 100)) }))).then(gltf => {
  mike = new Mike(gltf, scene, level);
  girl.load().catch(e => console.warn('ragazza del ring', e));
  bruises = new Bruises(mike.model);
  mike.bounds = keepInRing;
  placeArena(new THREE.Vector3(0, 1.65, 0), 0);
  window.mike = mike; window.game = game; window.player = player; window.room = room; window.placeArena = placeArena; window.camera = camera; window.renderOnly = () => renderer.render(scene, camera); window.bruisesFx = () => bruises; window.getUpFx = getUp; window.gameApi = { newMatch, showMainMenu, startIntro, startPresentation, girl: () => girl, arena: () => arena, ringSize: () => ringSize }; window.sweatFx = sweat;   // per le prove
  status('');
  $('enter').disabled = !navigator.xr;
  if (navigator.xr) navigator.xr.isSessionSupported('immersive-ar').then(ok => {
    if (!ok) { $('enter').disabled = true; status(t('no_xr')); }
  });
  if (new URLSearchParams(location.search).has('sim')) startSim();
}).catch(e => { console.error(e); status(t('load_err', { e: e.message })); });

$('enter').onclick = async () => {
  sfx.initAudio();
  try {
    // nella stanza: realta' mista; nell'arena: realta' virtuale (il palazzetto copre tutto)
    // sempre realta' mista: l'arena e' un ambiente che copre la stanza, cosi' si cambia dal menu senza uscire
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking', 'plane-detection', 'mesh-detection', 'anchors'],
    });
    applyMode();
    renderer.xr.setFoveation(1);
    await renderer.xr.setSession(session);
    if (bruises) bruises.reset();
    placed = false; xrFrames = 0; floorSource = 'visore'; floorY = 0; roomCaptureAsked = false; headMax = 0; greetPending = true;
    newMatch(); game.phase = 'menu'; setPeople(false);       // si entra nello stage con il menu, la partita non parte
    $('overlay').hidden = true;
    session.addEventListener('end', () => {
      intro = null; baseRef = null;
      $('overlay').hidden = false; placed = false;
      if (game.paused) closePause();
      mainMenu.close();
      if (mike) mike.enabled = false;
      newMatch(); game.phase = 'menu';              // fuori dal gioco l'incontro non va avanti da solo
      sfx.stopAll();                                // niente suoni dopo l'uscita
    });
  } catch (e) { status(t('xr_err', { e: e.message })); }
};

// pagina nascosta (visore tolto, browser chiuso): silenzio
document.addEventListener('visibilitychange', () => { if (document.hidden) sfx.stopAll(); });

function startSim() {
  sfx.initAudio();
  $('overlay').hidden = true; $('simhelp').hidden = false;
  sim = new SimInput(camera, renderer.domElement);
  addEventListener('keydown', e => { if (e.code === 'KeyM') showMainMenu(); });   // menu nell'anteprima
  sim.base.set(0, 1.65, 0);
  player.sim = sim; window.sim = sim;
  applyMode();
  resetRound();
  addEventListener('keydown', e => {
    if (e.code !== 'KeyV') return;
    sim.spectator = !sim.spectator;
    if (sim.spectator) {
      orbit = new OrbitControls(camera, renderer.domElement);
      camera.position.set(2.4, 1.9, 0.6); orbit.target.set(0, 1.2, -0.6);
    } else { orbit.dispose(); orbit = null; }
  });
}
$('sim').onclick = startSim;

// livello scelto nella pagina iniziale (ricordato per la volta dopo)
function showLevel() {
  for (const b of document.querySelectorAll('#levels button')) b.classList.toggle('on', b.dataset.level === level);
}
for (const b of document.querySelectorAll('#levels button')) b.onclick = () => {
  level = b.dataset.level;
  try { localStorage.setItem('hb-level', level); } catch (e) {}
  if (mike) mike.setLevel(level);
  showLevel();
};
showLevel();

function showMode() {
  for (const b of document.querySelectorAll('#modes button')) b.classList.toggle('on', b.dataset.mode === mode);
  $('enter').textContent = t('play');
  for (const el of document.querySelectorAll('.lang-it')) el.hidden = lang !== 'it';
  for (const el of document.querySelectorAll('.lang-en')) el.hidden = lang !== 'en';
  $('sim').textContent = lang === 'it' ? 'Anteprima su PC' : 'PC preview';
  document.documentElement.lang = lang;
}
for (const b of document.querySelectorAll('#modes button')) b.onclick = () => {
  mode = b.dataset.mode;
  try { localStorage.setItem('hb-mode', mode); } catch (e) {}
  showMode();
  if (sim) applyMode();
};
showMode();
