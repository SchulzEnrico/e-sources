import { Icon } from './Icon';
import { STAR_TEXT } from '../workspace/terms';

/** V128 (F-231 K12): kleiner Stern hinter dem Namen eines Sheets mit Stern (sichtbar und angesagt). */
export function StarMark({ on }: { on?: boolean }) {
  if (!on) return null;
  return (
    <span className="starmark" title={STAR_TEXT.mark}>
      <Icon name="star" size={10} />
      <span className="sr-only">, {STAR_TEXT.mark}</span>
    </span>
  );
}
