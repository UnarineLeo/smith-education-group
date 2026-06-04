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
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { FooterComponent } from '../footer/footer.component';
import { AuthService } from '../services/auth.service';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface AdminDocumentEntry {
  key: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  data?: string;
}

interface AdminApsScoreEntry {
  universityName: string;
  score?: number | null;
  maxScore?: number | null;
  rule?: string;
}

interface AdminUserDocument {
  id: string;
  email?: string;
  displayName?: string;
  userRole?: string;
  role?: string;
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
  apsScoresByUniversity?: AdminApsScoreEntry[];
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
    IonHeader,
    IonToolbar,
    IonTitle,
  ],
})
export class AdminPortalPage implements OnInit {
  users: AdminUserDocument[] = [];
  isLoadingUsers = false;
  isExportingUsers = false;
  loadUsersError = '';
  expandedUserId: string | null = null;

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

  async exportUsersToExcel(): Promise<void> {
    if (!this.users.length) {
      await this.presentToast('No users are available to export yet.', 'warning');
      return;
    }

    this.isExportingUsers = true;

    try {
      const workbook = XLSX.utils.book_new();
      const usersSheet = XLSX.utils.json_to_sheet(this.users.map((user) => ({
        documentId: user.id,
        displayName: this.getUserDisplayName(user),
        email: user.email ?? '',
        role: this.getUserRole(user),
        emailVerified: this.formatBoolean(user.emailVerified),
        phone: user.phone ?? '',
        saIdNumber: user.saIdNumber ?? '',
        streetAddress: user.streetAddress ?? '',
        cityTown: user.cityTown ?? '',
        provinceAddress: user.provinceAddress ?? '',
        postalCode: user.postalCode ?? '',
        currentStudyLevel: user.currentStudyLevel ?? '',
        studyAreas: this.formatList(user.studyAreas),
        courseChoices: this.formatList(user.courseChoices),
        expiryDate: user.expiryDate ?? '',
        isSubscribed: this.formatBoolean(user.isSubscribed),
        lastSignIn: this.formatFirestoreDate(user.lastSignIn),
      })));

      const apsRows = this.users.flatMap((user) => {
        const apsScores = this.getUserApsScores(user);

        if (!apsScores.length) {
          return [{
            documentId: user.id,
            userEmail: user.email ?? '',
            lastSignIn: this.formatFirestoreDate(user.lastSignIn),
            universityName: '',
            score: '',
            maxScore: '',
            rule: '',
          }];
        }

        return apsScores.map((score) => ({
          documentId: user.id,
          userEmail: user.email ?? '',
          lastSignIn: this.formatFirestoreDate(user.lastSignIn),
          universityName: score.universityName,
          score: this.formatApsScoreValue(score),
          maxScore: score.maxScore ?? '',
          rule: score.rule ?? '',
        }));
      });

      const documentsRows = this.users.flatMap((user) => {
        const documents = this.getUserDocuments(user);

        if (!documents.length) {
          return [{
            documentId: user.id,
            userEmail: user.email ?? '',
            lastSignIn: this.formatFirestoreDate(user.lastSignIn),
            documentKey: '',
            fileName: '',
            mimeType: '',
            uploadedAt: '',
            canDownload: 'No',
          }];
        }

        return documents.map((document) => ({
          documentId: user.id,
          userEmail: user.email ?? '',
          lastSignIn: this.formatFirestoreDate(user.lastSignIn),
          documentKey: document.key,
          fileName: document.fileName,
          mimeType: document.mimeType,
          uploadedAt: document.uploadedAt,
          canDownload: this.formatBoolean(this.canDownloadDocument(document)),
        }));
      });

      const apsSheet = XLSX.utils.json_to_sheet(apsRows);
      const documentsSheet = XLSX.utils.json_to_sheet(documentsRows);

      XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');
      XLSX.utils.book_append_sheet(workbook, apsSheet, 'APS Scores');
      XLSX.utils.book_append_sheet(workbook, documentsSheet, 'Documents');

      const sheetBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const downloadBlob = new Blob([sheetBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = URL.createObjectURL(downloadBlob);
      const anchor = globalThis.document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      anchor.href = downloadUrl;
      anchor.download = `firestore-users-${timestamp}.xlsx`;
      anchor.rel = 'noopener';
      anchor.click();

      URL.revokeObjectURL(downloadUrl);
      await this.presentToast('Excel export downloaded successfully.', 'success');
    } catch (error) {
      console.error('Could not export users to Excel:', error);
      await this.presentToast('Could not export users to Excel right now.', 'danger');
    } finally {
      this.isExportingUsers = false;
    }
  }

  isUserExpanded(user: AdminUserDocument): boolean {
    return this.expandedUserId === user.id;
  }

  toggleUserExpanded(user: AdminUserDocument): void {
    this.expandedUserId = this.isUserExpanded(user) ? null : user.id;
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

      if (this.expandedUserId && !this.users.some((user) => user.id === this.expandedUserId)) {
        this.expandedUserId = null;
      }
    } catch (error) {
      console.error('Could not load Firestore users:', error);
      this.loadUsersError = 'Could not load Firestore users right now. Please try again.';
      this.users = [];
      this.expandedUserId = null;
    } finally {
      this.isLoadingUsers = false;
    }
  }

  getUserDocuments(user: AdminUserDocument): AdminDocumentEntry[] {
    const documents = user.documents ?? {};

    return Object.entries(documents).map(([key, document]) => ({
      key,
      fileName: document?.fileName ?? 'Untitled document',
      mimeType: document?.mimeType ?? 'unknown',
      uploadedAt: this.formatFirestoreDate(document?.uploadedAt),
      data: document?.data,
    }));
  }

  getUserApsScores(user: AdminUserDocument): AdminApsScoreEntry[] {
    const apsScores = user.apsScoresByUniversity ?? [];

    return apsScores
      .map((entry) => ({
        universityName: entry?.universityName?.trim() || 'Unknown university',
        score: typeof entry?.score === 'number' ? entry.score : null,
        maxScore: typeof entry?.maxScore === 'number' ? entry.maxScore : null,
        rule: entry?.rule?.trim() || 'N/A',
      }))
      .sort((a, b) => a.universityName.localeCompare(b.universityName));
  }

  formatApsScoreValue(entry: AdminApsScoreEntry): string {
    const score = entry.score;

    if (score === null || !Number.isFinite(score)) {
      return 'N/A';
    }

    if (entry.maxScore === null || !Number.isFinite(entry.maxScore)) {
      return `${score}`;
    }

    return `${score} / ${entry.maxScore}`;
  }

  canDownloadDocument(document: AdminDocumentEntry): boolean {
    return document.mimeType === 'application/pdf' && Boolean(document.data);
  }

  async downloadDocument(entry: AdminDocumentEntry): Promise<void> {
    if (!this.canDownloadDocument(entry)) {
      await this.presentToast('This document is not available for download.', 'warning');
      return;
    }

    try {
      const blob = this.base64ToBlob(entry.data ?? '', entry.mimeType);
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = globalThis.document.createElement('a');

      anchor.href = downloadUrl;
      anchor.download = entry.fileName?.trim() || `${entry.key}.pdf`;
      anchor.rel = 'noopener';
      anchor.click();

      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Could not download document:', error);
      await this.presentToast('Could not download the document right now.', 'danger');
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let index = 0; index < byteCharacters.length; index++) {
      byteNumbers[index] = byteCharacters.charCodeAt(index);
    }

    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
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

  getUserRole(user: AdminUserDocument): string {
    return user.userRole?.trim() || user.role?.trim() || 'user';
  }

  getUserStatusLabel(user: AdminUserDocument): string {
    const role = this.getUserRole(user);
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
