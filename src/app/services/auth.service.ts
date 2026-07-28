import { Injectable } from '@angular/core';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, updateProfile, sendEmailVerification,
  sendPasswordResetEmail, setPersistence, browserLocalPersistence}
  from "firebase/auth";
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LoadingController } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { setDoc, getDoc, doc, getFirestore, serverTimestamp } from "firebase/firestore";

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly firebaseApp = getApps().length ? getApp() : initializeApp(environment.firebaseConfig);

  isLoggedIn = false;
  userName = `Guest`;
  isVerified = false;
  userEmail : string = ''
  verificationMsg: string = ''
  regVerification = false;
  userPassword: string = ''
  userId: string = ''
  loadProfile = false
  role: string = 'user';

  db = getFirestore(this.firebaseApp)

  constructor(public auth: AngularFireAuth, private router: Router, private toastController: ToastController, private firestore: AngularFirestore,
    public loader: LoadingController) 
  {
    this.initializeAuth()
  }
  
  // Get user from firestore
  async getUser(userEmail: string, userId?: string): Promise<Record<string, unknown> | null> {
    const normalizedEmail = userEmail.trim().toLowerCase();
    const normalizedUserId = typeof userId === 'string' ? userId.trim() : '';

    if (normalizedEmail) {
      const emailRef = doc(this.db, 'users', normalizedEmail);
      const emailDoc = await getDoc(emailRef);
      if (emailDoc.exists()) {
        return emailDoc.data() ?? null;
      }
    }

    if (normalizedUserId) {
      const uidRef = doc(this.db, 'users', normalizedUserId);
      const uidDoc = await getDoc(uidRef);
      return uidDoc.data() ?? null;
    }

    return null;
  }

  private async initializeAuth() {
    const authInstance = getAuth(this.firebaseApp);
    await setPersistence(authInstance, browserLocalPersistence);

    this.auth.onAuthStateChanged(async (user) => {
      const isLoggedIn = !!user;
      this.authState.next(isLoggedIn);
      
      if (!isLoggedIn) {
        // await this.router.navigate(['/login']);
      }
    });
  }

  async isAuthenticated(): Promise<boolean> 
  {
    const authInstance = getAuth(this.firebaseApp);
    await setPersistence(authInstance, browserLocalPersistence);
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = authInstance.currentUser;
    if(!user) 
    {
      this.loadProfile = true
      await new Promise(resolve => setTimeout(resolve, 500));
      return !!authInstance.currentUser;
    }
    this.updateUserState(user);
    return true;
  }

  private authState = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.authState.asObservable(); ///I don't think theres a need for this

  private updateUserState(user: any) 
  {
    this.loadProfile = true
    this.isLoggedIn = true;
    this.authState.next(true);
    this.userName = user.displayName || 'Guest';
    this.userEmail = (user.email ?? '').trim().toLowerCase() || 'not signed in';
    this.isVerified = user.emailVerified ?? false;
    this.userId = user.uid || '';
  }

  // GoogleSign

  googleSignIn()
  {
    const authInstance = getAuth(this.firebaseApp);
    setPersistence(authInstance, browserLocalPersistence);

    return signInWithPopup(authInstance, new GoogleAuthProvider).then(
     (res: any) =>
     {
      this.updateUserState(res.user)

      this.router.navigate(['/tabs/profile'])
      this.presentToast('Successfully logged in')

      this.addUser(res.user)
      // this.userId = res.user?.uid

     }, err => 
     {
      if(err.code === 'auth/internal-error')
      {
        this.presentToast('Problem from our end, please try again later')
      }
      else
      {
        this.presentToast('Error signing in with Google, please try again or contact support')
      }
     })
  }

  // LogIn with email/password

  async loginFireAuth(value: any)
  {
    // const loading = await this.loader.create({
    //   cssClass: 'transparent-loader'
    // });
    // loading.present();

    const authInstance = getAuth(this.firebaseApp);
    setPersistence(authInstance, browserLocalPersistence);

    return new Promise<any>((resolve, reject) =>
    {
      signInWithEmailAndPassword(authInstance, value.email, value.password).then(
        (res: any) => 
        {
          resolve(res)
          if(res.user?.emailVerified)
          {
            this.isLoggedIn = true
            this.authState.next(true)
            this.userEmail = (res.user.email ?? '').trim().toLowerCase()
            this.regVerification = false

            // loading.dismiss();
            this.router.navigate(['/tabs/profile'])
            this.presentToast('Successfully logged in')

            this.addUser(res.user)
            this.userId = res.user?.uid
          }
          else
          {
            // loading.dismiss()
            this.regVerification = true
            this.logOut()
            sendEmailVerification(res.user)
            this.presentToast("Please verify your email address, check your inbox to complete the verification")
          }

        },
        (error: any) => 
        {
          reject(error)
          if(error.code === 'auth/user-not-found')
          {
            // loading.dismiss();
            this.presentToast('Email doesn\'t exist, please register first')
          }
          else if(error.code === 'auth/wrong-password')
          {
            // loading.dismiss();
            this.presentToast('Incorrect password, please try again')
          }
          else if(error.code === 'auth/internal-error')
          {
            // loading.dismiss();
            this.presentToast('Problem from our end, please try again later')
          }
          else
          {
            // loading.dismiss();
            this.presentToast(error.code)
          }
        }
      )
    })
  }

  // Register with email/password

  async userRegistration(value: any)
  {
    // const loading = await this.loader.create({
    //   cssClass: 'transparent-loader'
    // });
    // loading.present();
    const authInstance = getAuth(this.firebaseApp);
    setPersistence(authInstance, browserLocalPersistence);

    return new Promise<any>((resolve, reject) =>
    {  
      createUserWithEmailAndPassword(authInstance,value.email, value.password).then(
        (res: any) => 
        {
          resolve(res)
          // localStorage.setItem('token', JSON.stringify(res.user?.uid))

          updateProfile(
            res.user,{
            displayName: value.displayName, 
          })
          .then(async () => 
          {
            if (!res.user?.emailVerified) {
              await sendEmailVerification(res.user)
            }

            this.isLoggedIn = true
            this.authState.next(true)
            this.userName = value.displayName
            this.isVerified = res.user.emailVerified
            this.userEmail = (res.user.email ?? '').trim().toLowerCase()
            this.userPassword = res.user.password
            this.regVerification = true

            // loading.dismiss()

            this.router.navigate(['/tabs/profile'])
            this.presentToast('Successfully registered, please check your email to verify your account')

            const registrationInterest = typeof value.interest === 'string'
              ? value.interest.trim()
              : '';

            const registrationCourseChoices = Array.isArray(value.courseChoices)
              ? value.courseChoices
                  .map((choice: unknown) => typeof choice === 'string' ? choice.trim() : '')
                  .filter((choice: string) => choice !== '')
                  .slice(0, 4)
              : [];

            this.addUser(res.user
            //   {
            //   currentStudyLevel: value.currentStudyLevel,
            //   interest: registrationInterest,
            //   courseChoices: registrationCourseChoices
            // }
          )

          })
          .catch((error) => 
          {
            reject(error);
            if(error.code === 'auth/internal-error')
            {
              // loading.dismiss();
              this.presentToast('Problem from our end, please try again later')
            }
            else
            {
              // loading.dismiss();
              this.presentToast(error.code)
            }
          });
        },
        (error: any) => 
        {
          reject(error)
          if (error.code === 'auth/email-already-in-use' || error.code === 'auth/email-already-exists')
          {
            // loading.dismiss();
            this.presentToast('Email already in use')
          }
          else if(error.code === 'auth/internal-error')
          {
            // loading.dismiss();
            this.presentToast('Problem from our end, please try again later')
          }
          else
          {
            // loading.dismiss();
            this.presentToast('Error signing up, please try again or contact support')
          }

        }
      )
    })
  }

  // forgot password
  forgotPassword(email: any)
  {
    sendPasswordResetEmail(getAuth(this.firebaseApp), email)
    .then(() => {
      this.presentToast('Password reset email sent, check your inbox')
    })
    .catch((error) => {
      if(error.code === 'auth/user-not-found')
      {
        this.presentToast('Email doesn\'t exist, please register first')
      }
      else if(error.code === 'auth/wrong-password')
      {
        this.presentToast('Incorrect password, please try again')
      }
      else if(error.code === 'auth/internal-error')
      {
        this.presentToast('Problem from our end, please try again later')
      }
      else
      {
        this.presentToast(error.code)
      }
    });
  }

  //  Logout

  async logOut(options?: { toastMessage?: string; redirectTo?: string; forceReload?: boolean }) 
  {
    try {
      await signOut(getAuth(this.firebaseApp))

      sessionStorage.clear()
      this.isLoggedIn = false
      this.authState.next(false)
      this.userName = 'Guest'

      if (options?.toastMessage) {
        await this.presentToast(options.toastMessage)
      }

      if (options?.forceReload || this.regVerification) {
        window.location.reload()
        return
      }

      await this.router.navigate([options?.redirectTo ?? '/tabs/profile'])
    } catch (error: any) {
      if(error.code === 'auth/internal-error')
      {
        this.presentToast('Problem from our end, please try again later')
      }
      else
      {
        this.presentToast(error.code)
      }
    }
  }

  async presentToast(msg: any) {
    const toast = await this.toastController.create({
      cssClass: 'app-toast',
      message: msg,
      duration: 1300,
      position: 'bottom',
    });

    await toast.present();
  }

  // Add user to firestore

  // async addUser(user: any, extraProfile?: {
  //   currentStudyLevel?: string;
  //   interest?: string;
  //   courseChoices?: string[];
  // }): Promise<void> {
  //   const userEmail = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
  //   if (!userEmail) {
  //     return;
  //   }

  //   console.log('Adding/updating user in Firestore with email:', userEmail);

  //   const userRef = doc(this.db, 'users', userEmail);
  //   console.log('User document reference:', userRef.path);
  //   const studyAreas = extraProfile?.interest ? [extraProfile.interest] : [];

  //   const payload: Record<string, unknown> = {
  //     uid: user.uid,
  //     email: user.email,
  //     displayName: user.displayName,
  //     emailVerified: user.emailVerified,
  //     isSubscribed: false,
  //     expiryDate: '',
  //     lastSignIn: serverTimestamp(),
  //     currentStudyLevel: extraProfile?.currentStudyLevel ?? '',
  //     studyAreas,
  //     courseChoices: extraProfile?.courseChoices ?? [],
  //     role: 'user'
  //   };

  //   console.log('Upserting user data with payload:', payload);

  //   await setDoc(userRef, payload, { merge: true });
  // }

  async addUser(user: any): Promise<void> 
  {
    const userRef = doc(this.db, 'users', user.email.trim().toLowerCase());
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) 
    {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        lastSignIn: serverTimestamp(),
      }, { merge: true });
    } 
    else 
    {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        lastSignIn: serverTimestamp(),
        userRole: 'user'
      });
    }
  }

  private getEmailDocId(email: string | null | undefined): string | null {
    const normalized = email?.trim().toLowerCase();
    return normalized && normalized.length > 0 ? normalized : null;
  }

  async getCurrentRole(): Promise<string | null> {
    const authInstance = getAuth(this.firebaseApp);
    const user = authInstance.currentUser;

    if (!user) {
      this.role = 'user';
      return null;
    }

    const emailDocId = this.getEmailDocId(user.email);
    const emailRef = emailDocId ? doc(this.db, 'users', emailDocId) : null;
    const uidRef = doc(this.db, 'users', user.uid);

    const byEmailDoc = emailRef ? await getDoc(emailRef) : null;
    const userDoc = byEmailDoc?.exists() ? byEmailDoc : await getDoc(uidRef);

    if (!userDoc.exists()) {
      this.role = 'user';
      return 'user';
    }

    const data = userDoc.data() as Record<string, unknown>;
    const role = (data['userRole'] as string | undefined) ?? 'user';
    this.role = role;
    this.userId = user.uid;
    this.userEmail = (user.email ?? '').trim().toLowerCase() || 'not signed in';
    console.log(`Fetched role for user ${user.email}: ${role}`);
    return role;
  }

  async isCurrentUserAdmin(): Promise<boolean> {
    const role = await this.getCurrentRole();
    return role === 'admin';
  }

}
