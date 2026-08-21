import { validateTagCodepoints } from './presets';

export function assertValidTags(tags: Record<string, string>): void {
  for (const [k, v] of Object.entries(tags)) {
    if (!validateTagCodepoints(k) || !validateTagCodepoints(v)) {
      throw new Error(`Tag exceeds 255 codepoints: ${k}`);
    }
  }
}
