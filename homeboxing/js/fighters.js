// Voci: in tools/gen_voices.py (FIGHTERS) intro_<id> (descrizione) e name_<id> (nome) per ogni pugile.
// Gli avversari: modello (blender/create_mike.py char=...), anteprima per il menu e dettagli di aspetto.
// Ruolo nel gioco sempre lo stesso ("mike" nel codice = l'avversario); qui cambiano nome e aspetto.
export const FIGHTERS = {
  bruce: {
    id: 'bruce', name: 'Bruce', glb: 'assets/bruce.glb?v=20261003210134', thumb: 'assets/fighter_bruce.webp?v=20261003210134',
    face: [163, 5, 110],                                           // volto nell'anteprima (x, y, lato) per il tabellone
    skinTint: 0xe3b98f,                                            // pelle piu' abbronzata della texture MakeHuman
    evenSkin: false,                                               // (la schiaritura delle gambe serve solo alla pelle di Mike)
    band: { bg: '#141416', line: '#c99a2e', text: '#e9c46a' },     // fascia nera con scritta dorata
    // stile: saltella molto (clip "idle" di Blender) e fa finte a vuoto per ingannarti, fluide e coreografiche
    feints: { rate: 1.3, moves: ['feint_jab', 'feint_dip', 'feint_hop', 'feint_jab'], speed: 1.0 },
  },
  mike: {
    id: 'mike', name: 'Mike', glb: 'assets/mike.glb?v=20261003210134', thumb: 'assets/fighter_mike.webp?v=20261003210134',
    face: [178, 0, 110],
    skinTint: null,
    band: { bg: '#f4f4f0', line: '#c99a2e', text: '#1239a8' },
  },
  eddy: {
    id: 'eddy', name: 'Eddy', glb: 'assets/eddy.glb?v=20261003210134', thumb: 'assets/fighter_eddy.webp?v=20261003210134',
    face: [182, 52, 110],
    skinTint: null, evenSkin: false, noStubble: true,            // ai lati rasato a zero: niente ombra di capelli sotto la cresta
    band: { bg: '#0b0b0e', line: '#0a8cff', text: '#3fb0ff' },     // fascia nera con scritta blu fosforescente
    glow: ['Raso blu', 'Pelle guantoni', 'Cresta'],                // blu fosforescente: si illumina anche nel buio
    // stile agile: si muove tanto e veloce, schiva di piu', attacca a raffiche; qualche finta saltellando
    mods: { moveSpeed: 1.35, defenseSpeed: 1.15, evade: 0.08, attackEvery: 0.85 },
    feints: { rate: 0.6, moves: ['feint_hop', 'feint_dip'], speed: 1.15 },
  },
  fury: {
    id: 'fury', name: 'Fury', glb: 'assets/fury.glb?v=20261003210134', thumb: 'assets/fighter_fury.webp?v=20261003210134',
    face: [190, 8, 102],
    skinTint: 0xc99872, evenSkin: false,                           // pelle abbronzata
    // calzoncini thai: fascia dorata larga con il riquadro bianco e la scritta rossa
    band: { bg: '#e3ad25', line: '#b07d10', text: '#c4122a', label: 'FURY', box: '#f6f3ea' },
    // stile: si muove poco ma quando attacca sono combinazioni lunghe e precise
    mods: { moveSpeed: 0.6, defenseSpeed: 1.0, attackEvery: 1.15, extraCombos: ['1-2-3-2', '1-6-3-2', '2-3-2', '1-2-5-2', '3-2-3', '6-3b-3', '1-2-3'] },
  },
  maxim: {
    id: 'maxim', name: 'Maxim', glb: 'assets/maxim.glb?v=20261003210134', thumb: 'assets/fighter_maxim.webp?v=20261003210134',
    face: [192, 34, 100],
    skinTint: null, evenSkin: false, hairTint: '#d9b872',          // biondo
    band: { bg: '#f4f4f0', line: '#c40f22', text: '#c40f22', label: 'MAXIM ★' },
    // stile aggressivo: ti viene addosso, attacca spesso e lavora soprattutto di ganci
    mods: { moveSpeed: 1.15, defenseSpeed: 0.95, attackEvery: 0.7, extraCombos: ['3-4', '3-2-3', '2-3', '1-2-3', '3-2', '2-3-2', '6-3', '1-2-3-2', '3b-4', '3b-3'] },
  },
  brutus: {
    id: 'brutus', name: 'Brutus', glb: 'assets/brutus.glb?v=20261003210134', thumb: 'assets/fighter_brutus.webp?v=20261003210134',
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
    id: 'rocco', name: 'Rocco', glb: 'assets/rocco.glb?v=20261003210134', thumb: 'assets/fighter_rocco.webp?v=20261003210134',
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
    id: 'ace', name: 'Ace', glb: 'assets/ace.glb?v=20261003210134', thumb: 'assets/fighter_ace.webp?v=20261003210134',
    face: [195, 15, 95],
    skinTint: 0x6e5244, evenSkin: false, skinGloss: 0.4,           // nerissimo, un po' lucido
    fur: '#0c0a09',                                                 // capelli rasati neri (non grigi sulla pelle scura)
    band: { bg: '#f2f1ec', line: '#0c6b3c', text: '#0c6b3c', label: 'ACE ♠' },
    // stile: velocita' pura. Pugni piu' rapidi, si muove tanto, raffiche lunghe di colpi
    mods: { punchSpeed: 1.2, moveSpeed: 1.3, defenseSpeed: 1.1, attackEvery: 0.8,
      extraCombos: ['1-1-2', '1-2-3-2', '1-2-5-2', '1-6-3-2', '2-3-2', '1-2-3', '3-2-3', '1-2-schivata-2-3', '1-2-abbassata-3-2'] },
    feints: { rate: 0.5, moves: ['feint_jab', 'feint_hop'], speed: 1.25 },
  },
};
export const FIGHTER_IDS = ['bruce', 'mike', 'eddy', 'fury', 'maxim', 'brutus', 'rocco', 'ace'];
