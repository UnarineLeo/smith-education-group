import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/angular/standalone';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-our-story',
  templateUrl: 'our-story.page.html',
  styleUrls: ['our-story.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, FooterComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OurStoryPage {

  constructor() {}

}
