const VOCAB_UPGRADES = [
  { re:/\bvery crowded\b/i, better:'packed', note:"'packed' is more natural for a tight space" },
  { re:/\bcrowded\b/i, better:'overcrowded', note:"when it's really bad, natives say 'overcrowded'" },
  { re:/\bvery much (hot|cold)\b/i, better:m=>m[1].toLowerCase()==='hot'?'boiling':'freezing', note:"one strong word beats two weak ones" },
  { re:/\bvery tired\b/i, better:'exhausted', note:"'exhausted' hits harder" },
  { re:/\bvery angry\b/i, better:'furious', note:"'furious' is stronger" },
  { re:/\bvery happy\b/i, better:'thrilled', note:"'thrilled' sounds more alive" },
  { re:/\bvery sad\b/i, better:'heartbroken', note:"more precise" },
  { re:/\bvery big\b/i, better:'huge', note:"one word, more punch" },
  { re:/\bvery small\b/i, better:'tiny', note:"one word, more punch" },
  { re:/\bvery bad\b/i, better:'terrible', note:"stronger" },
  { re:/\bvery nice\b/i, better:'lovely', note:"warmer word" },
  { re:/\bno option\b/i, better:'no other option', note:"small addition, more natural" },
  { re:/\bother city\b/i, better:'another city', note:"'another' for one of many" },
  { re:/\bin tomorrow morning\b/i, better:'tomorrow morning', note:"'in' and 'tomorrow' don't combine" }
];

export function vocabUpgrades(text) {
  const found = [];
  for (const u of VOCAB_UPGRADES) {
    const m = text.match(u.re);
    if (!m) continue;
    const better = typeof u.better === 'function' ? u.better(m) : u.better;
    if (better && better.toLowerCase() !== m[0].toLowerCase()) {
      found.push({ from: m[0], to: better, note: u.note });
    }
  }
  return found;
}