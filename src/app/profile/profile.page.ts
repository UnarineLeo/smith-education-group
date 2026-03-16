import { Component, OnDestroy } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class ProfilePage implements OnDestroy {
  activeTab: 'personal' | 'password' | 'education' = 'personal';
  isGoogleUser = false;

  profile = {
    firstName: 'User',
    lastName: '',
    email: '',
    phone: ''
  };

  private unsubscribeAuth?: () => void;

  interests = [
    'Engineering',
    'Medicine & Health Sciences',
    'Business & Commerce',
    'Law',
    'Arts & Humanities',
    'Natural Sciences',
    'Education',
    'Information Technology'
  ];

  selectedInterests: string[] = ['Information Technology', 'Business & Commerce'];

  constructor() {
    this.unsubscribeAuth = onAuthStateChanged(getAuth(), (user) => {
      this.applyUserProfile(user);
    });
  }

  setTab(tab: 'personal' | 'password' | 'education') {
    this.activeTab = tab;
  }

  toggleInterest(interest: string) {
    if (this.selectedInterests.includes(interest)) {
      this.selectedInterests = this.selectedInterests.filter(item => item !== interest);
      return;
    }

    this.selectedInterests = [...this.selectedInterests, interest];
  }

  ngOnDestroy() {
    this.unsubscribeAuth?.();
  }

  private applyUserProfile(user: User | null) {
    if (!user) {
      this.isGoogleUser = false;
      this.profile = {
        firstName: 'User',
        lastName: '',
        email: '',
        phone: ''
      };
      return;
    }

    this.isGoogleUser = user.providerData.some((provider) => provider.providerId === 'google.com');

    const displayName = user.displayName?.trim() ?? '';
    const [firstName = 'User', ...rest] = displayName ? displayName.split(/\s+/) : ['User'];

    this.profile = {
      firstName,
      lastName: rest.join(' '),
      email: user.email ?? '',
      phone: user.phoneNumber ?? ''
    };

    if (this.isGoogleUser && this.activeTab === 'password') {
      this.activeTab = 'personal';
    }
  }
}
