import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * Public marketing pages are crawlable; the authenticated app and the loginless
 * customer links are not (the latter are private, unguessable, per-customer).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/approvals', '/members', '/reporting', '/settings', '/a/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
