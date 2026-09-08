import http from 'http';
import url from 'url';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import readline from 'readline';
import { google } from 'googleapis';
import { bootstrapDriveArchive } from '../src/lib/drive-bootstrap';
import { uploadFileToDrive } from '../src/lib/drive';
import { getNearestSabbath } from '../src/lib/sabbath';
import { Readable } from 'stream';

const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

function promptUser(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function getEnvLocalPath(): string {
  return path.resolve(process.cwd(), '.env.local');
}

function updateEnvLocal(keyValues: Record<string, string>) {
  const envPath = getEnvLocalPath();
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  for (const [key, value] of Object.entries(keyValues)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');
}

async function findClientCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  // 1. Check existing .env.local or process.env
  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (fs.existsSync(getEnvLocalPath())) {
    const lines = fs.readFileSync(getEnvLocalPath(), 'utf-8').split('\n');
    for (const line of lines) {
      if (line.startsWith('GOOGLE_CLIENT_ID=') && !clientId) {
        clientId = line.replace('GOOGLE_CLIENT_ID=', '').trim();
      }
      if (line.startsWith('GOOGLE_CLIENT_SECRET=') && !clientSecret) {
        clientSecret = line.replace('GOOGLE_CLIENT_SECRET=', '').trim();
      }
    }
  }

  // 2. Check for downloaded Google client_secret_*.json
  if (!clientId || !clientSecret) {
    const files = fs.readdirSync(process.cwd());
    const clientSecretFile = files.find((f) => f.startsWith('client_secret_') && f.endsWith('.json'));
    if (clientSecretFile) {
      try {
        const json = JSON.parse(fs.readFileSync(clientSecretFile, 'utf-8'));
        const creds = json.installed || json.web;
        if (creds?.client_id && creds?.client_secret) {
          clientId = creds.client_id;
          clientSecret = creds.client_secret;
          console.log(`Menemukan konfigurasi OAuth dari file: ${clientSecretFile}`);
        }
      } catch (e: unknown) {
        console.warn('Gagal membaca file client_secret:', e);
      }
    }
  }

  if (!clientId || !clientSecret) {
    console.log('\n----------------------------------------------------');
    console.log('Untuk otorisasi OAuth Google Drive ke Akun Pribadi Anda:');
    console.log('Diperlukan OAuth 2.0 Client ID dari Google Cloud Console.');
    console.log('(Panduan: Google Cloud Console -> APIs & Services -> Credentials -> Create Credentials -> OAuth client ID -> Web application)');
    console.log(`Pastikan Authorized redirect URI mencakup: ${REDIRECT_URI}`);
    console.log('----------------------------------------------------\n');

    clientId = await promptUser('Masukkan GOOGLE_CLIENT_ID: ');
    clientSecret = await promptUser('Masukkan GOOGLE_CLIENT_SECRET: ');
  }

  return { clientId, clientSecret };
}

async function main() {
  console.log('====================================================');
  console.log('   GMAHK GALILEA — CONNECT GOOGLE DRIVE (MY DRIVE)   ');
  console.log('====================================================\n');

  const { clientId, clientSecret } = await findClientCredentials();

  if (!clientId || !clientSecret) {
    console.error('❌ GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET diperlukan untuk OAuth.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive'],
  });

  console.log('1. Memulai server otorisasi lokal di:', REDIRECT_URI);

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      if (parsedUrl.pathname === '/oauth2callback') {
        const code = parsedUrl.query.code as string;
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>Gagal: Kode otorisasi tidak ditemukan.</h1>');
          return;
        }

        console.log('\n2. Menerima kode otorisasi dari Google, menukarkan token...');
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        if (tokens.refresh_token) {
          // Save to .env.local
          updateEnvLocal({
            GOOGLE_CLIENT_ID: clientId,
            GOOGLE_CLIENT_SECRET: clientSecret,
            GOOGLE_DRIVE_REFRESH_TOKEN: tokens.refresh_token,
          });
          process.env.GOOGLE_CLIENT_ID = clientId;
          process.env.GOOGLE_CLIENT_SECRET = clientSecret;
          process.env.GOOGLE_DRIVE_REFRESH_TOKEN = tokens.refresh_token;
          console.log('✅ Refresh token tersimpan dengan aman di .env.local!');
        } else {
          console.warn('⚠️ Google tidak mengembalikan refresh token baru (sudah pernah diberikan sebelumnya).');
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Google Drive Terhubung</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 60px; background: #0A0A0A; color: #FFFFFF; }
              .card { max-width: 500px; margin: 0 auto; background: #141414; padding: 48px; border-radius: 28px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
              h1 { color: #FFFFFF; font-size: 22px; font-weight: 500; margin-bottom: 12px; letter-spacing: -0.02em; }
              p { color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Otorisasi Google Drive Berhasil</h1>
              <p>Google Drive pribadi Anda telah terhubung dengan aman ke <strong>Dokumentasi Digital Galilea</strong>.</p>
              <p>Anda dapat menutup tab browser ini sekarang dan kembali melihat terminal.</p>
            </div>
          </body>
          </html>
        `);

        server.close();

        // 3. EXECUTE BOOTSTRAP IMMEDIATELY
        console.log('\n3. Menghubungi Google Drive dan memverifikasi My Drive...');
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const about = await drive.about.get({ fields: 'user, storageQuota' });
        console.log(`✅ Terhubung ke Akun Google Pribadi: ${about.data.user?.emailAddress} (${about.data.user?.displayName})`);

        console.log('\n4. Menjalankan Bootstrap Struktur Folder di My Drive...');
        const bootstrapRes = await bootstrapDriveArchive({
          year: 2026,
          quarters: [1, 2, 3, 4],
        });

        if (!bootstrapRes.success) {
          console.error('❌ Bootstrap gagal:', bootstrapRes.error);
          process.exit(1);
        }

        console.log(`\n✅ BOOTSTRAP GOOGLE DRIVE SELESAI!`);
        console.log(`- Root 'GMAHK Galilea' ID : ${bootstrapRes.rootFolderId}`);
        console.log(`- 'Dokumentasi' ID        : ${bootstrapRes.dokumentasiFolderId}`);
        console.log(`- 'File Ibadah' ID        : ${bootstrapRes.fileIbadahFolderId}`);
        console.log(`- Folder Baru Dibuat      : ${bootstrapRes.createdFolders.length}`);
        console.log(`- Folder Sudah Ada        : ${bootstrapRes.existingFoldersCount}`);

        // Update .env.local with root folder IDs
        updateEnvLocal({
          GOOGLE_DRIVE_ROOT_FOLDER_ID: bootstrapRes.rootFolderId,
          GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID: bootstrapRes.dokumentasiFolderId,
          GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID: bootstrapRes.fileIbadahFolderId,
        });

        console.log('\n5. Melakukan Pengujian Upload Aktual ke Sabat Terdekat...');
        const nearest = getNearestSabbath();
        console.log(`- Target Sabat: ${nearest.formattedTitle}`);

        const testContent = `DOKUMENTASI DIGITAL GALILEA\nOtorisasi OAuth 2.0 User Berhasil!\nAkun: ${about.data.user?.emailAddress}\nWaktu: ${new Date().toISOString()}\nSabat: ${nearest.formattedTitle}\nTimezone: Asia/Makassar (WITA)\n`;
        const testFileName = `verifikasi-drive-user-${Date.now()}.txt`;
        const stream = Readable.from([Buffer.from(testContent, 'utf-8')]);

        // Find target folder for nearest Sabbath under Dokumentasi
        const searchTarget = await drive.files.list({
          q: `mimeType = 'application/vnd.google-apps.folder' and name = '${nearest.formattedTitle}' and trashed = false`,
          fields: 'files(id, name, parents)',
        });

        const targetFolderId = searchTarget.data.files?.[0]?.id || bootstrapRes.dokumentasiFolderId;

        const uploadRes = await uploadFileToDrive({
          folderId: targetFolderId,
          name: testFileName,
          mimeType: 'text/plain',
          stream,
        });

        console.log(`✅ UPLOAD VERIFIKASI BERHASIL!`);
        console.log(`- Nama Berkas   : ${testFileName}`);
        console.log(`- File ID       : ${uploadRes.id}`);
        console.log(`- Web View Link : ${uploadRes.webViewLink}`);

        console.log('\n====================================================');
        console.log('   INTEGRASI & VERIFIKASI GOOGLE DRIVE 100% SUKSES! ');
        console.log('====================================================');
        console.log('\nVariabel untuk Vercel Production Environment:');
        console.log(`GOOGLE_CLIENT_ID=${clientId}`);
        console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
        console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token || '(Gunakan token yang sudah ada)'}`);
        console.log(`GOOGLE_DRIVE_ROOT_FOLDER_ID=${bootstrapRes.rootFolderId}`);
        console.log(`GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID=${bootstrapRes.dokumentasiFolderId}`);
        console.log(`GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID=${bootstrapRes.fileIbadahFolderId}\n`);

        process.exit(0);
      }
    } catch (e: unknown) {
      console.error('Error saat callback OAuth:', e);
      res.writeHead(500);
      res.end('Terjadi error saat autentikasi.');
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`\nBuka URL berikut di browser Anda jika tidak terbuka otomatis:`);
    console.log(`\n${authUrl}\n`);

    // Automatically open browser on Windows
    exec(`start "" "${authUrl}"`, (err) => {
      if (err) console.log('Silakan buka tautan di atas secara manual di browser.');
    });
  });
}

main().catch(console.error);
