// Scheda dei lottatori (menu iniziale, "Lottatori"): per ogni pugile paese con la bandiera, soprannome, altezza,
// peso, stile e quattro caratteristiche da 1 a 10. Le bandiere sono disegnate (semplificate) su una tela.
import * as THREE from 'three';
import { lang } from './i18n.js?v=20261006010309';

// paese (codice bandiera), nomi, misure, soprannome e stile (it / en), caratteristiche: potenza, velocita', difesa, resistenza
export const ROSTER = {
  bruce:  { flag: 'hk', it: 'Hong Kong', en: 'Hong Kong', h: 170, kg: 64, nick: ['Il Drago', 'The Dragon'], style: ['Saltella, finte e colpi a sorpresa', 'Bouncing, feints and surprise shots'], s: [6, 9, 7, 7] },
  mike:   { flag: 'us', it: 'Stati Uniti', en: 'United States', h: 180, kg: 95, nick: ['Il Campione', 'The Champ'], style: ['Pugile completo, il riferimento', 'All-rounder, the benchmark'], s: [7, 6, 6, 7] },
  eddy:   { flag: 'gb', it: 'Regno Unito', en: 'United Kingdom', h: 185, kg: 78, nick: ['Il Punk', 'The Punk'], style: ['Agile, raffiche e schivate', 'Agile, flurries and slips'], s: [5, 8, 7, 6] },
  fury:   { flag: 'th', it: 'Thailandia', en: 'Thailand', h: 190, kg: 86, nick: ['Mille Cicatrici', 'Thousand Scars'], style: ['Combinazioni lunghe e precise', 'Long, precise combinations'], s: [7, 6, 7, 8] },
  maxim:  { flag: 'ru', it: 'Russia', en: 'Russia', h: 195, kg: 108, nick: ['Il Gigante', 'The Giant'], style: ['Aggressivo, ganci pesanti', 'Aggressive, heavy hooks'], s: [8, 5, 5, 7] },
  brutus: { flag: 'bg', it: 'Bulgaria', en: 'Bulgaria', h: 200, kg: 125, nick: ['La Bestia', 'The Beast'], style: ['Ex lottatore, colpisce durissimo', 'Ex wrestler, hits brutally hard'], s: [10, 3, 4, 8] },
  rocco:  { flag: 'it', it: 'Italia', en: 'Italy', h: 177, kg: 82, nick: ['Il Muro', 'The Wall'], style: ['Incassatore, lavora al corpo', 'Iron chin, works the body'], s: [7, 5, 4, 10] },
  ace:    { flag: 'cu', it: 'Cuba', en: 'Cuba', h: 181, kg: 72, nick: ['Mani di Fulmine', 'Lightning Hands'], style: ['Velocita\' pura, raffiche lunghe', 'Pure speed, long flurries'], s: [5, 10, 6, 6] },
  riki:   { flag: 'jp', it: 'Giappone', en: 'Japan', h: 190, kg: 100, nick: ['Sol Levante', 'Rising Sun'], style: ['Potente e tecnico, para bene', 'Powerful and technical, great guard'], s: [8, 6, 8, 7] },
  bob:    { flag: 'au', it: 'Australia', en: 'Australia', h: 180, kg: 120, nick: ['Il Panino', 'The Burger'], style: ['Lento ma quando prende fa male', 'Slow, but it hurts when he lands'], s: [9, 3, 4, 9] },
  diego:  { flag: 'mx', it: 'Messico', en: 'Mexico', h: 172, kg: 70, nick: ['El Toro', 'El Toro'], style: ['Ti pressa e lavora al fegato', 'Pressure and liver shots'], s: [7, 7, 5, 9] },
  kwame:  { flag: 'gh', it: 'Ghana', en: 'Ghana', h: 188, kg: 95, nick: ['Il Leone', 'The Lion'], style: ['Contrattaccante, destro micidiale', 'Counter-puncher, deadly right'], s: [8, 6, 9, 7] },
  lars:   { flag: 'no', it: 'Norvegia', en: 'Norway', h: 198, kg: 112, nick: ['Il Vichingo', 'The Viking'], style: ['Jab lunghissimo, ti tiene lontano', 'Huge jab, keeps you away'], s: [8, 5, 6, 7] },
  malik:  { flag: 'ma', it: 'Marocco', en: 'Morocco', h: 176, kg: 64, nick: ['Il Falco', 'The Falcon'], style: ['Schiva tutto e punge di rimessa', 'Slips everything, stings back'], s: [5, 9, 9, 6] },
  connor: { flag: 'ie', it: 'Irlanda', en: 'Ireland', h: 183, kg: 82, nick: ['Il Rissaiolo', 'The Brawler'], style: ['Ganci larghi, non molla mai', 'Wide hooks, never quits'], s: [7, 6, 4, 9] },
  tavita: { flag: 'ws', it: 'Samoa', en: 'Samoa', h: 186, kg: 118, nick: ['Il Picchiatore', 'The Hammer'], style: ['Incassa tutto, ganci che spengono', 'Takes everything, lights-out hooks'], s: [10, 4, 5, 9] },
  arjun:  { flag: 'in', it: 'India', en: 'India', h: 181, kg: 80, nick: ['Il Tecnico', 'The Technician'], style: ['Jab continuo e gioco di gambe', 'Constant jab and footwork'], s: [6, 8, 8, 7] },
  moussa: { flag: 'sn', it: 'Senegal', en: 'Senegal', h: 201, kg: 92, nick: ['Il Lungo', 'The Long One'], style: ['Braccia infinite, montanti', 'Endless reach, uppercuts'], s: [8, 6, 8, 6] },
  mateo:  { flag: 'ar', it: 'Argentina', en: 'Argentina', h: 179, kg: 76, nick: ['Il Martello', 'The Hammerhead'], style: ['Sempre addosso, al corpo', 'Always on you, body shots'], s: [7, 7, 5, 9] },
  joon:   { flag: 'kr', it: 'Corea del Sud', en: 'South Korea', h: 174, kg: 68, nick: ['Il Fulmine', 'The Flash'], style: ['Mani velocissime, raffiche di 4-5 colpi', 'Blazing hands, 4-5 punch bursts'], s: [5, 10, 7, 7] },
  ink:    { flag: 'de', it: 'Germania', en: 'Germany', h: 184, kg: 84, nick: ["La Tela", "The Canvas"], style: ["Imprevedibile, entra a testa bassa", "Unpredictable, walks right in"], s: [8, 7, 5, 8] },
  thiago: { flag: 'br', it: 'Brasile', en: 'Brazil', h: 180, kg: 79, nick: ["La Ginga", "The Ginga"], style: ["Ondeggia a tempo, contrattacca", "Sways to a rhythm, counters"], s: [6, 8, 8, 7] },
  danilo: { flag: 'ph', it: 'Filippine', en: 'Philippines', h: 165, kg: 63, nick: ["Il Tornado", "The Tornado"], style: ["Piccolo e velocissimo, entra ed esce", "Small and blazing fast, in and out"], s: [6, 10, 7, 9] },
  emeka:  { flag: 'ng', it: 'Nigeria', en: 'Nigeria', h: 193, kg: 108, nick: ["Il Re Leone", "The Lion King"], style: ["Potenza pura, un colpo e basta", "Pure power, one shot is enough"], s: [10, 5, 6, 7] },
  taras:  { flag: 'ua', it: 'Ucraina', en: 'Ukraine', h: 198, kg: 108, nick: ["Il Professore", "The Professor"], style: ["Jab lungo, tiene la distanza", "Long jab, owns the distance"], s: [8, 6, 9, 8] },
  javi:   { flag: 'pr', it: 'Porto Rico', en: 'Puerto Rico', h: 175, kg: 70, nick: ["El Bandido", "El Bandido"], style: ["Furbo, colpi al fegato", "Sly, liver shots"], s: [7, 8, 7, 8] },
  bastien:{ flag: 'fr', it: 'Francia', en: 'France', h: 182, kg: 78, nick: ["Il Moschettiere", "The Musketeer"], style: ["Elegante, finte e jab", "Elegant, feints and jabs"], s: [6, 8, 9, 7] },
  nurlan: { flag: 'kz', it: 'Kazakistan', en: 'Kazakhstan', h: 178, kg: 75, nick: ["Il Lupo della Steppa", "The Steppe Wolf"], style: ["Pressione continua, ganci pesanti", "Relentless pressure, heavy hooks"], s: [9, 7, 7, 9] },
  kerem:  { flag: 'tr', it: 'Turchia', en: 'Turkey', h: 185, kg: 95, nick: ["Il Toro", "The Bull"], style: ["Lottatore, ti chiude all'angolo", "Wrestler build, corners you"], s: [8, 6, 6, 9] },
  karim:  { flag: 'eg', it: 'Egitto', en: 'Egypt', h: 183, kg: 82, nick: ["Il Faraone", "The Pharaoh"], style: ["Guardia bassa, contrattacco", "Shoulder roll, counterpunches"], s: [7, 8, 9, 7] },
  logan:  { flag: 'ca', it: 'Canada', en: 'Canada', h: 190, kg: 120, nick: ["Il Boscaiolo", "The Lumberjack"], style: ["Incassa tutto, picchia come un'ascia", "Takes it all, hits like an axe"], s: [9, 4, 5, 10] },
  kuba:   { flag: 'pl', it: 'Polonia', en: 'Poland', h: 188, kg: 96, nick: ["Il Veterano", "The Veteran"], style: ["Esperienza, para tutto", "All experience, blocks everything"], s: [7, 6, 10, 6] },
  desmond:{ flag: 'jm', it: 'Giamaica', en: 'Jamaica', h: 187, kg: 86, nick: ["Il Serpente", "The Snake"], style: ["Braccia lunghe, montanti a sorpresa", "Long arms, surprise uppercuts"], s: [8, 8, 6, 7] },
  ante:   { flag: 'hr', it: 'Croazia', en: 'Croatia', h: 203, kg: 115, nick: ["La Torre", "The Tower"], style: ["Gigante, uno-due da lontano", "Giant, one-two from range"], s: [9, 5, 7, 8] },
  batu:   { flag: 'mn', it: 'Mongolia', en: 'Mongolia', h: 172, kg: 90, nick: ["Il Khan", "The Khan"], style: ["Basso e tozzo, lavora dentro", "Short and stocky, works inside"], s: [8, 6, 6, 10] },
  camilo: { flag: 'co', it: 'Colombia', en: 'Colombia', h: 177, kg: 72, nick: ["Il Colibri", "The Hummingbird"], style: ["Giovane e sfrontato, raffiche", "Young and cocky, flurries"], s: [6, 9, 6, 9] },
};

