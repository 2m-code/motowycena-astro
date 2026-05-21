/**
 * Content Collections – CMS-ready model treści.
 *
 * Stan obecny: treści w MDX w gicie (edycja przez VS Code / GitHub web).
 * Stan przyszły: dokładnie ten sam schema obsłuży Tina / Sanity / Decap CMS bez przepisywania
 * komponentów Astro – wystarczy podpiąć adapter source'a.
 *
 * Strony /uslugi mogą dynamicznie generować się z tej kolekcji – patrz src/pages/[...slug].astro.
 */
import { defineCollection, z } from 'astro:content';

const services = defineCollection({
  type: 'content', // MDX/MD files
  schema: ({ image }) =>
    z.object({
      // Identyfikacja
      // UWAGA: slug NIE jest tutaj polem - Astro generuje go z nazwy pliku
      // (np. wycena-celno-skarbowa.mdx → slug "wycena-celno-skarbowa")
      title: z.string().min(3).max(80),
      order: z.number().default(99),
      draft: z.boolean().default(false),

      // SEO
      seo: z.object({
        title: z.string().min(10).max(70),
        description: z.string().min(50).max(170),
        keywords: z.array(z.string()).default([]),
        ogImage: z.string().optional(),
      }),

      // Karta na liście usług (skrót)
      shortDesc: z.string().min(40).max(200),

      // Hero
      heroLead: z.string().min(50).max(300),

      // Treść strukturalna
      benefits: z.array(z.string()).min(2).max(8),
      processSteps: z
        .array(
          z.object({
            title: z.string().min(2).max(40),
            description: z.string().min(20).max(200),
          })
        )
        .optional(),

      // FAQ (rich snippet w Google)
      faq: z
        .array(
          z.object({
            question: z.string().min(8).max(200),
            answer: z.string().min(20).max(800),
          })
        )
        .optional(),

      // Cennik
      priceRange: z
        .object({
          from: z.number().int().positive(),
          to: z.number().int().positive(),
          currency: z.literal('PLN').default('PLN'),
        })
        .optional(),

      // Obraz hero (opcjonalny)
      heroImage: image().optional(),

      // Daty (do sitemap lastmod)
      publishedAt: z.coerce.date().optional(),
      updatedAt: z.coerce.date().optional(),
    }),
});

/**
 * Posty bloga – później (gdy klient zechce blog SEO).
 * Schema już gotowa, wystarczy zacząć tworzyć MDX w src/content/blog/.
 */
const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      draft: z.boolean().default(false),
      seo: z.object({
        title: z.string(),
        description: z.string(),
        keywords: z.array(z.string()).default([]),
      }),
      excerpt: z.string().min(80).max(300),
      coverImage: image().optional(),
      author: z.string().default('Rafał Pelczar'),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      relatedServices: z.array(z.string()).optional(),
    }),
});

/**
 * Realizacje / case studies.
 * Każdy case = osobny MDX z metadanymi + galerią zdjęć.
 */
const cases = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      draft: z.boolean().default(false),
      category: z.enum([
        'wycena-wartosci',
        'wycena-naprawy',
        'wycena-celno-skarbowa',
        'opis-stanu',
        'doradztwo-zakupowe',
        'biegly-sadowy',
        'biegly-skarbowy',
        'inne',
      ]),
      vehicle: z
        .object({
          make: z.string(),
          model: z.string(),
          year: z.number().int().min(1900).max(new Date().getFullYear()),
        })
        .optional(),
      summary: z.string().min(80).max(400),
      coverImage: image().optional(),
      gallery: z.array(image()).default([]),
      publishedAt: z.coerce.date(),
    }),
});

/**
 * Opinie klientów (testimonials) – do osadzania na stronach z Schema.org Review.
 */
const opinions = defineCollection({
  type: 'data',
  schema: z.object({
    author: z.string(),
    role: z.string().optional(),
    rating: z.number().min(1).max(5),
    text: z.string().min(40).max(800),
    relatedService: z.string().optional(),
    publishedAt: z.coerce.date(),
    verified: z.boolean().default(false),
  }),
});

export const collections = {
  services,
  blog,
  cases,
  opinions,
};
