import { Component, ElementRef, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
      { label: 'Success Stories', path: 'success-stories', description: 'Every learning journey has a story', icon: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z' }
    ] },
    { label: 'Learning Support', children: [
      { label: 'Our Services', path: 'services', description: 'Find a way of learning that fits you', icon: 'M3 5q4-2 9 1 5-3 9-1v15q-4-2-9 1-5-3-9-1Z M12 6v15' },
      { label: 'Universities & Modules', path: 'universities', description: 'Explore your campus and subjects', icon: 'm3 9 9-6 9 6H3 M5 10v9 M10 10v9 M14 10v9 M19 10v9 M3 21h18' },
      { label: 'Our Tutors', path: 'tutors', description: 'Get to know your learning support', icon: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M1 21v-2a6 6 0 0 1 12 0v2 M16 4a4 4 0 0 1 0 8 M17 15a5 5 0 0 1 5 5v1' },
      { label: 'Academic Resources', path: 'resources', description: 'Fresh ideas for more confident study', icon: 'M6 3h9l4 4v14H6Z M14 3v5h5 M9 12h7 M9 16h5' }
    ] },
  ];

  constructor(private element: ElementRef<HTMLElement>) {}

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
