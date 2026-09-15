# GMAHK GALILEA DIGITAL ARCHIVE — HANDOFF & STATE REPORT

## 1. Project Context
- **Name**: GMAHK Galilea Digital Archive
- **Repository**: `zvenians/gmahk-galilea-digital-archive` (Public)
- **Branch**: `main`
- **Initial Baseline Commit**: `b266037` (feat: initialize archive application)
- **Firebase Project**: `gmahk-galilea-archive`

---

## 2. Environment Status on Current PC
- **Git**: v2.55.0 (Installed and verified in PATH)
- **GitHub CLI (`gh`)**: v2.100.0 (Installed, authenticated as `roulanx`, git credential helper configured)
- **Node.js**: v24.19.0 LTS (Installed and verified)
- **npm**: v11.17.0 (Configured with user prefix at `AppData\Roaming\npm`)
- **pnpm**: v12.3.4 (Installed globally)
- **Firebase CLI**: v15.29.0 (Installed globally)
- **Vercel CLI**: v59.11.7 (Installed globally)
- **Build Baseline**: Passed (`next build` with Turbopack succeeded)
- **Lint Baseline**: Passed (`eslint` succeeded)

---

## 3. Architecture Summary
- **Storage Layer**: Google Drive (`GMAHK Galilea/Dokumentasi` & `File Ibadah`)
- **Index/Cache Layer**: Firestore (`years`, `quarters`, `sabbaths`, `activities`, `fileIndex`, `systemLogs`, `users`, `settings`, `automationStatus`)
- **Authentication**: Firebase Authentication (Google Sign-In) with server-side role enforcement (`admin` vs `viewer`)
- **Sabbath Timezone**: `Asia/Makassar` (WITA, UTC+8)
- **Hosting**: Vercel Serverless

---

## 4. Pending Authorizations
1. **Firebase CLI**: Otorisasi Google account pemilik project `gmahk-galilea-archive`.
2. **Vercel CLI**: Otorisasi akun Vercel untuk menghubungkan deployment repository `zvenians/gmahk-galilea-digital-archive`.
