import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';
import { ContentPage } from '../shared/content-page';
const testimonials = [
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

@Component({ selector: 'app-success-stories', standalone: true, host: { class: 'education-content' }, imports: [CommonModule, RouterLink, IonContent, IonIcon, FooterComponent], templateUrl: './success-stories.page.html', styleUrls: ['./success-stories.page.scss'] })
export class SuccessStoriesPage extends ContentPage {
  readonly seo = {
  "title": "Student Testimonials | Smith Education Group",
  "description": "Read student feedback on Statistics, Economics, Accounting, Informatics, Computer Science and Taxation tutoring with Smith Education Group.",
  "path": "/tabs/success-stories",
  "index": true
};
  readonly pageTitle = "Student Testimonials";
  readonly pageDescription = "Personal experiences from the Smith Education Group community.";
  testimonials = testimonials;
}
