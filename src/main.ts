import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getApp, getApps, initializeApp } from 'firebase/app';


import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    importProvidersFrom(
      AngularFireModule.initializeApp(environment.firebaseConfig),
      AngularFireAuthModule,
      AngularFirestoreModule,
    ),
  ],
}).then(() => {
  const recaptchaSiteKey = environment.appCheckReCaptchaSiteKey?.trim();
  const enableAppCheck = environment.enableAppCheck !== false;

  if (!enableAppCheck || !recaptchaSiteKey || typeof window === 'undefined') {
    return;
  }

  if (Capacitor.isNativePlatform()) {
    // Web reCAPTCHA providers are not supported for native Capacitor origins.
    return;
  }

  const protocol = window.location.protocol;
  if (protocol !== 'http:' && protocol !== 'https:') {
    return;
  }

  const allowedHosts = environment.appCheckAllowedHosts ?? [];
  if (allowedHosts.length > 0 && !allowedHosts.includes(window.location.hostname)) {
    return;
  }

  if (environment.appCheckDebugToken) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = environment.appCheckDebugToken;
  }

  const firebaseApp = getApps().length ? getApp() : initializeApp(environment.firebaseConfig);

  try {
    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (error) {
    console.warn('App Check initialization skipped:', error);
  }
});


