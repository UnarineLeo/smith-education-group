import { Component, OnDestroy } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { AuthService } from '../services/auth.service';

type ProfileTab = 'personal' | 'password' | 'education' | 'highSchoolSubjects';

interface SubjectMarkEntry {
  subject: string;
  mark: number | null;
}

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class ProfilePage implements OnDestroy {
  activeTab: ProfileTab = 'personal';
  isGoogleUser = false;
  minimumSubjects = 7;
  isSavingProfile = false;
  isSavingSubjects = false;
  userUid = '';

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

  highSchoolSubjectOptions = [
    'Accounting',
    'Agricultural Management Practices',
    'Agricultural Sciences',
    'Agricultural Technology',
    'Business Studies',
    'Civil Technology',
    'Computer Applications Technology',
    'Consumer Studies',
    'Dance Studies',
    'Dramatic Arts',
    'Economics',
    'Electrical Technology',
    'Engineering Graphics and Design',
    'Geography',
    'History',
    'Hospitality Studies',
    'Information Technology',
    'Languages (refer to institution websites for their language entry requirements)',
    'Life Sciences',
    'Mechanical Technology',
    'Mathematics',
    'Mathematical Literacy',
    'Music',
    'Physical Sciences',
    'Religion Studies',
    'Tourism',
    'Visual Arts'
  ];

  subjectEntries: SubjectMarkEntry[] = this.createInitialSubjectRows();

  constructor(private authService: AuthService) {
    this.unsubscribeAuth = onAuthStateChanged(getAuth(), async (user) => {
      await this.applyUserProfile(user);
    });
  }

  setTab(tab: ProfileTab) {
    this.activeTab = tab;
  }

  toggleInterest(interest: string) {
    if (this.selectedInterests.includes(interest)) {
      this.selectedInterests = this.selectedInterests.filter(item => item !== interest);
      return;
    }

    this.selectedInterests = [...this.selectedInterests, interest];
  }

  onProfileInputChange(field: keyof typeof this.profile, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.profile = {
      ...this.profile,
      [field]: value
    };
  }

  async saveProfileChanges() {
    await this.saveViaUpdateUser('Profile changes saved successfully.');
  }

  async saveInterests() {
    await this.saveViaUpdateUser('Interests saved successfully.');
  }

  addSubjectEntry() {
    this.subjectEntries = [...this.subjectEntries, { subject: '', mark: null }];
  }

  removeSubjectEntry(index: number) {
    if (this.subjectEntries.length <= this.minimumSubjects) {
      return;
    }

    this.subjectEntries = this.subjectEntries.filter((_, currentIndex) => currentIndex !== index);
  }

  onSubjectChange(index: number, event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.subjectEntries = this.subjectEntries.map((entry, currentIndex) => {
      if (currentIndex !== index) {
        return entry;
      }

      return {
        ...entry,
        subject: value
      };
    });
  }

  onMarkChange(index: number, event: Event) {
    const rawValue = (event.target as HTMLInputElement).value;

    this.subjectEntries = this.subjectEntries.map((entry, currentIndex) => {
      if (currentIndex !== index) {
        return entry;
      }

      if (rawValue.trim() === '') {
        return {
          ...entry,
          mark: null
        };
      }

      const parsedMark = Number(rawValue);
      const sanitizedMark = Number.isFinite(parsedMark)
        ? Math.min(100, Math.max(0, Math.round(parsedMark)))
        : null;

      return {
        ...entry,
        mark: sanitizedMark
      };
    });
  }

  isSubjectDisabled(subject: string, currentIndex: number): boolean {
    return this.subjectEntries.some((entry, index) => index !== currentIndex && entry.subject === subject);
  }

  async saveHighSchoolSubjects() {
    if (!this.userUid) {
      await this.authService.presentToast('Please sign in to save your subjects.');
      return;
    }

    const completedEntries = this.subjectEntries.filter((entry) =>
      entry.subject.trim() !== '' && entry.mark !== null && entry.mark >= 0 && entry.mark <= 100
    );

    if (completedEntries.length < this.minimumSubjects) {
      await this.authService.presentToast('Add at least 7 subjects with marks before saving.');
      return;
    }

    const uniqueSubjects = new Set(completedEntries.map((entry) => entry.subject));
    if (uniqueSubjects.size !== completedEntries.length) {
      await this.authService.presentToast('Each subject can only be selected once.');
      return;
    }

    this.isSavingSubjects = true;

    try {
      await this.saveViaUpdateUser('High school subjects saved successfully.');
    } catch {
      await this.authService.presentToast('Could not save subjects right now. Please try again.');
    } finally {
      this.isSavingSubjects = false;
    }
  }

  ngOnDestroy() {
    this.unsubscribeAuth?.();
  }

  private createInitialSubjectRows(): SubjectMarkEntry[] {
    return Array.from({ length: this.minimumSubjects }, () => ({ subject: '', mark: null }));
  }

  private toApsPoints(mark: number): number {
    if (mark >= 80) {
      return 7;
    }

    if (mark >= 70) {
      return 6;
    }

    if (mark >= 60) {
      return 5;
    }

    if (mark >= 50) {
      return 4;
    }

    if (mark >= 40) {
      return 3;
    }

    if (mark >= 30) {
      return 2;
    }

    return 1;
  }

  private parseSavedSubject(value: string): SubjectMarkEntry | null {
    const match = value.match(/^(.*)\s-\s(\d{1,3})$/);
    if (!match) {
      return null;
    }

    const subject = match[1].trim();
    const mark = Number(match[2]);
    if (!this.highSchoolSubjectOptions.includes(subject)) {
      return null;
    }

    if (!Number.isFinite(mark) || mark < 0 || mark > 100) {
      return null;
    }

    return {
      subject,
      mark
    };
  }

  private async loadSavedSubjects(uid: string) {
    try {
      const userData = await this.authService.getUser(uid) as {
        subjects?: string[];
        studyAreas?: string[];
      };

      if (Array.isArray(userData.studyAreas) && userData.studyAreas.length > 0) {
        this.selectedInterests = userData.studyAreas;
      }

      if (!Array.isArray(userData.subjects) || userData.subjects.length === 0) {
        this.subjectEntries = this.createInitialSubjectRows();
        return;
      }

      const parsedSubjects = userData.subjects
        .map((subject) => this.parseSavedSubject(subject))
        .filter((subject): subject is SubjectMarkEntry => subject !== null);

      if (parsedSubjects.length === 0) {
        this.subjectEntries = this.createInitialSubjectRows();
        return;
      }

      const paddedSubjects = [...parsedSubjects];
      while (paddedSubjects.length < this.minimumSubjects) {
        paddedSubjects.push({ subject: '', mark: null });
      }

      this.subjectEntries = paddedSubjects;
    } catch {
      this.subjectEntries = this.createInitialSubjectRows();
    }
  }

  private async applyUserProfile(user: User | null) {
    if (!user) {
      this.userUid = '';
      this.isGoogleUser = false;
      this.profile = {
        firstName: 'User',
        lastName: '',
        email: '',
        phone: ''
      };
      this.subjectEntries = this.createInitialSubjectRows();
      return;
    }

    this.userUid = user.uid;

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

    await this.loadSavedSubjects(user.uid);
  }

  private getCompletedSubjectEntries(): SubjectMarkEntry[] {
    return this.subjectEntries.filter((entry) =>
      entry.subject.trim() !== '' && entry.mark !== null && entry.mark >= 0 && entry.mark <= 100
    );
  }

  private buildUpdatedUserPayload(): [string, boolean, number, string[], string[]] {
    const completedEntries = this.getCompletedSubjectEntries();
    const serializedSubjects = completedEntries.map((entry) => `${entry.subject} - ${entry.mark}`);
    const apsScore = completedEntries
      .map((entry) => this.toApsPoints(entry.mark as number))
      .reduce((total, points) => total + points, 0);

    return [
      '',
      false,
      apsScore,
      serializedSubjects,
      this.selectedInterests
    ];
  }

  private async saveViaUpdateUser(successMessage: string) {
    if (!this.userUid) {
      await this.authService.presentToast('Please sign in to save changes.');
      return;
    }

    this.isSavingProfile = true;

    try {
      await this.authService.updateUser(this.userUid, this.buildUpdatedUserPayload());
      await this.authService.presentToast(successMessage);
    } catch {
      await this.authService.presentToast('Could not save right now. Please try again.');
    } finally {
      this.isSavingProfile = false;
    }
  }
}
