// Statistiche delle partite (salvate nel browser/visore): per ogni gioco data, durata, livello e punteggi.
import { t } from './i18n.js';

const KEY = 'lumino-stats-v1';
const KEEP = 60;   // partite ricordate per gioco

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { bacche: [], difendi: [] }; }
  catch { return { bacche: [], difendi: [] }; }
}

export class Stats {
  constructor() { this.data = load(); }

  add(game, entry) {
    const list = (this.data[game] ||= []);
    list.unshift({ date: Date.now(), ...entry });
    list.length = Math.min(list.length, KEEP);
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* spazio non disponibile */ }
  }

  static when(ts) {
    const d = new Date(ts);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // [{ pos, name, score }] dal piu' alto; a pari punti stessa posizione
  static ranking(score = {}) {
    const list = Object.entries(score).map(([k, v]) => ({ key: k, name: k === 'me' ? t('you') : k, score: v }))
      .sort((a, b) => b.score - a.score);
    list.forEach((r, i) => { r.pos = i > 0 && r.score === list[i - 1].score ? list[i - 1].pos : i + 1; });
    // se il primo posto e' condiviso non c'e' un vincitore unico
    if (list.length > 1 && list[1].pos === 1) list[0].tie = true;
    return list;
  }

  // partite di un gioco; per Difendi si puo' filtrare per difficolta' (non sono confrontabili tra loro)
  list(game, level = null) {
    return (this.data[game] || []).filter(e => !level || e.level === level);
  }

  // riepilogo di un gioco ('bacche' | 'difendi')
  summary(game, level = null) {
    const list = this.list(game, level);
    if (game === 'bacche') {
      const best = list.reduce((m, e) => Math.max(m, e.score?.me ?? 0), 0);
      const wins = list.filter(e => { const r = Stats.ranking(e.score)[0]; return r?.key === 'me' && !r.tie; }).length;
      return t('stats.summaryB', { n: list.length, w: wins, b: best });
    }
    const won = list.filter(e => e.result === 'vittoria').length;
    const best = list.reduce((m, e) => Math.max(m, e.score ?? 0), 0);
    return t('stats.summaryD', { n: list.length, w: won, b: best });
  }

  // una riga per partita, dalla piu' recente
  entries(game, level = null) {
    return this.list(game, level).map(e => {
      if (game === 'bacche') {
        const pts = Stats.ranking(e.score).map(r => `${r.pos}° ${r.name} ${r.score}`).join(' · ');
        return t('stats.rowB', { d: Stats.when(e.date), m: e.minutes, p: pts, i: e.completed ? '' : t('stats.interrupted') });
      }
      const res = t('stats.res.' + e.result);
      return t('stats.rowD', { d: Stats.when(e.date), m: e.minutes, r: res, s: e.score, t: e.seconds });
    });
  }

  // righe per la pagina iniziale
  lines(maxPerGame = 4) {
    const out = [];
    const b = this.list('bacche');
    out.push(t('stats.headB', { x: this.summary('bacche') }));
    // classifica di ogni partita: posizione e punteggio di ogni partecipante (tu, Lumino, Lumina)
    for (const l of this.entries('bacche').slice(0, maxPerGame)) out.push(`   ${l}`);
    // Difendi: una sezione per difficolta', perche' i punteggi non sono confrontabili
    let anyD = false;
    for (const level of ['facile', 'normale', 'difficile']) {
      if (!this.list('difendi', level).length) continue;
      anyD = true;
      out.push(t('stats.headD', { l: t('level.' + level), x: this.summary('difendi', level) }));
      for (const l of this.entries('difendi', level).slice(0, maxPerGame)) out.push(`   ${l}`);
    }
    if (!anyD) out.push(t('stats.noneD'));
    if (!b.length && !anyD) out.push(t('stats.noneAll'));
    return out;
  }
}
