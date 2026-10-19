import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';
import { ContentPage } from '../shared/content-page';
interface Tutor {
  name: string;
  role: string;
  subjects: string[];
  universities: string[];
  image: string;
  rotate: boolean;
  biography: string[];
}
const tutors: Tutor[] = [
{
  "name": "Simile Fakazi",
  "role": "Accounting Tutor",
  "subjects": [
    "Accounting"
  ],
  "universities": [
    "University of Cape Town"
  ],
  "image": "assets/tutors/Simile Fakazi.jpeg",
  "rotate": false,
  "biography": [
    "Simile Fakazi is a dedicated and passionate tutor with a BCom in Management Studies, majoring in Accounting, from the University of Cape Town.",
    "With two years of tutoring experience and a background in academic mentorship, she is committed to helping learners build confidence, strengthen their understanding of challenging concepts, and achieve academic success.",
    "Her patient, supportive, and learner-centred approach allows her to adapt to different learning needs and empower students to reach their full potential."
  ]
},
  {
    "name": "Kamogelo Mothapo",
    "role": "Economics Tutor",
    "subjects": [
      "Economics"
    ],
    "universities": [
      "University of Pretoria"
    ],
    "image": "assets/tutors/Kamogelo Mothapo.jpeg",
    "rotate": false,
    "biography": [
      "Kamogelo holds a BCom degree in Economics, majoring in Statistics, and an Honours degree in Economics from the University of Pretoria. She is currently pursuing her Master's degree in Economics while working as a Graduate Trainee at FNB.",
      "With an excellent academic track record and a genuine passion for teaching, Kamogelo brings both academic knowledge and practical industry exposure to her tutoring. She is passionate about simplifying complex concepts, building students' confidence, and helping them achieve academic excellence."
    ]
  },
  {
    "name": "Nkosinathi Mathebula",
    "role": "Mathematics & Mathematical Statistics Tutor",
    "subjects": [
      "Mathematics",
      "Mathematical Statistics"
    ],
    "universities": [
      "University of Pretoria"
    ],
    "image": "assets/tutors/Nkosinathi Mathebula .jpeg",
    "rotate": true,
    "biography": [
      "Nkosinathi holds both a BCom degree and an Honours degree in Statistics and Data Science from the University of Pretoria. He currently works as a Supply Chain Graduate specialising in Data Science at Nestlé.",
      "Driven, ambitious, and passionate about education, Nkosinathi has experience helping students approach Mathematics and Statistics from a different perspective, making challenging concepts easier to understand and apply. He is committed to building students' confidence, strengthening their problem-solving skills, and helping them achieve academic excellence."
    ]
  },
  {
    "name": "Kamogelo Mbatha",
    "role": "Informatics & Information Systems Tutor",
    "subjects": [
      "Informatics",
      "Information Systems"
    ],
    "universities": [],
    "image": "assets/tutors/Kamogelo Mbatha.jpeg",
    "rotate": false,
    "biography": [
      "Kamogelo is a professional Software Developer with hands-on experience designing and building production-grade systems. Skilled in C#, Angular, SQL, and Node.js, he develops solutions ranging from enterprise platforms to modern web applications.",
      "Passionate about technology and education, Kamogelo brings real-world software engineering experience into his tutoring, helping students understand programming concepts, write clean and efficient code, and develop practical problem-solving skills. His approach bridges the gap between classroom learning and real-world software development."
    ]
  },
  {
    "name": "Karabo Matjila",
    "role": "Statistics & Mathematics Tutor",
    "subjects": [
      "Statistics",
      "Calculus",
      "Mathematics"
    ],
    "universities": [
      "University of Pretoria"
    ],
    "image": "assets/tutors/Karabo Matjila.jpeg",
    "rotate": false,
    "biography": [
      "Karabo holds a BCom degree in Statistics and Data Science from the University of Pretoria, where he is currently pursuing his Honours degree in the same field.",
      "Driven, ambitious, and passionate about education, Karabo has experience supporting students across various modules, particularly Statistics, Calculus, and Mathematics. He enjoys breaking down complex concepts into simpler, more manageable ideas, helping students strengthen their problem-solving skills, build confidence, and achieve academic success."
    ]
  },
  {
    "name": "Mpucuko Luthuli",
    "role": "Life Sciences & Physical Sciences Tutor",
    "subjects": [
      "Life Sciences",
      "Physical Sciences"
    ],
    "universities": [
      "University of KwaZulu-Natal"
    ],
    "image": "assets/tutors/Mpucuko Luthuli.jpeg",
    "rotate": false,
    "biography": [
      "Mpucuko is a sixth-year MBChB student at the University of KwaZulu-Natal (UKZN), with a strong passion for science, education, mentorship, and community development.",
      "With experience as an academic mentor and project manager under UKZN Enactus, Mpucuko brings valuable leadership, communication, and problem-solving skills to tutoring. Driven by a passion for empowering young minds, Mpucuko is committed to simplifying complex scientific concepts, building students' confidence, and inspiring the next generation of healthcare professionals and scientists."
    ]
  },
  {
    "name": "Kwanda Camane",
    "role": "Founder & Director | Mathematics (Grades 4–12) & Statistics Tutor",
    "subjects": [
      "Mathematics",
      "Statistics"
    ],
    "universities": [
      "University of Pretoria"
    ],
    "image": "assets/tutors/Kwanda Camane.jpeg",
    "rotate": false,
    "biography": [
      "Kwanda holds a BCom degree in Statistics and Data Science from the University of Pretoria and is a professional Data Engineer with experience across the financial services, insurance, and retail industries.",
      "With over five years of tutoring experience, Kwanda has helped numerous students overcome academic challenges, develop confidence, and achieve excellent academic results. His passion lies in making Mathematics and Statistics easier to understand, using practical examples and relatable teaching methods that encourage students to think critically and enjoy learning.",
      "In 2022, he founded what would later become Smith Education Group (Pty) Ltd, driven by a vision to make quality education accessible to learners from primary school through to university.",
      "As both an educator and technology professional, Kwanda is committed to combining academic excellence, innovation, and mentorship to help students reach their full potential and build brighter futures."
    ]
  },
  {
    "name": "Tristan Bosman",
    "role": "Statistics Tutor",
    "subjects": [
      "Statistics"
    ],
    "universities": [
      "University of Pretoria"
    ],
    "image": "assets/tutors/Tristan Bosman .jpeg",
    "rotate": false,
    "biography": [
      "Tristan is a student at the University of Pretoria, pursuing a career in Data Science with a keen interest in Quantitative Finance and Artificial Intelligence development.",
      "With a genuine passion for Statistics and education, Tristan is dedicated to helping students develop a deeper understanding of statistical concepts and their real-world applications. His engaging and approachable teaching style makes challenging topics easier to grasp, helping students build confidence, strengthen their analytical thinking, and develop a genuine appreciation for Statistics."
    ]
  }
];
const universities = [...new Set(tutors.flatMap(tutor => tutor.universities))].map(name => ({ name }));

