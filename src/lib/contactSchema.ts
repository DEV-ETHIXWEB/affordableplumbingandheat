import { z } from 'zod';

/** Sentinel `service` value that reveals the free-text "what do you need?" field. */
export const OTHER_SERVICE = 'Something else / Not sure';

export const contactSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name.').max(120),
    phone: z
      .string()
      .trim()
      .regex(/^[\d\s()+-]{7,20}$/, 'Enter a valid phone number.'),
    email: z.string().trim().email('Enter a valid email address.').max(200),
    city: z.string().trim().min(2, 'Please enter your city.').max(100),
    service: z.string().min(1, 'Please select a service.'),
    otherService: z.string().trim().max(80, 'Keep it under 80 characters.').optional(),
    message: z.string().trim().min(10, 'Tell us a bit more about the issue (10+ characters).').max(2000),
    // Honeypot: real visitors never see or fill this field (hidden via CSS).
    // Bots that auto-fill every input will populate it, letting the server
    // silently discard the submission without a hard error.
    company: z.string().max(0).optional().default('')
  })
  .superRefine((data, ctx) => {
    if (data.service === OTHER_SERVICE && !data.otherService?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['otherService'], message: 'Tell us what you need help with.' });
    }
  });

export type ContactFormValues = z.infer<typeof contactSchema>;

/** Shape accepted by POST /api/lead. Covers both the full contact form and
 * the chatbot's shorter lead payload, hence every field but the honeypot is
 * optional except for a bare minimum of name/phone so the office can call
 * back — the chatbot's freeform "no wizard" path doesn't ask for a city or
 * dedicated service selection. */
export const leadApiSchema = z.object({
  source: z.enum(['contact-form', 'chatbot']),
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+-]{7,20}$/),
  email: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  service: z.string().trim().max(120).optional().or(z.literal('')),
  propertyType: z.string().trim().max(40).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  urgent: z.boolean().optional().default(false),
  topicsDiscussed: z.string().trim().max(500).optional().or(z.literal('')),
  transcript: z.string().trim().max(6000).optional().or(z.literal('')),
  // Honeypot, must always arrive empty.
  company: z.string().max(0).optional().default('')
});

export type LeadApiPayload = z.infer<typeof leadApiSchema>;
