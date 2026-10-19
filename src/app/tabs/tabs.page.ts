import { Component, ElementRef, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonTabs } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

interface NavigationItem {
  label: string;
  path?: string;
  children?: { label: string; path: string; description: string; icon: string }[];
}

@Component({ selector: 'app-tabs', templateUrl: 'tabs.page.html', styleUrls: ['tabs.page.scss'], imports: [IonTabs, RouterLink, RouterLinkActive, CommonModule] })
export class TabsPage {
  menuOpen = false;
  links: NavigationItem[] = [
    { label: 'Home', path: 'home' },
    { label: 'About Us', children: [
      { label: 'Our Story', path: 'about-us', description: 'The people and purpose behind Smith', icon: 'M4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2 M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
      { label: 'Testimonials', path: 'success-stories', description: 'Student experiences and feedback', icon: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z' }
    ] },
    { label: 'Services', path: 'services' },
    { label: 'Tutors', path: 'tutors' },
    { label: 'Subjects & Modules', path: 'universities' },
  ];

  constructor(private element: ElementRef<HTMLElement>, private router: Router) {}

  selectMenuPage(path: string, event: MouseEvent): void {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    this.closeMenus();
    // A repeated selection does not trigger Ionic's page-entry lifecycle.
    if (!this.router.isActive(this.router.createUrlTree([path]), { paths: 'exact', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' })) return;
    this.element.nativeElement.querySelectorAll<HTMLElement & { scrollToTop?: (duration: number) => Promise<void> }>('ion-content').forEach(content => {
      if (!content.closest('.ion-page-hidden')) void content.scrollToTop?.(0);
    });
  }

  closeMenus() {
    this.menuOpen = false;
    this.closeSubmenus();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    this.closeSubmenus();
  }

  onGroupToggle(event: Event) {
    const current = event.target as HTMLDetailsElement;
    if (current.open) this.closeSubmenus(current);
  }

  private closeSubmenus(except?: HTMLDetailsElement) {
    this.element.nativeElement.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(group => {
      if (group !== except) group.open = false;
    });
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent) {
    const header = this.element.nativeElement.querySelector('.site-header');
    if (!header?.contains(event.target as Node)) this.closeMenus();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    const openGroup = this.element.nativeElement.querySelector<HTMLDetailsElement>('details[open]');
    if (openGroup) {
      openGroup.querySelector('summary')?.focus();
      this.closeSubmenus();
    } else if (this.menuOpen) {
      this.closeMenus();
      this.element.nativeElement.querySelector<HTMLButtonElement>('.menu-toggle')?.focus();
    }
  }
}
