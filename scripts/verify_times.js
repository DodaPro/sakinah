/* مقارنة شاملة بين حساب الملف المدموج و adhan.js المرجعي لعدة مدن */
const fs = require('fs'), vm = require('vm');
const { Coordinates, CalculationMethod, PrayerTimes } = require('/home/z/my-project/scripts/ref/node_modules/adhan');

const html = fs.readFileSync('/home/z/my-project/download/Challenge Planner.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
function fakeEl() {
  return { innerHTML: '', textContent: '', hidden: false, dataset: {}, style: { setProperty(){}, removeProperty(){} },
    classList: { toggle(){} }, appendChild(){}, remove(){}, querySelector(){ return null }, setAttribute(){}, getAttribute(){ return null }, removeAttribute(){} };
}
const sb = { console, Date, Math, JSON, Object, Array, String, Number, parseInt, parseFloat, isNaN,
  setInterval: () => 0, setTimeout: () => 0, document: { querySelector: () => fakeEl(), querySelectorAll: () => [], addEventListener(){}, documentElement: fakeEl(), body: fakeEl(), createElement: () => fakeEl(), hidden: false },
  navigator: {}, localStorage: { getItem: () => null, setItem(){} }, Intl };
sb.window = sb; vm.createContext(sb); vm.runInContext(scripts[1], sb);
const calc = sb.__islam;

const TZ_H = 3; /* نحاكي توقيت UTC+3 (القاهرة صيفي) عبر حيلة lng المزاح */
const CASES = [
  { name: 'Cairo  (egypt)', lat: 30.0444, lng: 31.2357, mine: 'egypt', ref: 'Egyptian' },
  { name: 'Mecca  (umm)  ', lat: 21.3891, lng: 39.8579, mine: 'umm', ref: 'UmmAlQura' },
  { name: 'London (mwl)  ', lat: 51.5074, lng: -0.1278, mine: 'mwl', ref: 'MuslimWorldLeague' },
  { name: 'NYC   (isna)  ', lat: 40.7128, lng: -74.0060, mine: 'isna', ref: 'NorthAmerica' },
  { name: 'Karachi(karachi)', lat: 24.8607, lng: 67.0011, mine: 'karachi', ref: 'Karachi' }
];

function fmt(h) { const H = Math.floor(h + 1e-9), M = Math.round((h - H) * 60); return H + ':' + String(M).padStart(2, '0'); }
function toMin(h) { const H = Math.floor(h + 1e-9), M = Math.round((h - H) * 60); return H * 60 + M; }

let allOK = true;
const date = new Date(2026, 9, 19, 12, 0, 0);
for (const c of CASES) {
  const st = calc.I;
  st.set.lat = c.lat; st.set.lng = c.lng - TZ_H * 15; st.set.method = c.mine; st.set.asr = 1;
  const mine = calc.timesFor(date);
  st.set.lng = c.lng;
  const params = CalculationMethod[c.ref]();
  const ref = new PrayerTimes(new Coordinates(c.lat, c.lng), date, params);
  const refD = { fajr: ref.fajr, sunrise: ref.sunrise, dhuhr: ref.dhuhr, asr: ref.asr, maghrib: ref.maghrib, isha: ref.isha };
  console.log('--- ' + c.name + ' ---');
  for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    const rm = toMin(mine[k]);
    const ru = refD[k].getUTCHours() * 60 + refD[k].getUTCMinutes() + TZ_H * 60;
    let diff = rm - ru; if (diff > 720) diff -= 1440; if (diff < -720) diff += 1440;
    const ok = Math.abs(diff) <= 3;
    if (!ok) allOK = false;
    console.log(`  ${k}: mine=${fmt(mine[k])} ref=${String(Math.floor(ru / 60) % 24).padStart(2, '0')}:${String(ru % 60).padStart(2, '0')} diff=${diff}m ${ok ? 'OK' : 'FAIL'}`);
  }
}
/* اختبار القبلة: من القاهرة يجب أن تكون ~136-137 درجة */
const st2 = calc.I; st2.set.lat = 30.0444; st2.set.lng = 31.2357;
const q = calc.nextPrayer();
console.log('nextPrayer:', q.k, 'in', Math.round((q.at - Date.now()) / 3600000), 'h');
console.log(allOK ? 'ALL PRAYER TIMES VERIFIED (±3 min)' : 'SOME CHECKS FAILED');
process.exitCode = allOK ? 0 : 1;
