# Übergabe V21 → V22 E-Sources

Stand: 22.11.2026, ca. 15:00 Uhr · Chat V21 abgeschlossen · Nächster Chat: **V22 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V22 E-Sources**. Lies diese Übergabedatei und im Lastenheft den neuen Abschnitt „Stand und Reihenfolge (PO-Durchgang 22.11.2026, V21)“ vor „Funktionale Anforderungen“. Frag Enrico nach der **Freigabe der Reihenfolge** und der **Vorschläge zum Zusammenführen**. Danach die freigegebenen Punkte abarbeiten. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich, Claude Doc):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – lesen/ändern nur mit den Docs-Werkzeugen (Claude_Docs read/update), nicht mit read_artifact. Höchstens 64 Ops je update.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-178)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V21 passiert ist

- **Sichtprüfung** (Design-Dialog, Retro-Designs, Design-Tour, Cockpit-Tour, Schalter „Touren automatisch zeigen“, 375 px, `?test=voll`): alles funktioniert. Neu gefunden:
  1. Mit zwei Desks (Umschalter ⇄ sichtbar) verdeckt das Zahnrad die Fokusanzeige bis ca. **414 px**; bei 320 px ist die Seite 352 px breit (seitliches Scrollen). Gemessen: `.tb-end` 315–359 px, Zahnrad 319–355 px bei 375 px Breite.
  2. Design „Terminal“ übernimmt die vorige Akzentfarbe, wenn deren Kontrast reicht (z. B. BeOS-Blau) → Terminal blau statt grün. Passt zur offenen Idee „Retro-Design bringt seine Akzentfarbe mit“.
  3. Toast „Akzentfarbe an ‚Windows XP‘ angepasst“ bleibt stehen, wenn man gleich zu einem anderen Design wechselt (nennt dann das falsche Design).
- **Missverständnis geklärt:** „PO“ heißt bei Enrico immer **Push Origin** (alles nach GitHub pushen), nicht Product Owner. Der folgende Lastenheft-Durchgang war also ungeplant, Enrico entscheidet, ob er bleibt.
- **Lastenheft-Durchgang (Stand je Eintrag):** Jeder Eintrag im Lastenheft hat am Anfang einen Vermerk: `[✓ Vxx]` fertig, `[◐ …]` teilweise (was fehlt), `[⇢ …]` ersetzt, **ohne Vermerk = offen**. 73 fertig, 19 teilweise, 1 ersetzt, 60 offen. Grundlage: „Was passiert ist“ aller Übergaben V01–V20 und F-Nummern im Code.
- **Neuer Abschnitt im Lastenheft** „Stand und Reihenfolge“: Legende, **Vorschlag Reihenfolge (13 Punkte, zur Freigabe)** und **Vorschläge zum Zusammenführen (9 Punkte, noch nicht umgesetzt)**.
- Kein Code geändert, nichts zu committen außer dieser Datei.

## Nächste Schritte

1. Enrico gibt Reihenfolge und Zusammenführen frei (ggf. ändern).
2. **Lastenheft-Rest (nur falls Enrico ihn will):** freigegebenes Zusammenführen im Lastenheft umsetzen; ältere Einträge, Titel („Panel-Arbeitsfläche“) und F-156-Beispiel („Größen-Modus · Strg/⌘+Umschalt+G“ → Adjust · Alt/⌥+A) auf F-154-Begriffe umstellen; neuere Einträge (F-114 ff.) in passende Abschnitte einsortieren; danach Vermerk bei F-154 auf ✓. Ausblick in der Geschichte nachziehen (F-151 bis F-178).
3. Dann Code nach Reihenfolge, Vorschlag: F-166 Rest → F-114 Rest → F-23 Rest → F-24 → F-29 Rest → Launcher (F-40–F-42, F-149, F-43) → F-36 → F-168 → F-160 Stufe 2 → F-159 → Farben F-161–F-164 → F-51/F-52 → F-06.
4. Wird ein Punkt fertig: Vermerk im Lastenheft auf `[✓ Vxx]` setzen.

## Kleine Punkte

- Terminal-Akzent und stehender Toast (siehe oben).
- Bei schmalen Portalen fehlt der Portalname in der Titelleiste (BeOS-Reiter dann unsichtbar).
- Im eingebauten Browser sind Cockpit- und Design-Tour als gesehen gemerkt.
- Hilfe-Dialog: Platz für ausgeblendetes „Ausführen“ bleibt frei.
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus (Rückfrage an Enrico offen).
- README nennt noch alte Begriffe und „F-01 bis F-95“.

## Technische Rahmenbedingungen

Wie V20 (Ersatz-vitest unter `~/vt`, Befehle siehe V20). Git nur bei Enrico (GitHub Desktop). Lastenheft-Text am bequemsten: Docs read → JSON nach Datei, mit Python in Markdown umwandeln.

## Arbeitsregeln

Wie V15–V20: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-179) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
