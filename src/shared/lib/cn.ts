/**
 * Tiny class-name combiner. We deliberately avoid `clsx` + `tailwind-merge`
 * here — Tailwind v4 plus our own utility set doesn't have enough conflicting
 * classes to justify the bundle cost (per `bundle-barrel-imports`).
 */

type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | Record<string, boolean | null | undefined>
  | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) push(input, out);
  return out.join(' ');
}

function push(input: ClassValue, out: string[]): void {
  if (!input) return;
  if (typeof input === 'string' || typeof input === 'number') {
    out.push(String(input));
    return;
  }
  if (Array.isArray(input)) {
    for (const item of input) push(item, out);
    return;
  }
  if (typeof input === 'object') {
    for (const key in input) {
      if (input[key]) out.push(key);
    }
  }
}
