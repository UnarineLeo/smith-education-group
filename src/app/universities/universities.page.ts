import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import universitiesData from '../university-list/university-list.json';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, IonButton, IonIcon, IonSelect, IonSelectOption,
 } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { PROVINCES, STUDY_FIELDS, University } from '../shared/app-data';

@Component({
  selector: 'app-universities',
  templateUrl: 'universities.page.html',
  styleUrls: ['universities.page.scss'],
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
    IonCardContent, IonButton, IonIcon, IonSelect, IonSelectOption, FormsModule, CommonModule],
})
export class Universities {
  private readonly allUniversities: University[] = universitiesData as University[];
  featuredUniversities: University[] = [...this.allUniversities];

  searchQuery: string = '';
  selectedField: string = '';
  selectedProvince: string = '';

  // Provinces Array
  provinces = PROVINCES;
  
  constructor(private route: ActivatedRoute,
    private alertController: AlertController) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.searchQuery = params.get('q') ?? '';
      this.selectedField = params.get('field') ?? '';
      this.selectedProvince = params.get('province') ?? '';
      this.applyFilters();
    });
  }

   formatPrograms(fields: string[]): string {
    return fields
      .map(field => this.getFieldLabel(field) || field.replace(/-/g, ' '))
      .map(label => label.replace(/\b\w/g, char => char.toUpperCase()))
      .join(', ');
  }

  getFieldLabel(value: string): string {
    const field = this.studyFields.find(f => f.value === value);
    return field ? field.label : '';
  }

  studyFields = STUDY_FIELDS;

    searchUniversities() {
    // Validate that at least one search criteria is provided
    if (!this.searchQuery && !this.selectedField && !this.selectedProvince) {
      this.showAlert('Please enter a search term or select filters');
      return;
    }

    console.log('Searching universities:', {
      query: this.searchQuery,
      field: this.selectedField,
      province: this.selectedProvince
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
    this.selectedField = '';
    this.selectedProvince = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const selectedField = this.selectedField.trim().toLowerCase();
    const selectedProvince = this.selectedProvince.trim().toLowerCase();

    this.featuredUniversities = this.allUniversities.filter((uni) => {
      const matchesField = !selectedField || uni.fields.some((field) => field.toLowerCase() === selectedField);
      const matchesProvince = !selectedProvince || this.toSlug(uni.province) === selectedProvince;

      if (!query) {
        return matchesField && matchesProvince;
      }

      const searchText = [
        uni.name,
        uni.suburb,
        uni.province,
        ...uni.fields,
        this.formatPrograms(uni.fields)
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = searchText.includes(query);
      return matchesQuery && matchesField && matchesProvince;
    });
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
    const parsedDate = new Date(`${dateString}T00:00:00`);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
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

    if (openingDate && openingDate < today) {
      if (closingDate && closingDate < today) {
        return { label: 'Application Status', value: 'Closed' };
      }

      if (closingDate && closingDate > today) {
        return { label: 'Application Deadline', value: this.formatDate(closingDate) };
      }

      if (!closingDate) {
        return { label: 'Application Status', value: 'Open' };
      }

      return { label: 'Application Deadline', value: this.formatDate(closingDate) };
    }

    if (openingDate && openingDate >= today) {
      return { label: 'Application Opening Date', value: this.formatDate(openingDate) };
    }

    return { label: 'Application Status', value: uni.status || 'Closed' };
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
