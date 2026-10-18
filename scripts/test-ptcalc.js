// دقة الحساب المحلي مقابل Aladhan API (عبر curl لأن node fetch محجوب في الساندبوكس)
const { execSync } = require('child_process');
const { localTimings } = require('./_ptcalc.js');

const CASES = [
  { name: 'القاهرة', lat: 30.0444, lng: 31.2357, method: '5', tz: 'Etc/GMT-3', off: 3 },
  { name: 'مكة', lat: 21.4225, lng: 39.8262, method: '4', tz: 'Etc/GMT-3', off: 3 },
  { name: 'الإسكندرية', lat: 31.2001, lng: 29.9187, method: '5', tz: 'Etc/GMT-3', off: 3 },
  { name: 'الرياض', lat: 24.7136, lng: 46.6753, method: '4', tz: 'Etc/GMT-3', off: 3 },
  { name: 'أسوان', lat: 24.0889, lng: 32.8998, method: '5', tz: 'Etc/GMT-3', off: 3 },
  { name: 'لندن', lat: 51.5074, lng: -0.1278, method: '3', tz: 'UTC', off: 0 },
  { name: 'نيويورك', lat: 40.7128, lng: -74.006, method: '2', tz: 'Etc/GMT+5', off: -5 },
  { name: 'جاكرتا', lat: -6.2088, lng: 106.8456, method: '3', tz: 'Etc/GMT-7', off: 7 },
];

const toMin = hm => { const a = hm.split(':'); return +a[0] * 60 + (+a[1]); };

function wrapDate(baseUtcMs, offMin) {
  const d = new Date(baseUtcMs + offMin * 60000); // نلمّش الوقت عشان التاريخ المحلي يفضل صح
  return new Proxy(d, {
    get(t, p) {
      if (p === 'getTimezoneOffset') return () => -offMin;
      const v = t[p];
      return typeof v === 'function' ? v.bind(t) : v;
    }
  });
}

(async () => {
  const BASE = Date.UTC(2026, 9, 19, 10, 0, 0); // 19 اكتوبر 2026 10:00 UTC
  console.log('== اختبار دقة الحساب المحلي (fallback بدون نت) ==');
  for (const c of CASES) {
    const d = new Date(BASE + c.off * 60000);
    const dstr = d.getUTCDate() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCFullYear();
    let api;
    try {
      const out = execSync(`curl -s --max-time 20 "https://api.aladhan.com/v1/timings/${dstr}?latitude=${c.lat}&longitude=${c.lng}&method=${c.method}&timezonestring=${encodeURIComponent(c.tz)}"`).toString();
      const j = JSON.parse(out);
      if (!j || j.code !== 200) throw new Error('code ' + (j && j.status));
      api = {};
      for (const k in j.data.timings) api[k] = String(j.data.timings[k]).split(' ')[0];
    } catch (e) { console.log(c.name, ': API فشل —', e.message.slice(0, 60)); continue; }
    const loc = localTimings(wrapDate(BASE, c.off * 60), c.lat, c.lng, c.method);
    if (!loc) { console.log(c.name, ': الحساب المحلي رجّع null!'); continue; }
    const keys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let maxDiff = 0, worst = '';
    const rows = keys.map(k => {
      const dd = Math.abs(toMin(loc[k]) - toMin(api[k]));
      if (dd > maxDiff) { maxDiff = dd; worst = k; }
      return `   ${k}: محلي ${loc[k]} | API ${api[k]} | فرق ${dd}د`;
    });
    console.log(c.name + (maxDiff > 3 ? `  ⚠️ أقصى فرق ${maxDiff}د عند ${worst}` : `  ✓ أقصى فرق ${maxDiff}د`) + `  [${dstr}]`);
    if (maxDiff > 3) console.log(rows.join('\n'));
  }
})();
