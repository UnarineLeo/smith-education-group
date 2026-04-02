import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getAuth } from 'firebase/auth';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseStorageService {
  private client: SupabaseClient | null = null;

  isConfigured(): boolean {
    return Boolean(
      environment.supabaseUrl
      && environment.supabaseAnonKey
      && environment.supabaseStorageBucket
      && environment.supabaseDocumentUploadFunctionUrl
      && environment.supabaseDocumentSignUrlFunctionUrl
    );
  }

  async getExistingBuckets(): Promise<string[]> {
    const { data, error } = await this.getClient().storage.listBuckets();

    if (error) {
      throw error;
    }

    const bucketNames = (data ?? []).map((bucket) => bucket.name);
    console.log('Supabase buckets:', bucketNames);

    return bucketNames;
  }

  async uploadUserDocument(userUid: string, documentKey: string, file: File): Promise<{ path: string }> {
    const idToken = await this.getFirebaseIdToken();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentKey', documentKey);
    formData.append('userUid', userUid);

    const response = await fetch(environment.supabaseDocumentUploadFunctionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        apikey: environment.supabaseAnonKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Document upload failed.');
    }

    const result = await response.json() as { path?: string };
    if (!result.path) {
      throw new Error('Upload endpoint did not return a storage path.');
    }

    return { path: result.path };
  }

  async createSignedDocumentUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    if (!path) {
      return '';
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const idToken = await this.getFirebaseIdToken();
    const response = await fetch(environment.supabaseDocumentSignUrlFunctionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        apikey: environment.supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path, expiresInSeconds })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Could not create a signed URL.');
    }

    const result = await response.json() as { signedUrl?: string };
    if (!result.signedUrl) {
      throw new Error('Sign URL endpoint did not return a signed URL.');
    }

    return result.signedUrl;
  }

  private async getFirebaseIdToken(): Promise<string> {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error('No authenticated Firebase user found.');
    }

    return user.getIdToken();
  }

  private getClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }

    if (!environment.supabaseUrl || !environment.supabaseAnonKey) {
      throw new Error('Supabase configuration is missing.');
    }

    this.client = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
    return this.client;
  }
}
