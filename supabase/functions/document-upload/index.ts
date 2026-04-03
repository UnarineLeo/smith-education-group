// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseStorageBucket = Deno.env.get('SUPABASE_STORAGE_BUCKET') ?? 'unipply';
const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    }
  });
}

async function requireFirebaseUid(request: Request): Promise<string> {
  if (!firebaseProjectId) {
    throw new Error('Missing FIREBASE_PROJECT_ID environment variable.');
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    throw new Error('Missing Firebase bearer token.');
  }

  const { payload } = await jwtVerify(token, googleJwks, {
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId
  });

  const uid = String(payload.user_id ?? payload.sub ?? '');
  if (!uid) {
    throw new Error('Could not determine Firebase user id from token.');
  }

  return uid;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase service role configuration.');
    }

    const firebaseUid = await requireFirebaseUid(request);
    const formData = await request.formData();

    const file = formData.get('file');
    const documentKey = String(formData.get('documentKey') ?? '').trim();
    const claimedUid = String(formData.get('userUid') ?? '').trim();

    if (!(file instanceof File)) {
      return jsonResponse(400, { error: 'Missing file upload.' });
    }

    if (!documentKey) {
      return jsonResponse(400, { error: 'Missing documentKey.' });
    }

    if (claimedUid && claimedUid !== firebaseUid) {
      return jsonResponse(403, { error: 'User id mismatch.' });
    }

    const path = `users/${firebaseUid}/${documentKey}`;

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error } = await adminClient.storage.from(supabaseStorageBucket).upload(path, file, {
      contentType: file.type || undefined,
      upsert: true
    });

    if (error) {
      return jsonResponse(400, { error: error.message });
    }

    return jsonResponse(200, { path });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return jsonResponse(401, { error: message });
  }
});
