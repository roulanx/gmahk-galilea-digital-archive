import { google } from 'googleapis';
import { Readable } from 'stream';
import { ArchiveCategory } from './types';
import { parseSabbathDetails, isValidSabbathDate } from './sabbath';


export interface DriveFolderResult {
  id: string;
  name: string;
  isExisting: boolean;
}

export type DriveErrorKind = 'NOT_FOUND' | 'PERMISSION_ERROR' | 'AUTH_ERROR' | 'API_ERROR';

export class DriveError extends Error {
  kind: DriveErrorKind;
  statusCode?: number;

  constructor(kind: DriveErrorKind, message: string, statusCode?: number) {
    super(`[${kind}] ${message}`);
    this.name = 'DriveError';
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

export function classifyDriveError(err: unknown): DriveError {
  if (err instanceof DriveError) return err;

  const errorObj = err as {
    code?: number | string;
    status?: number;
    message?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };

  const status =
    typeof errorObj?.status === 'number'
      ? errorObj.status
      : typeof errorObj?.code === 'number'
      ? errorObj.code
      : undefined;

  const msg = errorObj?.message || String(err);
  const reason = errorObj?.errors?.[0]?.reason || '';

  if (
    msg.includes('invalid_grant') ||
    reason === 'authError' ||
    status === 401 ||
    msg.includes('unauthorized_client') ||
    msg.includes('invalid_client')
  ) {
    let specificMsg = `Autentikasi Google Drive OAuth gagal: ${msg}`;
    if (msg.includes('invalid_grant')) {
      specificMsg = 'Google Drive refresh token invalid atau sudah kedaluwarsa (invalid_grant). Mohon perbarui GOOGLE_DRIVE_REFRESH_TOKEN.';
    } else if (msg.includes('unauthorized_client') || msg.includes('invalid_client')) {
      specificMsg = 'Kredensial OAuth Google Drive (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) tidak valid.';
    }
    return new DriveError('AUTH_ERROR', specificMsg, status || 401);
  }

  if (
    status === 403 ||
    reason === 'insufficientFilePermissions' ||
    reason === 'forbidden' ||
    msg.includes('The caller does not have permission')
  ) {
    return new DriveError('PERMISSION_ERROR', `Izin Google Drive ditolak: ${msg}`, status || 403);
  }

  if (status === 404 || reason === 'notFound' || msg.includes('File not found')) {
    return new DriveError('NOT_FOUND', `Folder atau berkas tidak ditemukan di Google Drive: ${msg}`, 404);
  }

  if (msg.includes('Could not load the default credentials')) {
    return new DriveError('AUTH_ERROR', 'Google Drive kredensial server tidak ditemukan (ADC tidak tersedia di Vercel). Pastikan User OAuth dikonfigurasi.', 401);
  }

  return new DriveError('API_ERROR', `Kesalahan Google Drive API (${status || 'unknown'}): ${msg}`, status);
}

/**
 * Returns an authenticated Google Drive client:
 * 1. Primary & only strategy in production: User OAuth 2.0 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN)
 *    -> Operates directly on the user's personal Google Drive (My Drive).
 * 2. Secondary fallback: Explicit Service Account (if configured via FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY).
 *
 * NOTE: Application Default Credentials (ADC) and local service-account.json files are EXPLICITLY NOT USED.
 * Silent fallback to ADC causes "Could not load the default credentials" in serverless environments like Vercel.
 */
export function getGoogleDriveClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();

  // 1. PRIMARY: User OAuth 2.0 with Refresh Token (Personal My Drive)
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: 'v3', auth: oauth2Client });
  }

  // 2. Secondary: Explicit Service Account (only if explicitly set in environment)
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
  }

  // NO silent fallback to ADC or local service-account.json files!
  return null;
}

/**
 * Returns descriptive status and safe diagnostics of current Google Drive authentication.
 * Never exposes actual secrets.
 */
