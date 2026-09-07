import { google } from 'googleapis';
import { Readable } from 'stream';
import { ArchiveCategory } from './types';
import { parseSabbathDetails, isValidSabbathDate } from './sabbath';

export interface DriveFolderResult {
  id: string;
  name: string;
  isExisting: boolean;
}

/**
 * Returns an authenticated Google Drive client using Service Account credentials
 */
export function getGoogleDriveClient() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    return null;
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Finds an existing folder by name inside a parent folder
 */
export async function findFolderByName(
  parentFolderId: string,
  folderName: string
): Promise<string | null> {
  const drive = getGoogleDriveClient();
  if (!drive) return null;

  try {
    const res = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const files = res.data.files;
    if (files && files.length > 0 && files[0].id) {
      return files[0].id;
    }
    return null;
  } catch (err) {
    console.error(`Error finding folder ${folderName} in ${parentFolderId}:`, err);
    return null;
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
  const existingId = await findFolderByName(parentFolderId, folderName);
  if (existingId) {
    return { id: existingId, name: folderName, isExisting: true };
  }

  const drive = getGoogleDriveClient();
  if (!drive) {
    // Development fallback mock ID
    const mockId = `mock_folder_${folderName.replace(/\s+/g, '_')}`;
    return { id: mockId, name: folderName, isExisting: false };
  }

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
}

/**
 * Moves a file or folder to Google Drive Trash (Admin only action)
 */
export async function moveToTrash(fileId: string): Promise<boolean> {
  const drive = getGoogleDriveClient();
  if (!drive) {
    console.log(`[Dev Fallback] Mock moved file ${fileId} to trash`);
    return true;
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
    // Development fallback simulation
    const mockId = `mock_file_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return {
      id: mockId,
      webViewLink: `https://drive.google.com/file/d/${mockId}/view`,
      webContentLink: `https://drive.google.com/uc?id=${mockId}&export=download`,
      size: 1024 * 1024,
    };
  }

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
      ? process.env.GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID || 'managed_dok_root'
      : process.env.GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID || 'managed_ibadah_root';

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
