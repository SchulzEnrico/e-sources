/** V110: Öffnen des Pads im Vollbild (eigene Datei, damit Formulare/Entscheidungen den Knopf ohne Kreis-Import nutzen). */
import { WORKPAD_TEXT as T } from '../workspace/terms';
import { Icon } from './Icon';

export const WORKPAD_EVENT = 'esource:workpad';
export type WorkPadTab = 'forms' | 'decisions';
export interface WorkPadOpen {
  tab: WorkPadTab;
  /** Projekt (Formulare: Pflicht, sonst das erste; Entscheidungen: vorgewählt im Rad „Zeigen“). */
  project?: string;
  /** Entscheidung, die gleich offen ist. */
  decision?: string;
}
export function openWorkPad(d: WorkPadOpen): void {
  window.dispatchEvent(new CustomEvent<WorkPadOpen>(WORKPAD_EVENT, { detail: d }));
}

/** Knopf „Im Pad“ für den Kopf von Formularen und Entscheidungen. */
export function WorkPadButton(d: WorkPadOpen) {
  return (
    <button type="button" className="help__run workpad__open" title={T.openHint} onClick={() => openWorkPad(d)}>
      <Icon name="maximize" size={13} className="icon icon--inline" /> {T.open}
    </button>
  );
}