// ---------------------------------------------------------------- bandiere (disegno semplificato, 3:2)
function star(g, x, y, r, col, n = 5, inner = 0.4) {
  g.fillStyle = col; g.beginPath();
  for (let k = 0; k < n * 2; k++) { const a = -Math.PI / 2 + k * Math.PI / n, rr = k % 2 ? r * inner : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
const stripesH = (g, W, H, cols) => cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * H / cols.length, W, H / cols.length + 1); });
const stripesV = (g, W, H, cols) => cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * W / cols.length, 0, W / cols.length + 1, H); });
function unionJack(g, x, y, w, h) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = '#012169'; g.fillRect(x, y, w, h);
  g.strokeStyle = '#fff'; g.lineWidth = h * 0.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke();
  g.strokeStyle = '#C8102E'; g.lineWidth = h * 0.07; g.stroke();
  g.fillStyle = '#fff'; g.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h); g.fillRect(x, y + h * 0.33, w, h * 0.34);
  g.fillStyle = '#C8102E'; g.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h); g.fillRect(x, y + h * 0.4, w, h * 0.2);
  g.restore();
}
export function drawFlag(g, code, W, H) {
  const F = {
    it: () => stripesV(g, W, H, ['#009246', '#fff', '#ce2b37']),
    ie: () => stripesV(g, W, H, ['#169b62', '#fff', '#ff883e']),
    mx: () => { stripesV(g, W, H, ['#006847', '#fff', '#ce1126']); g.fillStyle = '#8c5a2b'; g.beginPath(); g.arc(W / 2, H / 2, H * 0.15, 0, 7); g.fill(); },
    ru: () => stripesH(g, W, H, ['#fff', '#0039a6', '#d52b1e']),
    bg: () => stripesH(g, W, H, ['#fff', '#00966e', '#d62612']),
    gh: () => { stripesH(g, W, H, ['#ce1126', '#fcd116', '#006b3f']); star(g, W / 2, H / 2, H * 0.16, '#000'); },
    sn: () => { stripesV(g, W, H, ['#00853f', '#fdef42', '#e31b23']); star(g, W / 2, H / 2, H * 0.15, '#00853f'); },
    th: () => stripesH(g, W, H, ['#a51931', '#f4f5f8', '#2d2a4a', '#2d2a4a', '#f4f5f8', '#a51931']),
    jp: () => { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#bc002d'; g.beginPath(); g.arc(W / 2, H / 2, H * 0.3, 0, 7); g.fill(); },
    us: () => { stripesH(g, W, H, Array.from({ length: 13 }, (_, i) => i % 2 ? '#fff' : '#b22234')); g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, W * 0.4, H * 7 / 13);
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) star(g, W * 0.035 + c * W * 0.064, H * 0.05 + r * H * 0.1, H * 0.025, '#fff'); },
    gb: () => unionJack(g, 0, 0, W, H),
    au: () => { g.fillStyle = '#012169'; g.fillRect(0, 0, W, H); unionJack(g, 0, 0, W / 2, H / 2); star(g, W * 0.25, H * 0.75, H * 0.1, '#fff', 7);
      for (const [x, y] of [[0.75, 0.25], [0.62, 0.48], [0.88, 0.42], [0.75, 0.82]]) star(g, W * x, H * y, H * 0.05, '#fff', 7); },
    ws: () => { g.fillStyle = '#ce1126'; g.fillRect(0, 0, W, H); g.fillStyle = '#002b7f'; g.fillRect(0, 0, W / 2, H / 2);
      for (const [x, y] of [[0.25, 0.1], [0.15, 0.25], [0.33, 0.22], [0.25, 0.38]]) star(g, W * x, H * y, H * 0.05, '#fff'); },
    cu: () => { stripesH(g, W, H, ['#002a8f', '#fff', '#002a8f', '#fff', '#002a8f']); g.fillStyle = '#cf142b'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.43, H / 2); g.lineTo(0, H); g.fill(); star(g, W * 0.15, H / 2, H * 0.13, '#fff'); },
    no: () => { g.fillStyle = '#ba0c2f'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.fillRect(W * 0.28, 0, H * 0.25, H); g.fillRect(0, H * 0.375, W, H * 0.25);
      g.fillStyle = '#00205b'; g.fillRect(W * 0.28 + H * 0.0625, 0, H * 0.125, H); g.fillRect(0, H * 0.4375, W, H * 0.125); },
    ma: () => { g.fillStyle = '#c1272d'; g.fillRect(0, 0, W, H); g.strokeStyle = '#006233'; g.lineWidth = H * 0.04; g.beginPath();
      for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5; g.lineTo(W / 2 + Math.cos(a) * H * 0.22, H / 2 + Math.sin(a) * H * 0.22); } g.stroke(); },
    in: () => { stripesH(g, W, H, ['#ff9933', '#fff', '#138808']); g.strokeStyle = '#000080'; g.lineWidth = H * 0.025; g.beginPath(); g.arc(W / 2, H / 2, H * 0.12, 0, 7); g.stroke();
      for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2 + Math.cos(a) * H * 0.12, H / 2 + Math.sin(a) * H * 0.12); g.lineWidth = 1.5; g.stroke(); } },
    ar: () => { stripesH(g, W, H, ['#74acdf', '#fff', '#74acdf']); g.fillStyle = '#f6b40e'; g.beginPath(); g.arc(W / 2, H / 2, H * 0.09, 0, 7); g.fill();
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * H * 0.09, H / 2 + Math.sin(a) * H * 0.09); g.lineTo(W / 2 + Math.cos(a) * H * 0.14, H / 2 + Math.sin(a) * H * 0.14); g.strokeStyle = '#f6b40e'; g.lineWidth = 3; g.stroke(); } },
    kr: () => { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); const cx = W / 2, cy = H / 2, r = H * 0.22;
      g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.fill(); g.fillStyle = '#0047a0'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI); g.fill();
      g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(cx - r / 2, cy, r / 2, 0, 7); g.fill(); g.fillStyle = '#0047a0'; g.beginPath(); g.arc(cx + r / 2, cy, r / 2, 0, 7); g.fill();
      g.fillStyle = '#000'; for (const [x, y, rot] of [[0.2, 0.25, 0.6], [0.8, 0.75, 0.6], [0.8, 0.25, -0.6], [0.2, 0.75, -0.6]]) { g.save(); g.translate(W * x, H * y); g.rotate(rot); for (let b = -1; b <= 1; b++) g.fillRect(-H * 0.09, b * H * 0.045 - H * 0.015, H * 0.18, H * 0.03); g.restore(); } },
    hk: () => { g.fillStyle = '#de2910'; g.fillRect(0, 0, W, H); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 2 * Math.PI / 5;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(W / 2 + Math.cos(a) * H * 0.11, H / 2 + Math.sin(a) * H * 0.11, H * 0.1, H * 0.05, a, 0, 7); g.fill(); } },
    de: () => stripesH(g, W, H, ['#000', '#dd0000', '#ffce00']),
    fr: () => stripesV(g, W, H, ['#002654', '#fff', '#ed2939']),
    ua: () => stripesH(g, W, H, ['#0057b7', '#ffd700']),
    pl: () => stripesH(g, W, H, ['#fff', '#dc143c']),
    ng: () => stripesV(g, W, H, ['#008751', '#fff', '#008751']),
    co: () => { g.fillStyle = '#fcd116'; g.fillRect(0, 0, W, H / 2); g.fillStyle = '#003893'; g.fillRect(0, H / 2, W, H / 4); g.fillStyle = '#ce1126'; g.fillRect(0, H * 0.75, W, H / 4 + 1); },
    br: () => { g.fillStyle = '#009c3b'; g.fillRect(0, 0, W, H); g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(W * 0.08, H / 2); g.lineTo(W / 2, H * 0.1); g.lineTo(W * 0.92, H / 2); g.lineTo(W / 2, H * 0.9); g.fill();
      g.fillStyle = '#002776'; g.beginPath(); g.arc(W / 2, H / 2, H * 0.22, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = H * 0.035; g.beginPath(); g.arc(W / 2, H * 0.9, H * 0.48, -2.3, -0.85); g.stroke(); },
    ph: () => { g.fillStyle = '#0038a8'; g.fillRect(0, 0, W, H / 2); g.fillStyle = '#ce1126'; g.fillRect(0, H / 2, W, H / 2); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.43, H / 2); g.lineTo(0, H); g.fill();
      star(g, W * 0.14, H / 2, H * 0.12, '#fcd116', 8, 0.5); for (const [x, y] of [[0.05, 0.12], [0.05, 0.88], [0.35, 0.5]]) star(g, W * x, H * y, H * 0.045, '#fcd116'); },
    pr: () => { stripesH(g, W, H, ['#ed0000', '#fff', '#ed0000', '#fff', '#ed0000']); g.fillStyle = '#0050f0'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * 0.45, H / 2); g.lineTo(0, H); g.fill(); star(g, W * 0.15, H / 2, H * 0.13, '#fff'); },
    kz: () => { g.fillStyle = '#00afca'; g.fillRect(0, 0, W, H); g.fillStyle = '#fec50c'; g.beginPath(); g.arc(W / 2, H * 0.45, H * 0.15, 0, 7); g.fill();
      for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * H * 0.18, H * 0.45 + Math.sin(a) * H * 0.18); g.lineTo(W / 2 + Math.cos(a) * H * 0.25, H * 0.45 + Math.sin(a) * H * 0.25); g.strokeStyle = '#fec50c'; g.lineWidth = 2; g.stroke(); }
      g.fillRect(W * 0.06, H * 0.1, W * 0.04, H * 0.8); },
    tr: () => { g.fillStyle = '#e30a17'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.beginPath(); g.arc(W * 0.4, H / 2, H * 0.25, 0, 7); g.fill();
      g.fillStyle = '#e30a17'; g.beginPath(); g.arc(W * 0.44, H / 2, H * 0.2, 0, 7); g.fill(); star(g, W * 0.6, H / 2, H * 0.12, '#fff'); },
    eg: () => { stripesH(g, W, H, ['#ce1126', '#fff', '#000']); g.fillStyle = '#c09300'; g.beginPath(); g.moveTo(W / 2, H * 0.38); g.lineTo(W * 0.56, H * 0.6); g.lineTo(W * 0.44, H * 0.6); g.fill(); },
    ca: () => { stripesV(g, W, H, ['#d52b1e', '#fff', '#fff', '#d52b1e']); g.fillStyle = '#d52b1e'; const cx = W / 2, cy = H / 2, r = H * 0.3; g.beginPath();
      const P = [[0, -1], [0.15, -0.6], [0.35, -0.7], [0.3, -0.25], [0.75, -0.45], [0.65, -0.15], [0.85, 0], [0.45, 0.25], [0.5, 0.45], [0.05, 0.35], [0.05, 0.8], [-0.05, 0.8], [-0.05, 0.35], [-0.5, 0.45], [-0.45, 0.25], [-0.85, 0], [-0.65, -0.15], [-0.75, -0.45], [-0.3, -0.25], [-0.35, -0.7], [-0.15, -0.6]];
      for (const [x, y] of P) g.lineTo(cx + x * r, cy + y * r); g.fill(); },
    jm: () => { g.fillStyle = '#009b3a'; g.fillRect(0, 0, W, H); g.fillStyle = '#000'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, H / 2); g.lineTo(0, H); g.fill(); g.beginPath(); g.moveTo(W, 0); g.lineTo(W / 2, H / 2); g.lineTo(W, H); g.fill();
      g.strokeStyle = '#fed100'; g.lineWidth = H * 0.16; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke(); },
    hr: () => { stripesH(g, W, H, ['#ff0000', '#fff', '#171796']); const s = H * 0.07, x0 = W / 2 - 2.5 * s, y0 = H * 0.3;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#ff0000'; g.fillRect(x0 + i * s, y0 + j * s, s, s); } },
    mn: () => { stripesV(g, W, H, ['#c4272f', '#015197', '#c4272f']); g.fillStyle = '#f9cf02'; g.beginPath(); g.arc(W / 6, H * 0.4, H * 0.08, 0, 7); g.fill(); g.fillRect(W / 6 - H * 0.08, H * 0.52, H * 0.16, H * 0.3); },
  };
  (F[code] || (() => { g.fillStyle = '#888'; g.fillRect(0, 0, W, H); }))();
}

