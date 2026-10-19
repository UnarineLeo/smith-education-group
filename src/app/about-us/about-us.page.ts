import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';
import { ContentPage } from '../shared/content-page';

@Component({ selector: 'app-about-us', standalone: true, host: { class: 'education-content' }, imports: [CommonModule, RouterLink, IonContent, IonIcon, FooterComponent], templateUrl: './about-us.page.html', styleUrls: ['./about-us.page.scss'] })
export class AboutUsPage extends ContentPage {
  readonly seo = {
  "title": "About Smith Education Group | Tutoring & Academic Support",
  "description": "Meet Smith Education Group, a South African education company supporting school and university learners through personalised tutoring, revision and mentorship.",
  "path": "/tabs/about-us",
  "index": true
};
  readonly pageTitle = "About Smith Education Group";
  readonly pageDescription = "Empowering Minds. Building Futures.";
}
