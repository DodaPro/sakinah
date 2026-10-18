/* فحص شامل: صياغة السكريبتات + دقة حساب المواقيت مقابل Aladhan API */
const fs = require('fs');
const vm = require('vm');
const https = require('https');

const FILE = '/home/z/my-project/download/Challenge Planner.html';
const html = fs.readFileSync(FILE, 'utf8');

/* 1) استخراج كل <script> وفحص الصياغة */
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
console.log('scripts found:', scripts.length);
scripts.forEach((s, i) => {
  try { new vm.Script(s); console.log(`script ${i}: SYNTAX OK (${s.length} bytes)`); }
  catch (e) { console.log(`script ${i}: SYNTAX FAIL -> ${e.message}`); process.exitCode = 1; }
});

/* 2) تقييم سكريبت الصلوات مع DOM وهمي ثم اختبار الحسابات */
function fakeEl() {
  return { innerHTML: '', textContent: '', hidden: false, dataset: {}, style: { setProperty(){}, removeProperty(){} },
    classList: { toggle(){} }, appendChild(){}, remove(){}, querySelector(){ return null }, setAttribute(){}, getAttribute(){ return null }, removeAttribute(){} };
}
const sandbox = {
  console, Date, Math, JSON, Object, Array, String, Number, parseInt, parseFloat, isNaN,
  setInterval: () => 0, clearInterval: () => {}, setTimeout: (f) => 0, requestAnimationFrame: () => 0,
  document: {
    querySelector: () => fakeEl(), querySelectorAll: () => [], addEventListener(){}, removeEventListener(){},
    documentElement: Object.assign(fakeEl(), { style: { setProperty(){}, removeProperty(){} } }),
    body: fakeEl(), createElement: () => fakeEl(), hidden: false
  },
  window: null, navigator: {}, localStorage: { getItem: () => null, setItem(){}, removeItem(){} },
  Intl, Notification: undefined
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.matchMedia = sandbox.window.matchMedia = () => ({ matches: false });
vm.createContext(sandbox);

let calc = null;
try {
  vm.runInContext(scripts[scripts.length - 1], sandbox);
  calc = sandbox.__islam;
  console.log('islamic script: RAN OK, exports:', calc ? Object.keys(calc).join(',') : 'NONE');
  if (!calc) process.exitCode = 1;
} catch (e) {
  console.log('islamic script RUN FAIL ->', e.message, '\n', e.stack && e.stack.split('\n').slice(0, 4).join('\n'));
  process.exitCode = 1;
}

function h2m(s) { const [h, m] = s.split(':').map(Number); return h * 60 + m; }

/* 3) مقارنة المواقيت مع Aladhan API لعدة مدن وطرق حساب */
const cases = [
  { name: 'Cairo (egypt)', lat: 30.0444, lng: 31.2357, method: 'egypt', api: 5, tz: 'Africa/Cairo' },
  { name: 'Mecca (umm)', lat: 21.3891, lng: 39.8579, method: 'umm', api: 4, tz: 'Asia/Riyadh' },
  { name: 'London (mwl)', lat: 51.5074, lng: -0.1278, method: 'mwl', api: 3, tz: 'Europe/London' }
];

function fetchJSON(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'test' }, timeout: 15000 }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } });
    }).on('error', rej).on('timeout', function () { this.destroy(); rej(new Error('timeout')) });
  });
}

(async () => {
  if (!calc) return;
  for (const c of cases) {
    try {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0'), mm = String(now.getMonth() + 1).padStart(2, '0'), yy = now.getFullYear();
      const api = await fetchJSON(`https://api.aladhan.com/v1/timings/${dd}-${mm}-${yy}?latitude=${c.lat}&longitude=${c.lng}&method=${c.api}`);
      const T = api.data.timings;
      /* ضبط حالة السكريبت الافتراضية على الموقع والطريقة */
      const st = calc.I;
      st.set.lat = c.lat; st.set.lng = c.lng; st.set.method = c.method; st.set.asr = 1;
      /* حساب بتوقيت المدينة: نحاكي عبر timeZoneUtil? الحساب بيستخدم توقيت الجهاز المحلي — نحسب بفرق المنطقة يدويًا */
      const tzOff = api.data.meta.timezone ? new Date(now.getUTCFullYear(), 0, 1) : null;
      const localOffsetMin = api.data.meta.timezone === 'Africa/Cairo' ? now.getTimezoneOffset() : null;
      /* أبسط حل: نحسب عبر Date بمنطقة المدينة باستخدام Intl */
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: c.tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'shortOffset' }).formatToParts(now);
      const get = t => parts.find(p => p.type === t).value;
      const cityNow = new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour') === '24' ? '00' : get('hour')}:${get('minute')}:00`);
      const tzName = (parts.find(p => p.type === 'timeZoneName') || {}).value || '';
      const m = tzName.match(/GMT([+-]\d+(?::\d+)?)/);
      const offH = m ? parseFloat(m[1].replace(':', '.')) : 0;
      /* نحسب أوقات المدينة يدويًا: timesFor بيستخدم getTimezoneOffset للتاريخ المُمرر — نبني Date وهمي offset بتاع المدينة */
      const realOffset = -now.getTimezoneOffset() / 60; // توقيت السيرفر
      const deltaH = offH - realOffset; // فرق المدينة عن السيرفر
      const fakeDate = new Date(now.getTime() + deltaH * 3600e3);
      /* لكن getTimezoneOffset على fakeDate بيرجع offset السيرفر — الحساب بيقسم على 15 ويطرح — نعوّض بضبط lng مؤقتًا:
         في داخل timesFor: dhuhr = 12 + tz - lng/15 - eqt. لو مررنا lng' = lng - deltaH*15 يوازي الفرق. نستخدم حيلة العوض دي. */
      st.set.lng = c.lng - deltaH * 15;
      st.set.lat = c.lat;
      const mine = calc.timesFor(fakeDate);
      st.set.lng = c.lng; // إرجاع
      const check = (label, mineH, apiStr, tol = 4) => {
        const mv = Math.round(mineH * 60), av = h2m(apiStr);
        let diff = mv - av; if (diff > 720) diff -= 1440; if (diff < -720) diff += 1440;
        const ok = Math.abs(diff) <= tol;
        if (!ok) process.exitCode = 1;
        console.log(`${c.name} ${label}: mine=${Math.floor(((mv % 1440) + 1440) % 1440 / 60)}:${String(((mv % 1440) + 1440) % 1440 % 60).padStart(2, '0')} api=${apiStr} diff=${diff}min ${ok ? 'OK' : 'FAIL'}`);
      };
      console.log(`--- ${c.name} (${c.method}) ---`);
      check('Fajr   ', mine.fajr, T.Fajr);
      check('Sunrise', mine.sunrise, T.Sunrise);
      check('Dhuhr  ', mine.dhuhr, T.Dhuhr);
      check('Asr    ', mine.asr, T.Asr);
      check('Maghrib', mine.maghrib, T.Maghrib);
      if (c.method !== 'umm') check('Isha   ', mine.isha, T.Isha);
    } catch (e) {
      console.log(`${c.name}: API unavailable (${e.message}) — skip remote compare`);
    }
  }
  /* اختبار nextPrayer و qibla */
  const st = calc.I; st.set.lat = 30.0444; st.set.lng = 31.2357;
  const np = calc.nextPrayer();
  console.log('nextPrayer:', np.k, np.name, 'in', Math.round((np.at - Date.now()) / 60000), 'min');
})();
