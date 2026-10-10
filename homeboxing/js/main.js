// Home Boxing - avvio, realta' mista, round e punteggi.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRing, RING_SIZE, updateRopes } from './ring.js?v=20261010190023';
import { Mike, LEVELS, loadMikeGLTF, StyleLearner } from './mike.js?v=20261010190023';
import { Sweat, Bruises, Celebration } from './fx.js?v=20261010190023';
import { Player, SimInput } from './player.js?v=20261010190023';
import { Scoreboard, HitFlash, PauseMenu, MenuPanel, CountdownHUD, RayPointers, setRays } from './hud.js?v=20261010190023';
import { Room } from './room.js?v=20261010190023';
import { Arena } from './arena.js?v=20261010190023';
import { Beach } from './beach.js?v=20261010190023';
import { Rooftop } from './rooftop.js?v=20261010190023';
import { Desert } from './desert.js?v=20261010190023';
import { Snow } from './snow.js?v=20261010190023';
import { Volcano } from './volcano.js?v=20261010190023';
import { Sea, WATER } from './sea.js?v=20261010190023';
import { Moon } from './moon.js?v=20261010190023';
import { Stadium } from './stadium.js?v=20261010190023';
import { FighterCard, ROSTER, COUNTRY_CODES, countryName, drawFlagAny, flagFontReady } from './roster.js?v=20261010190023';
import { Gym } from './gym.js?v=20261010190023';
import { BagTraining } from './training.js?v=20261010190023';
import { RopeTraining } from './rope.js?v=20261010190023';
import { SpeedBagTraining } from './speedbag.js?v=20261010190023';
import { SlipLineTraining } from './slipline.js?v=20261010190023';
import { RingSkirt } from './ring_skirt.js?v=20261010190023';
import { panoPending } from './pano_depth.js?v=20261010190023';
import { DoubleEndTraining } from './doubleend.js?v=20261010190023';
import { Sparring } from './sparring.js?v=20261010190023';
import { RingGirl } from './ringgirl.js?v=20261010190023';
import { REST_S, knockdownChance, say, sayCount, GetUpChallenge } from './match.js?v=20261010190023';
import * as sfx from './sfx.js?v=20261010190023';
import { t, lang, setLang, onLang, setOpponentName } from './i18n.js?v=20261010190023';
import { FIGHTERS, FIGHTER_IDS } from './fighters.js?v=20261010190023';
import { Tournament, BracketView } from './tournament.js?v=20261010190023';
import { CpuMatch } from './cpu_match.js?v=20261010190023';
import { TowerView } from './tower.js?v=20261010190023';
sfx.setVoiceLang(lang);

const $ = id => document.getElementById(id);
const status = t => { $('status').textContent = t; statusK = null; };
let statusK = null, statusV = null;            // ultimo messaggio tradotto: si riscrive al cambio lingua
const statusT = (k, v) => { status(t(k, v)); statusK = k; statusV = v; };

