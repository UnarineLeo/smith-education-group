# Managing website SEO

The public site uses https://smitheducationgroup.co.za as its canonical domain.

## Updating a page

Edit the `seo` object in that page's TypeScript file, for example `src/app/home/home.page.ts`. Legal pages use `seoPages` in `src/app/legal/legal.page.ts`.

- `title`: a clear, unique page title describing the page and business.
- `description`: a short, accurate summary of what visitors will find.
- `path`: the canonical route; only change this together with the Angular routes.
- `index`: whether the page should be indexed. Resources currently uses false while hidden.

Keep page headings and visible content consistent with these descriptions. Google may choose different titles or snippets from the page content.

`src/app/services/seo.service.ts` updates metadata during navigation. `scripts/package-seo.mjs` reads the same page objects and creates initial HTML metadata for each route during the cPanel build, including social previews. This is metadata generation, not full Angular content prerendering; the page body still needs JavaScript.

The social preview currently uses `src/assets/education/students.jpg`. To replace it, update the image path in the SEO service, packaging script and `src/index.html`. Business structured data is in `src/index.html`; keep its contact details accurate. The index.html home metadata also provides the default for local development and builds outside the cPanel packaging flow.

## Build and deploy

1. Run `npm run build:cpanel`.
2. Deploy the contents of `www/` to `/home/smithed7g7f8/public_html`, including hidden `.htaccess`, the `tabs` folder, `robots.txt` and `sitemap.xml`. Use the existing GitHub/cPanel workflow if configured, then pull and deploy its built deployment branch in cPanel.
3. Open the homepage and a direct route such as `/tabs/tutors`. Use View Page Source to check its title, description and canonical URL. Confirm HTTPS works.
4. Open https://smitheducationgroup.co.za/robots.txt and https://smitheducationgroup.co.za/sitemap.xml. These should display text/XML, not the application.

The package regenerates the sitemap from indexable page metadata. For a new page, add its folder to the list in `scripts/package-seo.mjs` and add its Angular route. Keep the source fallback sitemap in `src/sitemap.xml` aligned too. Aliases canonicalise to the primary route and are excluded from the sitemap.

## Register with Google

1. Visit https://search.google.com/search-console and choose **Add property → Domain**. Enter `smitheducationgroup.co.za` (without https or a path).
2. Copy the unique TXT verification value Google gives you.
3. At the provider hosting your authoritative DNS, add a **TXT** record for the root domain. If DNS is hosted in cPanel, use **Zone Editor → Manage → Add Record → TXT**. Name/Host is `@` or `smitheducationgroup.co.za.` depending on the provider. Paste the exact Google value, keep the default TTL, and save. Add a new record; preserve existing mail and verification records.
4. Return to Search Console and click **Verify**. If verification fails, allow DNS time to update and retry. Keep the TXT record after verification.
5. Under **Sitemaps**, submit `https://smitheducationgroup.co.za/sitemap.xml`.
6. Use **URL Inspection** for the homepage and key pages. Choose **Test live URL** and then **Request indexing** where available. Review the rendered page to confirm Google can see its content.

A sitemap and indexing request help discovery; they do not guarantee ranking or immediate indexing. Monitor Search Console's Page indexing and Performance reports after launch.

Official references:
- DNS verification: https://support.google.com/webmasters/answer/9008080
- Sitemap management: https://support.google.com/webmasters/answer/7451001
- JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics

## Contact form hosting

The cPanel package includes `api/contact.php`. The contact form posts enquiries to this endpoint, which uses PHP's hosting mail transport to send to `info@smitheducationgroup.co.za`, with the visitor's email as Reply-To. Ensure that this mailbox exists and the host permits PHP mail. The endpoint is not available on GitHub Pages or the Angular development server.

After deployment, submit a real test enquiry, check the inbox/spam folder, and use cPanel **Track Delivery** if it does not arrive. A successful form response confirms the server accepted the message; it cannot confirm inbox delivery. If hosting mail is disabled, ask the host to enable it or configure an authenticated SMTP integration. No mailbox password is stored in the frontend.
