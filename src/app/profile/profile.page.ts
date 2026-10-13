import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonChip } from '@ionic/angular/standalone';
import { EmailAuthProvider, deleteUser, getAuth, onAuthStateChanged, reauthenticateWithCredential, reload, sendEmailVerification, updatePassword, User } from 'firebase/auth';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { getApp, getApps } from 'firebase/app';
import { ApsCalculationResult, ApsCalculationService, ApsSubjectInput } from '../services/aps-calculation.service';
import { INTEREST_OPTIONS, UNIVERSITY_OPTIONS } from '../shared/app-data';
import { FooterComponent } from '../footer/footer.component';

type ProfileTab = 'personal' | 'nextOfKin' | 'password' | 'highSchoolSubjects' | 'documents' | 'account';

interface NextOfKin {
  firstName: string;
  lastName: string;
  initials: string;
  email: string;
  relationship: 'parent' | 'guardian' | '';
  phone: string;
}

type SavedNextOfKin = Partial<NextOfKin> & { fullName?: string };

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
  isMandatory?: boolean;
}

interface DocumentData {
  fileName: string;
  mimeType: string;
  uploadedAt: number;
  data: string; // base64-encoded file content
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
  universityChoice1: string;
  universityChoice2: string;
  universityChoice3: string;
  universityChoice4: string;
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
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonChip, FooterComponent],
})
export class ProfilePage implements OnDestroy, AfterViewInit {
  @ViewChild('streetAddressInput') streetAddressInput?: ElementRef<HTMLInputElement>;
  @ViewChild('subjectsOcrInput') subjectsOcrInput?: ElementRef<HTMLInputElement>;

  private readonly saveToastDelayMs = 5000;
  private readonly saveCountdownSeconds = 5;
  private profileSaveTimerId?: number;
  private academicSaveTimerId?: number;
  private subjectsSaveTimerId?: number;
  private documentsSaveTimerId?: number;
  private passwordSaveTimerId?: number;

  activeTab: ProfileTab = 'personal';
  isGoogleUser = false;
  isAdminUser = false;
  minimumSubjects = 7;
  isSavingProfile = false;
  isSavingNextOfKin = false;
  profileSaveCountdown = 0;
  isSavingSubjects = false;
  subjectsSaveCountdown = 0;
  isSavingAcademicInfo = false;
  academicSaveCountdown = 0;
  isRunningSubjectOcr = false;
  isUploadingDocuments = false;
  documentsSaveCountdown = 0;
  isFinalizingDocumentUpload = false;
  isUpdatingPassword = false;
  passwordSaveCountdown = 0;
  isDeletingAccount = false;
  isEmailVerified = false;
  isSendingVerificationEmail = false;
  isCheckingVerificationStatus = false;
  userEmail = '';
  subjectOcrStatus = '';
  isSaIdNumber = true;
  readonly maximumAllowedBirthDate = this.formatDateInputValue(this.getMinimumBirthDate());

  private readonly requiredProfileFieldLabels: Record<keyof typeof this.profile, string> = {
    firstName: 'First Name',
    lastName: 'Last Name',
    initials: 'Initials',
    middleName: 'Middle Name',
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
    'firstName',
    'lastName',
    'initials',
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
    initials: '',
    middleName: '',
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

  nextOfKins: NextOfKin[] = this.createEmptyNextOfKins();

  private streetAddressAutocompleteInput?: HTMLInputElement;
  private streetAddressAutocompleteService?: any;
  private streetAddressPlacesService?: any;
  private streetAddressSessionToken?: any;
  private streetAddressSuggestDebounce?: number;
  private latestStreetAddressQuery = '';
  private hasHydratedDocumentSignedUrls = false;
  private isHydratingDocumentSignedUrls = false;
  private readonly allowedDocumentMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  private readonly allowedDocumentExtensions = new Set(['pdf', 'jpg', 'jpeg', 'png']);

  private unsubscribeAuth?: () => void;

  interests = INTEREST_OPTIONS.map((interest) => interest.label);

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
    universityChoice1: '',
    universityChoice2: '',
    universityChoice3: '',
    universityChoice4: '',
    courseChoice1: '',
    courseChoice2: '',
    courseChoice3: '',
    courseChoice4: ''
  };

  readonly apsUniversities = UNIVERSITY_OPTIONS.map((university) => university.value);

  requiredDocuments: RequiredDocumentRequirement[] = [
    {
      key: 'idDocument',
      label: 'ID Document',
      helperText: 'Upload a clear scan or photo of your South African ID.',
      accept: '.pdf,.jpg,.jpeg,.png',
      isMandatory: true
    },
    {
      key: 'matricCertificate',
      label: 'Matric Certificate',
      helperText: 'Upload your official Grade 12 certificate.',
      accept: '.pdf,.jpg,.jpeg,.png',
      isMandatory: false
    },
    {
      key: 'grade11Transcript',
      label: 'Grade 11 Transcript',
      helperText: 'Upload your final Grade 11 report/transcript.',
      accept: '.pdf,.jpg,.jpeg,.png',
      isMandatory: false
    },
    {
      key: 'grade12MidYearResults',
      label: 'Grade 12 Mid-Year Results',
      helperText: 'Upload your latest Grade 12 mid-year results.',
      accept: '.pdf,.jpg,.jpeg,.png',
      isMandatory: false
    }
  ];

  selectedDocumentFiles: Record<RequiredDocumentKey, File | null> = {
    idDocument: null,
    matricCertificate: null,
    grade11Transcript: null,
    grade12MidYearResults: null
  };

  uploadedDocumentData: Partial<Record<RequiredDocumentKey, DocumentData>> = {};
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
    private apsCalculationService: ApsCalculationService,
    private router: Router
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

    if (tab === 'documents') {
      void this.hydrateDocumentSignedUrlsIfNeeded();
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
      ? (
          this.isSaIdNumber
            ? inputValue.replace(/\D/g, '').slice(0, 13)
            : inputValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20)
        )
      : inputValue;

    if (field === 'saIdNumber') {
      (event.target as HTMLInputElement).value = value;
    }

