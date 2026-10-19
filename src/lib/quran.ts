/* =========================================================
   طبقة القرآن الكريم: القراء + السور + روابط التلاوات
   كل الروابط تم التحقق منها فعليًا (HTTP 206 audio/mpeg)
   ========================================================= */

export interface ReciterDef {
  id: string;
  name: string;
  /** سيرفر mp3quran.net — التلاوة كاملة لكل سورة: {server}{SSS}.mp3 */
  server: string;
  /** وصف نمط التلاوة */
  style: string;
  /** مجلد everyayah لتشغيل آية مفردة (اختياري) */
  everyayah?: string;
}

/* ---------------- القراء (١٧ قارئ — كله متحقق منه) ---------------- */

export const RECITERS: ReciterDef[] = [
  {
    id: "alafasy",
    name: "مشاري راشد العفاسي",
    server: "https://server8.mp3quran.net/afs/",
    style: "مرتل — صوت شهير محبب",
    everyayah: "Alafasy_128kbps",
  },
  {
    id: "basit",
    name: "عبد الباسط عبد الصمد",
    server: "https://server7.mp3quran.net/basit/",
    style: "مرتل — الشيخ الإمام",
    everyayah: "Abdul_Basit_Murattal_192kbps",
  },
  {
    id: "basit-mjwd",
    name: "عبد الباسط عبد الصمد",
    server: "https://server7.mp3quran.net/basit_mjwd/",
    style: "مجود — تلاوة مؤثرة",
  },
  {
    id: "husary",
    name: "محمود خليل الحصري",
    server: "https://server7.mp3quran.net/husr/",
    style: "مرتل — مرجع التجويد",
    everyayah: "Husary_128kbps",
  },
  {
    id: "minshawi",
    name: "محمد صديق المنشاوي",
    server: "https://server6.mp3quran.net/minsh/",
    style: "مرتل — صوت عذب حاني",
    everyayah: "Minshawy_Murattal_128kbps",
  },
  {
    id: "minshawi-mjwd",
    name: "محمد صديق المنشاوي",
    server: "https://server6.mp3quran.net/minsh_mjwd/",
    style: "مجود — بتسميع مؤثر",
  },
  {
    id: "s-gmd",
    name: "سعد الغامدي",
    server: "https://server7.mp3quran.net/s_gmd/",
    style: "مرتل — خاشع وهادئ",
    everyayah: "Saad_Al-Ghamdi_128kbps",
  },
  {
    id: "sudais",
    name: "عبد الرحمن السديس",
    server: "https://server11.mp3quran.net/sds/",
    style: "مرتل — إمام الحرم المكي",
    everyayah: "Abdurrahmaan_As-Sudais_192kbps",
  },
  {
    id: "maher",
    name: "ماهر المعيقلي",
    server: "https://server12.mp3quran.net/maher/",
    style: "مرتل — إمام الحرم المكي",
    everyayah: "Maher_AlMuaiqly_128kbps",
  },
  {
    id: "yasser",
    name: "ياسر الدوسري",
    server: "https://server11.mp3quran.net/yasser/",
    style: "مرتل — إمام الحرم المكي",
    everyayah: "Yasser_Ad-Dussary_128kbps",
  },
  {
    id: "hani",
    name: "هاني الرفاعي",
    server: "https://server11.mp3quran.net/hani/",
    style: "مرتل — تلاوة صافية",
    everyayah: "Hani_Rifai_192kbps",
  },
  {
    id: "ajamy",
    name: "أحمد العجمي",
    server: "https://server12.mp3quran.net/ajm/",
    style: "مرتل — مؤثر ومحبب",
  },
  {
    id: "basfar",
    name: "عبد الله بصفر",
    server: "https://server8.mp3quran.net/bsfr/",
    style: "مرتل — متمكن في التجويد",
  },
  {
    id: "ayyub",
    name: "محمد أيوب",
    server: "https://server10.mp3quran.net/ayyub/",
    style: "مرتل — إمام المسجد النبوي",
  },
  {
    id: "shuraim",
    name: "سعود الشريم",
    server: "https://server6.mp3quran.net/shur/",
    style: "مرتل — إمام الحرم المكي",
  },
  {
    id: "shatri",
    name: "أبو بكر الشاطري",
    server: "https://server6.mp3quran.net/shatri/",
    style: "مرتل — خاشع ومؤثر",
  },
  {
    id: "jibreel",
    name: "محمد جبريل",
    server: "https://server8.mp3quran.net/jbrl/",
    style: "مرتل — تلاوة مصرية مؤثرة",
  },
];

