import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum([
      'Plumbing',
      'HVAC',
      'Electrical',
      'Sewer',
      'Water Heaters',
      'Colorado',
      "Homeowner's Guide",
      'FAQ',
      'Troubleshooting',
      'Power Outages',
      'Hydro Jetting',
      'Thermostat'
    ]),
    publishDate: z.coerce.date(),
    author: z.string().default('Adam O’Brien'),
    oldSlug: z.string().optional(),
    oldSlugs: z.array(z.string()).optional(),
    draft: z.boolean().default(false)
  })
});

export const collections = { blog };