@Component({ selector: 'app-tutors', standalone: true, host: { class: 'education-content' }, imports: [CommonModule, FormsModule, RouterLink, IonContent, IonIcon, IonSelect, IonSelectOption, FooterComponent], templateUrl: './tutors.page.html', styleUrls: ['./tutors.page.scss'] })
export class TutorsPage extends ContentPage {
  readonly showFilters = false;
  readonly pageTitle = "Meet Our Tutors";
  readonly pageDescription = "Personalised subject support. A shared commitment to your progress.";
  tutors = [...tutors.filter(tutor => tutor.name === 'Kwanda Camane'), ...tutors.filter(tutor => tutor.name !== 'Kwanda Camane')];
  universities = universities;
  private readonly expandedBiographies = new Set<string>();
  isBiographyExpanded(name: string): boolean { return this.expandedBiographies.has(name); }
  toggleBiography(name: string): void {
    if (this.expandedBiographies.has(name)) this.expandedBiographies.delete(name);
    else this.expandedBiographies.add(name);
  }
  tutorSearch = '';
  selectedTutorSubjects: string[] = [];
  selectedTutorUniversities: string[] = [];
  tutorSubjects = [...new Set(tutors.flatMap(tutor => tutor.subjects))].sort();
  get filteredTutors() {
    const query = this.tutorSearch.trim().toLowerCase();
    return this.tutors.filter(tutor =>
      (!this.selectedTutorUniversities.length || tutor.universities.some(university => this.selectedTutorUniversities.includes(university))) &&
      (!this.selectedTutorSubjects.length || tutor.subjects.some(subject => this.selectedTutorSubjects.includes(subject))) &&
      (!query || [tutor.name, tutor.role, ...tutor.subjects, ...tutor.biography, ...tutor.universities].join(' ').toLowerCase().includes(query))
    );
  }
  hasTutorFilters() { return Boolean(this.tutorSearch || this.selectedTutorSubjects.length || this.selectedTutorUniversities.length); }
  resetTutorFilters() { this.tutorSearch = ''; this.selectedTutorSubjects = []; this.selectedTutorUniversities = []; }
}
