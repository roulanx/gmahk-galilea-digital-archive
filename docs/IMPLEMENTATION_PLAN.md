# Implementation Plan - GMAHK Galilea Digital Archive

Lanjutan pengerjaan project **GMAHK Galilea Digital Archive** pada environment PC baru. Menghubungkan ekosistem Google (Google Drive sebagai primary storage, Cloud Firestore sebagai metadata layer, Firebase Authentication Google Sign-In), membangun antarmuka Apple-inspired minimal mewah dengan aksen matcha/green, otomasi penjadwalan Sabat dan triwulan, sistem upload terstruktur, penampil media, serta portal admin dengan otorisasi ketat.

## Rangkuman Status Environment & Repo (PC Baru)
- Git: 2.55.0 (MinGit)
- GitHub CLI: 2.100.0 (Terotentikasi sebagai `roulanx`)
- Node.js: 24.19.0 LTS & npm 11.17.0
- pnpm: 12.3.4
- Firebase CLI: 15.29.0
- Vercel CLI: 59.11.7
- Repository GitHub: `zvenians/gmahk-galilea-digital-archive` (Branch: `main`, Initial Baseline: `b266037`)
- Baseline Lint & Build: Sukses (0 error)

## Tahapan Implementasi
1. **Core Domain & Utilities (`src/lib`)**
   - Engine Sabat WITA (`Asia/Makassar`)
   - Otomasi Triwulan & Tanggal Sabat
   - Google Drive API client & managed archive boundary
   - Firestore schema & indexing layer
2. **Security & Authentication**
   - Firebase Authentication (Google Sign-In)
   - Server-side role validation (`admin` vs `viewer`)
   - Restriksi penghapusan berkas (hanya admin, diarahkan ke Trash Drive)
3. **Upload Engine**
   - Single, multiple, drag & drop, mobile upload
   - Penempatan otomatis di folder Sabat aktif (Dokumentasi vs File Ibadah)
4. **Archive Browser & Universal Media Viewer**
   - Hierarki navigasi: Tahun -> Triwulan -> Sabat -> Berkas
   - Filter format berkas
   - Penampil foto (gallery, fullscreen, lazy load), video player, PDF reader, tautan Office
5. **Apple-Inspired Homepage & Random Archive Showcase**
   - Desain minimal modern, clean, palette matcha/green halus, dark mode
   - Spotlight Sabat ini, Quick Access, Showcase foto/video acak berkecepatan tinggi via index
6. **Admin Dashboard**
   - Statistik arsip, penambahan kegiatan khusus (custom activity), trigger & log otomasi
7. **Verifikasi Build, Test, & Deployment Vercel**
