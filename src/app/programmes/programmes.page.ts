import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonChip,
  IonFab,
  IonFabButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonModal
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  closeCircleOutline,
  calculatorOutline,
  arrowForwardOutline,
  arrowUpOutline
} from 'ionicons/icons';
import { getAuth, onAuthStateChanged, Unsubscribe, User } from 'firebase/auth';
import programmesData from '../shared/programme-list.json';
import universityList from '../university-list/university-list.json';
import { University } from '../shared/app-data';
import { FACULTIES, Programme, QUALIFICATION_TYPES } from '../shared/programme-data';
import { ApsCalculationService, ApsSubjectInput } from '../services/aps-calculation.service';
import { AuthService } from '../services/auth.service';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { RegisterModalComponent } from '../register-modal/register-modal.component';

type EligibilityStatus = 'qualified' | 'not-qualified' | 'incomplete';
type EligibilityFilter = 'all' | 'qualified';

@Component({
  selector: 'app-programmes',
  templateUrl: 'programmes.page.html',
  styleUrls: ['programmes.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonChip,
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonModal,
    LoginModalComponent,
    RegisterModalComponent
  ],
})
export class Programmes implements OnInit, OnDestroy {
  @ViewChild(IonContent) private content?: IonContent;

  private readonly allProgrammes: Programme[] = programmesData as Programme[];
  private readonly universitiesById = new Map(
    (universityList as University[]).map((university) => [university.id, university])
  );
  private readonly applicationStatusByUniversityId = new Map(
    [...this.universitiesById.values()].map((university) => [
      university.id,
      this.buildApplicationStatusLabel(university),
    ])
  );
  private readonly userApsByUniversity = new Map<string, { score: number; maxScore: number | null }>();
  private readonly eligibilityByProgrammeId = new Map<number, EligibilityStatus>();
  private unsubscribeAuth?: Unsubscribe;

  filteredProgrammes: Programme[] = [...this.allProgrammes];
  showBackToTop = false;
  isLoggedIn = false;
  isCheckingEligibility = false;
  hasEligibilityData = false;
  loginModalOpen = false;
  registerModalOpen = false;

  searchQuery = '';
  selectedUniversities: string[] = [];
  selectedFaculties: string[] = [];
  selectedQualificationTypes: string[] = [];
  eligibilityFilter: EligibilityFilter = 'all';