// ---------------------------------------------------------------- scena
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;           // (lo scorpione del deserto tagliato a filo della sabbia)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
// Nel visore (realta' mista) dove il gioco non disegna niente si vede la stanza vera. Tranne nello stage "la tua
// stanza" (e mai durante il caricamento) a three.js si dice che l'immagine e' opaca: allora la pulisce di nero pieno
// (o del colore di sfondo dello stage) e la stanza non puo' comparire in nessuna direzione.
renderer.setClearColor(0x000000, 1);
{
  const orig = renderer.xr.getEnvironmentBlendMode.bind(renderer.xr);
  renderer.xr.getEnvironmentBlendMode = () => { const m = orig(); return m === 'alpha-blend' && !roomVisible() ? 'opaque' : m; };
}
function roomVisible() {
  try { return mode === 'stanza' && !(loader && loader.dark.material.opacity > 0.05); } catch (e) { return false; }
}
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
let snowEnv = null, volcEnv = null, seaEnv = null, moonEnv = null, desertEnv = null, stadiumEnv = null, stadiumNEnv = null, ringSkirt = null, ringDrop = 0;   // (seaEnv: sotto il mare; la sfera dipende dalla misura del ring)               // stage neve (creato in applyMode; qui perche' setRing lo usa subito)
// Tabellone: parte al suo posto (dietro all'avversario, in alto a destra). Si sposta SOLO se esce dal campo
// visivo: allora gira piano attorno a te (stessa distanza e altezza) finche' rientra un po' dentro la vista, e li' resta.
const _bw = new THREE.Vector3();
function followBoard(dt) {
  if (!board.mesh.visible) return;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const yaw = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
  const h = player.head, p = board.mesh.getWorldPosition(_bw);
  const dx = p.x - h.x, dz = p.z - h.z, D = Math.hypot(dx, dz);
  if (D < 0.3) return;
  const ang = Math.atan2(-dx, -dz);                           // direzione del tabellone (come lo yaw della vista)
  const off = Math.atan2(Math.sin(ang - yaw), Math.cos(ang - yaw));
  if (!boardMoving && Math.abs(off) > 0.75) {                 // non si vede piu' (bordo della vista del visore)
    boardMoving = true; boardTarget = Math.sign(off) * 0.4;   // rientra dal lato da cui era uscito, non al centro
  }
  let vWant = 0;
  if (boardMoving) {
    const rem = Math.atan2(Math.sin(yaw + boardTarget - ang), Math.cos(yaw + boardTarget - ang));
    vWant = Math.sign(rem) * Math.min(0.35, Math.max(0.06, Math.abs(rem) * 0.6));     // lento: al massimo 0,35 rad/s
    if (Math.abs(rem) < 0.03) { boardMoving = false; vWant = 0; boardVel = 0; }
  }
  boardVel += Math.max(-0.5 * dt, Math.min(0.5 * dt, vWant - boardVel));             // parte e si ferma dolcemente
  if (Math.abs(boardVel) < 1e-4) return;
  const a = ang + boardVel * dt;
  _bw.set(h.x - Math.sin(a) * D, p.y, h.z - Math.cos(a) * D);
  board.mesh.position.copy(arena.worldToLocal(_bw.clone()));
  board.mesh.lookAt(h.x, p.y - 0.25, h.z);
}
// Fuori dal ring (in tutto, non solo con la testa oltre le corde): pausa finche' non rientri
function outOfRing() {
  const active = ['ready', 'fight', 'presentazione', 'rest', 'sparring'].includes(game.phase);
  if (!active || !ringSize || (game.foul && game.foul.dq)) return;      // (squalificato: si va al verdetto)
  const p = arena.worldToLocal(player.head.clone()), half = ringSize / 2;
  const out = Math.abs(p.x) > half + 0.15 || Math.abs(p.z) > half + 0.15;
  const back = Math.abs(p.x) < half - 0.1 && Math.abs(p.z) < half - 0.1;
  if (out && !game.paused && !pause.group.visible) {
    // durante il round uscire dal ring costa un'ammonizione (come i colpi bassi: alla terza penalita' squalifica)
    if (game.phase === 'fight' && !game.kd && !game.foul) {
      const n = ++game.player.penalties;
      if (n >= 3) { game.message = t('dq_out'); sfx.voiceNow('dq'); mike.enabled = false; game.foul = { t: 0, dq: true, recovered: true }; return; }
      sfx.voiceNow('out_' + n); game.outWarn = n;
    } else game.outWarn = 0;
    openPause(); game.outRing = true;
  }
  else if (back && game.paused && game.outRing) closePause();
}
let boardMoving = false, boardVel = 0, boardTarget = 0;
function setRing(size, pz) {
  playerZ = pz;
  if (Math.abs(size - ringSize) > 1e-3) {
    const wasVisible = ringObj ? ringObj.visible : true;       // (la scansione della stanza puo' arrivare a meta' allenamento: il ring nuovo restava acceso, in palestra)
    if (ringObj) arena.remove(ringObj);
    ringObj = buildRing(size); arena.add(ringObj); ringSize = size; ringObj.visible = wasVisible;
    if (snowEnv) snowEnv.setRing(size);
    if (stadiumEnv) stadiumEnv.setRing(size); if (stadiumNEnv) stadiumNEnv.setRing(size);
    if (moonEnv) moonEnv.setRing(size); if (volcEnv) volcEnv.setRing(size); if (desertEnv) desertEnv.setRing(size);
    if (ringSkirt) ringSkirt.set(size, ringDrop);
    if (seaEnv) { arena.remove(seaEnv.group); seaEnv = null; if (mode === 'mare') applyMode(); }   // sfera rifatta per il nuovo ring
  }
  arena.updateMatrixWorld(true);
  resetBoard();
}
// tabellone al suo posto: dietro all'avversario, in alto a destra (all'inizio di ogni incontro)
function resetBoard() {
  arena.updateMatrixWorld(true);
  board.mesh.position.set(Math.min(1.15, ringSize / 2 - 0.2), 1.95, -ringSize / 2 - 0.1);
  board.mesh.lookAt(new THREE.Vector3(0, 1.6, playerZ).applyMatrix4(arena.matrix));
  boardMoving = false; boardVel = 0;
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
const stoolB = stool.clone(); scene.add(stoolB);      // (incontri tra pugili CPU: lo sgabello dell'altro angolo)
let level = 'normale';
try { level = localStorage.getItem('hb-level') || 'normale'; } catch (e) {}
if (!LEVELS[level]) level = 'normale';
// dove si gioca: 'stanza' = realta' mista nella tua stanza, 'arena' = palazzetto virtuale con il pubblico,
// 'spiaggia' = ring sulla sabbia in riva al mare
const SEA_READY = true;                            // stage 'mare' (si puo' nascondere dal menu mettendo false)
const MODES = ['stanza', 'arena', 'spiaggia', 'grattacielo', 'notte', 'deserto', 'neve', 'vulcano', 'mare', 'luna', 'stadio', 'stadionotte', 'palestra'];
let mode = 'stanza';
try { mode = localStorage.getItem('hb-mode') || 'stanza'; } catch (e) {}
// stage scelto nel menu: uno dei tre oppure 'random' (estratto a ogni incontro tra gli stage virtuali)
let stageChoice = mode;
try { stageChoice = localStorage.getItem('hb-stage') || mode; } catch (e) {}
let gameMode = 'arcade';
try { gameMode = localStorage.getItem('hb-gamemode') || 'arcade'; } catch (e) {}
let tour = null;                      // torneo in corso

if (!MODES.includes(mode)) mode = 'stanza';
let arenaEnv = null, beachEnv = null, roofEnv = null, gymEnv = null, nightEnv = null;   // nightEnv: il grattacielo di notte
// libera la memoria della grafica di un oggetto (geometrie, materiali, immagini). Nel visore la memoria e' poca:
// in un torneo con stage "a caso" e tanti incontri guardati, pugili e stage gia' usati restavano tutti caricati
// (un pugile ~95 MB, un panorama fino a 170 MB) e a un certo punto il gioco si piantava a meta' caricamento
function freeGPU(root) {
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    for (const m of [].concat(o.material || [])) {
      for (const v of Object.values(m)) if (v && v.isTexture) v.dispose();
      if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) u.value.dispose();
      m.dispose();
    }
  });
}
// gli stage con le foto grandi: si tiene solo quello in uso (tornandoci si ricarica, al buio)
function freeStage(e) {
  e.onSkyLoad = null; if (e.dispose) e.dispose();
  if (e.group.parent) e.group.parent.remove(e.group);
  if (e.envMap) { if (scene.environment === e.envMap) scene.environment = roomEnv; e.envMap.dispose(); }
  if (e.skyTex) e.skyTex.dispose();
  freeGPU(e.group);
}
function freeOtherStages() {
  if (mode !== 'deserto' && desertEnv) { freeStage(desertEnv); desertEnv = null; }
  if (mode !== 'grattacielo' && roofEnv) { freeStage(roofEnv); roofEnv = null; }
  if (mode !== 'notte' && nightEnv) { freeStage(nightEnv); nightEnv = null; }
  if (mode !== 'neve' && snowEnv) { freeStage(snowEnv); snowEnv = null; }
  if (mode !== 'vulcano' && volcEnv) { freeStage(volcEnv); volcEnv = null; }
  if (mode !== 'mare' && seaEnv) { freeStage(seaEnv); seaEnv = null; }
  if (mode !== 'luna' && moonEnv) { freeStage(moonEnv); moonEnv = null; }
  if (mode !== 'stadio' && stadiumEnv) { freeStage(stadiumEnv); stadiumEnv = null; }
  if (mode !== 'stadionotte' && stadiumNEnv) { freeStage(stadiumNEnv); stadiumNEnv = null; }
  if (mode !== 'spiaggia' && beachEnv) { freeStage(beachEnv); beachEnv = null; }
}
function applyMode() {
  freeOtherStages();
  const inArena = mode === 'arena', onBeach = mode === 'spiaggia', onRoof = mode === 'grattacielo';
  if (onRoof && !roofEnv) { roofEnv = new Rooftop(RING_SIZE); arena.add(roofEnv.group); }
  if (roofEnv) roofEnv.group.visible = onRoof;
  const onNight = mode === 'notte';
  if (onNight && !nightEnv) { nightEnv = new Rooftop(RING_SIZE, true); arena.add(nightEnv.group); }
  if (nightEnv) nightEnv.group.visible = onNight;
  const onDesert = mode === 'deserto', inGym = mode === 'palestra';
  if (inGym && !gymEnv) { gymEnv = new Gym(); arena.add(gymEnv.group); }
  if (gymEnv) gymEnv.group.visible = inGym;
  if (inGym) applyGymTraining();
  if (onDesert && !desertEnv) { desertEnv = new Desert(); arena.add(desertEnv.group); if (ringSize) desertEnv.setRing(ringSize); }
  if (desertEnv) desertEnv.group.visible = onDesert;
  const onSnow = mode === 'neve';
  if (onSnow && !snowEnv) { snowEnv = new Snow(ringSize || RING_SIZE); arena.add(snowEnv.group); }
  if (snowEnv) snowEnv.group.visible = onSnow;
  const onVolc = mode === 'vulcano';
  if (onVolc && !volcEnv) { volcEnv = new Volcano(); arena.add(volcEnv.group); if (ringSize) volcEnv.setRing(ringSize); }
  if (volcEnv) volcEnv.group.visible = onVolc;
  const onSea = mode === 'mare';
  if (onSea && !seaEnv) { seaEnv = new Sea(ringSize || RING_SIZE); arena.add(seaEnv.group); }
  if (seaEnv) seaEnv.group.visible = onSea;
  const onMoon = mode === 'luna';
  if (onMoon && !moonEnv) { moonEnv = new Moon(); arena.add(moonEnv.group); if (ringSize) moonEnv.setRing(ringSize); }
  if (moonEnv) moonEnv.group.visible = onMoon;
  const onStadium = mode === 'stadio', onStadiumN = mode === 'stadionotte';
  if (onStadiumN && !stadiumNEnv) { stadiumNEnv = new Stadium({ night: true }); arena.add(stadiumNEnv.group); if (ringSize) stadiumNEnv.setRing(ringSize); }
  if (stadiumNEnv) stadiumNEnv.group.visible = onStadiumN;
  if (onStadium && !stadiumEnv) { stadiumEnv = new Stadium(); arena.add(stadiumEnv.group); if (ringSize) stadiumEnv.setRing(ringSize); }
  if (stadiumEnv) stadiumEnv.group.visible = onStadium;
  if (inArena && !arenaEnv) { arenaEnv = new Arena(RING_SIZE); arena.add(arenaEnv.group); }
  if (onBeach && !beachEnv) { beachEnv = new Beach(); arena.add(beachEnv.group); }
  if (arenaEnv) arenaEnv.group.visible = inArena;
  if (beachEnv) beachEnv.group.visible = onBeach;
  room.group.visible = mode === 'stanza';
  // ring rialzato: dove c'e' il terreno vero tutto intorno, il terreno sta 90 cm sotto il tappeto e la piattaforma
  // ha il suo telo (come un ring vero); il resto degli stage resta com'e'
  const drop = { luna: 0.9, vulcano: 0.9, neve: 0.9, deserto: 0.9 }[mode] || 0;
  for (const e of [moonEnv, volcEnv, snowEnv, desertEnv]) if (e) e.group.position.y = e.group.visible ? -drop : 0;
  if (!ringSkirt) { ringSkirt = new RingSkirt(); arena.add(ringSkirt.group); }
  ringSkirt.set(ringSize || RING_SIZE, drop); ringDrop = drop;
  if (inGym) {                                         // palestra la sera: luci calde e soffuse dall'alto, sala in penombra
    scene.environment = roomEnv; scene.environmentRotation.set(0, 0, 0);
    hemi.color.set(0xffe2c0); hemi.groundColor.set(0x2a2018); hemi.intensity = 0.35;
    scene.environmentIntensity = 0.3; key.intensity = 1.8; fill.intensity = 0.35;
    key.color.set(0xffd9a8); key.position.set(0.8, 4.0, 0.9);
    scene.background = new THREE.Color(0x0b0a0c); scene.fog = null;
    camera.far = 60;
  } else if (onMoon) {                                       // Luna: sole basso e forte, niente aria (ombre nette), cielo nero
    hemi.color.set(0x2a3040); hemi.groundColor.set(0x3a3834); hemi.intensity = 0.3;
    scene.environmentIntensity = 0.35; key.intensity = 3.2; fill.intensity = 0.12;
    key.color.set(0xfffaf2); key.position.copy(moonEnv.sunDir).multiplyScalar(6);
    scene.background = new THREE.Color(0x000000); scene.fog = null;
    const useSky = () => {
      if (!moonEnv.envMap) moonEnv.envMap = pmrem.fromEquirectangular(moonEnv.skyTex).texture;
      if (mode === 'luna') { scene.environment = moonEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (moonEnv.skyLoaded) useSky(); else moonEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onSea) {                                        // sotto il mare: luce dall'alto filtrata dall'acqua, tutto azzurro
    hemi.color.set(0x9fe6f5); hemi.groundColor.set(0x2a6c68); hemi.intensity = 0.85;
    scene.environmentIntensity = 0.6; key.intensity = 1.9; fill.intensity = 0.35;
    key.color.set(0xd6f6ff); key.position.copy(seaEnv.sunDir).multiplyScalar(6);
    scene.background = WATER.clone(); scene.fog = new THREE.FogExp2(WATER.getHex(), 0.04);
    const useSky = () => {
      if (!seaEnv.envMap) seaEnv.envMap = pmrem.fromEquirectangular(seaEnv.skyTex).texture;
      if (mode === 'mare') { scene.environment = seaEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (seaEnv.skyLoaded) useSky(); else seaEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onVolc) {                                       // vulcano: luce bassa e rossa della lava, cielo di cenere
    hemi.color.set(0x5a3326); hemi.groundColor.set(0xff6a2a); hemi.intensity = 0.7;   // (dal basso arriva la luce della lava)
    scene.environmentIntensity = 0.45; key.intensity = 1.6; fill.intensity = 0.25;
    key.color.set(0xff8a4a); key.position.copy(volcEnv.keyDir).multiplyScalar(6);
    scene.background = new THREE.Color(0x1a0f0c); scene.fog = null;
    const useSky = () => {
      if (!volcEnv.envMap) volcEnv.envMap = pmrem.fromEquirectangular(volcEnv.skyTex).texture;
      if (mode === 'vulcano') { scene.environment = volcEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (volcEnv.skyLoaded) useSky(); else volcEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onSnow) {                                       // cielo coperto d'inverno: luce morbida e fredda da tutte le parti
    hemi.color.set(0xdfe8f5); hemi.groundColor.set(0xc8d0dc); hemi.intensity = 1.0;
    scene.environmentIntensity = 0.8; key.intensity = 1.2; fill.intensity = 0.5;
    key.color.set(0xf2f4ff); key.position.copy(snowEnv.sunDir).multiplyScalar(6);
    scene.background = new THREE.Color(0xc5ccd6); scene.fog = null;
    const useSky = () => {
      if (!snowEnv.envMap) snowEnv.envMap = pmrem.fromEquirectangular(snowEnv.skyTex).texture;
      if (mode === 'neve') { scene.environment = snowEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (snowEnv.skyLoaded) useSky(); else snowEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onDesert) {                                      // deserto vero a mezzogiorno: sole alto e forte, cielo blu intenso
    hemi.color.set(0x8fb0f0); hemi.groundColor.set(0xb8865a); hemi.intensity = 0.8;
    scene.environmentIntensity = 0.75; key.intensity = 3.0; fill.intensity = 0.45;
    key.color.set(0xfff4e2); key.position.copy(desertEnv.sunDir).multiplyScalar(6);
    scene.background = new THREE.Color(0x3a63b0); scene.fog = null;
    const useSky = () => {
      if (!desertEnv.envMap) desertEnv.envMap = pmrem.fromEquirectangular(desertEnv.skyTex).texture;
      if (mode === 'deserto') { scene.environment = desertEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (desertEnv.skyLoaded) useSky(); else desertEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onStadiumN) {                                   // stadio di notte: i fari illuminano il campo, cielo stellato
    hemi.color.set(0x141c3a); hemi.groundColor.set(0x0a0f08); hemi.intensity = 0.28;
    scene.environmentIntensity = 0.35; key.intensity = 0.35; fill.intensity = 0.12;     // la luce vera la fanno i quattro fari (stadium.js, _nightLights)
    key.color.set(0xfff0d8); key.position.set(0.25, 1, 0.2).normalize().multiplyScalar(6);
    scene.background = new THREE.Color(0x02030a); scene.fog = null;
    const useSky = () => {
      if (!stadiumNEnv.envMap) stadiumNEnv.envMap = pmrem.fromEquirectangular(stadiumNEnv.skyTex).texture;
      if (mode === 'stadionotte') { scene.environment = stadiumNEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (stadiumNEnv.skyLoaded) useSky(); else stadiumNEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onStadium) {                                    // stadio di giorno: sole alto, cielo azzurro con nuvole
    hemi.color.set(0x9cc2f2); hemi.groundColor.set(0x3f6a2c); hemi.intensity = 0.85;
    scene.environmentIntensity = 0.8; key.intensity = 3.0; fill.intensity = 0.5;
    key.color.set(0xfff3e0); key.position.copy(stadiumEnv.sunDir).multiplyScalar(6);
    scene.background = new THREE.Color(0x3a6fc0); scene.fog = null;
    const useSky = () => {
      if (!stadiumEnv.envMap) stadiumEnv.envMap = pmrem.fromEquirectangular(stadiumEnv.skyTex).texture;
      if (mode === 'stadio') { scene.environment = stadiumEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (stadiumEnv.skyLoaded) useSky(); else stadiumEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onNight) {                                // grattacielo di notte: i fari sul ring, la citta' accesa intorno
    hemi.color.set(0x34405a); hemi.groundColor.set(0x3a2a20); hemi.intensity = 0.45;
    scene.environmentIntensity = 0.6; key.intensity = 2.4; fill.intensity = 0.3;
    key.color.set(0xfff0dc); key.position.set(1.4, 4.5, 1.6);          // i fari dall'alto (non la luna: troppo debole)
    scene.background = new THREE.Color(0x05070c); scene.fog = null;
    const useSky = () => {
      if (!nightEnv.envMap) nightEnv.envMap = pmrem.fromEquirectangular(nightEnv.skyTex).texture;
      if (mode === 'notte') { scene.environment = nightEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (nightEnv.skyLoaded) useSky(); else nightEnv.onSkyLoad = useSky;
    camera.far = 1200;
  } else if (onRoof) {                                 // in cima al grattacielo, bella giornata: sole alto, cielo blu
    hemi.color.set(0xbcd4f2); hemi.groundColor.set(0x7d7a74); hemi.intensity = 0.85;
    scene.environmentIntensity = 0.75; key.intensity = 2.7; fill.intensity = 0.45;
    key.color.set(0xfff4e4); key.position.copy(roofEnv.sunDir).multiplyScalar(6);
    scene.background = new THREE.Color(0x8fb0dc); scene.fog = null;
    const useSky = () => {
      if (!roofEnv.envMap) roofEnv.envMap = pmrem.fromEquirectangular(roofEnv.skyTex).texture;
      if (mode === 'grattacielo') { scene.environment = roofEnv.envMap; scene.environmentRotation.set(0, -Math.PI / 2, 0); }
    };
    if (roofEnv.skyLoaded) useSky(); else roofEnv.onSkyLoad = useSky;
    camera.far = 1200;                                 // la citta' tutto intorno e l'elicottero lontano
  } else if (onBeach) {                                // pieno giorno: sole alto dietro di te, cielo azzurro
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
  sfx.windAmbient(onRoof || onNight || onDesert || onStadium || onStadiumN);
  sfx.snowAmbient(onSnow);
  sfx.lavaAmbient(onVolc);
  sfx.underAmbient(onSea);
  sfx.spaceAmbient(onMoon);
}
const READY_S = 6;                    // secondi prima del gong

const player = new Player(renderer, scene, camera);
const flash = new HitFlash(camera);
const pause = new PauseMenu();
const rayPointers = new RayPointers(scene);
const _rayM = new THREE.Matrix4();
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
const modeImg = n => { const t = new THREE.TextureLoader().load(`assets/${n}.webp?v=20261010190023`); t.colorSpace = THREE.SRGBColorSpace; return t; };
const stageImg = n => { const t = new THREE.TextureLoader().load(`assets/stage_${n}.webp?v=20261010190023`); t.colorSpace = THREE.SRGBColorSpace; return t; };
const fighterImg = id => { const tx = new THREE.TextureLoader().load(FIGHTERS[id].thumb); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
// anteprima di "Arena random": gli stage virtuali con un grande punto di domanda
function randomPreview() {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 320, 200); gr.addColorStop(0, '#1b2a4a'); gr.addColorStop(0.5, '#2a7fb5'); gr.addColorStop(1, '#d9b46a');
  g.fillStyle = gr; g.fillRect(0, 0, 320, 200);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 320, 200);
  g.fillStyle = '#ffd34d'; g.font = '900 150px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 12; g.fillText('?', 160, 108);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
// pulsanti per scegliere quanti: tabellone (torneo da 32 o 64) e torre (8, 16 o 32 piani)
function sizeArt(kind, n) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200; const g = c.getContext('2d');
  const gold = g.createLinearGradient(0, 0, 0, 200); gold.addColorStop(0, '#fff3b0'); gold.addColorStop(0.5, '#ffc928'); gold.addColorStop(1, '#b37a0e');
  if (kind === 'tour') {
    const bg = g.createRadialGradient(160, 100, 10, 160, 100, 200); bg.addColorStop(0, '#3b2a6e'); bg.addColorStop(1, '#0c0a1c'); g.fillStyle = bg; g.fillRect(0, 0, 320, 200);
    // mezzo tabellone per lato: tante righe quanti i partecipanti
    const leaves = n / 4; g.strokeStyle = 'rgba(255,201,40,0.6)'; g.lineWidth = n > 32 ? 1 : 1.5;
    for (const side of [-1, 1]) {
      let ys = Array.from({ length: leaves }, (_, i) => 14 + i * 172 / (leaves - 1)), x = side < 0 ? 8 : 312;
      while (ys.length > 1) {
        const nx = x - side * 16, ny = [];
        for (let i = 0; i < ys.length; i += 2) { g.beginPath(); g.moveTo(x, ys[i]); g.lineTo(nx, ys[i]); g.lineTo(nx, ys[i + 1]); g.lineTo(x, ys[i + 1]); g.stroke(); ny.push((ys[i] + ys[i + 1]) / 2); }
        ys = ny; x = nx;
      }
    }
  } else {
    const bg = g.createLinearGradient(0, 0, 0, 200); bg.addColorStop(0, '#1a0f3a'); bg.addColorStop(1, '#a04a3a'); g.fillStyle = bg; g.fillRect(0, 0, 320, 200);
    // la torre: piu' piani, piu' alta e stretta
    const floors = n, h = 40 + (n / TOWER_MAX) * 150, w = n > 16 ? 46 : n > 8 ? 56 : 66, x0 = 72 - w / 2, y0 = 196 - h;
    g.fillStyle = '#120d1e'; g.fillRect(x0, y0, w, h);
    for (let x = x0; x < x0 + w; x += 12) g.fillRect(x, y0 - 6, 7, 7);
    const fh = h / floors;
    for (let f = 0; f < floors; f++) { g.fillStyle = f === floors - 1 ? '#ffd34d' : (f % 3 ? '#ffb347' : '#3a2f4a'); g.fillRect(x0 + 6, y0 + 3 + f * fh, w - 12, Math.max(1.5, fh * 0.5)); }
    g.fillStyle = gold; g.beginPath(); g.moveTo(72 - 14, y0 - 10); g.lineTo(72 - 16, y0 - 26); g.lineTo(72 - 6, y0 - 18); g.lineTo(72, y0 - 30); g.lineTo(72 + 6, y0 - 18); g.lineTo(72 + 16, y0 - 26); g.lineTo(72 + 14, y0 - 10); g.closePath(); g.fill();
  }
  g.fillStyle = gold; g.font = '900 92px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 10;
  g.fillText(String(n), kind === 'tour' ? 160 : 205, 92);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
let tourSize = 32, towerSize = 16;
const TOWER_MAX = FIGHTER_IDS.length;                   // la torre piu' alta: tutti i lottatori (40)
try { tourSize = +localStorage.getItem('hb-toursize') || 32; towerSize = +localStorage.getItem('hb-towersize') || 16; } catch (e) {}
if (towerSize > 16) towerSize = TOWER_MAX;              // (la torre lunga ha sempre tutti i lottatori: 32/36 salvati -> 40)
// riquadri delle modalita' (menu iniziale): foto dal gioco per arcade e allenamento, disegni per torneo e torre
function modeArt(kind) {
  const c = document.createElement('canvas'); c.width = 480; c.height = 300; const g = c.getContext('2d');
  const gold = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.45, '#ffc928'); gr.addColorStop(1, '#a8700c'); return gr; };
  const sparkle = (x, y, r) => { g.fillStyle = 'rgba(255,245,200,0.95)'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.25 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };
  if (kind === 'tour') {
    const bg = g.createRadialGradient(240, 150, 20, 240, 150, 300); bg.addColorStop(0, '#3b2a6e'); bg.addColorStop(1, '#0c0a1c'); g.fillStyle = bg; g.fillRect(0, 0, 480, 300);
    // tabellone: dai 16 per lato si arriva al centro
    g.strokeStyle = 'rgba(255,201,40,0.55)'; g.lineWidth = 2;
    for (const side of [-1, 1]) {
      let ys = Array.from({ length: 8 }, (_, i) => 30 + i * 34), x = side < 0 ? 18 : 462;
      for (let lev = 0; lev < 3; lev++) {
        const nx = x + side * -48, ny = [];
        for (let i = 0; i < ys.length; i += 2) {
          const m = (ys[i] + ys[i + 1]) / 2;
          g.beginPath(); g.moveTo(x, ys[i]); g.lineTo(nx - side * -0, ys[i]); g.lineTo(nx, ys[i + 1]); g.lineTo(x, ys[i + 1]); g.moveTo(nx, m); g.stroke();
          ny.push(m);
        }
        ys = ny; x = nx;
      }
      g.beginPath(); g.moveTo(x, ys[0]); g.lineTo(240 + side * -0 + side * 60, ys[0]); g.stroke();
    }
    // la coppa
    const glow = g.createRadialGradient(240, 125, 10, 240, 125, 120); glow.addColorStop(0, 'rgba(255,210,80,0.55)'); glow.addColorStop(1, 'rgba(255,210,80,0)');
    g.fillStyle = glow; g.fillRect(100, 0, 280, 300);
    g.fillStyle = gold(180, 40, 300, 220);
    g.beginPath(); g.moveTo(190, 55); g.lineTo(290, 55); g.bezierCurveTo(292, 130, 270, 165, 240, 172); g.bezierCurveTo(210, 165, 188, 130, 190, 55); g.fill();   // coppa
    g.lineWidth = 9; g.strokeStyle = gold(150, 60, 330, 140);
    g.beginPath(); g.arc(190, 95, 30, Math.PI * 0.45, Math.PI * 1.55); g.stroke(); g.beginPath(); g.arc(290, 95, 30, -Math.PI * 0.55, Math.PI * 0.55); g.stroke();   // manici
    g.fillStyle = gold(225, 170, 255, 230); g.fillRect(232, 170, 16, 32);
    g.fillRect(208, 200, 64, 14); g.fillRect(196, 212, 88, 24);                                   // base
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(214, 95, 7, 30, 0.15, 0, Math.PI * 2); g.fill();   // riflesso
    g.fillStyle = '#7a520a'; g.beginPath();                                                 // stella incisa sulla coppa
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 9 : 22; g.lineTo(240 + Math.cos(a) * rr, 108 + Math.sin(a) * rr); }
    g.closePath(); g.fill();
    sparkle(305, 50, 12); sparkle(172, 150, 8); sparkle(300, 175, 6);
  } else if (kind === 'options') {                  // ingranaggio dorato su blu
    const bg = g.createRadialGradient(240, 150, 10, 240, 150, 280); bg.addColorStop(0, '#2c5a8c'); bg.addColorStop(1, '#0b1626'); g.fillStyle = bg; g.fillRect(0, 0, 480, 300);
    const gear = (cx, cy, R, teeth, col) => {
      g.fillStyle = col; g.beginPath();
      for (let k = 0; k < teeth * 2; k++) { const a = k / (teeth * 2) * Math.PI * 2, r = k % 2 ? R * 0.8 : R; g.lineTo(cx + Math.cos(a - 0.12) * r, cy + Math.sin(a - 0.12) * r); g.lineTo(cx + Math.cos(a + 0.12) * r, cy + Math.sin(a + 0.12) * r); }
      g.closePath(); g.fill(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx, cy, R * 0.36, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'source-over';
    };
    gear(205, 150, 92, 10, gold(120, 60, 300, 240)); gear(330, 92, 48, 8, gold(290, 50, 380, 140));
    sparkle(360, 200, 9); sparkle(120, 60, 7);
  } else {
    const bg = g.createLinearGradient(0, 0, 0, 300); bg.addColorStop(0, '#1a0f3a'); bg.addColorStop(0.6, '#6b2a5a'); bg.addColorStop(1, '#e0753a'); g.fillStyle = bg; g.fillRect(0, 0, 480, 300);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`; g.fillRect(Math.random() * 480, Math.random() * 140, 2, 2); }
    // la torre: corpo scuro, merli, finestre accese piano per piano
    const x0 = 180, x1 = 300;
    g.fillStyle = '#120d1e'; g.fillRect(x0, 92, x1 - x0, 210);
    for (let x = x0; x < x1; x += 24) g.fillRect(x, 78, 14, 16);
    for (let f = 0; f < 8; f++) for (let k = 0; k < 3; k++) {
      const lit = (f + k) % 3 !== 0;
      g.fillStyle = lit ? (f === 7 ? '#ffd34d' : '#ffb347') : '#2a2238';
      g.fillRect(x0 + 18 + k * 32, 106 + f * 24, 18, 12);
    }
    // la corona sopra, che brilla
    const glow = g.createRadialGradient(240, 48, 5, 240, 48, 90); glow.addColorStop(0, 'rgba(255,215,90,0.75)'); glow.addColorStop(1, 'rgba(255,215,90,0)');
    g.fillStyle = glow; g.fillRect(140, 0, 200, 120);
    g.fillStyle = gold(200, 20, 280, 70);
    g.beginPath(); g.moveTo(206, 66); g.lineTo(200, 26); g.lineTo(222, 46); g.lineTo(240, 16); g.lineTo(258, 46); g.lineTo(280, 26); g.lineTo(274, 66); g.closePath(); g.fill();
    for (const [x, y, c] of [[200, 24, '#e5484d'], [240, 14, '#3fb0ff'], [280, 24, '#e5484d']]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); }
    // il tuo gettone che sale, con la scia
    for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(255,201,40,${0.08 + k * 0.06})`; g.beginPath(); g.arc(330, 250 - k * 14, 4 + k, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffc928'; g.beginPath(); g.arc(330, 160, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1406'; g.font = '900 13px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('TU', 330, 165);
    sparkle(160, 40, 9); sparkle(320, 30, 7);
  }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
function flagImg(l) {
  const c = document.createElement('canvas'); c.width = 480; c.height = 300; const g = c.getContext('2d');
  if (l === 'it') { g.fillStyle = '#009246'; g.fillRect(0, 0, 160, 300); g.fillStyle = '#ffffff'; g.fillRect(160, 0, 160, 300); g.fillStyle = '#ce2b37'; g.fillRect(320, 0, 160, 300); }
  else {
    g.fillStyle = '#012169'; g.fillRect(0, 0, 480, 300);
    g.strokeStyle = '#ffffff'; g.lineWidth = 60; g.beginPath(); g.moveTo(0, 0); g.lineTo(480, 300); g.moveTo(480, 0); g.lineTo(0, 300); g.stroke();
    g.strokeStyle = '#C8102E'; g.lineWidth = 20; g.beginPath(); g.moveTo(0, 0); g.lineTo(480, 300); g.moveTo(480, 0); g.lineTo(0, 300); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(190, 0, 100, 300); g.fillRect(0, 100, 480, 100);
    g.fillStyle = '#C8102E'; g.fillRect(210, 0, 60, 300); g.fillRect(0, 120, 480, 60);
  }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
const withText = rows => rows.map(r => ({ ...r, buttons: r.buttons.map(b => ({ ...b, text: b.tk ? t(b.tk) + (b.disabled ? ' (' + t('soon') + ')' : '') : b.text })) }));
const stageRow = y => ({ label: t('stage'), tk: 'stage', y, h: 0.2, carousel: true, buttons: [
  { id: 's:stanza', tk: 'm_stanza', w: 0.22, img: roomPreview() }, { id: 's:arena', tk: 'm_arena', w: 0.22, img: stageImg('arena') },
  { id: 's:spiaggia', tk: 'm_spiaggia', w: 0.22, img: stageImg('spiaggia') },
  { id: 's:grattacielo', tk: 'm_grattacielo', w: 0.22, img: stageImg('grattacielo') }, { id: 's:notte', tk: 'm_notte', w: 0.22, img: stageImg('notte') },
  { id: 's:deserto', tk: 'm_deserto', w: 0.22, img: stageImg('deserto') }, { id: 's:neve', tk: 'm_neve', w: 0.22, img: stageImg('neve') }, { id: 's:vulcano', tk: 'm_vulcano', w: 0.22, img: stageImg('vulcano') }, ...(SEA_READY ? [{ id: 's:mare', tk: 'm_mare', w: 0.22, img: stageImg('mare') }] : []), { id: 's:luna', tk: 'm_luna', w: 0.22, img: stageImg('luna') }, { id: 's:stadio', tk: 'm_stadio', w: 0.22, img: stageImg('stadio') }, { id: 's:stadionotte', tk: 'm_stadionotte', w: 0.22, img: stageImg('stadionotte') }, { id: 's:palestra', tk: 'm_palestra', w: 0.22, img: stageImg('palestra') }, { id: 's:random', tk: 'm_random', w: 0.22, img: randomPreview() }] });
// la tua bandiera (si sceglie nelle opzioni, tra tutti i paesi): sul tabellone sta nella barra del tuo nome. 'none' = rettangolo nero con "?"
let playerFlag = 'none';
try { playerFlag = localStorage.getItem('hb-pflag') || 'none'; } catch (e) {}
const playerFlagCode = () => playerFlag === 'none' ? '?' : playerFlag === 'off' ? null : 'x:' + playerFlag;      // 'off' = nessuna bandiera sul tabellone
const pflagTex = {};
function pflagImg(code) {
  if (pflagTex[code]) return pflagTex[code];
  const c = document.createElement('canvas'); c.width = 144; c.height = 96;
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.userData.code = code;
  tx.userData.paint = () => { const g = c.getContext('2d'); g.clearRect(0, 0, 144, 96);
    if (code === 'off') { g.fillStyle = '#2a2f3a'; g.fillRect(0, 0, 144, 96); g.strokeStyle = '#9aa3b6'; g.lineWidth = 6; g.strokeRect(24, 20, 96, 56); g.strokeStyle = '#ff5a5a'; g.lineWidth = 9; g.beginPath(); g.moveTo(26, 78); g.lineTo(118, 18); g.stroke(); }   // bandiera barrata
    else drawFlagAny(g, code === 'none' ? '?' : 'x:' + code, 144, 96); tx.needsUpdate = true; };
  tx.userData.paint(); return (pflagTex[code] = tx);
}
flagFontReady.then(() => { for (const k in pflagTex) pflagTex[k].userData.paint(); board.last = ''; });
// elenco dei paesi in ordine alfabetico nella lingua corrente ("nessuna" sempre per prima)
const pflagOrder = () => ['none', 'off', ...COUNTRY_CODES.slice().sort((a, b) => countryName(a, lang).localeCompare(countryName(b, lang), lang))];
const pflagName = code => code === 'none' ? t('pf_none') : code === 'off' ? t('pf_off') : countryName(code, lang);
function pflagRelabel(menu) {
  const car = menu.carousels.find(c => c.row.pflagRow); if (!car) return;
  pflagOrder().forEach((code, i) => {
    const b = car.items[i]; b.id = 'pf:' + code; b.text = pflagName(code); b.im.material.map = pflagImg(code);
    menu._paint(b.label, b.text, b.on ? '#111111' : '#ffffff');
  });
}
const optionRows = (y0, step = 0.16) => { const L = { cx: -0.42, colW: 0.76 }, R = { cx: 0.42, colW: 0.76 }; return [   // due colonne affiancate
  { ...L, label: t('level'), tk: 'level', y: y0, buttons: [{ id: 'l:facile', tk: 'l_facile', w: 0.17 }, { id: 'l:normale', tk: 'l_normale', w: 0.17 },
    { id: 'l:difficile', tk: 'l_difficile', w: 0.17 }, { id: 'l:impossibile', tk: 'l_impossibile', w: 0.17 }] },
  { ...L, label: t('rounds'), tk: 'rounds', y: y0 - step, buttons: [{ id: 'r:1', text: '1', w: 0.15 }, { id: 'r:3', text: '3', w: 0.15 }, { id: 'r:6', text: '6', w: 0.15 }, { id: 'r:12', text: '12', w: 0.15 }] },
  { ...L, label: t('duration'), tk: 'duration', y: y0 - 2 * step, buttons: [{ id: 'd:60', text: '1 min', w: 0.2 }, { id: 'd:120', text: '2 min', w: 0.2 }, { id: 'd:180', text: '3 min', w: 0.2 }] },
  { ...R, label: t('rule3'), tk: 'rule3', y: y0, buttons: [{ id: 'k:si', tk: 'yes', w: 0.2 }, { id: 'k:no', tk: 'no', w: 0.2 }] },
  { ...R, label: t('rule1'), tk: 'rule1', y: y0 - step, buttons: [{ id: 'ko:si', tk: 'yes', w: 0.2 }, { id: 'ko:no', tk: 'no', w: 0.2 }] },
]; };
// menu iniziale: modalita' di gioco, regole generali, lingua
const rootMenu = new MenuPanel({ title: 'HOME BOXING', titleH: 0.1, width: 1.1, height: 1.16,   // (largo: margini ai lati come sopra e sotto)
  draggable: true, rows: withText([
  // modalita': riquadri con l'immagine, come gli stage
  { label: t('mode_title'), tk: 'mode_title', y: 0.22, h: 0.22, buttons: [{ id: 'gm:arcade', tk: 'm_arcade', w: 0.22, color: 0x1f6f8a, img: modeImg('mode_arcade') },
    { id: 'gm:training', tk: 'm_training', w: 0.22, color: 0x8a3a1a, img: modeImg('mode_train') }, { id: 'gm:tour', tk: 'm_tour', w: 0.22, color: 0x7a5a10, img: modeArt('tour') },
    { id: 'gm:surv', tk: 'm_surv', w: 0.22, color: 0x6a1f8a, img: modeArt('surv') }] },
  // opzioni: difficolta', round, regole, puntatore (un menu a parte)
  { y: -0.03, h: 0.19, buttons: [{ id: 'gm:roster', tk: 'roster', w: 0.3, color: 0x7a2a2a, img: fighterImg('lars') }, { id: 'gm:options', tk: 'options', w: 0.3, color: 0x1f4f7a, img: modeArt('options') }] },
  { label: t('language'), tk: 'language', y: -0.31, h: 0.13, buttons: [{ id: 'g:it', text: 'Italiano', w: 0.2, img: flagImg('it') }, { id: 'g:en', text: 'English', w: 0.2, img: flagImg('en') }] },
  // esci: in basso al centro, da tenere premuto 2 secondi (si riempie piano: niente uscite per sbaglio)
  { y: -0.49, h: 0.065, buttons: [{ id: 'quit', tk: 'quit', w: 0.26, color: 0x8a1a20, hold: 2.0 }] },
]) });
// versione del gioco, piccola sotto il menu principale (per capire se il visore ha preso l'ultimo aggiornamento)
{
  const VER = new URL(import.meta.url).searchParams.get('v') || 'locale';
  const c = document.createElement('canvas'); c.width = 512; c.height = 48; const g = c.getContext('2d');
  g.fillStyle = 'rgba(200,205,215,0.75)'; g.font = '600 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('versione ' + VER.replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$3/$2 $4:$5'), 256, 24);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.028), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  m.position.set(0, -1.16 / 2 - 0.03, 0.01); m.renderOrder = 1105; rootMenu.group.add(m);
}
// Arcade: stage, avversario e opzioni dell'incontro
// avversari a righe da 4 (pulsanti grandi); con piu' pugili le righe si aggiungono da sole e il pannello si allunga
const OPP_BTNS = [{ id: 'f:random', tk: 'f_random', w: 0.22, img: randomPreview() },
  ...FIGHTER_IDS.map(id => ({ id: 'f:' + id, text: FIGHTERS[id].name, w: 0.22, img: fighterImg(id) }))];
const OPP_ROWS = 1, OPP_EXTRA = 0;      // (una riga a scorrimento)
const arcadeMenu = new MenuPanel({ title: t('arcade'), titleTk: 'arcade', titleH: 0.1, width: 1.0, height: 1.08 + OPP_EXTRA, draggable: true, rows: withText([
  stageRow(0.24 + OPP_EXTRA / 2),
  { label: t('opponent'), tk: 'opponent', y: -0.08, h: 0.2, carousel: true, buttons: OPP_BTNS },
  { y: -0.39 - OPP_EXTRA / 2, h: 0.11, buttons: [{ id: 'back', tk: 'back', w: 0.26, color: 0x3a4254 }, { id: 'watch_arc', tk: 'watch', w: 0.26, color: 0x6a4a9a }, { id: 'start', tk: 'start', w: 0.4, color: 0x1f8a4c }] },
]) });
// Guarda un incontro (dall'arcade): scegli tu tutti e due i pugili (o "a caso"), lo stage e' quello dell'arcade
let watchA = 'random', watchB = 'random';
const watchBtns = pre => [{ id: pre + 'random', tk: 'f_random', w: 0.22, img: randomPreview() },
  ...FIGHTER_IDS.map(id => ({ id: pre + id, text: FIGHTERS[id].name, w: 0.22, img: fighterImg(id) }))];
const watchMenu = new MenuPanel({ title: t('watch_title'), titleTk: 'watch_title', titleH: 0.1, width: 1.0, height: 1.08, draggable: true, rows: withText([
  { label: t('w_red'), tk: 'w_red', y: 0.22, h: 0.2, carousel: true, buttons: watchBtns('wa:') },
  { label: t('w_blue'), tk: 'w_blue', y: -0.1, h: 0.2, carousel: true, buttons: watchBtns('wb:') },
  { y: -0.39, h: 0.11, buttons: [{ id: 'back_arc', tk: 'back', w: 0.3, color: 0x3a4254 }, { id: 'watch_go', tk: 'watch', w: 0.45, color: 0x6a4a9a }] },
]) });
// Torneo: come l'arcade ma gli avversari li assegna il tabellone
const tourMenu = new MenuPanel({ title: t('tour'), titleTk: 'tour', titleH: 0.1, width: 1.0, height: 1.02, draggable: true, rows: withText([
  stageRow(0.22),
  { label: t('tr_n'), tk: 'tr_n', y: -0.1, h: 0.17, buttons: [32, 64].map(n => ({ id: 'tz:' + n, text: t('tr_size', { n }), w: 0.27, img: sizeArt('tour', n) })) },
  { y: -0.38, h: 0.11, buttons: [{ id: 'back', tk: 'back', w: 0.24, color: 0x3a4254 }, { id: 'watch_tour', tk: 'watch_tour', w: 0.3, color: 0x6a4a9a }, { id: 'start_tour', tk: 'start_tour', w: 0.36, color: 0x1f8a4c }] },
]) });
// Sopravvivenza: come il torneo (stage e opzioni), poi la torre con tutti gli avversari in ordine casuale
const survMenu = new MenuPanel({ title: t('surv'), titleTk: 'surv', titleH: 0.1, width: 1.0, height: 1.02, draggable: true, rows: withText([
  stageRow(0.22),
  { label: t('tw_n'), tk: 'tw_n', y: -0.1, h: 0.17, buttons: [8, 16, TOWER_MAX].map(n => ({ id: 'tw:' + n, text: t('tw_size', { n }), w: 0.25, img: sizeArt('tower', n) })) },
  { y: -0.38, h: 0.11, buttons: [{ id: 'back', tk: 'back', w: 0.3, color: 0x3a4254 }, { id: 'start_surv', tk: 'start_surv', w: 0.5, color: 0x6a1f8a }] },
]) });
// Opzioni: valgono per tutte le modalita'
const optionsMenu = new MenuPanel({ title: t('options_title'), titleTk: 'options_title', titleH: 0.1, width: 1.66, height: 1.46, dist: 0.78, draggable: true, onRelabel: pflagRelabel, rows: withText([
  ...optionRows(0.34),
  // con quale mano si punta nei menu (con tutte e due si facevano scelte per sbaglio)
  { label: t('pointer'), tk: 'pointer', y: -0.14, h: 0.09, buttons: [{ id: 'pt:left', tk: 'pt_left', w: 0.23 }, { id: 'pt:right', tk: 'pt_right', w: 0.23 }, { id: 'pt:both', tk: 'pt_both', w: 0.23 }] },
  { cx: 0.385, colW: 0.74, label: t('vibration'), tk: 'vibration', y: 0.02, h: 0.09, buttons: [{ id: 'vb:si', tk: 'yes', w: 0.2 }, { id: 'vb:no', tk: 'no', w: 0.2 }] },
  { label: t('pflag'), tk: 'pflag', y: -0.38, h: 0.2, carousel: true, pflagRow: true, buttons: pflagOrder().map(c => ({ id: 'pf:' + c, text: pflagName(c), w: 0.22, img: pflagImg(c) })) },
  { y: -0.58, h: 0.1, buttons: [{ id: 'back', tk: 'back', w: 0.3, color: 0x3a4254 }, { id: 'opt_floor', tk: 'opt_floor', w: 0.4, color: 0x1f6f8a }] },
]) });
// Lottatori: griglia di ritratti (come la scelta dei personaggi nei giochi di combattimento); punti un ritratto e
// a sinistra compare la sua scheda (bandiera, misure, stile, caratteristiche), a destra lui in 3D
const ROSTER_ROWS = [];
const RC = 6;                                       // ritratti per riga (36 pugili = 6 x 6; da 37 a 42: 7 righe piu' strette)
const RSTEP = Math.ceil(FIGHTER_IDS.length / RC) > 6 ? 0.124 : 0.142;
for (let r = 0; r * RC < FIGHTER_IDS.length; r++) ROSTER_ROWS.push({ y: 0.41 - r * RSTEP, h: RSTEP * 0.9, buttons: FIGHTER_IDS.slice(r * RC, r * RC + RC).map(id => ({ id: 'rf:' + id, text: FIGHTERS[id].name, w: 0.16, img: fighterImg(id) })) });
const rosterMenu = new MenuPanel({ title: t('roster_title'), titleTk: 'roster_title', titleH: 0.1, width: 1.1, height: 1.24, draggable: true, rows: withText([
  ...ROSTER_ROWS,
  { y: -0.5, h: 0.09, buttons: [{ id: 'back', tk: 'back', w: 0.3, color: 0x3a4254 }] },
]) }, 0.7);                                       // (stessa attesa dello scorrimento fuori: 0,7 s, con il riempimento giallo da sinistra a destra)
for (const b of rosterMenu.buttons) if (b.id.startsWith('rf:')) { b.fill.material.color.setHex(0xffc928); b.fill.material.opacity = 0.7; }
const fighterCard = new FighterCard();
fighterCard.mesh.position.set(-1.1 / 2 - 0.27, 0.06, 0); rosterMenu.group.add(fighterCard.mesh);
let rosterHover = null;
// Allenamento: cosa fare in palestra
const trainMenu = new MenuPanel({ title: t('training'), titleTk: 'training', titleH: 0.1, width: 1.0, height: 0.98, draggable: true, rows: withText([
  { y: 0.1, h: 0.16, buttons: [{ id: 't:sacco', tk: 'tr_bag', w: 0.22, color: 0x8a1a20 }, { id: 't:speed', tk: 'tr_speed', w: 0.22, color: 0x8a5a1a },
    { id: 't:double', tk: 'tr_double', w: 0.22, color: 0x6a1f8a }
    /* , { id: 't:rope', tk: 'tr_rope', w: 0.22, color: 0x1f6f8a } */] },   // (salta la corda: nascosta per ora, il codice resta: rope.js, startTraining('corda'), 't:rope')
  { y: -0.1, h: 0.13, buttons: [{ id: 't:slip', tk: 'tr_slip', w: 0.3, color: 0x2e7a3a }, { id: 't:spar', tk: 'tr_spar', w: 0.46, color: 0x9a1418 }] },
  { y: -0.32, h: 0.11, buttons: [{ id: 'back', tk: 'back', w: 0.3, color: 0x3a4254 }] },
]) });
// Sparring: libero oppure esercizio a scelta
const sparMenu = new MenuPanel({ title: t('sp_title'), titleTk: 'sp_title', titleH: 0.1, width: 1.0, height: 0.86, draggable: true, rows: withText([
  { y: 0.14, h: 0.14, buttons: [{ id: 'sp:libero', tk: 'sp_libero', w: 0.4, color: 0x9a1418 }] },
  { label: t('sp_choose'), tk: 'sp_choose', y: -0.1, h: 0.12, buttons: [{ id: 'sp:combo', tk: 'sp_combo', w: 0.3, color: 0x1f6f8a }, { id: 'sp:difesa', tk: 'sp_difesa', w: 0.3, color: 0x2e7a3a }] },
  { y: -0.33, h: 0.1, buttons: [{ id: 'back_train', tk: 'back', w: 0.3, color: 0x3a4254 }] },     // indietro: all'allenamento
]) });
// Difesa: tutto casuale, oppure scegli i colpi che il partner ti tira (uno alla volta, niente combinazioni)
const DEF_IDS = ['jab', 'cross', 'hook_l', 'hook_r', 'upper_l', 'upper_r', 'body'];
let defSel = new Set(['jab', 'cross']);
try { const v = JSON.parse(localStorage.getItem('hb-def-kinds') || 'null'); if (Array.isArray(v) && v.length) defSel = new Set(v.filter(k => DEF_IDS.includes(k))); } catch (e) {}
let defType = 'entrambi';                          // cosa alleni: para, schiva o entrambi
try { const v = localStorage.getItem('hb-def-type'); if (['para', 'schiva', 'entrambi'].includes(v)) defType = v; } catch (e) {}
let defGuard = true;                               // dopo ogni colpo devi tornare in guardia? (si puo' togliere)
try { defGuard = localStorage.getItem('hb-def-guard') !== 'no'; } catch (e) {}
const defMenu = new MenuPanel({ title: t('sp_difesa'), titleTk: 'sp_difesa', titleH: 0.1, width: 1.0, height: 1.32, draggable: true, rows: withText([
  { label: t('dm_type'), tk: 'dm_type', y: 0.33, h: 0.1, buttons: [{ id: 'dt:para', tk: 'dt_para', w: 0.22, color: 0x5a3a8a }, { id: 'dt:schiva', tk: 'dt_schiva', w: 0.22, color: 0x5a3a8a }, { id: 'dt:entrambi', tk: 'dt_entrambi', w: 0.22, color: 0x5a3a8a }] },
  { y: 0.16, h: 0.11, buttons: [{ id: 'dm:casuale', tk: 'dm_random', w: 0.6, color: 0x2e7a3a }] },
  { label: t('dm_pick'), tk: 'dm_pick', y: -0.05, h: 0.11, buttons: DEF_IDS.slice(0, 4).map(k => ({ id: 'dk:' + k, tk: 'dk_' + k, w: 0.21, color: 0x1f4f6f })) },
  { y: -0.2, h: 0.11, buttons: DEF_IDS.slice(4).map(k => ({ id: 'dk:' + k, tk: 'dk_' + k, w: 0.21, color: 0x1f4f6f })) },
  { label: t('dm_guard'), tk: 'dm_guard', y: -0.36, h: 0.1, buttons: [{ id: 'dg:si', tk: 'yes', w: 0.2, color: 0x5a3a8a }, { id: 'dg:no', tk: 'no', w: 0.2, color: 0x5a3a8a }] },
  { y: -0.53, h: 0.11, buttons: [{ id: 'back_spar', tk: 'back', w: 0.3, color: 0x3a4254 }, { id: 'dm:start', tk: 'dm_start', w: 0.42, color: 0x9a1418 }] },
]) });
const defSelect = () => defMenu.select([...[...defSel].map(k => 'dk:' + k), 'dt:' + defType, defGuard ? 'dg:si' : 'dg:no']);
let lastTrainMenu = null;                          // per "Cambia allenamento": il menu da cui eri partito
const MENUS = [rootMenu, arcadeMenu, tourMenu, survMenu, trainMenu, sparMenu, defMenu, optionsMenu, rosterMenu, watchMenu];
for (const m of MENUS) { m.group.scale.setScalar(0.88); scene.add(m.group); }
const menuVisible = () => MENUS.some(m => m.group.visible) || bracket.group.visible || tower.group.visible || tourBtns.group.visible;
// tabellone del torneo e i suoi pulsanti (sotto il tabellone)
const bracket = new BracketView(scene, FIGHTERS);
const tower = new TowerView(scene, FIGHTERS);
let surv = null;          // sopravvivenza in corso: { order, idx, state, stages }
const tourBtns = new MenuPanel({ title: '', titleH: 0.03, width: 1.75, height: 0.16, rows: withText([
  // (come in tutti i menu: uscire/indietro a sinistra, avanti a destra; "esci" in piu' quando scegli se guardare;
  // "salta il turno" solo quando salta piu' di un incontro)
  { y: -0.01, h: 0.09, buttons: [{ id: 'texit', tk: 'tr_quit', w: 0.3, color: 0x7a2a2a }, { id: 'tquit', tk: 'tr_quit', w: 0.36, color: 0x3a4254 }, { id: 'tskiprd', tk: 'tr_skipround', w: 0.4, color: 0x5a3d6e }, { id: 'tgo', tk: 'tr_fight', w: 0.42, color: 0x1f8a4c }] }]) }, 0.75);   // (0,75 s: prima 0,3)
scene.add(tourBtns.group);
// incontro CPU: pulsante piccolo per andare al risultato
const skipBtn = new MenuPanel({ title: '', titleH: 0.02, width: 0.3, height: 0.1, draggable: true, dragSide: 'left', rows: withText([   // (maniglia a sinistra: lo sposti dove non ti da' fastidio)
  { y: -0.005, h: 0.06, buttons: [{ id: 'skip', tk: 'tr_skip', w: 0.25, color: 0x3a4254 }] }]) }, 0.75);
scene.add(skipBtn.group);
// ---- accesso al menu di pausa dal tabellone (l'unico modo con le mani): una linguetta blu attaccata al bordo alto del tabellone.
// Si attiva solo col pugno chiuso, il braccio disteso verso il tabellone e abbastanza fermo (non in guardia, non mentre ondeggi):
// dopo 1 s di puntamento cosi' la linguetta si accende e comincia a riempirsi (1 s), poi si apre il menu vero (pausa; negli incontri
// che guardi: continua a guardare / esci). Niente raggio: solo l'animazione della linguetta. Vale la mano scelta nelle opzioni.
const MT_AIM = 0.5, MT_FILL = 0.5, MT_SPEED = 0.55, MT_REACH = 0.5;
const mtab = (() => {
  const po = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false, toneMapped: false };
  const mk = (draw, w, h, order, z) => {
    const c = document.createElement('canvas'); c.width = 900; c.height = 72; draw(c.getContext('2d'));
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, ...po }));
    m.renderOrder = order; m.position.z = z; return m;
  };
  const group = new THREE.Group(); group.name = 'linguetta menu'; group.visible = false;
  const bg = mk(g => { g.fillStyle = '#1d4fc4'; g.beginPath(); g.roundRect(3, 3, 894, 66, 18); g.fill(); g.strokeStyle = 'rgba(190,215,255,0.7)'; g.lineWidth = 3; g.stroke(); }, 0.93, 0.074, 5, 0);
  // riempimento (tra lo sfondo e la scritta): un blu piu' chiaro e acceso che cresce da sinistra
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.93, 0.074), new THREE.MeshBasicMaterial({ color: 0x3fa9ff, transparent: true, opacity: 1, ...po }));
  fill.renderOrder = 6; fill.position.z = 0.0015; fill.scale.x = 0.001; fill.visible = false;
  const txt = mk(() => {}, 0.93, 0.074, 7, 0.003);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.99, 0.12), new THREE.MeshBasicMaterial({ color: 0x7fc4ff, transparent: true, opacity: 0, ...po }));
  glow.position.z = -0.002; glow.renderOrder = 4;
  group.add(glow, bg, fill, txt);
  return { mesh: group, glow, fill, txt, host: null, aimT: 0, fillT: 0, prev: {}, spd: {}, hw: 0.58, hh: 0.33 };
})();
// la scritta della linguetta: generica se usi entrambe le mani, altrimenti dice con quale pugno puntare (opzione "mano" del menu)
let mtabMode = 'pause';                                // 'pause' = mette in pausa; 'skip' = (a fine incontro) salta il verdetto dello speaker
function mtabText() {
  const c = mtab.txt.material.map.image, g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = '#ffffff'; g.font = '700 33px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const k = mtabMode === 'skip' ? 'mt_skip' : 'mt_tab', msg = t(pointerHand === 'right' ? k + '_r' : pointerHand === 'left' ? k + '_l' : k), w = g.measureText(msg).width;
  if (w > 850) g.font = `700 ${Math.floor(33 * 850 / w)}px system-ui, sans-serif`;                // (la scritta piu' lunga si rimpicciolisce per starci)
  g.fillText(msg, 450, 38);
  mtab.txt.material.map.needsUpdate = true;
}
function mtabHost() {                                  // il tabellone su cui sta la linguetta in questo momento
  if (game.paused || pause.group.visible || menuVisible()) return null;
  if (game.phase === 'end') return game.skipVerdict && (game.reactAt == null || sfx.voiceBusy()) && (game.phaseT < 2.4 || sfx.voiceBusy() || game.reactAt == null && game.result && game.result.winner !== 'pari') && board.mesh.visible ? board.mesh : null;   // verdetto in corso: la linguetta per saltarlo
  if (game.phase === 'fight' || game.phase === 'rest' || game.phase === 'watch') return board.mesh.visible ? board.mesh : null;
  if (game.phase === 'training') { const tr_ = trainer(); return tr_ && tr_.group.visible && tr_.board ? tr_.board : null; }
  if (game.phase === 'sparring') return spar && spar.board && spar.board.visible ? spar.board : null;
  return null;
}
function mtabDims(host) {                              // misura del tabellone (nel suo spazio): mezza larghezza e altezza, e la faccia davanti
  if (!host.userData.tabDims) {
    let hw = 0, hh = 0, zf = -1e9;
    host.traverse(o => {
      if (!o.isMesh || o === mtab.mesh || o.parent === mtab.mesh || !o.geometry) return;
      o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; if (!b) return;
      const p = o === host ? { x: 0, y: 0, z: 0 } : o.position, sx = o.scale.x || 1, sy = o.scale.y || 1;
      hw = Math.max(hw, b.max.x * sx + p.x); hh = Math.max(hh, b.max.y * sy + p.y); zf = Math.max(zf, b.max.z + p.z);
    });
    host.userData.tabDims = { hw: hw || 0.58, hh: hh || 0.33, zf: zf > -1e8 ? zf : 0 };
  }
  return host.userData.tabDims;
}
const _mi = new THREE.Matrix4(), _mo = new THREE.Vector3(), _md = new THREE.Vector3();
function updateMenuTab(dt, rays) {
  const host = mtabHost(), M = mtab;
  if (!host) { M.mesh.visible = false; M.aimT = M.fillT = 0; M.prev = {}; return; }
  if (M.host !== host) { if (M.mesh.parent) M.mesh.parent.remove(M.mesh); host.add(M.mesh); M.host = host; M.aimT = M.fillT = 0; }
  const wantMode = game.phase === 'end' ? 'skip' : 'pause'; if (wantMode !== mtabMode) { mtabMode = wantMode; mtabText(); }
  const D = mtabDims(host); M.hw = D.hw; M.hh = D.hh;
  M.mesh.position.set(0, D.hh + 0.037, D.zf + 0.002); M.mesh.visible = true;             // la linguetta: attaccata al bordo alto
  host.updateMatrixWorld(true); M.mesh.updateMatrixWorld(true);
  _mi.copy(host.matrixWorld).invert();
  const seen = {}; let ok = false;
  for (const r of rays) {
    const hand = r.hand || 'x'; seen[hand] = true;
    const prev = M.prev[hand]; const sp = prev ? prev.distanceTo(r.o) / Math.max(dt, 1e-3) : 0;
    M.spd[hand] = (M.spd[hand] === undefined ? sp : M.spd[hand] * 0.8 + sp * 0.2); M.prev[hand] = (prev || new THREE.Vector3()).copy(r.o);
    const steady = M.spd[hand] < MT_SPEED, reach = r.o.distanceTo(player.head) > MT_REACH;          // braccio fermo e disteso (non in guardia)
    if (!steady || !reach) continue;
    _mo.copy(r.o).applyMatrix4(_mi); _md.copy(r.d).transformDirection(_mi);                       // il raggio sul piano del tabellone
    if (Math.abs(_md.z) < 1e-4) continue; const tt = -(_mo.z - D.zf) / _md.z; if (tt < 0.1) continue;
    const px = _mo.x + _md.x * tt, py = _mo.y + _md.y * tt;
    if (Math.abs(px) < D.hw + 0.05 && py < D.hh + 0.16 && py > -D.hh - 0.05) { ok = true; break; }
  }
  for (const h of Object.keys(M.prev)) if (!seen[h]) { delete M.prev[h]; delete M.spd[h]; }
  if (ok) M.aimT = Math.min(MT_AIM + 2, M.aimT + dt); else M.aimT = Math.max(0, M.aimT - dt * 3);      // appena smetti si azzera in fretta
  const armed = M.aimT >= MT_AIM;
  M.fillT = armed && ok ? M.fillT + dt : 0;
  // animazione: la linguetta si ingrandisce e pulsa mentre la punti, poi si riempie da sinistra a destra
  const a = Math.min(1, M.aimT / MT_AIM), k = Math.min(1, M.fillT / MT_FILL), pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.014);
  M.glow.material.opacity = ok ? (0.08 + 0.3 * a) * (armed ? 0.7 + 0.3 * pulse : 1) : 0;
  M.glow.scale.set(1 + 0.03 * a + 0.04 * k, 1 + 0.15 * a + 0.25 * k, 1);
  M.fill.visible = k > 0.01; M.fill.scale.x = Math.max(0.001, k); M.fill.position.x = -0.465 * (1 - k);
  M.mesh.scale.setScalar(1 + 0.08 * a + 0.2 * k);
  if (M.fillT >= MT_FILL) { M.fillT = 0; M.aimT = 0; M.fill.visible = false; sfx.menuBlip(); if (game.phase === 'end') { if (game.skipVerdict) game.skipVerdict(); } else openPause(false, game.phase === 'watch'); }
}
let prevButtons = false;

let mike = null;
// avversario scelto (nel codice resta "mike" = l'avversario)
let fighterId = 'bruce';
try { fighterId = localStorage.getItem('hb-fighter') || 'bruce'; } catch (e) {}
let oppChoice = fighterId;                  // avversario scelto in arcade: un pugile o 'random'
try { oppChoice = localStorage.getItem('hb-opp') || fighterId; } catch (e) {}
if (!FIGHTERS[fighterId]) fighterId = 'bruce';
setOpponentName(FIGHTERS[fighterId].name);
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
let floorSets = 0;
// Pavimento sistemato a mano: si ricorda per la prossima volta (uscendo e rientrando nel gioco il Quest non da' piu'
// la stanza). Si riconosce lo stesso posto dal perimetro del confine del Quest (area e lunghezza, uguali anche se
// ruoti la stanza); senza confine, solo se e' stato fatto da meno di 12 ore.
let floorSpace = null;                                  // { bounded, area, per } del posto dove sei adesso (null = ancora da leggere)
async function readSpace(session) {
  try {
    const bs = await session.requestReferenceSpace('bounded-floor');
    const pts = bs.boundsGeometry || [], n = pts.length;
    if (n < 3) return { bounded: false, area: 0, per: 0 };
    let a = 0, per = 0;
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p.x * q.z - q.x * p.z; per += Math.hypot(q.x - p.x, q.z - p.z); }
    return { bounded: true, area: Math.abs(a) / 2, per };
  } catch (e) { return { bounded: false, area: 0, per: 0 }; }
}
function saveFloor(y) {
  if (!floorSpace) return;
  try { localStorage.setItem('hb-floor', JSON.stringify({ y, t: Date.now(), ...floorSpace })); } catch (e) {}
}
function savedFloor() {
  try {
    const o = JSON.parse(localStorage.getItem('hb-floor')); if (!o || !isFinite(o.y) || Math.abs(o.y) > 1.0 || !floorSpace) return null;
    if (o.bounded && floorSpace.bounded) return Math.abs(o.area - floorSpace.area) < 0.3 && Math.abs(o.per - floorSpace.per) < 0.4 ? o : null;
    if (!o.bounded && !floorSpace.bounded) return Date.now() - o.t < 12 * 3600e3 ? o : null;
    return null;                                          // un posto con confine e uno senza: non e' lo stesso
  } catch (e) { return null; }
}
function setFloor(y, source) {
  floorY = y; floorSource = source; floorSets++;
  if (source === 'mano' || source === 'manuale') saveFloor(y);
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
  if (mike) placeMikeStart();
}
// l'avversario al suo posto di partenza nel ring, girato verso il giocatore
function placeMikeStart() {
  const mz = Math.max(-(ringSize / 2 - 0.4), playerZ - 1.15);
  mike.root.position.set(0, 0, mz).applyMatrix4(arena.matrixWorld);
  mike.root.rotation.y = arena.rotation.y;    // il modello guarda verso +Z: verso il giocatore
  mike.previewing = false; mike.previewSpot = null;
}

// Riallinea: ti rimette nel tuo angolo, girato verso l'avversario. Non si sposta il ring (Mike, tabellone, pubblico
// restano dove sono): si sposta il riferimento del visore. Serve quando togli e rimetti il visore (il Quest puo'
// cambiare il suo "centro") o quando ti ritrovi lontano dal ring. Nella stanza (realta' mista) invece si rimette il
// ring attorno a te, perche' deve restare allineato alla stanza vera.
let needRecenter = 0, recenterAlways = false, reopenPending = false, reopenWait = 0, lastHeadR = null, reopenFrames = 0;
const selHeld = new Map(), selPrev = new Map();
// mano del puntatore nei menu: 'left' (predefinita), 'right' o 'both'
let pointerHand = 'left';
try { const v = localStorage.getItem('hb-pointer'); if (['left', 'right', 'both'].includes(v)) pointerHand = v; } catch (e) {}
mtabText();     // grilletto / pizzico tenuto, per sorgente (mano o controller)
// z: dove metterti nel ring (in coordinate del ring; di solito playerZ, il tuo angolo)
function recenterPlayer(z = playerZ) {
  if (!renderer.xr.isPresenting || intro) return;
  const cam = renderer.xr.getCamera();
  const H = new THREE.Vector3(); cam.getWorldPosition(H);
  const yaw = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
  if (mode === 'stanza') { if (game.phase === 'menu') placeArena(H, yaw); return; }
  arena.updateMatrixWorld(true);
  const T = new THREE.Vector3(0, 0, z).applyMatrix4(arena.matrixWorld); T.y = H.y;
  const R = new THREE.Matrix4().makeTranslation(T.x, T.y, T.z)
    .multiply(new THREE.Matrix4().makeRotationY(arena.rotation.y - yaw))
    .multiply(new THREE.Matrix4().makeTranslation(-H.x, -H.y, -H.z));
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  R.invert().decompose(p, q, sc);
  const ref = renderer.xr.getReferenceSpace();
  renderer.xr.setReferenceSpace(ref.getOffsetReferenceSpace(new XRRigidTransform({ x: p.x, y: p.y, z: p.z }, { x: q.x, y: q.y, z: q.z, w: q.w })));
  console.log('riallineato nel tuo angolo');
}
function headOutOfRing(margin = 0.15) {
  if (!ringSize) return false;
  const p = arena.worldToLocal(player.head.clone()), half = ringSize / 2;
  return Math.abs(p.x) > half + margin || Math.abs(p.z) > half + margin;
}

// ---------------------------------------------------------------- incontro: round, punti, danno, atterramenti
const POWER = { facile: 0.65, normale: 0.95, difficile: 1.3, impossibile: 1.8 };   // forza dei pugni di Mike
// Atterramenti: si va giu' solo a energia zero. Rialzandosi l'energia risale sempre meno; quando non ce n'e'
// piu' da recuperare si resta giu': KO. Con la "regola dei 3 KO" il terzo atterramento chiude l'incontro.
const KD_REFILL = [75, 50, 25];
const getUp = new GetUpChallenge(scene);
getUp.attachDark(camera);
const countdown = new CountdownHUD(camera);
const nextMenu = new MenuPanel({ title: t('next_title', { n: 2, s: 30 }), titleH: 0.045, titleW: 0.3, width: 0.38, height: 0.2, rows: [
  { y: -0.04, h: 0.06, buttons: [{ id: 'next', tk: 'next_btn', text: t('next_btn'), w: 0.29, color: 0x1f8a4c }] },
] });
scene.add(nextMenu.group);
// stanza non scansionata: prima di giocare si sistema il pavimento (scansione del Quest o mano a terra), altrimenti con
// la stima del visore i pugili potevano risultare piu' bassi (in ufficio "sembravano nani")
const floorMenu = new MenuPanel({ title: t('floor_title'), titleH: 0.045, titleW: 0.76, width: 0.82, height: 0.25, rows: withText([
  { y: -0.045, h: 0.07, buttons: [{ id: 'fl:back', tk: 'back', w: 0.17, color: 0x3a4254 }, { id: 'fl:hand', tk: 'floor_hand', w: 0.27, color: 0x3a4254 }, { id: 'fl:scan', tk: 'floor_scan', w: 0.27, color: 0x1f8a4c }] },
]) });
scene.add(floorMenu.group);
let floorGate = 'wait';                               // wait -> ask -> ok (finche' non e' ok si resta qui); 'force': aperto dalle opzioni
let floorForce = null;                                // { sets, scan }: dalle opzioni conta solo la mano o una scansione nuova
// apre il pannello del pavimento: all'avvio (stanza non scansionata, obbligatorio) o dalle opzioni (con "indietro")
// avvia la scansione del Quest. Se rifiuta, si riprova al prossimo grilletto/pizzico (il browser puo' volerla avviata
// proprio da un tuo clic: il pulsante si preme anche solo tenendoci sopra il guantone); al secondo rifiuto si mostra
// il motivo che da' il Quest
let captureArmed = false;
function startRoomCapture(session, fromClick) {
  // se dopo 10 s non e' successo niente (il Quest non apre la scansione e non risponde): si dice cosa fare
  const tok = (startRoomCapture.tok = (startRoomCapture.tok || 0) + 1);
  setTimeout(() => { if (startRoomCapture.tok === tok && floorMenu.group.visible && floorMenu.titleText === t('floor_scan_hint')) floorMenu.setTitle(t('floor_scan_settings')); }, 10000);
  session.initiateRoomCapture().then(() => {
    if (floorForce) { floorForce.scan = true; floorSource = 'visore'; }    // (dalle opzioni: si rilegge il pavimento)
  }).catch(e => {
    console.warn('scansione', e);
    if (!fromClick) { captureArmed = true; floorMenu.setTitle(t('floor_scan_click')); }
    else floorMenu.setTitle(t('floor_scan_err', { e: (e && (e.message || e.name)) || '?' }));
  });
}
// il sito ha il permesso "dati spaziali"? (senza, il Quest non da' la stanza e non fa partire la scansione)
function spatialOK() {
  const ss = renderer.xr.getSession && renderer.xr.getSession();
  const f = ss && ss.enabledFeatures;
  return !f || f.includes('plane-detection') || f.includes('mesh-detection');
}
function openFloorMenu(force) {
  floorGate = force ? 'force' : 'ask'; floorForce = force ? { sets: floorSets, scan: false } : null;
  closeMenus();
  const bs = floorMenu.buttons, back = bs.find(b => b.id === 'fl:back');
  back.g.visible = !!force;
  const vis = bs.filter(b => b.g.visible), gap = 0.03;          // centrati, uno accanto all'altro (indietro a sinistra)
  let x = -(vis.reduce((a, b) => a + b.w, 0) + gap * (vis.length - 1)) / 2;
  for (const b of vis) { b.g.position.x = x + b.w / 2; x += b.w + gap; }
  floorMenu.select([]);
  floorMenu.setTitle(t(!spatialOK() ? 'floor_noperm' : force ? 'floor_title2' : 'floor_title')); floorMenu.open(player.head, menuYaw(), 0.7, 0.1);
}
const floorOK = () => ['stanza', 'mano', 'manuale', 'salvato'].includes(floorSource);
window.floorTest = { space: sp => { floorSpace = sp; }, save: y => saveFloor(y), saved: () => savedFloor(), ask: () => openFloorMenu(false), force: () => openFloorMenu(true), set: () => setFloor(floorY, 'mano'), get state() { return floorGate; }, menu: floorMenu };   // (prove)
// durante la presentazione dello speaker: conto alla rovescia e pulsante per iniziare subito
const introMenu = new MenuPanel({ title: t('intro_title', { s: 20 }), titleH: 0.045, titleW: 0.3, width: 0.38, height: 0.2, rows: [
  { y: -0.04, h: 0.06, buttons: [{ id: 'skip', tk: 'skip_intro', text: t('skip_intro'), w: 0.29, color: 0x1f8a4c }] },
] });
scene.add(introMenu.group);
// premiazione (vittoria del torneo o della torre): la coppa si solleva con due mani; il pulsante salta l'attesa e va avanti
const trophyMenu = new MenuPanel({ title: t('tr_prize'), titleTk: 'tr_prize', titleH: 0.04, titleW: 0.5, width: 0.56, height: 0.2, rows: withText([
  { y: -0.04, h: 0.06, buttons: [{ id: 'tcont', tk: 'tr_continue', w: 0.29, color: 0x1f8a4c }] },
]) });
scene.add(trophyMenu.group);
const fighter = () => ({ points: 0, hits: 0, blocks: 0, dodges: 0, dmg: 0, kd: 0, kdRound: 0, penalties: 0 });
const game = {
  round: 1, time: roundSecs, phase: 'ready', phaseT: 0, paused: false,
  player: fighter(), mike: fighter(), message: '', kd: null, result: null, foul: null, fill: null,
};
let threeKO = true;
try { threeKO = localStorage.getItem('hb-3ko') !== 'no'; } catch (e) {}
let oneKO = false;                                   // opzione: il primo atterramento chiude l'incontro (si conta fino a 10)
try { oneKO = localStorage.getItem('hb-1ko') === 'si'; } catch (e) {}

function setPeople(v) {                      // nel menu il ring e' vuoto: niente Mike, niente pubblico
  if (mike) mike.root.visible = v;
  if (arenaEnv) arenaEnv.setPeople(v);
}
function newMatch() {
  party.stop();                                              // coriandoli e fuochi del finale precedente: via, prima di ogni incontro
  if (arenaEnv) arenaEnv.winCheer(false);                                   // il pubblico in piedi riabbassa le braccia
  if (stadiumEnv && stadiumEnv.player) { stadiumEnv.player.cheer(false); stadiumEnv.player.watch(false); }   // il calciatore dello stadio riprende a giocare
  game.round = 1; game.result = null; game.kd = null; game.foul = null; game.fill = null;
  game.player = fighter(); game.mike = fighter();
  if (bruises) bruises.reset();
  if (mike) { mike.resetPose(); mike.holdDist = null; mike.learner = new StyleLearner(); }   // (ogni incontro impara da capo)
  getUp.stop(); setPeople(true); resetBoard();
  startRound();
}
function startRound() {
  girl.stop(); stool.visible = false; nextMenu.close(); introMenu.close(); trophyMenu.close(); countdown.hide();
  if (mike) { mike.leaveCorner(); mike.applyRound(game.round); }    // l'avversario si stanca round dopo round
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
// un contrattacco (preso mentre l'altro attacca o ha appena mancato) toglie di piu'
const COUNTER_X = 1.5;
function landed(who, zone, power) {
  const f = game[who];
  f.dmg = Math.min(100, f.dmg + (zone === 'head' ? 3.5 + 6 * power : 2 + 3.5 * power));
  if (game.kd || game.phase !== 'fight' || game.foul) return;
  if (f.dmg >= 100) knockdown(who, power);
}

// il calciatore dello stadio: sta fermo a guardare il ring (ko, attesa del verdetto) o esulta (a verdetto dato)
const stadiumFb = (fn, ...a) => { if (stadiumEnv && stadiumEnv.group.visible && stadiumEnv.player) stadiumEnv.player[fn](...a, ...(a[0] ? [stadiumEnv.group.worldToLocal(player.head.clone())] : [])); };
function knockdown(who, power) {
  stadiumFb('watch', true);
  const f = game[who];
  f.kd++; f.kdRound++;
  // stanchezza da atterramenti: sale di 1 a ogni atterramento e cala col tempo (pause tra i round, minuti di combattimento)
  f.kdLvl = (f.kdLvl || 0) + 1;
  const lvl = Math.max(1, Math.round(f.kdLvl));
  mike.enabled = false;
  sfx.punchHit(1.4, who === 'mike');               // atterrato lui: il tuo colpo; atterrato tu: il suo
  sfx.voiceNow('knockdown');
  if (arenaEnv) arenaEnv.cheer(2);
  if (mode === 'arena') sfx.cheer('boato', 1);
  // energia che si recupera rialzandosi: 75, 50, 25 (con la regola dei 3 atterramenti il terzo chiude l'incontro);
  // senza la regola ci si rialza finche' c'e' energia da recuperare: 15, 8, poi niente -> si resta giu' (KO). Vale per tutti e due.
  const refill = oneKO ? 0 : KD_REFILL[lvl - 1] ?? (threeKO ? 0 : [15, 8][lvl - 4] ?? 0);
  // "un KO, fine partita": niente conteggio, appena e' a terra l'incontro finisce e parte subito il verdetto
  const kd = { who, count: 0, t: 0, up: false, refill, final: refill <= 0, tko: (threeKO && f.kd >= 3) || oneKO, instant: oneKO };
  if (who === 'mike') {
    mike.knockdown();
    kd.getUpAt = kd.final || kd.tko ? 99 : 4 + Math.floor(Math.random() * 5);      // si rialza tra il 4 e l'8
    game.message = t('mike_down');
  } else {
    const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
    const n = 10 * lvl;                       // colpi per rialzarsi: 10 in piu' a ogni atterramento (meno se hai recuperato)
    if (!kd.final && !kd.tko) {
      getUp.start(n, 0.11, player.head, e.y);
      game.message = t('you_down_hit', { n });
    } else game.message = t('you_down_out');
    mike.holdDist = 1.7;                     // Mike va all'angolo neutro
  }
  if (kd.tko && !kd.instant) game.message = t('third_kd', { who: t(who === 'mike' ? 'who_mike' : 'who_you') });
  game.kd = kd;
}

function updateKnockdown(dt) {
  const kd = game.kd, f = game[kd.who];
  kd.t += dt;
  if (kd.tko && kd.t > (kd.instant ? 1.2 : 1.5)) return endMatch(kd.who === 'mike' ? 'player' : 'mike', kd.instant ? 'KO' : 'TKO');
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
    game.kd = null; getUp.stop(); mike.holdDist = null; stadiumFb('watch', false);
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
  game.result = { winner, how }; game.prize = winner === 'player' && !!((tour && tour.isFinal()) || (surv && surv.idx >= surv.order.length - 1)); game.prizeT = null; game.prizeSkip = false;
  const pts = `${game.player.points}-${game.mike.points}`;
  game.message = winner === 'player' ? t('win_you', { how: t('how_' + how) }) : winner === 'mike' ? t('win_mike', { how: t('how_' + how) }) : t('draw', { pts });
  if (how === 'PTS' && winner !== 'pari') game.message += ` (${pts})`;
  // finale del torneo o ultimo piano della torre vinti: la ragazza del ring entra con la coppa e te la porge
  const lastFight = (tour && tour.isFinal()) || (surv && surv.idx >= surv.order.length - 1);
  // festa per il vincitore: coriandoli e fuochi d'artificio nei suoi colori (partono quando lo speaker dice il nome; nel pareggio subito)
  const c = new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld);
  const startParty = () => { stadiumFb('cheer', true); if (winner === 'player' && arenaEnv) arenaEnv.winCheer(true); party.start(c, winner === 'player' ? [0xd81e2c, 0xff7a7a, 0xffffff] : winner === 'mike' ? [0x1d4fc4, 0x7aa8ff, 0xffffff] : [0xd81e2c, 0x1d4fc4]); };
  game.reactAt = null;
  stadiumFb('watch', true);                                                  // finito l'incontro il calciatore resta fermo a guardare; esulta solo quando parte la festa (verdetto)
  // (   // a fine incontro il calciatore si ferma, ti guarda ed esulta (chiunque vinca)
  if (winner === 'pari') startParty();
  sfx.cheer('applauso', 1); sfx.cheer('boato', 0.9);
  // verdetto dell'annunciatore, come nei veri incontri
  const kind = how === 'KO' ? 'ko' : how === 'TKO' ? 'tko' : how === 'DQ' ? 'dq' : 'points';
  // verdetto: per l'avversario parte comune ("...dall'angolo blu...") e poi il suo nome
  const verdict = winner === 'player' ? [`win_you_${kind}`] : [`win_opp_${kind}`, 'name_' + fighterId];
  setTimeout(() => sfx.announce(winner === 'pari' ? ['scorecards', 'draw']
    : kind === 'points' ? ['scorecards', 'winner_intro', ...verdict]
    : kind === 'dq' ? verdict : ['winner_intro', ...verdict]), kind === 'dq' ? 2600 : 1800);
  // resta in guardia finche' lo speaker non dice il nome: poi chi vince esulta, chi perde si abbatte
  // (la linguetta sul tabellone permette di saltare il verdetto: reagisce subito)
  game.skipVerdict = null;
  if (winner !== 'pari') {
    let reacted = false;
    const react = () => {
      if (reacted || game.phase !== 'end') return; reacted = true; game.skipVerdict = null;
      startParty(); game.reactAt = game.phaseT;
      if (winner === 'player' && lastFight) setTimeout(() => { if (game.phase === 'end') { girl.trophy(arena, ringSize, player.head); const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera; trophyMenu.open(player.head, new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y, 0.5, 0.35); } }, 600);   // la ragazza con la coppa entra dopo l'annuncio, con i fuochi
      if (mike.down) return; if (winner === 'mike') mike.celebrate(); else mike.dejected = true;
    };
    game.skipVerdict = () => { sfx.stopVoices(); react(); };
    setTimeout(() => {
      if (game.phase !== 'end') return;
      setTimeout(react, sfx.lastVoiceEnds() + 250);
    }, (kind === 'dq' ? 2600 : 1800) + 60);
  } else game.skipVerdict = () => { sfx.stopVoices(); game.skipVerdict = null; };
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
      case 'feinted':                                            // sei cascato nella finta
        game.message = t('feint_bit');
        break;
      case 'adapted':                                            // ha capito il tuo gioco (Difficile e Impossibile)
        game.message = t('adapted', { b: FIGHTERS[fighterId].name.toUpperCase() });
        sfx.announce(['adapted']);
        break;
      case 'playerHit': {
        const pts = e.zone === 'head' ? 2 : 1;
        game.player.points += pts; game.player.hits++;
        game.message = e.counter ? t('you_counter') : t(e.zone === 'head' ? 'you_head' : 'you_body');
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
        landed('mike', e.zone, Math.min(1.5, e.speed / 5) * (mike.cfg.toughness ?? 1) * (e.counter ? COUNTER_X : 1));   // ai livelli alti incassa meno
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
        game.message = e.counter ? t('mike_counter') : t(e.zone === 'body' ? 'mike_body' : 'mike_head');
        sfx.punchHit(e.zone === 'body' ? 0.9 : 1.2, false); flash.hit(e.zone === 'body' ? 0.5 : 1);
        if (arenaEnv) arenaEnv.cheer(0.6);
        if (mode === 'arena' && e.zone === 'head') sfx.cheer('boato', 0.6);
        player.pulse('left', 0.7, 90); player.pulse('right', 0.7, 90);
        landed('player', e.zone, powerNow() * ((mike.cfg0.mods && mike.cfg0.mods.power) || 1) * (0.85 + Math.random() * 0.3) * (e.counter ? COUNTER_X : 1));
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
  for (const k of ['player', 'mike']) { game[k].dmg = Math.max(0, game[k].dmg - 25); game[k].kdLvl = Math.max(0, (game[k].kdLvl || 0) - 0.5); }   // all'angolo ci si riprende
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
    game.message = game.outRing && game.outWarn ? t('out_warn', { p: game.outWarn }) : t(game.outRing ? 'out_ring' : 'pause');
  } else if (game.phase === 'presentazione') {
    game.message = t('presenting');
    // conto alla rovescia fino al gong del primo round (presentazione + preparazione)
    introMenu.setTitle(t('intro_title', { s: Math.max(0, Math.ceil(game.presT - game.phaseT + READY_S)) }));
    if (introMenu.update(dt, Object.values(player.gloves)) === 'skip') {     // si salta: subito "Round one… Fight!"
      sfx.menuBlip(); sfx.stopVoices(); introMenu.close();
      game.phase = 'ready'; game.phaseT = READY_S - 2.2;
    } else if (game.phaseT >= game.presT) { game.phase = 'ready'; game.phaseT = 0; }      // (il tasto resta fino a quando parte il conto 3-2-1: se sparisce prima non si capisce quando inizia l'incontro)
  } else if (game.phase === 'ready') {
    const left = Math.ceil(READY_S - game.phaseT);
    if (introMenu.group.visible) {                                // il tasto "inizia subito" resta finche' non arriva il 3
      if (left > 3) {
        introMenu.setTitle(t('intro_title', { s: left }));
        if (introMenu.update(dt, Object.values(player.gloves)) === 'skip') { sfx.menuBlip(); sfx.stopVoices(); introMenu.close(); game.phaseT = Math.max(game.phaseT, READY_S - 2.2); }
      } else introMenu.close();
    }
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
      for (const k of ['player', 'mike']) game[k].kdLvl = Math.max(0, (game[k].kdLvl || 0) - dt / 90);      // e smaltisce gli atterramenti
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
    if (nextMenu.update(dt, Object.values(player.gloves)) === 'next') { sfx.menuBlip(); game.phaseT = REST_S; }
    if (game.phaseT >= REST_S) { game.round++; startRound(); }
  } else if (game.phase === 'end') {
    flash.setBase(0);
    // si passa avanti solo dopo che lo speaker ha detto il nome E vincitore e sconfitto hanno avuto il tempo di festeggiare / abbassare le braccia
    const pari = game.result && game.result.winner === 'pari';
    const celebrated = pari ? game.phaseT > 6 : (game.reactAt != null && game.phaseT - game.reactAt > 6.5) || game.phaseT > 24;
    if (tour || surv) {
      let go = game.phaseT > 6 && !sfx.voiceBusy() && celebrated;
      if (game.prize) {                                  // hai vinto il torneo: 10 secondi in piu' per la coppa (o "continua")
        if (trophyMenu.group.visible && trophyMenu.update(dt, Object.values(player.gloves)) === 'tcont') { sfx.menuBlip(); game.prizeSkip = true; }
        if (go && game.prizeT == null && (!girl.trophyMode || girl.cupReady)) game.prizeT = game.phaseT;
        go = go && (game.prizeSkip || (game.prizeT != null && game.phaseT - game.prizeT >= 10));
      }
      if (go) { if (surv) showTowerAfter(); else showBracketAfter(); }
      return;
    }   // torneo/sopravvivenza: niente popup
    if (game.phaseT > 6 && !pause.group.visible && !sfx.voiceBusy() && celebrated) openPause(true);   // dopo che lo speaker ha finito
  }
  const xr = renderer.xr.getSession && renderer.xr.getSession();
  const feats = xr && xr.enabledFeatures ? (xr.enabledFeatures.includes('plane-detection') ? 'piani sì' : 'piani no') : '';
  board.draw({ round: game.round, rounds: rounds, level: t('l_' + level), time: game.phase === 'rest' ? Math.max(0, REST_S - game.phaseT) : game.time,
    running: game.phase === 'fight', player: game.player, mike: game.mike, message: game.message,
    names: pending && ((pending.cm && tour) || pending.arcade) ? cpuNames().map(n => n.toUpperCase()) : undefined,   // (tra un incontro CPU e l'altro: niente "TU")
    flags: pending && ((pending.cm && tour) || pending.arcade) ? cpuIds().map(id => id && ROSTER[id] && ROSTER[id].flag) : [playerFlagCode(), ROSTER[fighterId] && ROSTER[fighterId].flag],
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
  if (arenaEnv) arenaEnv.setBanners([[t('bn_red'), t('bn_you')], [t('bn_go'), null], ['HOME BOXING', t(tour ? 'bn_tour' : surv ? 'bn_surv' : 'bn_champ')], ['KO!', null]]);
  const rk = tour ? (tour.stage() === 0 ? 'tour_r64' : 'tour_r' + (tour.stage() - 1)) : '';
  const head = tour ? (tour.round === 0 ? ['tour_intro', rk] : [rk]) : ['intro_1'];
  const parts = [...head, 'intro_red', 'intro_blue_g', FIGHTERS[fighterId].genericIntro ? (['intro_gen', 'intro_gen2', 'intro_gen3', 'intro_gen4'].filter(n => sfx.voiceDur(n) > 0).sort(() => Math.random() - 0.5)[0] || 'intro_gen') : 'intro_' + fighterId, 'name_' + fighterId];
  const d = parts.map(n => sfx.voiceDur(n));
  if (d.some(x => !x)) return;                         // voci non ancora caricate: si parte e basta
  sfx.announce(parts);
  game.phase = 'presentazione'; game.phaseT = 0; game.presT = d.reduce((a, b) => a + b + 0.2, 0) + 0.8;
  game.message = t('presenting');
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  introMenu.open(player.head, e.y, 0.5, 0.35);
  // il pubblico applaude ai nomi
  const crowd = (ms, k, g) => setTimeout(() => { if (game.phase !== 'presentazione') return;
    if (mode === 'arena') { sfx.cheer(k, g); if (arenaEnv) arenaEnv.cheer(1.2); } }, ms);
  const upTo = n => d.slice(0, n).reduce((a, b) => a + b + 0.2, 0);
  crowd((upTo(head.length + 1) + 0.1) * 1000, 'applauso', 0.8);
  crowd((upTo(parts.length) + 0.5) * 1000, 'boato', 0.9);
}
// cambio lingua dal menu: scritte e voci
onLang(l => {
  sfx.setVoiceLang(l);
  for (const m of MENUS) m.relabel();
  skipBtn.relabel();
  nextMenu.relabel(); introMenu.relabel(); trophyMenu.relabel(); pause.relabel(); tourBtns.relabel(); floorMenu.relabel(); mtabText();
  for (const m of MENUS) m.select(menuChoices());
  if (bracket.group.visible && bracket.T) bracket.draw();
  if (rosterHover) fighterCard.show(rosterHover, FIGHTERS[rosterHover].name);   // scheda nella nuova lingua
  if (game.phase === 'menu') game.message = t('menu');
  showMode();
  if (statusK) statusT(statusK, statusV);
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

// indicatore di caricamento (avversario, partner, stage): anello che gira davanti agli occhi
const loader = (() => {
  const G = new THREE.Group(); G.visible = false;
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.font = '800 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(8,10,14,0.75)'; g.beginPath(); g.roundRect(6, 6, 500, 116, 30); g.fill();
  g.fillStyle = '#ffd34d'; g.fillText(t('loading_short'), 256, 66);
  const txt = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.08), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
  txt.position.y = -0.1; txt.renderOrder = 1300; G.add(txt);
  // clessidra che si capovolge
  const hc = document.createElement('canvas'); hc.width = 128; hc.height = 192; const h = hc.getContext('2d');
  h.strokeStyle = '#ffd34d'; h.lineWidth = 8; h.lineJoin = 'round';
  h.beginPath(); h.moveTo(24, 16); h.lineTo(104, 16); h.lineTo(70, 96); h.lineTo(104, 176); h.lineTo(24, 176); h.lineTo(58, 96); h.closePath(); h.stroke();
  h.fillStyle = '#ffd34d'; h.beginPath(); h.moveTo(42, 48); h.lineTo(86, 48); h.lineTo(64, 90); h.closePath(); h.fill();
  h.beginPath(); h.moveTo(64, 120); h.lineTo(92, 168); h.lineTo(36, 168); h.closePath(); h.fill();
  h.fillRect(12, 6, 104, 10); h.fillRect(12, 176, 104, 10);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.09), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(hc), transparent: true, depthTest: false, side: THREE.DoubleSide }));
  ring.renderOrder = 1300; G.add(ring);
  // schermata nera attorno alla testa mentre lo stage si prepara (prima si vedeva mezza stanza e mezzo stage)
  // nero di caricamento: un velo disegnato direttamente sull'immagine (non e' un oggetto nello spazio: nel visore la
  // sfera attorno alla testa lasciava vedere la stanza ai lati)
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false, fog: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float opacity; void main(){ gl_FragColor = vec4(0.0, 0.0, 0.0, opacity); }' }));
  dark.material.opacity = 0; Object.defineProperty(dark.material, 'opacity', { get() { return this.uniforms.opacity.value; }, set(v) { this.uniforms.opacity.value = v; } });
  dark.renderOrder = 1290; dark.visible = false; dark.frustumCulled = false;
  return { G, ring, dark, t: 0 };
})();
// lo stage scelto non e' ancora pronto (foto e modelli): finche' non lo e' si resta al buio
function stageBusy() {
  const envs = [[desertEnv, 'deserto'], [roofEnv, 'grattacielo'], [nightEnv, 'notte'], [snowEnv, 'neve'], [volcEnv, 'vulcano'], [seaEnv, 'mare'], [moonEnv, 'luna'], [stadiumEnv, 'stadio'], [stadiumNEnv, 'stadionotte'], [beachEnv, 'spiaggia']];
  for (const [e, m] of envs) if (mode === m && e && !e.skyLoaded) return true;
  if (panoPending > 0 && mode !== 'stanza' && mode !== 'arena') return true;   // lo sfondo 3D e' ancora in costruzione
  return mode === 'palestra' && gymEnv && !gymEnv.loaded;
}
// lo stage st deve ancora caricare foto e modelli (mai aperto prima)?
function stageCold(st) {
  const e = { deserto: desertEnv, grattacielo: roofEnv, notte: nightEnv, neve: snowEnv, vulcano: volcEnv, mare: seaEnv, luna: moonEnv, stadio: stadiumEnv, stadionotte: stadiumNEnv, spiaggia: beachEnv }[st];
  if (st === 'palestra') return !gymEnv || !gymEnv.loaded;
  return st in { deserto: 1, grattacielo: 1, notte: 1, neve: 1, vulcano: 1, mare: 1, luna: 1, stadio: 1, stadionotte: 1, spiaggia: 1 } && (!e || !e.skyLoaded);
}
function loadingBusy() {
  if (fighterLoading || sparLoading) return true;
  if (stageBusy()) return true;
  const envs = [[desertEnv, 'deserto'], [roofEnv, 'grattacielo'], [nightEnv, 'notte'], [snowEnv, 'neve'], [volcEnv, 'vulcano'], [seaEnv, 'mare'], [moonEnv, 'luna'], [stadiumEnv, 'stadio'], [stadiumNEnv, 'stadionotte'], [beachEnv, 'spiaggia']];
  for (const [e, m] of envs) if (mode === m && e && !e.skyLoaded) return true;
  if (mode === 'palestra' && gymEnv && !gymEnv.loaded) return true;
  return false;
}
function updateLoader(dt) {
  const busy = loadingBusy();
  if (!loader.G.parent) { scene.add(loader.G); scene.add(loader.dark); }
  // buio pieno mentre si prepara lo stage (o parte l'incontro / lo sparring); poi si apre in mezzo secondo
  loader.hold = Math.max(0, (loader.hold || 0) - dt);             // (resta nero almeno un attimo: niente lampi di stanza)
  const black = loader.hold > 0 || stageBusy() || ((fightStarting || sparLoading) && busy);
  const m = loader.dark.material;
  m.opacity = black ? 1 : Math.max(0, m.opacity - dt * 2);       // (il buio arriva subito: in dissolvenza per un attimo si vedeva la stanza)
  loader.dark.visible = m.opacity > 0.001;
  loader.glassT = Math.max(0, (loader.glassT || 0) - dt);
  loader.G.visible = busy || black || loader.glassT > 0;                 // (clessidra: anche solo per il pugile, senza schermo nero)
  // dove sei davvero: dalla matrice gia' calcolata della camera (nel visore getWorldPosition la ricalcolava male e la
  // sfera nera finiva lontana dalla testa: si vedeva un "muro" nero e la stanza tutt'intorno)
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  cam.matrixWorld.decompose(p, q, sc);
  if (!loader.G.visible) return;
  loader.G.position.copy(p).add(new THREE.Vector3(0, 0, -0.9).applyQuaternion(q)); loader.G.quaternion.copy(q);
  // la clessidra: ferma un attimo, poi si capovolge
  loader.t += dt; const k = (loader.t % 1.6) / 1.6;
  loader.ring.rotation.z = Math.floor(loader.t / 1.6) * Math.PI + (k > 0.7 ? (k - 0.7) / 0.3 * Math.PI : 0);
}

// Cupola di fondo: nel visore (realta' mista) lo "sfondo" della scena non viene disegnato e li' si vede la stanza
// vera (es. sopra le tribune dell'arena). Questa sfera scura, sempre attorno a te, copre ogni buco; gli stage la
// coprono con il loro cielo. Solo nello stage "la tua stanza" non c'e'.
const voidDome = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: { color: { value: new THREE.Color(0) } }, depthTest: false, depthWrite: false, fog: false,
  vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.9999, 1.0); }',
  fragmentShader: 'uniform vec3 color; void main(){ gl_FragColor = vec4(color, 1.0); }' }));
