import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonButton, IonItem, IonLabel, IonInput, IonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButton, IonItem, IonLabel, IonInput, IonText, FormsModule]
})
export class LoginModalComponent {
  @Output() dismissed = new EventEmitter<{ action: string; email?: string } | null>();

  email = '';
  password = '';

  close() {
    this.dismissed.emit(null);
  }

  forgotPassword() {
    this.dismissed.emit({ action: 'forgot-password' });
  }

  login() {
    this.dismissed.emit({ action: 'login', email: this.email });
  }

  continueWithGoogle() {
    this.dismissed.emit({ action: 'google-login' });
  }

  openRegister() {
    this.dismissed.emit({ action: 'open-register' });
  }
}
