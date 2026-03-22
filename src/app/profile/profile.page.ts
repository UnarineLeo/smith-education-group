import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { EmailAuthProvider, getAuth, onAuthStateChanged, reauthenticateWithCredential, updatePassword, User } from 'firebase/auth';
import { AuthService } from '../services/auth.service';
import { environment } from 'src/environments/environment';
import { doc, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

type ProfileTab = 'personal' | 'password' | 'highSchoolSubjects' | 'documents';

type RequiredDocumentKey =
  | 'idDocument'
  | 'matricCertificate'
  | 'grade11Transcript'
  | 'grade12MidYearResults';

interface RequiredDocumentRequirement {
  key: RequiredDocumentKey;
  label: string;
  helperText: string;
  accept: string;
}

interface SubjectMarkEntry {
  subject: string;
  mark: number | null;
}

interface AcademicInformation {
  currentOrLastSchool: string;
  schoolProvince: string;
  matricYear: string;
  hasWrittenNbt: string;
}

interface StreetAddressSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class ProfilePage implements OnDestroy, AfterViewInit {
  @ViewChild('streetAddressInput') streetAddressInput?: ElementRef<HTMLInputElement>;

  activeTab: ProfileTab = 'personal';
  isGoogleUser = false;
  minimumSubjects = 7;
  isSavingProfile = false;
  isSavingSubjects = false;
  isUploadingDocuments = false;
  isUpdatingPassword = false;
  userUid = '';

  profile = {
    firstName: 'User',
    lastName: '',
    email: '',
    phone: '',
    saIdNumber: '',
    streetAddress: '',
    cityTown: '',
    provinceAddress: '',
    postalCode: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    race: '',
    disabilityStatus: ''
  };

  private streetAddressAutocompleteInput?: HTMLInputElement;
  private streetAddressAutocompleteService?: any;
  private streetAddressPlacesService?: any;
  private streetAddressSessionToken?: any;
  private streetAddressSuggestDebounce?: number;
  private latestStreetAddressQuery = '';
  private hasShownAddressAutocompleteUnavailableToast = false;
  private readonly allowedDocumentMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  private readonly allowedDocumentExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png']);

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

  streetAddressSuggestions: StreetAddressSuggestion[] = [];
  showStreetAddressSuggestions = false;

  passwordForm: PasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };

  academicInformation: AcademicInformation = {
    currentOrLastSchool: '',
    schoolProvince: '',
    matricYear: '',
    hasWrittenNbt: ''
  };

  requiredDocuments: RequiredDocumentRequirement[] = [
    {
      key: 'idDocument',
      label: 'ID Document',
      helperText: 'Upload a clear scan or photo of your South African ID.',
      accept: '.pdf,.jpg,.jpeg,.png'
    },
    {
      key: 'matricCertificate',
      label: 'Matric Certificate',
      helperText: 'Upload your official Grade 12 certificate.',
      accept: '.pdf,.jpg,.jpeg,.png'
    },
    {
      key: 'grade11Transcript',
      label: 'Grade 11 Transcript',
      helperText: 'Upload your final Grade 11 report/transcript.',
      accept: '.pdf,.jpg,.jpeg,.png'
    },
    {
      key: 'grade12MidYearResults',
      label: 'Grade 12 Mid-Year Results',
      helperText: 'Upload your latest Grade 12 mid-year results.',
      accept: '.pdf,.jpg,.jpeg,.png'
    }
  ];

  selectedDocumentFiles: Record<RequiredDocumentKey, File | null> = {
    idDocument: null,
    matricCertificate: null,
    grade11Transcript: null,
    grade12MidYearResults: null
  };

  uploadedDocumentUrls: Partial<Record<RequiredDocumentKey, string>> = {};
  uploadedDocumentNames: Partial<Record<RequiredDocumentKey, string>> = {};
  readonly requiredDocumentKey: RequiredDocumentKey = 'idDocument';

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

    if (tab === 'personal') {
      void this.initializeStreetAddressAutocomplete();
    }
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

  openDatePicker(event: Event) {
    const input = event.target as HTMLInputElement & { showPicker?: () => void };
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
  }

  async copyProfileField(field: keyof typeof this.profile, label: string) {
    const value = this.profile[field]?.trim();

    if (!value) {
      await this.authService.presentToast(`${label} is empty.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      await this.authService.presentToast(`${label} copied.`);
    } catch {
      await this.authService.presentToast(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  async saveProfileChanges() {
    if (!this.userUid) {
      await this.authService.presentToast('Please sign in to save changes.');
      return;
    }

    this.isSavingProfile = true;

    try {
      await setDoc(doc(this.authService.db, 'users', this.userUid), {
        firstName: this.profile.firstName,
        lastName: this.profile.lastName,
        email: this.profile.email,
        phone: this.profile.phone,
        saIdNumber: this.profile.saIdNumber,
        streetAddress: this.profile.streetAddress,
        cityTown: this.profile.cityTown,
        provinceAddress: this.profile.provinceAddress,
        postalCode: this.profile.postalCode,
        dateOfBirth: this.profile.dateOfBirth,
        gender: this.profile.gender,
        nationality: this.profile.nationality,
        race: this.profile.race,
        disabilityStatus: this.profile.disabilityStatus
      }, { merge: true });

      await this.authService.presentToast('Profile changes saved successfully.');
    } catch {
      await this.authService.presentToast('Could not save right now. Please try again.');
    } finally {
      this.isSavingProfile = false;
    }
  }

  async saveInterests() {
    await this.saveViaUpdateUser('Interests saved successfully.');
  }

  onPasswordInputChange(field: keyof PasswordForm, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.passwordForm = {
      ...this.passwordForm,
      [field]: value
    };
  }

  async updatePasswordFromForm() {
    const currentPassword = this.passwordForm.currentPassword.trim();
    const newPassword = this.passwordForm.newPassword.trim();
    const confirmNewPassword = this.passwordForm.confirmNewPassword.trim();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      await this.authService.presentToast('Please complete all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      await this.authService.presentToast('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      await this.authService.presentToast('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      await this.authService.presentToast('New password must be different from current password.');
      return;
    }

    const user = getAuth().currentUser;
    if (!user || !user.email) {
      await this.authService.presentToast('Please sign in again to update your password.');
      return;
    }

    this.isUpdatingPassword = true;

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      };

      await this.authService.presentToast('Password updated successfully.');
    } catch (error: any) {
      const code = error?.code as string | undefined;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        await this.authService.presentToast('Current password is incorrect.');
      } else if (code === 'auth/weak-password') {
        await this.authService.presentToast('Please choose a stronger new password.');
      } else if (code === 'auth/too-many-requests') {
        await this.authService.presentToast('Too many attempts. Please try again later.');
      } else if (code === 'auth/requires-recent-login') {
        await this.authService.presentToast('Please sign in again, then update your password.');
      } else {
        await this.authService.presentToast('Could not update password right now. Please try again.');
      }
    } finally {
      this.isUpdatingPassword = false;
    }
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

  onAcademicInformationInputChange(field: keyof AcademicInformation, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.academicInformation = {
      ...this.academicInformation,
      [field]: value
    };
  }

  onStreetAddressInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.profile = {
      ...this.profile,
      streetAddress: value
    };

    if (this.streetAddressSuggestDebounce) {
      window.clearTimeout(this.streetAddressSuggestDebounce);
    }

    const query = value.trim();
    if (!query) {
      this.streetAddressSuggestions = [];
      this.showStreetAddressSuggestions = false;
      this.latestStreetAddressQuery = '';
      return;
    }

    this.streetAddressSuggestDebounce = window.setTimeout(() => {
      void this.fetchStreetAddressSuggestions(query);
    }, 220);
  }

  onStreetAddressFocus() {
    this.showStreetAddressSuggestions = this.streetAddressSuggestions.length > 0;
  }

  onStreetAddressBlur() {
    window.setTimeout(() => {
      this.showStreetAddressSuggestions = false;
    }, 120);
  }

  async selectStreetAddressSuggestion(placeId: string) {
    const placesService = this.streetAddressPlacesService;
    if (!placesService) {
      return;
    }

    const place = await new Promise<any | null>((resolve) => {
      placesService.getDetails({
        placeId,
        fields: ['formatted_address', 'address_components'],
        sessionToken: this.streetAddressSessionToken
      }, (result: any, status: any) => {
        const googleRef = (window as any).google;
        if (status !== googleRef?.maps?.places?.PlacesServiceStatus?.OK || !result) {
          resolve(null);
          return;
        }

        resolve(result);
      });
    });

    if (!place) {
      return;
    }

    this.applyGoogleAddress(place);
    this.streetAddressSuggestions = [];
    this.showStreetAddressSuggestions = false;

    const googleRef = (window as any).google;
    if (googleRef?.maps?.places?.AutocompleteSessionToken) {
      this.streetAddressSessionToken = new googleRef.maps.places.AutocompleteSessionToken();
    }
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
      const apsScore = completedEntries
        .map((entry) => this.toApsPoints(entry.mark as number))
        .reduce((total, points) => total + points, 0);

      await setDoc(doc(this.authService.db, 'users', this.userUid), {
        currentOrLastSchool: this.academicInformation.currentOrLastSchool,
        schoolProvince: this.academicInformation.schoolProvince,
        matricYear: this.academicInformation.matricYear,
        hasWrittenNbt: this.academicInformation.hasWrittenNbt,
        highSchoolSubjects: completedEntries,
        apsScore
      }, { merge: true });

      await this.authService.presentToast('Academic information saved successfully.');
    } catch {
      await this.authService.presentToast('Could not save subjects right now. Please try again.');
    } finally {
      this.isSavingSubjects = false;
    }
  }

  onDocumentFileChange(key: RequiredDocumentKey, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.selectedDocumentFiles = {
        ...this.selectedDocumentFiles,
        [key]: null
      };
      return;
    }

    if (!this.isAllowedDocumentType(file)) {
      input.value = '';
      this.selectedDocumentFiles = {
        ...this.selectedDocumentFiles,
        [key]: null
      };
      void this.authService.presentToast('Please upload a PDF, JPG, or PNG document.');
      return;
    }

    this.selectedDocumentFiles = {
      ...this.selectedDocumentFiles,
      [key]: file
    };
  }

  getSelectedDocumentName(key: RequiredDocumentKey): string {
    const selectedName = this.selectedDocumentFiles[key]?.name;
    if (selectedName) {
      return selectedName;
    }

    return this.uploadedDocumentNames[key] ?? '';
  }

  hasUploadedDocument(key: RequiredDocumentKey): boolean {
    return Boolean(this.uploadedDocumentUrls[key]);
  }

  getUploadedDocumentUrl(key: RequiredDocumentKey): string {
    return this.uploadedDocumentUrls[key] ?? '';
  }

  async uploadRequiredDocuments() {
    if (!this.userUid) {
      await this.authService.presentToast('Please sign in to upload documents.');
      return;
    }

    const hasIdDocument = Boolean(this.selectedDocumentFiles[this.requiredDocumentKey] || this.uploadedDocumentUrls[this.requiredDocumentKey]);

    if (!hasIdDocument) {
      await this.authService.presentToast('Please upload your ID document before submitting.');
      return;
    }

    this.isUploadingDocuments = true;

    try {
      const storage = getStorage();
      const nextDocumentUrls: Partial<Record<RequiredDocumentKey, string>> = { ...this.uploadedDocumentUrls };
      const nextDocumentNames: Partial<Record<RequiredDocumentKey, string>> = { ...this.uploadedDocumentNames };

      for (const requirement of this.requiredDocuments) {
        const file = this.selectedDocumentFiles[requirement.key];
        if (!file) {
          continue;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `users/${this.userUid}/documents/${requirement.key}-${Date.now()}-${safeName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        nextDocumentUrls[requirement.key] = downloadUrl;
        nextDocumentNames[requirement.key] = file.name;
      }

      await setDoc(doc(this.authService.db, 'users', this.userUid), {
        documents: nextDocumentUrls,
        documentFileNames: nextDocumentNames
      }, { merge: true });

      this.uploadedDocumentUrls = nextDocumentUrls;
      this.uploadedDocumentNames = nextDocumentNames;
      this.selectedDocumentFiles = {
        idDocument: null,
        matricCertificate: null,
        grade11Transcript: null,
        grade12MidYearResults: null
      };

      await this.authService.presentToast('Documents uploaded successfully.');
    } catch {
      await this.authService.presentToast('Could not upload documents right now. Please try again.');
    } finally {
      this.isUploadingDocuments = false;
    }
  }

  ngOnDestroy() {
    this.unsubscribeAuth?.();
  }

  async ngAfterViewInit() {
    await this.initializeStreetAddressAutocomplete();
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
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        saIdNumber?: string;
        streetAddress?: string;
        cityTown?: string;
        provinceAddress?: string;
        postalCode?: string;
        dateOfBirth?: string;
        gender?: string;
        nationality?: string;
        race?: string;
        disabilityStatus?: string;
        subjects?: string[];
        highSchoolSubjects?: SubjectMarkEntry[];
        studyAreas?: string[];
        academicInformation?: Partial<AcademicInformation>;
        currentOrLastSchool?: string;
        schoolProvince?: string;
        matricYear?: string;
        hasWrittenNbt?: string;
        documents?: Partial<Record<RequiredDocumentKey, string>>;
        documentFileNames?: Partial<Record<RequiredDocumentKey, string>>;
      };

      this.profile = {
        ...this.profile,
        firstName: userData.firstName ?? this.profile.firstName,
        lastName: userData.lastName ?? this.profile.lastName,
        email: userData.email ?? this.profile.email,
        phone: userData.phone ?? this.profile.phone,
        saIdNumber: userData.saIdNumber ?? this.profile.saIdNumber,
        streetAddress: userData.streetAddress ?? this.profile.streetAddress,
        cityTown: userData.cityTown ?? this.profile.cityTown,
        provinceAddress: userData.provinceAddress ?? this.profile.provinceAddress,
        postalCode: userData.postalCode ?? this.profile.postalCode,
        dateOfBirth: userData.dateOfBirth ?? this.profile.dateOfBirth,
        gender: userData.gender ?? this.profile.gender,
        nationality: userData.nationality ?? this.profile.nationality,
        race: userData.race ?? this.profile.race,
        disabilityStatus: userData.disabilityStatus ?? this.profile.disabilityStatus
      };

      if (userData.academicInformation && typeof userData.academicInformation === 'object') {
        this.academicInformation = {
          currentOrLastSchool: userData.academicInformation.currentOrLastSchool ?? '',
          schoolProvince: userData.academicInformation.schoolProvince ?? '',
          matricYear: userData.academicInformation.matricYear ?? '',
          hasWrittenNbt: userData.academicInformation.hasWrittenNbt ?? ''
        };
      } else {
        this.academicInformation = {
          currentOrLastSchool: userData.currentOrLastSchool ?? '',
          schoolProvince: userData.schoolProvince ?? '',
          matricYear: userData.matricYear ?? '',
          hasWrittenNbt: userData.hasWrittenNbt ?? ''
        };
      }

      if (Array.isArray(userData.studyAreas) && userData.studyAreas.length > 0) {
        this.selectedInterests = userData.studyAreas;
      }

      if (userData.documents && typeof userData.documents === 'object') {
        this.uploadedDocumentUrls = { ...userData.documents };
      }

      if (userData.documentFileNames && typeof userData.documentFileNames === 'object') {
        this.uploadedDocumentNames = { ...userData.documentFileNames };
      }

      const savedHighSchoolSubjects = Array.isArray(userData.highSchoolSubjects)
        ? userData.highSchoolSubjects
            .filter((entry): entry is SubjectMarkEntry =>
              Boolean(entry)
              && typeof entry.subject === 'string'
              && typeof entry.mark === 'number'
              && entry.mark >= 0
              && entry.mark <= 100
            )
            .map((entry) => ({ subject: entry.subject, mark: entry.mark }))
        : [];

      const parsedSubjects = savedHighSchoolSubjects.length > 0
        ? savedHighSchoolSubjects
        : (Array.isArray(userData.subjects)
            ? userData.subjects
                .map((subject) => this.parseSavedSubject(subject))
                .filter((subject): subject is SubjectMarkEntry => subject !== null)
            : []);

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
        phone: '',
        saIdNumber: '',
        streetAddress: '',
        cityTown: '',
        provinceAddress: '',
        postalCode: '',
        dateOfBirth: '',
        gender: '',
        nationality: '',
        race: '',
        disabilityStatus: ''
      };
      this.academicInformation = {
        currentOrLastSchool: '',
        schoolProvince: '',
        matricYear: '',
        hasWrittenNbt: ''
      };
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
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
      phone: user.phoneNumber ?? '',
      saIdNumber: '',
      streetAddress: '',
      cityTown: '',
      provinceAddress: '',
      postalCode: '',
      dateOfBirth: '',
      gender: '',
      nationality: '',
      race: '',
      disabilityStatus: ''
    };
    this.academicInformation = {
      currentOrLastSchool: '',
      schoolProvince: '',
      matricYear: '',
      hasWrittenNbt: ''
    };
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
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

  private async initializeStreetAddressAutocomplete(): Promise<boolean> {
    const inputElement = this.streetAddressInput?.nativeElement;
    if (!inputElement) {
      return false;
    }

    if (this.streetAddressAutocompleteService && this.streetAddressPlacesService && this.streetAddressAutocompleteInput === inputElement) {
      return true;
    }

    const loaded = await this.loadGooglePlacesApi();
    const googleRef = (window as any).google;

    if (!loaded || !googleRef?.maps?.places) {
      if (!this.hasShownAddressAutocompleteUnavailableToast) {
        this.hasShownAddressAutocompleteUnavailableToast = true;
        await this.authService.presentToast('Address autocomplete is unavailable right now. You can still enter your address manually.');
      }
      return false;
    }

    this.streetAddressAutocompleteInput = inputElement;

    if (!this.streetAddressAutocompleteService) {
      this.streetAddressAutocompleteService = new googleRef.maps.places.AutocompleteService();
    }

    if (!this.streetAddressPlacesService) {
      this.streetAddressPlacesService = new googleRef.maps.places.PlacesService(document.createElement('div'));
    }

    if (!this.streetAddressSessionToken && googleRef.maps.places.AutocompleteSessionToken) {
      this.streetAddressSessionToken = new googleRef.maps.places.AutocompleteSessionToken();
    }

    return true;
  }

  private async fetchStreetAddressSuggestions(query: string) {
    this.latestStreetAddressQuery = query;

    const ready = await this.initializeStreetAddressAutocomplete();
    if (!ready || !this.streetAddressAutocompleteService) {
      return;
    }

    const googleRef = (window as any).google;
    if (!this.streetAddressSessionToken && googleRef?.maps?.places?.AutocompleteSessionToken) {
      this.streetAddressSessionToken = new googleRef.maps.places.AutocompleteSessionToken();
    }

    const predictions = await new Promise<any[]>((resolve) => {
      this.streetAddressAutocompleteService.getPlacePredictions({
        input: query,
        types: ['address'],
        sessionToken: this.streetAddressSessionToken
      }, (results: any[] | null, status: any) => {
        if (status !== googleRef?.maps?.places?.PlacesServiceStatus?.OK || !Array.isArray(results)) {
          resolve([]);
          return;
        }

        resolve(results);
      });
    });

    if (this.latestStreetAddressQuery !== query) {
      return;
    }

    this.streetAddressSuggestions = predictions.slice(0, 3).map((prediction: any) => ({
      placeId: prediction.place_id,
      primaryText: prediction.structured_formatting?.main_text ?? prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text ?? ''
    }));

    this.showStreetAddressSuggestions = this.streetAddressSuggestions.length > 0;
  }

  private async loadGooglePlacesApi(): Promise<boolean> {
    const googleRef = (window as any).google;
    if (googleRef?.maps?.places) {
      return true;
    }

    const existingScript = document.querySelector('script[data-google-places="true"]') as HTMLScriptElement | null;
    if (existingScript) {
      // If the script already exists, load/error events may have fired before we attached listeners.
      if ((window as any).google?.maps?.places) {
        return true;
      }

      await new Promise<void>((resolve) => {
        const handleDone = () => {
          clearTimeout(timeoutId);
          existingScript.removeEventListener('load', handleDone);
          existingScript.removeEventListener('error', handleDone);
          resolve();
        };

        const timeoutId = window.setTimeout(handleDone, 4000);
        existingScript.addEventListener('load', handleDone, { once: true });
        existingScript.addEventListener('error', handleDone, { once: true });
      });
      return Boolean((window as any).google?.maps?.places);
    }

    const apiKey = environment.googleMapsApiKey;
    if (!apiKey) {
      return false;
    }

    await new Promise<void>((resolve) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset['googlePlaces'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });

    return Boolean((window as any).google?.maps?.places);
  }

  private applyGoogleAddress(place: any) {
    const components: any[] = Array.isArray(place?.address_components) ? place.address_components : [];

    const findComponent = (...types: string[]) => {
      const component = components.find((item) =>
        Array.isArray(item?.types) && item.types.some((type: string) => types.includes(type))
      );
      return component?.long_name ?? '';
    };

    const streetNumber = findComponent('street_number');
    const route = findComponent('route');
    const locality = findComponent('locality', 'postal_town', 'sublocality', 'administrative_area_level_2');
    const province = findComponent('administrative_area_level_1');
    const postalCode = findComponent('postal_code');

    const streetAddress = `${streetNumber} ${route}`.trim() || place?.formatted_address || this.profile.streetAddress;

    this.profile = {
      ...this.profile,
      streetAddress,
      cityTown: locality || this.profile.cityTown,
      provinceAddress: province || this.profile.provinceAddress,
      postalCode: postalCode || this.profile.postalCode
    };
  }

  private isAllowedDocumentType(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return this.allowedDocumentMimeTypes.has(file.type) || this.allowedDocumentExtensions.has(extension);
  }
}
