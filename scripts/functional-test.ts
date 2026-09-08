import { getGoogleDriveClient, ensureFolder, uploadFileToDrive, moveToTrash } from '../src/lib/drive';
import { Readable } from 'stream';

async function runTest() {
  console.log('--- STARTING FUNCTIONAL VERIFICATION ---');

  const drive = getGoogleDriveClient();
  if (!drive) {
    console.error('❌ Failed to authenticate with Google Drive.');
    process.exit(1);
  }
  console.log('✅ Google Drive authenticated successfully.');

  try {
    const categoryFolderId = process.env.GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID;
    if (!categoryFolderId) {
      console.error('❌ GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID is missing.');
      process.exit(1);
    }

    console.log('📁 1. Looking up root folder...');
    const rootInfo = await drive.files.get({ fileId: categoryFolderId, fields: 'id, name' });
    console.log(`✅ Root folder accessed: ${rootInfo.data.name} (${rootInfo.data.id})`);

    console.log('📁 2. Ensuring test folder exists...');
    const testFolder = await ensureFolder(categoryFolderId, '__SYSTEM_TEST_FOLDER__');
    console.log(`✅ Test folder ready: ${testFolder.name} (ID: ${testFolder.id})`);

    console.log('📄 3. Uploading temporary test file...');
    const fileName = `__SYSTEM_TEST_TEMPORARY_UPLOAD_${Date.now()}.txt`;
    const stream = new Readable();
    stream.push('This is a temporary system test file. Safe to delete.');
    stream.push(null);

    const uploaded = await uploadFileToDrive({
      folderId: testFolder.id,
      name: fileName,
      mimeType: 'text/plain',
      stream,
    });
    console.log(`✅ File uploaded successfully: ${fileName}`);
    console.log(`   - ID: ${uploaded.id}`);
    console.log(`   - webViewLink: ${uploaded.webViewLink}`);
    
    console.log('🗑️ 4. Moving temporary file to trash...');
    const trashed = await moveToTrash(uploaded.id);
    if (trashed) {
      console.log(`✅ File ${uploaded.id} moved to trash successfully.`);
    } else {
      console.error(`❌ Failed to trash file ${uploaded.id}`);
    }

    // Clean up the folder too
    console.log('🗑️ 5. Moving test folder to trash...');
    const folderTrashed = await moveToTrash(testFolder.id);
    if (folderTrashed) {
      console.log(`✅ Test folder ${testFolder.id} moved to trash successfully.`);
    }

    console.log('--- ALL FUNCTIONAL VERIFICATIONS PASSED ---');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Functional test failed:', msg);
    process.exit(1);
  }
}

runTest();
