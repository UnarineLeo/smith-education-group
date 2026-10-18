import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonSelect, IonSelectOption, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, closeCircleOutline, arrowForwardOutline, arrowUpOutline } from 'ionicons/icons';
import { universities, universityModules, schoolSubjects, schoolGrades } from '../education/education.data';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-universities',
  templateUrl: 'universities.page.html',
  styleUrls: ['../programmes/programmes.page.scss', 'universities.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonSelect, IonSelectOption, IonFab, IonFabButton, FooterComponent],
})
export class Universities implements OnInit {
  @ViewChild(IonContent) private content?: IonContent;
  readonly universityOptions = universities;
  readonly modules = universityModules;
  readonly moduleOptions = [...new Set([...this.modules.map(module => module.name), ...schoolSubjects])].sort();
  filteredModules = [...this.modules];
  readonly schoolSubjects = schoolSubjects;
  readonly schoolGrades = schoolGrades;
  selectedGrade = 10;
  get visibleModuleNames(): string[] { return [...new Set(this.filteredModules.map(module => module.name))]; }
  get visibleSchoolSubjects(): string[] {
    const query = this.searchQuery.trim().toLowerCase();
    return this.schoolSubjects.filter(subject => (!this.selectedModules.length || this.selectedModules.includes(subject)) && (!query || subject.toLowerCase().includes(query)));
  }
  searchQuery = '';
  selectedUniversities: string[] = [];
  selectedModules: string[] = [];
  showBackToTop = false;

  constructor(private route: ActivatedRoute) {
    addIcons({ searchOutline, closeCircleOutline, arrowForwardOutline, arrowUpOutline });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const requested = params.get('university')?.trim();
      const match = universities.find(uni => [uni.name, uni.short].some(value => value.toLowerCase() === requested?.toLowerCase()));
      this.selectedUniversities = requested ? [match?.name ?? requested] : [];
      this.searchQuery = params.get('q') ?? '';
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredModules = this.modules.filter(module =>
      (!this.selectedUniversities.length || this.selectedUniversities.includes(module.university)) &&
      (!this.selectedModules.length || this.selectedModules.includes(module.name)) &&
      (!query || [module.name, module.university, module.short, module.description].join(' ').toLowerCase().includes(query))
    );
  }

  hasActiveFilters(): boolean {
    return Boolean(this.searchQuery || this.selectedUniversities.length || this.selectedModules.length);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedUniversities = [];
    this.selectedModules = [];
    this.applyFilters();
  }

  onContentScroll(event: CustomEvent): void {
    this.showBackToTop = (event.detail.scrollTop ?? 0) > 500;
  }

  scrollToTop(): void {
    void this.content?.scrollToTop(450);
  }
}
