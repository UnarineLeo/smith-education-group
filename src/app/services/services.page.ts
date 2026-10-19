import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';
import { DetailPage } from '../shared/detail-page';
const services = [
  {
    "title": "University Tutoring",
    "icon": "school-outline",
    "text": "Expert support for the modules that matter to you.",
    "detail": "Work through challenging concepts, practise module questions, and build a study plan around your university coursework."
  },
  {
    "title": "School Tutoring",
    "icon": "school-outline",
    "text": "Personalised subject support for Grades 4–12.",
    "detail": "Build understanding in Maths, Physics, Economics, Life Science and Accounting, with lessons suited to the learner’s grade and curriculum. Confirm subject availability for your grade on enquiry."
  },
  {
    "title": "Private Tutoring",
    "icon": "people-outline",
    "text": "One-on-one sessions tailored to your learning needs.",
    "detail": "Individual learning support shaped around your goals, pace, and areas of difficulty. Enquire about subject and tutor availability."
  },
  {
    "title": "Revision Camps",
    "icon": "calendar-outline",
    "text": "Focused preparation. A more confident exam season.",
    "detail": "Structured revision covering core concepts, practice questions, and exam technique. Enquire about upcoming dates and subjects."
  },
  {
    "title": "Academic Workshops",
    "icon": "bar-chart-outline",
    "text": "Build study skills that stay with you.",
    "detail": "Explore time management, effective note-taking, academic writing, and exam preparation in guided group sessions."
  },
  {
    "title": "Recorded Learning Packages",
    "icon": "play-circle-outline",
    "text": "Revisit the lesson. Learn at your own pace.",
    "detail": "Register your interest in recorded lessons and supporting study materials for your module."
  },
  {
    "title": "Learning & Development",
    "icon": "bulb-outline",
    "text": "More opportunities to learn and grow.",
    "detail": "Tell us about your academic and career goals to discuss your learning and development needs."
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

const schoolSubjects = [
  "Physics",
  "Maths",
  "Economics",
  "Life Science",
  "Accounting"
];

const schoolGrades = [
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12
];

@Component({ selector: 'app-services', standalone: true, host: { class: 'education-content' }, imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, FooterComponent], templateUrl: './services.page.html', styleUrls: ['./services.page.scss'] })
export class ServicesPage extends DetailPage {
  readonly pageTitle = "Our Services";
  readonly pageDescription = "Support for every stage of your academic journey.";
  services = services;
  universitySubjects = universitySubjects;
  schoolSubjects = schoolSubjects;
  schoolGrades = schoolGrades;
  schoolGrade = 4;
}
