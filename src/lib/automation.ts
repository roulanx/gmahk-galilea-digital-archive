import { getWitaDateParts, getQuarterFromMonth, getQuarterTitle, getSabbathsInQuarter } from './sabbath';
import { ensureFolder } from './drive';
import { logSystemEvent } from './firestore';
import { AutomationStatus } from './types';

/**
 * Runs idempotent archive folder structure automation:
 * - Ensures Year folder exists (checked 7 days before new year)
 * - Ensures Quarter folder exists (checked 7 days before new quarter)
 * - Computes all Sabbaths in the quarter and ensures Sabbath folder exists (format: 'DD Month YYYY')
 * - Skips already existing folders without duplicates
 * - Logs results to system audit logs
 */
export async function runArchiveAutomation(): Promise<AutomationStatus> {
  const currentWita = getWitaDateParts();
  const rootDokumentasiId = process.env.GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID || 'root_dok_id';
  const rootFileIbadahId = process.env.GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID || 'root_ibadah_id';

  let createdCount = 0;
  const logs: string[] = [];

  try {
    // 1. Evaluate Current & Upcoming Year (7 days threshold before year end)
    const yearsToEnsure = [currentWita.year];
    if (currentWita.month === 12 && currentWita.day >= 24) {
      yearsToEnsure.push(currentWita.year + 1);
    }

    // 2. Evaluate Current & Upcoming Quarter (7 days threshold before quarter end)
    const currentQuarter = getQuarterFromMonth(currentWita.month);
    const quartersToEnsure = [{ year: currentWita.year, quarter: currentQuarter }];

    // Check if within 7 days of end of quarter
    const endMonthsOfQuarters = [3, 6, 9, 12];
    if (endMonthsOfQuarters.includes(currentWita.month) && currentWita.day >= 23) {
      const nextQ = currentQuarter === 4 ? 1 : currentQuarter + 1;
      const nextY = currentQuarter === 4 ? currentWita.year + 1 : currentWita.year;
      quartersToEnsure.push({ year: nextY, quarter: nextQ });
    }

    for (const qItem of quartersToEnsure) {
      const yearStr = qItem.year.toString();
      const qTitle = getQuarterTitle(qItem.quarter);

      // Ensure Year & Quarter for Dokumentasi
      const dokYearRes = await ensureFolder(rootDokumentasiId, yearStr);
      if (!dokYearRes.isExisting) createdCount++;

      const dokQuarterRes = await ensureFolder(dokYearRes.id, qTitle);
      if (!dokQuarterRes.isExisting) createdCount++;

      // Ensure Year & Quarter for File Ibadah
      const ibadahYearRes = await ensureFolder(rootFileIbadahId, yearStr);
      if (!ibadahYearRes.isExisting) createdCount++;

      const ibadahQuarterRes = await ensureFolder(ibadahYearRes.id, qTitle);
      if (!ibadahQuarterRes.isExisting) createdCount++;

      // Ensure All Sabbaths in this Quarter
      const sabbaths = getSabbathsInQuarter(qItem.year, qItem.quarter);
      for (const sab of sabbaths) {
        // Format: 'DD Month YYYY' (e.g. '12 September 2026')
        const sabFolderName = sab.formattedTitle;

        const dokSabRes = await ensureFolder(dokQuarterRes.id, sabFolderName);
        if (!dokSabRes.isExisting) {
          createdCount++;
          logs.push(`Dibuat folder Dokumentasi Sabat: ${sabFolderName}`);
        }

        const ibadahSabRes = await ensureFolder(ibadahQuarterRes.id, sabFolderName);
        if (!ibadahSabRes.isExisting) {
          createdCount++;
          logs.push(`Dibuat folder File Ibadah Sabat: ${sabFolderName}`);
        }
      }
    }

    const summaryDetails = `Otomasi Sabat selesai. Total ${createdCount} folder baru dibuat. Semua struktur folder idempoten terverifikasi.`;

    await logSystemEvent({
      type: 'AUTOMATION',
      message: summaryDetails,
      metadata: { createdCount, logs: logs.slice(0, 10) },
    });

    return {
      lastRun: new Date().toISOString(),
      status: 'SUCCESS',
      details: summaryDetails,
      createdFoldersCount: createdCount,
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
      createdFoldersCount: createdCount,
    };
  }
}
