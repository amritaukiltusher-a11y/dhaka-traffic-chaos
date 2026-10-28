/**
 * Central place to rename the game or change links.
 * Change GAME_NAME here (and `name`/`short_name` in vite.config.ts + index.html <title>)
 * to rebrand the whole site.
 */
export const GAME_NAME = {
  bn: 'ঢাকা ট্র্যাফিক কেয়স',
  en: 'Dhaka Traffic Chaos'
} as const;

/** Replace these with your real profiles. They are plain links, nothing is tracked. */
export const SOCIAL_LINKS = [
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/' },
  { id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' },
  { id: 'x', label: 'X', href: 'https://x.com/' },
  { id: 'github', label: 'GitHub', href: 'https://github.com/' }
] as const;

/** Optional: a server endpoint that accepts POST {"email": "..."}; leave empty for local-only mode. */
export const NEWSLETTER_ENDPOINT: string = import.meta.env.VITE_NEWSLETTER_ENDPOINT ?? '';

export const CONTACT_EMAIL = 'hello@example.com';
