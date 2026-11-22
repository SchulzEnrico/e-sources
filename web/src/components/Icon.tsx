/** F-183: Ein Symbol aus dem Symbolsatz (workspace/icons.ts). Immer aria-hidden – der Name steht daneben als Text oder im aria-label des Knopfs (NF-03). */
import { ICONS, type IconDef, type IconName } from '../workspace/icons';

export function Icon({ name, size = 16, className = 'icon' }: { name: IconName; size?: number; className?: string }) {
  const def: IconDef = ICONS[name];
  const vb = def.vb ?? 16;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} aria-hidden="true" focusable="false" className={className} fill="none" stroke="currentColor" strokeWidth={def.w ?? 1.4} strokeLinecap="round" strokeLinejoin="round">
      {def.d.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
