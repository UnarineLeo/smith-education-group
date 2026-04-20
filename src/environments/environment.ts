// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  googleMapsApiKey: '',
  enableAppCheck: true,
  appCheckAllowedHosts: ['localhost', 'unipply.co.za'],
  appCheckDebugToken: true,
  appCheckReCaptchaSiteKey: '6LfXB6UsAAAAAF8DNiIz92upLrq5qs_Fi5ru272Z',
  supabaseUrl: 'https://enjuypwsmntwdlyntsye.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuanV5cHdzbW50d2RseW50c3llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDA2OTksImV4cCI6MjA4OTg3NjY5OX0.VvDmkosuNW_llAKpeXCQGyKLJvyY9B8Ed5lbwdG2VAI',
  supabaseStorageBucket: 'unipply',
  supabaseDocumentUploadFunctionUrl: 'https://enjuypwsmntwdlyntsye.supabase.co/functions/v1/document-upload',
  supabaseDocumentSignUrlFunctionUrl: 'https://enjuypwsmntwdlyntsye.supabase.co/functions/v1/document-sign-url',
  firebaseConfig: {
    apiKey: "AIzaSyDfhH4XNXjdaVpRR__RBDnUtUGna1l21eI",
    authDomain: "unipply-ae61a.firebaseapp.com",
    projectId: "unipply-ae61a",
    storageBucket: "unipply-ae61a.firebasestorage.app",
    messagingSenderId: "958054800889",
    appId: "1:958054800889:web:2d99bd0b104242261bf128",
    measurementId: "G-6FLXK359WZ"
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
