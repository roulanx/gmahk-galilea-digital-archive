# ARCHITECTURE SPECIFICATION
## GMAHK Galilea Digital Archive

### 1. Overview
GMAHK Galilea Digital Archive adalah platform arsip digital jemaat Gereja Masehi Advent Hari Ketujuh (GMAHK) Galilea. Platform ini menggabungkan kemudahan akses publik (viewer) dengan kontrol manajemen arsip terstruktur (admin) menggunakan ekosistem Google (Google Drive, Firebase Authentication, Cloud Firestore, Google Cloud).

---

### 2. Tech Stack & Ecosystem

- **Frontend & App Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Styling & UI**: Tailwind CSS v4, Lucide React (Apple-inspired design, modern, minimal, luxury subtle matcha/green tone, full dark mode support)
- **Primary Storage (Actual Files)**: **Google Drive**
  - Managed Root: `GMAHK Galilea`
  - Struktur Utama:
    ```
    GMAHK Galilea/
    ├── Dokumentasi/
    │   └── 2026/
    │       ├── Triwulan I/
    │       ├── Triwulan II/
    │       ├── Triwulan III/
    │       └── Triwulan IV/
    │           └── 12 September 2026/   <-- Sabbath Folder (DD Month YYYY)
    └── File Ibadah/
        └── 2026/
            ├── Triwulan I/
            └── ...
    ```
- **Metadata / Index Layer**: **Google Cloud Firestore** (Project: `gmahk-galilea-archive`)
  - Menyimpan cache metadata folder, file index, activity, setting, dan log otomasi.
  - Mencegah scan menyeluruh Google Drive pada setiap request pengguna.
- **Authentication & Identity**: **Firebase Authentication** (Google Sign-In)
  - Role: `admin` (Hanya 1 Super Admin) & `viewer`
  - Verifikasi hak akses ditegakkan **server-side**, client-side role tidak dipercaya secara mutlak.
- **Hosting / Production Platform**: **Vercel**
  - Kompatibel dengan Vercel serverless / edge runtime.
  - Tidak mengandalkan local filesystem sebagai media penyimpanan permanen.
- **Future Orchestration**: **Google Spark** ready (arsitektur modular, tidak menjadi hard dependency website).

---

### 3. Data Flow & Security Boundary

```
[User Browser / Mobile]
       │
       ▼ (Google Sign-In / Session)
[Next.js App Router (Vercel)]
  ├── Public Viewer Pages (Homepage, Archive Browser, Media Viewer)
  ├── Admin Portal (Dashboard, Activities, Automation, Users, Settings)
  └── API Routes / Server Actions
       │
       ├───> [Firebase Auth Verification (Token & Server-side Role Check)]
       │
       ├───> [Firestore Index Layer]
       │     (Read: Metadata, Quick Sabbath info, Random sample, Activities)
       │     (Write: Admin only / Automation worker)
       │
       └───> [Google Drive API]
             (Read: Streaming media, direct download link, thumbnail generation)
             (Write: Upload via resumable session / Folder creation)
             (Security Boundary: Validasi Folder/File ID di dalam "GMAHK Galilea")
```

---

### 4. Firestore Schema

1. **`users`**
   - `uid` (string): Firebase UID
   - `email` (string)
   - `displayName` (string)
   - `role` (enum: `'admin'` | `'viewer'`)
   - `createdAt` (timestamp)
   - `lastLogin` (timestamp)

2. **`settings`** (single doc: `global`)
   - `superAdminEmail` (string)
   - `rootDriveFolderId` (string)
   - `dokumentasiFolderId` (string)
   - `fileIbadahFolderId` (string)
   - `automationActive` (boolean)
   - `timezone` (string: `'Asia/Makassar'`)

3. **`years`**
   - `id` (e.g. `'2026'`)
   - `year` (number: 2026)
   - `dokumentasiFolderId` (string)
   - `fileIbadahFolderId` (string)
   - `createdAt` (timestamp)