  readonly universityOptions: string[] = this.buildUniversityOptions();
  readonly facultyOptions: string[] = FACULTIES;
  readonly qualificationTypeOptions: string[] = QUALIFICATION_TYPES;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private apsCalculationService: ApsCalculationService,
    private alertController: AlertController
  ) {
    addIcons({
      searchOutline,
      closeCircleOutline,
      calculatorOutline,
      arrowForwardOutline,
      arrowUpOutline
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const requestedUniversity = params.get('university')?.trim() ?? '';
      const matchedUniversity = this.universityOptions.find(
        (university) => university.toLowerCase() === requestedUniversity.toLowerCase()
      );

      // Keep the requested university as an active filter even when the
      // programme dataset has no entries for it, rather than showing unrelated
      // programmes from every institution.
      this.selectedUniversities = requestedUniversity
        ? [matchedUniversity ?? requestedUniversity]
        : [];
      this.applyFilters();
    });

    this.unsubscribeAuth = onAuthStateChanged(getAuth(), (user) => {
      void this.loadUserEligibility(user);
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeAuth?.();
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const universitySet = new Set(this.selectedUniversities);
    const facultySet = new Set(this.selectedFaculties);
    const qualificationSet = new Set(this.selectedQualificationTypes);

    this.filteredProgrammes = this.allProgrammes.filter((programme) => {
      const matchesUniversity = !universitySet.size || universitySet.has(programme.universityName);
      const matchesFaculty = !facultySet.size || facultySet.has(programme.faculty);
      const matchesQualification = !qualificationSet.size || qualificationSet.has(programme.qualificationType);
      const matchesEligibility = this.eligibilityFilter === 'all'
        || (this.isLoggedIn && this.getEligibilityStatus(programme) === 'qualified');

      if (!matchesUniversity || !matchesFaculty || !matchesQualification || !matchesEligibility) {
        return false;
      }

      if (!query) {
        return true;
      }

      const subjectText = programme.subjectRequirements.map((req) => req.subject).join(' ');
      const searchText = [
        programme.name,
        programme.universityName,
        programme.faculty,
        programme.qualificationType,
        programme.description,
        subjectText
      ]
        .join(' ')
        .toLowerCase();

      return searchText.includes(query);
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedUniversities = [];
    this.selectedFaculties = [];
    this.selectedQualificationTypes = [];
    this.eligibilityFilter = 'all';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.selectedUniversities.length ||
      this.selectedFaculties.length ||
      this.selectedQualificationTypes.length ||
      this.eligibilityFilter !== 'all'
    );
  }

  async onEligibilityFilterChange(value: unknown): Promise<void> {
    const requestedFilter: EligibilityFilter = value === 'qualified' ? 'qualified' : 'all';

    if (requestedFilter === 'qualified' && !this.isLoggedIn) {
      this.eligibilityFilter = 'all';
      this.applyFilters();
      await this.presentApsLoginAlert();
      return;
    }

    this.eligibilityFilter = requestedFilter;
    this.applyFilters();
  }

  async presentApsLoginAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Discover programmes you qualify for',
      message: 'Log in and add your school subjects and marks to your profile. We will calculate your university-specific APS and match you with eligible programmes.',
      buttons: [
        {
          text: 'Not now',
          role: 'cancel',
        },
        {
          text: 'Log in',
          handler: () => {
            this.loginModalOpen = true;
          },
        },
      ],
    });

    await alert.present();
  }

  openLoginModal(): void {
    this.loginModalOpen = true;
  }

  openProfile(): void {
    void this.router.navigate(['/tabs/profile']);
  }

  async handleLoginDismiss(event: { action: string; payload?: { email?: string; password?: string } } | null): Promise<void> {
    if (!event) {
      this.loginModalOpen = false;
      return;
    }

    switch (event.action) {
      case 'open-register':
        this.loginModalOpen = false;
        this.registerModalOpen = true;
        break;
      case 'google-login':
        await this.authService.googleSignIn();
        this.loginModalOpen = false;
        break;
      case 'forgot-password':
        if (event.payload?.email) {
          this.authService.forgotPassword(event.payload.email);
        } else {
          await this.authService.presentToast('Enter your email first');
        }
        break;
      case 'login':
        if (!event.payload?.email || !event.payload?.password) {
          await this.authService.presentToast('Email and password are required');
          return;
        }
        try {
          await this.authService.loginFireAuth(event.payload);
          this.loginModalOpen = false;
        } catch {
          // AuthService displays the authentication error.
        }
        break;
      default:
        this.loginModalOpen = false;
    }
  }

  async handleRegisterDismiss(event: {
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
  } | null): Promise<void> {
    if (!event) {
      this.registerModalOpen = false;
      return;
    }

    if (event.action === 'open-login') {
      this.registerModalOpen = false;
      this.loginModalOpen = true;
      return;
    }

    if (event.action === 'google-register') {
      await this.authService.googleSignIn();
      this.registerModalOpen = false;
      return;
    }

    if (event.action !== 'register') {
      this.registerModalOpen = false;
      return;
    }

    const payload = event.payload;
    if (!payload?.firstName || !payload.surname || !payload.email || !payload.password || !payload.confirmPassword) {
      await this.authService.presentToast('Please complete all required fields');
      return;
    }
    if (!this.hasRequiredPasswordComplexity(payload.password)) {
      await this.authService.presentToast('Use at least 6 characters, including uppercase, lowercase and a special character.');
      return;
    }
    if (payload.password !== payload.confirmPassword) {
      await this.authService.presentToast('Passwords do not match');
      return;
    }

    try {
      await this.authService.userRegistration({
        displayName: `${payload.firstName} ${payload.surname}`.trim(),
        email: payload.email,
        password: payload.password,
        currentStudyLevel: payload.currentStudyLevel,
        interest: payload.interest ?? '',
        courseChoices: payload.courseChoices ?? [],
      });
      this.registerModalOpen = false;
    } catch {
      // AuthService displays the registration error.
    }
  }

  viewUniversity(programme: Programme): void {
    void this.router.navigate(['/tabs/prospectus', programme.universityId], {
      queryParams: {
        from: 'programmes',
        university: programme.universityName,
      },
    });
  }

  getApplicationStatusLabel(programme: Programme): string {
    return this.applicationStatusByUniversityId.get(programme.universityId) ?? 'Date unavailable';
  }

  isApplicationClosed(programme: Programme): boolean {
    return this.getApplicationStatusLabel(programme) === 'Closed';
  }

  getEligibilityStatus(programme: Programme): EligibilityStatus {
    return this.eligibilityByProgrammeId.get(programme.id) ?? 'incomplete';
  }

  getEligibilityLabel(programme: Programme): string {
    if (this.isCheckingEligibility) return 'Checking eligibility…';

    switch (this.getEligibilityStatus(programme)) {
      case 'qualified':
        return 'You qualify';
      case 'not-qualified':
        return 'Requirement not met';
      default:
        return 'Add subjects to check eligibility';
    }
  }

  getAdmissionScoreLabel(programme: Programme): string {
    if (programme.universityName === 'Nelson Mandela University') return 'AS';
    if (programme.universityName === 'University of Cape Town') return 'Sub-minimum APS';
    return 'APS';
  }

  getAdmissionScoreDisplay(programme: Programme): string {
    return programme.apsScore > 0 ? programme.apsScore.toString() : 'N/A';
  }

  getUserApsDisplay(programme: Programme): string | null {
    const result = this.userApsByUniversity.get(this.normalizeText(programme.universityName));
    if (!result) return null;

    const score = Number.isInteger(result.score)
      ? result.score.toFixed(0)
      : result.score.toFixed(1);
    const maximum = result.maxScore === null
      ? ''
      : `/${Number.isInteger(result.maxScore) ? result.maxScore.toFixed(0) : result.maxScore.toFixed(1)}`;
    const scoreLabel = programme.universityName === 'Nelson Mandela University' ? 'AS' : 'APS';
    return `Your ${scoreLabel} ${score}${maximum}`;
  }

  onContentScroll(event: CustomEvent): void {
    const detail = event.detail as { scrollTop?: number };
    this.showBackToTop = (detail.scrollTop ?? 0) > 500;
  }

  scrollToTop(): void {
    void this.content?.scrollToTop(450);
  }

  private async loadUserEligibility(user: User | null): Promise<void> {
    this.isLoggedIn = Boolean(user);
    this.isCheckingEligibility = Boolean(user);
    this.hasEligibilityData = false;
    this.userApsByUniversity.clear();
    this.eligibilityByProgrammeId.clear();

    if (!user) {
      this.eligibilityFilter = 'all';
      this.isCheckingEligibility = false;
      this.applyFilters();
      return;
    }

    try {
      const profile = await this.authService.getUser(user.email ?? '', user.uid) as {
        highSchoolSubjects?: Array<{ subject?: unknown; mark?: unknown }>;
      } | null;

      if (getAuth().currentUser?.uid !== user.uid) return;

      const subjects = Array.isArray(profile?.highSchoolSubjects)
        ? profile.highSchoolSubjects.reduce<ApsSubjectInput[]>((entries, item) => {
            const subject = typeof item.subject === 'string' ? item.subject.trim() : '';
            const mark = Number(item.mark);
            if (subject && Number.isFinite(mark) && mark >= 0 && mark <= 100) {
              entries.push({ subject, mark });
            }
            return entries;
          }, [])
        : [];

      this.hasEligibilityData = subjects.length >= 7;
      if (!this.hasEligibilityData) return;

      for (const universityName of new Set(this.allProgrammes.map((programme) => programme.universityName))) {
        const result = this.apsCalculationService.calculateForUniversity(universityName, subjects);
        if (typeof result.score === 'number' && Number.isFinite(result.score)) {
          this.userApsByUniversity.set(this.normalizeText(universityName), {
            score: result.score,
            maxScore: typeof result.maxScore === 'number' && Number.isFinite(result.maxScore)
              ? result.maxScore
              : null,
          });
        }
      }

      for (const programme of this.allProgrammes) {
        this.eligibilityByProgrammeId.set(programme.id, this.calculateEligibilityStatus(programme));
      }
    } catch (error) {
      console.error('Could not load programme eligibility:', error);
      this.hasEligibilityData = false;
    } finally {
      if (getAuth().currentUser?.uid === user.uid) {
        this.isCheckingEligibility = false;
        this.applyFilters();
      }
    }
  }

  private calculateEligibilityStatus(programme: Programme): EligibilityStatus {
    const aps = this.userApsByUniversity.get(this.normalizeText(programme.universityName))?.score;
    const requiredAps = Number(programme.apsScore);
    const hasApsRequirement = Number.isFinite(requiredAps) && requiredAps > 0;

    return !hasApsRequirement || (aps !== undefined && aps >= requiredAps)
      ? 'qualified'
      : 'not-qualified';
  }

  private parseUniversityDate(value: string): Date | null {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]);
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;

    return new Date(new Date().getFullYear(), month - 1, day);
  }

  private buildApplicationStatusLabel(university: University): string {
    const configuredStatus = university.status?.trim().toLowerCase();
    if (configuredStatus === 'closed') return 'Closed';

    const closingDate = this.parseUniversityDate(university.closingDate);
    if (closingDate && closingDate < this.getTodayDateOnly()) return 'Closed';
    return university.closingDate ? `Closes ${university.closingDate}` : 'Date unavailable';
  }

  private getTodayDateOnly(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private hasRequiredPasswordComplexity(password: string): boolean {
    return password.length >= 6
      && /[A-Z]/.test(password)
      && /[a-z]/.test(password)
      && /[^A-Za-z0-9]/.test(password);
  }

  private buildUniversityOptions(): string[] {
    const names = new Set(this.allProgrammes.map((programme) => programme.universityName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }
}
