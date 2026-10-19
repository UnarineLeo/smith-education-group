import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';
import { DetailPage } from '../shared/detail-page';
interface Tutor { name: string; initials: string; subject: string; subjects: string; qualification: string; universities: string[]; }
const tutors: Tutor[] = ['Statistics', 'Economics', 'Accounting', 'Informatics', 'Computer Science', 'Taxation', 'Physics', 'Maths', 'Life Science'].map(subject => ({
  name: `${subject} tutor`, initials: subject.slice(0, 2).toUpperCase(), subject,
  subjects: subject, qualification: 'Personalised academic support', universities: []
}));

const universities = [
  {
    "name": "University of the Witwatersrand",
    "short": "Wits",
    "image": "assets/logos/wits.svg",
    "province": "Gauteng",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  },
  {
    "name": "University of Cape Town",
    "short": "UCT",
    "image": "assets/logos/uct.svg",
    "province": "Western Cape",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  },
  {
    "name": "Stellenbosch University",
    "short": "Stellies",
    "image": "assets/logos/su.svg",
    "province": "Western Cape",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  },
  {
    "name": "University of Pretoria",
    "short": "UP",
    "image": "assets/logos/up.svg",
    "province": "Gauteng",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  },
  {
    "name": "Varsity College",
    "short": "Varsity College",
    "image": "",
    "province": "Multiple provinces",
    "modules": [
      "Statistics",
      "Economics",
      "Accounting",
      "Informatics",
      "Computer Science",
      "Taxation"
    ]
  }
];

const universitySubjects = [
  "Statistics",
  "Economics",
  "Accounting",
  "Informatics",
  "Computer Science",
  "Taxation"
];

@Component({ selector: 'app-tutors', standalone: true, host: { class: 'education-content' }, imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, IonSelect, IonSelectOption, FooterComponent], templateUrl: './tutors.page.html', styleUrls: ['./tutors.page.scss'] })
export class TutorsPage extends DetailPage {
  readonly showFilters = false;
  readonly pageTitle = "Find Your Tutor";
  readonly pageDescription = "Personalised subject support. A shared commitment to your progress.";
  tutors = tutors;
  universities = universities;
  tutorSearch = '';
  selectedTutorSubjects: string[] = [];
  selectedTutorUniversities: string[] = [];
  tutorSubjects = [...new Set(tutors.flatMap(tutor => tutor.subjects.split(' · ')))].sort();
  get filteredTutors() {
    const query = this.tutorSearch.trim().toLowerCase();
    return this.tutors.filter(tutor =>
      (!this.selectedTutorUniversities.length || universitySubjects.includes(tutor.subject)) &&
      (!this.selectedTutorSubjects.length || tutor.subjects.split(' · ').some(subject => this.selectedTutorSubjects.includes(subject))) &&
      (!query || [tutor.name, tutor.subjects, tutor.qualification, ...tutor.universities].join(' ').toLowerCase().includes(query))
    );
  }
  hasTutorFilters() { return Boolean(this.tutorSearch || this.selectedTutorSubjects.length || this.selectedTutorUniversities.length); }
  resetTutorFilters() { this.tutorSearch = ''; this.selectedTutorSubjects = []; this.selectedTutorUniversities = []; }
}
