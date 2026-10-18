const fs = require('fs');
const path = '/home/z/my-project/download/Challenge Planner.html';
const html = fs.readFileSync(path, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('script blocks found:', scripts.length);
scripts.forEach((s, i) => {
  fs.writeFileSync('/home/z/my-project/scripts/_script_' + i + '.js', s);
});
// also extract the prayer calculation block for standalone testing
const m = html.match(/\/\*PTCALC-START\*\/([\s\S]*?)\/\*PTCALC-END\*\//);
if (m) {
  fs.writeFileSync('/home/z/my-project/scripts/_ptcalc.js', 'const pad=n=>String(n).padStart(2,"0");\n' + m[1] + '\nmodule.exports={localTimings,PMAP};');
  console.log('ptcalc extracted:', m[1].length, 'chars');
} else { console.log('PTCALC NOT FOUND!'); }
