import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';

type LegalView = 'terms' | 'privacy' | 'popia';

@Component({
  selector: 'app-legal',
  templateUrl: './legal.page.html',
  styleUrls: ['./legal.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton],
})
export class LegalPage {
  activeView: LegalView = 'terms';

  readonly effectiveDate = '18 March 2026';

  constructor(private route: ActivatedRoute, private router: Router) {
    this.route.url.subscribe((segments) => {
      const path = segments[0]?.path;
      if (path === 'privacy') {
        this.activeView = 'privacy';
        return;
      }

      if (path === 'popia') {
        this.activeView = 'popia';
        return;
      }

      this.activeView = 'terms';
    });
  }

  async swapView(view: LegalView) {
    this.activeView = view;
    const routeMap: Record<LegalView, string> = {
      terms: '/terms',
      privacy: '/privacy',
      popia: '/popia',
    };

    await this.router.navigate([routeMap[view]]);
  }

  onTabChange(value: string | number | null | undefined) {
    if (!this.isLegalView(value)) {
      return;
    }

    void this.swapView(value);
  }

  private isLegalView(value: string | number | null | undefined): value is LegalView {
    return value === 'terms' || value === 'privacy' || value === 'popia';
  }
}
