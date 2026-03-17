import { Injectable } from '@angular/core';
import firebase from 'firebase/compat/app';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, updateProfile, sendEmailVerification,
  applyActionCode, sendPasswordResetEmail, setPersistence, browserLocalPersistence}
  from "firebase/auth";
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LoadingController } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { setDoc, getDoc, doc, getFirestore, serverTimestamp } from "firebase/firestore";

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(public auth: AngularFireAuth, private router: Router,
    private toastController: ToastController, private firestore: AngularFirestore,
    public loader: LoadingController) 
  {
    // const authInstance = getAuth(firebase.initializeApp(environment.firebaseConfig));
    // setPersistence(authInstance, browserLocalPersistence).then(() =>{
    //   this.auth.onAuthStateChanged(user => {
    //     this.isLoggedIn = !!user
    //     this.userName = user ? user.displayName || 'Guest' : 'Guest'
    //     this.userEmail = user?.email || `not signed in`
    //     this.isVerified = user?.emailVerified ?? false;;
    //     this.verificationMsg = 'Please verify your email address '+ this.userEmail
    //     this.userId = user?.uid || ''
    //   });
    // })
    // .catch(error => {
    //   console.error('Error setting persistence:', error);
    //   this.presentToast('Authentication error occurred');
    // });

    this.initializeAuth()
    
  }

  isLoggedIn = false;
  userName = `Guest`;
  isVerified = false;
  userEmail : string = ''
  verificationMsg: string = ''
  regVerification = false;
  userPassword: string = ''
  userId: string = ''
  loadProfile = false

  db = getFirestore(firebase.initializeApp(environment.firebaseConfig))

  private async initializeAuth() {
    const authInstance = getAuth(firebase.initializeApp(environment.firebaseConfig));
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
    const authInstance = getAuth(firebase.initializeApp(environment.firebaseConfig));
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
    this.userEmail = user.email || 'not signed in';
    this.isVerified = user.emailVerified ?? false;
    this.userId = user.uid || '';
  }

  // GoogleSign

  googleSignIn()
  {
    const authInstance = getAuth(firebase.initializeApp(environment.firebaseConfig));
    setPersistence(authInstance, browserLocalPersistence);

    return signInWithPopup(getAuth(firebase.initializeApp(environment.firebaseConfig)), new GoogleAuthProvider).then(
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
    const loading = await this.loader.create({
      cssClass: 'transparent-loader'
    });
    loading.present();

    const authInstance = getAuth(firebase.initializeApp(environment.firebaseConfig));
    setPersistence(authInstance, browserLocalPersistence);

    return new Promise<any>((resolve, reject) =>
    {
      signInWithEmailAndPassword(getAuth(firebase.initializeApp(environment.firebaseConfig)), value.email, value.password).then(
        (res: any) => 
        {
          resolve(res)
          if(res.user?.emailVerified)
          {
            this.isLoggedIn = true
            this.authState.next(true)
            this.userEmail = res.user.email
            this.regVerification = false

            loading.dismiss();
            this.router.navigate(['/tabs/profile'])
            this.presentToast('Successfully logged in')

            this.addUser(res.user)
            this.userId = res.user?.uid
          }
          else
          {
            loading.dismiss()
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
            loading.dismiss();
            this.presentToast('Email doesn\'t exist, please register first')
          }
          else if(error.code === 'auth/wrong-password')
          {
            loading.dismiss();
            this.presentToast('Incorrect password, please try again')
          }
          else if(error.code === 'auth/internal-error')
          {
            loading.dismiss();
            this.presentToast('Problem from our end, please try again later')
          }
          else
          {
            loading.dismiss();
            this.presentToast(error.code)
          }
        }
      )
    })
  }

  // Register with email/password

  async userRegistration(value: any)
  {
    const loading = await this.loader.create({
      cssClass: 'transparent-loader'
    });
    loading.present();

    const authInstance = getAuth(firebase.initializeApp(environment.firebaseConfig));
    setPersistence(authInstance, browserLocalPersistence);

    return new Promise<any>((resolve, reject) =>
    {  
      createUserWithEmailAndPassword(getAuth(firebase.initializeApp(environment.firebaseConfig)),value.email, value.password).then(
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
            if (!res.user?.emailVerified.isVerified) {
              sendEmailVerification(res.user)
            }

            this.isLoggedIn = true
            this.authState.next(true)
            this.userName = value.displayName
            this.isVerified = res.user.emailVerified
            this.userEmail = res.user.email
            this.userPassword = res.user.password
            this.regVerification = true

            loading.dismiss()

            this.router.navigate(['/tabs/profile'])
            this.presentToast('Successfully registered, please check your email to verify your account')

            this.addUser(res.user)

          })
          .catch((error) => 
          {
            reject(error);
            if(error.code === 'auth/internal-error')
            {
              loading.dismiss();
              this.presentToast('Problem from our end, please try again later')
            }
            else
            {
              loading.dismiss();
              this.presentToast(error.code)
            }
          });
        },
        (error: any) => 
        {
          reject(error)
          if(error.code === 'auth/email-already-in-use' || 'auth/email-already-exists')
          {
            loading.dismiss();
            this.presentToast('Email already in use')
          }
          else if(error.code === 'auth/internal-error')
          {
            loading.dismiss();
            this.presentToast('Problem from our end, please try again later')
          }
          else
          {
            loading.dismiss();
            this.presentToast('Error signing up, please try again or contact support')
          }

        }
      )
    })
  }

  // forgot password
  forgotPassword(email: any)
  {
    sendPasswordResetEmail(getAuth(firebase.initializeApp(environment.firebaseConfig)), email)
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

  logOut() {
    signOut(getAuth(firebase.initializeApp(environment.firebaseConfig)))
      .then(() => {
        sessionStorage.clear()
        this.isLoggedIn = false
        this.authState.next(false)
        this.userName = 'Guest'
        if(!this.regVerification)
        {
          this.router.navigate(['/tabs/profile'])
        }
        else
        {
          window.location.reload()
        }
      })
      .catch(error => {
        if(error.code === 'auth/internal-error')
        {
          this.presentToast('Problem from our end, please try again later')
        }
        else
        {
          this.presentToast(error.code)
        }
    });
  }

  async presentToast(msg: any) {
    const toast = await this.toastController.create({
      message: msg,
      duration: 1300,
      position: 'bottom',
    });

    await toast.present();
  }

  // Add user to firestore

  async addUser(user: any): Promise<void> {
    const userRef = doc(this.db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) 
    {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        lastSignIn: serverTimestamp()
      }, { merge: true });
    } 
    else 
    {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        hasMini: false,
        expiryDate: "",
        points: 0,
        lastSignIn: serverTimestamp(),
        currentPlan: ""
      });
    }
  }

  // update
  async updateUser(uid: string, updatedInfo: [string, boolean, number, string]): Promise<void> {
    const userRef = doc(this.db, 'users', uid);
    const userDoc = await getDoc(userRef);

    updatedInfo[0] == "" ? updatedInfo[0] = userDoc.data()?.['expiryDate'] : updatedInfo[0] = updatedInfo[0]
    userDoc.data()?.['hasMini'] == true ? updatedInfo[1] = true : updatedInfo[1] = updatedInfo[1]
    userDoc.data()?.['points'] > updatedInfo[2] ? updatedInfo[2] = userDoc.data()?.['points'] : updatedInfo[2] = updatedInfo[2]
    updatedInfo[3] == "" ? updatedInfo[3] = userDoc.data()?.['currentPlan'] : updatedInfo[3] = updatedInfo[3]

    if(userDoc.exists()) 
    {
      await setDoc(userRef, {
        expiryDate: updatedInfo[0],
        hasMini: updatedInfo[1],
        points: updatedInfo[2],
        currentPlan: updatedInfo[3]
      }, { merge: true });
    }
  }

  // Get user from firestore
  async getUser(uid: string) : Promise<JSON>
  {
    const userRef = doc(this.db, 'users', uid);
    const userDoc = await getDoc(userRef);
    var userId = JSON.stringify(userDoc.data())
    return JSON.parse(userId)
  }

}