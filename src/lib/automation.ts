import { bootstrapDriveArchive } from './drive-bootstrap';
import { logSystemEvent } from './firestore';
import { AutomationStatus } from './types';

/**
 * Runs idempotent archive folder structure automation:
 * - Bootstraps root folder 'GMAHK Galilea' in Google Drive if missing
 * - Bootstraps 'Dokumentasi' and 'File Ibadah' branches
 * - Bootstraps Year, Quarter, and all Sabbath folders ('DD Month YYYY')
 * - Skips already existing folders without duplicates
 * - Logs results to system audit logs
 */
export async function runArchiveAutomation(): Promise<AutomationStatus> {
  try {
    const result = await bootstrapDriveArchive({
      year: 2026,
      quarters: [1, 2, 3, 4],
    });

    if (!result.success) {
      return {
        lastRun: new Date().toISOString(),
        status: 'FAILED',
        details: result.error || 'Otomasi gagal.',
        createdFoldersCount: 0,
      };
    }

    const summaryDetails = `Otomasi Sabat selesai. Total ${result.createdFolders.length} folder baru dibuat. ${result.existingFoldersCount} folder sudah ada diverifikasi.`;

    return {
      lastRun: new Date().toISOString(),
      status: 'SUCCESS',
      details: summaryDetails,
      createdFoldersCount: result.createdFolders.length,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const failDetails = `Otomasi gagal: ${errMsg}`;

    await logSystemEvent({
      type: 'AUTOMATION',
      message: failDetails,
    });

    return {
      lastRun: new Date().toISOString(),
      status: 'FAILED',
      details: failDetails,
      createdFoldersCount: 0,
    };
  }
}
