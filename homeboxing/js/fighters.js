// Voci: in tools/gen_voices.py (FIGHTERS) intro_<id> (descrizione) e name_<id> (nome) per ogni pugile.
// Gli avversari: modello (blender/create_mike.py char=...), anteprima per il menu e dettagli di aspetto.
// Ruolo nel gioco sempre lo stesso ("mike" nel codice = l'avversario); qui cambiano nome e aspetto.
export const FIGHTERS = {
  bruce: {
    id: 'bruce', name: 'Bruce', glb: 'assets/bruce.glb?v=20261003190711', thumb: 'assets/fighter_bruce.webp?v=20261003190711',
    face: [163, 5, 110],                                           // volto nell'anteprima (x, y, lato) per il tabellone
    skinTint: 0xe3b98f,                                            // pelle piu' abbronzata della texture MakeHuman
    evenSkin: false,                                               // (la schiaritura delle gambe serve solo alla pelle di Mike)
    band: { bg: '#141416', line: '#c99a2e', text: '#e9c46a' },     // fascia nera con scritta dorata
    // stile: saltella molto (clip "idle" di Blender) e fa finte a vuoto per ingannarti, fluide e coreografiche
    feints: { rate: 1.3, moves: ['feint_jab', 'feint_dip', 'feint_hop', 'feint_jab'], speed: 1.0 },
  },
  mike: {
    id: 'mike', name: 'Mike', glb: 'assets/mike.glb?v=20261003190711', thumb: 'assets/fighter_mike.webp?v=20261003190711',
    face: [178, 0, 110],
    skinTint: null,
    band: { bg: '#f4f4f0', line: '#c99a2e', text: '#1239a8' },
  },
  eddy: {
    id: 'eddy', name: 'Eddy', glb: 'assets/eddy.glb?v=20261003190711', thumb: 'assets/fighter_eddy.webp?v=20261003190711',
    face: [182, 52, 110],
    skinTint: null, evenSkin: false, noStubble: true,            // ai lati rasato a zero: niente ombra di capelli sotto la cresta
    band: { bg: '#0b0b0e', line: '#0a8cff', text: '#3fb0ff' },     // fascia nera con scritta blu fosforescente
    glow: ['Raso blu', 'Pelle guantoni', 'Cresta'],                // blu fosforescente: si illumina anche nel buio
    // stile agile: si muove tanto e veloce, schiva di piu', attacca a raffiche; qualche finta saltellando
    mods: { moveSpeed: 1.35, defenseSpeed: 1.15, evade: 0.08, attackEvery: 0.85 },
    feints: { rate: 0.6, moves: ['feint_hop', 'feint_dip'], speed: 1.15 },
  },
  fury: {
    id: 'fury', name: 'Fury', glb: 'assets/fury.glb?v=20261003190711', thumb: 'assets/fighter_fury.webp?v=20261003190711',
    face: [190, 8, 102],
    skinTint: 0xc99872, evenSkin: false,                           // pelle abbronzata
    // calzoncini thai: fascia dorata larga con il riquadro bianco e la scritta rossa
    band: { bg: '#e3ad25', line: '#b07d10', text: '#c4122a', label: 'FURY', box: '#f6f3ea' },
    // stile: si muove poco ma quando attacca sono combinazioni lunghe e precise
    mods: { moveSpeed: 0.6, defenseSpeed: 1.0, attackEvery: 1.15, extraCombos: ['1-2-3-2', '1-6-3-2', '2-3-2', '1-2-5-2', '3-2-3', '6-3b-3', '1-2-3'] },
  },
  maxim: {
    id: 'maxim', name: 'Maxim', glb: 'assets/maxim.glb?v=20261003190711', thumb: 'assets/fighter_maxim.webp?v=20261003190711',
    face: [192, 34, 100],
    skinTint: null, evenSkin: false, hairTint: '#d9b872',          // biondo
    band: { bg: '#f4f4f0', line: '#c40f22', text: '#c40f22', label: 'MAXIM ★' },
    // stile aggressivo: ti viene addosso, attacca spesso e lavora soprattutto di ganci
    mods: { moveSpeed: 1.15, defenseSpeed: 0.95, attackEvery: 0.7, extraCombos: ['3-4', '3-2-3', '2-3', '1-2-3', '3-2', '2-3-2', '6-3', '1-2-3-2', '3b-4', '3b-3'] },
  },
};
export const FIGHTER_IDS = ['bruce', 'mike', 'eddy', 'fury', 'maxim'];
