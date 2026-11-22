/**
 * F-133 Demo-Startbelegung: Wer E-Source zum ersten Mal öffnet (noch nichts gespeichert), sieht
 * statt leerer Panels ein Beispiel-Layout mit Seiten, die sich einbetten lassen, und passenden
 * Lesezeichen. Gespeicherte Stände werden nie überschrieben (siehe loadWorkspace).
 */
import { type Lines, type Orientation, SCREEN_CLASSES, allowsTwoLines, layoutKey, specOf } from './screen';
import * as T from './tree';
import type { Area, Arrangement, Bookmark, Named, PanelMeta, Tab, Workspace } from './types';
import { defaultWorkspace, newId } from './workspace';
import { addSamples } from './bookmarks';

interface DemoLink {
  title: string;
  url: string;
}

interface DemoPanel {
  name: string;
  category: string;
  /** Seiten, die als Tabs offen sind; die erste ist auch die Startseite. */
  tabs: string[];
  /** Lesezeichen in der Sammlung des Panels. */
  links: DemoLink[];
  /** Panels mit demselben Area-Namen liegen als Stapel auf einer Area (F-08, F-128). */
  area?: string;
  /** Lineal für dieses Panel eingeschaltet (F-15). */
  ruler?: boolean;
}

/** Video von einer Mercedes-Benz-Veranstaltung, die Enrico begleitet hat. */
const MERCEDES = 'https://www.youtube-nocookie.com/embed/q5PG_ThiWf4';
const OSM = (bbox: string) => `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
const WIKI = (title: string) => `https://de.wikipedia.org/wiki/${title}`;

export const DEMO: DemoPanel[] = [
  {
    name: 'Portfolio',
    category: 'Enrico Schulz',
    ruler: true,
    tabs: ['https://schulzenrico.github.io/'],
    links: [
      { title: 'Portfolio', url: 'https://schulzenrico.github.io/' },
      { title: 'Portfolio (English)', url: 'https://schulzenrico.github.io/en/' },
      { title: 'Impressum', url: 'https://schulzenrico.github.io/impressum.html' },
    ],
  },
  {
    name: 'Kontakt',
    category: 'Enrico Schulz',
    area: 'Bewerbung',
    tabs: ['https://schulzenrico.github.io/businessCard.html'],
    links: [{ title: 'Kontakt / Visitenkarte', url: 'https://schulzenrico.github.io/businessCard.html' }],
  },
  {
    name: 'Zertifikate',
    category: 'Enrico Schulz',
    area: 'Bewerbung',
    tabs: ['https://schulzenrico.github.io/documents.html'],
    links: [{ title: 'Abschlüsse & Zertifikate', url: 'https://schulzenrico.github.io/documents.html' }],
  },
  {
    name: 'Wissen',
    category: 'Wissen',
    tabs: [WIKI('Hamburg'), WIKI('Hamburger_Hafen'), OSM('9.85,53.50,10.15,53.62')],
    links: [
      { title: 'Hamburg', url: WIKI('Hamburg') },
      { title: 'Hamburger Hafen', url: WIKI('Hamburger_Hafen') },
      { title: 'Elbphilharmonie', url: WIKI('Elbphilharmonie') },
      { title: 'Speicherstadt', url: WIKI('Speicherstadt') },
      { title: 'Karte Hamburg', url: OSM('9.85,53.50,10.15,53.62') },
      { title: 'Karte Hafen und Speicherstadt', url: OSM('9.94,53.535,10.01,53.552') },
    ],
  },
  {
    name: 'Video',
    category: 'Video',
    tabs: [MERCEDES],
    links: [{ title: 'Mercedes-Benz Veranstaltung', url: MERCEDES }],
  },
];

const tabOf = (url: string): Tab => ({ id: newId(), url, history: [url], pos: 0 });

/**
 * Anordnung für eine Bildschirm-Einstellung: jede Gruppe eine Area, überzählige Gruppen kommen
 * auf die letzte Area (wie bei der ersten Anordnung in workspace.ts).
 */
function arrange(groups: string[][], capacity: number, lines: number, perLine: number, orientation: Orientation): Arrangement | null {
  const fit = groups.length <= capacity ? groups : [...groups.slice(0, capacity - 1), groups.slice(capacity - 1).flat()];
  const areas: Record<string, Area> = {};
  for (const g of fit) areas[`area-${g[0]}`] = { id: `area-${g[0]}`, panels: g, front: g[0] };
  const tree = T.standard(Object.keys(areas), lines, perLine, orientation);
  return tree ? { tree, areas } : null;
}

export function demoWorkspace(): Workspace {
  const base = defaultWorkspace();
  const panels: PanelMeta[] = [];
  const categories: Named[] = [];
  const bookmarks: Bookmark[] = [];
  const areaNames: Named[] = [];
  const groups: string[][] = [];
  const groupOf = new Map<string, string[]>();
  for (const d of DEMO) {
    const tabs = d.tabs.map(tabOf);
    const panel: PanelMeta = { id: newId(), name: d.name, tabs, activeTab: tabs[0].id, home: d.tabs[0] };
    if (d.ruler) panel.ruler = true;
    if (d.area) {
      let named = areaNames.find((a) => a.name === d.area);
      if (!named) areaNames.push((named = { id: newId(), name: d.area }));
      panel.areaName = named.id;
      const g = groupOf.get(named.id);
      if (g) g.push(panel.id);
      else {
        const ng = [panel.id];
        groupOf.set(named.id, ng);
        groups.push(ng);
      }
    } else groups.push([panel.id]);
    panels.push(panel);
    let category = categories.find((c) => c.name === d.category);
    if (!category) categories.push((category = { id: newId(), name: d.category }));
    for (const l of d.links) bookmarks.push({ id: newId(), title: l.title, url: l.url, category: category.id, tags: [], panels: [panel.id] });
  }
  // Der Stapel soll in jeder Bildschirm-Einstellung zu sehen sein, deshalb hier fertig angeordnet.
  const layouts: Record<string, Arrangement> = {};
  for (const c of SCREEN_CLASSES)
    for (const orientation of ['landscape', 'portrait'] as Orientation[])
      for (const lines of (allowsTwoLines(c.id) ? [1, 2] : [1]) as Lines[]) {
        const setup = { cls: c.id, orientation, lines };
        const spec = specOf(setup);
        const arr = arrange(groups, spec.capacity, spec.lines, spec.perLine, orientation);
        if (arr) layouts[layoutKey(setup)] = arr;
      }
  // F-145: dazu Beispiel-Lesezeichen in weiteren Kategorien (unter „Alle“)
  return addSamples({ ...base, panels, layouts, nextNumber: 1, bookmarks, categories, areaNames, nextArea: 1 }, newId).ws;
}
