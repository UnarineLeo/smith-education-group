import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonBackButton, IonBadge, IonChip, IonLabel } from '@ionic/angular/standalone';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { calendarOutline, cashOutline, openOutline } from 'ionicons/icons';
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
    IonBadge,
    IonChip,
    IonLabel,
    RouterLink
  ],
})
export class ProspectusViewerComponent implements OnInit {
  university: University | null = null;

  safePdfUrl: SafeResourceUrl | null = null;

  constructor(
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {
    addIcons({ openOutline, calendarOutline, cashOutline });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number.parseInt(params.get('id') ?? '', 10);
      const universities = universitiesData as University[];
      this.university = universities.find((uni) => uni.id === id) ?? null;

      this.safePdfUrl = this.university?.brochure_asset
      ? this.sanitizer.bypassSecurityTrustResourceUrl(this.university.brochure_asset)
      : null;
    });
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
}
