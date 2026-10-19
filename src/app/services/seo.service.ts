import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface PageSeo { title: string; description: string; path: string; index: boolean; }

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly origin = 'https://smitheducationgroup.co.za';

  update(page: PageSeo): void {
    const url = this.origin + page.path;
    const image = this.origin + '/assets/education/students.jpg';
    this.title.setTitle(page.title);
    for (const [name, content] of Object.entries({ description: page.description, robots: page.index ? 'index, follow, max-image-preview:large' : 'noindex, follow', 'twitter:card': 'summary_large_image', 'twitter:title': page.title, 'twitter:description': page.description, 'twitter:image': image, 'twitter:image:alt': 'Students learning together' })) this.meta.updateTag({ name, content });
    for (const [property, content] of Object.entries({ 'og:type': 'website', 'og:site_name': 'Smith Education Group', 'og:locale': 'en_ZA', 'og:title': page.title, 'og:description': page.description, 'og:url': url, 'og:image': image, 'og:image:alt': 'Students learning together' })) this.meta.updateTag({ property, content });
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = this.document.createElement('link'); canonical.rel = 'canonical'; this.document.head.appendChild(canonical); }
    canonical.href = url;
    let structured = this.document.getElementById('seo-webpage');
    if (!structured) { structured = this.document.createElement('script'); structured.id = 'seo-webpage'; structured.setAttribute('type', 'application/ld+json'); this.document.head.appendChild(structured); }
    structured.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', '@id': url + '#webpage', url, name: page.title, description: page.description, inLanguage: 'en-ZA', publisher: { '@id': this.origin + '/#organization' } });
  }
}
