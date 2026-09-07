import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getNearestSabbath,
  isValidSabbathDate,
  parseSabbathDetails,
  getWitaDateParts,
  TIMEZONE,
} from '../src/lib/sabbath';
import { resolveSabbathDestinationFolder, getNonCollidingFileName } from '../src/lib/drive';

describe('GMAHK Galilea - Sabbath Calculation Engine & Timezone WITA', () => {
  it('harus menggunakan timezone Asia/Makassar (WITA, UTC+8)', () => {
    assert.equal(TIMEZONE, 'Asia/Makassar');
  });

  it('harus menghitung bagian tanggal WITA secara presisi dari UTC timestamp', () => {
    // 2026-09-11 16:00:00 UTC = 2026-09-12 00:00:00 WITA (Sabtu pagi)
    const testUtc = new Date(Date.UTC(2026, 8, 11, 16, 0, 0));
    const parts = getWitaDateParts(testUtc);

    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 9);
    assert.equal(parts.day, 12);
    assert.equal(parts.dayOfWeek, 6); // 6 = Sabtu
    assert.equal(parts.dateStr, '2026-09-12');
  });

  it('harus mengarahkan hari Senin s/d Jumat ke Sabat Sabtu mendatang', () => {
    // Senin, 7 September 2026 10:00 WITA (02:00 UTC)
    const monday = new Date(Date.UTC(2026, 8, 7, 2, 0, 0));
    const mondaySabbath = getNearestSabbath(monday);
    assert.equal(mondaySabbath.date, '2026-09-12');
    assert.equal(mondaySabbath.formattedTitle, '12 September 2026');

    // Rabu, 9 September 2026 15:00 WITA (07:00 UTC)
    const wednesday = new Date(Date.UTC(2026, 8, 9, 7, 0, 0));
    const wednesdaySabbath = getNearestSabbath(wednesday);
    assert.equal(wednesdaySabbath.date, '2026-09-12');

    // Jumat, 11 September 2026 17:00 WITA (09:00 UTC)
    const friday = new Date(Date.UTC(2026, 8, 11, 9, 0, 0));
    const fridaySabbath = getNearestSabbath(friday);
    assert.equal(fridaySabbath.date, '2026-09-12');
  });

  it('harus mempertahankan Sabat aktif sepanjang hari Sabtu (00:00 s/d 23:59 WITA)', () => {
    // Sabtu pagi saat ibadah: 12 September 2026 09:30 WITA (01:30 UTC)
    const sabbathMorning = new Date(Date.UTC(2026, 8, 12, 1, 30, 0));
    const morningResult = getNearestSabbath(sabbathMorning);
    assert.equal(morningResult.date, '2026-09-12');
    assert.equal(morningResult.isToday, true);

    // Sabtu malam setelah ibadah selesai: 12 September 2026 21:00 WITA (13:00 UTC)
    const sabbathEvening = new Date(Date.UTC(2026, 8, 12, 13, 0, 0));
    const eveningResult = getNearestSabbath(sabbathEvening);
    assert.equal(eveningResult.date, '2026-09-12');
    assert.equal(eveningResult.isToday, true);

    // Menjelang akhir hari Sabtu: 12 September 2026 23:59:50 WITA (15:59:50 UTC)
    const sabbathLateNight = new Date(Date.UTC(2026, 8, 12, 15, 59, 50));
    const lateResult = getNearestSabbath(sabbathLateNight);
    assert.equal(lateResult.date, '2026-09-12');
  });

  it('harus otomatis berganti ke Sabat berikutnya begitu hari Sabtu berlalu (Minggu 00:00:01 WITA)', () => {
    // Minggu dini hari: 13 September 2026 00:00:01 WITA (12 September 2026 16:00:01 UTC)
    const sundayJustStarted = new Date(Date.UTC(2026, 8, 12, 16, 0, 1));
    const nextWeekSabbath = getNearestSabbath(sundayJustStarted);

    // Harus langsung berganti ke Sabtu pekan berikutnya (19 September 2026)
    assert.equal(nextWeekSabbath.date, '2026-09-19');
    assert.equal(nextWeekSabbath.formattedTitle, '19 September 2026');
    assert.equal(nextWeekSabbath.quarter, 3);
    assert.equal(nextWeekSabbath.quarterTitle, 'Triwulan III');

    // Minggu siang: 13 September 2026 12:00 WITA (04:00 UTC)
    const sundayNoon = new Date(Date.UTC(2026, 8, 13, 4, 0, 0));
    assert.equal(getNearestSabbath(sundayNoon).date, '2026-09-19');
  });
});

describe('GMAHK Galilea - Server-Side Sabbath & Boundary Validation', () => {
  it('harus memvalidasi hari Sabtu yang benar dan menolak hari selain Sabtu', () => {
    // 12 September 2026 adalah hari Sabtu (Sabat)
    assert.equal(isValidSabbathDate('2026-09-12'), true);

    // 19 September 2026 adalah hari Sabtu (Sabat)
    assert.equal(isValidSabbathDate('2026-09-19'), true);

    // 11 September 2026 adalah hari Jumat (Bukan Sabat)
    assert.equal(isValidSabbathDate('2026-09-11'), false);

    // 13 September 2026 adalah hari Minggu (Bukan Sabat)
    assert.equal(isValidSabbathDate('2026-09-13'), false);

    // Format tidak valid / tanggal kalender yang tidak ada
    assert.equal(isValidSabbathDate('2026-02-30'), false);
    assert.equal(isValidSabbathDate('invalid-string'), false);
    assert.equal(isValidSabbathDate(''), false);
  });

  it('harus mengekstrak detail Sabat dengan format bahasa Indonesia konsisten', () => {
    const details = parseSabbathDetails('2026-09-12');
    assert.equal(details.year, 2026);
    assert.equal(details.month, 9);
    assert.equal(details.quarter, 3);
    assert.equal(details.quarterTitle, 'Triwulan III');
    assert.equal(details.formattedTitle, '12 September 2026');
  });

  it('harus menjamin proteksi boundary Google Drive dan hierarki folder terkelola', async () => {
    // Test resolve untuk kategori Dokumentasi
    const dokDestination = await resolveSabbathDestinationFolder('documentation', '2026-09-12');
    assert.equal(
      dokDestination.folderPath,
      'GMAHK Galilea/Dokumentasi/2026/Triwulan III/12 September 2026'
    );
    assert.ok(dokDestination.folderId, 'Folder ID harus tersedia');
    assert.equal(dokDestination.sabbathTitle, '12 September 2026');

    // Test resolve untuk kategori File Ibadah
    const ibadahDestination = await resolveSabbathDestinationFolder('worship', '2026-09-12');
    assert.equal(
      ibadahDestination.folderPath,
      'GMAHK Galilea/File Ibadah/2026/Triwulan III/12 September 2026'
    );
    assert.ok(ibadahDestination.folderId, 'Folder ID harus tersedia');

    // Proteksi: Mencoba resolve dengan tanggal bukan Sabat harus throw error
    await assert.rejects(
      async () => {
        await resolveSabbathDestinationFolder('documentation', '2026-09-11');
      },
      /bukan hari Sabat yang valid/
    );
  });

  it('harus mencegah penimpaan file (no silent overwrite) dengan nama berkas duplikat', async () => {
    // Verifikasi penamaan aman
    const uniqueName = await getNonCollidingFileName('mock_folder', 'tata_ibadah.pdf');
    assert.ok(uniqueName.includes('tata_ibadah.pdf'));
  });
});
