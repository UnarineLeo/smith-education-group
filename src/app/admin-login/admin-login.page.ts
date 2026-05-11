import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonItem,
  IonLabel,
  IonInput,
  IonText,
} from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.page.html',
  styleUrls: ['./admin-login.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonItem,
    IonLabel,
    IonInput,
    IonText,
    FormsModule,
    RouterLink,
    FooterComponent,
  ],
})
export class AdminLoginPage {
  email = '';
  password = '';

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  async login(): Promise<void> {
    if (!this.email.trim() || !this.password.trim()) {
      await this.authService.presentToast('Please enter email and password.');
      return;
    }

    await this.authService.loginFireAuth({
      email: this.email.trim(),
      password: this.password,
    });

    const isAdmin = await this.authService.isCurrentUserAdmin();
    if (!isAdmin) {
      await this.authService.presentToast('This account does not have admin access.');
      await this.authService.logOut({ redirectTo: '/tabs/admin-login' });
      return;
    }

    await this.router.navigate(['/tabs/admin-portal']);
  }

  async forgotPassword(): Promise<void> {
    if (!this.email.trim()) {
      await this.authService.presentToast('Enter your email address to reset your password.');
      return;
    }

    this.authService.forgotPassword(this.email.trim());
  }

  async continueWithGoogle(): Promise<void> {
    await this.authService.googleSignIn();

    const isAdmin = await this.authService.isCurrentUserAdmin();
    if (!isAdmin) {
      await this.authService.presentToast('This account does not have admin access.');
      await this.authService.logOut({ redirectTo: '/tabs/admin-login' });
      return;
    }

    await this.router.navigate(['/tabs/admin-portal']);
  }

  async openRegister(): Promise<void> {
    await this.router.navigate(['/register']);
  }
}
