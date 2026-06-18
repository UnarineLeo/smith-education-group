import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  closeCircleOutline,
  schoolOutline,
  timeOutline,
  calculatorOutline,
  checkmarkCircleOutline,
  openOutline
} from 'ionicons/icons';
import programmesData from '../shared/programme-list.json';
import { FACULTIES, getLevelLabel, Programme, QUALIFICATION_TYPES } from '../shared/programme-data';

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
    IonLabel
  ],
})
export class Programmes implements OnInit {
  private readonly allProgrammes: Programme[] = programmesData as Programme[];

  filteredProgrammes: Programme[] = [...this.allProgrammes];

  searchQuery = '';
  selectedUniversities: string[] = [];
  selectedFaculties: string[] = [];
  selectedQualificationTypes: string[] = [];
  myAps: number | null = null;

  readonly universityOptions: string[] = this.buildUniversityOptions();
  readonly facultyOptions: string[] = FACULTIES;
  readonly qualificationTypeOptions: string[] = QUALIFICATION_TYPES;
  readonly getLevelLabel = getLevelLabel;

  constructor(private router: Router) {
    addIcons({
      searchOutline,
      closeCircleOutline,
      schoolOutline,
      timeOutline,
      calculatorOutline,
      checkmarkCircleOutline,
      openOutline
    });
  }

  ngOnInit(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const universitySet = new Set(this.selectedUniversities);
    const facultySet = new Set(this.selectedFaculties);
    const qualificationSet = new Set(this.selectedQualificationTypes);
    const aps = this.myAps;

    this.filteredProgrammes = this.allProgrammes.filter((programme) => {
      const matchesUniversity = !universitySet.size || universitySet.has(programme.universityName);
      const matchesFaculty = !facultySet.size || facultySet.has(programme.faculty);
      const matchesQualification = !qualificationSet.size || qualificationSet.has(programme.qualificationType);
      const matchesAps = aps === null || Number.isNaN(aps) || programme.apsScore <= aps;

      if (!matchesUniversity || !matchesFaculty || !matchesQualification || !matchesAps) {
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
    this.myAps = null;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.selectedUniversities.length ||
      this.selectedFaculties.length ||
      this.selectedQualificationTypes.length ||
      this.myAps !== null
    );
  }

  hasApsInput(): boolean {
    return this.myAps !== null && !Number.isNaN(this.myAps);
  }

  meetsAps(programme: Programme): boolean {
    return this.hasApsInput() && (this.myAps as number) >= programme.apsScore;
  }

  truncate(text: string, max = 150): string {
    if (text.length <= max) {
      return text;
    }

    return `${text.slice(0, max).trimEnd()}…`;
  }

  viewUniversity(programme: Programme): void {
    void this.router.navigate(['/tabs/prospectus', programme.universityId]);
  }

  private buildUniversityOptions(): string[] {
    const names = new Set(this.allProgrammes.map((programme) => programme.universityName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }
}
