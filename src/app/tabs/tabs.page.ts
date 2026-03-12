import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonList, IonIcon, IonButtons, IonButton, IonToolbar, IonHeader, IonLabel, IonItem, IonModal } from '@ionic/angular/standalone';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { RegisterModalComponent } from '../register-modal/register-modal.component';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonButtons, IonList, IonButton, IonToolbar, IonHeader, IonLabel, IonItem, IonModal, RouterLink, RouterLinkActive, LoginModalComponent, RegisterModalComponent],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  loginModalOpen = false;
  registerModalOpen = false;

  constructor() {
    addIcons(icons);
  }

  openLoginModal() {
    this.loginModalOpen = true;
  }

  openRegisterModal() {
    this.registerModalOpen = true;
  }

  menuOpen: boolean = false;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }
}
