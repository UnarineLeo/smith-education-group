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
  universityChoice1?: string;
  universityChoice2?: string;
  universityChoice3?: string;
  universityChoice4?: string;
  academicInformation?: Partial<{
    universityChoice1: string;
    universityChoice2: string;
    universityChoice3: string;
    universityChoice4: string;
  }>;
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
  highSchoolSubjects?: Array<{
    subject?: unknown;
    name?: unknown;
    title?: unknown;
    mark?: unknown;
    score?: unknown;
    value?: unknown;
  }>;
  lastSignIn?: unknown;
  expiryDate?: string;
  isSubscribed?: boolean;
  [key: string]: unknown;
}

interface AdminUserSubjectEntry {
  subject: string;
  mark: number | null;
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

  activeTab: 'list' | 'insights' = 'list';

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
        // saIdNumber: user.saIdNumber ?? '',
        streetAddress: user.streetAddress ?? '',
        cityTown: user.cityTown ?? '',
        provinceAddress: user.provinceAddress ?? '',
        postalCode: user.postalCode ?? '',
        currentStudyLevel: user.currentStudyLevel ?? '',
        studyAreas: this.formatList(user.studyAreas),
        courseChoice1: user.courseChoices?.[0] ?? '',
        courseChoice2: user.courseChoices?.[1] ?? '',
        courseChoice3: user.courseChoices?.[2] ?? '',
        courseChoice4: user.courseChoices?.[3] ?? '',
        highSchoolSubjects: this.formatUserSubjects(user),
        universityChoice1: user.universityChoice1 ?? user.academicInformation?.universityChoice1 ?? '',
        universityChoice2: user.universityChoice2 ?? user.academicInformation?.universityChoice2 ?? '',
        universityChoice3: user.universityChoice3 ?? user.academicInformation?.universityChoice3 ?? '',
        universityChoice4: user.universityChoice4 ?? user.academicInformation?.universityChoice4 ?? '',
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

      const subjectsRows = this.users.flatMap((user) => {
        const subjects = this.getUserHighSchoolSubjects(user);

        if (!subjects.length) {
          return [{
            documentId: user.id,
            userEmail: user.email ?? '',
            lastSignIn: this.formatFirestoreDate(user.lastSignIn),
            subject: '',
            mark: '',
          }];
        }

        return subjects.map((subjectEntry) => ({
          documentId: user.id,
          userEmail: user.email ?? '',
          lastSignIn: this.formatFirestoreDate(user.lastSignIn),
          subject: subjectEntry.subject,
          mark: subjectEntry.mark ?? '',
        }));
      });

      const apsSheet = XLSX.utils.json_to_sheet(apsRows);
      const documentsSheet = XLSX.utils.json_to_sheet(documentsRows);
      const subjectsSheet = XLSX.utils.json_to_sheet(subjectsRows);

      XLSX.utils.book_append_sheet(workbook, usersSheet, 'Users');
      XLSX.utils.book_append_sheet(workbook, apsSheet, 'APS Scores');
      XLSX.utils.book_append_sheet(workbook, subjectsSheet, 'High School Subjects');
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

  getUserHighSchoolSubjects(user: AdminUserDocument): AdminUserSubjectEntry[] {
    if (!Array.isArray(user.highSchoolSubjects)) {
      return [];
    }

    return user.highSchoolSubjects.reduce<AdminUserSubjectEntry[]>((accumulator, entry) => {
      const subjectRaw = entry?.subject ?? entry?.name ?? entry?.title;
      const markRaw = entry?.mark ?? entry?.score ?? entry?.value;
      const subject = typeof subjectRaw === 'string' ? subjectRaw.trim() : '';

      if (!subject) {
        return accumulator;
      }

      const parsedMark = typeof markRaw === 'number' ? markRaw : Number(markRaw);
      accumulator.push({
        subject,
        mark: Number.isFinite(parsedMark) ? parsedMark : null,
      });
      return accumulator;
    }, []);
  }

  formatUserSubjects(user: AdminUserDocument): string {
    const subjects = this.getUserHighSchoolSubjects(user);
    if (!subjects.length) {
      return 'N/A';
    }

    return subjects
      .map((entry) => entry.mark === null ? entry.subject : `${entry.subject} (${entry.mark}%)`)
      .join(', ');
  }

