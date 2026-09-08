import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

async function auditGoogleDrive() {
  console.log('=== AUDIT GOOGLE DRIVE API & CREDENTIALS ===\n');

  // 1. Check environment variables
  const envVars = {
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '(not set)',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? '(present, length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : '(not set)',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '(not set)',
    GOOGLE_DRIVE_ROOT_FOLDER_ID: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '(not set)',
    GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID: process.env.GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID || '(not set)',
    GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID: process.env.GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID || '(not set)',
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '(not set)',
  };

  console.log('1. Environment Variables Audit:');
  console.table(envVars);

  // 2. Check for ADC (Application Default Credentials)
  const appData = process.env.APPDATA || '';
  const gcloudAdcPath = path.join(appData, 'gcloud', 'application_default_credentials.json');
  console.log('\n2. Google Cloud ADC Check:');
  console.log('ADC Path:', gcloudAdcPath, 'Exists:', fs.existsSync(gcloudAdcPath));

  // 3. Test Drive connection if credentials exist
  console.log('\n3. Google Drive Client Connection Test:');
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const client = await auth.getClient();
    console.log('Google Auth Client initialized successfully! Type:', client.constructor.name);

    const drive = google.drive({ version: 'v3', auth: client as any });
    const about = await drive.about.get({ fields: 'user, storageQuota' });
    console.log('Connected to Google Drive User:', about.data.user?.emailAddress, 'DisplayName:', about.data.user?.displayName);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log('Google Drive connection failed:', msg);
  }
}

auditGoogleDrive();
