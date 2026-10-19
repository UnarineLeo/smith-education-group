import { IonContent } from '@ionic/angular/standalone';
import { Directive, inject, OnInit, ViewChild } from '@angular/core';
import { SeoService, PageSeo } from '../services/seo.service';
import { addIcons } from 'ionicons';
import { schoolOutline, peopleOutline, calendarOutline, barChartOutline, playCircleOutline, bulbOutline, arrowForwardOutline, arrowBackOutline, checkmarkOutline, heartOutline, flagOutline, compassOutline, locationOutline, mailOutline, closeOutline, searchOutline, closeCircleOutline } from 'ionicons/icons';

@Directive()
export abstract class ContentPage implements OnInit {
  @ViewChild(IonContent) protected pageContent?: IonContent;
  ionViewDidEnter(): void { void this.pageContent?.scrollToTop(0); }
  abstract readonly pageTitle: string;
  abstract readonly pageDescription: string;
  abstract readonly seo: PageSeo;
  private readonly seoService = inject(SeoService);
  constructor() {
    addIcons({ schoolOutline, peopleOutline, calendarOutline, barChartOutline, playCircleOutline, bulbOutline, arrowForwardOutline, arrowBackOutline, checkmarkOutline, heartOutline, flagOutline, compassOutline, locationOutline, mailOutline, closeOutline, searchOutline, closeCircleOutline });
  }
  ngOnInit(): void { this.updateMetadata(); }
  ionViewWillEnter(): void { this.updateMetadata(); }
  private updateMetadata(): void { this.seoService.update(this.seo); }
}
