/** VERCEL_ENV is set by Vercel's build/runtime and is not client-influenced;
 * the Vite MODE covers everything else. Anything that isn't explicitly
 * "development", "preview", or "test" is treated as production, so an absent
 * or unexpected value fails closed rather than open. */
export function isProduction(): boolean {
  const env = process.env.VERCEL_ENV ?? import.meta.env.MODE;
  return env !== 'development' && env !== 'preview' && env !== 'test';
}
