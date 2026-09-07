import { google } from 'googleapis';
import { Readable } from 'stream';

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