// ---------------------------------------------------------------- scheda del pugile (pannello a sinistra)
export class FighterCard {
  constructor() {
    this.c = document.createElement('canvas'); this.c.width = 512; this.c.height = 640;
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.6), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, toneMapped: false }));
    this.mesh.renderOrder = 1101; this.id = null;
  }
  show(id, name) {
    if (id === this.id && lang === this.lang) return; this.id = id; this.lang = lang;
    const R = ROSTER[id], g = this.c.getContext('2d'), W = 512, H = 640, L = lang === 'en' ? 1 : 0;
    g.clearRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, 'rgba(22,26,38,0.97)'); bg.addColorStop(1, 'rgba(8,10,16,0.97)');
    g.fillStyle = bg; g.beginPath(); g.roundRect(4, 4, W - 8, H - 8, 28); g.fill();
    g.strokeStyle = '#ffd34d'; g.lineWidth = 5; g.stroke();
    if (!R) { this.tex.needsUpdate = true; return; }
    // bandiera e paese
    g.save(); g.translate(30, 34); drawFlag(g, R.flag, 120, 80); g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; g.strokeRect(30, 34, 120, 80);
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff'; g.font = '900 54px system-ui, sans-serif'; g.fillText(name.toUpperCase(), 170, 60);
    g.fillStyle = '#c9cfdb'; g.font = '700 28px system-ui, sans-serif'; g.fillText(L ? R.en : R.it, 172, 100);
    g.fillStyle = '#ffd34d'; g.font = 'italic 800 32px system-ui, sans-serif'; g.fillText('"' + R.nick[L] + '"', 30, 160);
    g.fillStyle = '#e6e8ee'; g.font = '700 30px system-ui, sans-serif';
    g.fillText((L ? 'Height ' : 'Altezza ') + (R.h / 100).toFixed(2).replace('.', L ? '.' : ',') + ' m', 30, 210);
    g.fillText((L ? 'Weight ' : 'Peso ') + R.kg + ' kg', 290, 210);
    // stile (va a capo se serve)
    g.fillStyle = '#9fb3d9'; g.font = '600 26px system-ui, sans-serif';
    const words = R.style[L].split(' '); let line = '', y = 258;
    for (const w of words) { if (g.measureText(line + w).width > W - 70) { g.fillText(line, 30, y); line = ''; y += 32; } line += w + ' '; }
    g.fillText(line, 30, y);
    // caratteristiche: barre da 1 a 10
    const labs = L ? ['POWER', 'SPEED', 'DEFENCE', 'STAMINA'] : ['POTENZA', 'VELOCITA\'', 'DIFESA', 'RESISTENZA'], cols = ['#e5484d', '#3fb0ff', '#4cff7a', '#ffc928'];
    R.s.forEach((v, i) => {
      const yy = 360 + i * 66;
      g.fillStyle = '#c9cfdb'; g.font = '800 24px system-ui, sans-serif'; g.fillText(labs[i], 30, yy);
      for (let k = 0; k < 10; k++) { g.fillStyle = k < v ? cols[i] : 'rgba(255,255,255,0.12)'; g.beginPath(); g.roundRect(30 + k * 45, yy + 16, 38, 22, 5); g.fill(); }
    });
    this.tex.needsUpdate = true;
  }
}
