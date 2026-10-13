import { Component, ElementRef, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonTabs } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

interface NavigationItem {
  label: string;
  path?: string;
  children?: { label: string; path: string }[];
}

@Component({ selector: 'app-tabs', templateUrl: 'tabs.page.html', styleUrls: ['tabs.page.scss'], imports: [IonTabs, RouterLink, RouterLinkActive, CommonModule] })
export class TabsPage {
  menuOpen = false;
  links: NavigationItem[] = [
    { label: 'Home', path: 'home' },
    { label: 'About Us', children: [
      { label: 'Our Story', path: 'about-us' },
      { label: 'Success Stories', path: 'success-stories' }
    ] },
    { label: 'Learning Support', children: [
      { label: 'Our Services', path: 'services' },
      { label: 'Universities & Modules', path: 'universities' },
      { label: 'Our Tutors', path: 'tutors' },
      { label: 'Academic Resources', path: 'resources' }
    ] },
    { label: 'Contact', path: 'contact-us' }
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
