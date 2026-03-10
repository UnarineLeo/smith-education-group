import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OzowScriptService {
  private loadPromise: Promise<void> | null = null;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  loadScript(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const existingScript = this.document.getElementById('ozow-integration-script') as HTMLScriptElement | null;
    if (existingScript) {
      this.loadPromise = new Promise((resolve, reject) => {
        if (existingScript.getAttribute('data-loaded') === 'true') {
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Ozow script')), { once: true });
      });

      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      const script = this.document.createElement('script');
      script.id = 'ozow-integration-script';
      script.src = 'https://static-content.ozow.com/scripts/js/v2/ozow-integration-2.0.min.js';
      script.async = true;

      script.onload = () => {
        script.setAttribute('data-loaded', 'true');
        resolve();
      };

      script.onerror = () => reject(new Error('Failed to load Ozow script'));

      this.document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}