import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
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

  private streetAddressAutocomplete?: any;
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

  onAcademicInformationInputChange(field: keyof AcademicInformation, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.academicInformation = {
      ...this.academicInformation,
      [field]: value
    };
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
      await setDoc(doc(this.authService.db, 'users', this.userUid), {
        academicInformation: this.academicInformation
      }, { merge: true });
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
        subjects?: string[];
        studyAreas?: string[];
        academicInformation?: Partial<AcademicInformation>;
        documents?: Partial<Record<RequiredDocumentKey, string>>;
        documentFileNames?: Partial<Record<RequiredDocumentKey, string>>;
      };

      if (userData.academicInformation && typeof userData.academicInformation === 'object') {
        this.academicInformation = {
          currentOrLastSchool: userData.academicInformation.currentOrLastSchool ?? '',
          schoolProvince: userData.academicInformation.schoolProvince ?? '',
          matricYear: userData.academicInformation.matricYear ?? '',
          hasWrittenNbt: userData.academicInformation.hasWrittenNbt ?? ''
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

  private async initializeStreetAddressAutocomplete() {
    if (!this.streetAddressInput?.nativeElement || this.streetAddressAutocomplete) {
      return;
    }

    const loaded = await this.loadGooglePlacesApi();
    const googleRef = (window as any).google;

    if (!loaded || !googleRef?.maps?.places) {
      if (!this.hasShownAddressAutocompleteUnavailableToast) {
        this.hasShownAddressAutocompleteUnavailableToast = true;
        await this.authService.presentToast('Address autocomplete is unavailable right now. You can still enter your address manually.');
      }
      return;
    }

    this.streetAddressAutocomplete = new googleRef.maps.places.Autocomplete(this.streetAddressInput.nativeElement, {
      types: ['address'],
      fields: ['formatted_address', 'address_components']
    });

    this.streetAddressAutocomplete.addListener('place_changed', () => {
      const place = this.streetAddressAutocomplete.getPlace();
      this.applyGoogleAddress(place);
    });
  }

  private async loadGooglePlacesApi(): Promise<boolean> {
    const googleRef = (window as any).google;
    if (googleRef?.maps?.places) {
      return true;
    }

    const existingScript = document.querySelector('script[data-google-places="true"]') as HTMLScriptElement | null;
    if (existingScript) {
      await new Promise<void>((resolve) => {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => resolve(), { once: true });
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
