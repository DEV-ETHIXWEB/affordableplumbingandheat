/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig applies the project's Astro/Vite setup, so tests can import the
// real data modules (including their image imports) exactly as the site does.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts']
  }
});
