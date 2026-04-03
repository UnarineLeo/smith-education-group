import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import universitiesData from '../university-list/university-list.json';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, IonButton, IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { PROVINCES, University } from '../shared/app-data';
import { FooterComponent } from '../footer/footer.component';

type ApplicationFeeFilter = 'free' | 'r100' | 'r200' | 'r300';

@Component({
  selector: 'app-universities',
  templateUrl: 'universities.page.html',
  styleUrls: ['universities.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardContent, IonButton, IonIcon, IonSelect, IonSelectOption, FormsModule, CommonModule, FooterComponent],
})
export class Universities {
  private readonly allUniversities: University[] = universitiesData as University[];
  featuredUniversities: University[] = [...this.allUniversities];

  searchQuery: string = '';
  selectedProvince: string = '';
  selectedApplicationFeeFilters: ApplicationFeeFilter[] = [];

  applicationFeeFilters: Array<{ label: string; value: ApplicationFeeFilter }> = [
    { label: 'Free', value: 'free' },
    { label: 'R100', value: 'r100' },
    { label: 'R200', value: 'r200' },
    { label: 'R300', value: 'r300' }
  ];

  // Provinces Array
  provinces = PROVINCES;
  
  constructor(private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.searchQuery = params.get('q') ?? '';
      this.selectedProvince = params.get('province') ?? '';
      const feesParam = params.get('fees') ?? '';
      this.selectedApplicationFeeFilters = feesParam
        .split(',')
        .map((value) => value.trim())
        .filter((value): value is ApplicationFeeFilter => this.isApplicationFeeFilter(value));
      this.applyFilters();
    });
  }

  openProspectus(uni: University) {
    this.router.navigate(['/tabs/prospectus', uni.id]);
  }

    searchUniversities() {
    // Validate that at least one search criteria is provided
      if (!this.searchQuery && !this.selectedProvince && this.selectedApplicationFeeFilters.length === 0) {
      this.showAlert('Please enter a search term or select filters');
      return;
    }

    console.log('Searching universities:', {
      query: this.searchQuery,
      province: this.selectedProvince,
      applicationFeeFilters: this.selectedApplicationFeeFilters
    });

    this.applyFilters();
  }

  async showAdvancedFilters() {
    const alert = await this.alertController.create({
      header: 'Advanced Filters',
      message: 'Advanced filtering options coming soon! Filter by tuition fees, acceptance rates, programs, and more.',
      buttons: ['OK']
    });

    await alert.present();
  }

  async showAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Search',
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedProvince = '';
    this.selectedApplicationFeeFilters = [];
    this.applyFilters();
  }

  private applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const selectedProvince = this.selectedProvince.trim().toLowerCase();
    const selectedFeeFilters = new Set(this.selectedApplicationFeeFilters);

    this.featuredUniversities = this.allUniversities.filter((uni) => {
      const matchesProvince = !selectedProvince || this.toSlug(uni.province) === selectedProvince;
      const matchesApplicationFee = this.matchesApplicationFeeFilters(uni, selectedFeeFilters);

      if (!query) {
        return matchesProvince && matchesApplicationFee;
      }

      const searchText = [
        uni.name,
        uni.suburb,
        uni.province
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = searchText.includes(query);
      return matchesQuery && matchesProvince && matchesApplicationFee;
    });
  }

  private matchesApplicationFeeFilters(uni: University, selectedFeeFilters: Set<ApplicationFeeFilter>): boolean {
    if (!selectedFeeFilters.size) {
      return true;
    }

    const fee = Number(uni.application_fee ?? 0);

    return Array.from(selectedFeeFilters).some((filter) => {
      if (filter === 'free') {
        return fee <= 0;
      }

      if (filter === 'r100') {
        return fee >= 100 && fee < 200;
      }

      if (filter === 'r200') {
        return fee >= 200 && fee < 300;
      }

      return fee >= 300;
    });
  }

  private isApplicationFeeFilter(value: string): value is ApplicationFeeFilter {
    return value === 'free' || value === 'r100' || value === 'r200' || value === 'r300';
  }

  private toSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;

    const [dayPart, monthPart] = dateString.split('/');
    const day = Number.parseInt(dayPart, 10);
    const month = Number.parseInt(monthPart, 10);

    if (Number.isNaN(day) || Number.isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
      return null;
    }

    const currentYear = new Date().getFullYear();
    return new Date(currentYear, month - 1, day);
  }

  private formatDate(date: Date | null): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  private getTodayDateOnly(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private getApplicationDisplay(uni: University): { label: string; value: string } {
    const openingDate = this.parseDate(uni.openingDate);
    const closingDate = this.parseDate(uni.closingDate);
    const today = this.getTodayDateOnly();

    const isOpenByOpening = !openingDate || today >= openingDate;
    const isOpenByClosing = !closingDate || today <= closingDate;
    const isOpen = isOpenByOpening && isOpenByClosing;

    return {
      label: 'Application Status',
      value: isOpen ? 'Open' : 'Closed'
    };
  }

  getApplicationMetricLabel(uni: University): string {
    return this.getApplicationDisplay(uni).label;
  }

  getApplicationMetricValue(uni: University): string {
    return this.getApplicationDisplay(uni).value;
  }

  isClosedStatusDisplay(uni: University): boolean {
    const label = this.getApplicationMetricLabel(uni);
    const value = this.getApplicationMetricValue(uni);
    return label === 'Application Status' && value.toLowerCase() === 'closed';
  }

  isOpenStatusDisplay(uni: University): boolean {
    const label = this.getApplicationMetricLabel(uni);
    const value = this.getApplicationMetricValue(uni);
    return label === 'Application Status' && value.toLowerCase() === 'open';
  }

  private formatDateToReadable(dateString: string): string {
    if (!dateString) return 'N/A';

    const [day, month] = dateString.split('/');
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getOrdinal = (n: number): string => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    if (monthNum < 1 || monthNum > 12) return 'N/A';

    const ordinal = getOrdinal(dayNum);
    const monthName = monthNames[monthNum - 1];

    return `${dayNum} ${monthName}`;
  }

  getYearAndDates(uni: University): string {
    const opening = this.formatDateToReadable(uni.openingDate);
    const closing = this.formatDateToReadable(uni.closingDate);
    return `${opening} - ${closing}`;
  }

  getApplicationFeeDisplay(uni: University): string {
    if (uni.application_fee === 0 || uni.application_fee === null || uni.application_fee === undefined) {
      return 'Free';
    }
    return `R${uni.application_fee.toLocaleString()}`;
  }
}
