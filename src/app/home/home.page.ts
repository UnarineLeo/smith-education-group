import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';
import { ContentPage } from '../shared/content-page';
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
  }
];

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
    "image": "assets/logos/uct.png",
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
    "image": "assets/logos/su.jpg",
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
    "image": "assets/logos/up.png",
    "province": "Gauteng",
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

@Component({ selector: 'app-home', standalone: true, host: { class: 'education-content' }, imports: [CommonModule, RouterLink, IonContent, IonIcon, FooterComponent], templateUrl: './home.page.html', styleUrls: ['./home.page.scss'] })
export class HomePage extends ContentPage {
  readonly pageTitle = "Empowering students. Building brighter futures.";
  readonly pageDescription = "Academic support, personal guidance, and a little more confidence for the journey ahead.";
  readonly testimonials = [
  {
    "name": "Thabo M.",
    "context": "University Student",
    "quote": "I used to struggle with Statistics and Economics, especially when it came to calculations and understanding graphs. The tutors explained everything in a way that actually made sense. I feel much more confident going into tests now."
  },
  {
    "name": "Lerato P.",
    "context": "Accounting Student",
    "quote": "Accounting was one of my biggest challenges until I started attending these tutoring sessions. The tutor was patient and took me through each topic step by step. I finally understand financial statements and how to approach exam questions."
  },
  {
    "name": "Naledi K.",
    "context": "Informatics Student",
    "quote": "The Informatics sessions really helped me understand databases, SQL and systems analysis. I liked that we worked through practical examples instead of just going over theory. It made my assignments so much easier to tackle."
  },
  {
    "name": "Sipho D.",
    "context": "Computer Science Student",
    "quote": "I was completely lost when it came to programming and data structures. My tutor helped me understand the logic behind the code instead of just memorising solutions. I'm now able to solve problems on my own, which is a huge improvement."
  },
  {
    "name": "Amanda N.",
    "context": "Taxation Student",
    "quote": "Taxation can be overwhelming with all the rules and calculations. The tutoring sessions helped me understand how to apply the concepts to different scenarios. The exam preparation was especially helpful, and I went into my assessment feeling prepared."
  }
];
  index = 0;
  move(step: number): void { this.index = (this.index + step + this.testimonials.length) % this.testimonials.length; }
  services = services;
  universities = universities.filter(university => ['Wits', 'UCT', 'Stellies', 'UP'].includes(university.short));
  scrollUniversities(track: HTMLElement, direction: number) {
    const end = track.scrollWidth - track.clientWidth;
    const next = direction > 0 && track.scrollLeft >= end - 2 ? 0
      : direction < 0 && track.scrollLeft <= 2 ? end
      : track.scrollLeft + direction * track.clientWidth;
    track.scrollTo({ left: next, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}
