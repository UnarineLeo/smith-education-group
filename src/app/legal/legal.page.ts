import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { IonContent } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';

type LegalView = 'terms' | 'privacy' | 'popia';

@Component({
  selector: 'app-legal', standalone: true,
  templateUrl: './legal.page.html', styleUrls: ['./legal.page.scss'],
  imports: [IonContent, RouterLink, FooterComponent],
})
export class LegalPage {
  activeView: LegalView = 'terms';
  readonly lastUpdated = '15 October 2026';
  readonly policies = [
    { key: 'privacy', title: 'Privacy Policy', path: '/privacy' },
    { key: 'terms', title: 'Terms of Service', path: '/terms' },
    { key: 'popia', title: 'POPIA Notice', path: '/popia' },
  ];
  readonly information = {
    privacy: { title: 'Privacy Policy', description: 'Your learning journey is personal. Here is how we handle the information you share with us.', summary: 'We use your information to respond to enquiries and support your learning. An enquiry saved on this website stays in your browser until you choose to contact us by email or WhatsApp.' },
    terms: { title: 'Terms of Service', description: 'Clear expectations for tutoring, revision support and using our website.', summary: 'Explore support for Grades 4–12 and university modules. Contact us to discuss your needs; a session is booked only once the details have been agreed with you.' },
    popia: { title: 'POPIA Notice', description: 'Understand your personal-information rights and how to get in touch about them.', summary: 'Smith Education Group (Pty) Ltd handles personal information in connection with tutoring enquiries and services. You can contact us about access, corrections or other privacy concerns.' },
  };
  constructor(route: ActivatedRoute, title: Title, meta: Meta) {
    route.url.subscribe(segments => {
      const path = segments[0]?.path;
      this.activeView = path === 'privacy' || path === 'popia' ? path : 'terms';
      title.setTitle(`${this.information[this.activeView].title} | Smith Education Group`);
      meta.updateTag({ name: 'description', content: this.information[this.activeView].description });
    });
  }
}