  getUserUniversityChoices(user: AdminUserDocument): Array<{ label: string; value: string }> {
    const academicInformation = user.academicInformation ?? {};

    return [
      { label: 'University Choice 1', value: user.universityChoice1 ?? academicInformation.universityChoice1 ?? '' },
      { label: 'University Choice 2', value: user.universityChoice2 ?? academicInformation.universityChoice2 ?? '' },
      { label: 'University Choice 3', value: user.universityChoice3 ?? academicInformation.universityChoice3 ?? '' },
      { label: 'University Choice 4', value: user.universityChoice4 ?? academicInformation.universityChoice4 ?? '' },
    ];
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

// ── Initials for avatar ──────────────────────────────────────────
getInitials(user: any): string {
  const name = this.getUserDisplayName(user) || user.id || '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── KPI helpers ─────────────────────────────────────────────────
getVerifiedCount(): number {
  return this.users.filter(u => u.emailVerified).length;
}

getSubscribedCount(): number {
  return this.users.filter(u => u.isSubscribed).length;
}

getOverallAvgAps(): string {
  const scores: number[] = [];
  for (const u of this.users) {
    for (const aps of this.getUserApsScores(u)) {
        const v = typeof aps.score === 'number' ? aps.score : Number.parseFloat(String(aps.score ?? ''));
        if (!Number.isNaN(v)) scores.push(v);
    }
  }
  if (!scores.length) return 'N/A';
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}

// ── Study level distribution ─────────────────────────────────────
getStudyLevelDistribution(): { label: string; count: number; pct: number; color: string }[] {
  const COLORS = ['#1a56db','#0ea5e9','#10b981','#f59e0b','#8b5cf6','#ef4444','#64748b'];
  const map = new Map<string, number>();
  for (const u of this.users) {
    const k = u.currentStudyLevel || 'Unknown';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const max = Math.max(...map.values(), 1);
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, count], i) => ({
      label,
      count,
      pct: Math.round((count / max) * 100),
      color: COLORS[i % COLORS.length],
    }));
}

// ── Top course choices ───────────────────────────────────────────
getTopCourseChoices(): { label: string; count: number; pct: number }[] {
  const map = new Map<string, number>();
  for (const u of this.users) {
    for (const c of (u.courseChoices ?? [])) {
      if (c) map.set(c, (map.get(c) ?? 0) + 1);
    }
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([label, count]) => ({
    label,
    count,
    pct: Math.round((count / max) * 100),
  }));
}

// ── Average APS by university ────────────────────────────────────
getAvgApsByUniversity(): { label: string; avg: number; pct: number }[] {
  const map = new Map<string, number[]>();
  for (const u of this.users) {
    for (const aps of this.getUserApsScores(u)) {
      const v = typeof aps.score === 'number' ? aps.score : Number.parseFloat(String(aps.score ?? ''));
      if (!Number.isNaN(v)) {
        const key = aps.universityName ?? 'Unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(v);
      }
    }
  }
  const avgs = [...map.entries()].map(([label, vals]) => ({
    label,
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));
  const max = Math.max(...avgs.map(a => a.avg), 1);
  return avgs
    .sort((a, b) => b.avg - a.avg)
    .map(a => ({ ...a, pct: Math.round((a.avg / max) * 100) }));
}

// ── University popularity ────────────────────────────────────────
getUniversityPopularity(): { label: string; count: number; pct: number }[] {
  const map = new Map<string, number>();
  for (const u of this.users) {
    for (const ch of this.getUserUniversityChoices(u)) {
      if (ch.value) map.set(ch.value, (map.get(ch.value) ?? 0) + 1);
    }
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] ?? 1;
  return sorted.map(([label, count]) => ({
    label,
    count,
    pct: Math.round((count / max) * 100),
  }));
}

// ── Sign-in sparkline ────────────────────────────────────────────
private _getSignInMonthCounts(): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const u of this.users) {
    const d = this.toDateValue(u.lastSignIn);
    if (!d || isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([key, count]) => ({
      label: new Date(key + '-01').toLocaleString('default', { month: 'short' }),
      count,
    }));
}

getSignInMonths(): { label: string }[] {
  return this._getSignInMonthCounts().map(m => ({ label: m.label }));
}

getSparklinePath(): string {
  const data = this._getSignInMonthCounts();
  if (data.length < 2) return '';
  const max = Math.max(...data.map(d => d.count), 1);
  const W = 300, H = 100, pad = 6;
  const xStep = (W - pad * 2) / (data.length - 1);
  return data
    .map((d, i) => {
      const x = pad + i * xStep;
      const y = pad + (1 - d.count / max) * (H - pad * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

getSparklineFillPath(): string {
  const line = this.getSparklinePath();
  if (!line) return '';
  const W = 300, H = 100, pad = 6;
  const data = this._getSignInMonthCounts();
  const xStep = (W - pad * 2) / (data.length - 1);
  const startX = pad;
  const endX   = pad + (data.length - 1) * xStep;
  return `${line} L ${endX.toFixed(1)} ${(H - pad).toFixed(1)} L ${startX.toFixed(1)} ${(H - pad).toFixed(1)} Z`;
}

private toDateValue(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
}

}
