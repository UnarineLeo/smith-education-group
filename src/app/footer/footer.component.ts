import { Component, OnInit } from '@angular/core';
import { IonIcon, IonFooter } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [IonFooter, IonIcon, RouterLink]
})
export class FooterComponent  implements OnInit {
  readonly currentYear = new Date().getFullYear();

  constructor() { }

  ngOnInit() {}

}