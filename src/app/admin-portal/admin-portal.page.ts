import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { FooterComponent } from '../footer/footer.component';
import { AuthService } from '../services/auth.service';
import { collection, getDocs } from 'firebase/firestore';

interface AdminUserDocument {
  id: string;
  email?: string;
  displayName?: string;
  userRole?: string;
  emailVerified?: boolean;
  currentStudyLevel?: string;
  studyAreas?: string[];
  courseChoices?: string[];
  phone?: string;
  saIdNumber?: string;
  streetAddress?: string;
  cityTown?: string;
  provinceAddress?: string;
  postalCode?: string;
  documents?: Record<string, {
    fileName?: string;
    mimeType?: string;
    uploadedAt?: number;
    data?: string;
  }>;
  lastSignIn?: unknown;
  expiryDate?: string;
  isSubscribed?: boolean;
  [key: string]: unknown;
}


@Component({
  selector: 'app-admin-portal',
  templateUrl: './admin-portal.page.html',
  styleUrls: ['./admin-portal.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    FooterComponent,
  ],
})
export class AdminPortalPage implements OnInit {
  users: AdminUserDocument[] = [];
  isLoadingUsers = false;
  loadUsersError = '';

  constructor(
    private router: Router,
    private toastController: ToastController,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    void this.initializeAdminPortal();
  }

  ionViewWillEnter(): void {
    void this.refreshIfAuthorized();
  }

  private async initializeAdminPortal(): Promise<void> {
    const canAccess = await this.canAccessAdminPortal();
    if (!canAccess) {
      return;
    }

    await this.loadFirestoreUsers();
  }

  private async refreshIfAuthorized(): Promise<void> {
    const canAccess = await this.canAccessAdminPortal();
    if (!canAccess) {
      return;
    }

    await this.loadFirestoreUsers();
  }

  async refreshUsers(): Promise<void> {
    await this.refreshIfAuthorized();
  }

  private async loadFirestoreUsers(): Promise<void> {
    this.isLoadingUsers = true;
    this.loadUsersError = '';

    try {
      const usersSnapshot = await getDocs(collection(this.authService.db, 'users'));
      this.users = usersSnapshot.docs
        .map((userDoc) => ({
          id: userDoc.id,
          ...(userDoc.data() as Record<string, unknown>)
        } as AdminUserDocument))
        .sort((a, b) => (a.email || a.id).localeCompare(b.email || b.id));
    } catch (error) {
      console.error('Could not load Firestore users:', error);
      this.loadUsersError = 'Could not load Firestore users right now. Please try again.';
      this.users = [];
    } finally {
      this.isLoadingUsers = false;
    }
  }

  getUserDocuments(user: AdminUserDocument): Array<{ key: string; fileName: string; mimeType: string; uploadedAt: string }> {
    const documents = user.documents ?? {};

    return Object.entries(documents).map(([key, document]) => ({
      key,
      fileName: document?.fileName ?? 'Untitled document',
      mimeType: document?.mimeType ?? 'unknown',
      uploadedAt: this.formatFirestoreDate(document?.uploadedAt)
    }));
  }

  formatFirestoreDate(value: unknown): string {
    if (!value) {
      return 'N/A';
    }

    if (typeof value === 'number') {
      return new Date(value).toLocaleString();
    }

    if (typeof value === 'string') {
      const parsedDate = new Date(value);
      return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toLocaleString();
    }

    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toLocaleString();
    }

    return String(value);
  }

  formatList(values: unknown): string {
    if (!Array.isArray(values) || values.length === 0) {
      return 'N/A';
    }

    return values
      .map((value) => typeof value === 'string' ? value.trim() : String(value))
      .filter((value) => value !== '')
      .join(', ') || 'N/A';
  }

  formatBoolean(value: unknown): string {
    if (value === true) {
      return 'Yes';
    }

    if (value === false) {
      return 'No';
    }

    return 'N/A';
  }

  private async canAccessAdminPortal(): Promise<boolean> {
    const isLoggedIn = await this.authService.isAuthenticated();
    if (!isLoggedIn) {
      await this.router.navigate(['/tabs/admin-login']);
      return false;
    }

    const isAdmin = await this.authService.isCurrentUserAdmin();
    if (!isAdmin) {
      await this.router.navigate(['/tabs/admin-login']);
      return false;
    }

    return true;
  }

  getUserDisplayName(user: AdminUserDocument): string {
    return user.displayName?.trim() || user.email?.trim() || user.id;
  }

  getUserStatusLabel(user: AdminUserDocument): string {
    const role = user.userRole?.trim() || (user.role as string | undefined)?.trim() || 'user';
    const verified = user.emailVerified === true ? 'verified' : 'unverified';
    return `${role} · ${verified}`;
  }

  private async presentToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      color,
      position: 'top',
    });

    await toast.present();
  }
}