4. **`quarters`**
   - `id` (e.g. `'2026-Q3'`)
   - `year` (number: 2026)
   - `quarter` (number: 1..4)
   - `title` (string: `'Triwulan III'`)
   - `startDate` (string: `'2026-07-01'`)
   - `endDate` (string: `'2026-09-30'`)
   - `dokumentasiFolderId` (string)
   - `fileIbadahFolderId` (string)

5. **`sabbaths`**
   - `id` (e.g. `'2026-09-12'`)
   - `date` (string: `'2026-09-12'`)
   - `formattedTitle` (string: `'12 September 2026'`)
   - `year` (number: 2026)
   - `quarter` (number: 3)
   - `dokumentasiFolderId` (string)
   - `fileIbadahFolderId` (string)
   - `isPast` (boolean)
   - `fileCount` (number)

6. **`activities`** (Kegiatan khusus di luar Sabat reguler)
   - `id` (string)
   - `title` (string, e.g. `'KKR Pemuda'`)
   - `date` (string)
   - `year` (number)
   - `quarter` (number)
   - `folderId` (string)
   - `category` (enum: `'Dokumentasi'` | `'File Ibadah'`)
   - `createdBy` (string: admin UID)

7. **`fileIndex`** (Cache file Google Drive)
   - `id` (string: Drive File ID)
   - `name` (string)
   - `mimeType` (string)
   - `size` (number)
   - `category` (enum: `'documentation'` | `'worship'`)
   - `fileType` (enum: `'photo'` | `'video'` | `'pdf'` | `'presentation'` | `'document'` | `'spreadsheet'` | `'other'`)
   - `sabbathDate` (string: `'2026-09-12'`)
   - `folderId` (string: Drive Parent Folder ID)
   - `thumbnailUrl` (string)
   - `webViewLink` (string)
   - `webContentLink` (string)
   - `uploadedBy` (string)
   - `uploadedAt` (timestamp)
   - `isRandomEligible` (boolean)

8. **`systemLogs`**
   - `id` (string)
   - `type` (enum: `'AUTH'` | `'UPLOAD'` | `'DELETE'` | `'AUTOMATION'` | `'SECURITY_ALERT'`)
   - `message` (string)
   - `userId` (string)
   - `timestamp` (timestamp)
   - `metadata` (map)

9. **`automationStatus`**
   - `id` (string: `'latest'`)
   - `lastRun` (timestamp)
   - `status` (string: `'SUCCESS'` | `'FAILED'`)
   - `details` (string)

---

### 5. Sabbath & Automation Logic

- **Timezone**: `Asia/Makassar` (WITA, UTC+8)
- **Penentuan Sabat**:
  - Sabat adalah hari Sabtu (day of week = 6).
  - Sabat berikutnya dihitung relatif terhadap waktu WITA saat ini.
  - Jika hari ini hari Sabat, default upload adalah Sabat hari ini sampai Sabat berakhir (pukul 18:30 WITA), setelahnya bergeser ke Sabat pekan berikutnya.
- **Otomasi Idempoten**:
  - Dijalankan via cron atau admin trigger.
  - 7 hari sebelum tahun baru: siapkan folder tahun di Google Drive & Firestore.
  - 7 hari sebelum triwulan baru: siapkan folder triwulan (Triwulan I - IV).
  - Hitung seluruh tanggal Sabat dalam triwulan dan buat folder `DD Month YYYY` jika belum ada.
  - Pengecekan nama folder eksisting mencegah duplikasi folder.

---

### 6. Delete & Trash Rule

- Hanya user dengan role `admin` yang berhak melakukan penghapusan.
- Penghapusan file Google Drive diarahkan ke **Trash** (`drive.files.update({ fileId, trashed: true })`), bukan penghapusan permanen (`files.delete`), demi keamanan data jemaat.
- Endpoint penghapusan wajib memverifikasi JWT dan role admin di sisi server. Viewer yang mencoba memanggil endpoint ini menerima respon `403 Forbidden`.
