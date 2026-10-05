// Voci: in tools/gen_voices.py (FIGHTERS) intro_<id> (descrizione) e name_<id> (nome) per ogni pugile.
// Gli avversari: modello (blender/create_mike.py char=...), anteprima per il menu e dettagli di aspetto.
// Ruolo nel gioco sempre lo stesso ("mike" nel codice = l'avversario); qui cambiano nome e aspetto.
// genericIntro: lo speaker usa la presentazione comune (intro_gen) e poi il nome: niente frase dedicata.
export const FIGHTERS = {
  bruce: {
    id: 'bruce', name: 'Bruce', glb: 'assets/bruce.glb?v=20261005192220', thumb: 'assets/fighter_bruce.webp?v=20261005192220',
    face: [163, 5, 110],                                           // volto nell'anteprima (x, y, lato) per il tabellone
    skinTint: 0xe3b98f,                                            // pelle piu' abbronzata della texture MakeHuman
    evenSkin: false,                                               // (la schiaritura delle gambe serve solo alla pelle di Mike)
    band: { bg: '#141416', line: '#c99a2e', text: '#e9c46a' },     // fascia nera con scritta dorata
    // stile: saltella molto (clip "idle" di Blender) e fa finte a vuoto per ingannarti, fluide e coreografiche
    feints: { rate: 1.3, moves: ['feint_jab', 'feint_dip', 'feint_hop', 'feint_jab'], speed: 1.0 },
  },
  mike: {
    id: 'mike', name: 'Mike', glb: 'assets/mike.glb?v=20261005192220', thumb: 'assets/fighter_mike.webp?v=20261005192220',
    face: [178, 0, 110],
    skinTint: null,
    band: { bg: '#f4f4f0', line: '#c99a2e', text: '#1239a8' },
  },
  eddy: {
    id: 'eddy', name: 'Eddy', glb: 'assets/eddy.glb?v=20261005192220', thumb: 'assets/fighter_eddy.webp?v=20261005192220',
    face: [182, 52, 110],
    skinTint: null, evenSkin: false, noStubble: true,            // ai lati rasato a zero: niente ombra di capelli sotto la cresta
    band: { bg: '#0b0b0e', line: '#0a8cff', text: '#3fb0ff' },     // fascia nera con scritta blu fosforescente
    glow: ['Raso blu', 'Pelle guantoni', 'Cresta'],                // blu fosforescente: si illumina anche nel buio
    // stile agile: si muove tanto e veloce, schiva di piu', attacca a raffiche; qualche finta saltellando
    mods: { moveSpeed: 1.35, defenseSpeed: 1.15, evade: 0.08, attackEvery: 0.85 },
    feints: { rate: 0.6, moves: ['feint_hop', 'feint_dip'], speed: 1.15 },
  },
  fury: {
    id: 'fury', name: 'Fury', glb: 'assets/fury.glb?v=20261005192220', thumb: 'assets/fighter_fury.webp?v=20261005192220',
    face: [190, 8, 102],
    skinTint: 0xc99872, evenSkin: false,                           // pelle abbronzata
    // calzoncini thai: fascia dorata larga con il riquadro bianco e la scritta rossa
    band: { bg: '#e3ad25', line: '#b07d10', text: '#c4122a', label: 'FURY', box: '#f6f3ea' },
    // stile: si muove poco ma quando attacca sono combinazioni lunghe e precise
    mods: { moveSpeed: 0.6, defenseSpeed: 1.0, attackEvery: 1.15, extraCombos: ['1-2-3-2', '1-6-3-2', '2-3-2', '1-2-5-2', '3-2-3', '6-3b-3', '1-2-3'] },
  },
  maxim: {
    id: 'maxim', name: 'Maxim', glb: 'assets/maxim.glb?v=20261005192220', thumb: 'assets/fighter_maxim.webp?v=20261005192220',
    face: [192, 34, 100],
    skinTint: null, evenSkin: false, hairTint: '#d9b872',          // biondo
    band: { bg: '#f4f4f0', line: '#c40f22', text: '#c40f22', label: 'MAXIM ★' },
    // stile aggressivo: ti viene addosso, attacca spesso e lavora soprattutto di ganci
    mods: { moveSpeed: 1.15, defenseSpeed: 0.95, attackEvery: 0.7, extraCombos: ['3-4', '3-2-3', '2-3', '1-2-3', '3-2', '2-3-2', '6-3', '1-2-3-2', '3b-4', '3b-3'] },
  },
  brutus: {
    id: 'brutus', name: 'Brutus', glb: 'assets/brutus.glb?v=20261005192220', thumb: 'assets/fighter_brutus.webp?v=20261005192220',
    face: [188, 30, 100],
    skinTint: 0xe8c4a8, evenSkin: false,
    band: { bg: '#7a0f14', line: '#d4a537', text: '#e8c25a', label: 'BRUTUS' },
    mean: { brow: 0.55, squint: 0.3 },                             // sempre accigliato
    fur: '#2b2019',                                                // barba e capelli castano scurissimo, folti
    // stile brutale: viene avanti, attacca spesso, ganci e montanti pesanti (colpisce piu' forte)
    mods: { moveSpeed: 1.0, defenseSpeed: 0.9, attackEvery: 0.75, power: 1.2,
      extraCombos: ['3-4', '6-3', '1-6', '5-2', '6-3b-3', '3-2-3', '1-6-3-2', '1-2-5-2', '3b-4', '6-3'] },
  },
  rocco: {
    id: 'rocco', name: 'Rocco', glb: 'assets/rocco.glb?v=20261005192220', thumb: 'assets/fighter_rocco.webp?v=20261005192220',
    face: [195, 12, 92],
    skinTint: 0xf0d2b8, evenSkin: false, skinGloss: 0.32,           // pelle lucida di sudore
    band: { bg: '#121214', line: '#121214', text: '#f1efe8', label: ' ' },   // fascia nera liscia
    hairTint: '#74492b',                                            // castano scuro (le ciocche restano)
    mean: { squint: 0.3 },                                          // palpebre pesanti: sguardo stanco
    // stile da incassatore: incassa tanto (prende meno danno), para poco, va avanti e lavora al corpo
    mods: { moveSpeed: 0.95, defenseSpeed: 0.8, attackEvery: 0.85, toughness: 0.75,
      extraCombos: ['3b-3', '1-3b-3', '2b-3-2', '3b-4', '1-2b', '3-2', '1-2-3'] },
  },
  ace: {
    id: 'ace', name: 'Ace', glb: 'assets/ace.glb?v=20261005192220', thumb: 'assets/fighter_ace.webp?v=20261005192220',
    face: [195, 15, 95],
    skinTint: 0x6e5244, evenSkin: false, skinGloss: 0.4,           // nerissimo, un po' lucido
    fur: '#0c0a09',                                                 // capelli rasati neri (non grigi sulla pelle scura)
    band: { bg: '#f2f1ec', line: '#0c6b3c', text: '#0c6b3c', label: 'ACE ♠' },
    // stile: velocita' pura. Pugni piu' rapidi, si muove tanto, raffiche lunghe di colpi
    mods: { punchSpeed: 1.2, moveSpeed: 1.3, defenseSpeed: 1.1, attackEvery: 0.8,
      extraCombos: ['1-1-2', '1-2-3-2', '1-2-5-2', '1-6-3-2', '2-3-2', '1-2-3', '3-2-3', '1-2-schivata-2-3', '1-2-abbassata-3-2'] },
    feints: { rate: 0.5, moves: ['feint_jab', 'feint_hop'], speed: 1.25 },
  },
  riki: {
    id: 'riki', name: 'Riki', glb: 'assets/riki.glb?v=20261005192220', thumb: 'assets/fighter_riki.webp?v=20261005192220',
    face: [185, 0, 115],
    skinTint: 0xeac39e, evenSkin: false, hairTint: '#141110',          // capelli neri corvini
    band: { bg: '#c4122a', line: '#f4f3ee', text: '#f4f3ee', label: 'RIKI', icon: 'sole' },   // fascia rossa, sol levante
    // stile: potente e tecnico. Colpisce forte, para bene, incassa; combinazioni pulite, poche mosse sprecate
    mods: { power: 1.25, defenseSpeed: 1.15, moveSpeed: 0.85, attackEvery: 0.95, toughness: 0.85,
      extraCombos: ['1-2-3', '1-2-5-2', '2-3-2', '1-6-3-2', '3b-3', '1-2-3-2', '5-2', '1-2b-3'] },
  },
  bob: {
    id: 'bob', name: 'Rob', glb: 'assets/bob.glb?v=20261005192220', thumb: 'assets/fighter_bob.webp?v=20261005192220',
    face: [185, 30, 110],
    skinTint: 0xf2cdb4, evenSkin: false,                               // riccioli biondi (fatti in Blender, colore gia' nel modello)
    fur: '#e2c27a',                                                     // pizzetto e base dei riccioli: stesso biondo dei capelli
    band: { bg: '#f2c230', line: '#b5161c', text: '#b5161c', label: 'ROB', icon: 'panino' },
    // stile: lento e pesante, ma quando prende fa male. Incassa tanto (la pancia), ganci larghi e montanti
    mods: { power: 1.35, moveSpeed: 0.75, defenseSpeed: 0.85, attackEvery: 1.0, toughness: 0.8,
      extraCombos: ['3-4', '6-3', '2-3', '1-6', '3b-4', '3-2-3', '5-6'] },
  },
  // ---- i cinque nuovi (2026-10-04): presentazione generica + nome
  diego: {
    id: 'diego', name: 'Diego', glb: 'assets/diego.glb?v=20261005192220', thumb: 'assets/fighter_diego.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // messicano, 1,72 m, 70 kg. "El Toro": basso e compatto, ti pressa sempre e lavora al corpo (ganci al fegato)
    skinTint: 0xd6a57c, evenSkin: false,
    band: { bg: '#111112', line: '#d4a42c', text: '#d4a42c', label: 'EL TORO' },
    mods: { moveSpeed: 1.2, defenseSpeed: 0.95, attackEvery: 0.7, toughness: 0.85,
      extraCombos: ['3b-3', '1-3b-3', '2b-3-2', '3b-4', '1-2b', '3b-3b', '2-3b-3', '1-2-3b'] },
  },
  kwame: {
    id: 'kwame', name: 'Kwame', glb: 'assets/kwame.glb?v=20261005192220', thumb: 'assets/fighter_kwame.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // ghanese, 1,88 m, 95 kg. "Il Leone": contrattaccante. Aspetta, para benissimo e ti punisce con il destro
    skinTint: null, evenSkin: false, fur: '#0b0908',
    band: { bg: '#f2b705', line: '#121212', text: '#121212', label: 'KWAME' },
    mods: { power: 1.3, defenseSpeed: 1.25, moveSpeed: 0.8, attackEvery: 1.25, toughness: 0.9,
      extraCombos: ['2', '1-2', '2-3', '3-2', '2-3-2', '5-2', '1-2-3'] },
  },
  lars: {
    id: 'lars', name: 'Lars', glb: 'assets/lars.glb?v=20261005192220', thumb: 'assets/fighter_lars.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // norvegese, 1,98 m, 112 kg, tatuaggi vichinghi e coda rossa. Ti tiene lontano con un jab lunghissimo
    skinTint: null, evenSkin: false, fur: '#9c5226', hairTint: '#b0602a',        // rosso rame
    band: { bg: '#2c3540', line: '#c9d6e2', text: '#c9d6e2', label: 'LARS' },
    mods: { power: 1.15, moveSpeed: 0.85, defenseSpeed: 0.95, attackEvery: 0.85,
      extraCombos: ['1', '1-1', '1-2', '1-1-2', '1-2-1', '1-1', '1-2', '1-6'] },
  },
  malik: {
    id: 'malik', name: 'Malik', glb: 'assets/malik.glb?v=20261005192220', thumb: 'assets/fighter_malik.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // marocchino, 1,76 m, 64 kg. "Il Falco": leggero, gambe velocissime, schiva tutto e ti punge di rimessa
    skinTint: 0xc99a70, evenSkin: false, fur: '#15110e',
    band: { bg: '#5b2a86', line: '#d9d9de', text: '#d9d9de', label: 'MALIK' },
    mods: { punchSpeed: 1.15, moveSpeed: 1.4, defenseSpeed: 1.25, evade: 0.14, attackEvery: 1.0, power: 0.85,
      extraCombos: ['1-1', '1-2', '1-1-2', '2-3', '1-2-schivata-2-3', '1-2-abbassata-3-2'] },
    feints: { rate: 0.8, moves: ['feint_jab', 'feint_dip', 'feint_hop'], speed: 1.2 },
  },
  connor: {
    id: 'connor', name: 'Connor', glb: 'assets/connor.glb?v=20261005192220', thumb: 'assets/fighter_connor.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // irlandese, 1,83 m, 82 kg, rosso con le lentiggini. Rissaiolo instancabile: ganci larghi, para poco, non molla mai
    skinTint: null, evenSkin: false, hairTint: '#a8441c',               // capelli rossi
    band: { bg: '#0f7a3c', line: '#f4f3ee', text: '#f4f3ee', label: 'CONNOR' },
    mods: { moveSpeed: 1.05, defenseSpeed: 0.8, attackEvery: 0.62, toughness: 0.8, power: 1.1,
      extraCombos: ['3-4', '3-2-3', '2-3-2', '1-2-3-4', '4-3', '3-4-3', '2-3'] },
  },
  // ---- altri cinque (2026-10-05): presentazione generica + nome
  tavita: {
    id: 'tavita', name: 'Tavita', glb: 'assets/tavita.glb?v=20261005192220', thumb: 'assets/fighter_tavita.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // samoano, 1,86 m, 118 kg, tatuaggi tribali. Il picchiatore: lento, incassa tutto, ma i suoi ganci ti spengono
    skinTint: 0xb98a62, evenSkin: false,
    band: { bg: '#0b6e7a', line: '#f2f1ec', text: '#f2f1ec', label: 'TAVITA' },
    mods: { power: 1.45, punchSpeed: 0.9, moveSpeed: 0.7, defenseSpeed: 0.8, attackEvery: 1.1, toughness: 0.72,
      extraCombos: ['3', '4', '3-4', '2-3', '6-3', '3b-3', '1-3-4', '4-3'] },
  },
  arjun: {
    id: 'arjun', name: 'Arjun', glb: 'assets/arjun.glb?v=20261005192220', thumb: 'assets/fighter_arjun.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // indiano, 1,81 m, 80 kg. Il tecnico: gambe leggere, jab continuo, ti tiene alla distanza e conta i punti
    skinTint: 0xd29c74, evenSkin: false,
    band: { bg: '#ff8c1a', line: '#1b3f8f', text: '#1b3f8f', label: 'ARJUN' },
    mods: { punchSpeed: 1.1, moveSpeed: 1.25, defenseSpeed: 1.15, evade: 0.06, attackEvery: 0.9, power: 0.9,
      extraCombos: ['1', '1-1', '1-2', '1-1-2', '1-2-1', '2-1-2', '1-2-3', '1-1-2-schivata-2'] },
    feints: { rate: 0.7, moves: ['feint_jab', 'feint_jab', 'feint_dip'], speed: 1.15 },
  },
  moussa: {
    id: 'moussa', name: 'Moussa', glb: 'assets/moussa.glb?v=20261005192220', thumb: 'assets/fighter_moussa.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // senegalese, 2,01 m, 92 kg. Il lungo: braccia infinite, guardia bassa e calma, e quando entri ti aspetta il montante
    skinTint: null, evenSkin: false,
    band: { bg: '#e6b422', line: '#0e0e10', text: '#0e0e10', label: 'MOUSSA' },
    mods: { power: 1.1, moveSpeed: 1.0, defenseSpeed: 1.2, attackEvery: 1.15,
      extraCombos: ['5', '6', '1-6', '2-5', '5-6', '6-3', '1-2-5', '3-6', '1-schivata-6'] },
  },
  mateo: {
    id: 'mateo', name: 'Mateo', glb: 'assets/mateo.glb?v=20261005192220', thumb: 'assets/fighter_mateo.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // argentino, 1,79 m, 76 kg. Il martello: ti viene sempre addosso, non smette mai di lavorare al corpo
    skinTint: 0xe8bf98, evenSkin: false,
    band: { bg: '#6cace4', line: '#f4f3ee', text: '#f4f3ee', label: 'MATEO' },
    mods: { moveSpeed: 1.25, defenseSpeed: 0.9, attackEvery: 0.6, toughness: 0.85,
      extraCombos: ['1-2b', '3b-3', '2b-3', '1-3b-3', '3b-4b', '2-3b-2', '1-2-3b-3', '4b-3'] },
  },
  joon: {
    id: 'joon', name: 'Joon', glb: 'assets/joon.glb?v=20261005192220', thumb: 'assets/fighter_joon.webp?v=20261005192220', genericIntro: true,
    face: [185, 30, 110],
    // coreano, 1,74 m, 68 kg. Il fulmine: mani velocissime, raffiche di quattro o cinque colpi e via
    skinTint: 0xe8c39c, evenSkin: false,
    band: { bg: '#101012', line: '#e8e8ec', text: '#e8e8ec', label: 'JOON' },
    mods: { punchSpeed: 1.25, moveSpeed: 1.35, defenseSpeed: 1.2, attackEvery: 0.7, power: 0.8,
      extraCombos: ['1-2-1-2', '1-1-2', '1-2-3-2', '3-2-3', '1-2-1', '2-3-2-3', '1-1-2-3', '1-2-1-2-3'] },
    feints: { rate: 0.6, moves: ['feint_hop', 'feint_dip'], speed: 1.25 },
  },
};
export const FIGHTER_IDS = ['bruce', 'mike', 'eddy', 'fury', 'maxim', 'brutus', 'rocco', 'ace', 'riki', 'bob', 'diego', 'kwame', 'lars', 'malik', 'connor', 'tavita', 'arjun', 'moussa', 'mateo', 'joon'];
