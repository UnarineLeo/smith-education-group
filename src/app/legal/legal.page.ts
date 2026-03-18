import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/angular/standalone';

type LegalView = 'terms' | 'privacy';

@Component({
  selector: 'app-legal',
  templateUrl: './legal.page.html',
  styleUrls: ['./legal.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, RouterLink],
})
export class LegalPage {
  activeView: LegalView = 'terms';

  readonly effectiveDate = '18 March 2026';

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.url.subscribe((segments) => {
      const path = segments[0]?.path;
      this.activeView = path === 'privacy' ? 'privacy' : 'terms';
    });
  }

  async swapView(view: LegalView) {
    this.activeView = view;
    await this.router.navigate([view === 'privacy' ? '/privacy' : '/terms']);
  }
}
