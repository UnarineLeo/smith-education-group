import { Component, OnInit } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular/standalone';
import { OzowScriptService } from '../shared/ozow-script.service';
import { ActivatedRoute } from '@angular/router';

declare global {
  interface Window {
    Ozow?: new () => {
      createPaymentModal: (paymentUrl: string, postData: Record<string, unknown>) => void;
    };
  }
}

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class PaymentsPage implements OnInit {
  ozowReady = false;
  paymentStatus: 'success' | 'failed' | null = null;
  private ozow: { createPaymentModal: (paymentUrl: string, postData: Record<string, unknown>) => void } | null = null;

  private readonly paymentUrl = 'https://pay.ozow.com/';
  private readonly callbackBaseUrl = `${window.location.origin}/payments`;
  private readonly postData: Record<string, unknown> = {
    siteCode: 'EQU-EQU-009',
    amount: 10.00,
    currencyCode: 'ZAR',
    countryCode: 'ZA',
    transactionReference: `Golf-${Date.now()}`,
    bankReference: 'GolfTournament2026',
    SuccessUrl: `${this.callbackBaseUrl}?paymentStatus=success`,
    CancelUrl: `${this.callbackBaseUrl}?paymentStatus=failed`,
    ErrorUrl: `${this.callbackBaseUrl}?paymentStatus=failed`,
    isTest: false
  };

  constructor(
    private ozowScriptService: OzowScriptService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const status = params.get('paymentStatus');
      this.paymentStatus = status === 'success' ? 'success' : status === 'failed' ? 'failed' : null;
    });

    void this.initializeOzow();
  }

  private async initializeOzow(): Promise<void> {
    try {
      await this.ozowScriptService.loadScript();
      if (window.Ozow) {
        this.ozow = new window.Ozow();
      }
      this.ozowReady = true;
    } catch (error) {
      console.error('Ozow script could not be loaded', error);
      this.ozowReady = false;
    }
  }

  payUsingOzow(): void {
    if (!this.ozow) {
      return;
    }

    this.ozow.createPaymentModal(this.paymentUrl, this.postData);
  }
}
