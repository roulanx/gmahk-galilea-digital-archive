import { bootstrapDriveArchive } from '../src/lib/drive-bootstrap';
import { getGoogleDriveClient, uploadFileToDrive } from '../src/lib/drive';
import { getNearestSabbath } from '../src/lib/sabbath';
import { Readable } from 'stream';

async function main() {
  console.log('====================================================');
  console.log('   GMAHK GALILEA DIGITAL ARCHIVE — DRIVE BOOTSTRAP   ');
  console.log('====================================================\n');

  console.log('1. Memeriksa koneksi Google Drive API...');
  const drive = getGoogleDriveClient();

  if (!drive) {
    console.error('\n❌ KONEKSI DRIVE GAGAL: Tidak ditemukan kredensial Google Drive aktif.');
    console.error('\nUntuk menghubungkan Google Drive Anda secara langsung dan aman:');
    console.error('PILIHAN A (Direkomendasikan via Service Account):');
    console.error('1. Buka Google Cloud Console (console.cloud.google.com) atau Firebase Console (console.firebase.google.com).');
    console.error('2. Masuk ke Project Settings -> Service Accounts -> Klik "Generate new private key".');
    console.error('3. Simpan file JSON tersebut dengan nama "service-account.json" di folder project ini:');
    console.error('   c:\\Users\\ACCOUNTING\\Downloads\\Media Galilea\\service-account.json');
    console.error('\nPILIHAN B (Via Google Cloud CLI / ADC):');
    console.error('1. Jalankan di terminal/PowerShell:');
    console.error('   gcloud auth application-default login --scopes="https://www.googleapis.com/auth/drive"');
    console.error('2. Login di browser dengan akun Google pemilik archive GMAHK Galilea.');
    process.exit(1);
  }

  // Test call to verify active authentication
  try {
    const about = await drive.about.get({ fields: 'user, storageQuota' });
    console.log(`✅ Terhubung ke Google Drive: ${about.data.user?.emailAddress || 'Service Account'} (${about.data.user?.displayName || 'Active'})`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('\n❌ Gagal memanggil Drive API:', msg);
    process.exit(1);
  }

  console.log('\n2. Menjalankan Desired-State Bootstrap Folder...');
  const result = await bootstrapDriveArchive({
    year: 2026,
    quarters: [1, 2, 3, 4],
  });

  if (!result.success) {
    console.error('❌ Bootstrap gagal:', result.error);
    process.exit(1);
  }

  console.log(`\n✅ BOOTSTRAP BERHASIL!`);
  console.log(`- Root Folder ID (GMAHK Galilea) : ${result.rootFolderId}`);
  console.log(`- Folder Dokumentasi ID           : ${result.dokumentasiFolderId}`);
  console.log(`- Folder File Ibadah ID           : ${result.fileIbadahFolderId}`);
  console.log(`- Folder Baru Dibuat              : ${result.createdFolders.length}`);
  console.log(`- Folder Sudah Ada (Dilewati)     : ${result.existingFoldersCount}`);
  console.log(`- Total Sabat Terverifikasi       : ${result.totalSabbathsEnsured}`);

  console.log('\n3. Menguji Upload Berkas Verifikasi ke Sabat Terdekat...');
  const nearestSabbath = getNearestSabbath();
  console.log(`- Sabat Terdekat: ${nearestSabbath.formattedTitle} (${nearestSabbath.quarterTitle})`);

  // Find the exact nearest Sabbath folder under Dokumentasi/2026/[Quarter]/[Sabbath]
  const testFileName = `verifikasi-bootstrap-${Date.now()}.txt`;
  const fileContent = `GMAHK GALILEA DIGITAL ARCHIVE\nVerifikasi Google Drive Bootstrap Berhasil!\nWaktu: ${new Date().toISOString()}\nSabat: ${nearestSabbath.formattedTitle}\nTimezone: Asia/Makassar (WITA)\n`;
  const stream = Readable.from([Buffer.from(fileContent, 'utf-8')]);

  // Find target folder in created list or search
  let targetFolderId = result.createdFolders.find(
    (f) => f.name === nearestSabbath.formattedTitle && f.path.includes('Dokumentasi')
  )?.id;

  if (!targetFolderId) {
    // Search folder
    const searchFolder = await drive.files.list({
      q: `mimeType = 'application/vnd.google-apps.folder' and name = '${nearestSabbath.formattedTitle}' and trashed = false`,
      fields: 'files(id, name, parents)',
    });
    targetFolderId = searchFolder.data.files?.[0]?.id || result.dokumentasiFolderId;
  }

  const uploadRes = await uploadFileToDrive({
    folderId: targetFolderId,
    name: testFileName,
    mimeType: 'text/plain',
    stream,
  });

  console.log(`✅ Upload Berhasil!`);
  console.log(`- File Name     : ${testFileName}`);
  console.log(`- File ID       : ${uploadRes.id}`);
  console.log(`- Web View Link : ${uploadRes.webViewLink}`);
  console.log(`- Size          : ${uploadRes.size} bytes`);
  console.log('\n====================================================');
  console.log('   AUDIT & BOOTSTRAP GOOGLE DRIVE SELESAI SUKSES!   ');
  console.log('====================================================');
}

main().catch(console.error);
