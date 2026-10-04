// Lingua del gioco: italiano o inglese. All'inizio segue la lingua del sistema; dal menu si puo' cambiare
// (la scelta resta salvata). Scritte e voci (game/assets/voce/it, .../en) seguono la stessa lingua.
const STR = {
  it: {
    menu_sub: 'tieni un guantone sul pulsante', where: 'DOVE', m_stanza: 'La tua stanza', m_arena: 'Nell\'arena', m_spiaggia: 'In spiaggia', m_grattacielo: 'Grattacielo', m_deserto: 'Nel deserto', m_neve: 'Nella neve', pause_change: 'CAMBIA ALLENAMENTO', dm_random: 'CASUALE (TUTTI I COLPI)', dm_pick: 'OPPURE SCEGLI I COLPI', dm_start: 'INIZIA', dk_jab: 'Jab', dk_cross: 'Diretto', dk_hook_l: 'Gancio sx', dk_hook_r: 'Gancio dx', dk_upper_l: 'Montante sx', dk_upper_r: 'Montante dx', dk_body: 'Al corpo', m_palestra: 'In palestra',
    level: 'LIVELLO', l_facile: 'Facile', l_normale: 'Normale', l_difficile: 'Difficile', l_impossibile: 'Impossibile',
    rounds: 'ROUND', duration: 'DURATA DI UN ROUND', rule3: 'REGOLA DEI 3 ATTERRAMENTI', yes: 'Sì', no: 'No', language: 'LINGUA',
    start: 'INIZIA INCONTRO', quit: 'ESCI DAL GIOCO',
    next_title: 'ROUND {n} TRA {s} s', next_btn: 'VAI AL PROSSIMO ROUND',
    intro_title: 'IL MATCH INIZIA TRA {s} s', skip_intro: 'INIZIA SUBITO',
    mode_title: 'MODALITÀ DI GIOCO', m_arcade: 'Arcade', m_training: 'Allenamento', soon: 'presto', training: 'ALLENAMENTO', tr_bag: 'Sacco', tr_speed: 'Speed bag', tr_double: 'Double end bag', tr_rope: 'Corda', bag_title: 'ALLENAMENTO AL SACCO', bag_time: 'TEMPO', bag_hits: 'COLPI A SEGNO', bag_best: 'COLPO PIÙ FORTE', bag_rate: 'COLPI AL MINUTO', rope_title: 'SALTO DELLA CORDA', speed_title: 'PERA VELOCE', de_title: 'PALLA A DOPPIO ELASTICO', tr_spar: 'Sparring', sp_title: 'SPARRING', sp_libero: 'LIBERO', sp_combo: 'COMBINAZIONI', sp_difesa: 'DIFESA', sp_choose: 'ESERCIZIO A SCELTA', sp_ok: 'GIUSTE', sp_wrong: 'SBAGLIATE', sp_avoided: 'EVITATI', sp_taken: 'PRESI', sp_guard: 'IN GUARDIA', sp_landed: 'A SEGNO', sp_defended: 'PARATI', sp_speed: 'VELOCITÀ', sp_hint: 'Velocità del partner: tieni il guantone sul pomello della barra e trascinalo', de_taken: 'TI HA COLPITO', speed_hits: 'A SEGNO', speed_miss: 'A VUOTO', speed_acc: 'PRECISIONE', rope_jumps: 'SALTI', rope_errors: 'ERRORI', rope_streak: 'DI FILA', rope_best: 'RECORD DI FILA', m_tour: 'Torneo', m_surv: 'Sopravvivenza', surv: 'SOPRAVVIVENZA', start_surv: 'INIZIA LA SCALATA', sv_title: 'LA TORRE', sv_quit: 'ESCI DALLA TORRE', sv_floor: 'PIANO {n}', sv_next: 'Piano {n}: TU contro {b}', sv_won: 'Hai battuto {b}! Si sale!', sv_lost: 'Sconfitto da {b} al piano {n}', sv_champ: 'HAI CONQUISTATO LA TORRE!', bn_surv: 'SOPRAVVIVENZA',
    arcade: 'ARCADE', tour: 'TORNEO', stage: 'STAGE', m_random: 'Arena random', f_random: 'Random', cpu_vs: '{a} contro {b}', back: 'INDIETRO', start_tour: 'INIZIA TORNEO',
    tr_title: 'TORNEO HOME BOXING', tr_r32: 'Sedicesimi di finale', tr_r16: 'Ottavi di finale', tr_qf: 'Quarti di finale',
    tr_sf: 'Semifinale', tr_f: 'Finale', tr_next: '{round}: TU contro {b}', tr_fight: 'COMBATTI', tr_quit: 'ESCI DAL TORNEO',
    tr_menu: 'TORNA AL MENU', tr_champ: 'CAMPIONE DEL TORNEO!', tr_lost: 'Eliminato da {b} ({round})', tr_adv: '{round}: hai vinto, passi il turno!',
    tr_cpu: '{round}: {a} contro {b} - vuoi guardarlo?', tr_watch: 'GUARDA L\'INCONTRO', tr_continue: 'CONTINUA', tr_skip: 'VAI AL RISULTATO',
    pause: 'PAUSA', out_ring: 'Sei uscito dal ring: rientra per riprendere', bn_red: 'ANGOLO ROSSO', bn_you: 'TU', bn_go: 'FORZA {NAME}!', bn_champ: 'CAMPIONATO DEI PESI MASSIMI', bn_tour: 'TORNEO DEI PESI MASSIMI', fight_over: 'FINE INCONTRO', res_win: 'HAI VINTO!', res_lose: 'HAI PERSO', res_draw: 'PAREGGIO', resume: 'RIPRENDI', restart: 'RICOMINCIA', replay: 'RIGIOCA', menu_btn: 'MENU',
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
    low_ring: 'Ring basso? Accovacciati e tieni una mano a terra 2 s · {s}', pause_hint: 'Pausa: tasto del controller o menu del visore · {s}',
    rest: 'Riposo all\'angolo · round {r} tra {s} s', menu: 'Menu', floor_fixed: 'Pavimento sistemato!', presenting: 'Presentazione dei pugili…',
    diag: 'ring {m} m · pavimento: {f} · occhi a {e} m da terra',
    loading: 'Caricamento gioco… {p}%', play: 'Gioca', no_xr: 'Questo browser non supporta la realtà mista: usa il browser del Quest 3 (oppure prova l\'anteprima su PC).',
    load_err: 'Errore nel caricamento di Mike: {e}', xr_err: 'Impossibile entrare in realtà mista: {e}',
  },
  en: {
    menu_sub: 'hold a glove on a button', where: 'WHERE', m_stanza: 'Your room', m_arena: 'Arena', m_spiaggia: 'Beach', m_grattacielo: 'Skyscraper', m_deserto: 'Desert', m_neve: 'Snow', pause_change: 'CHANGE DRILL', dm_random: 'RANDOM (ALL PUNCHES)', dm_pick: 'OR PICK THE PUNCHES', dm_start: 'START', dk_jab: 'Jab', dk_cross: 'Cross', dk_hook_l: 'Left hook', dk_hook_r: 'Right hook', dk_upper_l: 'Left upper', dk_upper_r: 'Right upper', dk_body: 'Body', m_palestra: 'Gym',
    level: 'LEVEL', l_facile: 'Easy', l_normale: 'Normal', l_difficile: 'Hard', l_impossibile: 'Impossible',
    rounds: 'ROUNDS', duration: 'ROUND LENGTH', rule3: 'THREE KNOCKDOWN RULE', yes: 'Yes', no: 'No', language: 'LANGUAGE',
    start: 'START FIGHT', quit: 'EXIT GAME',
    next_title: 'ROUND {n} IN {s} s', next_btn: 'GO TO NEXT ROUND',
    intro_title: 'FIGHT STARTS IN {s} s', skip_intro: 'START NOW',
    mode_title: 'GAME MODE', m_arcade: 'Arcade', m_training: 'Training', soon: 'soon', training: 'TRAINING', tr_bag: 'Heavy bag', tr_speed: 'Speed bag', tr_double: 'Double end bag', tr_rope: 'Jump rope', bag_title: 'HEAVY BAG TRAINING', bag_time: 'TIME', bag_hits: 'PUNCHES LANDED', bag_best: 'HARDEST PUNCH', bag_rate: 'PUNCHES PER MINUTE', rope_title: 'JUMP ROPE', speed_title: 'SPEED BAG', de_title: 'DOUBLE END BAG', tr_spar: 'Sparring', sp_title: 'SPARRING', sp_libero: 'FREE', sp_combo: 'COMBINATIONS', sp_difesa: 'DEFENSE', sp_choose: 'DRILL OF YOUR CHOICE', sp_ok: 'RIGHT', sp_wrong: 'WRONG', sp_avoided: 'AVOIDED', sp_taken: 'TAKEN', sp_guard: 'BACK IN GUARD', sp_landed: 'LANDED', sp_defended: 'DEFENDED', sp_speed: 'SPEED', sp_hint: 'Partner speed: hold a glove on the slider knob and drag it', de_taken: 'IT HIT YOU', speed_hits: 'HITS', speed_miss: 'MISSES', speed_acc: 'ACCURACY', rope_jumps: 'JUMPS', rope_errors: 'MISSES', rope_streak: 'IN A ROW', rope_best: 'BEST STREAK', m_tour: 'Tournament', m_surv: 'Survival', surv: 'SURVIVAL', start_surv: 'START THE CLIMB', sv_title: 'THE TOWER', sv_quit: 'LEAVE THE TOWER', sv_floor: 'FLOOR {n}', sv_next: 'Floor {n}: YOU vs {b}', sv_won: 'You beat {b}! Going up!', sv_lost: 'Beaten by {b} on floor {n}', sv_champ: 'YOU CONQUERED THE TOWER!', bn_surv: 'SURVIVAL',
    arcade: 'ARCADE', tour: 'TOURNAMENT', stage: 'STAGE', m_random: 'Random arena', f_random: 'Random', cpu_vs: '{a} vs {b}', back: 'BACK', start_tour: 'START TOURNAMENT',
    tr_title: 'HOME BOXING TOURNAMENT', tr_r32: 'Round of 32', tr_r16: 'Round of 16', tr_qf: 'Quarter-final',
    tr_sf: 'Semi-final', tr_f: 'Final', tr_next: '{round}: YOU vs {b}', tr_fight: 'FIGHT', tr_quit: 'LEAVE TOURNAMENT',
    tr_menu: 'BACK TO MENU', tr_champ: 'TOURNAMENT CHAMPION!', tr_lost: 'Knocked out by {b} ({round})', tr_adv: '{round}: you won, you go through!',
    tr_cpu: '{round}: {a} vs {b} - do you want to watch?', tr_watch: 'WATCH THE FIGHT', tr_continue: 'CONTINUE', tr_skip: 'SKIP TO RESULT',
    pause: 'PAUSED', out_ring: 'You left the ring: step back in to resume', bn_red: 'RED CORNER', bn_you: 'YOU', bn_go: 'GO {NAME}!', bn_champ: 'HEAVYWEIGHT CHAMPIONSHIP', bn_tour: 'HEAVYWEIGHT TOURNAMENT', fight_over: 'FIGHT OVER', res_win: 'YOU WIN!', res_lose: 'YOU LOSE', res_draw: 'DRAW', resume: 'RESUME', restart: 'RESTART', replay: 'PLAY AGAIN', menu_btn: 'MENU',
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
    low_ring: 'Ring too low? Crouch and keep a hand on the floor for 2 s · {s}', pause_hint: 'Pause: controller button or headset menu · {s}',
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
