# -*- coding: utf-8 -*-
"""إضافة أرقام السورة/الآية لآيات VERSES في data.ts (لتشغيل التلاوة)"""
import re, io

PATH = "/home/z/my-project/src/lib/data.ts"
with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

# خريطة: (المرجع بالأرقام العربية) -> (س، آ)
mapping = [
    ("النساء ١٠٣", 4, 103),
    ("البقرة ٤٣", 2, 43),
    ("البقرة ٢٣٨", 2, 238),
    ("البقرة ١٥٣", 2, 153),
    ("المؤمنون ١-٢", 23, 1),
    ("طه ١٤", 20, 14),
    ("البقرة ١٥٢", 2, 152),
    ("النحل ١٢٨", 16, 128),
    ("الطلاق ٢-٣", 65, 2),
    ("الشرح ٥", 94, 5),
    ("البقرة ١٢٧", 2, 127),
    ("الذاريات ٥٥", 51, 55),
    ("البقرة ١٥٥-١٥٦", 2, 155),
    ("الذاريات ٥٦", 51, 56),
    ("العصر ٢-٣", 103, 2),
    ("طه ١٣٢", 20, 132),
]

# نحدد منطق مصفوفة VERSES فقط (من "export const VERSES" حتى "];" التالية لها)
start = src.index("export const VERSES")
end = src.index("];", start)
block = src[start:end]

count = 0
for ref, s, a in mapping:
    old = 'ref: "%s" }' % ref
    new = 'ref: "%s", s: %d, a: %d }' % (ref, s, a)
    if old in block:
        block = block.replace(old, new)
        count += 1

# الرعد ٢٨ مكررة (آخر عنصر) — نعالجها لوحدها (هي الأخيرة في المصفوفة)
old_r = 'ref: "الرعد ٢٨" }'
new_r = 'ref: "الرعد ٢٨", s: 13, a: 28 }'
if old_r in block:
    block = block.replace(old_r, new_r)
    count += 1

src = src[:start] + block + src[end:]
with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print("updated %d verses" % count)
# تحقق: لم يبق أي عنصر بدون s:
remaining = len(re.findall(r'ref: "[^"]+" \}', block))
print("remaining without s/a:", remaining)
