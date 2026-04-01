import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseStorageService {
  private client: SupabaseClient | null = null;

  isConfigured(): boolean {
    return Boolean(environment.supabaseUrl && environment.supabaseAnonKey && environment.supabaseStorageBucket);
  }

  async uploadUserDocument(userUid: string, documentKey: string, file: File): Promise<{ publicUrl: string; path: string }> {
    const storage = this.getClient().storage.from(environment.supabaseStorageBucket);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `users/${userUid}/documents/${documentKey}-${Date.now()}-${safeName}`;

    const { error } = await storage.upload(path, file, {
      contentType: file.type || undefined,
      upsert: true
    });

    if (error) {
      throw error;
    }

    const { data } = storage.getPublicUrl(path);

    return {
      publicUrl: data.publicUrl,
      path
    };
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
