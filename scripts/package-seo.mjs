import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import ts from 'typescript';

// Read page-owned metadata without executing Angular components.
function metadata(folder, property = 'seo') {
  const source = ts.createSourceFile(folder, readFileSync(`src/app/${folder}/${folder}.page.ts`, 'utf8'), ts.ScriptTarget.Latest, true);
  let result;
  function visit(node) {
    if (ts.isPropertyDeclaration(node) && node.name.getText(source) === property) result = JSON.parse(node.initializer.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!result) throw new Error(`Missing ${property} in ${folder}`);
  return result;
}
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function packageSeo() {
  const origin = 'https://smitheducationgroup.co.za';
  const pages = ['home', 'about-us', 'services', 'tutors', 'universities', 'success-stories', 'contact-us', 'resources'].map(folder => metadata(folder));
  pages.push(...Object.values(metadata('legal', 'seoPages')));
  const template = readFileSync('www/index.html', 'utf8');
  if (!template.includes('<!-- SEO:START -->') || !template.includes('<!-- SEO:END -->')) throw new Error('SEO markers missing from built index.html');
  const aliases = { '/': ['/home', '/tabs/home'], '/tabs/about-us': ['/tabs/our-story'], '/tabs/contact-us': ['/contact'], '/tabs/privacy': ['/privacy'], '/tabs/terms': ['/terms'], '/tabs/popia': ['/popia'] };
  for (const page of pages) {
    const url = origin + page.path;
    const image = origin + '/assets/education/students.jpg';
    const names = { description: page.description, robots: page.index ? 'index, follow, max-image-preview:large' : 'noindex, follow', 'twitter:card': 'summary_large_image', 'twitter:title': page.title, 'twitter:description': page.description, 'twitter:image': image, 'twitter:image:alt': 'Students learning together' };
    const properties = { 'og:type': 'website', 'og:site_name': 'Smith Education Group', 'og:locale': 'en_ZA', 'og:title': page.title, 'og:description': page.description, 'og:url': url, 'og:image': image, 'og:image:alt': 'Students learning together' };
    const tags = [`<title>${escape(page.title)}</title>`, `<link rel="canonical" href="${url}">`];
    for (const [attribute, entries] of [['name', names], ['property', properties]]) for (const [key, value] of Object.entries(entries)) tags.push(`<meta ${attribute}="${key}" content="${escape(value)}">`);
    const schema = { '@context': 'https://schema.org', '@type': 'WebPage', '@id': url + '#webpage', url, name: page.title, description: page.description, inLanguage: 'en-ZA', publisher: { '@id': origin + '/#organization' } };
    tags.push(`<script id="seo-webpage" type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`);
    const html = template.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, () => `<!-- SEO:START -->\n${tags.join('\n')}\n<!-- SEO:END -->`);
    for (const route of [page.path, ...(aliases[page.path] || [])]) {
      const file = route === '/' ? 'www/index.html' : `www${route}.html`;
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html);
    }
  }
  writeFileSync('www/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(page => page.index).map(page => `  <url><loc>${origin}${page.path}</loc></url>`).join('\n')}\n</urlset>\n`);
  writeFileSync('www/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  console.log(`Generated SEO HTML for ${pages.length} pages and their aliases.`);
}
