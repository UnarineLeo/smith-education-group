import { SeoService } from '../services/seo.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonSelect, IonSelectOption, IonFab, IonFabButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, closeCircleOutline, arrowForwardOutline, arrowUpOutline, statsChartOutline, trendingUpOutline, calculatorOutline, gitNetworkOutline, codeSlashOutline, receiptOutline, flashOutline, leafOutline, schoolOutline } from 'ionicons/icons';
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
      "Taxation",
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

const universityModules = [
  {
    "name": "Statistics",
    "code": null,
    "university": "University of the Witwatersrand",
    "short": "Wits",
    "description": "Explore tutoring support for Statistics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Economics",
    "code": null,
    "university": "University of the Witwatersrand",
    "short": "Wits",
    "description": "Explore tutoring support for Economics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Accounting",
    "code": null,
    "university": "University of the Witwatersrand",
    "short": "Wits",
    "description": "Explore tutoring support for Accounting, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Informatics",
    "code": null,
    "university": "University of the Witwatersrand",
    "short": "Wits",
    "description": "Explore tutoring support for Informatics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Computer Science",
    "code": null,
    "university": "University of the Witwatersrand",
    "short": "Wits",
    "description": "Explore tutoring support for Computer Science, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Taxation",
    "code": null,
    "university": "University of the Witwatersrand",
    "short": "Wits",
    "description": "Explore tutoring support for Taxation, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Statistics",
    "code": null,
    "university": "University of Cape Town",
    "short": "UCT",
    "description": "Explore tutoring support for Statistics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Economics",
    "code": null,
    "university": "University of Cape Town",
    "short": "UCT",
    "description": "Explore tutoring support for Economics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Accounting",
    "code": null,
    "university": "University of Cape Town",
    "short": "UCT",
    "description": "Explore tutoring support for Accounting, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Informatics",
    "code": null,
    "university": "University of Cape Town",
    "short": "UCT",
    "description": "Explore tutoring support for Informatics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Computer Science",
    "code": null,
    "university": "University of Cape Town",
    "short": "UCT",
    "description": "Explore tutoring support for Computer Science, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Taxation",
    "code": null,
    "university": "University of Cape Town",
    "short": "UCT",
    "description": "Explore tutoring support for Taxation, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Statistics",
    "code": null,
    "university": "Stellenbosch University",
    "short": "Stellies",
    "description": "Explore tutoring support for Statistics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Economics",
    "code": null,
    "university": "Stellenbosch University",
    "short": "Stellies",
    "description": "Explore tutoring support for Economics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Accounting",
    "code": null,
    "university": "Stellenbosch University",
    "short": "Stellies",
    "description": "Explore tutoring support for Accounting, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Informatics",
    "code": null,
    "university": "Stellenbosch University",
    "short": "Stellies",
    "description": "Explore tutoring support for Informatics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Computer Science",
    "code": null,
    "university": "Stellenbosch University",
    "short": "Stellies",
    "description": "Explore tutoring support for Computer Science, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Taxation",
    "code": null,
    "university": "Stellenbosch University",
    "short": "Stellies",
    "description": "Explore tutoring support for Taxation, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Statistics",
    "code": null,
    "university": "University of Pretoria",
    "short": "UP",
    "description": "Explore tutoring support for Statistics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Economics",
    "code": null,
    "university": "University of Pretoria",
    "short": "UP",
    "description": "Explore tutoring support for Economics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Accounting",
    "code": null,
    "university": "University of Pretoria",
    "short": "UP",
    "description": "Explore tutoring support for Accounting, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Informatics",
    "code": null,
    "university": "University of Pretoria",
    "short": "UP",
    "description": "Explore tutoring support for Informatics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Computer Science",
    "code": null,
    "university": "University of Pretoria",
    "short": "UP",
    "description": "Explore tutoring support for Computer Science, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Taxation",
    "code": null,
    "university": "University of Pretoria",
    "short": "UP",
    "description": "Explore tutoring support for Taxation, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Statistics",
    "code": null,
    "university": "Varsity College",
    "short": "Varsity College",
    "description": "Explore tutoring support for Statistics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Economics",
    "code": null,
    "university": "Varsity College",
    "short": "Varsity College",
    "description": "Explore tutoring support for Economics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Accounting",
    "code": null,
    "university": "Varsity College",
    "short": "Varsity College",
    "description": "Explore tutoring support for Accounting, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Informatics",
    "code": null,
    "university": "Varsity College",
    "short": "Varsity College",
    "description": "Explore tutoring support for Informatics, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Computer Science",
    "code": null,
    "university": "Varsity College",
    "short": "Varsity College",
    "description": "Explore tutoring support for Computer Science, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  },
  {
    "name": "Taxation",
    "code": null,
    "university": "Varsity College",
    "short": "Varsity College",
    "description": "Explore tutoring support for Taxation, with help working through concepts, practice questions and revision. Share your module outline so we can confirm suitable support."
  }
];

const schoolSubjects = [
  "Physics",
  "Mathematics",
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
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-universities',
  templateUrl: 'universities.page.html',
  styleUrls: ['universities.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IonContent, IonCard, IonCardContent, IonButton, IonIcon, IonSelect, IonSelectOption, IonFab, IonFabButton, FooterComponent],
})
export class Universities implements OnInit {
  readonly seo = {
  "title": "University Modules & School Subjects | Smith Education Group",
  "description": "Explore support in Statistics, Economics, Accounting, Informatics, Computer Science and Taxation, plus school subjects for Grades 4\u201312.",
  "path": "/tabs/universities",
  "index": true
};
  @ViewChild(IonContent) private content?: IonContent;
  readonly subjectIcons: Record<string, string> = {
    Statistics: 'stats-chart-outline',
    Economics: 'trending-up-outline',
    Accounting: 'calculator-outline',
    Informatics: 'git-network-outline',
    'Computer Science': 'code-slash-outline',
    Taxation: 'receipt-outline',
    Physics: 'flash-outline',
    Maths: 'calculator-outline',
    'Life Science': 'leaf-outline',
  };
  readonly showFilters = false;
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

  constructor(private route: ActivatedRoute, private seoService: SeoService) {
    addIcons({ searchOutline, closeCircleOutline, arrowForwardOutline, arrowUpOutline, statsChartOutline, trendingUpOutline, calculatorOutline, gitNetworkOutline, codeSlashOutline, receiptOutline, flashOutline, leafOutline, schoolOutline });
  }

  ngOnInit(): void {
    this.seoService.update(this.seo);
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

  ionViewWillEnter(): void { this.seoService.update(this.seo); }

  ionViewDidEnter(): void { void this.content?.scrollToTop(0); }

  scrollToTop(): void {
    void this.content?.scrollToTop(450);
  }
}