/* ---------------- سور القرآن الكريم (١١٤ سورة) ---------------- */

export interface SurahDef {
  n: number; // رقم السورة
  name: string; // الاسم
  ayahs: number; // عدد الآيات
  place: "مكية" | "مدنية";
}

export const SURAHS: SurahDef[] = [
  { n: 1, name: "الفاتحة", ayahs: 7, place: "مكية" },
  { n: 2, name: "البقرة", ayahs: 286, place: "مدنية" },
  { n: 3, name: "آل عمران", ayahs: 200, place: "مدنية" },
  { n: 4, name: "النساء", ayahs: 176, place: "مدنية" },
  { n: 5, name: "المائدة", ayahs: 120, place: "مدنية" },
  { n: 6, name: "الأنعام", ayahs: 165, place: "مكية" },
  { n: 7, name: "الأعراف", ayahs: 206, place: "مكية" },
  { n: 8, name: "الأنفال", ayahs: 75, place: "مدنية" },
  { n: 9, name: "التوبة", ayahs: 129, place: "مدنية" },
  { n: 10, name: "يونس", ayahs: 109, place: "مكية" },
  { n: 11, name: "هود", ayahs: 123, place: "مكية" },
  { n: 12, name: "يوسف", ayahs: 111, place: "مكية" },
  { n: 13, name: "الرعد", ayahs: 43, place: "مدنية" },
  { n: 14, name: "إبراهيم", ayahs: 52, place: "مكية" },
  { n: 15, name: "الحجر", ayahs: 99, place: "مكية" },
  { n: 16, name: "النحل", ayahs: 128, place: "مكية" },
  { n: 17, name: "الإسراء", ayahs: 111, place: "مكية" },
  { n: 18, name: "الكهف", ayahs: 110, place: "مكية" },
  { n: 19, name: "مريم", ayahs: 98, place: "مكية" },
  { n: 20, name: "طه", ayahs: 135, place: "مكية" },
  { n: 21, name: "الأنبياء", ayahs: 112, place: "مكية" },
  { n: 22, name: "الحج", ayahs: 78, place: "مدنية" },
  { n: 23, name: "المؤمنون", ayahs: 118, place: "مكية" },
  { n: 24, name: "النور", ayahs: 64, place: "مدنية" },
  { n: 25, name: "الفرقان", ayahs: 77, place: "مكية" },
  { n: 26, name: "الشعراء", ayahs: 227, place: "مكية" },
  { n: 27, name: "النمل", ayahs: 93, place: "مكية" },
  { n: 28, name: "القصص", ayahs: 88, place: "مكية" },
  { n: 29, name: "العنكبوت", ayahs: 69, place: "مكية" },
  { n: 30, name: "الروم", ayahs: 60, place: "مكية" },
  { n: 31, name: "لقمان", ayahs: 34, place: "مكية" },
  { n: 32, name: "السجدة", ayahs: 30, place: "مكية" },
  { n: 33, name: "الأحزاب", ayahs: 73, place: "مدنية" },
  { n: 34, name: "سبأ", ayahs: 54, place: "مكية" },
  { n: 35, name: "فاطر", ayahs: 45, place: "مكية" },
  { n: 36, name: "يس", ayahs: 83, place: "مكية" },
  { n: 37, name: "الصافات", ayahs: 182, place: "مكية" },
  { n: 38, name: "ص", ayahs: 88, place: "مكية" },
  { n: 39, name: "الزمر", ayahs: 75, place: "مكية" },
  { n: 40, name: "غافر", ayahs: 85, place: "مكية" },
  { n: 41, name: "فصلت", ayahs: 54, place: "مكية" },
  { n: 42, name: "الشورى", ayahs: 53, place: "مكية" },
  { n: 43, name: "الزخرف", ayahs: 89, place: "مكية" },
  { n: 44, name: "الدخان", ayahs: 59, place: "مكية" },
  { n: 45, name: "الجاثية", ayahs: 37, place: "مكية" },
  { n: 46, name: "الأحقاف", ayahs: 35, place: "مكية" },
  { n: 47, name: "محمد", ayahs: 38, place: "مدنية" },
  { n: 48, name: "الفتح", ayahs: 29, place: "مدنية" },
  { n: 49, name: "الحجرات", ayahs: 18, place: "مدنية" },
  { n: 50, name: "ق", ayahs: 45, place: "مكية" },
  { n: 51, name: "الذاريات", ayahs: 60, place: "مكية" },
  { n: 52, name: "الطور", ayahs: 49, place: "مكية" },
  { n: 53, name: "النجم", ayahs: 62, place: "مكية" },
  { n: 54, name: "القمر", ayahs: 55, place: "مكية" },
  { n: 55, name: "الرحمن", ayahs: 78, place: "مدنية" },
  { n: 56, name: "الواقعة", ayahs: 96, place: "مكية" },
  { n: 57, name: "الحديد", ayahs: 29, place: "مدنية" },
  { n: 58, name: "المجادلة", ayahs: 22, place: "مدنية" },
  { n: 59, name: "الحشر", ayahs: 24, place: "مدنية" },
  { n: 60, name: "الممتحنة", ayahs: 13, place: "مدنية" },
  { n: 61, name: "الصف", ayahs: 14, place: "مدنية" },
  { n: 62, name: "الجمعة", ayahs: 11, place: "مدنية" },
  { n: 63, name: "المنافقون", ayahs: 11, place: "مدنية" },
  { n: 64, name: "التغابن", ayahs: 18, place: "مدنية" },
  { n: 65, name: "الطلاق", ayahs: 12, place: "مدنية" },
  { n: 66, name: "التحريم", ayahs: 12, place: "مدنية" },
  { n: 67, name: "الملك", ayahs: 30, place: "مكية" },
  { n: 68, name: "القلم", ayahs: 52, place: "مكية" },
  { n: 69, name: "الحاقة", ayahs: 52, place: "مكية" },
  { n: 70, name: "المعارج", ayahs: 44, place: "مكية" },
  { n: 71, name: "نوح", ayahs: 28, place: "مكية" },
  { n: 72, name: "الجن", ayahs: 28, place: "مكية" },
  { n: 73, name: "المزمل", ayahs: 20, place: "مكية" },
  { n: 74, name: "المدثر", ayahs: 56, place: "مكية" },
  { n: 75, name: "القيامة", ayahs: 40, place: "مكية" },
  { n: 76, name: "الإنسان", ayahs: 31, place: "مدنية" },
  { n: 77, name: "المرسلات", ayahs: 50, place: "مكية" },
  { n: 78, name: "النبأ", ayahs: 40, place: "مكية" },
  { n: 79, name: "النازعات", ayahs: 46, place: "مكية" },
  { n: 80, name: "عبس", ayahs: 42, place: "مكية" },
  { n: 81, name: "التكوير", ayahs: 29, place: "مكية" },
  { n: 82, name: "الانفطار", ayahs: 19, place: "مكية" },
  { n: 83, name: "المطففين", ayahs: 36, place: "مكية" },
  { n: 84, name: "الانشقاق", ayahs: 25, place: "مكية" },
  { n: 85, name: "البروج", ayahs: 22, place: "مكية" },
  { n: 86, name: "الطارق", ayahs: 17, place: "مكية" },
  { n: 87, name: "الأعلى", ayahs: 19, place: "مكية" },
  { n: 88, name: "الغاشية", ayahs: 26, place: "مكية" },
  { n: 89, name: "الفجر", ayahs: 30, place: "مكية" },
  { n: 90, name: "البلد", ayahs: 20, place: "مكية" },
  { n: 91, name: "الشمس", ayahs: 15, place: "مكية" },
  { n: 92, name: "الليل", ayahs: 21, place: "مكية" },
  { n: 93, name: "الضحى", ayahs: 11, place: "مكية" },
  { n: 94, name: "الشرح", ayahs: 8, place: "مكية" },
  { n: 95, name: "التين", ayahs: 8, place: "مكية" },
  { n: 96, name: "العلق", ayahs: 19, place: "مكية" },
  { n: 97, name: "القدر", ayahs: 5, place: "مكية" },
  { n: 98, name: "البينة", ayahs: 8, place: "مدنية" },
  { n: 99, name: "الزلزلة", ayahs: 8, place: "مدنية" },
  { n: 100, name: "العاديات", ayahs: 11, place: "مكية" },
  { n: 101, name: "القارعة", ayahs: 11, place: "مكية" },
  { n: 102, name: "التكاثر", ayahs: 8, place: "مكية" },
  { n: 103, name: "العصر", ayahs: 3, place: "مكية" },
  { n: 104, name: "الهمزة", ayahs: 9, place: "مكية" },
  { n: 105, name: "الفيل", ayahs: 5, place: "مكية" },
  { n: 106, name: "قريش", ayahs: 4, place: "مكية" },
  { n: 107, name: "الماعون", ayahs: 7, place: "مكية" },
  { n: 108, name: "الكوثر", ayahs: 3, place: "مكية" },
  { n: 109, name: "الكافرون", ayahs: 6, place: "مكية" },
  { n: 110, name: "النصر", ayahs: 3, place: "مدنية" },
  { n: 111, name: "المسد", ayahs: 5, place: "مكية" },
  { n: 112, name: "الإخلاص", ayahs: 4, place: "مكية" },
  { n: 113, name: "الفلق", ayahs: 5, place: "مكية" },
  { n: 114, name: "الناس", ayahs: 6, place: "مكية" },
];

