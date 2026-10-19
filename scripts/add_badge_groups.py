#!/usr/bin/env python3
"""Add group field to ACHIEVEMENTS items in data.ts (prayer ids vs study ids)."""
import re

PATH = "/home/z/my-project/src/lib/data.ts"
PRAYER = {"first-prayer","full-day","streak-3","streak-7","streak-30","prayers-50","prayers-100","fajr-master","week-perfect","level-5"}
STUDY = {"first-task","task-day","study-1h","tasks-streak-3","units-10","study-10h","task-half","units-50","study-25h","course-done","all-tasks"}

src = open(PATH, encoding="utf-8").read()

def repl(m):
    block = m.group(0)
    bid = m.group(1)
    if "group:" in block:
        return block
    g = "prayer" if bid in PRAYER else ("study" if bid in STUDY else None)
    if g is None:
        return block
    return block.rstrip(" }") + f', group: "{g}" }}'

# match one-line achievement objects inside ACHIEVEMENTS array
pat = re.compile(r'\{ id: "([a-z0-9-]+)", name: "[^"]*", description: "[^"]*", emoji: "[^"]*" \}')
out, n = pat.subn(repl, src)
open(PATH, "w", encoding="utf-8").write(out)
print(f"patched {n} achievement lines")
# sanity
missing = [i for i in list(PRAYER)+list(STUDY) if f'id: "{i}"' not in out]
print("missing ids:", missing or "none")
no_group = sum(1 for m in re.finditer(r'\{ id: "[a-z0-9-]+".*?\}', out) if "group:" not in m.group(0) and "name:" in m.group(0))
print("lines still missing group:", no_group)
