import { getSabbathsInQuarter, getQuarterTitle } from './sabbath';
import { getGoogleDriveClient, ensureFolder } from './drive';
import { logSystemEvent } from './firestore';

export interface BootstrapResult {
  success: boolean;
  rootFolderId: string;
  dokumentasiFolderId: string;
  fileIbadahFolderId: string;
  createdFolders: { name: string; id: string; path: string }[];
  existingFoldersCount: number;
  totalSabbathsEnsured: number;
  logs: string[];
  error?: string;
}

/**
 * Ensures the entire standard GMAHK Galilea folder structure exists in Google Drive:
 * GMAHK Galilea/
 * ├── Dokumentasi/
 * │   └── 2026/
 * │       ├── Triwulan I/
 * │       ├── Triwulan II/
 * │       ├── Triwulan III/
 * │       └── Triwulan IV/
 * │           └── [DD Month YYYY]/
 * └── File Ibadah/
 *     └── 2026/
 *         ├── Triwulan I/
 *         ├── ...
 */
export async function bootstrapDriveArchive(options?: {
  year?: number;
  quarters?: number[];
  shareWithEmail?: string;
}): Promise<BootstrapResult> {
  const drive = await getGoogleDriveClient();
  const logs: string[] = [];
  const createdFolders: { name: string; id: string; path: string }[] = [];
  let existingCount = 0;
  let totalSabbaths = 0;

  if (!drive) {
    const errorMsg = 'Google Drive API client tidak aktif. Pastikan kredensial (Service Account atau ADC) telah dikonfigurasi.';
    logs.push(`[ERROR] ${errorMsg}`);
    return {
      success: false,
      rootFolderId: '',
      dokumentasiFolderId: '',
      fileIbadahFolderId: '',
      createdFolders: [],
      existingFoldersCount: 0,
      totalSabbathsEnsured: 0,
      logs,
      error: errorMsg,
    };
  }

  const targetYear = options?.year || 2026;
  const targetQuarters = options?.quarters || [1, 2, 3, 4];

  // 1. ROOT FOLDER: 'GMAHK Galilea'
  let rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootId) {
    // Search in user's root Drive
    const searchRes = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and name = 'GMAHK Galilea' and trashed = false",
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const found = searchRes.data.files?.[0];
    if (found?.id) {
      rootId = found.id;
      existingCount++;
      logs.push(`Folder root 'GMAHK Galilea' ditemukan: ID ${rootId}`);
    } else {
      // Create 'GMAHK Galilea' at root
      const createRes = await drive.files.create({
        requestBody: {
          name: 'GMAHK Galilea',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id, name',
      });
      rootId = createRes.data.id || '';
      createdFolders.push({ name: 'GMAHK Galilea', id: rootId, path: 'GMAHK Galilea' });
      logs.push(`Dibuat folder root 'GMAHK Galilea': ID ${rootId}`);
    }
  } else {
    logs.push(`Menggunakan GOOGLE_DRIVE_ROOT_FOLDER_ID dari env: ${rootId}`);
  }

  // Optionally share root folder with user's email if created by Service Account
  const shareEmail = options?.shareWithEmail || process.env.SUPER_ADMIN_EMAIL;
  if (shareEmail && rootId) {
    try {
      await drive.permissions.create({
        fileId: rootId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: shareEmail,
        },
        fields: 'id',
      });
      logs.push(`Folder root 'GMAHK Galilea' dibagikan ke: ${shareEmail}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`Info permission share (${shareEmail}): ${msg}`);
    }
  }

  // 2. MAIN BRANCHES: 'Dokumentasi' and 'File Ibadah'
  const dokRes = await ensureFolder(rootId, 'Dokumentasi');
  if (dokRes.isExisting) existingCount++;
  else createdFolders.push({ name: 'Dokumentasi', id: dokRes.id, path: 'GMAHK Galilea/Dokumentasi' });

  const ibadahRes = await ensureFolder(rootId, 'File Ibadah');
  if (ibadahRes.isExisting) existingCount++;
  else createdFolders.push({ name: 'File Ibadah', id: ibadahRes.id, path: 'GMAHK Galilea/File Ibadah' });

  const branches = [
    { name: 'Dokumentasi', id: dokRes.id },
    { name: 'File Ibadah', id: ibadahRes.id },
  ];

  // 3. YEARS & QUARTERS & SABBATHS
  for (const branch of branches) {
    // Ensure Year (e.g. 2026)
    const yearRes = await ensureFolder(branch.id, targetYear.toString());
    const yearPath = `GMAHK Galilea/${branch.name}/${targetYear}`;
    if (yearRes.isExisting) existingCount++;
    else createdFolders.push({ name: targetYear.toString(), id: yearRes.id, path: yearPath });

    // Ensure Quarters (Triwulan I - IV)
    for (const q of targetQuarters) {
      const qTitle = getQuarterTitle(q);
      const qPath = `${yearPath}/${qTitle}`;
      const qRes = await ensureFolder(yearRes.id, qTitle);
      if (qRes.isExisting) existingCount++;
      else createdFolders.push({ name: qTitle, id: qRes.id, path: qPath });

      // Ensure all Sabbath folders in this quarter
      const sabbaths = getSabbathsInQuarter(targetYear, q);
      for (const sab of sabbaths) {
        totalSabbaths++;
        const sabTitle = sab.formattedTitle; // format 'DD Month YYYY'
        const sabPath = `${qPath}/${sabTitle}`;
        const sabRes = await ensureFolder(qRes.id, sabTitle);
        if (sabRes.isExisting) {
          existingCount++;
        } else {
          createdFolders.push({ name: sabTitle, id: sabRes.id, path: sabPath });
        }
      }
    }
  }

  logs.push(
    `Bootstrap selesai. Folder baru dibuat: ${createdFolders.length}, Folder sudah ada: ${existingCount}, Total Sabat diproses: ${totalSabbaths}`
  );

  await logSystemEvent({
    type: 'AUTOMATION',
    message: `Bootstrap Drive Archive selesai. ${createdFolders.length} folder baru dibuat.`,
    metadata: {
      rootId,
      createdCount: createdFolders.length,
      existingCount,
    },
  });

  return {
    success: true,
    rootFolderId: rootId,
    dokumentasiFolderId: dokRes.id,
    fileIbadahFolderId: ibadahRes.id,
    createdFolders,
    existingFoldersCount: existingCount,
    totalSabbathsEnsured: totalSabbaths,
    logs,
  };
}
