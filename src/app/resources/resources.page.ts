import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';
import { DetailPage } from '../shared/detail-page';
const articles = [
  {
    "title": "10 effective study tips for university success",
    "category": "Study Tips",
    "image": "study.jpg",
    "intro": "Small, consistent habits make your study time more purposeful.",
    "paragraphs": [
      "Set one clear goal for each study session. Break larger assignments into manageable tasks, and use a weekly plan to spread the work.",
      "Test yourself from memory before checking your notes. Explain a concept aloud, practise a question, or write down what you remember.",
      "Space your revision across several days. Mix practice with short breaks, review the areas you find difficult, and ask for help when a concept remains unclear."
    ]
  },
  {
    "title": "How to prepare for your final exams",
    "category": "Exam Preparation",
    "image": "campus",
    "intro": "Give your revision a clear structure before exam season arrives.",
    "paragraphs": [
      "Start with your official module outline and exam timetable. List the topics you need to revise and prioritise areas where you feel least confident.",
      "Use permitted past papers and practice questions to identify gaps. Try some questions under timed conditions, then review your reasoning carefully.",
      "Prepare what you need the day before each exam. Check the venue or online arrangements and leave time to rest."
    ]
  },
  {
    "title": "Understanding financial accounting",
    "category": "Module Guides",
    "image": "study.jpg",
    "intro": "Build a foundation before moving on to more complex questions.",
    "paragraphs": [
      "Begin with the relationship between assets, liabilities, and equity. Identify what each transaction changes before deciding how to record it.",
      "Work through a small example from the journal to the ledger and then to the financial statements. Keep your workings clear so you can trace mistakes.",
      "Use the terminology and accounting standards prescribed by your module. Bring specific questions to your lecturer or tutor."
    ]
  },
  {
    "title": "Managing your time as a university student",
    "category": "University Life",
    "image": "campus",
    "intro": "Make room for study, deadlines, and life beyond the classroom.",
    "paragraphs": [
      "Put your fixed commitments into a weekly calendar, then add realistic study blocks. Include travel, meals, and rest.",
      "Choose a small number of priorities each day. Leave some spare time for tasks that take longer than expected.",
      "Review the plan at the end of the week. Adjust the workload instead of treating an unfinished task as a failure."
    ]
  },
  {
    "title": "Common mistakes to avoid in exams",
    "category": "Exam Preparation",
    "image": "study.jpg",
    "intro": "A careful approach can help you show what you know.",
    "paragraphs": [
      "Read the instructions before starting and note the mark allocation. Budget your time across questions.",
      "Show your reasoning clearly and check that you have answered the question being asked. Include units and labels where needed.",
      "If time allows, review your answers for missing steps and simple calculation errors."
    ]
  },
  {
    "title": "Building your personal study toolkit",
    "category": "Study Tips",
    "image": "campus",
    "intro": "A few well-chosen resources can support a consistent routine.",
    "paragraphs": [
      "Start with your prescribed materials and official university learning platform. Organise notes by module and topic.",
      "Keep a list of questions, a revision timetable, and a record of practice problems. These can be paper-based or digital.",
      "Check unfamiliar information against your course materials and ask your lecturer about reliable supplementary resources."
    ]
  }
];

@Component({ selector: 'app-resources', standalone: true, host: { class: 'education-content' }, imports: [CommonModule, RouterLink, IonContent, IonIcon, FooterComponent], templateUrl: './resources.page.html', styleUrls: ['./resources.page.scss'] })
export class ResourcesPage extends DetailPage {
  readonly seo = {
  "title": "Study Resources | Smith Education Group",
  "description": "Explore study tips, exam preparation advice and practical academic learning guides from Smith Education Group.",
  "path": "/tabs/resources",
  "index": false
};
  readonly pageTitle = "Academic Resources";
  readonly pageDescription = "Study tips, fresh perspectives, and practical guides.";
  articles = articles;
  category = 'All';
  categories = ['All', 'Study Tips', 'Exam Preparation', 'University Life', 'Module Guides'];
  get filteredArticles() { return this.articles.filter(a => this.category === 'All' || a.category === this.category); }
}