export function getDriveAuthInfo(): {
  isAuthenticated: boolean;
  strategy: 'oauth_user' | 'service_account' | 'none';
  targetStorage: string;
  diagnostics: {
    clientId: 'PRESENT' | 'MISSING';
    clientSecret: 'PRESENT' | 'MISSING';
    refreshToken: 'PRESENT' | 'MISSING';
    rootFolderId: 'PRESENT' | 'MISSING';
    dokumentasiFolderId: 'PRESENT' | 'MISSING';
    fileIbadahFolderId: 'PRESENT' | 'MISSING';
  };
} {
  const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID?.trim());
  const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());
  const hasRefreshToken = Boolean(process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim());
  const hasRootId = Boolean(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim());
  const hasDokId = Boolean(process.env.GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID?.trim());
  const hasIbadahId = Boolean(process.env.GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID?.trim());

  const diagnostics = {
    clientId: hasClientId ? ('PRESENT' as const) : ('MISSING' as const),
    clientSecret: hasClientSecret ? ('PRESENT' as const) : ('MISSING' as const),
    refreshToken: hasRefreshToken ? ('PRESENT' as const) : ('MISSING' as const),
    rootFolderId: hasRootId ? ('PRESENT' as const) : ('MISSING' as const),
    dokumentasiFolderId: hasDokId ? ('PRESENT' as const) : ('MISSING' as const),
    fileIbadahFolderId: hasIbadahId ? ('PRESENT' as const) : ('MISSING' as const),
  };

  if (hasClientId && hasClientSecret && hasRefreshToken) {
    return {
      isAuthenticated: true,
      strategy: 'oauth_user',
      targetStorage: 'My Drive Pribadi Akun Google (User OAuth 2.0)',
      diagnostics,
    };
  }

  if (process.env.FIREBASE_CLIENT_EMAIL?.trim() && process.env.FIREBASE_PRIVATE_KEY?.trim()) {
    return {
      isAuthenticated: true,
      strategy: 'service_account',
      targetStorage: 'Service Account Storage',
      diagnostics,
    };
  }

  return {
    isAuthenticated: false,
    strategy: 'none',
    targetStorage: 'Belum Terhubung',
    diagnostics,
  };
}

/**
 * Finds an existing folder by name inside a parent folder
 */
export async function findFolderByName(
  parentFolderId: string,
  folderName: string
): Promise<string | null> {
  const drive = getGoogleDriveClient();
  if (!drive) {
    if (process.env.NODE_ENV === 'test' && !process.env.GOOGLE_CLIENT_ID) {
      return null;
    }
    throw new DriveError('AUTH_ERROR', 'Google Drive client tidak terautentikasi. Kredensial tidak ditemukan.', 401);
  }

  try {
    const escapedName = folderName.replace(/'/g, "\\'");
    const res = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = res.data.files;
    if (files && files.length > 0 && files[0].id) {
      return files[0].id;
    }
    return null;
  } catch (err) {
    const classified = classifyDriveError(err);
    console.error(`[Drive] Error searching folder '${folderName}' in parent '${parentFolderId}':`, classified.message);
    throw classified;
  }
}

/**
 * Idempotently ensures a folder exists inside a parent folder.
 * If it already exists, returns the existing ID without creating a duplicate.
 */
export async function ensureFolder(
  parentFolderId: string,
  folderName: string
): Promise<DriveFolderResult> {
  const drive = getGoogleDriveClient();
  if (!drive) {
    // Development/test fallback mock ID when no Google credentials configured
    const mockId = `mock_folder_${folderName.replace(/\s+/g, '_')}`;
    return { id: mockId, name: folderName, isExisting: false };
  }

  const existingId = await findFolderByName(parentFolderId, folderName);
  if (existingId) {
    return { id: existingId, name: folderName, isExisting: true };
  }

  try {
    const res = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id, name',
    });

    return {
      id: res.data.id || '',
      name: folderName,
      isExisting: false,
    };
  } catch (err) {
    throw classifyDriveError(err);
  }
}

/**
 * Creates a manual event folder directly under the corresponding Year/Quarter folder.
 */
export async function createActivityFolderInDrive(
  title: string,
  year: number,
  quarter: number,
  category: ArchiveCategory
): Promise<{ folderId: string; folderPath: string }> {
  const categoryFolderId =
    category === 'documentation'
      ? process.env.GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID
      : process.env.GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID;

  if (!categoryFolderId) {
    throw new Error('Konfigurasi Root Folder ID Google Drive tidak ditemukan.');
  }

  const categoryName = category === 'documentation' ? 'Dokumentasi' : 'File Ibadah';
  
  // Parse quarter string like 'Triwulan III'
  const quarters = ['Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV'];
  const quarterTitle = quarters[quarter - 1] || `Triwulan ${quarter}`;

  // 1. Ensure Year folder
  const yearRes = await ensureFolder(categoryFolderId, year.toString());

  // 2. Ensure Quarter folder
  const quarterRes = await ensureFolder(yearRes.id, quarterTitle);

  // 3. Ensure Activity Folder
  const activityRes = await ensureFolder(quarterRes.id, title);

  const folderPath = `GMAHK Galilea/${categoryName}/${year}/${quarterTitle}/${title}`;

  return {
    folderId: activityRes.id,
    folderPath,
  };
}

/**
 * Moves a file or folder to Google Drive Trash (Admin only action)
 */
export async function moveToTrash(fileId: string): Promise<boolean> {
  const drive = getGoogleDriveClient();
  if (!drive) {
    throw new Error('Google Drive client is not authenticated');
  }

  try {
    await drive.files.update({
      fileId,
      requestBody: {
        trashed: true,
      },
    });
    return true;
  } catch (err) {
    console.error(`Error trashing file ${fileId}:`, err);
    return false;
  }
}