    this.profile = {
      ...this.profile,
      [field]: value
    };
  }

  onIdentityTypeChange(event: Event) {
    this.isSaIdNumber = (event.target as HTMLSelectElement).value === 'sa-id';
    const normalizedValue = this.isSaIdNumber
      ? this.profile.saIdNumber.replace(/\D/g, '').slice(0, 13)
      : this.profile.saIdNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 20);

    this.profile = {
      ...this.profile,
      saIdNumber: normalizedValue
    };
  }

  onNextOfKinInputChange(index: number, field: keyof NextOfKin, event: Event) {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    const value = field === 'phone'
      ? input.value.replace(/[^\d+\s()-]/g, '').slice(0, 20)
      : input.value;

    this.nextOfKins = this.nextOfKins.map((kin, kinIndex) =>
      kinIndex === index ? { ...kin, [field]: value } : kin
    );
  }

  canSaveNextOfKin(): boolean {
    const primaryComplete = this.isNextOfKinComplete(this.nextOfKins[0]);
    const secondary = this.nextOfKins[1];
    const secondaryEmpty = !Object.values(secondary).some((value) => value.trim() !== '');
    return primaryComplete && (secondaryEmpty || this.isNextOfKinComplete(secondary));
  }

  async saveNextOfKin() {
    const userDocId = this.getUserDocId();
    if (!userDocId) {
      await this.authService.presentToast('Please sign in to save your next of kin.');
      return;
    }

    if (!this.canSaveNextOfKin()) {
      await this.authService.presentToast('Complete all details for your primary next of kin and any second contact you add.');
      return;
    }

    this.isSavingNextOfKin = true;
    try {
      await setDoc(doc(this.authService.db, 'users', userDocId), {
        nextOfKins: this.nextOfKins.map((kin) => ({ ...kin }))
      }, { merge: true });
      await this.authService.presentToast('Next of kin details saved successfully.');
    } catch (error) {
      console.error('Could not save next of kin details.', error);
      await this.authService.presentToast('Could not save next of kin details. Please try again.');
    } finally {
      this.isSavingNextOfKin = false;
    }
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
    const userDocId = this.getUserDocId();
    if (!userDocId) {
      await this.authService.presentToast('Please sign in to save changes.');
      return;
    }

    const missingMandatoryFields = this.getMissingMandatoryProfileFields();
    if (missingMandatoryFields.length > 0) {
      await this.authService.presentToast(`Please fill in all mandatory fields: ${missingMandatoryFields.join(', ')}.`);
      return;
    }

    if (!this.hasValidIdentityNumber()) {
      await this.authService.presentToast(
        this.isSaIdNumber
          ? 'Enter a valid 13-digit SA ID number.'
          : 'Enter a valid passport number.'
      );
      return;
    }

    const identityValidationError = this.getIdentityValidationError();
    if (identityValidationError) {
      await this.authService.presentToast(identityValidationError);
      return;
    }

    void this.startTimedSave('profile', async () => {
      await setDoc(doc(this.authService.db, 'users', userDocId), {
        firstName: this.profile.firstName,
        lastName: this.profile.lastName,
        initials: this.profile.initials,
        middleName: this.profile.middleName,
        email: this.profile.email,
        phone: this.profile.phone,
        saIdNumber: this.profile.saIdNumber,
        isSaIdNumber: this.isSaIdNumber,
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
    }, 'Profile changes saved successfully.');
  }

  canSaveProfile(): boolean {
    return this.getMissingMandatoryProfileFields().length === 0
      && this.hasValidIdentityNumber()
      && !this.getIdentityValidationError();
  }

  getIdentityValidationError(): string {
    const birthDateValue = this.profile.dateOfBirth.trim();
    if (!birthDateValue) {
      return '';
    }

    const birthDate = this.parseDateInputValue(birthDateValue);
    if (!birthDate) {
      return 'Enter a valid date of birth.';
    }

    if (birthDate > this.getMinimumBirthDate()) {
      return 'You must be at least 16 years old to use Smith Education Group.';
    }

    const identityNumber = this.profile.saIdNumber.trim();
    if (!identityNumber) {
      return '';
    }

    if (!this.isSaIdNumber) {
      if (!/^[A-Z0-9]{5,20}$/.test(identityNumber)) {
        return 'Enter a valid passport number using 5–20 letters or numbers.';
      }
      return '';
    }

    if (!/^\d{13}$/.test(identityNumber)) {
      return 'Enter a valid 13-digit SA ID number.';
    }

    const encodedBirthDate = identityNumber.slice(0, 6);
    const expectedBirthDate = [
      birthDateValue.slice(2, 4),
      birthDateValue.slice(5, 7),
      birthDateValue.slice(8, 10)
    ].join('');

    if (encodedBirthDate !== expectedBirthDate) {
      return 'The date of birth does not match the birth date encoded in the SA ID number.';
    }

    return '';
  }

  canSaveAcademicInformation(): boolean {
    return this.hasRequiredAcademicInformation();
  }

  private getAcademicPersistencePayload() {
    const academicInformation = { ...this.academicInformation };

    return {
      // Keep the canonical nested object and the existing top-level fields in
      // sync while older app versions still read the legacy shape.
      academicInformation,
      currentOrLastSchool: academicInformation.currentOrLastSchool,
      currentLevel: academicInformation.currentLevel,
      currentStudyLevel: academicInformation.currentLevel,
      schoolProvince: academicInformation.schoolProvince,
      matricYear: academicInformation.matricYear,
      hasWrittenNbt: academicInformation.hasWrittenNbt,
      studyAreas: academicInformation.interest ? [academicInformation.interest] : [],
      apsUniversityName: academicInformation.apsUniversityName,
      universityChoice1: academicInformation.universityChoice1,
      universityChoice2: academicInformation.universityChoice2,
      universityChoice3: academicInformation.universityChoice3,
      universityChoice4: academicInformation.universityChoice4,
      courseChoices: [
        academicInformation.courseChoice1,
        academicInformation.courseChoice2,
        academicInformation.courseChoice3,
        academicInformation.courseChoice4
      ]
    };
  }

  async saveAcademicInformation() {
    const userDocId = this.getUserDocId();
    if (!userDocId) {
      await this.authService.presentToast('Please sign in to save your academic information.');
      return;
    }

    if (!this.hasRequiredAcademicInformation()) {
      await this.authService.presentToast('Please complete Current/Last School, Current Level, School Province, Matric Year, NBT, Interest, university choices 1 to 3, and course choices 1 to 3.');
      return;
    }

    void this.startTimedSave('academic', async () => {
      await setDoc(doc(this.authService.db, 'users', userDocId), {
        ...this.getAcademicPersistencePayload()
      }, { merge: true });
    }, 'School background saved successfully.');
  }

  getUniversityOptions(selectedValue: string): string[] {
    const savedValue = selectedValue?.trim();
    if (!savedValue || this.apsUniversities.includes(savedValue)) {
      return this.apsUniversities;
    }

    // Keep legacy or renamed university values selectable instead of letting
    // the native select fall back to its empty placeholder.
    return [savedValue, ...this.apsUniversities];
  }

  getInterestOptions(selectedValue: string): string[] {
    const savedValue = selectedValue?.trim();
    if (!savedValue || this.interests.includes(savedValue)) {
      return this.interests;
    }

    return [savedValue, ...this.interests];
  }

  async saveInterests() {
    const userDocId = this.getUserDocId();
    if (!userDocId) {
      await this.authService.presentToast('Please sign in to save changes.');
      return;
    }

    void this.startTimedSave('profile', async () => {
      await setDoc(doc(this.authService.db, 'users', userDocId), {
        studyAreas: this.selectedInterests
      }, { merge: true });
    }, 'Interests saved successfully.');
  }

  shouldShowEmailVerificationBanner(): boolean {
    return !this.isGoogleUser && this.userEmail !== '' && !this.isEmailVerified;
  }

  shouldShowAdminPortalBanner(): boolean {
    return this.isAdminUser;
  }

  async goToAdminPortal(): Promise<void> {
    await this.router.navigate(['/tabs/admin-portal']);
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

      if (this.userEmail) {
        const userDocId = this.getUserDocId();
        if (userDocId) {
          await setDoc(doc(this.authService.db, 'users', userDocId), {
          emailVerified: this.isEmailVerified
          }, { merge: true });
        }
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
    const userDocId = this.getUserDocId();
    if (!currentUser || !userDocId) {
      await this.authService.presentToast('Please sign in again to delete your account.');
      return;
    }

    const hasConfirmedDeletion = window.confirm('Delete your account permanently? This action cannot be undone.');
    if (!hasConfirmedDeletion) {
      return;
    }

    this.isDeletingAccount = true;

    try {
      await deleteDoc(doc(this.authService.db, 'users', userDocId));
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

    void this.startTimedSave(
      'password',
      async () => {
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);

        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        };
      },
      'Password updated successfully.',
      (error: any) => {
        const code = error?.code as string | undefined;
        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          return 'Current password is incorrect.';
        }
        if (code === 'auth/weak-password') {
          return 'Please choose a stronger new password.';
        }
        if (code === 'auth/too-many-requests') {
          return 'Too many attempts. Please try again later.';
        }
        if (code === 'auth/requires-recent-login') {
          return 'Please sign in again, then update your password.';
        }
        return 'Could not update password right now. Please try again.';
      }
    );
  }

  addSubjectEntry() {
    this.subjectEntries = [...this.subjectEntries, { subject: '', mark: null }];
  }

  triggerSubjectsOcrInput() {
    this.subjectsOcrInput?.nativeElement.click();
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

  async onSubjectsOcrFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!this.isSupportedSubjectsOcrFile(file)) {
      this.subjectOcrStatus = 'Please upload an image or PDF file for OCR.';
      input.value = '';
      return;
    }

    this.isRunningSubjectOcr = true;
    this.subjectOcrStatus = 'Preparing OCR scan...';

    try {
      const recognizedText = this.isPdfFile(file)
        ? await this.extractTextFromPdfForSubjectOcr(file)
        : await this.recognizeTextWithOcr(
            await this.prepareImageForSubjectOcr(file),
            'Scanning results...'
          );

      const recognizedEntries = this.parseSubjectEntriesFromOcrText(recognizedText);

      if (recognizedEntries.length === 0) {
        this.subjectOcrStatus = 'No supported subjects were detected. Try a clearer image or add subjects manually.';
        return;
      }

      this.mergeRecognizedSubjectEntries(recognizedEntries);

      const entriesWithMarks = recognizedEntries.filter((entry) => entry.mark !== null).length;
      this.subjectOcrStatus = entriesWithMarks > 0
        ? `OCR added ${recognizedEntries.length} subject${recognizedEntries.length === 1 ? '' : 's'} and ${entriesWithMarks} mark${entriesWithMarks === 1 ? '' : 's'}.`
        : `OCR added ${recognizedEntries.length} subject${recognizedEntries.length === 1 ? '' : 's'}. Add any missing marks manually.`;
    } catch (error) {
      console.error('OCR scan failed:', error);
      this.subjectOcrStatus = 'OCR failed. Please try again with a clearer image.';
    } finally {
      this.isRunningSubjectOcr = false;
      input.value = '';
    }
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
    const userDocId = this.getUserDocId();
    if (!userDocId) {
      await this.authService.presentToast('Please sign in to save your subjects.');
      return;
    }

    if (!this.hasRequiredAcademicInformation()) {
      await this.authService.presentToast('Please complete Current/Last School, Current Level, School Province, Matric Year, NBT, university choices 1 to 3, and course choices 1 to 3 before saving.');
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

    const apsResults = this.calculateAllUniversityApsResults(completedEntries);
    if (!apsResults.length) {
      await this.authService.presentToast('Could not save subjects right now. Please try again.');
      return;
    }

    const primaryApsScore = this.resolvePrimaryApsScore(apsResults);

    void this.startTimedSave('subjects', async () => {
      await setDoc(doc(this.authService.db, 'users', userDocId), {
        ...this.getAcademicPersistencePayload(),
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
    }, 'Academic information saved successfully.');
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
    const documentEntries = Object.entries(this.uploadedDocumentData) as Array<[RequiredDocumentKey, DocumentData]>;

    if (!documentEntries.length) {
      return;
    }

    const resolvedEntries = await Promise.allSettled(
      documentEntries.map(async ([key, documentData]) => [key, await this.resolveDocumentUrl(documentData)] as const)
    );

    const nextDocumentUrls: Partial<Record<RequiredDocumentKey, string>> = {};

    resolvedEntries.forEach((result: PromiseSettledResult<readonly [RequiredDocumentKey, string]>, index: number) => {
      const [key] = documentEntries[index];

      if (result.status === 'fulfilled') {
        nextDocumentUrls[key] = result.value[1];
        return;
      }

      console.warn(`Could not create blob URL for ${key}:`, result.reason);
    });

    this.uploadedDocumentUrls = nextDocumentUrls;
  }

  async uploadRequiredDocuments() {
    const userDocId = this.getUserDocId();
    if (!userDocId) {
      await this.authService.presentToast('Please sign in to upload documents.');
      return;
    }

    const hasIdDocument = Boolean(this.selectedDocumentFiles[this.requiredDocumentKey] || this.uploadedDocumentData[this.requiredDocumentKey]);

    if (!hasIdDocument) {
      await this.authService.presentToast('Please upload your ID document before submitting.');
      return;
    }

    const nextDocumentData: Partial<Record<RequiredDocumentKey, DocumentData>> = { ...this.uploadedDocumentData };
    const nextDocumentNames: Partial<Record<RequiredDocumentKey, string>> = { ...this.uploadedDocumentNames };

    const uploads = this.requiredDocuments
      .map((requirement) => ({
        requirement,
        file: this.selectedDocumentFiles[requirement.key]
      }))
      .filter((item): item is { requirement: RequiredDocumentRequirement; file: File } => item.file !== null);

    const uploadedDocuments = await Promise.all(
      uploads.map(async ({ requirement, file }) => {
        const documentData = await this.uploadUserDocumentToFirebase(this.userEmail, requirement.key, file);
        return {
          key: requirement.key,
          documentData,
          name: file.name
        };
      })
    );

    uploadedDocuments.forEach((document) => {
      nextDocumentData[document.key] = document.documentData;
      nextDocumentNames[document.key] = document.name;
    });

    void this.startTimedSave('documents', async () => {
      this.isFinalizingDocumentUpload = true;

      await setDoc(doc(this.authService.db, 'users', userDocId), {
        documents: nextDocumentData,
        documentFileNames: nextDocumentNames
      }, { merge: true });

      this.uploadedDocumentData = nextDocumentData;
      this.uploadedDocumentNames = nextDocumentNames;

      try {
        await this.refreshUploadedDocumentUrls();
        this.hasHydratedDocumentSignedUrls = true;
      } catch (error) {
        console.warn('Documents uploaded, but could not create blob URLs:', error);
      }

      this.selectedDocumentFiles = {
        idDocument: null,
        matricCertificate: null,
        grade11Transcript: null,
        grade12MidYearResults: null
      };
    }, 'Documents uploaded successfully.');
  }

  async debugFirebaseStorageConnection() {
    try {
      const testData: DocumentData = {
        fileName: 'test.txt',
        mimeType: 'text/plain',
        uploadedAt: Date.now(),
        data: btoa('Firestore document storage test successful!')
      };

      const blobUrl = await this.resolveDocumentUrl(testData);
      console.log('Firestore document storage test - Blob URL:', blobUrl);

      await this.authService.presentToast('Firestore document storage check complete. See the console for details.');
    } catch (error) {
      console.error('Firestore document storage check failed:', error);
      await this.authService.presentToast('Firestore document storage check failed. See the console for details.');
    }
  }

  ngOnDestroy() {
    this.clearSaveTimer('profile');
    this.clearSaveTimer('academic');
    this.clearSaveTimer('subjects');
    this.clearSaveTimer('documents');
    this.clearSaveTimer('password');
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

  private isSupportedSubjectsOcrFile(file: File): boolean {
    return file.type.startsWith('image/') || this.isPdfFile(file);
  }

  private isPdfFile(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }

  private async recognizeTextWithOcr(source: Blob | File, statusLabel: string): Promise<string> {
    const { recognize } = await import('tesseract.js');
    const result = await recognize(source, 'eng', {
      logger: (message) => {
        if (message.status === 'recognizing text' && typeof message.progress === 'number') {
          const progress = Math.round(message.progress * 100);
          this.subjectOcrStatus = `${statusLabel} ${progress}%`;
        }
      }
    });

    const structuredLines = (result.data.blocks ?? [])
      .flatMap((block) => block.paragraphs ?? [])
      .flatMap((paragraph) => paragraph.lines ?? [])
      .map((line) => line.text.trim())
      .filter(Boolean);

    return structuredLines.length ? structuredLines.join('\n') : result.data.text;
  }

  private async prepareImageForSubjectOcr(file: File): Promise<Blob | File> {
    if (typeof createImageBitmap !== 'function') {
      return file;
    }

    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const widthScale = Math.max(1, 1800 / Math.max(bitmap.width, 1));
      const scale = Math.min(widthScale, 2.5, 3000 / bitmap.width, 4000 / bitmap.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext('2d');
      if (!context) {
        return file;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.filter = 'grayscale(1) contrast(1.35)';
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const enhancedImage = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      canvas.width = 0;
      canvas.height = 0;
      return enhancedImage ?? file;
    } catch (error) {
      console.warn('Could not enhance the image before OCR; using the original file.', error);
      return file;
    } finally {
      bitmap?.close();
    }
  }

  private async extractTextFromPdfForSubjectOcr(file: File): Promise<string> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

    const pdfBuffer = await file.arrayBuffer();
    const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
    const pageTexts: string[] = [];

    try {
      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const page = await pdfDocument.getPage(pageNumber);

        try {
          this.subjectOcrStatus = `Reading PDF page ${pageNumber} of ${pdfDocument.numPages}...`;

          const embeddedText = await this.extractEmbeddedTextFromPdfPage(page);
          const renderedPageBlob = await this.renderPdfPageToBlob(page);
          const ocrText = renderedPageBlob
            ? await this.recognizeTextWithOcr(renderedPageBlob, `Scanning PDF page ${pageNumber} of ${pdfDocument.numPages}...`)
            : '';

          pageTexts.push([embeddedText, ocrText].filter(Boolean).join('\n'));
        } finally {
          page.cleanup();
        }
      }
    } finally {
      await pdfDocument.destroy();
    }

    return pageTexts.join('\n');
  }

  private async extractEmbeddedTextFromPdfPage(page: any): Promise<string> {
    const textContent = await page.getTextContent();
    const rows = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of textContent.items as any[]) {
      const text = typeof item?.str === 'string' ? item.str.trim() : '';
      const transform = Array.isArray(item?.transform) ? item.transform : [];
      if (!text || transform.length < 6) {
        continue;
      }

      // PDF text is supplied as positioned fragments. Grouping fragments by
      // their baseline preserves report rows, which keeps each mark beside its subject.
      const rowKey = Math.round(Number(transform[5]) / 3) * 3;
      const row = rows.get(rowKey) ?? [];
      row.push({ x: Number(transform[4]) || 0, text });
      rows.set(rowKey, row);
    }

    return Array.from(rows.entries())
      .sort(([leftY], [rightY]) => rightY - leftY)
      .map(([, row]) => row.sort((left, right) => left.x - right.x).map((item) => item.text).join(' '))
      .join('\n');
  }

  private async renderPdfPageToBlob(page: any): Promise<Blob | null> {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/png');
    });

    canvas.width = 0;
    canvas.height = 0;
    return blob;
  }

  private parseSubjectEntriesFromOcrText(text: string): SubjectMarkEntry[] {
    const detectedEntries = new Map<string, SubjectMarkEntry>();
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const [index, line] of lines.entries()) {
      const subject = this.matchSubjectFromOcrLine(line);
      if (!subject) {
        continue;
      }

      const mark = this.extractMarkFromOcrLine(line)
        ?? this.extractNearbyMarkFromOcrLines(lines, index);
      const existingEntry = detectedEntries.get(subject);

      if (!existingEntry || (existingEntry.mark === null && mark !== null)) {
        detectedEntries.set(subject, { subject, mark });
      }
    }

    return Array.from(detectedEntries.values());
  }

  private mergeRecognizedSubjectEntries(entries: SubjectMarkEntry[]) {
    const nextEntries = this.subjectEntries.map((entry) => ({ ...entry }));

    for (const entry of entries) {
      const existingIndex = nextEntries.findIndex((currentEntry) => currentEntry.subject === entry.subject);
      if (existingIndex >= 0) {
        nextEntries[existingIndex] = {
          subject: entry.subject,
          mark: entry.mark ?? nextEntries[existingIndex].mark
        };
        continue;
      }

      const emptyIndex = nextEntries.findIndex((currentEntry) => currentEntry.subject === '');
      if (emptyIndex >= 0) {
        nextEntries[emptyIndex] = entry;
        continue;
      }

      nextEntries.push(entry);
    }

    this.subjectEntries = nextEntries;
    this.refreshApsResultsFromCurrentEntries();
  }

  private matchSubjectFromOcrLine(line: string): string {
    const normalizedLine = this.normalizeOcrText(line);
    const aliases = this.getSubjectOcrAliases();
    let bestMatch = '';

    for (const alias of aliases) {
      if (!this.containsOcrPhrase(normalizedLine, alias.alias)) {
        continue;
      }

      if (alias.alias.length > bestMatch.length) {
        bestMatch = alias.subject;
      }
    }

    return bestMatch;
  }

  private extractMarkFromOcrLine(line: string): number | null {
    const parseNumericToken = (value: string) => Number(value.replace(/[oO]/g, '0'));
    const percentageMatches = Array.from(line.matchAll(/(?:^|\s)([0-9oO]{1,3})\s*%/g));

    for (const match of percentageMatches) {
      const parsedMark = parseNumericToken(match[1]);
      if (Number.isFinite(parsedMark) && parsedMark >= 0 && parsedMark <= 100) {
        return parsedMark;
      }
    }

    // Achievement levels (1–7) often sit beside percentages on reports. Prefer
    // percentage-like values so a level is not incorrectly stored as the mark.
    const numericMatches = Array.from(line.matchAll(/(?:^|\s)(\d{1,3})(?=\s|$)/g));
    for (const match of numericMatches) {
      const parsedMark = Number(match[1]);
      if (Number.isFinite(parsedMark) && parsedMark >= 20 && parsedMark <= 100) {
        return parsedMark;
      }
    }

    return null;
  }

  private extractNearbyMarkFromOcrLines(lines: string[], subjectIndex: number): number | null {
    const candidateIndexes = [subjectIndex + 1, subjectIndex + 2];

    for (const candidateIndex of candidateIndexes) {
      if (candidateIndex < 0 || candidateIndex >= lines.length) {
        continue;
      }

      const candidateLine = lines[candidateIndex];
      if (this.matchSubjectFromOcrLine(candidateLine)) {
        continue;
      }

      const mark = this.extractMarkFromOcrLine(candidateLine);
      if (mark !== null) {
        return mark;
      }
    }

    return null;
  }

  private normalizeOcrText(value: string): string {
    return value
      .toLowerCase()
      .replace(/[%_|:;,.()\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private containsOcrPhrase(normalizedLine: string, normalizedPhrase: string): boolean {
    return ` ${normalizedLine} `.includes(` ${normalizedPhrase} `);
  }

  private getSubjectOcrAliases(): Array<{ alias: string; subject: string }> {
    const aliasMap = new Map<string, string>();

    const registerAlias = (alias: string, subject: string) => {
      const normalizedAlias = this.normalizeOcrText(alias);
      if (!normalizedAlias) {
        return;
      }

      aliasMap.set(normalizedAlias, subject);
    };

    for (const subject of this.highSchoolSubjectOptions) {
      registerAlias(subject, subject);
    }

    registerAlias('maths', 'Mathematics');
    registerAlias('math', 'Mathematics');
    registerAlias('maths lit', 'Mathematical Literacy');
    registerAlias('math lit', 'Mathematical Literacy');
    registerAlias('mathematics lit', 'Mathematical Literacy');
    registerAlias('eng', 'English');
    registerAlias('eng hl', 'English');
    registerAlias('eng fal', 'English');
    registerAlias('afr', 'Afrikaans');
    registerAlias('afr hl', 'Afrikaans');
    registerAlias('afr fal', 'Afrikaans');
    registerAlias('lo', 'Life Orientation');
    registerAlias('life ori', 'Life Orientation');
    registerAlias('physical science', 'Physical Sciences');
    registerAlias('life science', 'Life Sciences');
    registerAlias('business study', 'Business Studies');
    registerAlias('cat', 'Computer Applications Technology');
    registerAlias('egd', 'Engineering Graphics and Design');
    registerAlias('it', 'Information Technology');

    return Array.from(aliasMap.entries())
      .map(([alias, subject]) => ({ alias, subject }))
      .sort((left, right) => right.alias.length - left.alias.length);
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

  private async loadSavedSubjects(userEmail: string) {
    try {
      const userData = await this.authService.getUser(userEmail) as ({
        firstName?: string;
        lastName?: string;
        initials?: string;
        middleName?: string;
        email?: string;
        phone?: string;
        saIdNumber?: string;
        isSaIdNumber?: boolean;
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
        universityChoice1?: string;
        universityChoice2?: string;
        universityChoice3?: string;
        universityChoice4?: string;
        studyAreas?: string[];
        courseChoices?: string[];
        academicInformation?: Partial<AcademicInformation>;
        currentOrLastSchool?: string;
        currentLevel?: string;
        currentStudyLevel?: string;
        schoolProvince?: string;
        matricYear?: string;
        hasWrittenNbt?: string;
        documents?: Partial<Record<RequiredDocumentKey, DocumentData>>;
        documentFileNames?: Partial<Record<RequiredDocumentKey, string>>;
        nextOfKins?: SavedNextOfKin[];
      } | null);

      if (!userData) {
        console.warn('No Firestore profile document was found for the signed-in user.');
        return;
      }

      this.profile = {
        ...this.profile,
        firstName: userData.firstName ?? this.profile.firstName,
        lastName: userData.lastName ?? this.profile.lastName,
        initials: userData.initials ?? this.profile.initials,
        middleName: userData.middleName ?? this.profile.middleName,
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
      this.isSaIdNumber = userData.isSaIdNumber ?? true;
      this.nextOfKins = this.normalizeNextOfKins(userData.nextOfKins);

      if (userData.academicInformation && typeof userData.academicInformation === 'object') {
        const savedAcademic = userData.academicInformation;
        this.academicInformation = {
          // Top-level fields were the write target in previous releases, so
          // prefer them during migration and use the nested object as fallback.
          currentOrLastSchool: userData.currentOrLastSchool || savedAcademic.currentOrLastSchool || '',
          currentLevel: userData.currentLevel || savedAcademic.currentLevel || userData.currentStudyLevel || '',
          schoolProvince: userData.schoolProvince || savedAcademic.schoolProvince || '',
          matricYear: userData.matricYear || savedAcademic.matricYear || '',
          hasWrittenNbt: userData.hasWrittenNbt || savedAcademic.hasWrittenNbt || '',
          interest: this.resolveSavedInterest(userData.studyAreas?.[0], savedAcademic.interest),
          apsUniversityName: userData.apsUniversityName || savedAcademic.apsUniversityName || '',
          universityChoice1: this.resolveSavedUniversityChoice(userData.universityChoice1, savedAcademic.universityChoice1),
          universityChoice2: this.resolveSavedUniversityChoice(userData.universityChoice2, savedAcademic.universityChoice2),
          universityChoice3: this.resolveSavedUniversityChoice(userData.universityChoice3, savedAcademic.universityChoice3),
          universityChoice4: this.resolveSavedUniversityChoice(userData.universityChoice4, savedAcademic.universityChoice4),
          courseChoice1: userData.courseChoices?.[0] || savedAcademic.courseChoice1 || '',
          courseChoice2: userData.courseChoices?.[1] || savedAcademic.courseChoice2 || '',
          courseChoice3: userData.courseChoices?.[2] || savedAcademic.courseChoice3 || '',
          courseChoice4: userData.courseChoices?.[3] || savedAcademic.courseChoice4 || ''
        };
      } else {
        this.academicInformation = {
          currentOrLastSchool: userData.currentOrLastSchool ?? '',
          currentLevel: userData.currentLevel || userData.currentStudyLevel || '',
          schoolProvince: userData.schoolProvince ?? '',
          matricYear: userData.matricYear ?? '',
          hasWrittenNbt: userData.hasWrittenNbt ?? '',
          interest: this.resolveSavedInterest(Array.isArray(userData.studyAreas) ? userData.studyAreas[0] : ''),
          apsUniversityName: userData.apsUniversityName ?? '',
          universityChoice1: this.resolveSavedUniversityChoice(userData.universityChoice1),
          universityChoice2: this.resolveSavedUniversityChoice(userData.universityChoice2),
          universityChoice3: this.resolveSavedUniversityChoice(userData.universityChoice3),
          universityChoice4: this.resolveSavedUniversityChoice(userData.universityChoice4),
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
        this.uploadedDocumentData = { ...userData.documents };
        this.hasHydratedDocumentSignedUrls = false;

        // Keep profile/academic actions fast and hydrate blob URLs only for document interactions.
        if (this.activeTab === 'documents') {
          void this.hydrateDocumentSignedUrlsIfNeeded();
        }
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
    } catch (error) {
      console.error('Could not load the saved Firestore profile.', error);
      await this.authService.presentToast('Could not load your saved profile. Please refresh and try again.');
    }
  }

  private async applyUserProfile(user: User | null) {
    if (!user) {
      this.userEmail = '';
      this.isGoogleUser = false;
      this.isEmailVerified = false;
      this.isAdminUser = false;
      this.isSaIdNumber = true;
      this.nextOfKins = this.createEmptyNextOfKins();
      this.profile = {
        firstName: 'User',
        lastName: '',
        initials: '',
        middleName: '',
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
        universityChoice1: '',
        universityChoice2: '',
        universityChoice3: '',
        universityChoice4: '',
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

    this.userEmail = (user.email ?? '').trim().toLowerCase();
    this.isSaIdNumber = true;
    this.nextOfKins = this.createEmptyNextOfKins();

    this.isGoogleUser = user.providerData.some((provider) => provider.providerId === 'google.com');
    this.isEmailVerified = user.emailVerified ?? false;
    try {
      this.isAdminUser = await this.authService.isCurrentUserAdmin();
    } catch {
      this.isAdminUser = false;
    }

    const displayName = user.displayName?.trim() ?? '';
    const [firstName = 'User', ...rest] = displayName ? displayName.split(/\s+/) : ['User'];

    this.profile = {
      firstName,
      lastName: rest.join(' '),
      initials: '',
      middleName: '',
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
      universityChoice1: '',
      universityChoice2: '',
      universityChoice3: '',
      universityChoice4: '',
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

    await this.loadSavedSubjects(this.userEmail);
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
      // Autocomplete is optional; manual address entry remains available.
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

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || ''); // Extract base64 part
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  private async uploadUserDocumentToFirebase(userEmail: string, key: RequiredDocumentKey, file: File): Promise<DocumentData> {
    const base64Data = await this.fileToBase64(file);
    
    return {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      uploadedAt: Date.now(),
      data: base64Data
    };
  }

  private async resolveDocumentUrl(documentData: DocumentData): Promise<string> {
    if (!documentData?.data) {
      return '';
    }

    try {
      const blob = this.base64ToBlob(documentData.data, documentData.mimeType);
      return URL.createObjectURL(blob);
    } catch (error) {
      console.warn('Could not create blob URL from document data:', error);
      return '';
    }
  }

  private hasRequiredAcademicInformation(): boolean {
    return this.academicInformation.currentOrLastSchool.trim() !== ''
      && this.academicInformation.currentLevel.trim() !== ''
      && this.academicInformation.schoolProvince.trim() !== ''
      && this.academicInformation.matricYear.trim() !== ''
      && this.academicInformation.hasWrittenNbt.trim() !== ''
      && this.academicInformation.interest.trim() !== ''
      && this.academicInformation.universityChoice1.trim() !== ''
      && this.academicInformation.universityChoice2.trim() !== ''
      && this.academicInformation.universityChoice3.trim() !== ''
      && this.academicInformation.courseChoice1.trim() !== ''
      && this.academicInformation.courseChoice2.trim() !== ''
      && this.academicInformation.courseChoice3.trim() !== '';
  }

  private resolveSubjectOption(subject: string): string {
    const normalizedSubject = this.normalizeOcrText(subject);
    if (!normalizedSubject) {
      return '';
    }

    const directMatch = this.highSchoolSubjectOptions.find(
      (option) => this.normalizeOcrText(option) === normalizedSubject
    );

    if (directMatch) {
      return directMatch;
    }

    const aliasMatch = this.getSubjectOcrAliases().find((alias) => alias.alias === normalizedSubject);
    return aliasMatch?.subject ?? '';
  }

  private resolveSavedUniversityChoice(...values: unknown[]): string {
    const savedValue = values.find((value) => typeof value === 'string' && value.trim() !== '');
    if (typeof savedValue !== 'string') {
      return '';
    }

    const trimmedValue = savedValue.trim();
    return this.apsUniversities.find(
      (university) => university.toLowerCase() === trimmedValue.toLowerCase()
    ) ?? trimmedValue;
  }

  private resolveSavedInterest(...values: unknown[]): string {
    const savedValue = values.find((value) => typeof value === 'string' && value.trim() !== '');
    if (typeof savedValue !== 'string') {
      return '';
    }

    const normalizedValue = savedValue.trim().toLowerCase();
    const configuredInterest = INTEREST_OPTIONS.find((interest) => (
      interest.value.toLowerCase() === normalizedValue
      || interest.label.toLowerCase() === normalizedValue
    ));

    return configuredInterest?.label ?? savedValue.trim();
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

  private hasValidIdentityNumber(): boolean {
    const identityNumber = this.profile.saIdNumber.trim();
    return this.isSaIdNumber
      ? /^\d{13}$/.test(identityNumber)
      : /^[A-Z0-9]{5,20}$/.test(identityNumber);
  }

  private createEmptyNextOfKins(): NextOfKin[] {
    return [
      { firstName: '', lastName: '', initials: '', email: '', relationship: '', phone: '' },
      { firstName: '', lastName: '', initials: '', email: '', relationship: '', phone: '' }
    ];
  }

  private isNextOfKinComplete(kin: NextOfKin): boolean {
    return kin.firstName.trim() !== ''
      && kin.lastName.trim() !== ''
      && kin.initials.trim() !== ''
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(kin.email.trim())
      && (kin.relationship === 'parent' || kin.relationship === 'guardian')
      && kin.phone.replace(/\D/g, '').length >= 10;
  }

  private normalizeNextOfKins(savedKins: SavedNextOfKin[] | undefined): NextOfKin[] {
    const emptyKins = this.createEmptyNextOfKins();
    if (!Array.isArray(savedKins)) {
      return emptyKins;
    }

    return emptyKins.map((emptyKin, index) => {
      const saved = savedKins[index];
      if (!saved) {
        return emptyKin;
      }

      const relationship = saved.relationship === 'parent' || saved.relationship === 'guardian'
        ? saved.relationship
        : '';
      const legacyNameParts = typeof saved.fullName === 'string'
        ? saved.fullName.trim().split(/\s+/).filter(Boolean)
        : [];

      return {
        firstName: typeof saved.firstName === 'string' ? saved.firstName : (legacyNameParts[0] ?? ''),
        lastName: typeof saved.lastName === 'string' ? saved.lastName : legacyNameParts.slice(1).join(' '),
        initials: typeof saved.initials === 'string' ? saved.initials : '',
        email: typeof saved.email === 'string' ? saved.email : '',
        relationship,
        phone: typeof saved.phone === 'string' ? saved.phone : ''
      };
    });
  }

  private getMinimumBirthDate(): Date {
    const today = new Date();
    return new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
  }

  private parseDateInputValue(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() !== year
      || parsed.getMonth() !== month - 1
      || parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  private formatDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getUserDocId(): string | null {
    const normalized = (this.userEmail ?? '').trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  getProfileSaveButtonLabel(): string {
    return this.getSaveButtonLabel('Save Changes', this.isSavingProfile, this.profileSaveCountdown);
  }

  getAcademicSaveButtonLabel(): string {
    return this.getSaveButtonLabel('Save School Background', this.isSavingAcademicInfo, this.academicSaveCountdown);
  }

  getSubjectsSaveButtonLabel(): string {
    return this.getSaveButtonLabel('Save Subjects', this.isSavingSubjects, this.subjectsSaveCountdown);
  }

  getDocumentsSaveButtonLabel(): string {
    return this.getSaveButtonLabel('Upload Documents', this.isUploadingDocuments, this.documentsSaveCountdown, this.isFinalizingDocumentUpload ? 'Finalizing...' : 'Uploading...');
  }

  getPasswordSaveButtonLabel(): string {
    return this.getSaveButtonLabel('Update Password', this.isUpdatingPassword, this.passwordSaveCountdown, 'Updating...');
  }

  private getSaveButtonLabel(defaultLabel: string, isSaving: boolean, countdown: number, fallbackSavingLabel = 'Saving...'): string {
    if (!isSaving) {
      return defaultLabel;
    }

    return 'Saving...';
  }

  private startTimedSave(
    action: 'profile' | 'academic' | 'subjects' | 'documents' | 'password',
    saveTask: () => Promise<void>,
    successMessage: string,
    errorMessageResolver?: (error: any) => string
  ) {
    this.clearSaveTimer(action);

    this.setSavingState(action, true, this.saveCountdownSeconds);

    let toastMessage = successMessage;
    void Promise.resolve()
      .then(saveTask)
      .catch((error) => {
        toastMessage = errorMessageResolver
          ? errorMessageResolver(error)
          : 'Could not save right now. Please try again.';
      });

    const timerId = window.setTimeout(() => {
      this.setSaveTimer(action, undefined);
      this.setSavingState(action, false, 0);
      void this.authService.presentToast(toastMessage);
    }, this.saveToastDelayMs);

    this.setSaveTimer(action, timerId);
  }

  private clearSaveTimer(action: 'profile' | 'academic' | 'subjects' | 'documents' | 'password') {
    const timerId = this.getSaveTimer(action);
    if (timerId !== undefined) {
      window.clearInterval(timerId);
      this.setSaveTimer(action, undefined);
    }
  }

  private getSaveTimer(action: 'profile' | 'academic' | 'subjects' | 'documents' | 'password'): number | undefined {
    switch (action) {
      case 'profile':
        return this.profileSaveTimerId;
      case 'academic':
        return this.academicSaveTimerId;
      case 'subjects':
        return this.subjectsSaveTimerId;
      case 'documents':
        return this.documentsSaveTimerId;
      case 'password':
        return this.passwordSaveTimerId;
    }
  }

  private setSaveTimer(action: 'profile' | 'academic' | 'subjects' | 'documents' | 'password', timerId: number | undefined) {
    switch (action) {
      case 'profile':
        this.profileSaveTimerId = timerId;
        break;
      case 'academic':
        this.academicSaveTimerId = timerId;
        break;
      case 'subjects':
        this.subjectsSaveTimerId = timerId;
        break;
      case 'documents':
        this.documentsSaveTimerId = timerId;
        break;
      case 'password':
        this.passwordSaveTimerId = timerId;
        break;
    }
  }

  private getCountdownState(action: 'profile' | 'academic' | 'subjects' | 'documents' | 'password'): number {
    switch (action) {
      case 'profile':
        return this.profileSaveCountdown;
      case 'academic':
        return this.academicSaveCountdown;
      case 'subjects':
        return this.subjectsSaveCountdown;
      case 'documents':
        return this.documentsSaveCountdown;
      case 'password':
        return this.passwordSaveCountdown;
    }
  }

  private setCountdownState(action: 'profile' | 'academic' | 'subjects' | 'documents' | 'password', value: number) {
    switch (action) {
      case 'profile':
        this.profileSaveCountdown = value;
        break;
      case 'academic':
        this.academicSaveCountdown = value;
        break;
      case 'subjects':
        this.subjectsSaveCountdown = value;
        break;
      case 'documents':
        this.documentsSaveCountdown = value;
        break;
      case 'password':
        this.passwordSaveCountdown = value;
        break;
    }
  }

  private setSavingState(action: 'profile' | 'academic' | 'subjects' | 'documents' | 'password', isSaving: boolean, countdown: number) {
    this.setCountdownState(action, countdown);

    switch (action) {
      case 'profile':
        this.isSavingProfile = isSaving;
        break;
      case 'academic':
        this.isSavingAcademicInfo = isSaving;
        break;
      case 'subjects':
        this.isSavingSubjects = isSaving;
        break;
      case 'documents':
        this.isUploadingDocuments = isSaving;
        this.isFinalizingDocumentUpload = false;
        break;
      case 'password':
        this.isUpdatingPassword = isSaving;
        break;
    }
  }

  private async hydrateDocumentSignedUrlsIfNeeded() {
    if (this.isHydratingDocumentSignedUrls || this.hasHydratedDocumentSignedUrls) {
      return;
    }

    const hasStoredDocuments = Object.values(this.uploadedDocumentData).some((value) => {
      return value?.data ? true : false;
    });

    if (!hasStoredDocuments) {
      this.hasHydratedDocumentSignedUrls = true;
      return;
    }

    this.isHydratingDocumentSignedUrls = true;

    try {
      await this.refreshUploadedDocumentUrls();
      this.hasHydratedDocumentSignedUrls = true;
    } catch (error) {
      console.warn('Could not hydrate document blob URLs:', error);
    } finally {
      this.isHydratingDocumentSignedUrls = false;
    }
  }
}
