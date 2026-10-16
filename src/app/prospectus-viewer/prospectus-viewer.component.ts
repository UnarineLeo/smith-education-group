import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonChip, IonLabel, IonModal } from '@ionic/angular/standalone';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { getAuth, onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { calendarOutline, cashOutline, openOutline, arrowBackOutline, rocketOutline, calculatorOutline, personAddOutline, schoolOutline } from 'ionicons/icons';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { University } from '../shared/app-data';
import universitiesData from '../university-list/university-list.json';
import { AuthService } from '../services/auth.service';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { RegisterModalComponent } from '../register-modal/register-modal.component';
import { ApsCalculationResult, ApsCalculationService, ApsSubjectInput } from '../services/aps-calculation.service';

@Component({
  selector: 'app-prospectus-viewer',
  templateUrl: './prospectus-viewer.component.html',
  styleUrls: ['./prospectus-viewer.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonChip,
    IonLabel,
    IonModal,
    LoginModalComponent,
    RegisterModalComponent,
    RouterLink,
    PdfViewerModule
  ],
})
export class ProspectusViewerComponent implements OnInit, OnDestroy {
  university: University | null = null;

  safePdfUrl: SafeResourceUrl | null = null;
  viewerLink: string | null = null;
  openLink: string | null = null;
  mobilePdfUrl: string | null = null;
  mobilePdfLoadFailed = false;
  mobilePdfZoom = 1;
  readonly mobilePdfMinZoom = 0.6;
  readonly mobilePdfMaxZoom = 2.2;
  readonly mobilePdfZoomStep = 0.2;
  isPhoneDevice = false;
  isLoggedIn = false;
  currentUniversityApsResult: ApsCalculationResult | null = null;

  // Modal controls
  loginModalOpen = false;
  registerModalOpen = false;

  private authUnsubscribe?: Unsubscribe;

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private apsCalculationService: ApsCalculationService
  ) {
    addIcons({openOutline,arrowBackOutline,calendarOutline,cashOutline,rocketOutline,calculatorOutline,personAddOutline,schoolOutline});
    this.isPhoneDevice = this.detectPhoneDevice();
  }

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(getAuth(), () => {
      void this.refreshApsChipState();
    });

    this.route.paramMap.subscribe((params) => {
      const id = Number.parseInt(params.get('id') ?? '', 10);
      const universities = universitiesData as University[];
      this.university = universities.find((uni) => uni.id === id) ?? null;
      this.viewerLink = this.buildViewerLink(this.university);
      this.openLink = this.getOpenLink(this.university);
      this.mobilePdfUrl = this.getMobilePdfLink(this.university);
      this.mobilePdfLoadFailed = false;
      this.mobilePdfZoom = 1;
      this.safePdfUrl = this.viewerLink
        ? this.sanitizer.bypassSecurityTrustResourceUrl(this.viewerLink)
        : null;

      void this.refreshApsChipState();
    });
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
  }

  goBack(): void {
    const origin = this.route.snapshot.queryParamMap.get('from');
    const navigationId = Number(globalThis.history.state?.navigationId);
    const hasInAppHistory = Number.isFinite(navigationId) && navigationId > 1;

    if (hasInAppHistory && ['programmes', 'home', 'universities'].includes(origin ?? '')) {
      this.location.back();
      return;
    }

    if (origin === 'programmes') {
      const university = this.route.snapshot.queryParamMap.get('university');
      void this.router.navigate(['/tabs/programmes'], {
        queryParams: university ? { university } : undefined,
      });
      return;
    }

    if (origin === 'home') {
      void this.router.navigate(['/tabs/home']);
      return;
    }

    if (origin === 'universities') {
      void this.router.navigate(['/tabs/universities']);
      return;
    }

    if (hasInAppHistory) {
      this.location.back();
      return;
    }

    void this.router.navigate(['/tabs/universities']);
  }

  openLoginModal() {
    this.loginModalOpen = true;
  }

  openRegisterModal() {
    this.registerModalOpen = true;
  }

  async handleLoginDismiss(event: { action: string; payload?: { email?: string; password?: string } } | null) {
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
          await this.authService.loginFireAuth({
            email: event.payload.email,
            password: event.payload.password
          });
          this.loginModalOpen = false;
        } catch {
          // AuthService handles error toasts; keep modal open for correction.
        }
        break;
      default:
        this.loginModalOpen = false;
        break;
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
  } | null) {
    if (!event) {
      this.registerModalOpen = false;
      return;
    }

    switch (event.action) {
      case 'open-login':
        this.registerModalOpen = false;
        this.loginModalOpen = true;
        break;
      case 'google-register':
        await this.authService.googleSignIn();
        this.registerModalOpen = false;
        break;
      case 'register': {
        const payload = event.payload;

        if (!payload?.firstName || !payload?.surname || !payload?.email || !payload?.password || !payload?.confirmPassword) {
          await this.authService.presentToast('Please complete all required fields');
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
            courseChoices: payload.courseChoices ?? []
          });
          this.registerModalOpen = false;
        } catch {
          // AuthService handles error toasts; keep modal open for correction.
        }
        break;
      }
      default:
        this.registerModalOpen = false;
        break;
    }
  }

  get hasUniversityApsScore(): boolean {
    return this.currentUniversityApsResult?.score !== null && this.currentUniversityApsResult?.score !== undefined;
  }

  get shouldShowRegisterApsPrompt(): boolean {
    return !this.isLoggedIn;
  }

  get shouldShowAddMarksPrompt(): boolean {
    return this.isLoggedIn && !this.hasUniversityApsScore;
  }

  get universityApsDisplay(): string {
    const scoreLabel = this.university?.name === 'Nelson Mandela University' ? 'AS' : 'APS';
    if (!this.currentUniversityApsResult || this.currentUniversityApsResult.score === null || this.currentUniversityApsResult.score === undefined) {
      return `${scoreLabel} N/A`;
    }

    const score = this.currentUniversityApsResult.score;
    const formattedScore = Number.isInteger(score) ? score.toString() : score.toFixed(2).replace(/\.00$/, '');
    const suffix = this.currentUniversityApsResult.maxScore ? `/${this.currentUniversityApsResult.maxScore}` : '';
    return `${scoreLabel} ${formattedScore}${suffix}`;
  }

  onMobilePdfError(): void {
    this.mobilePdfLoadFailed = true;
  }

  zoomOutMobilePdf(): void {
    const nextZoom = this.mobilePdfZoom - this.mobilePdfZoomStep;
    this.mobilePdfZoom = Math.max(this.mobilePdfMinZoom, Number(nextZoom.toFixed(2)));
  }

  zoomInMobilePdf(): void {
    const nextZoom = this.mobilePdfZoom + this.mobilePdfZoomStep;
    this.mobilePdfZoom = Math.min(this.mobilePdfMaxZoom, Number(nextZoom.toFixed(2)));
  }

  resetMobilePdfZoom(): void {
    this.mobilePdfZoom = 1;
  }

  getApplyLink(): string {
    return this.university?.link || this.university?.webscrap_link || '#';
  }

  hasApplyLink(): boolean {
    return !!(this.university?.link || this.university?.webscrap_link);
  }

  getApplicationFeeDisplay(): string {
    if (!this.university) {
      return 'N/A';
    }

    if (this.university.application_fee === 0 || this.university.application_fee === null || this.university.application_fee === undefined) {
      return 'Free';
    }

    return `R${this.university.application_fee.toLocaleString()}`;
  }

  getDatesDisplay(): string {
    if (!this.university) {
      return 'N/A';
    }

    return `${this.university.openingDate} - ${this.university.closingDate}`;
  }

  getApplicationStatusDisplay(): string {
    if (!this.university) {
      return 'N/A';
    }

    const configuredStatus = (this.university.status ?? '').trim();
    if (configuredStatus) {
      return configuredStatus;
    }

    const openingDate = this.parseDate(this.university.openingDate);
    const closingDate = this.parseDate(this.university.closingDate);
    const today = this.getTodayDateOnly();

    const isOpenByOpening = !openingDate || today >= openingDate;
    const isOpenByClosing = !closingDate || today <= closingDate;
    return isOpenByOpening && isOpenByClosing ? 'Open' : 'Closed';
  }

  isApplicationOpen(): boolean {
    return this.getApplicationStatusDisplay().toLowerCase() === 'open';
  }

  private detectPhoneDevice(): boolean {
    const userAgent = navigator.userAgent || '';
    const isMobileUa = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent);
    const isSmallViewport = window.matchMedia('(max-width: 768px)').matches;
    return isMobileUa || isSmallViewport;
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) {
      return null;
    }

    const [dayPart, monthPart] = dateString.split('/');
    const day = Number.parseInt(dayPart, 10);
    const month = Number.parseInt(monthPart, 10);

    if (Number.isNaN(day) || Number.isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
      return null;
    }

    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month - 1, day);
  }

  private getTodayDateOnly(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private getOpenLink(university: University | null): string | null {
    if (!university) {
      return null;
    }

    if (this.isPhoneDevice) {
      return university.brochure_link || this.toAbsoluteUrl(university.brochure_asset) || null;
    }

    return this.toAbsoluteUrl(university.brochure_asset) || university.brochure_link || null;
  }

  private getMobilePdfLink(university: University | null): string | null {
    if (!university) {
      return null;
    }

    return this.toAbsoluteUrl(university.brochure_asset) || university.brochure_link || null;
  }

  private buildViewerLink(university: University | null): string | null {
    const preferredLink = this.getOpenLink(university);
    if (!preferredLink) {
      return null;
    }

    const isRemotePdf = /^https?:\/\//i.test(preferredLink) && /\.pdf($|\?)/i.test(preferredLink);
    if (this.isPhoneDevice && isRemotePdf) {
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(preferredLink)}`;
    }

    return preferredLink;
  }

  private toAbsoluteUrl(url?: string): string | null {
    if (!url) {
      return null;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    return new URL(url.replace(/^\/+/, ''), document.baseURI).href;
  }

  private async refreshApsChipState(): Promise<void> {
    const currentUser = getAuth().currentUser;
    this.isLoggedIn = Boolean(currentUser);
    this.currentUniversityApsResult = null;

    if (!currentUser || !this.university) {
      return;
    }

    try {
      const userData = await this.authService.getUser(currentUser.email ?? '', currentUser.uid) as {
        highSchoolSubjects?: Array<{ subject?: string; mark?: number }>;
      };

      const subjects = Array.isArray(userData?.highSchoolSubjects)
        ? userData.highSchoolSubjects
            .map((subject) => ({
              subject: (subject.subject ?? '').trim(),
              mark: Number(subject.mark)
            }))
            .filter((subject): subject is ApsSubjectInput =>
              subject.subject !== ''
              && Number.isFinite(subject.mark)
              && subject.mark >= 0
              && subject.mark <= 100
            )
        : [];

      if (subjects.length < 7) {
        return;
      }

      this.currentUniversityApsResult = this.apsCalculationService.calculateForUniversity(this.university.name, subjects);
    } catch {
      this.currentUniversityApsResult = null;
    }
  }
}
