/** Greek → Latin (ELOT 743-style, simplified), so Greek titles make readable web addresses. */
const GREEK: Record<string, string> = {
  α: 'a',
  β: 'v',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  ζ: 'z',
  η: 'i',
  θ: 'th',
  ι: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'x',
  ο: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'y',
  φ: 'f',
  χ: 'ch',
  ψ: 'ps',
  ω: 'o',
};
const DIGRAPHS: [RegExp, string][] = [
  [/ου/g, 'ou'],
  [/αι/g, 'ai'],
  [/ει/g, 'ei'],
  [/οι/g, 'oi'],
  [/μπ/g, 'b'],
  [/ντ/g, 'nt'],
  [/γκ/g, 'gk'],
];

/** "Φθινοπωρινό Open 2026!" → "fthinoporino-open-2026" */
export function slugify(text: string): string {
  let s = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, ''); // strip accents (ό → ο, é → e)
  for (const [pattern, latin] of DIGRAPHS) s = s.replace(pattern, latin);
  s = s.replace(/[α-ω]/g, (ch) => GREEK[ch] ?? '');
  return s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}
