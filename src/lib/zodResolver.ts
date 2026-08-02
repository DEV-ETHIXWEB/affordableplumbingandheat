import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Minimal Zod resolver for react-hook-form.
 *
 * We hand-roll this instead of depending on @hookform/resolvers: that
 * package's zod adapter pins an optional peer on zod@^3, while Astro's
 * content-collection tooling pulls in zod@^4, and a single npm install
 * can't satisfy both. Zod's `safeParse` is all the adapter needs anyway.
 */
export function zodResolver<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: FieldErrors<T> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') as keyof T as string;
      if (!errors[key as keyof FieldErrors<T>]) {
        (errors as Record<string, unknown>)[key] = { type: issue.code, message: issue.message };
      }
    }
    return { values: {}, errors };
  };
}
