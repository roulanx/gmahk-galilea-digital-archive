import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-server';
import { getDefaultUploadSabbath, isValidSabbathDate } from '@/lib/sabbath';
import { uploadFileToDrive, resolveSabbathDestinationFolder, getNonCollidingFileName } from '@/lib/drive';
import { indexFile, logSystemEvent } from '@/lib/firestore';
import { ArchiveCategory, FileFormatType, FileItem } from '@/lib/types';
import { Readable } from 'stream';

function determineFileType(mimeType: string, filename: string): FileFormatType {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    ext === 'ppt' ||
    ext === 'pptx' ||
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint')
  ) {
    return 'presentation';
  }
  if (
    ext === 'doc' ||
    ext === 'docx' ||
    mimeType.includes('word') ||
    mimeType.includes('document')
  ) {
    return 'document';
  }
  if (
    ext === 'xls' ||
    ext === 'xlsx' ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel')
  ) {
    return 'spreadsheet';
  }
  return 'other';
}

export async function POST(req: NextRequest) {
  try {
    const session = await authenticateRequest(req);

    // Both viewer and admin can upload according to system rules
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const rawCategory = formData.get('category') as string;
    const category: ArchiveCategory = rawCategory === 'worship' ? 'worship' : 'documentation';
    let targetSabbathDate = (formData.get('sabbathDate') as string | null)?.trim() || null;

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'Pilih minimal satu berkas untuk diunggah.' }, { status: 400 });
    }

    // 1. Determine or validate Sabbath destination
    // If not provided by client, backend calculates the nearest active Sabbath using Asia/Makassar (WITA)
    if (!targetSabbathDate) {
      const defaultSabbath = getDefaultUploadSabbath();
      targetSabbathDate = defaultSabbath.date;
    } else if (!isValidSabbathDate(targetSabbathDate)) {
      // Reject invalid dates to protect archive integrity
      return NextResponse.json(
        {
          success: false,
          error: `Tanggal '${targetSabbathDate}' bukan hari Sabat yang valid. Format yang diharapkan adalah YYYY-MM-DD (hari Sabtu).`,
        },
        { status: 400 }
      );
    }

    // 2. Resolve destination folder inside managed Google Drive archive boundary
    // Client can NEVER supply arbitrary folder IDs. Hierarchy is strictly ensured idempotently.
    const destination = await resolveSabbathDestinationFolder(category, targetSabbathDate);

    const uploadedResults: FileItem[] = [];

    // 3. Process each file with duplicate collision avoidance (no silent overwrite)
    for (const file of files) {
      const safeFileName = await getNonCollidingFileName(destination.folderId, file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);
      const mimeType = file.type || 'application/octet-stream';
      const fileType = determineFileType(mimeType, safeFileName);

      const driveRes = await uploadFileToDrive({
        folderId: destination.folderId,
        name: safeFileName,
        mimeType,
        stream,
      });

      const fileItem: FileItem = {
        id: driveRes.id,
        name: safeFileName,
        mimeType,
        size: file.size,
        category,
        fileType,
        sabbathDate: targetSabbathDate,
        sabbathTitle: destination.sabbathTitle,
        year: destination.year,
        quarter: destination.quarter,
        folderId: destination.folderId,
        webViewLink: driveRes.webViewLink,
        webContentLink: driveRes.webContentLink,
        uploadedBy: session?.email || 'jemaat@gmahk-galilea.org',
        uploadedAt: new Date().toISOString(),
        isRandomEligible: fileType === 'photo' || fileType === 'video',
      };

      await indexFile(fileItem);
      uploadedResults.push(fileItem);
    }

    await logSystemEvent({
      type: 'UPLOAD',
      message: `${uploadedResults.length} berkas diunggah ke ${destination.folderPath}`,
      userId: session?.uid,
      metadata: {
        count: uploadedResults.length,
        category,
        sabbathDate: targetSabbathDate,
        folderPath: destination.folderPath,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${uploadedResults.length} berkas berhasil diunggah ke Sabat ${destination.sabbathTitle}`,
      destination: {
        path: destination.folderPath,
        sabbathTitle: destination.sabbathTitle,
        sabbathDate: targetSabbathDate,
        category,
      },
      data: uploadedResults,
    });
  } catch (error) {
    console.error('API Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Proses upload berkas gagal';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
