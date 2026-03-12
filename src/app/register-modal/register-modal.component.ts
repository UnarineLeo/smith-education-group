import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonHeader, IonToolbar, IonTitle, IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonText } from '@ionic/angular/standalone';
import { INTEREST_OPTIONS, STUDY_LEVELS } from '../shared/app-data';

@Component({
  selector: 'app-register-modal',
  templateUrl: './register-modal.component.html',
  styleUrls: ['./register-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonButton, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonText, FormsModule]
})
export class RegisterModalComponent {
  @Output() dismissed = new EventEmitter<{ action: string; payload?: any } | null>();

  firstName = '';
  surname = '';
  email = '';
  password = '';
  confirmPassword = '';
  currentStudyLevel = '';
  interests: string[] = [];

  studyLevels = STUDY_LEVELS;
  interestOptions = INTEREST_OPTIONS;

  close() {
    this.dismissed.emit(null);
  }

  register() {
    this.dismissed.emit({
      action: 'register',
      payload: {
        firstName: this.firstName,
        surname: this.surname,
        email: this.email,
        currentStudyLevel: this.currentStudyLevel,
        interests: this.interests
      }
    });
  }

  continueWithGoogle() {
    this.dismissed.emit({ action: 'google-register' });
  }

  openLogin() {
    this.dismissed.emit({ action: 'open-login' });
  }
}
