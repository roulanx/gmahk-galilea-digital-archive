import { getSabbathsInQuarter, getQuarterTitle } from './sabbath';
import { getGoogleDriveClient, ensureFolder, classifyDriveError } from './drive';
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
  const drive = getGoogleDriveClient();
  const logs: string[] = [];
  const createdFolders: { name: string; id: string; path: string }[] = [];
  let existingCount = 0;
  let totalSabbaths = 0;

  if (!drive) {
    const errorMsg = 'Google Drive API client tidak aktif. Kredensial OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN) atau Service Account belum dikonfigurasi.';
    logs.push(`[AUTH_ERROR] ${errorMsg}`);
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

  // TASK 6: Lightweight authentication test before any modification
  try {
    logs.push('[AUTH_TEST] Memverifikasi koneksi dan izin Google Drive API...');
    await drive.files.list({
      pageSize: 1,
      fields: 'files(id)',
      spaces: 'drive',
    });
    logs.push('[AUTH_TEST] Koneksi Google Drive API terverifikasi aktif.');
  } catch (testErr) {
    const classified = classifyDriveError(testErr);
    const authFailMsg = `Pengujian koneksi Google Drive gagal [${classified.kind}] (Status ${classified.statusCode || 'N/A'}): ${classified.message}`;
    logs.push(`[ERROR] ${authFailMsg}`);
    return {
      success: false,
      rootFolderId: '',
      dokumentasiFolderId: '',
      fileIbadahFolderId: '',
      createdFolders: [],
      existingFoldersCount: 0,
      totalSabbathsEnsured: 0,
      logs,
      error: authFailMsg,
    };
  }

  const targetYear = options?.year || 2026;
  const targetQuarters = options?.quarters || [1, 2, 3, 4];

  // 1. ROOT FOLDER: 'GMAHK Galilea'
  let rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootId) {
    try {
      logs.push("[ROOT FOLDER] Mencari folder 'GMAHK Galilea' di root drive...");
      const searchRes = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and name = 'GMAHK Galilea' and trashed = false",
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      const found = searchRes.data.files?.[0];
      if (found?.id) {
        rootId = found.id;
        existingCount++;
        logs.push(`[ROOT FOLDER] Folder root 'GMAHK Galilea' ditemukan: ID ${rootId}`);
      } else {
        logs.push("[ROOT FOLDER] Folder belum ada. Membuat folder 'GMAHK Galilea'...");
        const createRes = await drive.files.create({
          requestBody: {
            name: 'GMAHK Galilea',
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id, name',
        });
        rootId = createRes.data.id || '';
        createdFolders.push({ name: 'GMAHK Galilea', id: rootId, path: 'GMAHK Galilea' });
        logs.push(`[ROOT FOLDER] Dibuat folder root 'GMAHK Galilea': ID ${rootId}`);
      }
    } catch (rootErr) {
      const classified = classifyDriveError(rootErr);
      const msg = `[ROOT FOLDER] Gagal mencari atau membuat folder 'GMAHK Galilea'. Google API [${classified.kind}] (Status ${classified.statusCode || 'N/A'}): ${classified.message}`;
      logs.push(`[ERROR] ${msg}`);
      return {
        success: false,
        rootFolderId: '',
        dokumentasiFolderId: '',
        fileIbadahFolderId: '',
        createdFolders,
        existingFoldersCount: existingCount,
        totalSabbathsEnsured: 0,
        logs,
        error: msg,
      };
    }
  } else {
    logs.push(`[ROOT FOLDER] Menggunakan GOOGLE_DRIVE_ROOT_FOLDER_ID dari env: ${rootId}`);
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
      logs.push(`[PERMISSION] Folder root 'GMAHK Galilea' dibagikan ke: ${shareEmail}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logs.push(`[PERMISSION_INFO] Berbagi folder (${shareEmail}): ${msg}`);
    }
  }

  // 2. MAIN BRANCHES: 'Dokumentasi' and 'File Ibadah'
  let dokRes;
  try {
    dokRes = await ensureFolder(rootId, 'Dokumentasi');
    if (dokRes.isExisting) {
      existingCount++;
    } else {
      createdFolders.push({ name: 'Dokumentasi', id: dokRes.id, path: 'GMAHK Galilea/Dokumentasi' });
    }
  } catch (dokErr) {
    const classified = classifyDriveError(dokErr);
    const msg = `[DOKUMENTASI] Gagal memproses folder 'Dokumentasi' (Parent: GMAHK Galilea [${rootId}]). Google API [${classified.kind}] (Status ${classified.statusCode || 'N/A'}): ${classified.message}`;
    logs.push(`[ERROR] ${msg}`);
    return {
      success: false,
      rootFolderId: rootId,
      dokumentasiFolderId: '',
      fileIbadahFolderId: '',
      createdFolders,
      existingFoldersCount: existingCount,
      totalSabbathsEnsured: 0,
      logs,
      error: msg,
    };
  }

  let ibadahRes;
  try {
    ibadahRes = await ensureFolder(rootId, 'File Ibadah');
    if (ibadahRes.isExisting) {
      existingCount++;
    } else {
      createdFolders.push({ name: 'File Ibadah', id: ibadahRes.id, path: 'GMAHK Galilea/File Ibadah' });
    }
  } catch (ibadahErr) {
    const classified = classifyDriveError(ibadahErr);
    const msg = `[FILE IBADAH] Gagal memproses folder 'File Ibadah' (Parent: GMAHK Galilea [${rootId}]). Google API [${classified.kind}] (Status ${classified.statusCode || 'N/A'}): ${classified.message}`;
    logs.push(`[ERROR] ${msg}`);
    return {
      success: false,
      rootFolderId: rootId,
      dokumentasiFolderId: dokRes.id,
      fileIbadahFolderId: '',
      createdFolders,
      existingFoldersCount: existingCount,
      totalSabbathsEnsured: 0,
      logs,
      error: msg,
    };
  }

  const branches = [
    { name: 'Dokumentasi', id: dokRes.id },
    { name: 'File Ibadah', id: ibadahRes.id },
  ];

  // 3. YEARS & QUARTERS & SABBATHS
  for (const branch of branches) {
    // Ensure Year (e.g. 2026)
    let yearRes;
    const yearPath = `GMAHK Galilea/${branch.name}/${targetYear}`;
    try {
      yearRes = await ensureFolder(branch.id, targetYear.toString());
      if (yearRes.isExisting) {
        existingCount++;
      } else {
        createdFolders.push({ name: targetYear.toString(), id: yearRes.id, path: yearPath });
      }
    } catch (yearErr) {
      const classified = classifyDriveError(yearErr);
      const msg = `[YEAR] Gagal memproses folder tahun '${targetYear}' (Parent: ${branch.name} [${branch.id}]). Google API [${classified.kind}] (Status ${classified.statusCode || 'N/A'}): ${classified.message}`;
      logs.push(`[ERROR] ${msg}`);
      return {
        success: false,
        rootFolderId: rootId,
        dokumentasiFolderId: dokRes.id,
        fileIbadahFolderId: ibadahRes.id,
        createdFolders,
        existingFoldersCount: existingCount,
        totalSabbathsEnsured: totalSabbaths,
        logs,
        error: msg,
      };
    }

    // Ensure Quarters (Triwulan I - IV)
    for (const q of targetQuarters) {
      const qTitle = getQuarterTitle(q);
      const qPath = `${yearPath}/${qTitle}`;
      let qRes;
      try {
        qRes = await ensureFolder(yearRes.id, qTitle);
        if (qRes.isExisting) {
          existingCount++;
        } else {
          createdFolders.push({ name: qTitle, id: qRes.id, path: qPath });
        }
      } catch (qErr) {
        const classified = classifyDriveError(qErr);
        const msg = `[QUARTER] Gagal memproses folder '${qTitle}' (Parent: ${branch.name}/${targetYear} [${yearRes.id}]). Google API [${classified.kind}] (Status ${classified.statusCode || 'N/A'}): ${classified.message}`;
        logs.push(`[ERROR] ${msg}`);
        return {
          success: false,
          rootFolderId: rootId,
          dokumentasiFolderId: dokRes.id,
          fileIbadahFolderId: ibadahRes.id,
          createdFolders,
          existingFoldersCount: existingCount,
          totalSabbathsEnsured: totalSabbaths,
          logs,
          error: msg,
        };
      }

      // Ensure all Sabbath folders in this quarter
      const sabbaths = getSabbathsInQuarter(targetYear, q);
      for (const sab of sabbaths) {
        totalSabbaths++;
        const sabTitle = sab.formattedTitle; // format 'DD Month YYYY'
        const sabPath = `${qPath}/${sabTitle}`;
        try {
          const sabRes = await ensureFolder(qRes.id, sabTitle);
          if (sabRes.isExisting) {
            existingCount++;
          } else {
            createdFolders.push({ name: sabTitle, id: sabRes.id, path: sabPath });
          }
        } catch (sabErr) {
          const classified = classifyDriveError(sabErr);
          const msg = `[SABBATH] Gagal membuat folder Sabat '${sabTitle}' (Parent: ${qTitle} [${qRes.id}]). Google API [${classified.kind}] (Status ${classified.statusCode || 'N/A'}): ${classified.message}`;
          logs.push(`[ERROR] ${msg}`);
          return {
            success: false,
            rootFolderId: rootId,
            dokumentasiFolderId: dokRes.id,
            fileIbadahFolderId: ibadahRes.id,
            createdFolders,
            existingFoldersCount: existingCount,
            totalSabbathsEnsured: totalSabbaths,
            logs,
            error: msg,
          };
        }
      }
    }
  }

  logs.push(
    `Bootstrap selesai. Folder baru dibuat: ${createdFolders.length}, Folder sudah ada: ${existingCount}, Total Sabat diproses: ${totalSabbaths}`
  );

  await logSystemEvent({
    type: 'AUTOMATION',
    message: `Bootstrap Drive Archive selesai. ${createdFolders.length} folder baru dibuat, ${existingCount} folder diverifikasi.`,
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
