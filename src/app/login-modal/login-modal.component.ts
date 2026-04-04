import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonItem, IonLabel, IonInput, IonText, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss'],
  standalone: true,
  imports: [IonButton, IonItem, IonLabel, IonInput, IonText, IonIcon, FormsModule]
})
export class LoginModalComponent {
  @Output() dismissed = new EventEmitter<{
    action: string;
    payload?: { email?: string; password?: string };
  } | null>();

  email = '';
  password = '';
  showPassword = false;

  close() {
    this.dismissed.emit(null);
  }

  forgotPassword() {
    this.dismissed.emit({
      action: 'forgot-password',
      payload: { email: this.email }
    });
  }

  login() {
    this.dismissed.emit({
      action: 'login',
      payload: { email: this.email, password: this.password }
    });
  }

  continueWithGoogle() {
    this.dismissed.emit({ action: 'google-login' });
  }

  openRegister() {
    this.dismissed.emit({ action: 'open-register' });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  canSubmitLogin(): boolean {
    return this.email.trim() !== '' && this.password.trim() !== '';
  }
}
