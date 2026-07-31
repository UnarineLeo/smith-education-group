import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonItem, IonLabel, IonInput, IonText, IonIcon } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-register-modal',
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.scss'],
  standalone: true,
  imports: [IonButton, IonItem, IonLabel, IonInput, IonText, IonIcon, FormsModule]
})
export class RegisterModalComponent {
  @Output() dismissed = new EventEmitter<{
    action: string;
    payload?: {
      firstName?: string;
      surname?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      currentStudyLevel?: string;
      interest?: string;
      courseChoices?: string[];
    };
  } | null>();

  firstName = '';
  surname = '';
  email = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  constructor(private alertController: AlertController) {}

  close() {
    this.dismissed.emit(null);
  }

  async register() {
    if (!this.hasRequiredFields()) {
      return;
    }

    if (!this.hasRequiredPasswordComplexity(this.password)) {
      await this.presentPasswordStandardAlert();
      return;
    }

    this.dismissed.emit({
      action: 'register',
      payload: {
        firstName: this.firstName,
        surname: this.surname,
        email: this.email,
        password: this.password,
        confirmPassword: this.confirmPassword
      }
    });
  }

  continueWithGoogle() {
    this.dismissed.emit({ action: 'google-register' });
  }

  openLogin() {
    this.dismissed.emit({ action: 'open-login' });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  canSubmitRegistration(): boolean {
    return this.hasRequiredFields();
  }

  private hasRequiredFields(): boolean {
    return this.firstName.trim() !== ''
      && this.surname.trim() !== ''
      && this.email.trim() !== ''
      && this.password.trim() !== ''
      && this.confirmPassword.trim() !== '';
  }

  private hasRequiredPasswordComplexity(password: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,}$/.test(password);
  }

  private async presentPasswordStandardAlert() {
    const alert = await this.alertController.create({
      cssClass: 'password-standard-alert',
      header: 'Password Requirements',
      message: 'Use at least 6 characters, including 1 uppercase letter, 1 lowercase letter, and 1 special character.',
      buttons: ['OK']
    });

    await alert.present();
  }
}
