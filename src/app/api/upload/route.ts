import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-server';
import { getDefaultUploadSabbath, getQuarterFromMonth, formatSabbathTitle } from '@/lib/sabbath';
import { uploadFileToDrive } from '@/lib/drive';
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
    const category = (formData.get('category') as ArchiveCategory) || 'documentation';
    let targetSabbathDate = formData.get('sabbathDate') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files provided' }, { status: 400 });
    }

    // Default to upcoming Sabbath if none specified
    if (!targetSabbathDate) {
      const defaultSabbath = getDefaultUploadSabbath();
      targetSabbathDate = defaultSabbath.date;
    }

    const [yStr, mStr] = targetSabbathDate.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const quarter = getQuarterFromMonth(month);
    const sabbathTitle = formatSabbathTitle(targetSabbathDate);

    const targetFolderId =
      category === 'documentation'
        ? process.env.GOOGLE_DRIVE_DOKUMENTASI_FOLDER_ID || 'target_dok_folder'
        : process.env.GOOGLE_DRIVE_FILE_IBADAH_FOLDER_ID || 'target_ibadah_folder';

    const uploadedResults: FileItem[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);
      const mimeType = file.type || 'application/octet-stream';
      const fileType = determineFileType(mimeType, file.name);

      const driveRes = await uploadFileToDrive({
        folderId: targetFolderId,
        name: file.name,
        mimeType,
        stream,
      });

      const fileItem: FileItem = {
        id: driveRes.id,
        name: file.name,
        mimeType,
        size: file.size,
        category,
        fileType,
        sabbathDate: targetSabbathDate,
        sabbathTitle,
        year,
        quarter,
        folderId: targetFolderId,
        webViewLink: driveRes.webViewLink,
        webContentLink: driveRes.webContentLink,
        uploadedBy: session?.email || 'viewer@gmahk-galilea.org',
        uploadedAt: new Date().toISOString(),
        isRandomEligible: fileType === 'photo' || fileType === 'video',
      };

      await indexFile(fileItem);
      uploadedResults.push(fileItem);
    }

    await logSystemEvent({
      type: 'UPLOAD',
      message: `${uploadedResults.length} file diunggah ke ${category} untuk Sabat ${sabbathTitle}`,
      userId: session?.uid,
      metadata: { count: uploadedResults.length, targetSabbath: targetSabbathDate },
    });

    return NextResponse.json({
      success: true,
      message: `${uploadedResults.length} file berhasil diunggah`,
      data: uploadedResults,
    });
  } catch (error) {
    console.error('API Upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