/* ---------------- روابط التلاوات ---------------- */

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

/** رابط تلاوة سورة كاملة بالقارئ المحدد */
export function surahAudioUrl(reciter: ReciterDef, surahNumber: number): string {
  return `${reciter.server}${pad3(surahNumber)}.mp3`;
}

/** رابط صوت آية مفردة (everyayah) بالقارئ المحدد */
export function ayahAudioUrl(reciter: ReciterDef, surah: number, ayah: number): string | null {
  if (!reciter.everyayah) return null;
  return `https://everyayah.com/data/${reciter.everyayah}/${pad3(surah)}${pad3(ayah)}.mp3`;
}

/** القارئ الافتراضي */
export const DEFAULT_RECITER_ID = "alafasy";

export function findReciter(id: string): ReciterDef {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

/* ---------------- تخزين اختيارات القرآن ---------------- */

const K_RECITER = "sakinah.quran.reciter";
const K_LAST_SURAH = "sakinah.quran.lastSurah";
const K_FAVORITES = "sakinah.quran.favorites";

export function loadReciterId(): string {
  try {
    return window.localStorage.getItem(K_RECITER) || DEFAULT_RECITER_ID;
  } catch {
    return DEFAULT_RECITER_ID;
  }
}

export function saveReciterId(id: string) {
  try {
    window.localStorage.setItem(K_RECITER, id);
  } catch {}
}

export function loadLastSurah(): number {
  try {
    const v = Number(window.localStorage.getItem(K_LAST_SURAH));
    return v >= 1 && v <= 114 ? v : 1;
  } catch {
    return 1;
  }
}

export function saveLastSurah(n: number) {
  try {
    window.localStorage.setItem(K_LAST_SURAH, String(n));
  } catch {}
}

export function loadFavorites(): number[] {
  try {
    const raw = window.localStorage.getItem(K_FAVORITES);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((n) => n >= 1 && n <= 114) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(f: number[]) {
  try {
    window.localStorage.setItem(K_FAVORITES, JSON.stringify(f));
  } catch {}
}