voidDome.material.color = voidDome.material.uniforms.color.value;
voidDome.renderOrder = -1000; voidDome.frustumCulled = false; voidDome.name = 'fondo nero';
scene.add(voidDome);
// Sfondo nero del visore: una sfera nera disegnata dal visore stesso (un "layer" WebXR), dietro al gioco.
// Quando il gioco si blocca un attimo (caricamenti), il visore mostra l'ultima immagine ferma come un pannello e fuori
// c'era la stanza; questa sfera invece la disegna il visore e resta tutt'intorno anche durante i blocchi.
let deferApply = 0;
const blackLayer = { layer: null, on: false, drawn: false, fb: null };
function setBlackLayer(on) {
  const xr = renderer.xr, session = xr.getSession();
  if (!session || !session.renderState.layers || on === blackLayer.on) return;
  try {
    const proj = session.renderState.layers[session.renderState.layers.length - 1];
    if (on && !blackLayer.layer) {
      const binding = xr.getBinding();
      if (!binding || !binding.createEquirectLayer) return;
      blackLayer.layer = binding.createEquirectLayer({ space: xr.getReferenceSpace(), viewPixelWidth: 16, viewPixelHeight: 16, layout: 'mono', radius: 0, isStatic: true });
      blackLayer.drawn = false; blackLayer.fails = 0;
    }
    // il layer appena creato e' vuoto (chiaro): si aggancia solo dopo averlo riempito di nero (se non ci riesce, dopo 4 tentativi lo aggancia comunque)
    blackLayer.want = on;
    if (on && !blackLayer.drawn && blackLayer.fails < 4) return;
    session.updateRenderState({ layers: on ? [blackLayer.layer, proj] : [proj] });
    blackLayer.on = on;
  } catch (e) { console.warn('layer nero', e); blackLayer.layer = null; }
}
function drawBlackLayer(frame) {                   // (va riempito di nero una volta, dentro un fotogramma del visore)
  if (!frame || !(blackLayer.on || blackLayer.want) || blackLayer.drawn || !blackLayer.layer) return;
  try {
    const gl = renderer.getContext(), sub = renderer.xr.getBinding().getSubImage(blackLayer.layer, frame);
    const prevFb = gl.getParameter(gl.FRAMEBUFFER_BINDING), cc = gl.getParameter(gl.COLOR_CLEAR_VALUE), sc = gl.isEnabled(gl.SCISSOR_TEST), cm = gl.getParameter(gl.COLOR_WRITEMASK);
    if (!blackLayer.fb) blackLayer.fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, blackLayer.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sub.colorTexture, 0);
    gl.disable(gl.SCISSOR_TEST); gl.colorMask(true, true, true, true);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFb); gl.clearColor(cc[0], cc[1], cc[2], cc[3]);
    gl.colorMask(cm[0], cm[1], cm[2], cm[3]); if (sc) gl.enable(gl.SCISSOR_TEST);
    blackLayer.drawn = true;
  } catch (e) { blackLayer.fails = (blackLayer.fails || 0) + 1; console.warn('layer nero', e); }
}
function updateDome() {
  voidDome.visible = mode !== 'stanza';
  if (!voidDome.visible) return;
  voidDome.material.color.copy(scene.background && scene.background.isColor ? scene.background : new THREE.Color(0));
}
function tick(dt, frame) {
  if (deferApply > 0 && --deferApply === 0) applyMode();          // lo stage nuovo si prepara solo quando il nero e' gia' su
  updateLoader(dt); updateDome();
  if (renderer.xr.isPresenting) {
    if (blackLayer.layer && blackLayer.layer.needsRedraw) blackLayer.drawn = false;
    // solo durante il caricamento (finito quello, sotto c'e' lo stage col suo cielo)
    setBlackLayer(deferApply > 0 || loader.dark.material.opacity > 0.99); drawBlackLayer(frame);
  }
  if (ringObj && ringObj.visible) updateRopes(ringObj, Object.values(player.gloves).filter(g => g.mesh.visible).map(g => g.center), dt);   // le corde cedono sotto le mani
  if (renderer.xr.isPresenting && !placed && xrFrames > 15) {   // aspetta che il tracciamento sia stabile
    const cam = renderer.xr.getCamera();
    const p = new THREE.Vector3(); cam.getWorldPosition(p);
    {
      const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
      placeArena(p, e.y); placed = true;
      if (game.phase === 'menu' && !menuVisible() && !tour && !surv && !fightStarting && !sparLoading) showMainMenu();   // (non mentre si carica il partner dello sparring)
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
    // nessuna scansione dopo ~2 s: se qui il pavimento e' stato sistemato a mano di recente, si riusa (se poi arriva la
    // scansione della stanza vince quella)
    if (floorGate === 'wait' && xrFrames > 120 && floorSource === 'visore' && floorSpace) {
      const sv = savedFloor();
      if (sv) { setFloor(sv.y, 'salvato'); game.message = t('floor_remembered'); }
      else floorSource = 'visore';
    }
    // nessuna scansione dopo ~8 s (la scansione della stanza puo' arrivare dopo qualche secondo): si chiede come sistemare il pavimento
    if (floorGate === 'wait' && xrFrames > 480 && !floorOK()) {
      openFloorMenu(false);
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
  if (needRecenter > 0 && renderer.xr.isPresenting && placed && --needRecenter === 0) { reopenWait = 0; reopenPending = true; }
  // visore tolto e rimesso: si aspetta che la testa sia di nuovo a un'altezza credibile e ferma per mezzo secondo
  // (subito dopo il visore puo' dare una posizione a terra o ancora non agganciata: prima il ring veniva
  // riallineato su quella posizione sbagliata e finiva fuori). Poi, se serve, si riallinea; i menu tornano davanti
  // a te qualche fotogramma DOPO (prima usavano ancora la posizione di prima del riallineamento)
  if (reopenPending && renderer.xr.isPresenting) {
    const hy = player.head.y - floorY, still = lastHeadR && player.head.distanceTo(lastHeadR) < 0.01;
    reopenWait = hy > 0.9 && hy < 2.3 && still ? reopenWait + dt : 0;
    if (reopenWait > 0.5) {
      reopenPending = false;
      if (recenterAlways || headOutOfRing(0.4)) recenterPlayer();
      reopenFrames = 4;
    }
  }
  if (reopenFrames > 0 && --reopenFrames === 0) reopenMenus();
  lastHeadR = (lastHeadR || new THREE.Vector3()).copy(player.head);
  if (orbit) orbit.update();
  player.update(dt);
  // puntatori: raggi da mani e controller quando c'e' il menu aperto (puntare = toccare col guantone)
  const menuOpen = menuVisible() || pause.group.visible || skipBtn.group.visible || introMenu.group.visible || (trophyMenu.group.visible && girl.cupState !== 'held');   // (solo menu principale e pausa, non i pannellini dell'incontro)
  const rays = [];
  if ((menuOpen || mtab.host) && renderer.xr.isPresenting && frame) {
    const ref = renderer.xr.getReferenceSpace();
    for (const src of renderer.xr.getSession().inputSources) {
      if (pointerHand !== 'both' && src.handedness !== pointerHand) continue;   // solo la mano scelta
      if (!player.fist[src.handedness]) continue;                               // raggio solo a pugno chiuso / presa tenuta
      const pose = src.targetRaySpace && frame.getPose(src.targetRaySpace, ref);
      if (!pose) continue;
      const m = _rayM.fromArray(pose.transform.matrix);
      const sel = !!selHeld.get(src), click = sel && !selPrev.get(src);
      rays.push({ o: new THREE.Vector3().setFromMatrixPosition(m), d: new THREE.Vector3(0, 0, -1).transformDirection(m), hit: null, sel, click, hand: src.handedness });
    }
  }
  for (const src of selHeld.keys()) selPrev.set(src, selHeld.get(src));
  setRays(rays, player.head);
  updateMenuTab(dt, menuOpen ? [] : rays);          // (con un menu aperto la linguetta non serve)
  if (intro) updateIntro(dt);
  else {
    if (renderer.xr.isPresenting || sim) calibrateByHand(dt);
    if (mike) updatePause(dt);
  }
  if (cpu) {
    for (const g of Object.values(player.gloves)) g.mesh.visible = false;      // guardi soltanto
    if (!game.paused) cpu.update(dt);                          // (in pausa l'incontro si ferma)
    const st = i => ({ points: cpu.pts[i], dmg: cpu.dmg[i], hits: cpu.hits[i], blocks: 0, dodges: 0, kd: cpu.kdN[i], penalties: cpu.pen[i] });
    board.draw({ flags: cpuIds().map(id => id && ROSTER[id] && ROSTER[id].flag), round: cpu.round, rounds: cpu.rounds, level: t('l_' + level), time: Math.max(0, cpu.rest > 0 ? cpu.rest : cpu.time), running: cpu.delay <= 0 && !cpu.kd, player: st(0), mike: st(1),
      names: cpuNames().map(n => n.toUpperCase()), message: t('cpu_vs', { a: cpuNames()[0], b: cpuNames()[1] }), diag: '' });
    // "vai al risultato": alla tua sinistra, girato verso di te (davanti copriva l'incontro)
    if (skipOpen > 0) {
      skipOpen -= dt;
      if (skipOpen < 2.3) skipOpen = 0;                  // (il pulsante separato non c'e' piu': "vai al risultato" sta nel menu di pausa, dal tabellone)
    }
    if (skipBtn.update(dt, []) === 'skip') { sfx.menuBlip(); cpu.skipped = true; cpu.finish(true); }
    if (cpu.rest > 0) {                               // riposo: ragazza quando sono seduti tutti e due; pulsante "prossimo round"
      if (!cpuGirl && mike.atGoal && cpuB && cpuB.atGoal) { cpuGirl = true; girl.start(arena, ringSize, cpu.round + 1, player.head); }
      for (const [f, st] of [[mike, stool], [cpuB, stoolB]]) if (f && f.atGoal) st.position.copy(f.root.position).addScaledVector(f.forward(), -0.07);
      nextMenu.setTitle(t('next_title', { n: cpu.round + 1, s: Math.ceil(cpu.rest) }));
      if (nextMenu.update(dt, []) === 'next') { sfx.menuBlip(); cpu.rest = 0.001; }
    }
    // incontro deciso (KO, KO tecnico, squalifica o ai punti allo scadere): come nei tuoi incontri il gong, il pubblico, lo
    // speaker annuncia il vincitore, lui esulta e ci sono i coriandoli. Nella finale del torneo la ragazza gli porta la
    // coppa. Solo se premi "vai al risultato" si salta tutto.
    if (cpu.winner !== null && !cpu.award && !cpu.skipped) startCpuCeremony();
    if (cpu.award) {
      const A = cpu.award; A.t += dt;
      if (A.final && !A.girl && A.reactAt != null && A.t - A.reactAt > 0.6) {
        A.girl = true; A.W.root.updateMatrixWorld(true);
        girl.trophy(arena, ringSize, player.head, { pos: A.W.root.getWorldPosition(new THREE.Vector3()), fwd: A.W.forward(), head: A.W.headCenter() });
      }
      // finita la cerimonia: lo speaker ha finito di parlare e l'incontro e' chiuso (almeno qualche secondo di festa)
      if (cpu.done && (cpu.skipped || (A.t > (A.final ? 9 : 6) && !sfx.voiceBusy() && A.reactAt != null && A.t - A.reactAt > 6) || A.t > 24)) { if (cpu.skipped) sfx.stopVoices(); girl.stop(); party.hideAll(); endCpuWatch(); }
    } else if (cpu.done) endCpuWatch();
  } else if (game.phase === 'sparring') {
    if (!game.paused) { mike.update(dt, player); const ev = mike.events.slice(); mike.events.length = 0; sparSounds(ev); spar.update(dt, player, ev); }
  } else if (game.phase === 'training') {
    const cam_ = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    if (trainKind === 'corda') {                          // corda: niente guantoni, ci sono le fasce e le manopole
      for (const g of Object.values(player.gloves)) g.mesh.visible = false;
      if (!game.paused) ropeTr.update(dt, player, cam_, arena.position.y);
    } else if (trainKind === 'spago') { if (!game.paused) slipTr.update(dt, player, cam_); }
    else if (trainKind === 'pera' || trainKind === 'doppio') { if (!game.paused) trainer().update(dt, player, cam_); }
    else if (!game.paused) bagTr.update(dt, player, cam_);
  } else if (mike && game.phase !== 'watch') {
    mike.learnOn = game.phase === 'fight' && !game.paused;      // impara solo mentre si combatte
    mike.update(dt, player);
    handleEvents();
    updateGame(dt);
    if (game.phase === 'menu' && !tour && !surv) previewFighter();
    else if (mike.previewing) placeMikeStart();                                 // si esce dal menu: torna nel ring
  }
  flash.update(dt);
  // nei menu (prima che cominci l'incontro) il tabellone dell'incontro non si vede
  if (game.phase === 'menu') { if (board.mesh.visible) { board.mesh.visible = false; board.menuHid = true; } }
  else if (board.menuHid) { board.menuHid = false; if (game.phase !== 'training' && game.phase !== 'sparring') board.mesh.visible = true; }
  followBoard(dt); followMenus(dt);
  outOfRing();
  countdown.update(dt);
  sweat.update(dt);
  girl.update(dt, player.head);
  if (girl.trophyMode && game.phase === 'end') girl.updateCup(dt, player.gloves, player.fist, arena.position.y, (p, v) => sfx.ballHit(p, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera, 'post', v * 0.7));
  if (stool.visible && mike && mike.atGoal) {         // lo sgabello esattamente sotto Mike seduto
    stool.position.copy(mike.root.position).addScaledVector(mike.forward(), -0.07);
  }
  if (party.update(dt)) sfx.firework();
  if (arenaEnv && arenaEnv.group.visible) { arenaEnv.update(dt); sfx.crowdLevel(arenaEnv.excite); }
  if (desertEnv && desertEnv.group.visible) desertEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  if (stadiumEnv && stadiumEnv.group.visible) stadiumEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  if (stadiumNEnv && stadiumNEnv.group.visible) stadiumNEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  if (snowEnv && snowEnv.group.visible) {
    let h = renderer.domElement.height;
    if (renderer.xr.isPresenting) { const bl = renderer.xr.getBaseLayer && renderer.xr.getBaseLayer(); h = bl ? (bl.framebufferHeight || bl.textureHeight || 1800) : 1800; }
    snowEnv.setDrawHeight(h);
    snowEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  }
  if (moonEnv && moonEnv.group.visible) {
    let h = renderer.domElement.height;
    if (renderer.xr.isPresenting) { const bl = renderer.xr.getBaseLayer && renderer.xr.getBaseLayer(); h = bl ? (bl.framebufferHeight || bl.textureHeight || 1800) : 1800; }
    moonEnv.setDrawHeight(h); moonEnv.setEye(player.head.y - floorY);
    moonEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  }
  if (seaEnv && seaEnv.group.visible) {
    const cam_ = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    key.intensity = 1.9 * seaEnv.update(dt, cam_.getWorldPosition(new THREE.Vector3()));   // la luce tremola come sotto le onde
    if ((seaEnv.puffT = (seaEnv.puffT ?? 3) - dt) <= 0) {           // ogni tanto uno sbuffo di bolle da una presa d'aria
      seaEnv.puffT = 4 + Math.random() * 6;
      sfx.bubbles(seaEnv.group.localToWorld(seaEnv.vents[(Math.random() * seaEnv.vents.length) | 0].clone()), cam_);
    }
  }
  if (volcEnv && volcEnv.group.visible) {
    let h = renderer.domElement.height;
    if (renderer.xr.isPresenting) { const bl = renderer.xr.getBaseLayer && renderer.xr.getBaseLayer(); h = bl ? (bl.framebufferHeight || bl.textureHeight || 1800) : 1800; }
    volcEnv.setDrawHeight(h);
    volcEnv.setEye(player.head.y - floorY);                // la piana combacia con lo sfondo alla tua altezza degli occhi
    volcEnv.update(dt, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera);
  }
  if (gymEnv && gymEnv.group.visible) {             // l'inserviente ogni tanto guarda te (allenamento) o il match (a meta' tra voi due)
    const ch = (renderer.xr.isPresenting ? renderer.xr.getCamera() : camera).getWorldPosition(new THREE.Vector3());
    const w = game.phase === 'training' || !mike || !mike.root.visible ? ch : ch.lerp(mike.root.getWorldPosition(new THREE.Vector3()).setY(ch.y), 0.5);
    gymEnv.update(dt, w);
  }
  for (const re of [roofEnv, nightEnv]) if (re && re.group.visible) {
    const hp = re.update(dt);
    if (hp) sfx.heli(hp, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera); else sfx.heliStop();
  }
  if (beachEnv && beachEnv.group.visible) beachEnv.update(dt, h => sfx.wave(0.2 + 0.25 * h), p => sfx.gull(p, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera));
  rayPointers.update(rays, menuOpen);               // (il raggio si vede solo coi menu aperti)
  player.endFrame();
  renderer.render(scene, camera);
}

// Pausa: tutte e due le braccia alzate sopra la testa per 1,2 s (in combattimento non succede),
// oppure A/B/X/Y sui controller. Nel menu i pulsanti si premono tenendoci sopra un guantone.
function openPause(end = false, watch = false) {
  game.paused = !end; mike.enabled = false;
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  const e = new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ');
  const r = game.result;
  pause.open(player.head, e.y, end, end && r ? { win: r.winner === 'player' ? true : r.winner === 'mike' ? false : null, how: r.how } : null,
    game.phase === 'training' || game.phase === 'sparring', watch);     // in allenamento anche "Cambia allenamento"; guardando un incontro: esci / continua a guardare
  if (!end) sfx.suspend(true);                    // tutto l'audio si ferma (anche lo speaker a meta' frase)
}
function closePause() {
  if (headOutOfRing() && game.phase !== 'watch') recenterPlayer();          // ripresa da fuori dal ring: torni nel tuo angolo
  game.paused = false; pause.close(); game.outRing = false;
  sfx.suspend(false);
  mike.enabled = (game.phase === 'fight' && !game.kd) || game.phase === 'sparring';
}
try { player.vibrate = localStorage.getItem('hb-vibe') !== 'no'; } catch (e) {}   // vibrazione dei controller (di serie: si')
const menuChoices = () => ['s:' + stageChoice, 'f:' + oppChoice, 'wa:' + watchA, 'wb:' + watchB, 'l:' + level, 'r:' + rounds, 'd:' + roundSecs,
  threeKO ? 'k:si' : 'k:no', oneKO ? 'ko:si' : 'ko:no', 'tz:' + tourSize, 'tw:' + towerSize, 'g:' + lang, 'pt:' + pointerHand, player.vibrate === false ? 'vb:no' : 'vb:si', 'pf:' + playerFlag];
function menuYaw() {
  const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
  return new THREE.Euler().setFromQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
}
// rimette davanti alla testa i menu aperti (dopo che il visore ha ricalcolato la posizione)
function reopenMenus() {
  const yaw = menuYaw();
  for (const m of MENUS) if (m.group.visible) m.open(player.head, yaw);
  if (tower.group.visible) { tower.open(player.head, yaw); setTourButtons(tourBtns.buttons.find(b => b.id === 'tgo').tk, tourBtns.buttons.find(b => b.id === 'tquit').g.visible, yaw, tourBtns.buttons.find(b => b.id === 'tquit').tk, tourSkipRd); }
  else if (bracket.group.visible) { bracket.open(player.head, yaw); setTourButtons(tourBtns.buttons.find(b => b.id === 'tgo').tk, tourBtns.buttons.find(b => b.id === 'tquit').g.visible, yaw, tourBtns.buttons.find(b => b.id === 'tquit').tk, tourSkipRd); }
}
// i menu seguono l'altezza della tua testa: aperti mentre eri accovacciato (calibrando il pavimento con la mano) restavano
// per terra. Se la testa resta a un'altra altezza (piu' di 30 cm) per mezzo secondo, si rimettono davanti agli occhi
let menuY = null, menuMoveT = 0;
function followMenus(dt) {
  if (!menuVisible() || floorGate === 'ask' || floorGate === 'force') { menuY = null; menuMoveT = 0; return; }
  const y = player.head.y;
  if (menuY === null) { menuY = y; return; }
  if (Math.abs(y - menuY) > 0.3) {
    menuMoveT += dt;
    if (menuMoveT > 0.5) { menuMoveT = 0; menuY = y; reopenMenus(); }
  } else menuMoveT = 0;
}
function closeMenus() { menuY = null; trophyMenu.close(); for (const m of MENUS) m.close(); bracket.close(); tower.close(); tourBtns.close(); }
function openMenu(m) { closeMenus(); m.select(menuChoices()); m.open(player.head, menuYaw()); }
// ---- allenamento al sacco: in palestra, il ring sparisce e il sacco pende davanti a te
let bagTr = null, ropeTr = null, speedTr = null, deTr = null, slipTr = null, trainKind = 'sacco';
const trainer = () => ({ corda: ropeTr, pera: speedTr, doppio: deTr, spago: slipTr })[trainKind] || bagTr;
// la palestra si sposta e gira perche' il punto libero finisca sul tuo attrezzo. Nel visore, se lo stage non e' ancora caricato,
// applyMode arriva qualche fotogramma dopo startTraining (e la palestra non c'e' ancora): si rifa' anche li' (prima restava
// com'era, col ring senza corde e l'attrezzo in mezzo)
function applyGymTraining() {
  if (!gymEnv || game.phase !== 'training' || trainKind === 'spago') return;
  gymEnv.setTraining(true, playerZ - 0.85, trainKind);
  gymEnv.onSay = (k, p) => { sfx.voiceAt('j_' + k, p, renderer.xr.isPresenting ? renderer.xr.getCamera() : camera); return sfx.voiceDur('j_' + k); };
}
function startTraining(kind = 'sacco') {
  trainKind = kind;
  closeMenus();
  setStage('palestra');
  // cambiando allenamento il precedente va spento (restavano in scena sacco, pera, corda... tutti insieme)
  for (const o of [bagTr, ropeTr, speedTr, deTr, slipTr]) if (o && o.group.visible) o.stop();
  if (kind === 'sacco' && !bagTr) bagTr = new BagTraining(arena);
  if (kind === 'corda' && !ropeTr) ropeTr = new RopeTraining(arena, scene);
  if (kind === 'pera' && !speedTr) speedTr = new SpeedBagTraining(arena);
  if (kind === 'spago' && !slipTr) slipTr = new SlipLineTraining(arena);
  if (kind === 'doppio' && !deTr) { deTr = new DoubleEndTraining(arena); deTr.onTaken = k => flash.hit(0.4 + 0.6 * k); }
  newMatch(); game.phase = 'training'; game.message = '';
  setPeople(false); if (ringObj) ringObj.visible = false; board.mesh.visible = false; stool.visible = false;
  mike.enabled = false;
  const headY = arena.worldToLocal(player.head.clone()).y;
  if (kind === 'spago') {                        // spago: sul ring, in mezzo (la palestra resta com'e' negli incontri)
    if (ringObj) ringObj.visible = true;
    slipTr.start(playerZ, headY, ringSize);
    if (gymEnv) gymEnv.setTraining(false);
    if (headOutOfRing()) recenterPlayer();
    return;
  }
  if (kind === 'pera' || kind === 'doppio') trainer().start(playerZ, headY); else trainer().start(playerZ);
  applyGymTraining();
  if (headOutOfRing()) recenterPlayer();
}
function stopTraining() {
  const tr_ = trainer();
  if (!tr_ || !tr_.group.visible) return;
  tr_.stop(); if (ringObj) ringObj.visible = true; board.mesh.visible = true;
  if (gymEnv) gymEnv.setTraining(false);
}
// suoni dei colpi nello sparring (come nell'incontro, ma senza pubblico ne' danni)
function sparSounds(ev) {
  for (const e of ev) {
    if (e.type === 'playerHit') { sfx.punchHit(Math.min(1.3, 0.6 + (e.speed || 3) / 6)); player.pulse(e.side, 1.0, 70); }
    else if (e.type === 'mikeBlocked') { sfx.punchBlock(); player.pulse(e.side, 0.4, 40); }
    else if (e.type === 'mikeThrows') sfx.whoosh();
    else if (e.type === 'mikeHit') { sfx.punchHit(e.zone === 'body' ? 0.9 : 1.2, false); flash.hit(e.zone === 'body' ? 0.3 : 0.5); player.pulse('left', 0.6, 80); player.pulse('right', 0.6, 80); }
    else if (e.type === 'playerBlocked') { sfx.punchBlock(); player.pulse(e.side, 0.6, 50); }
  }
}
// ---- sparring: il partner (caschetto, alto come te) prende il posto dell'avversario sul ring della palestra
const PARTNER = { id: 'partner', name: 'Partner', glb: 'assets/partner.glb?v=20261010190023', evenSkin: false,
  band: { bg: '#1a1a1c', line: '#c4122a', text: '#f2ece0', label: 'SPARRING' } };
let spar = null, partner = null, savedMike = null, sparLoading = false;
async function startSparring(kind, defKinds = null) {
  closeMenus();
  setStage('palestra');
  if (!partner) {
    if (sparLoading) return; sparLoading = true;
    try {
      const gltf = await loadMikeGLTF(PARTNER.glb, () => {});
      partner = new Mike(gltf, scene, 'normale', PARTNER); partner.bounds = keepInRing;
    } catch (e) { console.warn('partner', e); sparLoading = false; showMainMenu(); return; }
    sparLoading = false;
    closeMenus();                                   // (se nel frattempo si fosse aperto un menu)
  }
  if (!spar) spar = new Sparring(scene);
  if (mike !== partner) { savedMike = mike; savedMike.enabled = false; savedMike.root.visible = false; mike = partner; window.mike = mike; }
  newMatch(); game.phase = 'sparring'; game.message = '';
  mike.setLevel('normale');
  const k = THREE.MathUtils.clamp((arena.worldToLocal(player.head.clone()).y + 0.15) / 1.68, 0.85, 1.25);   // 15 cm piu' alto di te (in guardia, gambe piegate, sembrava piu' basso)
  mike.root.scale.setScalar(k);
  mike.cfg.stalkDist *= k; mike.cfg.attackDist = (mike.cfg.attackDist || 0.7) * k;
  if (lastPlace) placeArena(lastPlace.head, lastPlace.yaw); else placeArena(new THREE.Vector3(0, 1.65, 0), 0);
  mike.root.visible = true; mike.enabled = true; board.mesh.visible = false; stool.visible = false;
  mike.reachExtra = kind === 'difesa' ? 0.03 : 0;               // in difesa un filo piu' lontano (ma il colpo arriva al viso)
  mike.lightHits = true;                                         // sparring: contano anche i colpi leggeri
  mike.footwork = kind === 'libero'; mike.fw = null;            // negli esercizi resta davanti a te
  mike.quickRecover = kind === 'difesa';                          // in difesa: braccio disteso -> rientra subito, alla stessa velocita'
  spar.defKinds = defKinds; spar.defType = defType; spar.defGuard = defGuard;
  if (headOutOfRing()) recenterPlayer();
  const eye = new THREE.Vector3(0, 1.6, playerZ).applyMatrix4(arena.matrixWorld);
  spar.start(kind, mike, arena, new THREE.Vector3(ringSize / 2 + 0.15, 1.95, -ringSize / 2 - 0.1),
    new THREE.Vector3(-0.55, 1.2, playerZ + 0.05), eye);
}
function stopSparring() {
  if (!spar || !spar.active) return;
  spar.stop();
  mike.enabled = false; mike.root.visible = false; mike.root.scale.setScalar(1); mike.reachExtra = 0; mike.quickRecover = false; mike.lightHits = false; mike.footwork = true;
  if (savedMike) { mike = savedMike; window.mike = mike; savedMike = null; }
  board.mesh.visible = true;
}
function showMainMenu() {
  lostWatch = false;
  sfx.stopVoices();                                // uscendo (anche a meta' presentazione) lo speaker tace
  stopTraining();
  stopSparring();
  if (greetPending) { greetPending = false; setTimeout(() => sfx.voiceNow('title'), 500); }   // "Home Boxing!" all'ingresso
  newMatch(); game.phase = 'menu'; game.message = t('menu');
  setPeople(false); tour = null; surv = null;
  mike.enabled = false; pause.close();
  openMenu(rootMenu);
}
// stage dell'incontro: quello scelto, oppure a caso tra gli stage virtuali (nel torneo senza ripetere finche' si puo')
const VIRTUAL = ['arena', 'spiaggia', 'grattacielo', 'notte', 'deserto', 'neve', 'vulcano', 'mare', 'luna', 'stadio', 'stadionotte', 'palestra'].filter(v => v !== 'mare' || SEA_READY);
function pickStage() {
  if (stageChoice !== 'random') return stageChoice;
  let pool = VIRTUAL;
  const run = tour || surv;
  if (run) {
    run.stages = run.stages || [];
    const fresh = VIRTUAL.filter(v => !run.stages.includes(v));
    pool = fresh.length ? fresh : VIRTUAL.filter(v => v !== run.stages[run.stages.length - 1]);
  } else pool = VIRTUAL.filter(v => v !== mode).concat(VIRTUAL.length > 1 ? [] : VIRTUAL);
  const st = pool[Math.floor(Math.random() * pool.length)] || VIRTUAL[0];
  if (run) run.stages.push(st);
  return st;
}
function setStage(st) {
  if (st === mode) return;
  // stage da caricare: prima tutto nero (subito, gia' in questo fotogramma), poi parte il caricamento
  if (stageCold(st)) {
    loader.dark.material.opacity = 1; loader.dark.visible = true; loader.hold = 0.6;
    if (renderer.xr.isPresenting) { mode = st; setBlackLayer(true); deferApply = 3; placed = false; xrFrames = 16; return; }
  }
  mode = st; applyMode(); placed = false; xrFrames = 16;
}
let fightStarting = false;
async function startFight(opponentId) {
  party.stop(); closeMenus(); fightStarting = true;
  if (mike && opponentId !== fighterId) mike.root.visible = false;   // il pugile di prima non si vede mentre arriva il nuovo
  setStage(pickStage());
  await setFighter(opponentId);
  girl.pick().catch(e => console.warn('ragazza del ring', e));   // una ragazza a caso, la stessa per tutto l'incontro
  fightStarting = false; closeMenus();
  mike.setRamp(rampNow());
  newMatch();
  if (headOutOfRing(0)) recenterPlayer();
  startPresentation();
}
// quanto e' cresciuta la difficolta': 0 = il livello scelto, 1 = il livello sopra (non lo raggiunge mai del tutto)
function rampNow() {
  if (tour) return Math.min(0.6, tour.round / Math.max(1, tour.rounds - 1) * 0.6);                                   // finale: 60% verso il livello sopra
  if (surv) return surv.order.length > 1 ? 0.8 * surv.idx / (surv.order.length - 1) : 0;   // ultimo piano: 80%
  return 0;
}
// forza dei pugni con la crescita
function powerNow() {
  const names = Object.keys(POWER), nx = POWER[names[Math.min(names.length - 1, names.indexOf(level) + 1)]];
  return POWER[level] + (nx - POWER[level]) * rampNow();
}
// ---- sopravvivenza: la torre prima di ogni incontro, la salita dopo ogni vittoria
function startSurvival() {
  const order = [];
  while (order.length < towerSize) {
    const pool = [...FIGHTER_IDS];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    order.push(...pool);
  }
  order.length = towerSize;
  surv = { order, idx: 0, state: 'next', stages: [] };
  showTowerNext();
}
function showTowerNext() {
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw();
  tower.open(player.head, yaw);
  tower.show(surv, t('sv_next', { n: surv.idx + 1, b: FIGHTERS[surv.order[surv.idx]].name.toUpperCase() }), surv.idx === 0 && !surv.introDone);   // la prima volta scorre dalla cima
  surv.introDone = true;
  setTourButtons('tr_fight', true, yaw, 'sv_quit');
}
function showTowerAfter() {
  girl.stop(); trophyMenu.close();
  const res = game.result || {};
  let youWon = res.winner === 'player';
  if (res.winner === 'pari') youWon = game.player.hits >= game.mike.hits;
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw(), opp = FIGHTERS[surv.order[surv.idx]].name.toUpperCase();
  tower.open(player.head, yaw);
  if (!youWon) {
    surv.state = 'lost';
    tower.show(surv, t('sv_lost', { b: opp, n: surv.idx + 1 }));
    sfx.announce(['tour_out']);
    setTourButtons('tr_menu', false, yaw);
    return;
  }
  const from = surv.idx, top = from + 1 >= surv.order.length;
  surv.idx = from + 1;
  tower.climb(surv, from, top ? t('sv_champ') : t('sv_won', { b: opp }), () => {
    if (!top) { showTowerNext(); return; }
    sfx.advance(true); sfx.announce(['tour_champ']);
    party.start(tower.group.position.clone().add(new THREE.Vector3(0, 0.45, 0)), [0xffc928, 0xffffff, 0x6a1f8a]);
    sfx.cheer('applauso', 1); sfx.cheer('boato', 0.9);
    setTourButtons('tr_menu', false, yaw);
  });
  setTimeout(() => sfx.climb(top ? 2.4 : 1.7, top), 120);
}
// ---- torneo: tabellone prima di ogni incontro e dopo (chi passa il turno), coppa alla fine
function showBracketNext() {
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw();
  bracket.open(player.head, yaw);
  const opp = tour.opponent();
  bracket.showNext(tour, t('tr_next', { round: bracket.roundName(tour.round), b: FIGHTERS[opp].name.toUpperCase() }));
  setTourButtons('tr_fight', true, yaw);
}
let tourSkipRd = false;                              // il tasto "salta il turno" e' visibile (solo se restano almeno due incontri da guardare nel turno)
function setTourButtons(goKey, showQuit, yaw = menuYaw(), quitKey = 'tr_quit', skipRound = false) {
  tourSkipRd = skipRound;
  const go = tourBtns.buttons.find(b => b.id === 'tgo'), q = tourBtns.buttons.find(b => b.id === 'tquit'), ex = tourBtns.buttons.find(b => b.id === 'texit'), sr = tourBtns.buttons.find(b => b.id === 'tskiprd');
  go.tk = goKey; q.tk = quitKey; q.g.visible = showQuit;
  ex.g.visible = goKey === 'tr_watch';             // guarda / salta: in piu' si puo' anche uscire dal torneo
  q.color = quitKey === 'tr_quit' || quitKey === 'sv_quit' ? 0x7a2a2a : 0x3a4254;
  q.base.material.color.setHex(q.color); q.color0 = q.color;
  if (goKey !== 'tr_watch') tourStep = goKey === 'tr_fight' ? 'next' : 'end';
  sr.g.visible = !!skipRound && goKey === 'tr_watch';
  const vis = [ex, q, sr, go].filter(b => b.g.visible), gap = 0.03;       // centrati, uno accanto all'altro
  let x = -(vis.reduce((a, b) => a + b.w, 0) + gap * (vis.length - 1)) / 2;
  for (const b of vis) { b.g.position.x = x + b.w / 2; x += b.w + gap; }
  tourBtns.relabel();
  // sotto il tabellone
  const onTower = tower.group.visible, p = (onTower ? tower.group : bracket.group).position, dd = onTower ? 1.25 : 1.05;
  tourBtns.open(new THREE.Vector3(p.x + Math.sin(yaw) * dd, p.y - (onTower ? 0.8 : bracket.halfH() + 0.07), p.z + Math.cos(yaw) * dd), yaw, onTower ? 1.0 : 0.95, 0.0);
  tourBtns.group.rotation.set(0, yaw, 0);
}
let tourStep = 'next', pending = null, cpu = null, cpuB = null, skipOpen = 0, bruisesB = null, cpuGirl = false;
function showBracketAfter() {
  girl.stop(); trophyMenu.close();                       // la ragazza e la coppa spariscono quando appare il tabellone
  const res = game.result || {};
  let youWon = res.winner === 'player';
  if (res.winner === 'pari') youWon = game.player.hits >= game.mike.hits;     // pari: passa chi ha colpito di piu'
  if (!youWon && tour.round < tour.rounds - 1) { showLost(); return; }
  const cm = youWon ? tour.cpuMatches() : [];
  if (!cm.length) { advanceRound(youWon, {}); return; }
  // hai vinto: sul tabellone passi subito tu, poi uno per uno gli altri incontri del turno (da guardare o saltare),
  // poi il tuo prossimo avversario. Prima se ne poteva guardare uno solo e il resto del turno si chiudeva da solo
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw(), j = tour.ent[tour.round].indexOf(0) & ~1;
  specForced = { [j]: 0 }; tour.forced = specForced; tour.forcedRound = tour.round; specQueue = cm;
  bracket.open(player.head, yaw);
  setTimeout(() => sfx.advance(false), 300);
  bracket.showResult(tour, j, 0, t('tr_adv', { round: bracket.roundName(tour.round) }), () => setTimeout(() => { if (bracket.group.visible) specChoice(); }, 700));
}
// hai perso (non in finale): il tuo avversario passa, tu hai la croce; il turno resta aperto, cosi' con "guarda gli
// altri" vedi anche gli incontri che mancano del tuo turno (prima il turno si chiudeva subito a caso)
let lostWatch = false;
function showLost() {
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw(), opp = tour.opponentIndex(), j = tour.ent[tour.round].indexOf(0) & ~1;
  specForced = { [j]: opp }; tour.forced = specForced; tour.forcedRound = tour.round;
  bracket.open(player.head, yaw);
  sfx.announce(['tour_out']);
  bracket.showResult(tour, j, opp, t('tr_lost', { b: tour.p[opp].name.toUpperCase(), round: bracket.roundName(tour.round) }), () => {
    lostWatch = true; setTourButtons('tr_watch_rest', true, yaw, 'tr_menu');
  });
}
// un incontro tra due personaggi veri della CPU in questo turno: guardarlo o andare avanti
function showCpuChoice() {
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw(), { cm } = pending;
  bracket.open(player.head, yaw);
  bracket.showCpu(tour, cm.j, t('tr_cpu', { round: bracket.roundName(tour.round), a: tour.p[cm.a].name.toUpperCase(), b: tour.p[cm.b].name.toUpperCase() }));
  tourStep = 'choice';
  setTourButtons('tr_watch', true, yaw, 'tr_continue');
}
// guardi l'incontro: i due pugili combattono nel ring (di lato rispetto a te), tu senza guantoni
async function startCpuWatch() {
  const { cm } = pending;
  const idA = pending.arcade ? pending.a : tour.p[cm.a].id, idB = pending.arcade ? pending.b : tour.p[cm.b].id;
  party.stop(); closeMenus(); fightStarting = true; game.phase = 'watch';
  if (!pending.arcade) setStage(pickStage());        // torneo: anche gli incontri che guardi cambiano stage (con "a caso")
  await setFighter(idA);
  if (mike) mike.root.visible = false;               // (si vede solo quando e' pronto anche l'altro: prima compariva davanti a te)
  const gltf = await loadMikeGLTF(FIGHTERS[idB].glb, () => {});
  cpuB = new Mike(gltf, scene, level, FIGHTERS[idB]); cpuB.root.visible = false;
  if (bruises) bruises.reset(); bruisesB = new Bruises(cpuB.model);   // lividi di tutti e due, da zero
  // da spettatore guardi da fuori: appena oltre le corde, di fronte al ring (nella tua stanza no: lo stage e' la stanza)
  if (mode !== 'stanza' && ringSize) recenterPlayer(ringSize / 2 + 0.25);   // (a pochi centimetri dalle corde)
  fightStarting = false;
  mike.bounds = keepInRing; cpuB.bounds = keepInRing;   // tu guardi come se non ci fossi: si muovono solo nel ring
  const zc = mode !== 'stanza' ? 0 : -Math.min(0.6, ringSize / 2 - 0.9), half = Math.min(0.95, ringSize / 2 - 0.6);   // (da fuori: al centro)
  const place = (f, x) => { f.root.position.set(x, 0, zc).applyMatrix4(arena.matrixWorld); f.root.visible = true; };
  place(mike, -half); place(cpuB, half);           // ognuno dal suo lato: l'incontro comincia dall'inizio
  setPeople(true);
  // presentazione completa come nei tuoi incontri: angolo, descrizione (quella del pugile o quella comune per i meno noti), nome
  // (i due pugili meno noti non dicono mai la stessa frase: due varianti diverse della presentazione comune, a caso)
  const gens = ['intro_gen', 'intro_gen2', 'intro_gen3', 'intro_gen4'].filter(n => sfx.voiceDur(n) > 0).sort(() => Math.random() - 0.5);
  const desc = id => FIGHTERS[id].genericIntro ? (gens.length ? gens.shift() : 'intro_gen') : 'intro_' + id;
  const intro = ['intro_red_g', desc(idA), `name_${idA}`, 'intro_blue_g', desc(idB), `name_${idB}`, 'round_1'];   // "Nell'angolo rosso… Bruce! E nell'angolo blu… Mike! Round uno"   // "Bruce… e nell'angolo blu… Mike! Round uno"
  sfx.announce(intro);
  cpu = new CpuMatch(mike, cpuB, roundSecs, {
    oneKO, threeKO, rounds, rest: REST_S, refills: KD_REFILL,      // stesse regole dei tuoi incontri
    // fine round come nei tuoi incontri: ognuno al suo angolo sullo sgabello, la ragazza fa il giro, e il pulsante per
    // passare subito al round dopo
    onRoundEnd: () => {
      sfx.bell(3); if (mode === 'arena') sfx.cheer('applauso', 0.8);
      const h = ringSize / 2 - 0.42, center = new THREE.Vector3().setFromMatrixPosition(arena.matrixWorld);
      [[mike, stool, -1], [cpuB, stoolB, 1]].forEach(([f, st, sx]) => {
        const corner = new THREE.Vector3(sx * h, 0, sx * h).applyMatrix4(arena.matrixWorld);   // angoli opposti, in diagonale
        st.position.copy(corner); st.visible = true;
        f.goTo(corner.clone().addScaledVector(center.clone().sub(corner).setY(0).normalize(), 0.12), center);
      });
      cpuGirl = false;
      nextMenu.open(player.head, menuYaw(), 0.5, 0.35);
    },
    onRound: (r, last) => {
      mike.leaveCorner(); cpuB.leaveCorner(); stool.visible = stoolB.visible = false; girl.stop(); nextMenu.close();
      sfx.announce([last ? 'final_round' : 'round_' + r]); setTimeout(() => sfx.bell(1), 1500);
    },
    onHit: (zone, p) => { sfx.punchHit(Math.min(1.3, 0.6 + p * 0.4)); if (arenaEnv) arenaEnv.cheer(zone === 'head' ? 0.8 : 0.5); if (mode === 'arena' && zone === 'head') sfx.cheer('boato', 0.5); },
    onKD: () => { sfx.voiceNow('knockdown'); if (arenaEnv) arenaEnv.cheer(2); if (mode === 'arena') sfx.cheer('boato', 1); },   // atterramento
    onKO: () => { if (arenaEnv) arenaEnv.cheer(2); if (mode === 'arena') sfx.cheer('boato', 1); },                             // e non si rialza
    onCount: c => sfx.voiceNow('count_' + c),
    onLowBlow: (n, dq) => { sfx.punchHit(0.8); sfx.voiceNow(dq ? 'dq' : 'lowblow_' + n); if (arenaEnv) arenaEnv.cheer(0.4); if (mode === 'arena') sfx.cheer('ooh', 1); },
    // colpo a segno sul pugile i: livido dove l'ha preso, sudore, e sangue nei colpi al viso forti o se e' gia' segnato
    onMark: (i, e) => {
      const br = i === 0 ? bruises : bruisesB; if (!br) return;
      br.hit(e.zone, e.lx, e.ly, Math.min(1.6, e.speed / 4));
      const hurt = br.worst(), strong = e.speed > 5.5 && Math.random() < 0.45, worn = hurt > 0.6 && Math.random() < 0.2 + (hurt - 0.6) * 1.5;
      const blood = e.zone === 'head' && (strong || worn) ? 1 + Math.floor(Math.random() * (1 + hurt * 3)) : 0;
      sweat.burst(e.point, e.dir, Math.min(1.5, e.speed / 4), blood);
    },                                                                                   // l'arbitro conta
    onResume: () => { sfx.bell(1); sfx.announce(['box']); },                                                                    // si e' rialzato: si riprende
    onStart: () => { sfx.bell(1); sfx.announce(['box']); if (mode === 'arena') sfx.cheer('boato', 0.8); },
  }, Math.max(3.5, intro.reduce((s, n) => s + sfx.voiceDur(n), 0) + 0.8));
  // pulsante discreto, in basso di lato, per andare subito al risultato
  // si apre quando sei davvero fuori dal ring (lo spostamento arriva qualche fotogramma dopo, piu' tardi se sta caricando);
  // ogni incontro di nuovo alla tua sinistra (prima, spostato una volta, restava in mezzo al ring negli incontri dopo)
  skipBtn.moved = false; skipBtn.close(); skipOpen = 2.5;
}
function startCpuCeremony() {
  const wi = cpu.winner, W = wi === 0 ? mike : cpuB, L = wi === 0 ? cpuB : mike;
  const how = (cpu.how || 'points').toLowerCase(), kind = how === 'ko' ? 'ko' : how === 'tko' ? 'tko' : how === 'dq' ? 'dq' : 'points';
  cpu.award = { t: 0, W, final: !!(pending && pending.cm && tour && tour.isFinal()) };
  nextMenu.close();                                   // (il pulsante per saltare resta: salta anche la cerimonia)
  sfx.bell(3);
  if (arenaEnv) { arenaEnv.cheer(2); }
  if (mode === 'arena') { sfx.cheer('boato', 1); setTimeout(() => sfx.cheer('applauso', 0.9), 2500); }
  W.enabled = false;
  if (kind !== 'ko' && kind !== 'tko') L.enabled = false;
  // verdetto: angolo rosso (il primo pugile) o blu (il secondo), come nella presentazione
  const verdict = [`win_${wi === 0 ? 'red' : 'opp'}_${kind}`, 'name_' + W.cfg0.id];
  setTimeout(() => sfx.announce(kind === 'points' ? ['scorecards', 'winner_intro', ...verdict] : kind === 'dq' ? verdict : ['winner_intro', ...verdict]), kind === 'dq' ? 1200 : 900);
  // restano in guardia finche' lo speaker non dice il nome: poi il vincitore esulta e lo sconfitto si abbatte
  // coriandoli e fuochi sopra il ring: partono insieme all'esultanza, quando lo speaker dice il nome
  const c = new THREE.Vector3(0, 1.8, 0).applyMatrix4(arena.matrixWorld);
  setTimeout(() => setTimeout(() => {
    if (!cpu || !cpu.award) return;
    W.celebrate(); if (!L.down) L.dejected = true;
    cpu.award.reactAt = cpu.award.t;
    party.start(c, [0xffc928, 0xffffff, wi === 0 ? 0xd81e2c : 0x1d4fc4], 10);
    setTimeout(() => sfx.firework(), 600);
  }, sfx.lastVoiceEnds() + 250), (kind === 'dq' ? 1200 : 900) + 60);
}
// esci mentre guardi un incontro (dal menu di pausa): si ripulisce come a fine incontro e si torna al menu principale
function exitWatch() {
  closePause(); sfx.stopVoices(); girl.stop(); party.hideAll();
  cpu = null; skipBtn.close(); nextMenu.close(); stool.visible = stoolB.visible = false; cpuGirl = false;
  mike.leaveCorner();
  if (cpuB) { scene.remove(cpuB.root); cpuB.dispose(); cpuB = null; bruisesB = null; }
  mike.bounds = keepInRing; mike.footwork = true; mike.fw = null; mike.resetPose(); mike.root.visible = true;
  pending = null; tour = null; surv = null; fightStarting = false;
  showMainMenu();
}
function endCpuWatch() {
  const P = pending, { cm, youWon } = P, win0 = cpu.winner === 0, w = cm ? (win0 ? cm.a : cm.b) : null;
  sfx.bell(3);
  cpu = null; skipBtn.close(); nextMenu.close(); girl.stop(); stool.visible = stoolB.visible = false;
  mike.leaveCorner();
  if (cpuB) { scene.remove(cpuB.root); cpuB.dispose(); cpuB = null; bruisesB = null; }
  mike.bounds = keepInRing; mike.footwork = true; mike.fw = null; mike.resetPose();
  pending = null;
  if (P.arcade) { showMainMenu(); openMenu(watchMenu); return; }         // arcade da spettatore: si torna alla scelta dei due
  if (P.spec) { specQueue.shift(); specResult(cm, w); return; }   // torneo da spettatore: chi passa, poi il prossimo
  advanceRound(youWon, { [cm.j]: w });
}
// ---- torneo da spettatore: a ogni turno si guardano (o si saltano) gli incontri tra personaggi veri, poi si avanza
let specQueue = [], specForced = {};
// i due pugili CPU dell'incontro in corso o proposto (id): per le bandiere
const cpuIds = () => pending && pending.arcade ? [pending.a, pending.b]
  : pending && pending.cm && tour ? [tour.p[pending.cm.a].id, tour.p[pending.cm.b].id] : [null, null];
const cpuNames = () => pending && pending.arcade ? [FIGHTERS[pending.a].name, FIGHTERS[pending.b].name]
  : pending && pending.cm && tour ? [tour.p[pending.cm.a].name, tour.p[pending.cm.b].name] : ['', ''];
function specRound() { specQueue = tour.cpuMatches(); specForced = {}; tour.forced = specForced; tour.forcedRound = tour.round; specChoice(); }
// un incontro del turno e' deciso (guardato o saltato): sul tabellone il vincitore avanza e chi perde ha la croce
function specResult(cm, w) {
  specForced[cm.j] = w;
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  bracket.open(player.head, menuYaw());
  setTimeout(() => sfx.advance(false), 300);
  bracket.showResult(tour, cm.j, w, t('tr_cpu_res', { round: bracket.roundName(tour.round), b: tour.p[w].name.toUpperCase() }), () => setTimeout(() => { if (bracket.group.visible) specChoice(); }, 900));
}
function specChoice() {
  if (!specQueue.length) { specAdvance(); return; }
  pending = { spec: true, cm: specQueue[0] }; showCpuChoice();
  setTourButtons('tr_watch', true, menuYaw(), 'tr_skipfight', specQueue.length >= 2);
}
function specAdvance() {
  const r = tour.result(true, specForced);
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw();
  bracket.open(player.head, yaw);
  const champ = tour.state === 'champion' ? tour.p[tour.ent[tour.ent.length - 1][0]].name.toUpperCase() : '';
  const sub = champ ? t('tr_champ_spec', { b: champ }) : t('tr_adv_spec', { round: bracket.roundName(r) });
  setTimeout(() => sfx.advance(!!champ), 300);
  bracket.showAdvance(tour, r, sub, () => {
    if (tour.state === 'next' && !tour.spectator) { showBracketNext(); return; }   // (nel tuo torneo: il tuo prossimo incontro)
    if (tour.state === 'next') { setTourButtons('tr_next_round', true, yaw); return; }
    party.start(bracket.group.position.clone().add(new THREE.Vector3(0, 0.2, 0)), [0xffc928, 0xffffff, 0x1d4fc4]);
    sfx.cheer('applauso', 1);
    setTourButtons('tr_menu', false, yaw);
  });
}
function advanceRound(youWon, forced) {
  const opp = tour.opponent(), r = tour.result(youWon, forced);
  closeMenus(); game.phase = 'menu'; setPeople(false); mike.enabled = false;
  const yaw = menuYaw();
  bracket.open(player.head, yaw);
  const sub = youWon ? (tour.state === 'champion' ? t('tr_champ') : t('tr_adv', { round: bracket.roundName(r) }))
    : t('tr_lost', { b: FIGHTERS[opp].name.toUpperCase(), round: bracket.roundName(r) });
  if (youWon) setTimeout(() => sfx.advance(false), 300);
  else sfx.announce(['tour_out']);
  bracket.showAdvance(tour, r, sub, () => {
    if (tour.state === 'next') { showBracketNext(); return; }
    if (tour.state === 'champion') {                  // festa: coriandoli e fuochi sopra la coppa
      sfx.advance(true); sfx.announce(['tour_champ']);
      party.start(bracket.group.position.clone().add(new THREE.Vector3(0, 0.2, 0)), [0xffc928, 0xffffff, 0xd81e2c]);
      sfx.cheer('applauso', 1); sfx.cheer('boato', 0.9);
    }
    // eliminato prima della finale: puoi restare a guardare il torneo fino alla fine (a sinistra il menu)
    if (tour.state === 'lost' && tour.round < tour.rounds - 1) { setTourButtons('tr_watch_rest', true, yaw, 'tr_menu'); return; }
    setTourButtons('tr_menu', false, yaw);
  });
}
// scelte fatte nel menu e non ancora caricate (si aspetta che tu abbia finito di scorrere)
let pendingStage = null, pendingFighter = null;
function updatePending(dt) {
  if (pendingStage && (pendingStage.t -= dt) <= 0) {
    const s = pendingStage.id; pendingStage = null;
    if (game.phase === 'menu' && stageChoice === s) { setStage(s); try { localStorage.setItem('hb-mode', mode); } catch (e) {} }
  }
  if (pendingFighter && (pendingFighter.t -= dt) <= 0 && !fighterLoading) {
    const f = pendingFighter.id; pendingFighter = null;
    if (game.phase === 'menu' && (oppChoice === f || rosterMenu.group.visible)) {
      if (rosterMenu.group.visible && rosterHover === f) sfx.voiceNow('name_' + f);   // nei Lottatori: il nome solo se ci stai ancora sopra (passando su tanti ritratti partivano due nomi insieme)
      setFighter(f);
    }
  }
}
// nel menu il pugile scelto si vede in anteprima a destra del pannello (dietro sarebbe nascosto); quando parte
// l'incontro newMatch lo rimette al suo posto nel ring
function previewFighter() {
  const m = arcadeMenu.group.visible ? arcadeMenu : rosterMenu.group.visible ? rosterMenu : null;   // (dove scegli l'avversario e nei Lottatori)
  if (!mike) return;
  if (!m) { if (mike.previewing) { placeMikeStart(); mike.root.visible = false; } return; }
  // in Arcade l'anteprima e' sempre l'avversario scelto: se quello caricato e' un altro (es. l'ultimo affrontato, o
  // un caricamento rimasto indietro) si carica quello giusto; con "a caso" non si mostra nessuno
  let hide = false;
  if (m === arcadeMenu) {
    if (oppChoice === 'random' || !FIGHTERS[oppChoice]) hide = true;
    else if (oppChoice !== fighterId && !fighterLoading && (!pendingFighter || pendingFighter.id !== oppChoice)) pendingFighter = { id: oppChoice, t: 0.2 };
  }
  // appena scegli un altro pugile quello vecchio sparisce (finche' il nuovo non e' caricato)
  mike.root.visible = !hide && !(pendingFighter && pendingFighter.id !== fighterId) && !fighterLoading && !(m === arcadeMenu && oppChoice !== fighterId);
  // il posto si decide una volta sola (quando il menu si apre o arriva un pugile nuovo): poi resta fermo li',
  // anche se ti avvicini o gli giri intorno per guardarlo da dietro
  if (!mike.previewing || !mike.previewSpot || m.age < 0.1) {
    const q = m.group.getWorldQuaternion(new THREE.Quaternion());
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q).setY(0).normalize();
    const back = new THREE.Vector3(0, 0, -1).applyQuaternion(q).setY(0).normalize();
    // subito a destra del pannello e alla sua stessa distanza da te (vicino, non in fondo al ring)
    const c = m.group.getWorldPosition(new THREE.Vector3());
    const p = new THREE.Vector3(c.x, 0, c.z).addScaledVector(right, m.W / 2 + 0.5).addScaledVector(back, 0.15);
    mike.previewSpot = { x: p.x, z: p.z, yaw: Math.atan2(player.head.x - p.x, player.head.z - p.z) - 0.35 };   // girato verso di te, di tre quarti
  }
  const sp = mike.previewSpot;
  mike.root.position.set(sp.x, arena.position.y, sp.z);
  mike.root.rotation.y = sp.yaw;
  mike.previewing = true;
}
function rosterShow(f, commit = true) {
  if (!FIGHTERS[f]) return;
  fighterCard.show(f, FIGHTERS[f].name);
  if (!commit) return;                              // passando sopra si vede solo la scheda: la scelta parte a riempimento finito
  rosterMenu.select(['rf:' + f]);
  if (f !== fighterId && (!pendingFighter || pendingFighter.id !== f)) { pendingFighter = { id: f, t: 0.35 }; loader.glassT = 0.9; }   // prima la clessidra, poi il caricamento
}
function updateMainMenu(dt, gloves) {
  if (floorGate === 'ask' || floorGate === 'force') {   // prima il pavimento, poi il gioco
    const F = floorForce;
    const done = F ? floorSets > F.sets && (floorSource === 'mano' || (F.scan && floorSource === 'stanza')) : floorOK();
    if (done) { floorGate = 'ok'; floorForce = null; floorMenu.close(); game.message = t('floor_fixed'); showMainMenu(); return; }
    if (MENUS.some(m => m.group.visible)) closeMenus();
    const id = floorMenu.update(dt, gloves);
    if (id) sfx.menuBlip();
    if (id === 'fl:hand' || id === 'fl:scan') floorMenu.select([id]);   // resta acceso: si vede che l'hai scelto (non serve ripremere)
    if (id === 'fl:back') { floorGate = 'ok'; floorForce = null; floorMenu.close(); openMenu(optionsMenu); return; }
    if (id === 'fl:scan' && !spatialOK()) floorMenu.setTitle(t('floor_perm_how'));   // senza permesso non partirebbe
    else if (id === 'fl:scan') {
      floorMenu.setTitle(t('floor_scan_hint'));
      const session = renderer.xr.getSession();
      // (dalle opzioni: finita la scansione il pavimento si rilegge, anche se e' quello di prima)
      if (session && session.initiateRoomCapture) startRoomCapture(session, false);
      else floorMenu.setTitle(t('floor_scan_no'));
    }
    if (id === 'fl:hand') floorMenu.setTitle(t('floor_hand_hint'));
    return;
  }
  updatePending(dt);
  if (rosterMenu.group.visible) {
    let best = null, bt = 0.02;
    for (const b of rosterMenu.buttons) if (b.id.startsWith('rf:') && b.t > bt) { bt = b.t; best = b.id.slice(3); }
    if (best && best !== rosterHover) { rosterHover = best; rosterShow(best, false); }
  }
  bracket.update(dt); tower.update(dt);
  if (tourBtns.group.visible) {
    const id = tourBtns.update(dt, gloves);
    if (!id) return;
    sfx.menuBlip();
    if (id === 'texit') { pending = null; showMainMenu(); return; }
    if (id === 'tskiprd') {                         // salta tutto il turno: gli incontri rimasti si decidono a caso e si va avanti
      pending = null; for (const cm of specQueue) specForced[cm.j] = Math.random() < 0.5 ? cm.a : cm.b;
      specQueue = []; specAdvance(); return;
    }
    if (lostWatch) {                                // eliminato: guardi il resto del torneo, dal tuo turno
      lostWatch = false;
      if (id === 'tgo') { tour.spectator = true; specQueue = tour.cpuMatches(); specChoice(); } else showMainMenu();
      return;
    }
    if (tourStep === 'choice') {
      if (id === 'tgo') startCpuWatch();
      else if (pending && pending.spec) {           // non lo guardi: si decide a caso e si passa al prossimo
        const { cm } = pending; pending = null; specQueue.shift(); specResult(cm, Math.random() < 0.5 ? cm.a : cm.b);
      } else { const p = pending; pending = null; advanceRound(p.youWon, {}); }
      return;
    }
    if (tour && tour.spectator) { if (id === 'tgo' && tour.state === 'next') specRound(); else showMainMenu(); return; }
    if (surv) { if (id === 'tgo' && surv.state === 'next') startFight(surv.order[surv.idx]); else showMainMenu(); return; }
    if (id === 'tgo' && tour && tour.state === 'lost' && tour.round < tour.rounds - 1) {   // eliminato: il torneo va avanti senza di te
      tour.spectator = true; tour.round++; tour.state = 'next'; specRound(); return;
    }
    if (id === 'tgo') { if (tour && tour.state === 'next') startFight(tour.opponent()); else showMainMenu(); }
    else if (id === 'tquit') showMainMenu();
    return;
  }
  const menu = MENUS.find(m => m.group.visible);
  if (!menu) return;
  const id = menu.update(dt, gloves);
  if (!id) return;
  sfx.menuBlip();
  if (id === 'gm:training') { openMenu(trainMenu); return; }
  if (id === 'gm:options') { openMenu(optionsMenu); return; }
  if (id === 'gm:roster') { openMenu(rosterMenu); rosterHover = fighterId; fighterCard.show(fighterId, FIGHTERS[fighterId].name); rosterMenu.select(['rf:' + fighterId]); return; }
  if (id.startsWith('rf:')) { rosterShow(id.slice(3)); return; }
  if (id === 't:spar') { openMenu(sparMenu); return; }
  if (id === 'sp:difesa') { openMenu(defMenu); defSelect(); return; }
  if (id === 'back_spar') { openMenu(sparMenu); return; }
  if (id === 'back_train') { openMenu(trainMenu); return; }
  if (id.startsWith('dg:')) { defGuard = id === 'dg:si'; try { localStorage.setItem('hb-def-guard', defGuard ? 'si' : 'no'); } catch (e) {} defSelect(); return; }
  if (id.startsWith('dt:')) { defType = id.slice(3); try { localStorage.setItem('hb-def-type', defType); } catch (e) {} defSelect(); return; }
  if (id.startsWith('dk:')) {                                  // colpo scelto / tolto
    const k = id.slice(3); if (defSel.has(k)) defSel.delete(k); else defSel.add(k);
    try { localStorage.setItem('hb-def-kinds', JSON.stringify([...defSel])); } catch (e) {}
    defSelect(); return;
  }
  if (id === 'dm:casuale') { lastTrainMenu = 'def'; startSparring('difesa', null); return; }
  if (id === 'dm:start') { if (defSel.size) { lastTrainMenu = 'def'; startSparring('difesa', [...defSel]); } return; }
  if (id.startsWith('sp:')) { lastTrainMenu = 'spar'; startSparring(id.slice(3)); return; }
  if (id === 't:sacco') { startTraining('sacco'); return; }
  if (id === 't:rope') { startTraining('corda'); return; }
  if (id === 't:slip') { startTraining('spago'); return; }
  if (id === 't:speed') { startTraining('pera'); return; }
  if (id === 't:double') { startTraining('doppio'); return; }
  if (id === 'gm:arcade' || id === 'gm:tour' || id === 'gm:surv') {
    gameMode = id.slice(3);
    try { localStorage.setItem('hb-gamemode', gameMode); } catch (e) {}
    openMenu({ arcade: arcadeMenu, tour: tourMenu, surv: survMenu }[gameMode]); return;
  }
  if (id === 'back') { openMenu(rootMenu); return; }
  if (id === 'opt_floor') { openFloorMenu(true); return; }      // sistema il pavimento quando vuoi (anche nella stanza scansionata)
  if (id.startsWith('s:')) {
    stageChoice = id.slice(2);
    try { localStorage.setItem('hb-stage', stageChoice); } catch (e) {}
    // scelta fatta (barra gialla piena): subito lo schermo nero con la clessidra, poi (dopo un attimo, perche' si veda) parte il vero caricamento
    pendingStage = stageChoice !== 'random' ? { id: stageChoice, t: 0.35 } : null;
    if (pendingStage && stageChoice !== mode) { loader.hold = Math.max(loader.hold || 0, 0.9); loader.dark.material.opacity = 1; loader.dark.visible = true; }
  }
  else if (id.startsWith('l:')) { level = id.slice(2); try { localStorage.setItem('hb-level', level); } catch (e) {} mike.setLevel(level); }
  else if (id.startsWith('d:')) { roundSecs = parseInt(id.slice(2)); try { localStorage.setItem('hb-roundsec', roundSecs); } catch (e) {} }
  else if (id.startsWith('tz:')) { tourSize = +id.slice(3); try { localStorage.setItem('hb-toursize', tourSize); } catch (e) {} }
  else if (id.startsWith('tw:')) { towerSize = +id.slice(3); try { localStorage.setItem('hb-towersize', towerSize); } catch (e) {} }
  else if (id.startsWith('ko:')) { oneKO = id === 'ko:si'; try { localStorage.setItem('hb-1ko', oneKO ? 'si' : 'no'); } catch (e) {} }
  else if (id.startsWith('k:')) { threeKO = id === 'k:si'; try { localStorage.setItem('hb-3ko', threeKO ? 'si' : 'no'); } catch (e) {} }
  else if (id.startsWith('r:')) { rounds = parseInt(id.slice(2)); try { localStorage.setItem('hb-rounds', rounds); } catch (e) {} }
  else if (id.startsWith('g:')) setLang(id.slice(2));
  else if (id.startsWith('pf:')) { playerFlag = id.slice(3); try { localStorage.setItem('hb-pflag', playerFlag); } catch (e) {} }
  else if (id.startsWith('vb:')) { player.vibrate = id === 'vb:si'; try { localStorage.setItem('hb-vibe', id.slice(3)); } catch (e) {} if (player.vibrate) { player.pulse('left', 0.8, 120); player.pulse('right', 0.8, 120); } }
  else if (id.startsWith('pt:')) { pointerHand = id.slice(3); try { localStorage.setItem('hb-pointer', pointerHand); } catch (e) {} mtabText(); }
  else if (id.startsWith('f:')) {
    oppChoice = id.slice(2); try { localStorage.setItem('hb-opp', oppChoice); } catch (e) {}
    pendingFighter = oppChoice !== 'random' ? { id: oppChoice, t: 0.35 } : null;   // subito la clessidra, poi il caricamento
    if (pendingFighter && oppChoice !== fighterId) loader.glassT = 0.9;
  }
  else if (id === 'start') { tour = null; pendingStage = pendingFighter = null; startFight(oppChoice === 'random' ? FIGHTER_IDS[Math.floor(Math.random() * FIGHTER_IDS.length)] : oppChoice); return; }
  else if (id === 'start_tour') { surv = null; tour = new Tournament(FIGHTERS, false, tourSize); showBracketNext(); return; }
  else if (id === 'watch_tour') { surv = null; tour = new Tournament(FIGHTERS, true, tourSize); specRound(); return; }
  else if (id === 'watch_arc') { if (watchA === 'random' && oppChoice !== 'random') watchA = oppChoice; openMenu(watchMenu); return; }   // scegli i due pugili
  else if (id === 'back_arc') { openMenu(arcadeMenu); return; }
  else if (id.startsWith('wa:')) { watchA = id.slice(3); watchMenu.select(menuChoices()); return; }
  else if (id.startsWith('wb:')) { watchB = id.slice(3); watchMenu.select(menuChoices()); return; }
  else if (id === 'watch_go') {                       // arcade da spettatore: i due scelti (a caso: uno qualsiasi, mai lo stesso)
    tour = null; surv = null; pendingStage = pendingFighter = null;
    const pick = (c, not) => c !== 'random' && c !== not ? c : (l => l[Math.floor(Math.random() * l.length)])(FIGHTER_IDS.filter(x => x !== not));
    const a = pick(watchA, watchB !== 'random' ? watchB : null), b = pick(watchB, a);
    pending = { arcade: true, a, b }; setStage(pickStage()); startCpuWatch(); return;
  }
  else if (id === 'start_surv') { tour = null; startSurvival(); return; }
  else if (id === 'quit') { closeMenus(); const s = renderer.xr.getSession(); if (s) s.end(); return; }
  menu.select(menuChoices());
}

let pauseHold = 0, pauseLatched = false;
function updatePause(dt) {
  const g = Object.values(player.gloves);
  let pressed = false;
  for (const s of player.sources) {
    const b = s.gamepad && s.gamepad.buttons;
    if (b && ((b[4] && b[4].pressed) || (b[5] && b[5].pressed))) pressed = true;
  }
  const click = pressed && !prevButtons; prevButtons = pressed;
  // per aprire la pausa il tasto va tenuto mezzo secondo: con il pugno chiuso in guardia il pollice lo sfiorava e
  // il gioco andava in pausa da solo
  pauseHold = pressed ? pauseHold + dt : 0;
  const longPress = pauseHold >= 0.5 && !pauseLatched; if (longPress) pauseLatched = true;
  if (!pressed) pauseLatched = false;
  if (game.phase === 'menu') { updateMainMenu(dt, g); return; }
  // sicurezza: un menu principale aperto mentre giochi/ti alleni non si potrebbe premere (si resterebbe bloccati): si chiude
  if (MENUS.some(m => m.group.visible)) { console.warn('menu aperto fuori dal menu: chiuso', game.phase); for (const m of MENUS) m.close(); }
  if (game.phase === 'watch' && !game.paused && !pause.group.visible) return;   // incontro CPU: la pausa si apre solo dal tabellone
  if (!game.paused && !pause.group.visible && game.phase !== 'end' && longPress) { openPause(); return; }
  if (game.paused && click) { closePause(); return; }
  const id = pause.update(dt, g);
  if (id) sfx.menuBlip();
  if (id === 'resume') closePause();
  else if (id === 'restart' && game.phase === 'watch') { closePause(); sfx.stopVoices(); if (cpu) { cpu.skipped = true; cpu.finish(true); } }   // guardando un incontro: vai al risultato
  else if (id === 'restart') { closePause(); sfx.stopVoices(); if (game.phase === 'training') trainer().reset(); else if (game.phase === 'sparring') spar.reset(); else newMatch(); }
  else if (id === 'exit') { if (game.phase === 'watch') { exitWatch(); return; } closePause(); tour = null; surv = null; showMainMenu(); }
  else if (id === 'change') {                     // torna al menu da cui eri partito (difesa, sparring o allenamento)
    closePause(); const lm = game.phase === 'sparring' ? lastTrainMenu : null; showMainMenu();
    if (lm === 'def') { openMenu(defMenu); defSelect(); } else if (lm === 'spar') openMenu(sparMenu); else openMenu(trainMenu);
  }
}

// Pavimento "a mano": accovacciati e appoggia una mano (o il controller) a terra per 2 secondi.
// Funziona anche senza scansione della stanza.
function calibrateByHand(dt) {
  const head = player.head;
  headMax = Math.max(headMax * (1 - dt * 0.02), head.y);       // altezza da in piedi (si adatta piano)
  const crouched = head.y < headMax - 0.25;
  let best = 0;
  for (const g of Object.values(player.gloves)) {
    // (piu' tollerante: un attimo di tracciamento perso o la mano che trema non azzerano piu' il conteggio)
    // la mano deve essere davvero a terra: oltre 1,15 m sotto i tuoi occhi da in piedi (prima bastava accovacciarsi un
    // po' con le mani ferme sulle ginocchia e il pavimento finiva troppo in alto: i pugili sembravano piu' alti)
    const ly = g.lowY !== undefined ? g.lowY : g.center.y - 0.035;
    const low = g.mesh.visible && headMax - ly > 1.15 && head.y - ly > 0.5 && g.speed < 0.4;
    if (floorTouch[g.side] < 0) floorTouch[g.side] = Math.min(0, floorTouch[g.side] + dt);
    else floorTouch[g.side] = crouched && low ? floorTouch[g.side] + dt : Math.max(0, floorTouch[g.side] - dt * 1.5);
    best = Math.max(best, floorTouch[g.side]);
    if (floorTouch[g.side] > 2) {
      floorTouch[g.side] = -3;                                    // pausa prima di poterlo rifare
      setFloor(g.lowY !== undefined && g.lowY < g.center.y ? g.lowY - 0.005 : g.center.y - 0.035, 'mano');   // (il punto della mano che tocca terra, non il centro del pugno)
      sfx.bell(1);
      game.message = t('floor_fixed');
    }
  }
  // col pannello del pavimento aperto: si vede che la mano a terra viene contata
  if (floorMenu.group.visible && best > 0.25) floorMenu.setTitle(t('floor_hold', { s: Math.min(2, Math.ceil(best)) }));
}

// ---------------------------------------------------------------- avvio
// cambio avversario dal menu: si carica il suo modello e prende il posto del precedente
let fighterLoading = false;
function setFighter(id) {
  return new Promise(resolve => {
  if (!FIGHTERS[id] || id === fighterId || fighterLoading) return resolve();
  fighterLoading = true;
  loadMikeGLTF(FIGHTERS[id].glb, () => {}).then(gltf => {
    fighterLoading = false;
    fighterId = id;
    try { localStorage.setItem('hb-fighter', id); } catch (e) {}
    setOpponentName(FIGHTERS[id].name);
    const old = mike;
    mike = new Mike(gltf, scene, level, FIGHTERS[id]);
    mike.bounds = keepInRing;
    bruises = new Bruises(mike.model);
    if (old) { scene.remove(old.root); old.dispose(); }   // (libera la memoria del pugile di prima)
    window.mike = mike;
    if (lastPlace) placeArena(lastPlace.head, lastPlace.yaw); else placeArena(new THREE.Vector3(0, 1.65, 0), 0);
    if (game.phase === 'menu') { newMatch(); game.phase = 'menu'; game.message = t('menu'); }
    for (const m of MENUS) m.select(menuChoices());
    resolve();
  }).catch(e => { fighterLoading = false; console.warn('avversario', e); resolve(); });
  });
}

loadMikeGLTF(FIGHTERS[fighterId].glb, f => statusT('loading', { p: Math.min(100, Math.round(f * 100)) })).then(gltf => {
  mike = new Mike(gltf, scene, level, FIGHTERS[fighterId]);
  girl.load().catch(e => console.warn('ragazza del ring', e));
  bruises = new Bruises(mike.model);
  mike.bounds = keepInRing;
  placeArena(new THREE.Vector3(0, 1.65, 0), 0);
  window.mike = mike; window.game = game; window.player = player; window.room = room; window.placeArena = placeArena; window.camera = camera; window.renderOnly = () => renderer.render(scene, camera); window.bruisesFx = () => bruises; window.getUpFx = getUp; window.gameApi = { introMenu: () => introMenu, endMatch: (w, h) => endMatch(w, h), board: () => board, optionsMenu: () => optionsMenu, mtab: () => mtab, mtabUpdate: (dt, rays) => updateMenuTab(dt, rays), setStage, newMatch, showMainMenu, openPause, pause, startTraining, bag: () => bagTr, rope: () => ropeTr, slip: () => slipTr, spar: () => spar, startSparring, speed: () => speedTr, de: () => deTr, envs: () => ({ arenaEnv, roofEnv, nightEnv, desertEnv, gymEnv, snowEnv, volcEnv, seaEnv, moonEnv, stadiumEnv, stadiumNEnv }), setFighter, startIntro, startPresentation, girl: () => girl, arena: () => arena, ringSize: () => ringSize }; window.sweatFx = sweat;   // per le prove
  window.tourApi = { MENUS, bracket, tourBtns, show: () => showMainMenu(), watchTour: () => { surv = null; tour = new Tournament(FIGHTERS, true, tourSize); specRound(); }, toFinal: () => { surv = null; tour = new Tournament(FIGHTERS, true, tourSize); while (!tour.isFinal()) tour.result(true, {}); specRound(); }, get pending() { return pending; }, open: m => openMenu(MENUS[m]), start: () => { tour = new Tournament(FIGHTERS, false, tourSize); showBracketNext(); },
    after: win => { game.result = { winner: win ? 'player' : 'mike' }; showBracketAfter(); }, fight: () => startFight(tour.opponent()), setStageChoice: c => { stageChoice = c; }, get mode() { return mode; }, get tour() { return tour; }, get cpu() { return cpu; }, skipBtn, tower, startSurvival, get surv() { return surv; }, survAfter: win => { game.result = { winner: win ? 'player' : 'mike' }; showTowerAfter(); } };   // (prove)
  status('');
  $('enter').disabled = !navigator.xr;
  if (navigator.xr) navigator.xr.isSessionSupported('immersive-ar').then(ok => {
    if (!ok) { $('enter').disabled = true; statusT('no_xr'); }
  });
  if (new URLSearchParams(location.search).has('sim')) startSim();
}).catch(e => { console.error(e); statusT('load_err', { e: e.message }); });

$('enter').onclick = async () => {
  sfx.initAudio();
  try {
    // nella stanza: realta' mista; nell'arena: realta' virtuale (il palazzetto copre tutto)
    // sempre realta' mista: l'arena e' un ambiente che copre la stanza, cosi' si cambia dal menu senza uscire
    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking', 'plane-detection', 'mesh-detection', 'anchors', 'layers', 'bounded-floor'],
    });
    applyMode();
    renderer.xr.setFoveation(1);
    await renderer.xr.setSession(session);
    if (bruises) bruises.reset();
    placed = false; xrFrames = 0; floorSource = 'visore'; floorY = 0; roomCaptureAsked = false; headMax = 0; greetPending = true; floorGate = 'wait'; floorMenu.close(); floorSpace = null; readSpace(session).then(sp => { floorSpace = sp; });
    newMatch(); game.phase = 'menu'; setPeople(false);       // si entra nello stage con il menu, la partita non parte
    $('overlay').hidden = true;
    // visore tolto e rimesso (la sessione torna visibile) o "centro" del Quest cambiato: riallinea appena il tracciamento riparte
    // grilletto / pizzico (mani): per prendere e trascinare i menu e premere i pulsanti come sul Quest
    session.addEventListener('selectstart', e => selHeld.set(e.inputSource, true));
    session.addEventListener('select', () => { if (captureArmed && session.initiateRoomCapture) { captureArmed = false; startRoomCapture(session, true); } });
    session.addEventListener('selectend', e => selHeld.set(e.inputSource, false));
    session.addEventListener('visibilitychange', () => { if (session.visibilityState === 'visible') { needRecenter = 20; recenterAlways = false; } });   // (solo se sei fuori dal ring)
    try { renderer.xr.getReferenceSpace().addEventListener('reset', () => { needRecenter = 20; recenterAlways = true; }); } catch (e) {}
    session.addEventListener('end', () => {
      intro = null; baseRef = null; blackLayer.layer = null; blackLayer.on = false; blackLayer.fb = null;
      $('overlay').hidden = false; placed = false;
      if (game.paused) closePause();
      closeMenus(); tour = null; surv = null;
      if (mike) mike.enabled = false;
      newMatch(); game.phase = 'menu';              // fuori dal gioco l'incontro non va avanti da solo
      sfx.stopAll();                                // niente suoni dopo l'uscita
    });
  } catch (e) { statusT('xr_err', { e: e.message }); }
};

// pagina nascosta (visore tolto, browser chiuso): silenzio
document.addEventListener('visibilitychange', () => { if (document.hidden) sfx.stopAll(); });

function startSim() {
  sfx.initAudio();
  $('overlay').hidden = true; $('simhelp').hidden = false;
  sim = new SimInput(camera, renderer.domElement); window.simInput = sim;   // (per le prove)
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
  for (const b of document.querySelectorAll('#langs button')) b.classList.toggle('on', b.dataset.lang === lang);
  for (const el of document.querySelectorAll('.lang-it')) el.hidden = lang !== 'it';
  for (const el of document.querySelectorAll('.lang-en')) el.hidden = lang !== 'en';
  $('sim').textContent = lang === 'it' ? 'Anteprima su PC' : 'PC preview';
  document.documentElement.lang = lang;
}
for (const b of document.querySelectorAll('#langs button')) b.onclick = () => setLang(b.dataset.lang);   // pulsanti IT/EN: lingua gia' dalla pagina
for (const b of document.querySelectorAll('#modes button')) b.onclick = () => {
  mode = b.dataset.mode;
  try { localStorage.setItem('hb-mode', mode); } catch (e) {}
  showMode();
  if (sim) applyMode();
};
showMode();
