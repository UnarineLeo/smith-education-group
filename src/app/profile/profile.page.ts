import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonChip } from '@ionic/angular/standalone';
import { EmailAuthProvider, deleteUser, getAuth, onAuthStateChanged, reauthenticateWithCredential, reload, sendEmailVerification, updatePassword, User } from 'firebase/auth';
import { AuthService } from '../services/auth.service';
import { environment } from 'src/environments/environment';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { SupabaseStorageService } from '../services/supabase-storage.service';
import { ApsCalculationResult, ApsCalculationService, ApsSubjectInput } from '../services/aps-calculation.service';
import { UNIVERSITY_OPTIONS } from '../shared/app-data';

type ProfileTab = 'personal' | 'password' | 'highSchoolSubjects' | 'documents' | 'account';

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
  currentLevel: string;
  schoolProvince: string;
  matricYear: string;
  hasWrittenNbt: string;
  interest: string;
  apsUniversityName: string;
  courseChoice1: string;
  courseChoice2: string;
  courseChoice3: string;
  courseChoice4: string;
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

interface ApsCategoryGroup {
  key: string;
  label: string;
  description: string;
  results: ApsCalculationResult[];
}

@Component({
  selector: 'app-profile',
  templateUrl: 'profile.page.html',
  styleUrls: ['profile.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonChip],
})
export class ProfilePage implements OnDestroy, AfterViewInit {
  @ViewChild('streetAddressInput') streetAddressInput?: ElementRef<HTMLInputElement>;

  activeTab: ProfileTab = 'personal';
  isGoogleUser = false;
  minimumSubjects = 7;
  isSavingProfile = false;
  isSavingSubjects = false;
  isSavingAcademicInfo = false;
  isUploadingDocuments = false;
  isFinalizingDocumentUpload = false;
  isUpdatingPassword = false;
  isDeletingAccount = false;
  isEmailVerified = false;
  isSendingVerificationEmail = false;
  isCheckingVerificationStatus = false;
  userUid = '';

  private readonly requiredProfileFieldLabels: Record<keyof typeof this.profile, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    phone: 'Cellphone Number',
    saIdNumber: 'SA ID Number',
    streetAddress: 'Street Address',
    cityTown: 'City/Town',
    provinceAddress: 'Province',
    postalCode: 'Postal Code',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    nationality: 'Nationality',
    race: 'Race',
    disabilityStatus: 'Disability Status'
  };

  private readonly mandatoryProfileFields: Array<keyof typeof this.profile> = [
    'phone',
    'saIdNumber',
    'streetAddress',
    'cityTown',
    'provinceAddress',
    'postalCode',
    'dateOfBirth',
    'gender',
    'nationality',
    'race',
    'disabilityStatus'
  ];

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
    currentLevel: '',
    schoolProvince: '',
    matricYear: '',
    hasWrittenNbt: '',
    interest: '',
    apsUniversityName: '',
    courseChoice1: '',
    courseChoice2: '',
    courseChoice3: '',
    courseChoice4: ''
  };

  private readonly apsUniversities = UNIVERSITY_OPTIONS.map((university) => university.value);

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

  allUniversityApsResults: ApsCalculationResult[] = [];

  highSchoolSubjectOptions = [
    'Accounting',
    'Afrikaans',
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
    'English',
    'Geography',
    'History',
    'Hospitality Studies',
    'Information Technology',
    'isiNdebele',
    'isiXhosa',
    'isiZulu',
    'Life Orientation',
    'Life Sciences',
    'Mathematical Literacy',
    'Mathematics',
    'Mechanical Technology',
    'Music',
    'Physical Sciences',
    'Religion Studies',
    'Sepedi',
    'Sesotho',
    'Setswana',
    'siSwati',
    'Tourism',
    'Tshivenda',
    'Xitsonga',
    'Visual Arts'
  ];

  subjectEntries: SubjectMarkEntry[] = this.createInitialSubjectRows();

  constructor(
    private authService: AuthService,
    private supabaseStorageService: SupabaseStorageService,
    private apsCalculationService: ApsCalculationService
  ) {
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
    const inputValue = (event.target as HTMLInputElement).value;
    const value = field === 'saIdNumber'
      ? inputValue.replace(/\D/g, '').slice(0, 13)
      : inputValue;

    if (field === 'saIdNumber') {
      (event.target as HTMLInputElement).value = value;
    }

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

    const missingMandatoryFields = this.getMissingMandatoryProfileFields();
    if (missingMandatoryFields.length > 0) {
      await this.authService.presentToast(`Please fill in all mandatory fields: ${missingMandatoryFields.join(', ')}.`);
      return;
    }

    if (!this.hasValidSaIdNumber()) {
      await this.authService.presentToast('SA ID Number or Passport Number must be between 10 and 13 digits.');
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

  canSaveProfile(): boolean {
    return this.getMissingMandatoryProfileFields().length === 0 && this.hasValidSaIdNumber();
  }

  canSaveAcademicInformation(): boolean {
    return this.hasRequiredAcademicInformation();
  }

  async saveAcademicInformation() {
    if (!this.userUid) {
      await this.authService.presentToast('Please sign in to save your academic information.');
      return;
    }

    if (!this.hasRequiredAcademicInformation()) {
      await this.authService.presentToast('Please complete Current/Last School, Current Level, School Province, Matric Year, NBT, Interest, and course choices 1 to 3.');
      return;
    }

    this.isSavingAcademicInfo = true;

    try {
      await setDoc(doc(this.authService.db, 'users', this.userUid), {
        currentOrLastSchool: this.academicInformation.currentOrLastSchool,
        currentLevel: this.academicInformation.currentLevel,
        schoolProvince: this.academicInformation.schoolProvince,
        matricYear: this.academicInformation.matricYear,
        hasWrittenNbt: this.academicInformation.hasWrittenNbt,
        studyAreas: [this.academicInformation.interest],
        apsUniversityName: this.academicInformation.apsUniversityName,
        courseChoices: [
          this.academicInformation.courseChoice1,
          this.academicInformation.courseChoice2,
          this.academicInformation.courseChoice3,
          this.academicInformation.courseChoice4
        ]
      }, { merge: true });

      await this.authService.presentToast('School background saved successfully.');
    } catch {
      await this.authService.presentToast('Could not save academic information right now. Please try again.');
    } finally {
      this.isSavingAcademicInfo = false;
    }
  }

  async saveInterests() {
    if (!this.userUid) {
      await this.authService.presentToast('Please sign in to save changes.');
      return;
    }

    this.isSavingProfile = true;

    try {
      await setDoc(doc(this.authService.db, 'users', this.userUid), {
        studyAreas: this.selectedInterests
      }, { merge: true });
      await this.authService.presentToast('Interests saved successfully.');
    } catch {
      await this.authService.presentToast('Could not save right now. Please try again.');
    } finally {
      this.isSavingProfile = false;
    }
  }

  shouldShowEmailVerificationBanner(): boolean {
    return !this.isGoogleUser && this.userUid !== '' && !this.isEmailVerified;
  }

  async resendVerificationEmail() {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      await this.authService.presentToast('Please sign in to resend the verification email.');
      return;
    }

    if (currentUser.emailVerified) {
      this.isEmailVerified = true;
      await this.authService.presentToast('Your email is already verified.');
      return;
    }

    this.isSendingVerificationEmail = true;

    try {
      await sendEmailVerification(currentUser);
      await this.authService.presentToast('Verification email sent. Check your inbox and spam folder.');
    } catch {
      await this.authService.presentToast('Could not send verification email right now. Please try again.');
    } finally {
      this.isSendingVerificationEmail = false;
    }
  }

  async refreshEmailVerificationStatus() {
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      await this.authService.presentToast('Please sign in to check verification status.');
      return;
    }

    this.isCheckingVerificationStatus = true;

    try {
      await reload(currentUser);
      this.isEmailVerified = currentUser.emailVerified;

      if (this.userUid) {
        await setDoc(doc(this.authService.db, 'users', this.userUid), {
          emailVerified: this.isEmailVerified
        }, { merge: true });
      }

      if (this.isEmailVerified) {
        await this.authService.presentToast('Email verified successfully.');
      } else {
        await this.authService.presentToast('Email not verified yet. Please verify from your inbox and try again.');
      }
    } catch {
      await this.authService.presentToast('Could not refresh verification status right now. Please try again.');
    } finally {
      this.isCheckingVerificationStatus = false;
    }
  }

  async logoutFromAccountSettings() {
    await this.authService.logOut({
      toastMessage: 'Account logged out successfully.',
      redirectTo: '/tabs/home'
    });
  }

  async deleteAccountFromAccountSettings() {
    if (this.isDeletingAccount) {
      return;
    }

    const currentUser = getAuth().currentUser;
    if (!currentUser || !this.userUid) {
      await this.authService.presentToast('Please sign in again to delete your account.');
      return;
    }

    const hasConfirmedDeletion = window.confirm('Delete your account permanently? This action cannot be undone.');
    if (!hasConfirmedDeletion) {
      return;
    }

    this.isDeletingAccount = true;

    try {
      await deleteDoc(doc(this.authService.db, 'users', this.userUid));
      await deleteUser(currentUser);
      await this.authService.logOut({
        toastMessage: 'Account deleted successfully.',
        redirectTo: '/tabs/home'
      });
    } catch (error: any) {
      const code = error?.code as string | undefined;

      if (code === 'auth/requires-recent-login' || code === 'auth/user-token-expired') {
        await this.authService.presentToast('Please sign in again, then try deleting your account.');
      } else if (code === 'auth/network-request-failed') {
        await this.authService.presentToast('Network issue while deleting account. Please try again.');
      } else {
        await this.authService.presentToast('Could not delete account right now. Please try again.');
      }
    } finally {
      this.isDeletingAccount = false;
    }
  }

  onPasswordInputChange(field: keyof PasswordForm, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.passwordForm = {
      ...this.passwordForm,
      [field]: value
    };
  }

  get passwordPolicyStatus() {
    const password = this.passwordForm.newPassword;

    return {
      minLength: password.length >= 6,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasSpecialCharacter: /[^A-Za-z0-9]/.test(password)
    };
  }

  isNewPasswordPolicyCompliant(): boolean {
    const policy = this.passwordPolicyStatus;
    return policy.minLength && policy.hasUppercase && policy.hasLowercase && policy.hasSpecialCharacter;
  }

  canUpdatePassword(): boolean {
    const currentPassword = this.passwordForm.currentPassword.trim();
    const newPassword = this.passwordForm.newPassword.trim();
    const confirmNewPassword = this.passwordForm.confirmNewPassword.trim();

    return currentPassword !== ''
      && newPassword !== ''
      && confirmNewPassword !== ''
      && this.isNewPasswordPolicyCompliant()
      && newPassword === confirmNewPassword
      && currentPassword !== newPassword;
  }

  async updatePasswordFromForm() {
    const currentPassword = this.passwordForm.currentPassword.trim();
    const newPassword = this.passwordForm.newPassword.trim();
    const confirmNewPassword = this.passwordForm.confirmNewPassword.trim();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      await this.authService.presentToast('Please complete all password fields.');
      return;
    }

    if (!this.isNewPasswordPolicyCompliant()) {
      await this.authService.presentToast('Password must be at least 6 characters and include uppercase, lowercase, and a special character.');
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

    this.refreshApsResultsFromCurrentEntries();
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
        ? parsedMark
        : null;

      return {
        ...entry,
        mark: sanitizedMark
      };
    });

    this.refreshApsResultsFromCurrentEntries();
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

    if (!this.hasRequiredAcademicInformation()) {
      await this.authService.presentToast('Please complete Current/Last School, Current Level, School Province, Matric Year, and NBT before saving.');
      return;
    }

    const hasInvalidMark = this.subjectEntries.some((entry) => entry.mark !== null && (entry.mark < 0 || entry.mark > 100));
    if (hasInvalidMark) {
      await this.authService.presentToast('Each mark must be between 0 and 100.');
      return;
    }

    const completedEntries: ApsSubjectInput[] = this.subjectEntries
      .map((entry) => ({
        subject: entry.subject.trim(),
        mark: entry.mark
      }))
      .filter((entry): entry is { subject: string; mark: number } =>
        entry.subject !== ''
        && this.highSchoolSubjectOptions.includes(entry.subject)
        && entry.mark !== null
        && entry.mark >= 0
        && entry.mark <= 100
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
      const apsResults = this.calculateAllUniversityApsResults(completedEntries);
      if (!apsResults.length) {
        throw new Error('APS calculation failed.');
      }

      const primaryApsScore = this.resolvePrimaryApsScore(apsResults);

      await setDoc(doc(this.authService.db, 'users', this.userUid), {
        currentOrLastSchool: this.academicInformation.currentOrLastSchool,
        currentLevel: this.academicInformation.currentLevel,
        schoolProvince: this.academicInformation.schoolProvince,
        matricYear: this.academicInformation.matricYear,
        hasWrittenNbt: this.academicInformation.hasWrittenNbt,
        studyAreas: [this.academicInformation.interest],
        apsUniversityName: this.academicInformation.apsUniversityName,
        courseChoices: [
          this.academicInformation.courseChoice1,
          this.academicInformation.courseChoice2,
          this.academicInformation.courseChoice3,
          this.academicInformation.courseChoice4
        ],
        highSchoolSubjects: completedEntries,
        apsScore: primaryApsScore,
        apsRule: 'multi-university-auto',
        apsScoresByUniversity: apsResults.map((result) => ({
          universityName: result.universityName,
          score: result.score,
          maxScore: result.maxScore,
          rule: result.rule
        }))
      }, { merge: true });

      // Rehydrate from persisted payload so selects keep saved default values.
      this.subjectEntries = this.buildSubjectEntriesFromSavedData(completedEntries);
      this.allUniversityApsResults = apsResults;

      await this.authService.presentToast('Academic information saved successfully.');
    } catch {
      await this.authService.presentToast('Could not save subjects right now. Please try again.');
    } finally {
      this.isSavingSubjects = false;
    }
  }

  canSaveHighSchoolSubjects(): boolean {
    if (!this.hasRequiredAcademicInformation()) {
      return false;
    }

    const hasInvalidMark = this.subjectEntries.some((entry) => entry.mark !== null && (entry.mark < 0 || entry.mark > 100));
    if (hasInvalidMark) {
      return false;
    }

    const completedEntries = this.subjectEntries.filter((entry) =>
      entry.subject.trim() !== '' && entry.mark !== null && entry.mark >= 0 && entry.mark <= 100
    );

    return completedEntries.length >= this.minimumSubjects;
  }

  canUploadRequiredDocuments(): boolean {
    return Boolean(this.selectedDocumentFiles[this.requiredDocumentKey] || this.uploadedDocumentUrls[this.requiredDocumentKey]);
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

  async refreshUploadedDocumentUrls() {
    const documentEntries = Object.entries(this.uploadedDocumentUrls) as Array<[RequiredDocumentKey, string]>;

    if (!documentEntries.length) {
      return;
    }

    const resolvedEntries = await Promise.allSettled(
      documentEntries.map(async ([key, storedValue]) => [key, await this.supabaseStorageService.createSignedDocumentUrl(storedValue)] as const)
    );

    const nextDocumentUrls: Partial<Record<RequiredDocumentKey, string>> = {};

    resolvedEntries.forEach((result: PromiseSettledResult<readonly [RequiredDocumentKey, string]>, index: number) => {
      const [key, storedValue] = documentEntries[index];

      if (result.status === 'fulfilled') {
        nextDocumentUrls[key] = result.value[1];
        return;
      }

      // Keep stored path/URL when signed URL generation fails so upload flow does not get stuck.
      console.warn(`Could not refresh signed URL for ${key}:`, result.reason);
      nextDocumentUrls[key] = storedValue;
    });

    this.uploadedDocumentUrls = nextDocumentUrls;
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
    this.isFinalizingDocumentUpload = false;

    try {
      if (!this.supabaseStorageService.isConfigured()) {
        await this.authService.presentToast('Supabase is not configured yet. Add supabaseUrl and supabaseAnonKey in environment files.');
        return;
      }

      const nextDocumentUrls: Partial<Record<RequiredDocumentKey, string>> = { ...this.uploadedDocumentUrls };
      const nextDocumentNames: Partial<Record<RequiredDocumentKey, string>> = { ...this.uploadedDocumentNames };

      for (const requirement of this.requiredDocuments) {
        const file = this.selectedDocumentFiles[requirement.key];
        if (!file) {
          continue;
        }

        const { path } = await this.supabaseStorageService.uploadUserDocument(this.userUid, requirement.key, file);

        nextDocumentUrls[requirement.key] = path;
        nextDocumentNames[requirement.key] = file.name;
      }

      this.isFinalizingDocumentUpload = true;

      await setDoc(doc(this.authService.db, 'users', this.userUid), {
        documents: nextDocumentUrls,
        documentFileNames: nextDocumentNames
      }, { merge: true });

      this.uploadedDocumentUrls = nextDocumentUrls;
      this.uploadedDocumentNames = nextDocumentNames;

      try {
        await this.refreshUploadedDocumentUrls();
      } catch (error) {
        console.warn('Documents uploaded, but signed URL refresh failed:', error);
      }

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
      this.isFinalizingDocumentUpload = false;
      this.isUploadingDocuments = false;
    }
  }

  async debugSupabaseConnection() {
    try {
      console.log('Supabase config:', {
        url: environment.supabaseUrl,
        bucket: environment.supabaseStorageBucket
      });

      const buckets = await this.supabaseStorageService.getExistingBuckets();
      console.log('Supabase buckets from debug action:', buckets);

      await this.authService.presentToast('Supabase connection check complete. See the console for details.');
    } catch (error) {
      console.error('Supabase connection check failed:', error);
      await this.authService.presentToast('Supabase connection check failed. See the console for details.');
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

  private buildSubjectEntriesFromSavedData(entries: SubjectMarkEntry[]): SubjectMarkEntry[] {
    if (!entries.length) {
      return this.createInitialSubjectRows();
    }

    const normalizedEntries = entries
      .map((entry) => this.parseHighSchoolSubjectEntry(entry))
      .filter((entry): entry is SubjectMarkEntry => entry !== null);

    if (!normalizedEntries.length) {
      return this.createInitialSubjectRows();
    }

    const paddedSubjects = [...normalizedEntries];
    while (paddedSubjects.length < this.minimumSubjects) {
      paddedSubjects.push({ subject: '', mark: null });
    }

    return paddedSubjects;
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
        highSchoolSubjects?: SubjectMarkEntry[];
        apsScore?: number;
        apsRule?: string;
        apsUniversityName?: string;
        studyAreas?: string[];
        courseChoices?: string[];
        academicInformation?: Partial<AcademicInformation>;
        currentOrLastSchool?: string;
        currentLevel?: string;
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
          currentLevel: userData.academicInformation.currentLevel ?? '',
          schoolProvince: userData.academicInformation.schoolProvince ?? '',
          matricYear: userData.academicInformation.matricYear ?? '',
          hasWrittenNbt: userData.academicInformation.hasWrittenNbt ?? '',
          interest: userData.academicInformation.interest ?? '',
          apsUniversityName: userData.academicInformation.apsUniversityName ?? '',
          courseChoice1: userData.academicInformation.courseChoice1 ?? '',
          courseChoice2: userData.academicInformation.courseChoice2 ?? '',
          courseChoice3: userData.academicInformation.courseChoice3 ?? '',
          courseChoice4: userData.academicInformation.courseChoice4 ?? ''
        };
      } else {
        this.academicInformation = {
          currentOrLastSchool: userData.currentOrLastSchool ?? '',
          currentLevel: userData.currentLevel ?? '',
          schoolProvince: userData.schoolProvince ?? '',
          matricYear: userData.matricYear ?? '',
          hasWrittenNbt: userData.hasWrittenNbt ?? '',
          interest: Array.isArray(userData.studyAreas) ? (userData.studyAreas[0] ?? '') : '',
          apsUniversityName: userData.apsUniversityName ?? '',
          courseChoice1: Array.isArray(userData.courseChoices) ? (userData.courseChoices[0] ?? '') : '',
          courseChoice2: Array.isArray(userData.courseChoices) ? (userData.courseChoices[1] ?? '') : '',
          courseChoice3: Array.isArray(userData.courseChoices) ? (userData.courseChoices[2] ?? '') : '',
          courseChoice4: Array.isArray(userData.courseChoices) ? (userData.courseChoices[3] ?? '') : ''
        };
      }

      if (Array.isArray(userData.studyAreas) && userData.studyAreas.length > 0) {
        this.selectedInterests = userData.studyAreas;
      }

      if (userData.documents && typeof userData.documents === 'object') {
        this.uploadedDocumentUrls = { ...userData.documents };
        await this.refreshUploadedDocumentUrls();
      }

      if (userData.documentFileNames && typeof userData.documentFileNames === 'object') {
        this.uploadedDocumentNames = { ...userData.documentFileNames };
      }

      const savedHighSchoolSubjects: SubjectMarkEntry[] = Array.isArray(userData.highSchoolSubjects)
        ? userData.highSchoolSubjects.reduce<SubjectMarkEntry[]>((accumulator, entry) => {
            const parsedEntry = this.parseHighSchoolSubjectEntry(entry);
            if (parsedEntry) {
              accumulator.push(parsedEntry);
            }
            return accumulator;
          }, [])
        : [];

      this.subjectEntries = this.buildSubjectEntriesFromSavedData(savedHighSchoolSubjects);
      this.refreshApsResultsFromCurrentEntries();
    } catch {
      this.subjectEntries = this.createInitialSubjectRows();
      this.allUniversityApsResults = [];
    }
  }

  private async applyUserProfile(user: User | null) {
    if (!user) {
      this.userUid = '';
      this.isGoogleUser = false;
      this.isEmailVerified = false;
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
        currentLevel: '',
        schoolProvince: '',
        matricYear: '',
        hasWrittenNbt: '',
        interest: '',
        apsUniversityName: '',
        courseChoice1: '',
        courseChoice2: '',
        courseChoice3: '',
        courseChoice4: ''
      };
      this.passwordForm = {
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      };
      this.subjectEntries = this.createInitialSubjectRows();
      this.allUniversityApsResults = [];
      return;
    }

    this.userUid = user.uid;

    this.isGoogleUser = user.providerData.some((provider) => provider.providerId === 'google.com');
  this.isEmailVerified = user.emailVerified ?? false;

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
      currentLevel: '',
      schoolProvince: '',
      matricYear: '',
      hasWrittenNbt: '',
      interest: '',
      apsUniversityName: '',
      courseChoice1: '',
      courseChoice2: '',
      courseChoice3: '',
      courseChoice4: ''
    };
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    };

    if (this.isGoogleUser && this.activeTab === 'password') {
      this.activeTab = 'personal';
    }

    this.allUniversityApsResults = [];

    await this.loadSavedSubjects(user.uid);
  }

  get hasAutomaticApsResults(): boolean {
    return this.allUniversityApsResults.length > 0;
  }

  get groupedAutomaticApsResults(): ApsCategoryGroup[] {
    const grouped = this.allUniversityApsResults.reduce<Record<string, ApsCalculationResult[]>>((accumulator, result) => {
      if (!accumulator[result.rule]) {
        accumulator[result.rule] = [];
      }

      accumulator[result.rule].push(result);
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .map(([rule, results]) => {
        const meta = this.getApsCategoryMeta(rule);
        return {
          key: rule,
          label: meta.label,
          description: meta.description,
          results: [...results].sort((a, b) => a.universityName.localeCompare(b.universityName))
        };
      })
      .sort((a, b) => {
        if (b.results.length !== a.results.length) {
          return b.results.length - a.results.length;
        }

        return a.label.localeCompare(b.label);
      });
  }

  formatApsScore(result: ApsCalculationResult): string {
    if (result.score === null || !Number.isFinite(result.score)) {
      return 'N/A';
    }

    const score = Number.isInteger(result.score)
      ? result.score.toString()
      : result.score.toFixed(2).replace(/\.00$/, '');

    return result.maxScore ? `${score}/${result.maxScore}` : score;
  }

  formatCategoryApsScore(group: ApsCategoryGroup): string {
    const uniqueScores = Array.from(new Set(group.results.map((result) => this.formatApsScore(result))));

    if (!uniqueScores.length) {
      return 'N/A';
    }

    return uniqueScores.length === 1
      ? uniqueScores[0]
      : 'Varies by university';
  }

  get completedSubjectCountForAps(): number {
    return this.toCompletedApsInputs(this.subjectEntries).length;
  }

  get remainingSubjectsForApsCalculation(): number {
    return Math.max(0, this.minimumSubjects - this.completedSubjectCountForAps);
  }

  private refreshApsResultsFromCurrentEntries() {
    const completedEntries = this.toCompletedApsInputs(this.subjectEntries);
    this.allUniversityApsResults = this.calculateAllUniversityApsResults(completedEntries);
  }

  private toCompletedApsInputs(entries: SubjectMarkEntry[]): ApsSubjectInput[] {
    return entries
      .map((entry) => ({
        subject: entry.subject.trim(),
        mark: entry.mark
      }))
      .filter((entry): entry is ApsSubjectInput => entry.subject !== '' && entry.mark !== null && entry.mark >= 0 && entry.mark <= 100)
      .map((entry) => ({
        subject: entry.subject,
        mark: entry.mark as number
      }));
  }

  private calculateAllUniversityApsResults(entries: ApsSubjectInput[]): ApsCalculationResult[] {
    if (entries.length < this.minimumSubjects) {
      return [];
    }

    const uniqueSubjects = new Set(entries.map((entry) => entry.subject.trim().toLowerCase()));
    if (uniqueSubjects.size < this.minimumSubjects) {
      return [];
    }

    return this.apsUniversities
      .map((universityName) => this.apsCalculationService.calculateForUniversity(universityName, entries))
      .sort((a, b) => a.universityName.localeCompare(b.universityName));
  }

  private resolvePrimaryApsScore(results: ApsCalculationResult[]): number {
    const numericScores = results
      .map((result) => result.score)
      .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));

    if (!numericScores.length) {
      return 0;
    }

    return Math.max(...numericScores);
  }

  private getApsCategoryMeta(rule: string): { label: string; description: string } {
    switch (rule) {
      case 'best-six-excluding-lo':
        return {
          label: 'Best 6 Excluding Life Orientation (NSC 7-point)',
          description: 'Uses NSC levels for the top 6 subjects, excluding Life Orientation.'
        };
      case 'best-six-including-lo':
        return {
          label: 'Best 6 Including Life Orientation (NSC 7-point)',
          description: 'Uses NSC levels for the top 6 subjects, and Life Orientation can contribute.'
        };
      case 'best-six-eight-level-excluding-lo':
        return {
          label: 'Best 6 Excluding Life Orientation (8-level)',
          description: 'Uses an 8-level conversion for the top 6 subjects, excluding Life Orientation.'
        };
      case 'best-six-eight-level-including-lo':
        return {
          label: 'Best 6 Including Life Orientation (8-level)',
          description: 'Uses an 8-level conversion for the top 6 subjects, including Life Orientation.'
        };
      case 'best-six-eight-level-including-lo-capped':
        return {
          label: 'Best 6 Including Life Orientation (LO Capped)',
          description: 'Uses an 8-level conversion where Life Orientation is capped according to university policy.'
        };
      case 'sum-best-six-percent-excluding-lo':
        return {
          label: 'Sum of Best 6 Percentages (Out of 600)',
          description: 'Adds percentage marks for the best 6 subjects, excluding Life Orientation.'
        };
      case 'divide-by-10-best-six-percent-excluding-lo':
        return {
          label: 'Best 6 Percentages Divided by 10',
          description: 'Adds best 6 percentages excluding Life Orientation, then divides by 10.'
        };
      case 'average-best-six-percent-excluding-lo':
        return {
          label: 'Average of Best 6 Percentages',
          description: 'Calculates the average percentage across the best 6 subjects excluding Life Orientation.'
        };
      case 'ump-seven-with-half-lo':
        return {
          label: '7 Subjects with 50% Life Orientation Weight',
          description: 'Uses 7 subjects and counts Life Orientation at half value.'
        };
      case 'wits-custom':
        return {
          label: 'Wits Weighted 7-Subject Model',
          description: 'Applies additional weighting for English/Mathematics and a custom Life Orientation scale.'
        };
      case 'uwc-weighted-seven-subject':
        return {
          label: 'UWC Weighted 7-Subject Model',
          description: 'Uses weighted points for English/Mathematics and includes Life Orientation.'
        };
      default:
        return {
          label: 'APS Calculation Category',
          description: 'Universities grouped by the same APS calculation approach.'
        };
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

  private hasRequiredAcademicInformation(): boolean {
    return this.academicInformation.currentOrLastSchool.trim() !== ''
      && this.academicInformation.currentLevel.trim() !== ''
      && this.academicInformation.schoolProvince.trim() !== ''
      && this.academicInformation.matricYear.trim() !== ''
      && this.academicInformation.hasWrittenNbt.trim() !== ''
      && this.academicInformation.interest.trim() !== ''
      && this.academicInformation.courseChoice1.trim() !== ''
      && this.academicInformation.courseChoice2.trim() !== ''
      && this.academicInformation.courseChoice3.trim() !== '';
  }

  private resolveSubjectOption(subject: string): string {
    const normalizedSubject = subject.trim().toLowerCase();
    const matchedSubject = this.highSchoolSubjectOptions.find(
      (option) => option.trim().toLowerCase() === normalizedSubject
    );

    return matchedSubject ?? '';
  }

  private parseHighSchoolSubjectEntry(entry: unknown): SubjectMarkEntry | null {
    if (!entry) {
      return null;
    }

    if (typeof entry === 'string') {
      const match = entry.match(/^(.*)\s-\s(\d{1,3})$/);
      if (!match) {
        return null;
      }

      const matchedSubject = this.resolveSubjectOption(match[1]);
      const parsedMark = Number(match[2]);
      if (!matchedSubject || !Number.isFinite(parsedMark) || parsedMark < 0 || parsedMark > 100) {
        return null;
      }

      return {
        subject: matchedSubject,
        mark: parsedMark
      };
    }

    if (typeof entry === 'object') {
      const recordEntry = entry as Record<string, unknown>;
      const subjectRaw = recordEntry['subject'] ?? recordEntry['name'] ?? recordEntry['title'];
      const markRaw = recordEntry['mark'] ?? recordEntry['score'] ?? recordEntry['value'];

      if (typeof subjectRaw !== 'string') {
        return null;
      }

      const matchedSubject = this.resolveSubjectOption(subjectRaw);
      const parsedMark = typeof markRaw === 'number' ? markRaw : Number(markRaw);
      if (!matchedSubject || !Number.isFinite(parsedMark) || parsedMark < 0 || parsedMark > 100) {
        return null;
      }

      return {
        subject: matchedSubject,
        mark: parsedMark
      };
    }

    return null;
  }

  private getMissingMandatoryProfileFields(): string[] {
    return this.mandatoryProfileFields
      .filter((field) => this.profile[field].trim() === '')
      .map((field) => this.requiredProfileFieldLabels[field]);
  }

  private hasValidSaIdNumber(): boolean {
    return /^\d{13}$/.test(this.profile.saIdNumber.trim());
  }
}