/**
 * Uploads a file stream directly to a Google Drive folder
 */
export async function uploadFileToDrive(params: {
  folderId: string;
  name: string;
  mimeType: string;
  stream: Readable;
}): Promise<{ id: string; webViewLink?: string; webContentLink?: string; size?: number }> {
  const drive = getGoogleDriveClient();
  if (!drive) {
    throw new DriveError('AUTH_ERROR', 'Google Drive client tidak terautentikasi. Kredensial User OAuth tidak ditemukan.', 401);
  }

  try {
    const res = await drive.files.create({
      requestBody: {
        name: params.name,
        parents: [params.folderId],
      },
      media: {
        mimeType: params.mimeType,
        body: params.stream,
      },
      fields: 'id, name, webViewLink, webContentLink, size',
    });

    return {
      id: res.data.id || '',
      webViewLink: res.data.webViewLink || undefined,
      webContentLink: res.data.webContentLink || undefined,
      size: res.data.size ? parseInt(res.data.size, 10) : undefined,
    };
  } catch (err) {
    throw classifyDriveError(err);
  }
}

/**
 * Finds an existing file by name inside a parent folder
 */
export async function findFileByName(
  parentFolderId: string,
  fileName: string
): Promise<string | null> {
  const drive = getGoogleDriveClient();
  if (!drive) return null;

  try {
    const escapedName = fileName.replace(/'/g, "\\'");
    const res = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${escapedName}' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = res.data.files;
    if (files && files.length > 0 && files[0].id) {
      return files[0].id;
    }
    return null;
  } catch (err) {
    console.error(`Error finding file ${fileName} in ${parentFolderId}:`, err);
    return null;
  }
}

/**
 * Returns a non-colliding file name inside the parent folder.
 * If 'file.jpg' exists, returns 'file (1).jpg', 'file (2).jpg', etc.
 */
export async function getNonCollidingFileName(
  parentFolderId: string,
  fileName: string
): Promise<string> {
  let candidate = fileName;
  let counter = 1;

  while (await findFileByName(parentFolderId, candidate)) {
    const dotIdx = fileName.lastIndexOf('.');
    if (dotIdx !== -1) {
      const base = fileName.substring(0, dotIdx);
      const ext = fileName.substring(dotIdx);
      candidate = `${base} (${counter})${ext}`;
    } else {
      candidate = `${fileName} (${counter})`;
    }
    counter++;
    if (counter > 50) break;
  }

  return candidate;
}

/**
 * Strictly resolves and ensures the managed Sabbath archive destination folder:
 * GMAHK Galilea/
 * └── Dokumentasi atau File Ibadah/
 *     └── Year (e.g. 2026)/
 *         └── Quarter (e.g. Triwulan III)/
 *             └── Sabbath (e.g. 12 September 2026)/
 *
 * This guarantees boundary protection:
 * - Only managed root folders are used
 * - Client cannot supply an arbitrary folder ID
 * - Folders are ensured idempotently
 */
export async function resolveSabbathDestinationFolder(
  category: ArchiveCategory,
  sabbathDate: string
): Promise<{
  folderId: string;
  folderPath: string;
  year: number;
  quarter: number;
  quarterTitle: string;
  sabbathTitle: string;
  isExisting: boolean;
}> {
  if (!isValidSabbathDate(sabbathDate)) {
    throw new Error(`Tanggal '${sabbathDate}' bukan hari Sabat yang valid.`);
  }

  const { year, quarter, quarterTitle, formattedTitle } = parseSabbathDetails(sabbathDate);
  const categoryFolderId =
    category === 'documentation'
      ? (process.env.GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID || 'managed_dok_root')
      : (process.env.GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID || 'managed_ibadah_root');

  const categoryName = category === 'documentation' ? 'Dokumentasi' : 'File Ibadah';

  // 1. Ensure Year folder (e.g. 2026) under category root
  const yearRes = await ensureFolder(categoryFolderId, year.toString());

  // 2. Ensure Quarter folder (e.g. Triwulan III) under Year
  const quarterRes = await ensureFolder(yearRes.id, quarterTitle);

  // 3. Ensure Sabbath folder (e.g. 12 September 2026) under Quarter
  const sabbathRes = await ensureFolder(quarterRes.id, formattedTitle);

  const folderPath = `GMAHK Galilea/${categoryName}/${year}/${quarterTitle}/${formattedTitle}`;

  return {
    folderId: sabbathRes.id,
    folderPath,
    year,
    quarter,
    quarterTitle,
    sabbathTitle: formattedTitle,
    isExisting: sabbathRes.isExisting,
  };
}
