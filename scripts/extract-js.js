const fs = require('fs');
const html = fs.readFileSync('/home/z/my-project/download/Challenge Planner.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('script blocks found:', scripts.length);
scripts.forEach((s, i) => {
  fs.writeFileSync('/tmp/script_' + i + '.js', s);
});
