// Apollo by AdamCYounis (46 colours, https://lospec.com/palette-list/apollo): the PROVISIONAL
// palette for the proof of concept (DECISIONS.md 2026-10-12). STYLE.md, written after the proof
// of concept, fixes it; until then nothing is final. Every texture pixel and every flat colour
// comes from APOLLO; the names below are the ones code uses.

export const APOLLO = [
  '#172038', '#253a5e', '#3c5e8b', '#4f8fba', '#73bed3', '#a4dddb',
  '#19332d', '#25562e', '#468232', '#75a743', '#a8ca58', '#d0da91',
  '#4d2b32', '#7a4841', '#ad7757', '#c09473', '#d7b594', '#e7d5b3',
  '#341c27', '#602c2c', '#884b2b', '#be772b', '#de9e41', '#e8c170',
  '#241527', '#411d31', '#752438', '#a53030', '#cf573c', '#da863e',
  '#1e1d39', '#402751', '#7a367b', '#a23e8c', '#c65197', '#df84a5',
  '#090a14', '#10141f', '#151d28', '#202e37', '#394a50', '#577277',
  '#819796', '#a8b5b2', '#c7cfcc', '#ebede9',
] as const;

export const C = {
  // neutrals, dark to light
  ink: '#090a14', soot: '#10141f', night: '#151d28', slate: '#202e37', iron: '#394a50', steel: '#577277',
  ash: '#819796', fog: '#a8b5b2', mist: '#c7cfcc', bone: '#ebede9',
  // water, deep to shallow
  abyss: '#172038', deep: '#253a5e', blue: '#3c5e8b', sky: '#4f8fba', cyan: '#73bed3', ice: '#a4dddb',
  // vegetation and shore
  moss: '#19332d', leaf: '#25562e', green: '#468232', lime: '#75a743', sprout: '#a8ca58', reed: '#d0da91',
  // earth and sand
  mud: '#4d2b32', clay: '#7a4841', tan: '#ad7757', sand: '#c09473', dune: '#d7b594', shell: '#e7d5b3',
  // wood and brass
  bark: '#341c27', rust: '#602c2c', copper: '#884b2b', brass: '#be772b', amber: '#de9e41', gold: '#e8c170',
  // reds
  wine: '#752438', red: '#a53030', ember: '#cf573c', orange: '#da863e',
  // purples
  dusk: '#1e1d39', plum: '#402751', violet: '#7a367b', magenta: '#a23e8c', pink: '#c65197', rose: '#df84a5',
} as const;

export function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
