/** Text utilities for the offline assistant: normalization, tokenization,
 * light stemming, and typo correction. No dependencies, no network. */

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon'?t\b/g, 'will not'],
  [/\bcan'?t\b/g, 'cannot'],
  [/\bain'?t\b/g, 'is not'],
  [/\bshan'?t\b/g, 'shall not'],
  [/\b(do|does|did|is|are|was|were|has|have|had|would|could|should|must|need)n'?t\b/g, '$1 not'],
  [/\bi'?m\b/g, 'i am'],
  [/\b(it|that|what|there|here|who|where|how|he|she)'s\b/g, '$1 is'],
  [/\b(you|we|they)'re\b/g, '$1 are'],
  [/\b(i|you|we|they)'ve\b/g, '$1 have'],
  [/\b(i|you|we|they|he|she|it)'ll\b/g, '$1 will'],
  [/\b(i|you|we|they|he|she)'d\b/g, '$1 would'],
  [/\by'?all\b/g, 'you all'],
  [/\bu\b/g, 'you'],
  [/\bur\b/g, 'your'],
  [/\br\b/g, 'are'],
  [/\bpls\b|\bplz\b/g, 'please'],
  [/\bthx\b|\bty\b|\bthnx\b|\bthanx\b/g, 'thanks'],
  [/\bidk\b/g, 'i do not know'],
  [/\basap\b/g, 'as soon as possible'],
  [/\ba\/c\b/g, 'ac'],
  [/\bair con\b/g, 'ac']
];

/** Lowercase, straighten quotes, expand contractions and texting shorthand,
 * and drop punctuation (keeping digits, @ and . for phones and emails). */
export function normalize(input: string): string {
  let s = input
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"');
  for (const [re, to] of CONTRACTIONS) s = s.replace(re, to);
  return (
    s
      .replace(/[^a-z0-9@.\s'/-]/g, ' ')
      // punctuation that isn't inside a word, email, or phone number
      .replace(/(^|[^a-z0-9])['.\-/]+/g, '$1 ')
      .replace(/['.\-/]+(?=[^a-z0-9]|$)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export const STOPWORDS = new Set(
  (
    'a an the and or but if then so of to for in on at by with from into about as is are was were be been being am ' +
    'i me my mine we us our you your yours he him his she her it its they them their this that these those there here ' +
    'do does did doing have has had having can could will would shall should may might must just really very quite ' +
    'please hi hello hey thanks thank ok okay yes no not what which who whom whose when where why how any some ' +
    'all get got also too than more most much many lot lots like want need know think guys guy'
  ).split(' ')
);

/** Very small suffix-stripping stemmer: enough to match "leaking/leaks/leaked"
 * and "clogged/clogs", without Porter's surprises on short trade words. */
export function stem(word: string): string {
  if (word.length <= 4) return word;
  let w = word;
  if (w.endsWith('ies') && w.length > 5) return w.slice(0, -3) + 'y';
  for (const suffix of ['ingly', 'ings', 'ing', 'edly', 'ed', 'es', 's', 'ly']) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  // clogg -> clog, stopp -> stop
  if (/([bdgklmnprt])\1$/.test(w)) w = w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t && !/^[.@'/-]+$/.test(t));
}

/** Content terms for search: stopwords removed, stemmed. */
export function terms(text: string): string[] {
  return tokenize(text)
    .filter((t) => !STOPWORDS.has(t) && t.length > 1)
    .map(stem);
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      // transposition ("teh" -> "the")
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j], prev[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Allowed typos by word length: none for short words (too many false hits). */
export function maxTypos(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/** Corrects each token to the closest vocabulary word when it isn't a known
 * word itself ("watre heatr" -> "water heater"). */
export function correctTokens(tokens: string[], vocabulary: Set<string>): string[] {
  return tokens.map((t) => {
    if (vocabulary.has(t) || /\d/.test(t) || t.length <= 3) return t;
    const limit = maxTypos(t.length);
    let best = t;
    let bestDistance = limit + 1;
    for (const word of vocabulary) {
      if (Math.abs(word.length - t.length) > limit || word[0] !== t[0]) continue;
      const d = editDistance(t, word);
      if (d < bestDistance) {
        bestDistance = d;
        best = word;
        if (d === 1) break;
      }
    }
    return bestDistance <= limit ? best : t;
  });
}

/** Whole-phrase match on normalized text with word boundaries. */
export function hasPhrase(normalizedText: string, phrase: string): boolean {
  // Each word may carry a plural ending, so "ev chargers" matches "ev charger".
  const pattern = phrase
    .split(' ')
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (/[a-z]$/.test(w) ? '(?:s|es)?' : ''))
    .join('\\s+');
  return new RegExp(`(^|\\s)${pattern}(?=\\s|$)`).test(normalizedText);
}

/** Stable pseudo-random pick so replies vary between turns without
 * randomness in tests. */
export function pick<T>(options: readonly T[], seed: number): T {
  return options[Math.abs(seed) % options.length];
}

export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}
