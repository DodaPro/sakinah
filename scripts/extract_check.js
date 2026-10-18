const fs = require('fs');
const src = fs.readFileSync('/home/z/my-project/download/Challenge Planner.html', 'utf8');
const m = src.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('NO SCRIPT FOUND'); process.exit(1); }
fs.writeFileSync('/home/z/my-project/scripts/_extracted.js', m[1]);
console.log('script chars:', m[1].length);
// quick sanity: check key identifiers exist exactly once where expected
const ids = ['initSpirit', 'updatePrayers', 'renderDhikr', 'tickPrayers', 'tickDhikr', 'tryGeo', 'data-dnext', 'p-method', 'prayer-cache-v1'];
ids.forEach(id => {
  const c = (m[1].match(new RegExp(id, 'g')) || []).length;
  console.log(id, '=>', c, 'occurrence(s)');
});
