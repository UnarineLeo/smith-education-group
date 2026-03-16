import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonList, IonIcon, IonButtons, IonButton, IonToolbar, IonHeader, IonLabel, IonItem, IonModal } from '@ionic/angular/standalone';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { addIcons } from 'ionicons';
import * as icons from 'ionicons/icons';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { RegisterModalComponent } from '../register-modal/register-modal.component';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonButtons, IonList, IonButton, IonToolbar, IonHeader, IonLabel, IonItem, IonModal, AsyncPipe, RouterLink, RouterLinkActive, LoginModalComponent, RegisterModalComponent],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);
  loginModalOpen = false;
  registerModalOpen = false;
  isLoggedIn$ = this.authService.isLoggedIn$;

  constructor(private authService: AuthService) {
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

  async handleLoginDismiss(event: { action: string; payload?: { email?: string; password?: string } } | null) {
    if (!event) {
      this.loginModalOpen = false;
      return;
    }

    switch (event.action) {
      case 'open-register':
        this.loginModalOpen = false;
        this.registerModalOpen = true;
        break;
      case 'google-login':
        await this.authService.googleSignIn();
        this.loginModalOpen = false;
        break;
      case 'forgot-password':
        if (event.payload?.email) {
          this.authService.forgotPassword(event.payload.email);
        } else {
          await this.authService.presentToast('Enter your email first');
        }
        break;
      case 'login':
        if (!event.payload?.email || !event.payload?.password) {
          await this.authService.presentToast('Email and password are required');
          return;
        }

        try {
          await this.authService.loginFireAuth({
            email: event.payload.email,
            password: event.payload.password
          });
          this.loginModalOpen = false;
        } catch {
          // AuthService handles error toasts; keep modal open for correction.
        }
        break;
      default:
        this.loginModalOpen = false;
        break;
    }
  }

  async handleRegisterDismiss(event: {
    action: string;
    payload?: {
      firstName?: string;
      surname?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      currentStudyLevel?: string;
      interests?: string[];
    };
  } | null) {
    if (!event) {
      this.registerModalOpen = false;
      return;
    }

    switch (event.action) {
      case 'open-login':
        this.registerModalOpen = false;
        this.loginModalOpen = true;
        break;
      case 'google-register':
        await this.authService.googleSignIn();
        this.registerModalOpen = false;
        break;
      case 'register': {
        const payload = event.payload;
        if (!payload?.firstName || !payload?.surname || !payload?.email || !payload?.password || !payload?.confirmPassword) {
          await this.authService.presentToast('Please complete all required fields');
          return;
        }

        if (payload.password !== payload.confirmPassword) {
          await this.authService.presentToast('Passwords do not match');
          return;
        }

        try {
          await this.authService.userRegistration({
            displayName: `${payload.firstName} ${payload.surname}`.trim(),
            email: payload.email,
            password: payload.password,
            currentStudyLevel: payload.currentStudyLevel,
            interests: payload.interests ?? []
          });
          this.registerModalOpen = false;
        } catch {
          // AuthService handles error toasts; keep modal open for correction.
        }
        break;
      }
      default:
        this.registerModalOpen = false;
        break;
    }
  }
}
