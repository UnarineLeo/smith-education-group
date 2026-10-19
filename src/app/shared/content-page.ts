import { Directive, inject, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import { schoolOutline, peopleOutline, calendarOutline, barChartOutline, playCircleOutline, bulbOutline, arrowForwardOutline, arrowBackOutline, checkmarkOutline, heartOutline, flagOutline, compassOutline, locationOutline, mailOutline, closeOutline, searchOutline, closeCircleOutline } from 'ionicons/icons';

@Directive()
export abstract class ContentPage implements OnInit {
  abstract readonly pageTitle: string;
  abstract readonly pageDescription: string;
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  constructor() {
    addIcons({ schoolOutline, peopleOutline, calendarOutline, barChartOutline, playCircleOutline, bulbOutline, arrowForwardOutline, arrowBackOutline, checkmarkOutline, heartOutline, flagOutline, compassOutline, locationOutline, mailOutline, closeOutline, searchOutline, closeCircleOutline });
  }
  ngOnInit(): void { this.updateMetadata(); }
  ionViewWillEnter(): void { this.updateMetadata(); }
  private updateMetadata(): void {
    this.title.setTitle(`${this.pageTitle} | Smith Education Group`);
    this.meta.updateTag({ name: 'description', content: this.pageDescription });
    this.meta.updateTag({ property: 'og:title', content: this.title.getTitle() });
    this.meta.updateTag({ property: 'og:description', content: this.pageDescription });
    this.meta.updateTag({ name: 'twitter:title', content: this.title.getTitle() });
    this.meta.updateTag({ name: 'twitter:description', content: this.pageDescription });
  }
}
