#!/usr/bin/env python3
"""F-235 (V135): erzeugt web/src/workspace/liveProjectData.ts aus dem Lastenheft.

Je Abschnitt (### …) unter „Funktionale Anforderungen“ eine Teilaufgabe, je F-Punkt (- **F-nnn** \\[Stand …\\] Titel …)
ein Arbeitspaket. Stand: ✓/● = fertig, ◐ = halb, ○ = offen, ⇢ = ersetzt (weggelassen). Aufwand = Chats je F-Punkt
(gezählte V-Nummern im Vermerk, mindestens 1) × 2 h. Aufruf in jedem Chat vor der Übergabe:
    python3 tools/live_project.py <Chat, z. B. V135> <Datum JJJJ-MM-TT>
"""
import json, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'docs/Lastenheft/Lastenheft_E-Sources.md').read_text(encoding='utf-8')
chat = sys.argv[1] if len(sys.argv) > 1 else 'V?'
day = sys.argv[2] if len(sys.argv) > 2 else ''
start = src.index('## Funktionale Anforderungen')
group = ''
items, seen = [], set()
for line in src[start:].splitlines():
    if line.startswith('## ') and 'Funktionale' not in line:
        break
    if line.startswith('### '):
        group = line[4:].strip()
        continue
    m = re.match(r'^[-*] \*\*(F-\d+)\*\* \\\[([^\]]*?)\\\]\s*(.*)$', line)
    if not m or m.group(1) in seen:
        continue
    fid, note, rest = m.groups()
    mark = note.strip()[:1]
    if mark == '⇢':
        continue
    state = 'done' if mark in '✓●' else 'part' if mark == '◐' else 'open'
    title = re.split(r'\s\(\d{1,2}\.\d{1,2}\.\d{4}|\. |: ', rest, maxsplit=1)[0].strip(' –-')[:90]
    chats = len(set(re.findall(r'\bV(\d{1,3})\b', line)))
    seen.add(fid)
    items.append({'f': fid, 'title': title or fid, 'state': state, 'group': group or 'Allgemein', 'chats': max(1, chats)})
out = ['/** F-235 (V135): aus dem Lastenheft erzeugt von tools/live_project.py – nicht von Hand ändern. */',
       f"export const LIVE_STAND = {{ chat: {json.dumps(chat)}, day: {json.dumps(day)} }};",
       "export interface LiveItem { f: string; title: string; state: 'done' | 'part' | 'open'; group: string; chats: number }",
       'export const LIVE_ITEMS: LiveItem[] = [']
out += [f"  {json.dumps(i, ensure_ascii=False)}," for i in items]
out.append('];')
(root / 'web/src/workspace/liveProjectData.ts').write_text('\n'.join(out) + '\n', encoding='utf-8')
print(len(items), 'F-Punkte;', sum(i['state'] == 'done' for i in items), 'fertig,', sum(i['state'] == 'part' for i in items), 'teilweise,', sum(i['state'] == 'open' for i in items), 'offen')
