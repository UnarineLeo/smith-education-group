import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonIcon, IonCard, IonCardContent, IonButton, IonSelect, 
 IonSelectOption, IonCardTitle, IonCardHeader } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { FooterComponent } from '../footer/footer.component';
import universitiesData from '../university-list/university-list.json';
import { PROVINCES, STUDY_FIELDS, University } from '../shared/app-data';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonCard, IonCardContent, CommonModule, FormsModule, IonIcon, 
    IonButton, IonSelect, IonSelectOption, IonCardTitle, IonCardHeader,
    FooterComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomePage implements OnInit, OnDestroy {
  private readonly featuredUniversityOrder: string[] = [
    'University of Cape Town',
    'University of the Witwatersrand',
    'University of Pretoria',
    'University of Johannesburg',
    'Stellenbosch University',
    'University of the Western Cape'
  ];

  featuredUniversities: University[] = this.getFeaturedUniversities();
  // Counter properties
  currentUniversities: number = 0;
  currentStudents: number = 0;
  currentSuccessRate: number = 0;
  targetUniversities: number = 12;
  targetStudents: number = 1000;
  targetSuccessRate: number = 99.8;
  private animationInterval: any;

  // Search properties
  searchQuery: string = '';
  selectedField: string = '';
  selectedProvince: string = '';

  // Study Fields Array
  studyFields = STUDY_FIELDS;

  // Provinces Array
  provinces = PROVINCES;

  constructor(
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.animateCounters();
  }

  ngOnDestroy() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
    }
  }

  animateCounters() {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    let currentStep = 0;

    this.animationInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.currentUniversities = Math.floor(this.targetUniversities * easeProgress);
      this.currentStudents = Math.floor(this.targetStudents * easeProgress);
      this.currentSuccessRate = Math.floor(this.targetSuccessRate * easeProgress);

      if (currentStep >= steps) {
        this.currentUniversities = this.targetUniversities;
        this.currentStudents = this.targetStudents;
        this.currentSuccessRate = this.targetSuccessRate;
        clearInterval(this.animationInterval);
      }
    }, stepDuration);
  }

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

    // Navigate to universities page with search params
    this.router.navigate(['/tabs/universities'], {
      queryParams: {
        q: this.searchQuery || undefined,
        field: this.selectedField || undefined,
        province: this.selectedProvince || undefined
      }
    });
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

  startApplication() {
    console.log('Starting application');
    // Navigate to application page
  }

  exploreUniversities() {
    this.router.navigate(['/tabs/universities']);
  }

  // Helper method to get label from value
  getFieldLabel(value: string): string {
    const field = this.studyFields.find(f => f.value === value);
    return field ? field.label : '';
  }

  getProvinceLabel(value: string): string {
    const province = this.provinces.find(p => p.value === value);
    return province ? province.label : '';
  }

  formatPrograms(fields: string[]): string {
    return fields
      .map(field => this.getFieldLabel(field) || field.replace(/-/g, ' '))
      .map(label => label.replace(/\b\w/g, char => char.toUpperCase()))
      .join(', ');
  }

  // Method to clear all filters
  clearFilters() {
    this.searchQuery = '';
    this.selectedField = '';
    this.selectedProvince = '';
  }

  private getFeaturedUniversities(): University[] {
    const universities = universitiesData as University[];
    const universitiesByName = new Map(universities.map(uni => [uni.name, uni]));

    return this.featuredUniversityOrder
      .map(name => universitiesByName.get(name))
      .filter((uni): uni is University => !!uni);
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

  moreinfo = [
    {
      iconFile: 'books.png',
      title: 'Centralized Applications',
      description: 'Learn more about Unipply and our mission to connect students with universities.'
    },
    {
      iconFile: 'track.png',
      title: 'Smart University Matching',
      description: 'Get assistance with your university applications and other inquiries.'    
    },
    {
      iconFile: 'document.png',
      title: 'Real-time Tracking',
      description: 'Access guides, articles, and tools to help you navigate the university application process.'
    },
    { 
      iconFile: 'document.png',
      title: 'Document Verification',
      description: 'Stay updated with the latest news and announcements from Unipply.'
    },
    {
      iconFile: 'people.png',
      title: 'Expert Guidance',
      description: 'Join our community of students and share your experiences and tips.'
    },
    {
      iconFile: 'shield.png',
      title: 'Secure & Trusted',
      description: 'Manage your account settings and preferences.'
    }
  ]

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