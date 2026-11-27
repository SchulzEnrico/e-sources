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
BASE_DAY = '2026-11-20'
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
    d = re.search(r'\b(\d{1,2})\.(\d{1,2})\.(20\d\d)', line)
    day_f = f'{d.group(3)}-{int(d.group(2)):02d}-{int(d.group(1)):02d}' if d else BASE_DAY
    # L7 (V136): Basisplan = ursprünglicher Umfang des Lastenhefts vom 20.11.2026 (F-01 bis F-99); alles danach
    # Dazugekommene ist eine Änderung (Kapitel 13) mit Datum aus dem Lastenheft
    base = int(fid[2:]) < 100
    items.append({'f': fid, 'title': title or fid, 'state': state, 'group': group or 'Allgemein', 'chats': max(1, chats), 'day': day_f if not base else BASE_DAY, 'base': base})
# L7 (V136): Änderungen gegen den Basisplan – je Abschnitt und Tag eine Änderung, bei „Notizen und Ansichten“ je F-Punkt
# (jeder ist ein eigener Baustein). Die Texte erzählen, wie aus einer kleinen Vision eine bessere Version von allem wurde.
STORY = {
    'Arbeitsfläche und Raster': 'Beim täglichen Arbeiten mit vielen Portalen zeigte sich, was eine Arbeitsfläche noch braucht, damit sie den Rechner nicht ausbremst und den Fokus hält.',
    'Panels': 'Die Portale sollten sich verhalten wie vertraute Fenster – nur geordneter.',
    'Tabs und Menü im Panel': 'Die Tab-Leiste wurde zum Mittelpunkt der Arbeit; was der Browser kann, sollte E-Sources mindestens genauso gut können.',
    'Lesezeichen': 'Lesezeichen sollten nicht nur gespeichert, sondern wirklich geordnet werden.',
    'Schwebende Ablage': 'Aus der kleinen schwebenden Ablage wurde das Herz der Ordnung: Library, Dock, Kategorien, Stacks und Designs bis hin zu Retro-Oberflächen – jede Idee machte die Arbeitsfläche persönlicher.',
    'Layouts': 'Layouts wurden zu ganzen Arbeitsständen, die sich speichern, wechseln und je Desk merken lassen.',
    'Darstellung': 'Die Darstellung sollte sich jedem Menschen anpassen – nicht umgekehrt.',
    'Hilfe und Einstieg': 'Jede Funktion sollte sich selbst erklären, damit niemand ein Handbuch braucht, um anzufangen.',
    'Werkzeugkasten und Integrationen': 'Die Arbeitsfläche öffnete sich für Werkzeuge, die Anwender ohnehin nutzen.',
}
STORY_F = {
    'F-206': 'Zu jeder Quelle gehört ein Gedanke: Aus der Lesezeichen-Fläche wurde ein Ort für Notizen, To-do, Kanban und Eisenhower direkt neben den Seiten.',
    'F-210': 'Neue Slots sollten dort entstehen, wo man sie braucht – mit Lageplan statt Suchen.',
    'F-215': 'Die Notizen bekamen eine eigene Bedienung, die sich überall gleich anfühlt – bis aufs Smartphone.',
    'F-216': 'Damit jeder Umschalter gleich funktioniert, entstand das Umschalt-Rad – ein Bedienelement für alle Modi.',
    'F-218': 'Wiederkehrende Handgriffe sollte die Anwendung selbst erledigen: Regeln im Cockpit.',
    'F-221': 'Wer E-Sources nutzt, sollte direkt aus der Anwendung Rückmeldung geben können.',
    'F-222': 'Entscheidungen sollten nachvollziehbar werden – mit der Nutzwertanalyse aus dem Projektmanagement.',
    'F-225': 'Aus Rückmeldungen wurden Projektmeldungen: Risiken und Änderungsanträge nach ICB4.',
    'F-226': 'Der entscheidende Schritt: Aus Notizen und Aufgaben wurde ein Projekt-Modus nach IPMA ICB4 – gemessen am eigenen Projektreport ColorGentlemen. Aus einer kleinen Vision wurde eine bessere Version von allem: Lesezeichen, Notizen, Kanban und Projektmanagement an einem Ort.',
    'F-230': 'Projekte sollten ohne Verlust zu MS Project und Trello und zurück wandern können.',
    'F-231': 'Das Kanban sollte mindestens so stark sein wie Trello – mit Regeln, Knöpfen und Zeitplänen.',
    'F-232': 'Dokumente sollten aussehen wie auf Papier – so wie im eigenen ICB4-Report.',
    'F-233': 'Ein zweites Beispielprojekt zeigte, dass die Formulare für jedes Projekt tragen.',
    'F-234': 'Was im Report als Grafik steht, sollte auch E-Sources als Grafik zeigen: Zielhierarchie, Organigramm, PSP, Balkenplan.',
    'F-235': 'Zum Schluss wurde E-Sources selbst zum Projekt in E-Sources – ein Live-Testobjekt, das jeder in der Demo ansehen kann.',
}
changes, keymap = [], {}
for i in sorted((i for i in items if not i['base']), key=lambda i: i['day']):
    key = (i['group'], i['f']) if i['group'] == 'Notizen und Ansichten' else (i['group'], i['day'])
    if key not in keymap:
        keymap[key] = len(changes)
        changes.append({'no': len(changes) + 1, 'day': i['day'], 'group': i['group'], 'fs': [], 'title': ''})
    changes[keymap[key]]['fs'].append(i['f'])
byf = {i['f']: i for i in items}
for c in changes:
    fs = c['fs']
    c['title'] = (f"{fs[0]} {byf[fs[0]]['title']}" if len(fs) == 1 else f"{c['group']}: {len(fs)} neue Anforderungen")[:90]
    c['why'] = STORY_F.get(fs[0]) if len(fs) == 1 and fs[0] in STORY_F else STORY.get(c['group'], 'Aus der Arbeit mit E-Sources kam ein neuer Wunsch dazu.')
    c['hours'] = sum(byf[f]['chats'] for f in fs) * 2
    c['done'] = sum(byf[f]['state'] == 'done' for f in fs)
out_changes = ['export interface LiveChange { no: number; day: string; group: string; fs: string[]; title: string; why: string; hours: number; done: number }',
               'export const LIVE_CHANGES: LiveChange[] = [']
out_changes += [f"  {json.dumps(c, ensure_ascii=False)}," for c in changes]
out_changes.append('];')
out = ['/** F-235 (V135): aus dem Lastenheft erzeugt von tools/live_project.py – nicht von Hand ändern. */',
       f"export const LIVE_STAND = {{ chat: {json.dumps(chat)}, day: {json.dumps(day)} }};",
       "export interface LiveItem { f: string; title: string; state: 'done' | 'part' | 'open'; group: string; chats: number; day: string; base: boolean }",
       'export const LIVE_ITEMS: LiveItem[] = [']
out += [f"  {json.dumps(i, ensure_ascii=False)}," for i in items]
out.append('];')
out += out_changes
(root / 'web/src/workspace/liveProjectData.ts').write_text('\n'.join(out) + '\n', encoding='utf-8')
print(len(items), 'F-Punkte;', sum(i['state'] == 'done' for i in items), 'fertig,', sum(i['state'] == 'part' for i in items), 'teilweise,', sum(i['state'] == 'open' for i in items), 'offen;', len(changes), 'Änderungen')
