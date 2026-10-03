// Lingua del gioco: italiano o inglese. All'inizio segue la lingua del sistema; dal menu si puo' cambiare
// (la scelta resta salvata). Scritte e voci (game/assets/voce/it, .../en) seguono la stessa lingua.
const STR = {
  it: {
    menu_sub: 'tieni un guantone sul pulsante', where: 'DOVE', m_stanza: 'La tua stanza', m_arena: 'Nell\'arena', m_spiaggia: 'In spiaggia',
    level: 'LIVELLO', l_facile: 'Facile', l_normale: 'Normale', l_difficile: 'Difficile', l_impossibile: 'Impossibile',
    rounds: 'ROUND', duration: 'DURATA DI UN ROUND', rule3: 'REGOLA DEI 3 ATTERRAMENTI', yes: 'Sì', no: 'No', language: 'LINGUA',
    start: 'INIZIA INCONTRO', quit: 'ESCI DAL GIOCO',
    next_title: 'ROUND {n} TRA {s} s', next_btn: 'VAI AL PROSSIMO ROUND',
    intro_title: 'IL MATCH INIZIA TRA {s} s', skip_intro: 'INIZIA SUBITO',
    mode_title: 'MODALITÀ DI GIOCO', m_arcade: 'Arcade', m_training: 'Allenamento', soon: 'presto', m_tour: 'Torneo',
    arcade: 'ARCADE', tour: 'TORNEO', stage: 'STAGE', m_random: 'Arena random', back: 'INDIETRO', start_tour: 'INIZIA TORNEO',
    tr_title: 'TORNEO HOME BOXING', tr_r32: 'Sedicesimi di finale', tr_r16: 'Ottavi di finale', tr_qf: 'Quarti di finale',
    tr_sf: 'Semifinale', tr_f: 'Finale', tr_next: '{round}: TU contro {b}', tr_fight: 'COMBATTI', tr_quit: 'ESCI DAL TORNEO',
    tr_menu: 'TORNA AL MENU', tr_champ: 'CAMPIONE DEL TORNEO!', tr_lost: 'Eliminato da {b} ({round})', tr_adv: '{round}: hai vinto, passi il turno!',
    pause: 'PAUSA', fight_over: 'FINE INCONTRO', resume: 'RIPRENDI', restart: 'RICOMINCIA', menu_btn: 'MENU',
    getup_title: 'COLPISCI {n} VOLTE PER RIALZARTI', getup_left: 'ancora {n}',
    you: 'TU', stats: 'Colpi {h} · Parate {b} · Schivate {d}', down_times: 'A terra {n} {v}', once: 'volta', times: 'volte', penalties: 'Penalità {n}/3',
    round_of: 'Round {r} di {n}', mike_down: '{NAME} E\' A TERRA!',
    you_down_hit: 'SEI A TERRA! Colpisci {n} volte il bottone per rialzarti', you_down_out: 'SEI A TERRA… non hai più energia',
    third_kd: '{who}: terzo atterramento, l\'arbitro ferma l\'incontro!', who_you: 'Tu', who_mike: '{name}', opp: '{NAME}', opponent: 'AVVERSARIO',
    is_up: 'in piedi', is_down: 'a terra', hit_button: ' · colpisci il bottone! ({n})', up_after8: 'In piedi! Si riprende dopo l\'8',
    win_you: 'HAI VINTO per {how}!', win_mike: 'Vince {name} per {how}', draw: 'Pareggio ai punti ({pts})',
    how_KO: 'KO', how_TKO: 'KO tecnico', how_DQ: 'squalifica', how_PTS: 'decisione ai punti',
    dq3: 'Terzo colpo basso: SQUALIFICATO!', lowblow: 'Colpo basso! Penalità {p} di 3',
    you_head: 'Tu: colpo alla testa +2', you_body: 'Tu: colpo al corpo +1', mike_blocks: '{name} para', mike_dodges: '{name} schiva',
    mike_body: '{name}: colpo al corpo +1', mike_head: '{name}: colpo alla testa +2', blocked: 'Parata!', dodged: 'Schivata!',
    choose_menu: 'Scegli dal menu davanti a te', starts_in: 'Round {r} di {n} · si comincia tra {s}…',
    low_ring: 'Ring basso? Accovacciati e tieni una mano a terra 2 s · {s}', pause_hint: 'Pausa: alza le due mani all\'altezza della fronte · {s}',
    rest: 'Riposo all\'angolo · round {r} tra {s} s', menu: 'Menu', floor_fixed: 'Pavimento sistemato!', presenting: 'Presentazione dei pugili…',
    diag: 'ring {m} m · pavimento: {f} · occhi a {e} m da terra',
    loading: 'Caricamento gioco… {p}%', play: 'Gioca', no_xr: 'Questo browser non supporta la realtà mista: usa il browser del Quest 3 (oppure prova l\'anteprima su PC).',
    load_err: 'Errore nel caricamento di Mike: {e}', xr_err: 'Impossibile entrare in realtà mista: {e}',
  },
  en: {
    menu_sub: 'hold a glove on a button', where: 'WHERE', m_stanza: 'Your room', m_arena: 'Arena', m_spiaggia: 'Beach',
    level: 'LEVEL', l_facile: 'Easy', l_normale: 'Normal', l_difficile: 'Hard', l_impossibile: 'Impossible',
    rounds: 'ROUNDS', duration: 'ROUND LENGTH', rule3: 'THREE KNOCKDOWN RULE', yes: 'Yes', no: 'No', language: 'LANGUAGE',
    start: 'START FIGHT', quit: 'EXIT GAME',
    next_title: 'ROUND {n} IN {s} s', next_btn: 'GO TO NEXT ROUND',
    intro_title: 'FIGHT STARTS IN {s} s', skip_intro: 'START NOW',
    mode_title: 'GAME MODE', m_arcade: 'Arcade', m_training: 'Training', soon: 'soon', m_tour: 'Tournament',
    arcade: 'ARCADE', tour: 'TOURNAMENT', stage: 'STAGE', m_random: 'Random arena', back: 'BACK', start_tour: 'START TOURNAMENT',
    tr_title: 'HOME BOXING TOURNAMENT', tr_r32: 'Round of 32', tr_r16: 'Round of 16', tr_qf: 'Quarter-final',
    tr_sf: 'Semi-final', tr_f: 'Final', tr_next: '{round}: YOU vs {b}', tr_fight: 'FIGHT', tr_quit: 'LEAVE TOURNAMENT',
    tr_menu: 'BACK TO MENU', tr_champ: 'TOURNAMENT CHAMPION!', tr_lost: 'Knocked out by {b} ({round})', tr_adv: '{round}: you won, you go through!',
    pause: 'PAUSED', fight_over: 'FIGHT OVER', resume: 'RESUME', restart: 'RESTART', menu_btn: 'MENU',
    getup_title: 'HIT IT {n} TIMES TO GET UP', getup_left: '{n} to go',
    you: 'YOU', stats: 'Hits {h} · Blocks {b} · Dodges {d}', down_times: 'Down {n} {v}', once: 'time', times: 'times', penalties: 'Penalties {n}/3',
    round_of: 'Round {r} of {n}', mike_down: '{NAME} IS DOWN!',
    you_down_hit: 'YOU\'RE DOWN! Hit the button {n} times to get up', you_down_out: 'YOU\'RE DOWN… no energy left',
    third_kd: '{who}: third knockdown, the referee stops the fight!', who_you: 'You', who_mike: '{name}', opp: '{NAME}', opponent: 'OPPONENT',
    is_up: 'up', is_down: 'down', hit_button: ' · hit the button! ({n})', up_after8: 'Up! The fight resumes after eight',
    win_you: 'YOU WIN by {how}!', win_mike: '{name} wins by {how}', draw: 'Draw on points ({pts})',
    how_KO: 'knockout', how_TKO: 'technical knockout', how_DQ: 'disqualification', how_PTS: 'decision on points',
    dq3: 'Third low blow: DISQUALIFIED!', lowblow: 'Low blow! Penalty {p} of 3',
    you_head: 'You: head shot +2', you_body: 'You: body shot +1', mike_blocks: '{name} blocks', mike_dodges: '{name} dodges',
    mike_body: '{name}: body shot +1', mike_head: '{name}: head shot +2', blocked: 'Blocked!', dodged: 'Dodged!',
    choose_menu: 'Choose from the menu in front of you', starts_in: 'Round {r} of {n} · starting in {s}…',
    low_ring: 'Ring too low? Crouch and keep a hand on the floor for 2 s · {s}', pause_hint: 'Pause: raise both hands to forehead height · {s}',
    rest: 'Resting in the corner · round {r} in {s} s', menu: 'Menu', floor_fixed: 'Floor adjusted!', presenting: 'Introducing the fighters…',
    diag: 'ring {m} m · floor: {f} · eyes {e} m above the floor',
    loading: 'Loading game… {p}%', play: 'Play', no_xr: 'This browser does not support mixed reality: use the Quest 3 browser (or try the PC preview).',
    load_err: 'Error loading Mike: {e}', xr_err: 'Could not start mixed reality: {e}',
  },
};

function detect() {
  try { const s = localStorage.getItem('hb-lang'); if (s === 'it' || s === 'en') return s; } catch (e) {}
  const l = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
  return /^it\b/i.test(l) ? 'it' : 'en';
}
export let lang = detect();
const listeners = [];
export function onLang(f) { listeners.push(f); }
export function setLang(l) {
  if (l !== 'it' && l !== 'en' || l === lang) return;
  lang = l;
  try { localStorage.setItem('hb-lang', l); } catch (e) {}
  for (const f of listeners) f(l);
}
// t('chiave', { var: valore }) -> testo nella lingua attuale
// nome dell'avversario scelto: {name} / {NAME} nelle frasi
let opp = 'Bruce';
export function setOpponentName(n) { opp = n; }
export function t(key, vars) {
  let s = (STR[lang] && STR[lang][key]) ?? STR.it[key] ?? key;
  s = s.split('{name}').join(opp).split('{NAME}').join(opp.toUpperCase());
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}
