import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonBackButton, IonChip, IonLabel } from '@ionic/angular/standalone';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { calendarOutline, cashOutline, openOutline, sendOutline } from 'ionicons/icons';
import { University } from '../shared/app-data';
import universitiesData from '../university-list/university-list.json';

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
    IonBackButton,
    IonChip,
    IonLabel,
    RouterLink
  ],
})
export class ProspectusViewerComponent implements OnInit {
  university: University | null = null;

  safePdfUrl: SafeResourceUrl | null = null;
  viewerLink: string | null = null;
  openLink: string | null = null;
  isPhoneDevice = false;

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {
    addIcons({ openOutline, calendarOutline, cashOutline, sendOutline });
    this.isPhoneDevice = this.detectPhoneDevice();
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number.parseInt(params.get('id') ?? '', 10);
      const universities = universitiesData as University[];
      this.university = universities.find((uni) => uni.id === id) ?? null;
      this.viewerLink = this.buildViewerLink(this.university);
      this.openLink = this.getOpenLink(this.university);
      this.safePdfUrl = this.viewerLink
        ? this.sanitizer.bypassSecurityTrustResourceUrl(this.viewerLink)
        : null;
    });
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

    const normalized = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${normalized}`;
  }
}
