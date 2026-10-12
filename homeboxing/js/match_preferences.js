// Versioned, independent match settings. Legacy global keys are deliberately ignored.
export const MATCH_DEFAULTS = Object.freeze({stage:'palestra',level:'normale',rounds:3,roundSecs:180,threeKO:true,oneKO:false,opponent:'mike',tourSize:32,towerSize:16});
export const MATCH_MODES = ['arcade','tour','surv'];
export function createMatchPreferences(storage, stages, fighters) {
  const key = mode => 'hb-match-v1-' + mode;
  const validate = raw => {
    const p={...MATCH_DEFAULTS}, r=raw && typeof raw==='object'?raw:{};
    for(const [name,allowed] of Object.entries({stage:[...stages,'random'],level:['facile','normale','difficile','impossibile'],rounds:[1,3,6,12],roundSecs:[60,120,180],opponent:[...fighters,'random'],tourSize:[32,64],towerSize:[8,16,fighters.length]}))
      if(allowed.includes(r[name]))p[name]=r[name];
    for(const name of ['threeKO','oneKO'])if(typeof r[name]==='boolean')p[name]=r[name];
    return p;
  };
  const values={};
  for(const mode of MATCH_MODES){let raw;try{raw=JSON.parse(storage?.getItem(key(mode)));}catch{}values[mode]=validate(raw);}
  return {
    get(mode){if(!MATCH_MODES.includes(mode))throw Error('Unknown match mode');return {...values[mode]};},
    save(mode,draft){if(!MATCH_MODES.includes(mode))throw Error('Unknown match mode');values[mode]=validate(draft);try{storage?.setItem(key(mode),JSON.stringify(values[mode]));}catch{}return {...values[mode]};}
  };
}
